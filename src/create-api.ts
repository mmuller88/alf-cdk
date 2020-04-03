import { StepFunctions } from 'aws-sdk';
const AWS = require('aws-sdk');
const stepFunctions = new AWS.StepFunctions();
const { v4 : uuidv4 } = require('uuid');

const STATE_MACHINE_ARN: string = process.env.STATE_MACHINE_ARN || '';
const SORT_KEY: string = process.env.SORT_KEY || '';

// Promised based version https://stackoverflow.com/questions/49244134/starting-a-stepfunction-and-exiting-doesnt-trigger-execution

const clients = {
  stepFunctions: new StepFunctions()
}

const createExecutor = ({ clients }:any) => async (event: any) => {
  console.log('Executing media pipeline job ' + JSON.stringify(event, null, 2)  );
  console.log('Executing media pipeline job ' + JSON.stringify(clients, null, 2)  );
  var item: any = typeof event.body === 'object' ? event.body : JSON.parse(event.body);
  item[SORT_KEY] = uuidv4();

  // Defaults
  item['expectedStatus'] = 'running';
  item['alfType'] = item['alfType']?item['alfType']:1;
  item['customName']?item['customName']:'No Name'
  item['shortLived']?item['shortLived']:true

  const params = {
    stateMachineArn: STATE_MACHINE_ARN,
    input: JSON.stringify(item)
  };
  await stepFunctions.startExecution(params).promise();
  // result['item'] = item[SORT_KEY];
  // { executionArn: "string", startDate: number }
  return item;
};

const startExecution = createExecutor({ clients });

export const handler = async (event: any = {}): Promise<any> => {

  // Pass in the event from the Lambda e.g S3 Put, SQS Message
  const item = await startExecution(event);

  return {statusCode: 201, body: JSON.stringify(item), isBase64Encoded: false};
}
