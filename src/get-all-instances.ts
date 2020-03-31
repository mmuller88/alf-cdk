import { EC2 } from 'aws-sdk';

const PRIMARY_KEY = process.env.PRIMARY_KEY || '';
const STACK_NAME = process.env.STACK_NAME || '';

const ec2 = new EC2();

export const handler = async (event: any = {}): Promise<any> => {
  console.debug("get-all-instances event: " + JSON.stringify(event));

  const queryStringParameters = event.queryStringParameters;
  var ec2Instances;

  if(queryStringParameters && queryStringParameters[PRIMARY_KEY]){
    const params: EC2.Types.DescribeInstancesRequest = {
      Filters: [
        { Name: 'tag:STACK_NAME' },
        { Values: [STACK_NAME] },
        { Name: `tag:${PRIMARY_KEY}` },
        { Values: [queryStringParameters[PRIMARY_KEY]] }
      ]
    }

    ec2Instances = await ec2.describeInstances(params).promise();
  } else {
    const params: EC2.Types.DescribeInstancesRequest = {
      Filters: [
        { Name: 'tag:STACK_NAME' },
        { Values: [STACK_NAME] }
      ]
    }
    ec2Instances = await ec2.describeInstances(params).promise();
  }

  return { statusCode: 200, body: JSON.stringify(ec2Instances), isBase64Encoded: false };
};
