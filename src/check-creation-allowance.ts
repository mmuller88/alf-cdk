const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require('uuid');
const TABLE_NAME = process.env.TABLE_NAME || '';
const PRIMARY_KEY = process.env.PRIMARY_KEY || '';

const RESERVED_RESPONSE = `Error: You're using AWS reserved keywords as attributes`,
  DYNAMODB_EXECUTION_ERROR = `Error: Execution update, caused a Dynamodb error, please take a look at your CloudWatch Logs.`;

export const handler = async (event: any = {}): Promise<any> => {
  console.debug('Received event: ' + JSON.stringify(event, null, 2));

  if (!event.body) {
    return { statusCode: 400, body: 'invalid request , you are missing the parameter body' };
  }
  const item = typeof event.body == 'object' ? event.body : JSON.parse(event.body);
  item[PRIMARY_KEY] = uuidv4();
  const params = {
    TableName: TABLE_NAME,
  };

  try {
    // await db.put(params).promise();
    // const response = await db.scan(params).promise();
    await db.scan(params).promise();
    const result = event;
    result.message = 'ok';
    return result;
    // return { statusCode: 200, body: '{"result":"true"}' };
    // if (response.Items.count > 2) {
    //   return { statusCode: 200, body: '{"result":"false"}' };
    // } else {
    //   return { statusCode: 200, body: '{"result":"true"}' };
    // }
  } catch (dbError) {
    const errorResponse =
      dbError.code === 'ValidationException' && dbError.message.includes('reserved keyword')
        ? DYNAMODB_EXECUTION_ERROR
        : RESERVED_RESPONSE;
    return { statusCode: 500, body: errorResponse };
  }
};
