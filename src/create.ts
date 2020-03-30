import { DynamoDB } from 'aws-sdk';
const db = new DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';

export const handler = async (data: any = {}): Promise<any> => {
  console.debug('insert item request: ' + JSON.stringify(data));

  var item: any = typeof data === 'object' ? data : JSON.parse(data);


  item['last_status'] = {stats: item['status'], time: new Date()};
  item['status'] = undefined;
  // item['status'] = 'creating';
  const params = {
    TableName: TABLE_NAME,
    Item: item
  };

  console.debug('params: ' + JSON.stringify(params));
  const putResult = await db.put(params).promise();
  return { statusCode: 201, item: item, putResult: putResult};
};
