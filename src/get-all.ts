// const AWS = require('aws-sdk');
import { DynamoDB } from 'aws-sdk';
// const db = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';
// const USER_KEY = process.env.USER_KEY || '';

const db = new DynamoDB.DocumentClient();

export const handler = async (event: any = {}): Promise<any> => {
  console.debug("get-all event: " + JSON.stringify(event));
  const params = {
    TableName: TABLE_NAME,
  };

  const queryStringParameters = event.queryStringParameters;

  try {
    var response;
    if(queryStringParameters){

      // const params = {
      //   ExpressionAttributeValues: {
      //     ':id' : {String: queryStringParameters[USER_KEY]}
      //   },
      //   KeyConditionExpression: 'alfUserId = :id',
      //   // FilterExpression: 'contains (alfUserId, :alfUserId)',
      //   TableName: TABLE_NAME
      // };

      console.debug("params: " + JSON.stringify(params));
      response = await db.query({
        TableName: TABLE_NAME,
        KeyConditionExpression: '#alfUserId = :alfUserId',
        ExpressionAttributeNames: {"#alfUserId": "alfUserId"},
        ExpressionAttributeValues: { ':alfUserId':'bald' },
      }).promise();

    } else {
      response = await db.scan(params).promise();
     }
    return { statusCode: 200, body: JSON.stringify(response.Items) };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
};
