import { DynamoDB } from 'aws-sdk';
import { instanceTable } from './statics';
import { isAdmin } from './util';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

const MOCK_AUTH_USERNAME = process.env.MOCK_AUTH_USERNAME || '';

const db = new DynamoDB.DocumentClient();

const headers = {
  'Access-Control-Allow-Origin': '*'
}

export const handler = async (event: any = {}): Promise<any> => {
  console.debug("get-all event: " + JSON.stringify(event));

  const queryStringParameters = event.queryStringParameters;

  const authUser = MOCK_AUTH_USERNAME ? queryStringParameters && queryStringParameters['mockAuthUser'] ? queryStringParameters['mockAuthUser'] : MOCK_AUTH_USERNAME : 'boing';
  console.debug("authUser: " + authUser);
  if(!authUser){
    return { statusCode: 401, body: {message: 'Authentication issue: no credentials found'}, headers: headers };
  }

  const authUserIsAdmin: boolean = await isAdmin(authUser);

  try {
    var response;

    if(!authUserIsAdmin || queryStringParameters && queryStringParameters[instanceTable.userId]){
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
    return { statusCode: 500, body: JSON.stringify(dbError), headers: headers };
  }
};
