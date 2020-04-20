import { DynamoDB } from 'aws-sdk';
import { instanceTable } from './statics';
// const TABLE_NAME = process.env.TABLE_NAME || '';
// const PRIMARY_KEY = process.env.PRIMARY_KEY || '';
// const MOCK_AUTH_USERNAME = process.env.MOCK_AUTH_USERNAME || 'false';
// const ADMIN_TABLE_NAME = process.env.ADMIN_TABLE_NAME || '';

const db = new DynamoDB.DocumentClient();

const headers = {
  'Access-Control-Allow-Origin': '*'
}

export const handler = async (event: any = {}): Promise<any> => {
  console.debug("get-all event: " + JSON.stringify(event));

  const queryStringParameters = event.queryStringParameters;

  // const userName = MOCK_AUTH_USERNAME === 'false' ? 'boing' : queryStringParameters['mockedUserId'];
  // const params = {
  //   TableName: ADMIN_TABLE_NAME,
  //   Key: {
  //     [PRIMARY_KEY]: item[PRIMARY_KEY],
  //   },
  // };

  // console.debug("params: " + JSON.stringify(params));
  // const response = await db.get(params).promise();
  // const isAdmin =

  try {
    var response;
    if(queryStringParameters && queryStringParameters[instanceTable.primaryKey]){
      response = await db.query({
        TableName: instanceTable.name,
        KeyConditionExpression: '#alfUserId = :alfUserId',
        ExpressionAttributeNames: {'#alfUserId': 'alfUserId'},
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
