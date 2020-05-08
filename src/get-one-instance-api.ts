import { EC2 } from 'aws-sdk';
import { instanceTable, Instance } from './statics';

const STACK_NAME = process.env.STACK_NAME || '';
const HOSTED_ZONE_ID = process.env.HOSTED_ZONE_ID || '';

const ec2 = new EC2();

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': "POST,GET,PUT,DELETE,OPTIONS",
  'Access-Control-Allow-Headers': "'*'",
  'Access-Control-Exposed-Headers': "'ETag','x-amz-meta-custom-header','Authorization','Content-Type','Accept'",
}

export const handler = async (event: any = {}): Promise<any> => {
  console.debug("get-all-instances event: " + JSON.stringify(event));

  const pathParameters = event.pathParameters;

  var instances : any[] = [];


  var ec2Instances: EC2.Types.DescribeInstancesResult;
  var params: EC2.Types.DescribeInstancesRequest;

  params = {
    Filters: [
      { Name: 'tag:STACK_NAME', Values: [STACK_NAME] },
      { Name: `tag:${instanceTable.alfInstanceId}`, Values: [pathParameters[instanceTable.alfInstanceId]] }
    ]
  }

  console.log("params: ", JSON.stringify(params));
  ec2Instances = await ec2.describeInstances(params).promise();
  console.log("ec2Instances: ", JSON.stringify(ec2Instances));

  ec2Instances.Reservations?.forEach(res => {
    if(res.Instances){
      const instance = res.Instances[0];
      console.log("instance: ", JSON.stringify(instance));
      const alfType = JSON.parse(instance.Tags?.filter(tag => tag.Key === 'alfType')[0].Value || '{}');
      const status = instance.State?.Name
      const instanceId = instance.Tags?.filter(tag => tag.Key === instanceTable.alfInstanceId)[0].Value
      const resultInstance: Instance = {
        customName: instance.Tags?.filter(tag => tag.Key === 'Name')[0].Value,
        instanceId: instance.Tags?.filter(tag => tag.Key === instanceTable.alfInstanceId)[0].Value,
        userId: instance.Tags?.filter(tag => tag.Key === instanceTable.userId)[0].Value,
        alfType: alfType,
        url: HOSTED_ZONE_ID ? `${instanceId}.${HOSTED_ZONE_ID}` : instance.PublicDnsName,
        status: status,
        adminCredentials: {
          userName: 'admin',
          password: 'admin'
        }
      }
      instances.push(resultInstance);
    }
  })

  console.log("instances: ", JSON.stringify(instances));

  if(ec2Instances?.Reservations?.length === 0){
    return { statusCode: 404, body: JSON.stringify({message:'Not Found'}), headers: headers };
  } else {
    return { statusCode: 200, body: JSON.stringify(instances[0]), headers: headers };
  }
};
