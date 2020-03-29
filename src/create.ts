import { DynamoDB } from 'aws-sdk';
const db = new DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';

const RESERVED_RESPONSE = `Error: You're using AWS reserved keywords as attributes`,
  DYNAMODB_EXECUTION_ERROR = `Error: Execution update, caused a Dynamodb error, please take a look at your CloudWatch Logs.`;

export const handler = async (data: any = {}): Promise<any> => {
  console.debug('insert item request: ' + JSON.stringify(data));

  var item: any = typeof data === 'object' ? data : JSON.parse(data);

  item['status'] = 'scheduled';
  const params = {
    TableName: TABLE_NAME,
    Item: item
  };

  try {
    console.debug('params: ' + JSON.stringify(params));
    const putResult = await db.put(params).promise();
    return { statusCode: 201, item: item, putResult: putResult};
  } catch (dbError) {
    const errorResponse =
      dbError.code === 'ValidationException' && dbError.message.includes('reserved keyword')
        ? DYNAMODB_EXECUTION_ERROR
        : RESERVED_RESPONSE;
    return { statusCode: 500, error: errorResponse, item: item };
  }
};
