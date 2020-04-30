import { DynamoDB } from 'aws-sdk';
import { instanceTable } from './statics';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
const db = new DynamoDB.DocumentClient();

const MAX_PER_USER: string = process.env.MAX_PER_USER || '';

export const handler = async (data: any = {}): Promise<any> => {
  console.debug('check-creation-allowance data: ' + JSON.stringify(data));
  var item: any = typeof data === 'object' ? data : JSON.parse(data);

  const userId = item[instanceTable.userId];

  var params: DocumentClient.QueryInput = {
    TableName: instanceTable.name,
    KeyConditionExpression: `#${instanceTable.userId} = :${instanceTable.userId}`,
    ExpressionAttributeNames: {'#userId': `${instanceTable.userId}`},
    ExpressionAttributeValues: { ':userId': userId }
  }
  console.debug("QueryInput: " + JSON.stringify(params));

  var response: DocumentClient.QueryOutput;
  try {
    response = await db.query(params).promise();
    console.debug('response: ' + JSON.stringify(response));
  } catch (error) {
    console.debug(`error: ${error} item: ${item}`);
    throw error;
  }

  const maxPerUser = Number(MAX_PER_USER);
  console.debug(`maxPerUser: ${maxPerUser}`);
  if(response && response.Items && response.Count ){
      if(!MAX_PER_USER || response.Count <= maxPerUser){
        return { result: "ok", item: item, allowRule: '!MAX_PER_USER || response.Count <= maxPerUser' };
      }
    }
  return { result: "failed", item: item};
};
