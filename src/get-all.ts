const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';
const USER_KEY = process.env.USER_KEY || '';

export const handler = async (event: any = {}): Promise<any> => {
  const params = {
    TableName: TABLE_NAME,
  };

  const queryParamsUserId = event.queryParams.userId;

  let queryParams : any = {RequestItems: {}};
  queryParams.RequestItems[TABLE_NAME] = {
      Keys: [{USER_KEY: queryParamsUserId}],
      ProjectionExpression: USER_KEY //define other fileds that you have Ex: 'id,name'
  };

  try {
    var response;
    if(queryParams){
      response = await db.batchGet(queryParams).promise();
    } else {
      response = await db.scan(params).promise();
    }
    return { statusCode: 200, body: JSON.stringify(response.Items) };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
};
