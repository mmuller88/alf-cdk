import { StepFunctions } from 'aws-sdk';
import { instanceTable, InstanceItem } from './statics';
import { DynamoDB } from 'aws-sdk';
const db = new DynamoDB.DocumentClient();
const AWS = require('aws-sdk');
const stepFunctions = new AWS.StepFunctions();

const STATE_MACHINE_ARN: string = process.env.STATE_MACHINE_ARN || ''

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': "POST,GET,PUT,DELETE,OPTIONS",
  'Access-Control-Allow-Headers': "'*'",
  'Access-Control-Exposed-Headers': "'ETag','x-amz-meta-custom-header','Authorization','Content-Type','Accept'",
}

const clients = {
  stepFunctions: new StepFunctions()
}

const createExecutor = ({ clients }:any) => async (item: InstanceItem) => {
  console.log('update-one-api: Step Function item: ' + JSON.stringify(item)  );
  console.log('update-one-api: Step Function clients: ' + JSON.stringify(clients)  );

  const params = {
    stateMachineArn: STATE_MACHINE_ARN,
    input: JSON.stringify({item: item})
  };
  await stepFunctions.startExecution(params).promise();
  return item;
};

const startExecution = createExecutor({ clients });

export const handler = async (event: any = {}): Promise<any> => {

  console.debug("update-one-api event: " + JSON.stringify(event));
  var item: InstanceItem = typeof event.body === 'object' ? event.body : JSON.parse(event.body);

  const userId = item.userId;
  const alfInstanceId = event.pathParameters[instanceTable.alfInstanceId];

  const dbParams = {
    TableName: instanceTable.name,
    Key: {
      [instanceTable.userId]: userId,
      [instanceTable.alfInstanceId]: alfInstanceId,
    },
  };

  try {
    console.debug("params: " + JSON.stringify(dbParams));
    const response = await db.get(dbParams).promise();
    console.debug("response: " + JSON.stringify(response));
    if(response.Item){
      await startExecution(item);
      return {statusCode: 200, body: JSON.stringify(item), isBase64Encoded: false, headers: headers};
    } else {
      return { statusCode: 404, body: JSON.stringify({message:'Not Found'}), headers: headers };
    }
  } catch (dbError) {
    throw new Error(JSON.stringify(dbError));
  }
}
