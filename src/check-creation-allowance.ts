const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';

export const handler = async (item: any = {}): Promise<any> => {
  console.debug('Item: ' + JSON.stringify(item, null, 2));

  const params = {
    TableName: TABLE_NAME,
  };

  const response = await db.scan(params).promise();
  if (response.Items.length > 2) {
    // item['status'] = 'failed';
    return { result: "failed", item: item};
  } else {
    // item['status'] = 'creating'
    return { result: "ok", item: item };
  }
};
