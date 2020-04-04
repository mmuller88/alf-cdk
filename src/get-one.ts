import { DynamoDB } from 'aws-sdk';
const TABLE_NAME = process.env.TABLE_NAME || '';
const PRIMARY_KEY = process.env.PRIMARY_KEY || '';
const SORT_KEY = process.env.SORT_KEY || '';

const db = new DynamoDB.DocumentClient();

const headers = {
  'Access-Control-Allow-Origin': '*'
}

export const handler = async (event: any = {}): Promise<any> => {
  console.debug("get-one event: " + JSON.stringify(event));
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
    const response = await db.get(params).promise();
    return { statusCode: 200, body: JSON.stringify(response.Item), headers: headers };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError), headers: headers };
  }
};
