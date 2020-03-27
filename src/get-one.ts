const AWS = require('aws-sdk');
import { DynamoDB } from 'aws-sdk';
const TABLE_NAME = process.env.TABLE_NAME || '';
const PRIMARY_KEY = process.env.PRIMARY_KEY || '';
const SORT_KEY = process.env.SORT_KEY || '';

const db = new DynamoDB.DocumentClient();


export const handler = async (event: any = {}): Promise<any> => {
  console.debug("get-one event: " + JSON.stringify(event));
  const alfUserId = event.queryStringParameters[PRIMARY_KEY];
  const requestedItemId = event.pathParameters[SORT_KEY];
  // if (!requestedItemId) {
  //   return { statusCode: 400, body: `Error: You are missing the path parameter id` };
  // }

  const queryStringParameters = event.queryStringParameters;

  const params = {
    TableName: TABLE_NAME,
    Key: {
      [PRIMARY_KEY]: alfUserId,
      [SORT_KEY]: requestedItemId,
    },
  };

  try {
    console.debug("params: " + JSON.stringify(params));
    const response = await db.get(params).promise();
    return { statusCode: 200, body: JSON.stringify(response.Item) };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
};
