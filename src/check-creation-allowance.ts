const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';
// const TABLE_STATIC_NAME = process.env.TABLE_STATIC_NAME || '';

const RESERVED_RESPONSE = `Error: You're using AWS reserved keywords as attributes`,
  DYNAMODB_EXECUTION_ERROR = `Error: Execution update, caused a Dynamodb error, please take a look at your CloudWatch Logs.`;

export const handler = async (item: any = {}): Promise<any> => {
  console.debug('Item: ' + JSON.stringify(item, null, 2));

  const params = {
    TableName: TABLE_NAME,
  };

  try {
    const response = await db.scan(params).promise();
    if (response.Items.length > 2) {
      return {result: "failed", item: item};
    } else {
      return {result: "ok", item: item};
    }
  } catch (dbError) {
    const errorResponse =
      dbError.code === 'ValidationException' && dbError.message.includes('reserved keyword')
        ? DYNAMODB_EXECUTION_ERROR
        : RESERVED_RESPONSE;
    return { statusCode: 500, body: errorResponse };
  }
};
