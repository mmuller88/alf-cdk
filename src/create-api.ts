import { StepFunctions } from 'aws-sdk';
import { InstanceItem, InstanceStatus, Ec2InstanceType, GitRepo } from './statics';
const AWS = require('aws-sdk');
const stepFunctions = new AWS.StepFunctions();
const { v4 : uuidv4 } = require('uuid');

const STATE_MACHINE_ARN: string = process.env.STATE_MACHINE_ARN || '';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': "POST,GET,PUT,DELETE,OPTIONS",
  'Access-Control-Allow-Headers': "'*'",
  'Access-Control-Exposed-Headers': "'ETag','x-amz-meta-custom-header','Authorization','Content-Type','Accept'",
}

// Promised based version https://stackoverflow.com/questions/49244134/starting-a-stepfunction-and-exiting-doesnt-trigger-execution

const clients = {
  stepFunctions: new StepFunctions()
}

const createExecutor = ({ clients }:any) => async (item: InstanceItem) => {
  console.log('create-api: Step Function item: ' + JSON.stringify(item)  );
  console.log('create-api: Step Function clients: ' + JSON.stringify(clients)  );

  item.alfInstanceId = uuidv4();

  // Defaults
  item.expectedStatus = InstanceStatus.running;
  item.alfType = item.alfType?item.alfType:{ec2InstanceType: Ec2InstanceType.t2large , gitRepo: GitRepo.alfec21};
  item.customName = item.customName ? item.customName : 'No Name'

  const params = {
    stateMachineArn: STATE_MACHINE_ARN,
    input: JSON.stringify(item)
  };
  await stepFunctions.startExecution(params).promise();
  return item;
};

const startExecution = createExecutor({ clients });

export const handler = async (event: any = {}): Promise<any> => {

  console.debug("create-api event: " + JSON.stringify(event));
  var item: any = typeof event.body === 'object' ? event.body : JSON.parse(event.body);

  const executionResult = await startExecution(item);

  return {statusCode: 201, body: JSON.stringify(executionResult), isBase64Encoded: false, headers: headers};
}
