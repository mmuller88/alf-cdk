
import { DynamoDB } from 'aws-sdk';
import { instanceTable } from './statics';

const db = new DynamoDB.DocumentClient();

export const handler = async (event: any = {}): Promise<any> => {
  console.debug("executer event: " + JSON.stringify(event));
  console.debug(" RUUUUUUN");

  try {
    var response = await db.scan({
      TableName: instanceTable.name,
    }).promise();
    console.debug(JSON.stringify(response.Items))
    return { statusCode: 200};
  } catch (error) {
    return { statusCode: 500, error: error };
  }

}
