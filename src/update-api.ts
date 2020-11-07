import { StepFunctions, DynamoDB } from 'aws-sdk'; // eslint-disable-line import/no-extraneous-dependencies
import { instanceTable, InstanceItem, InstanceStatus } from './statics';
const db = new DynamoDB.DocumentClient();
const stepFunctions = new StepFunctions();

const STATE_MACHINE_ARN = process.env.STATE_MACHINE_ARN || '';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,GET,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': "'*'",
  'Access-Control-Exposed-Headers': "'ETag','x-amz-meta-custom-header','Authorization','Content-Type','Accept'",
};

const stepFunctionsClients = {
  stepFunctions: new StepFunctions(),
};

const createExecutor = ({ clients }: any) => async (item: any) => {
  console.log('update-one-api: Step Function item: ' + JSON.stringify(item));
  console.log('update-one-api: Step Function clients: ' + JSON.stringify(clients));

  const params = {
    stateMachineArn: STATE_MACHINE_ARN,
    input: JSON.stringify({ item: item }),
  };
  await stepFunctions.startExecution(params).promise();
  return item;
};

const startExecution = createExecutor({ stepFunctionsClients });

export const handler = async (event: any = {}): Promise<any> => {
  console.debug('update-one-api event: ' + JSON.stringify(event));
  var item: InstanceItem = typeof event.body === 'object' ? event.body : JSON.parse(event.body);

  const userId = item.userId;
  const alfInstanceId = event.pathParameters[instanceTable.instanceId];

  const dbParams = {
    TableName: instanceTable.name,
    Key: {
      [instanceTable.userId]: userId,
      [instanceTable.instanceId]: alfInstanceId,
    },
  };

  try {
    console.debug('params: ' + JSON.stringify(dbParams));
    const response = await db.get(dbParams).promise();
    console.debug('response: ' + JSON.stringify(response));
    if (response.Item) {
      var updateItem = response.Item;
      if (updateItem.expectedStatus === InstanceStatus.terminated) {
        return {
          statusCode: 403,
          body: JSON.stringify({ message: "Instance can't be stopped if already terminated!", item }),
          headers: headers,
        };
      }
      updateItem[instanceTable.expectedStatus] = item.expectedStatus;
      await startExecution(updateItem);
      return { statusCode: 200, body: JSON.stringify(item), headers: headers };
    } else {
      return { statusCode: 404, body: JSON.stringify({ message: 'Not Found' }), headers: headers };
    }
  } catch (dbError) {
    throw new Error(JSON.stringify(dbError));
  }
};
