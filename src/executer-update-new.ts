
import { /** EC2, Route53, */  DynamoDBStreams } from 'aws-sdk';
// import { instanceTable, InstanceItem, InstanceStatus } from './statics';
import { RecordList } from 'aws-sdk/clients/dynamodbstreams';

const dbs = new DynamoDBStreams();

// const STACK_NAME = process.env.STACK_NAME || '';
// const HOSTED_ZONE_ID = process.env.HOSTED_ZONE_ID || '';
// const DOMAIN_NAME = process.env.DOMAIN_NAME || '';

// const ec2 = new EC2();
// const route = new Route53();

export const handler = async (event: any = {}): Promise<any> => {
  dbs.getRecords();
  const records: RecordList = event.Records;
  records.forEach((record) => {
    console.log('Stream record: ', JSON.stringify(record, null, 2));
    if (record?.userIdentity?.Type == "Service" &&
      record.userIdentity.PrincipalId == "dynamodb.amazonaws.com") {

      // Record deleted by DynamoDB Time to Live (TTL)

      // I can archive the record to S3, for example using Kinesis Data Firehose.
    }
  }
};
