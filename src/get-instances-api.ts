import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpErrorHandler from '@middy/http-error-handler';
import inputOutputLogger from '@middy/input-output-logger';
import { EC2 } from 'aws-sdk'; // eslint-disable-line import/no-extraneous-dependencies
import * as httpErrors from 'http-errors';
import { instanceTable, Instance, Ec2InstanceType, AlfType, GitRepo } from './statics';
import mockAuthLayer from './util/mockAuthLayer';

// const STACK_NAME = process.env.STACK_NAME || '';
const HOSTED_ZONE_ID = process.env.HOSTED_ZONE_ID || '';
const DOMAIN_NAME = process.env.DOMAIN_NAME || '';
const MOCK_AUTH = process.env.MOCK_AUTH || 'true';

const ec2 = new EC2();
// const route = new Route53();

// const headers = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Methods': 'POST,GET,PUT,DELETE,OPTIONS',
//   'Access-Control-Allow-Headers': "'*'",
//   'Access-Control-Exposed-Headers': "'ETag','x-amz-meta-custom-header','Authorization','Content-Type','Accept'",
// };

// export const handler = async (event: any): Promise<any> => {
//   return handlerWithInterceptors(event, [new ABInterceptor('ABInterceptor')]);
// }

// const handlerWithInterceptors = async (event: any, interceptors: InterceptorInterface[]): Promise<any> => {
// const response = {};
// for(const interceptor of interceptors) {
//   if(!interceptor.intercept(event, response)){
//     return response;
//   }
// }
export const handler = middy(async (event: any) => {
  const pathParameters = event.pathParameters;
  const queryStringParameters = event.queryStringParameters;
  let ec2Instances: EC2.Types.DescribeInstancesResult;
  let params: EC2.Types.DescribeInstancesRequest;

  const instanceAliveStates = ['pending', 'running', 'stopping', 'stopped'];
  if (queryStringParameters?.[instanceTable.userId]) {
    params = {
      Filters: [
        { Name: 'instance-state-name', Values: instanceAliveStates },
        // { Name: 'tag:aws:', Values: [STACK_NAME] },
        { Name: `tag:${instanceTable.userId}`, Values: [queryStringParameters[instanceTable.userId]] },
      ],
    };
  } else {
    params = {
      Filters: [
        { Name: 'instance-state-name', Values: instanceAliveStates },
        // { Name: 'tag:STACK_NAME', Values: [STACK_NAME] }
      ],
    };
  }
  if (pathParameters) {
    params = {
      Filters: [
        // { Name: 'tag:STACK_NAME', Values: [STACK_NAME] },
        { Name: `tag:${instanceTable.alfInstanceId}`, Values: [pathParameters[instanceTable.alfInstanceId]] },
      ],
    };
  }

  console.log('params: ', JSON.stringify(params));
  ec2Instances = await ec2.describeInstances(params).promise();
  console.log('ec2Instances: ', JSON.stringify(ec2Instances));

  const instances: Instance[] = [];

  const reservations = ec2Instances?.Reservations || [];

  await Promise.all(
    reservations.map(async (res) => {
      if (res.Instances) {
        const instance = res.Instances[0];
        console.log('instance: ', JSON.stringify(instance));
        const alfType: AlfType = {
          ec2InstanceType: instance.Tags?.filter((tag) => tag.Key === 'ec2InstanceType')[0].Value as Ec2InstanceType,
          gitRepo: instance.Tags?.filter((tag) => tag.Key === 'gitRepo')[0].Value as GitRepo,
        };
        // const alfType = JSON.parse(instance.Tags?.filter(tag => tag.Key === 'alfType')[0].Value || '{}');
        const status = instance.State?.Name;
        const instanceId = instance.Tags?.filter((tag) => tag.Key === instanceTable.alfInstanceId)[0].Value;

        const resultInstance: Instance = {
          // tags: JSON.parse(instance.Tags?.filter(tag => tag.Key === 'tags')?.[0].Value || ''),
          instanceId,
          userId: instance.Tags?.filter((tag) => tag.Key === instanceTable.userId)?.[0].Value || '',
          alfType,
          url: instance.PublicDnsName ? instance.PublicDnsName : undefined,
          status,
          adminCredentials: {
            userName: 'admin',
            password: 'admin',
          },
        };

        if (instance.PublicDnsName && HOSTED_ZONE_ID && DOMAIN_NAME) {
          // const url = instance.Tags?.filter(tag => tag.Key === 'url')?.[0]?.Value || '';

          // if(url === ''){
          // const iDomainName = `${instanceId}.${DOMAIN_NAME}`;
          // const recordParams: Route53.Types.ChangeResourceRecordSetsRequest = {
          //   HostedZoneId: HOSTED_ZONE_ID,
          //   ChangeBatch: {
          //     Changes: [ {
          //       Action: "UPSERT",
          //       ResourceRecordSet: {
          //         TTL: 300,
          //         Name: iDomainName,
          //         ResourceRecords: [ {Value: instance.PublicDnsName || ''}],
          //         Type: 'CNAME'
          //       }
          //     }]
          //   }
          // }

          // console.debug("recordParams: ", JSON.stringify(recordParams));
          // const recordResult = await route.changeResourceRecordSets(recordParams).promise();
          // console.debug("recordResult: ", JSON.stringify(recordResult));

          // const tagParams: EC2.Types.CreateTagsRequest = {
          //   Resources: [instance.InstanceId || ''],
          //   Tags: [
          //     {
          //       Key: 'url',
          //       Value: iDomainName
          //     }
          // ]};

          // console.debug("tagParams: ", JSON.stringify(tagParams));
          // const createTagsResult = await ec2.createTags(tagParams).promise();
          // console.debug("createTagsResult: ", JSON.stringify(createTagsResult));
          // url = iDomainName;
          // }
          resultInstance.url = `${instanceId}.i.${DOMAIN_NAME}`;
          resultInstance.awsUrl = instance.PublicDnsName;
        }
        instances.push(resultInstance);
      }
    }),
  );

  console.log('instances: ', JSON.stringify(instances));

  if (pathParameters) {
    if (ec2Instances?.Reservations?.length === 0) {
      throw new httpErrors.NotFound('not found');
    } else {
      return { statusCode: 200, body: JSON.stringify(instances[0]) };
    }
  } else {
    return { statusCode: 200, body: JSON.stringify(instances) };
  }
});

const onionHandler = handler
  .use(inputOutputLogger())
  .use(httpErrorHandler())
  .use(
    cors({
      origin: '*',
    }),
  );

if (MOCK_AUTH === 'true') {
  onionHandler.use(mockAuthLayer());
}
