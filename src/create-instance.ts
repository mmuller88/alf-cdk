import { EC2, Route53, ELBv2 } from 'aws-sdk';
import { InstanceItem, instanceTable } from './statics';
// import { AlfTypes } from './statics';
// import { repoTable } from './statics';

// const REPO_TABLE = process.env.REPO_TABLE || '';
// const ALF_TYPES = process.env.ALF_TYPES || '';
// const alfTypes: AlfTypes = JSON.parse(ALF_TYPES);
const CI_USER_TOKEN = process.env.CI_USER_TOKEN || '';
const SECURITY_GROUP = process.env.SECURITY_GROUP || '';
const STACK_NAME = process.env.STACK_NAME || '';
const IMAGE_ID = process.env.IMAGE_ID || '';
const HOSTED_ZONE_ID = process.env.HOSTED_ZONE_ID || '';
const DOMAIN_NAME = process.env.DOMAIN_NAME || '';
const SSL_CERT_ARN = process.env.SSL_CERT_ARN || '';
const VPC_ID = process.env.VPC_ID || '';
const SUBNET_ID_1 = process.env.SUBNET_ID_1 || '';
const SUBNET_ID_2 = process.env.SUBNET_ID_2 || '';

const ec2 = new EC2();
const route = new Route53();
const elb = new ELBv2();
// const db = new DynamoDB.DocumentClient();


export const handler = async (data: any = {}): Promise<any> => {
  console.debug('insert item request: ' + JSON.stringify(data));
  var item: InstanceItem = typeof data === 'object' ? data : JSON.parse(data);

  var createTagsResult: any;
  var runInstancesResult: EC2.Types.Reservation = {};

  // const shortLived = new Boolean(item['shortLived'] || true);
  // const terminateIn = shortLived.valueOf()?'55 minutes':'3 days';

  // console.debug("shortLived: " + JSON.stringify(shortLived));
  // console.debug("terminateIn: " + JSON.stringify(terminateIn));

  const userData : any = `Content-Type: multipart/mixed; boundary="//"
MIME-Version: 1.0

--//
Content-Type: text/cloud-config; charset="us-ascii"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit
Content-Disposition: attachment; filename="cloud-config.txt"

#cloud-config
cloud_final_modules:
- [scripts-user, always]

--//
Content-Type: text/x-shellscript; charset="us-ascii"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit
Content-Disposition: attachment; filename="userdata.txt"

#!/bin/bash
echo "sudo halt" | at now + 55 minutes
yum -y install git
REPO=${item.alfType.gitRepo}
git clone https://mmuller88:${CI_USER_TOKEN}@github.com/mmuller88/$REPO /usr/local/$REPO
cd /usr/local/$REPO
chmod +x init.sh && ./init.sh
sudo chmod +x start.sh && ./start.sh
--//
  `
  const userDataEncoded = Buffer.from(userData).toString('base64');

  var paramsEC2 = {
    ImageId: IMAGE_ID,
    InstanceType: item.alfType.ec2InstanceType,
    KeyName: 'ec2dev',
    MinCount: 1,
    MaxCount: 1,
    InstanceInitiatedShutdownBehavior: 'terminate',
    SecurityGroups: [SECURITY_GROUP],
    UserData: userDataEncoded,
    // HibernationOptions: {Configured: true},
  };

  console.debug("paramsEC2: ", JSON.stringify(paramsEC2));

  if(IMAGE_ID === ''){
    console.debug('image id is empty. No Instance will be created')
  } else {
    runInstancesResult = await ec2.runInstances(paramsEC2).promise();
    console.debug("runInstancesResult: ", JSON.stringify(runInstancesResult));
    // item['status'] = 'running';

    if(runInstancesResult.Instances && runInstancesResult.Instances[0].InstanceId){
      const instanceId = runInstancesResult.Instances[0].InstanceId;
      const tagParams: EC2.Types.CreateTagsRequest = {
        Resources: [instanceId],
        Tags: [
          {
            Key: 'Name',
            Value: item.tags['customName'] || 'no name'
          },
          {
            Key: 'alfInstanceId',
            Value: item.alfInstanceId
          },
          {
            Key: 'userId',
            Value: item.userId
          },
          {
            Key: 'alfType',
            Value: JSON.stringify(item.alfType)
          },
          {
            Key: 'STACK_NAME',
            Value: STACK_NAME
          },
          {
            Key: 'tags',
            Value: JSON.stringify(item.tags)
          }
      ]};

      createTagsResult = await ec2.createTags(tagParams).promise();
      console.debug("createTagsResult: ", JSON.stringify(createTagsResult));

      if (HOSTED_ZONE_ID && DOMAIN_NAME){
        const lbResult = await elb.createLoadBalancer({
          Name: `lb-${item.alfInstanceId}`,
          Subnets: [SUBNET_ID_1,SUBNET_ID_2],
          Tags: [{
            Key: instanceTable.alfInstanceId,
            Value: item.alfInstanceId
          }]
        }).promise  ();

        console.debug("lbResult: ", JSON.stringify(lbResult));

        const tgParams:  ELBv2.Types.CreateTargetGroupInput = {
          VpcId: VPC_ID,
          Name: `tg-${item.alfInstanceId}`,
          Protocol: 'HTTP',
          Port: 80,
          TargetType: 'instance'
        }

        console.debug("tgParams: ", JSON.stringify(tgParams));
        const tgResult = await elb.createTargetGroup(tgParams).promise();
        console.debug("tgResult: ", JSON.stringify(tgResult));

        const registerTargetsResult = await elb.registerTargets({
          TargetGroupArn: tgResult.TargetGroups?.[0].TargetGroupArn || '',
          Targets: [{Id: instanceId}]
        }).promise();

        console.debug("registerResult: ", JSON.stringify(registerTargetsResult));

        const listenerParams: ELBv2.Types.CreateListenerInput = {
          LoadBalancerArn: lbResult.LoadBalancers?.[0].LoadBalancerArn  || '',
          Protocol: 'HTTPS',
          Port: 443,
          DefaultActions: [{
            Type:'forward',
            TargetGroupArn: tgResult.TargetGroups?.[0].TargetGroupArn
          }]
        }

        console.debug("lparams: ", JSON.stringify(listenerParams));

        const listenerResult = await elb.createListener(listenerParams).promise();

        console.debug("listenerResult: ", JSON.stringify(listenerResult));

        const certResult = await elb.addListenerCertificates({
          ListenerArn: listenerResult.Listeners?.[0].ListenerArn || '',
          Certificates: [{CertificateArn: SSL_CERT_ARN}]
        }).promise();

        console.debug("certResult: ", JSON.stringify(certResult));

        const recordParams: Route53.Types.ChangeResourceRecordSetsRequest = {
          HostedZoneId: HOSTED_ZONE_ID,
          ChangeBatch: {
            Changes: [ {
              Action: "CREATE",
              ResourceRecordSet: {
                Name: `${item.alfInstanceId}.${DOMAIN_NAME}`,
                // ResourceRecords: [ {Value: lbResult.LoadBalancers?.[0].DNSName || ''}],
                AliasTarget: {
                  HostedZoneId: lbResult.LoadBalancers?.[0].CanonicalHostedZoneId || '',
                  DNSName: lbResult.LoadBalancers?.[0].DNSName || '',
                  EvaluateTargetHealth: false
                },
                Type: 'A'
              }
            }
            ]
          }
        }
        console.debug("recordParams: ", JSON.stringify(recordParams));
        const recordResult = await route.changeResourceRecordSets(recordParams).promise();
        console.debug("recordResult: ", JSON.stringify(recordResult));
      }
    }
  }
  return {item: item, runInstancesResult: runInstancesResult, createTagsResult: createTagsResult};
}
