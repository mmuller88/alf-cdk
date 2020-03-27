const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';
const SORT_KEY = process.env.SORT_KEY || '';

export const handler = async (event: any = {}): Promise<any> => {
  const requestedItemId = event.pathParameters[SORT_KEY];
  if (!requestedItemId) {
    return { statusCode: 400, body: `Error: You are missing the path parameter ${SORT_KEY}` };
  }

  const params = {
    TableName: TABLE_NAME,
    Key: {
      [SORT_KEY]: requestedItemId,
    },
  };

  try {
    await db.delete(params).promise();
    return { statusCode: 204, body: '' };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
};
