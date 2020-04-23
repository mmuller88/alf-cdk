
import { DynamoDB } from 'aws-sdk';
import { instanceTable } from './statics';

const db = new DynamoDB.DocumentClient();

export const handler = async (event: any = {}): Promise<any> => {
  console.debug("executer event: " + JSON.stringify(event));

  try {
    var response = await db.scan({
      TableName: instanceTable.name,
    }).promise();

    console.debug('DB results :' + JSON.stringify(response.Items));

    response.Items?.forEach(async item => {
      const instanceId = item[instanceTable.alfInstanceId];
      const expectedStatus = item[instanceTable.expectedStatus]
      console.debug(`instanceId: ${instanceId} is expected to be: ${expectedStatus}`);

      // ec2 update ..

      item['MapAttribute'] = {
        [instanceTable.lastStatus]: {
          [instanceTable.lastUpdate]: new Date().toDateString(),
          [instanceTable.status]: 'stopped'
        }
      }

      console.debug('item: ' + JSON.stringify(item));

      const params: DynamoDB.DocumentClient.PutItemInput = {
        TableName: instanceTable.name,
        Item: item
      };

      console.debug('params: ' + JSON.stringify(params));
      const putResult = await db.put(params).promise();
      console.debug('putResult :' + JSON.stringify(putResult));
    });

    return { statusCode: 200};
  } catch (error) {
    return { statusCode: 500, error: error };
  }

}
