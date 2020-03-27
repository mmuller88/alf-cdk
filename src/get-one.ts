const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';
const SORT_KEY = process.env.SORT_KEY || '';

export const handler = async (event: any = {}): Promise<any> => {
  console.debug("get-one event: " + JSON.stringify(event));
  const requestedItemId = event.pathParameters[SORT_KEY];
  // if (!requestedItemId) {
  //   return { statusCode: 400, body: `Error: You are missing the path parameter id` };
  // }

  const params = {
    TableName: TABLE_NAME,
    Key: {
      [SORT_KEY]: requestedItemId,
    },
  };

  try {
    const response = await db.get(params).promise();
    return { statusCode: 200, body: JSON.stringify(response.Item) };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
};
