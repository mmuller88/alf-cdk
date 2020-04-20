import { DynamoDB } from 'aws-sdk';
import { instanceTable, adminTable } from './statics';
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
    return { statusCode: 500, body: {message: 'no userName'}, headers: headers };
  }
  const adminTableParams = {
    TableName: adminTable.name,
    Key: {
      [adminTable.primaryKey]: userName,
    },
  };

  console.debug("adminTableParams: " + JSON.stringify(adminTableParams));
  const resp = await db.get(adminTableParams).promise();
  const isAdmin = resp.Item? true: false;
  console.debug(`User: ${userName} Admin: ${isAdmin}`);

  try {
    var response;
    if(queryStringParameters && queryStringParameters[instanceTable.primaryKey]){
      response = await db.query({
        TableName: instanceTable.name,
        KeyConditionExpression: `#${instanceTable.primaryKey} = :${instanceTable.primaryKey}`,
        ExpressionAttributeNames: {'#alfUserId': `${instanceTable.primaryKey}`},
        ExpressionAttributeValues: { ':alfUserId': queryStringParameters[instanceTable.primaryKey] }
      }).promise();

    } else {
      response = await db.scan({
          TableName: instanceTable.primaryKey,
        }).promise();
     }

    return { statusCode: 200, body: JSON.stringify(response.Items), headers: headers};
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError), headers: headers };
  }
};
