import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpErrorHandler from '@middy/http-error-handler';
import inputOutputLogger from '@middy/input-output-logger';
import { AWSError } from 'aws-sdk'; // eslint-disable-line import/no-extraneous-dependencies
import { DocumentClient } from 'aws-sdk/clients/dynamodb'; // eslint-disable-line import/no-extraneous-dependencies
import { PromiseResult } from 'aws-sdk/lib/request'; // eslint-disable-line import/no-extraneous-dependencies
import { instanceTable } from './statics';
import mockAuthLayer from './util/mockAuthLayer';
import permissionLayer from './util/permissionLayer';

const db = new DocumentClient();
const MOCK_AUTH = process.env.MOCK_AUTH || '';

export const handler = middy(async (event: any) => {
  console.debug('get-all event: ' + JSON.stringify(event));

  const queryStringParameters = event.queryStringParameters;

  try {
    let response: PromiseResult<DocumentClient.QueryOutput, AWSError>;

    if (queryStringParameters && queryStringParameters[instanceTable.userId]) {
      var params: DocumentClient.QueryInput = {
        TableName: instanceTable.name,
        KeyConditionExpression: `#${instanceTable.userId} = :${instanceTable.userId}`,
        ExpressionAttributeNames: { '#userId': `${instanceTable.userId}` },
        ExpressionAttributeValues: { ':userId': queryStringParameters[instanceTable.userId] },
      };
      console.debug(`params: ${JSON.stringify(params)}`);
      response = await db.query(params).promise();
    } else {
      response = await db
        .scan({
          TableName: instanceTable.name,
        })
        .promise();
    }
    return { statusCode: 200, body: JSON.stringify(response.Items) };
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
