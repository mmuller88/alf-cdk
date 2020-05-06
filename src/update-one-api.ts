import { StepFunctions } from 'aws-sdk';
import { instanceTable, InstanceItem } from './statics';
const AWS = require('aws-sdk');
const stepFunctions = new AWS.StepFunctions();

const STATE_MACHINE_ARN: string = process.env.STATE_MACHINE_ARN || ''

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

const createExecutor = ({ clients }:any) => async (event: any) => {
  console.log('Executing media pipeline job ' + JSON.stringify(event, null, 2)  );
  console.log('Executing media pipeline job ' + JSON.stringify(clients, null, 2)  );
  var item: InstanceItem = typeof event.body === 'object' ? event.body : JSON.parse(event.body);

  console.debug("update-one event: " + JSON.stringify(event));

  item.alfInstanceId = event.pathParameters[instanceTable.sortKey];

  // item['MapAttribute'] = {
  //   [instanceTable.lastStatus]: {
  //     [instanceTable.lastUpdate]: new Date().toTimeString(),
  //     [instanceTable.status]: item[instanceTable.expectedStatus]
  //   }
  // }

  console.debug('item with MapAttribute: ' + JSON.stringify(item));

  const params = {
    stateMachineArn: STATE_MACHINE_ARN,
    input: JSON.stringify({item: item})
  };
  await stepFunctions.startExecution(params).promise();
  return item;
};

const startExecution = createExecutor({ clients });

export const handler = async (event: any = {}): Promise<any> => {

  // Pass in the event from the Lambda e.g S3 Put, SQS Message
  await startExecution(event);

  return {statusCode: 200, body: JSON.stringify({}), isBase64Encoded: false, headers: headers};
}
