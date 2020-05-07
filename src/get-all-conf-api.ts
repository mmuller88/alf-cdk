import { DynamoDB } from 'aws-sdk';
import { instanceTable } from './statics';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

const db = new DynamoDB.DocumentClient();

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': "POST,GET,PUT,DELETE,OPTIONS",
  'Access-Control-Allow-Headers': "'*'",
  'Access-Control-Exposed-Headers': "'ETag','x-amz-meta-custom-header','Authorization','Content-Type','Accept'",
}

export const handler = async (event: any = {}): Promise<any> => {
  console.debug("get-all event: " + JSON.stringify(event));

  const queryStringParameters = event.queryStringParameters;

  try {
    var response;

    if(queryStringParameters && queryStringParameters[instanceTable.userId]){
      var params: DocumentClient.QueryInput = {
        TableName: instanceTable.name,
        KeyConditionExpression: `#${instanceTable.userId} = :${instanceTable.userId}`,
        ExpressionAttributeNames: {'#userId': `${instanceTable.userId}`},
        ExpressionAttributeValues: { ':userId': queryStringParameters[instanceTable.userId] }
      }
      console.debug("QueryInput: " + params);
      response = await db.query(params).promise();
    } else {
      response = await db.scan({
        TableName: instanceTable.name,
      }).promise();
    }
    return { statusCode: 200, body: JSON.stringify(response.Items), headers: headers};
  } catch (dbError) {
    throw new Error(JSON.stringify(dbError));
  }
};
