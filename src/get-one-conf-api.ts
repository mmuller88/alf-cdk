import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpErrorHandler from '@middy/http-error-handler';
import inputOutputLogger from '@middy/input-output-logger';
import { DocumentClient } from 'aws-sdk/clients/dynamodb'; // eslint-disable-line import/no-extraneous-dependencies
import { instanceTable } from './statics';
import mockAuthLayer from './util/mockAuthLayer';
import permissionLayer from './util/permissionLayer';

const db = new DocumentClient();
const MOCK_AUTH = process.env.MOCK_AUTH || '';

export const handler = middy(async (event: any) => {
  console.debug('get-one event: ' + JSON.stringify(event));
  const userId = event.queryStringParameters[instanceTable.userId];
  const instanceId = event.pathParameters[instanceTable.instanceId];

  const params = {
    TableName: instanceTable.name,
    Key: {
      [instanceTable.userId]: userId,
      [instanceTable.instanceId]: instanceId,
    },
  };

  try {
    console.debug('params: ' + JSON.stringify(params));
    const response = await db.get(params).promise();
    if (response.Item) {
      return { statusCode: 200, body: JSON.stringify(response.Item) };
    } else {
      return { statusCode: 404, body: JSON.stringify({ message: 'Not Found' }) };
    }
  } catch (dbError) {
    console.error(dbError);
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
