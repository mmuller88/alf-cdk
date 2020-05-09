import { EC2, Route53 } from 'aws-sdk';
import { InstanceItem } from './statics';
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

const ec2 = new EC2();
const route = new Route53();
// const db = new DynamoDB.DocumentClient();


export const handler = async (data: any = {}): Promise<any> => {
  console.debug('insert item request: ' + JSON.stringify(data));
  var item: InstanceItem = typeof data === 'object' ? data : JSON.parse(data);

  var createTagsResult: any;
  var runInstancesResult: EC2.Types.Reservation;

  // const shortLived = new Boolean(item['shortLived'] || true);
  // const terminateIn = shortLived.valueOf()?'55 minutes':'3 days';

  // console.log("shortLived: " + JSON.stringify(shortLived));
  // console.log("terminateIn: " + JSON.stringify(terminateIn));

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

  console.log("paramsEC2: ", JSON.stringify(paramsEC2));

  if(IMAGE_ID === ''){
    console.log('image id is empty. No Instance will be created')
  } else {
    runInstancesResult = await ec2.runInstances(paramsEC2).promise();
    console.log("runInstancesResult: ", JSON.stringify(runInstancesResult));
    // item['status'] = 'running';

    try {
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
        console.log("createTagsResult: ", JSON.stringify(createTagsResult));

        route.getHostedZone()
        if (HOSTED_ZONE_ID && DOMAIN_NAME){
          const recordParams: Route53.Types.ChangeResourceRecordSetsRequest = {
            HostedZoneId: HOSTED_ZONE_ID,
            ChangeBatch: {
              Changes: [ {
                Action: "CREATE",
                ResourceRecordSet: {
                  Name: `${item.alfInstanceId}.${DOMAIN_NAME}`,
                  ResourceRecords: [ {Value: runInstancesResult.Instances[0].PublicIpAddress || ''}],
                  // AliasTarget: {
                  //   HostedZoneId: 'eu-west-2.compute.amazonaws.com.',
                  //   DNSName: runInstancesResult.Instances[0].PublicDnsName,
                  //   EvaluateTargetHealth: true
                  // },
                  Type: 'A'
                }
              }
              ]
            }
          }
          console.log("recordParams: ", JSON.stringify(recordParams));
          const recordResult = await route.changeResourceRecordSets(recordParams).promise();
          console.log("recordResult: ", JSON.stringify(recordResult));
        }
      }
    } catch (error) {
      console.error("createTagsResult: ", JSON.stringify(createTagsResult));
      console.error("runInstancesResult: ", JSON.stringify(runInstancesResult));
      console.error("item: ", JSON.stringify(item));
      throw error
    }
  }
  return {item: item, runInstancesResult: runInstancesResult, createTagsResult: createTagsResult};
}
