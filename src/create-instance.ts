const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();
// const { v4 : uuidv4 } = require('uuid');
const TABLE_NAME = process.env.TABLE_NAME || '';
// const PRIMARY_KEY = process.env.PRIMARY_KEY || '';
// const SORT_KEY = process.env.SORT_KEY || '';

const RESERVED_RESPONSE = `Error: You're using AWS reserved keywords as attributes`,
  DYNAMODB_EXECUTION_ERROR = `Error: Execution update, caused a Dynamodb error, please take a look at your CloudWatch Logs.`;

export const handler = async (data: any = {}): Promise<any> => {
  console.debug('insert item request: ' + JSON.stringify(data));

  // var item: any = typeof data.item === 'object' ? data.item : JSON.parse(data.item);
  var item: any = typeof data === 'object' ? data : JSON.parse(data);

  // item[PRIMARY_KEY] = uuidv4();
  // item[PRIMARY_KEY] = item[PRIMARY_KEY];
  // item[SORT_KEY] = uuidv4();
  const params = {
    TableName: TABLE_NAME,
    Item: item
  };

  try {
    console.debug('params: ' + JSON.stringify(params));
    await db.put(params).promise();
    return { statusCode: 201, body: '' };
  } catch (dbError) {
    const errorResponse =
      dbError.code === 'ValidationException' && dbError.message.includes('reserved keyword')
        ? DYNAMODB_EXECUTION_ERROR
        : RESERVED_RESPONSE;
    return { statusCode: 500, body: errorResponse };
  }
};
