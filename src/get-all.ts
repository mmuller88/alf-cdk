import { DynamoDB } from 'aws-sdk';
import { instanceTable } from './statics';
import { isAdmin } from './util';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

// const TABLE_NAME = process.env.TABLE_NAME || '';
// const PRIMARY_KEY = process.env.PRIMARY_KEY || '';
const MOCK_AUTH_USERNAME = process.env.MOCK_AUTH_USERNAME || '';
// const ADMIN_TABLE_NAME = process.env.ADMIN_TABLE_NAME || '';

const db = new DynamoDB.DocumentClient();

const headers = {
  'Access-Control-Allow-Origin': '*'
}

export const handler = async (event: any = {}): Promise<any> => {
  console.debug("get-all event: " + JSON.stringify(event));

  const queryStringParameters = event.queryStringParameters;

  const userName = MOCK_AUTH_USERNAME ? queryStringParameters && queryStringParameters['mockAuthUser'] ? queryStringParameters['mockAuthUser'] : MOCK_AUTH_USERNAME : 'boing';
  console.debug("userName: " + userName);
  if(!userName){
    return { statusCode: 401, body: {message: 'Authentication issue: no credentials found'}, headers: headers };
  }

  const isAdminb = isAdmin(userName);

  try {
    var response;

    if(isAdminb){
      if(queryStringParameters && queryStringParameters[instanceTable.primaryKey]){
        var params: DocumentClient.QueryInput = {
          TableName: instanceTable.name,
          KeyConditionExpression: `#${instanceTable.primaryKey} = :${instanceTable.primaryKey}`,
          ExpressionAttributeNames: {'#userId': `${instanceTable.primaryKey}`},
          ExpressionAttributeValues: { ':userId': queryStringParameters[instanceTable.primaryKey] }
        }
        console.debug("params: " + params);
        response = await db.query(params).promise();

      } else {
        response = await db.scan({
            TableName: instanceTable.name,
          }).promise();
       }
    } else {
      var params: DocumentClient.QueryInput = {
        TableName: instanceTable.name,
        KeyConditionExpression: `#${instanceTable.primaryKey} = :${instanceTable.primaryKey}`,
        ExpressionAttributeNames: {'#userId': `${instanceTable.primaryKey}`},
        ExpressionAttributeValues: { ':userId': userName }
      }
      console.debug("params: " + params);
      response = await db.query(params).promise();
    }

    return { statusCode: 200, body: JSON.stringify(response.Items), headers: headers};
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError), headers: headers };
  }
};
