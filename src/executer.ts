
import { DynamoDB } from 'aws-sdk';
// import { EC2 } from 'aws-sdk';
import { instanceTable } from './statics';
// import { DocumentClient } from 'aws-sdk/clients/dynamodb';

// const STACK_NAME = process.env.STACK_NAME || '';

const db = new DynamoDB.DocumentClient();
// const ec2 = new EC2();

export const handler = async (event: any = {}): Promise<any> => {
  console.debug("executer event: " + JSON.stringify(event));

  try {
    var response = await db.scan({
      TableName: instanceTable.name,
    }).promise();

    console.debug('DB results :' + JSON.stringify(response.Items));

    response.Items?.forEach(async item => {
      const alfInstanceId = item[instanceTable.alfInstanceId];
      const expectedStatus = item[instanceTable.expectedStatus]
      // const userId = item[instanceTable.primaryKey];
      console.debug(`alfInstanceId: ${alfInstanceId} is expected to be: ${expectedStatus}`);

    });

    return { statusCode: 200};
  } catch (error) {
    return { statusCode: 500, error: error };
  }

}
