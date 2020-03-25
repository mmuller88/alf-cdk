const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';
const USER_KEY = process.env.USER_KEY || '';

export const handler = async (event: any = {}): Promise<any> => {
  console.debug("get-all event: " + JSON.stringify(event));
  const params = {
    TableName: TABLE_NAME,
  };

  try {
    var response;
    if(event.queryParams){
      let queryParams : any = {RequestItems: {}};
      queryParams.RequestItems[TABLE_NAME] = {
        Keys: [{ [USER_KEY]: event.queryParams.userId }]
      };
      response = await db.batchGet(queryParams).promise();
    } else {
      response = await db.scan(params).promise();
    }
    return { statusCode: 200, body: JSON.stringify(response.Items) };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
};
