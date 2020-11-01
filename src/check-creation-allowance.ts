import { DynamoDB } from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { instanceTable } from './statics';
const db = new DynamoDB.DocumentClient();

const MAX_PER_USER: string = process.env.MAX_PER_USER || '';
const MAX_INSTANCES: string = process.env.MAX_INSTANCES || '3';

export const handler = async (data: any = {}): Promise<any> => {
  console.debug('check-creation-allowance data: ' + JSON.stringify(data));
  var item: any = typeof data === 'object' ? data : JSON.parse(data);

  const userId = item[instanceTable.userId];

  var params: DocumentClient.QueryInput = {
    TableName: instanceTable.name,
    KeyConditionExpression: `#${instanceTable.userId} = :${instanceTable.userId}`,
    ExpressionAttributeNames: { '#userId': `${instanceTable.userId}` },
    ExpressionAttributeValues: { ':userId': userId },
  };
  console.debug('QueryInput: ' + JSON.stringify(params));

  var response: DocumentClient.QueryOutput;
  var response2: DocumentClient.ScanOutput;
  try {
    response = await db.query(params).promise();
    response2 = await db.scan({
      TableName: instanceTable.name,
    }).promise();
    console.debug('response: ' + JSON.stringify(response));
  } catch (error) {
    console.debug(`error: ${error} item: ${item}`);
    throw error;
  }

  const maxPerUser = Number(MAX_PER_USER);
  const maxInstances = Number(MAX_INSTANCES);
  console.debug(`maxPerUser: ${maxPerUser}`);
  console.debug(`maxInstances: ${maxInstances}`);
  if (response.Count != null && response.Items) {
    if (MAX_PER_USER && response.Count >= maxPerUser) {
      return { result: 'failed', item: item, failRule: 'response.Count >= maxPerUser' };
    }
  }
  if (response2.Count != null && response2.Count >= maxInstances) {
    return { result: 'failed', item: item, failRule: 'response2.Count >= maxInstances' };
  }
  return { result: 'ok', item: item };
};
