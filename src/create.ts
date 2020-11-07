import { DynamoDB } from 'aws-sdk'; // eslint-disable-line import/no-extraneous-dependencies
import { instanceTable, InstanceItem, InstanceStatus } from './statics';
const db = new DynamoDB.DocumentClient();

export const handler = async (input: any = {}): Promise<any> => {
  console.debug('insert input request: ' + JSON.stringify(input));

  const inputObj: any = typeof input === 'object' ? input : JSON.parse(input);

  const item: InstanceItem = inputObj.item;

  // const forceStatus: InstanceStatus = inputObj.forceStatus;
  // const expectedStatus = forceStatus === InstanceStatus.stopped && item.expectedStatus === InstanceStatus.running ? InstanceStatus.stopped : item.expectedStatus;

  // item.expectedStatus = expectedStatus;

  // item['last_status'] = {status: item['status'], time: new Date()};
  // item['expectedStatus'] = 'running';

  try {
    var putResult;
    if (item.expectedStatus === InstanceStatus.terminated) {
      const params: DynamoDB.DocumentClient.DeleteItemInput = {
        TableName: instanceTable.name,
        Key: {
          [instanceTable.userId]: item.userId,
          [instanceTable.instanceId]: item.instanceId,
        },
      };
      console.debug('DeleteItemInput: ' + JSON.stringify(params));
      putResult = await db.delete(params).promise();
    } else {
      // item[instanceTable.lastStatus] = {
      //   [instanceTable.lastUpdate]: new Date().toTimeString(),
      //   [instanceTable.status]: item[instanceTable.expectedStatus]
      // }
      var params: DynamoDB.DocumentClient.PutItemInput = {
        TableName: instanceTable.name,
        Item: item,
      };
      if (item.expectedStatus === InstanceStatus.stopped) {
        params.ConditionExpression = 'attribute_exists(alfInstanceId)';
      }
      console.debug('PutItemInput: ' + JSON.stringify(params));
      putResult = await db.put(params).promise();
    }
    console.debug('putResult: ' + JSON.stringify(putResult));
    return { item: item, putResult: putResult };
  } catch (error) {
    console.error(error);
    throw error;
  }
};
