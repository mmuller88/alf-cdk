
import { EC2, Route53, DynamoDB, StepFunctions } from 'aws-sdk';
import { instanceTable, InstanceStatus, mapToInstanceItem, InstanceItem } from './statics';
import { RecordList } from 'aws-sdk/clients/dynamodbstreams';
import AWS = require('aws-sdk');

const stepFunctions = new AWS.StepFunctions();

const CI_USER_TOKEN = process.env.CI_USER_TOKEN || '';

const STACK_NAME = process.env.STACK_NAME || '';
const SECURITY_GROUP = process.env.SECURITY_GROUP || '';
const HOSTED_ZONE_ID = process.env.HOSTED_ZONE_ID || '';
const DOMAIN_NAME = process.env.DOMAIN_NAME || '';
const IMAGE_ID = process.env.IMAGE_ID || '';
const STOP_STATE_MACHINE_ARN: string = process.env.STOP_STATE_MACHINE_ARN || '';

const ec2 = new EC2();
const route = new Route53();

const clients = {
  stepFunctions: new StepFunctions()
}

const createExecutor = ({ clients }:any) => async (item: InstanceItem) => {

  console.log('executer-update-api: Stop Step Function item: ' + JSON.stringify(item));
  console.log('executer-update-api: Stop Step Function clients: ' + JSON.stringify(clients));

  item.expectedStatus = InstanceStatus.stopped;

  const params = {
    stateMachineArn: STOP_STATE_MACHINE_ARN,
    input: JSON.stringify({item: item})
  };

  await stepFunctions.startExecution(params).promise();
  return item;
};

const startExecution = createExecutor({ clients });

export const handler = async (event: any = {}): Promise<any> => {
  const records: RecordList = event.Records;
  // const record = records[0];
  await Promise.all(records.map(async record => {
    console.log('Stream record: ', JSON.stringify(record, null, 2));
    const oldInstanceItemMap = DynamoDB.Converter.unmarshall(record.dynamodb?.OldImage || {});
    const oldInstanceItem = mapToInstanceItem(oldInstanceItemMap);
    console.log('oldInstanceItem', JSON.stringify(oldInstanceItem, null, 2));

    const newInstanceItemMap = DynamoDB.Converter.unmarshall(record.dynamodb?.NewImage || {});
    const newInstanceItem = mapToInstanceItem(newInstanceItemMap);
    console.log('newInstanceItem', JSON.stringify(newInstanceItem, null, 2));

    const expectedStatus = JSON.stringify(newInstanceItem) !== '{}' ? newInstanceItem.expectedStatus : InstanceStatus.terminated;

    const ec2params: EC2.Types.DescribeInstancesRequest  = {
      Filters: [
        // { Name: 'instance-state-code', Values: ['16'] },
        { Name: 'tag:STACK_NAME', Values: [STACK_NAME] },
        { Name: `tag:${instanceTable.alfInstanceId}`, Values: [JSON.stringify(newInstanceItem) !== '{}' ? newInstanceItem.alfInstanceId : oldInstanceItem.alfInstanceId] }
      ]
    }
    console.debug("ec2Params: " + JSON.stringify(ec2params));

    var ec2Instances: EC2.Types.DescribeInstancesResult = await ec2.describeInstances(ec2params).promise();

    console.debug('ec2 reservation found: ' + JSON.stringify(ec2Instances.Reservations))

    var updateState = false;
    const reservations = ec2Instances.Reservations;

    if(reservations && reservations[0] && reservations[0].Instances && reservations[0]?.Instances[0]){
      const instance = reservations[0]?.Instances[0];
      console.debug('Found Ec2 start update :)')
      console.debug('ec2 instance found' + JSON.stringify(instance))

      const status = instance.State?.Name
      console.debug(`status: ${status} expectedStatus: ${expectedStatus}`)
      updateState = status != expectedStatus && status != InstanceStatus.terminated && status != 'terminating';
      if(updateState) {
        console.debug('instance.State?.Name != expectedStatus   NOOOICE)')
        if(expectedStatus === InstanceStatus.terminated || expectedStatus === InstanceStatus.stopped){
          if (HOSTED_ZONE_ID && DOMAIN_NAME){

            const recordParams: Route53.Types.ChangeResourceRecordSetsRequest = {
              HostedZoneId: HOSTED_ZONE_ID,
              ChangeBatch: {
                Changes: [ {
                  Action: "DELETE",
                  ResourceRecordSet: {
                    TTL: 300,
                    Name: `${newInstanceItem.alfInstanceId}.${DOMAIN_NAME}`,
                    ResourceRecords: [ {Value: instance.PublicDnsName || ''}],
                    // AliasTarget: {
                    //   HostedZoneId: lbResult.LoadBalancers?.[0].CanonicalHostedZoneId || '',
                    //   DNSName: lbResult.LoadBalancers?.[0].DNSName || '',
                    //   EvaluateTargetHealth: false
                    // },
                    Type: 'CNAME'
                  }
                }
                ]
              }
            }
            try{
              console.debug("recordParams: ", JSON.stringify(recordParams));
              const recordResult = await route.changeResourceRecordSets(recordParams).promise();
              console.debug("recordResult: ", JSON.stringify(recordResult));
            } catch (error){
              // ignore if couldn't delete record
              console.debug(JSON.stringify(error));
            }
          }
        }
        if(expectedStatus === InstanceStatus.terminated){
          const terParams: EC2.Types.TerminateInstancesRequest = {
            InstanceIds: [instance.InstanceId || '']
          }
          const terminateResult = await ec2.terminateInstances(terParams).promise();
          console.debug('terminateResult: ' + JSON.stringify(terminateResult));

        } else {
          if (expectedStatus === InstanceStatus.stopped){
            const stopParams: EC2.Types.StopInstancesRequest = {
              InstanceIds: [instance.InstanceId || '']
            }
            const stopResult = await ec2.stopInstances(stopParams).promise();
            console.debug('stopResult: ' + JSON.stringify(stopResult));
          } else if (expectedStatus === InstanceStatus.running) {
            const startParams: EC2.Types.StartInstancesRequest = {
              InstanceIds: [instance.InstanceId || '']
            }
            const startResult = await ec2.startInstances(startParams).promise();
            console.debug('startResult: ' + JSON.stringify(startResult));

            if (instance.PublicDnsName && HOSTED_ZONE_ID && DOMAIN_NAME){
              // var url = instance.Tags?.filter(tag => tag.Key === 'url')?.[0]?.Value || '';

                const iDomainName = `${instance.InstanceId}.${DOMAIN_NAME}`;
                const recordParams: Route53.Types.ChangeResourceRecordSetsRequest = {
                  HostedZoneId: HOSTED_ZONE_ID,
                  ChangeBatch: {
                    Changes: [ {
                      Action: "UPSERT",
                      ResourceRecordSet: {
                        TTL: 300,
                        Name: iDomainName,
                        ResourceRecords: [ {Value: instance.PublicDnsName || ''}],
                        Type: 'CNAME'
                      }
                    }]
                  }
                }

                console.debug("recordParams: ", JSON.stringify(recordParams));
                const recordResult = await route.changeResourceRecordSets(recordParams).promise();
                console.debug("recordResult: ", JSON.stringify(recordResult));

                const tagParams: EC2.Types.CreateTagsRequest = {
                  Resources: [instance.InstanceId || ''],
                  Tags: [
                    {
                      Key: 'url',
                      Value: iDomainName
                    }
                ]};

                console.debug("tagParams: ", JSON.stringify(tagParams));
                const createTagsResult = await ec2.createTags(tagParams).promise();
                console.debug("createTagsResult: ", JSON.stringify(createTagsResult));
              // }
            }
          } else {
            throw new Error(`NOT HANDLED status!!!! status: ${status} expectedStatus: ${expectedStatus}`);
          }
        }
      }
      // console.debug('DB Update about lastUpdate ...')
    } else {
      console.debug('No Ec2 Instance with that instanceId');

      if (JSON.stringify(newInstanceItem) !== '{}' && JSON.stringify(oldInstanceItem) === '{}' && newInstanceItem.expectedStatus === InstanceStatus.running) {
        console.debug('Create Ec2 Instance');
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
REPO=${newInstanceItem.alfType.gitRepo}
git clone https://mmuller88:${CI_USER_TOKEN}@github.com/mmuller88/$REPO /usr/local/$REPO
cd /usr/local/$REPO
chmod +x init.sh && ./init.sh
sudo chmod +x start.sh && ./start.sh
sudo chown -R 33007 data/solr-data
sudo chown -R 999 logs
--//
                  `
        const userDataEncoded = Buffer.from(userData).toString('base64');

        var paramsEC2: EC2.Types.RunInstancesRequest = {
          ImageId: IMAGE_ID,
          InstanceType: newInstanceItem.alfType.ec2InstanceType,
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
          var createTagsResult: any;
          var runInstancesResult: EC2.Types.Reservation = {};
          runInstancesResult = await ec2.runInstances(paramsEC2).promise();
          console.debug("runInstancesResult: ", JSON.stringify(runInstancesResult));
          // item['status'] = 'running';

          if(runInstancesResult.Instances && runInstancesResult.Instances[0].InstanceId){
            const instance = runInstancesResult.Instances[0];
            const tagParams: EC2.Types.CreateTagsRequest = {
              Resources: [instance.InstanceId || ''],
              Tags: [
                {
                  Key: 'Name',
                  Value: newInstanceItem.tags?.name || 'no name'
                },
                {
                  Key: 'alfInstanceId',
                  Value: newInstanceItem.alfInstanceId
                },
                {
                  Key: 'userId',
                  Value: newInstanceItem.userId
                },
                {
                  Key: 'alfType',
                  Value: JSON.stringify(newInstanceItem.alfType)
                },
                {
                  Key: 'STACK_NAME',
                  Value: STACK_NAME
                },
                {
                  Key: 'tags',
                  Value: JSON.stringify(newInstanceItem.tags)
                }
            ]};

            console.debug("tagParams: ", JSON.stringify(tagParams));
            createTagsResult = await ec2.createTags(tagParams).promise();
            console.debug("createTagsResult: ", JSON.stringify(createTagsResult));

            // await startExecution(newInstanceItem);
          }
        }
      }

    // if (record?.userIdentity?.Type == "Service" &&
    //   record.userIdentity.PrincipalId == "dynamodb.amazonaws.com") {
    // }
  }}))
}
