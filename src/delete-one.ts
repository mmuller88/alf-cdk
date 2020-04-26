import { DynamoDB } from 'aws-sdk';
import { instanceTable } from './statics';
const db = new DynamoDB.DocumentClient();

export const handler = async (data: any = {}): Promise<any> => {
  console.debug("delete-one item: " + JSON.stringify(item));

  var item: any = typeof data === 'object' ? data : JSON.parse(data);
  const userId = item[instanceTable.userId];
  const alfInstanceId = item[instanceTable.alfInstanceId];

  const params = {
    TableName: instanceTable.name,
    Key: {
      [instanceTable.userId]: userId,
      [instanceTable.alfInstanceId]: alfInstanceId,
    },
  };

  try {
    console.debug("params: " + JSON.stringify(params));
    await db.delete(params).promise();
    return { item: item };
  } catch (error) {
    console.error(error);
    throw error;
  }
};
