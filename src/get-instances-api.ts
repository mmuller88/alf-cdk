import { EC2, Route53 } from 'aws-sdk';
import { instanceTable, Instance } from './statics';

// const STACK_NAME = process.env.STACK_NAME || '';
const HOSTED_ZONE_ID = process.env.HOSTED_ZONE_ID || '';
const DOMAIN_NAME = process.env.DOMAIN_NAME || '';

const ec2 = new EC2();
const route = new Route53();

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': "POST,GET,PUT,DELETE,OPTIONS",
  'Access-Control-Allow-Headers': "'*'",
  'Access-Control-Exposed-Headers': "'ETag','x-amz-meta-custom-header','Authorization','Content-Type','Accept'",
}

export const handler = async (event: any = {}): Promise<any> => {
  console.debug("get-instances-api event: " + JSON.stringify(event));

  const pathParameters = event.pathParameters;
  const queryStringParameters = event.queryStringParameters;
  var ec2Instances: EC2.Types.DescribeInstancesResult;
  var params: EC2.Types.DescribeInstancesRequest;

  const instanceAliveStates = ['pending','running','stopping','stopped'];
  if(queryStringParameters?.[instanceTable.userId]){
    params = {
      Filters: [
        { Name: 'instance-state-name', Values: instanceAliveStates},
        // { Name: 'tag:aws:', Values: [STACK_NAME] },
        { Name: `tag:${instanceTable.userId}`, Values: [queryStringParameters[instanceTable.userId]] }
      ]
    }
  } else {
    params = {
      Filters: [
        { Name: 'instance-state-name', Values: instanceAliveStates },
        // { Name: 'tag:STACK_NAME', Values: [STACK_NAME] }
      ]
    }
  }
  if (pathParameters){
    params = {
      Filters: [
        // { Name: 'tag:STACK_NAME', Values: [STACK_NAME] },
        { Name: `tag:${instanceTable.alfInstanceId}`, Values: [pathParameters[instanceTable.alfInstanceId]] }
      ]
    }
  }

  console.log("params: ", JSON.stringify(params));
  ec2Instances = await ec2.describeInstances(params).promise();
  console.log("ec2Instances: ", JSON.stringify(ec2Instances));

  var instances : Instance[] = [];

  const reservations = ec2Instances?.Reservations || [];

  await Promise.all(reservations.map(async res => {
    if(res.Instances){
      const instance = res.Instances[0];
      console.log("instance: ", JSON.stringify(instance));
      const alfType = JSON.parse(instance.Tags?.filter(tag => tag.Key === 'alfType')[0].Value || '{}');
      const status = instance.State?.Name
      const instanceId = instance.Tags?.filter(tag => tag.Key === instanceTable.alfInstanceId)[0].Value

      var resultInstance: Instance = {
        tags: JSON.parse(instance.Tags?.filter(tag => tag.Key === 'tags')?.[0].Value || ''),
        instanceId: instanceId,
        userId: instance.Tags?.filter(tag => tag.Key === instanceTable.userId)?.[0].Value || '',
        alfType: alfType,
        url: instance.PublicDnsName ? instance.PublicDnsName : undefined,
        status: status,
        adminCredentials: {
          userName: 'admin',
          password: 'admin'
        }
      }

      if (instance.PublicDnsName && HOSTED_ZONE_ID && DOMAIN_NAME){
        var url = instance.Tags?.filter(tag => tag.Key === 'url')?.[0]?.Value || '';

        // if(url === ''){
          const iDomainName = `${instanceId}.${DOMAIN_NAME}`;
          const recordParams: Route53.Types.ChangeResourceRecordSetsRequest = {
            HostedZoneId: HOSTED_ZONE_ID,
            ChangeBatch: {
              Changes: [ {
                Action: "UPSERT",
                ResourceRecordSet: {
                  TTL: 300,
                  Name: iDomainName,
                  ResourceRecords: [ {Value: instance.PublicDnsName || ''}],
                  Type: 'CNAME'
                }
              }]
            }
          }

          console.debug("recordParams: ", JSON.stringify(recordParams));
          const recordResult = await route.changeResourceRecordSets(recordParams).promise();
          console.debug("recordResult: ", JSON.stringify(recordResult));

          const tagParams: EC2.Types.CreateTagsRequest = {
            Resources: [instance.InstanceId || ''],
            Tags: [
              {
                Key: 'url',
                Value: iDomainName
              }
          ]};

          console.debug("tagParams: ", JSON.stringify(tagParams));
          const createTagsResult = await ec2.createTags(tagParams).promise();
          console.debug("createTagsResult: ", JSON.stringify(createTagsResult));
          url = iDomainName;
        // }
        resultInstance.url = url;
        resultInstance.awsUrl = instance.PublicDnsName;
      }
      instances.push(resultInstance);
    }
  }));

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

  if(pathParameters){
    if(ec2Instances?.Reservations?.length === 0){
      return { statusCode: 404, body: JSON.stringify({message:'Not Found'}), headers: headers };
    } else{
      return { statusCode: 200, body: JSON.stringify(instances[0]), headers: headers };
    }
  } else {
    return { statusCode: 200, body: JSON.stringify(instances), headers: headers };
  }
};
