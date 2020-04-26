import { DynamoDB } from 'aws-sdk';
const db = new DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';

export const handler = async (data: any = {}): Promise<any> => {
  console.debug('insert item request: ' + JSON.stringify(data));

  var item: any = typeof data === 'object' ? data : JSON.parse(data);

  // item['last_status'] = {status: item['status'], time: new Date()};
  // item['expectedStatus'] = 'running';

  const params: DynamoDB.DocumentClient.PutItemInput = {
    TableName: TABLE_NAME,
    Item: item
  };

  try {
    console.debug('params: ' + JSON.stringify(params));
    const putResult = await db.put(params).promise();
    console.debug('putResult: ' + JSON.stringify(putResult));
    return { item: item, putResult: putResult };
  } catch (error) {
    console.error(error);
    throw error;
  }
};
