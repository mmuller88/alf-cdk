import { DynamoDB } from 'aws-sdk';
const TABLE_NAME = process.env.TABLE_NAME || '';
const PRIMARY_KEY = process.env.PRIMARY_KEY || '';

const db = new DynamoDB.DocumentClient();

export const handler = async (event: any = {}): Promise<any> => {
  console.debug("get-all event: " + JSON.stringify(event));

  const queryStringParameters = event.queryStringParameters;

  try {
    var response;
    if(queryStringParameters && queryStringParameters[PRIMARY_KEY]){
      response = await db.query({
        TableName: TABLE_NAME,
        KeyConditionExpression: '#alfUserId = :alfUserId',
        ExpressionAttributeNames: {'#alfUserId': 'alfUserId'},
        ExpressionAttributeValues: { ':alfUserId': queryStringParameters[PRIMARY_KEY] }
      }).promise();

    } else {
      response = await db.scan({
          TableName: TABLE_NAME,
        }).promise();
     }
    return { statusCode: 200, body: JSON.stringify(response.Items) };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
};
