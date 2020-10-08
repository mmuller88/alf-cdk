// import { instanceTable, InstanceStatus, mapToInstanceItem } from './statics';
// import { RecordList } from 'aws-sdk/clients/dynamodbstreams';
import AWS = require('aws-sdk');

import { SQSEvent } from "aws-lambda";
import { DynamoDB, EC2, Route53, StepFunctions, CodeBuild } from "aws-sdk";
import { mapToInstanceItem, InstanceStatus, InstanceItem, instanceTable } from "./statics";

const codebuild = new AWS.CodeBuild();
const stepFunctions = new AWS.StepFunctions();

// const CI_USER_TOKEN = process.env.CI_USER_TOKEN || '';

const STACK_NAME = process.env.STACK_NAME || '';
// const SECURITY_GROUP = process.env.SECURITY_GROUP || '';
const HOSTED_ZONE_ID = process.env.HOSTED_ZONE_ID || '';
const DOMAIN_NAME = process.env.DOMAIN_NAME || '';
// const IMAGE_ID = process.env.IMAGE_ID || '';
const STOP_STATE_MACHINE_ARN: string = process.env.STOP_STATE_MACHINE_ARN || '';
const PROJECT_NAME = process.env.PROJECT_NAME || ''

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

// export const handler = async (event: any = {}): Promise<any> => {
//   console.log('executer-update-new event: ', JSON.stringify(event, null, 2));

//   const records: RecordList = event.Records;
//   // const record = records[0];
//   await Promise.all(records.map(async record => {

//   // await Promise.all(event.Records.map(async sqsRecord => {
//     console.log('SQS record: ', JSON.stringify(record, null, 2));

//     // const record = JSON.parse(sqsRecord.body);

//     const oldInstanceItemMap = DynamoDB.Converter.unmarshall(record.dynamodb?.OldImage || {});

export const handler = async (event: SQSEvent): Promise<any> => {
  console.log('executer-update-new event: ', JSON.stringify(event, null, 2));

  await Promise.all(event.Records.map(async sqsRecord => {
    console.log('SQS record: ', JSON.stringify(sqsRecord, null, 2));

    const record = JSON.parse(sqsRecord.body);

    const oldInstanceItemMap = DynamoDB.Converter.unmarshall(record.dynamodb?.OldImage || {});
    const oldInstanceItem = mapToInstanceItem(oldInstanceItemMap);
    console.log('oldInstanceItem', JSON.stringify(oldInstanceItem, null, 2));

    const newInstanceItemMap = DynamoDB.Converter.unmarshall(record.dynamodb?.NewImage || {});
    const newInstanceItem = mapToInstanceItem(newInstanceItemMap);
    console.log('newInstanceItem', JSON.stringify(newInstanceItem, null, 2));

    // create new instance
    if (JSON.stringify(newInstanceItem) !== '{}' && JSON.stringify(oldInstanceItem) === '{}' && newInstanceItem.expectedStatus === InstanceStatus.running) {
      console.debug('Create Ec2 Instance');

      const params: CodeBuild.Types.StartBuildInput = {
        projectName: PROJECT_NAME,
        environmentVariablesOverride: [
          {name: 'CDK_COMMAND', value: `make cdkdeployprod`},
          {name: 'alfInstanceId', value: `${newInstanceItem.alfInstanceId}`},
          {name: 'userId', value: newInstanceItem.userId},
          {name: 'alfType', value: JSON.stringify(newInstanceItem.alfType)},
          {name: 'stackName', value: STACK_NAME},
          {name: 'tags', value: JSON.stringify(newInstanceItem.tags)},
        ]
        // artifactsOverride: {
        //   type: 'NO_ARTIFACTS'
        // },
        // secondarySourcesOverride: [{
        //   type: 'S3',
        //   location: SRC_PATH
        // }]
      };
      console.debug("params: " + JSON.stringify(params));
      const startBuildResult = await codebuild.startBuild(params).promise();
      console.debug("startBuildResult: " + JSON.stringify(startBuildResult));


        await startExecution(newInstanceItem);
      // }
      // }

      return;
    }

    const expectedStatus = JSON.stringify(newInstanceItem) !== '{}' ? newInstanceItem.expectedStatus : InstanceStatus.terminated;

    const ec2params: EC2.Types.DescribeInstancesRequest  = {
      Filters: [
        // { Name: 'instance-state-code', Values: ['16'] },
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
          const startBuildInput: CodeBuild.Types.StartBuildInput = {
            projectName: PROJECT_NAME,
            environmentVariablesOverride: [
              {name: 'CDK_COMMAND', value: `yes | cdk destroy`},
              {name: 'alfInstanceId', value: `${oldInstanceItem.alfInstanceId}`},
            ]
          };
          console.debug("startBuildInput: " + JSON.stringify(startBuildInput));
          const destroyBuildResult = await codebuild.startBuild(startBuildInput).promise();
          console.debug("destroyBuildResult: " + JSON.stringify(destroyBuildResult));

          // const terParams: EC2.Types.TerminateInstancesRequest = {
          //   InstanceIds: [instance.InstanceId || '']
          // }
          // const terminateResult = await ec2.terminateInstances(terParams).promise();
          // console.debug('terminateResult: ' + JSON.stringify(terminateResult));

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
    }
  }))
}
