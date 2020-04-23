
import { DynamoDB } from 'aws-sdk';
import { instanceTable } from './statics';

const db = new DynamoDB.DocumentClient();

export const handler = async (event: any = {}): Promise<any> => {
  console.debug("executer event: " + JSON.stringify(event));

  try {
    var response = await db.scan({
      TableName: instanceTable.name,
    }).promise();
    response.Items?.forEach(item => {
      const instanceId = item[instanceTable.alfInstanceId];
      const expectedStatus = item[instanceTable.expectedStatus]
      console.debug(`instanceId: ${instanceId} is expected to be: ${expectedStatus}`);
    });
    console.debug('DB results :' + JSON.stringify(response.Items))

    response
    return { statusCode: 200};
  } catch (error) {
    return { statusCode: 500, error: error };
  }

}
