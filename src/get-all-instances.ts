import { EC2 } from 'aws-sdk';
import { instanceTable } from './statics';

const STACK_NAME = process.env.STACK_NAME || '';

const ec2 = new EC2();

const headers = {
  'Access-Control-Allow-Origin': '*'
}

export const handler = async (event: any = {}): Promise<any> => {
  console.debug("get-all-instances event: " + JSON.stringify(event));

  const queryStringParameters = event.queryStringParameters;
  var ec2Instances: EC2.Types.DescribeInstancesResult;
  var params: EC2.Types.DescribeInstancesRequest;

  if(queryStringParameters && queryStringParameters[instanceTable.primaryKey]){
    params = {
      Filters: [
        { Name: 'instance-state-code', Values: ['16'] },
        { Name: 'tag:STACK_NAME', Values: [STACK_NAME] },
        { Name: `tag:${instanceTable.primaryKey}`, Values: [queryStringParameters[instanceTable.primaryKey]] }
      ]
    }
  } else {
    params = {
      Filters: [
        { Name: 'instance-state-code', Values: ['16'] },
        { Name: 'tag:STACK_NAME', Values: [STACK_NAME] }
      ]
    }
  }
  console.log("params: ", JSON.stringify(params));
  ec2Instances = await ec2.describeInstances(params).promise();
  console.log("ec2Instances: ", JSON.stringify(ec2Instances));

  var instances : any[] = [];

  ec2Instances.Reservations?.forEach(res => {
    if(res.Instances){
      const instance = res.Instances[0];
      console.log("instance: ", JSON.stringify(instance));
      instances.push({
        'customName': instance.Tags?.filter(tag => tag.Key === 'Name')[0].Value,
        [instanceTable.sortKey]: instance.Tags?.filter(tag => tag.Key === instanceTable.sortKey)[0].Value,
        [instanceTable.primaryKey]: instance.Tags?.filter(tag => tag.Key === instanceTable.primaryKey)[0].Value,
        'alfType': instance.Tags?.filter(tag => tag.Key === 'alfType')[0].Value,
        'shortLived': instance.Tags?.filter(tag => tag.Key === 'shortLived')[0].Value,
        url: instance.PublicDnsName,
        status: instance.State?.Name,
        initialPassword: 'admin'
      })
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
