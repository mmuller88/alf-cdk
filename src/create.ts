import { DynamoDB } from 'aws-sdk';
import { instanceTable } from './statics';
const db = new DynamoDB.DocumentClient();

export const handler = async (data: any = {}): Promise<any> => {
  console.debug('insert data request: ' + JSON.stringify(data));

  var item: any = typeof data === 'object' ? data : JSON.parse(data);

  // item['last_status'] = {status: item['status'], time: new Date()};
  // item['expectedStatus'] = 'running';

  try {

    var putResult;
    if(item[instanceTable.expectedStatus] === 'terminated'){
      const params: DynamoDB.DocumentClient.DeleteItemInput = {
        TableName: instanceTable.name,
        Key: {
          [instanceTable.userId]: item[instanceTable.userId],
          [instanceTable.alfInstanceId]: item[instanceTable.alfInstanceId],
        },
      };
      console.debug('DeleteItemInput: ' + JSON.stringify(params));
      putResult = await db.delete(params).promise();
    } else {
      // item[instanceTable.lastStatus] = {
      //   [instanceTable.lastUpdate]: new Date().toTimeString(),
      //   [instanceTable.status]: item[instanceTable.expectedStatus]
      // }
      const params: DynamoDB.DocumentClient.PutItemInput = {
        TableName: instanceTable.name,
        Item: item
      };
      console.debug('PutItemInput: ' + JSON.stringify(params));
      putResult = await db.put(params).promise();

    }

    console.debug('putResult: ' + JSON.stringify(putResult));
    return { item: item, putResult: putResult, };
  } catch (error) {
    console.error(error);
    throw error;
  }
};
