const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';
const PRIMARY_KEY = process.env.PRIMARY_KEY || '';
const SORT_KEY = process.env.SORT_KEY || '';

export const handler = async (event: any = {}): Promise<any> => {
  console.debug("delete-one event: " + JSON.stringify(event));
  const alfUserId = event.queryStringParameters[PRIMARY_KEY];
  const requestedItemId = event.pathParameters[SORT_KEY];

  const params = {
    TableName: TABLE_NAME,
    Key: {
      [PRIMARY_KEY]: alfUserId,
      [SORT_KEY]: requestedItemId,
    },
  };

  try {
    console.debug("params: " + JSON.stringify(params));
    await db.delete(params).promise();
    return { statusCode: 204, body: '' };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
};
