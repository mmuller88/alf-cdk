import { DynamoDB } from 'aws-sdk';
import { instanceTable } from './statics';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
const db = new DynamoDB.DocumentClient();

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
  } catch (error) {
    console.debug(`error: ${error} item: ${item}`);
    throw error;
  }

  if(response && response.Items && response.Items?.length <= 2){
    return { result: "ok", item: item };
  } else {
    return { result: "failed", item: item};
  }

};
