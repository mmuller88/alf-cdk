import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpErrorHandler from '@middy/http-error-handler';
import inputOutputLogger from '@middy/input-output-logger';
import { DocumentClient } from 'aws-sdk/clients/dynamodb'; // eslint-disable-line import/no-extraneous-dependencies
import StepFunctions from 'aws-sdk/clients/stepfunctions'; // eslint-disable-line import/no-extraneous-dependencies
import { instanceTable, InstanceItem, InstanceStatus } from './statics';
import mockAuthLayer from './util/mockAuthLayer';
import permissionLayer from './util/permissionLayer';

const db = new DocumentClient();
const stepFunctions = new StepFunctions();

const STATE_MACHINE_ARN = process.env.STATE_MACHINE_ARN || '';
const MOCK_AUTH = process.env.MOCK_AUTH || '';

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

export const handler = middy(async (event: any) => {
  console.debug('update-one-api event: ' + JSON.stringify(event));
  var item: InstanceItem = typeof event.body === 'object' ? event.body : JSON.parse(event.body);

  const userId = item.userId;
  const instanceId = event.pathParameters[instanceTable.instanceId];

  const dbParams = {
    TableName: instanceTable.name,
    Key: {
      [instanceTable.userId]: userId,
      [instanceTable.instanceId]: instanceId,
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
        };
      }
      updateItem[instanceTable.expectedStatus] = item.expectedStatus;
      await startExecution(updateItem);
      return { statusCode: 200, body: JSON.stringify(item) };
    } else {
      return { statusCode: 404, body: JSON.stringify({ message: 'Not Found' }) };
    }
  } catch (dbError) {
    throw new Error(JSON.stringify(dbError));
  }
});

const onionHandler = handler;
if (MOCK_AUTH === 'true') {
  onionHandler.use(mockAuthLayer());
}
onionHandler
  .use(inputOutputLogger())
  .use(httpErrorHandler())
  .use(
    cors({
      origin: '*',
    }),
  )
  .use(permissionLayer());
