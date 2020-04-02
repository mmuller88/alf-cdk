import { EC2 } from 'aws-sdk';

const PRIMARY_KEY = process.env.PRIMARY_KEY || '';
const SORT_KEY = process.env.SORT_KEY || '';
const STACK_NAME = process.env.STACK_NAME || '';

const ec2 = new EC2();

export const handler = async (event: any = {}): Promise<any> => {
  console.debug("get-all-instances event: " + JSON.stringify(event));

  const queryStringParameters = event.queryStringParameters;
  var ec2Instances: EC2.Types.DescribeInstancesResult;
  var params: EC2.Types.DescribeInstancesRequest;

  if(queryStringParameters && queryStringParameters[PRIMARY_KEY]){
    params = {
      Filters: [
        { Name: 'instance-state-code', Values: ['16'] },
        { Name: 'tag:STACK_NAME', Values: [STACK_NAME] },
        { Name: `tag:${PRIMARY_KEY}`, Values: [queryStringParameters[PRIMARY_KEY]] }
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
        [SORT_KEY]: instance.Tags?.filter(tag => tag.Key === SORT_KEY)[0].Value,
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

  return { statusCode: 200, body: JSON.stringify(instances), isBase64Encoded: false };
};
