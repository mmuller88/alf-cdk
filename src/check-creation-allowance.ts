import { DynamoDB } from 'aws-sdk';
import { instanceTable } from './statics';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
const db = new DynamoDB.DocumentClient();

const MAX_PER_USER: string = process.env.MAX_PER_USER || '';

export const handler = async (data: any = {}): Promise<any> => {
  console.debug('check-creation-allowance data: ' + JSON.stringify(item, null, 2));
  var item: any = typeof data === 'object' ? data : JSON.parse(data);

  const userId = item[instanceTable.userId];

  var params: DocumentClient.QueryInput = {
    TableName: instanceTable.name,
    KeyConditionExpression: `#${instanceTable.userId} = :${instanceTable.userId}`,
    ExpressionAttributeNames: {'#userId': `${instanceTable.userId}`},
    ExpressionAttributeValues: { ':userId': userId }
  }
  console.debug("QueryInput: " + params);

  var response;
  try {
    response = await db.query(params).promise();
    console.debug(`response: ${response}`);
  } catch (error) {
    console.debug(`error: ${error} item: ${item}`);
    throw error;
  }

  const maxPerUser = Number(MAX_PER_USER);
  console.debug(`maxPerUser: ${maxPerUser}`);
  if(response && response.Items && (!maxPerUser || (maxPerUser && response.Items?.length <= maxPerUser))){
    return { result: "ok", item: item };
  } else {
    return { result: "failed", item: item};
  }
};
