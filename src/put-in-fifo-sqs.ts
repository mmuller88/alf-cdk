import { SQS } from 'aws-sdk'; // eslint-disable-line import/no-extraneous-dependencies
import { RecordList } from 'aws-sdk/clients/dynamodbstreams'; // eslint-disable-line import/no-extraneous-dependencies
import { SendMessageRequest } from 'aws-sdk/clients/sqs'; // eslint-disable-line import/no-extraneous-dependencies

const sqs = new SQS();

const SQS_URL = process.env.SQS_URL || '';

export const handler = async (event: any = {}): Promise<any> => {
  console.debug('put-in-fifo-sqs event: ', JSON.stringify(event, null, 2));
  const records: RecordList = event.Records;
  // const record = records[0];
  await Promise.all(
    records.map(async (record) => {
      console.debug('Stream record: ', JSON.stringify(record, null, 2));
      const params: SendMessageRequest = {
        QueueUrl: SQS_URL,
        MessageBody: JSON.stringify(record),
        // MessageDeduplicationId: record.dynamodb?.Keys?.instanceId.S,
        MessageGroupId: 'sameGroup',
      };
      console.debug('params: ', JSON.stringify(params, null, 2));
      const sendMessageResult = await sqs.sendMessage(params).promise();
      console.debug('sendMessageResult: ', JSON.stringify(sendMessageResult, null, 2));
    }),
  );
};
