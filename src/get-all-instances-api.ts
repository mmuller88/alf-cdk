import { EC2 } from 'aws-sdk';
import { instanceTable, Instance } from './statics';

const STACK_NAME = process.env.STACK_NAME || '';
const I_DOMAIN_NAME = process.env.I_DOMAIN_NAME || '';

const ec2 = new EC2();

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': "POST,GET,PUT,DELETE,OPTIONS",
  'Access-Control-Allow-Headers': "'*'",
  'Access-Control-Exposed-Headers': "'ETag','x-amz-meta-custom-header','Authorization','Content-Type','Accept'",
}

export const handler = async (event: any = {}): Promise<any> => {
  console.debug("get-all-instances-api event: " + JSON.stringify(event));

  const queryStringParameters = event.queryStringParameters;
  var ec2Instances: EC2.Types.DescribeInstancesResult;
  var params: EC2.Types.DescribeInstancesRequest;

  const instanceAliveStates = ['pending','running','stopping','stopped'];
  if(queryStringParameters && queryStringParameters[instanceTable.primaryKey]){
    params = {
      Filters: [
        { Name: 'instance-state-name', Values: instanceAliveStates},
        { Name: 'tag:STACK_NAME', Values: [STACK_NAME] },
        { Name: `tag:${instanceTable.primaryKey}`, Values: [queryStringParameters[instanceTable.primaryKey]] }
      ]
    }
  } else {
    params = {
      Filters: [
        { Name: 'instance-state-name', Values: instanceAliveStates },
        { Name: 'tag:STACK_NAME', Values: [STACK_NAME] }
      ]
    }
  }
  console.log("params: ", JSON.stringify(params));
  ec2Instances = await ec2.describeInstances(params).promise();
  console.log("ec2Instances: ", JSON.stringify(ec2Instances));

  var instances : Instance[] = [];

  ec2Instances.Reservations?.forEach(res => {
    if(res.Instances){
      const instance = res.Instances[0];
      console.log("instance: ", JSON.stringify(instance));
      const alfType = JSON.parse(instance.Tags?.filter(tag => tag.Key === 'alfType')[0].Value || '{}');
      const status = instance.State?.Name
      const instanceId = instance.Tags?.filter(tag => tag.Key === instanceTable.alfInstanceId)[0].Value
      const resultInstance: Instance = {
        tags: JSON.parse(instance.Tags?.filter(tag => tag.Key === 'tags')[0].Value || ''),
        instanceId: instanceId,
        userId: instance.Tags?.filter(tag => tag.Key === instanceTable.userId)[0].Value,
        alfType: alfType,
        url: I_DOMAIN_NAME ? `${instanceId}.${I_DOMAIN_NAME}` : instance.PublicDnsName,
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

  // var instanceResult;
  // if(ec2Instances && ec2Instances.Reservations && ec2Instances.Reservations[0].Instances){
  //   instanceResult = {
  //     [SORT_KEY]: ec2Instances.Reservations[0].Instances[0].Tags?.filter(tag => tag.Key === SORT_KEY)[0].Value,
  //     url: ec2Instances.Reservations[0].Instances[0].PublicDnsName,
  //     status: ec2Instances.Reservations[0].Instances[0].State?.Name,
  //     initialPassword: 'admin'
  //   };
  // }

  return { statusCode: 200, body: JSON.stringify(instances), isBase64Encoded: false, headers: headers };
};
