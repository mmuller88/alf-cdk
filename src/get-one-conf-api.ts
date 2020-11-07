import { DynamoDB } from 'aws-sdk'; // eslint-disable-line import/no-extraneous-dependencies
import { instanceTable } from './statics';
const db = new DynamoDB.DocumentClient();

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,GET,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': "'*'",
  'Access-Control-Exposed-Headers': "'ETag','x-amz-meta-custom-header','Authorization','Content-Type','Accept'",
};

export const handler = async (event: any = {}): Promise<any> => {
  console.debug('get-one event: ' + JSON.stringify(event));
  const userId = event.queryStringParameters[instanceTable.userId];
  const alfInstanceId = event.pathParameters[instanceTable.instanceId];

  const params = {
    TableName: instanceTable.name,
    Key: {
      [instanceTable.userId]: userId,
      [instanceTable.instanceId]: alfInstanceId,
    },
  };

  try {
    console.debug('params: ' + JSON.stringify(params));
    const response = await db.get(params).promise();
    if (response.Item) {
      return { statusCode: 200, body: JSON.stringify(response.Item), headers: headers };
    } else {
      return { statusCode: 404, body: JSON.stringify({ message: 'Not Found' }), headers: headers };
    }
  } catch (dbError) {
    console.error(dbError);
    throw new Error(JSON.stringify(dbError));
  }
};
