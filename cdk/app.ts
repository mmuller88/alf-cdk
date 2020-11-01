
import { name } from '../package.json';
import { PipelineApp, PipelineAppProps } from 'alf-cdk-app-pipeline/pipeline-app';
import { AlfInstancesStack, AlfInstancesStackProps, alfTypes } from './alf-instances-stack'
import { sharedDevAccountProps, sharedProdAccountProps } from 'alf-cdk-app-pipeline/accountConfig';

const pipelineAppProps: PipelineAppProps = {
  branch: 'master',
  repositoryName: name,
  stageAccounts: [
    {
      account: {
        id: '981237193288',
        region: 'eu-central-1',
      },
      stage: 'dev',
    },
    {
      account:{
        id: '981237193288',
        region: 'us-east-1',
      },
      stage: 'prod',
    },
  ],
  buildAccount: {
    id: '981237193288',
    region: 'eu-central-1',
  },
  customStack: (scope, stageAccount) => {
    // values that are differs from the stages
    const alfCdkSpecifics = {
      ...(stageAccount.stage === 'dev' ? {
        // domain: {
        //   domainName: `api.${sharedDevAccountProps.zoneName.slice(0,-1)}`,
        //   zoneName: sharedDevAccountProps.zoneName,
        //   hostedZoneId: sharedDevAccountProps.hostedZoneId,
        //   certificateArn: `arn:aws:acm:us-east-1:${account.id}:certificate/f605dd8c-4ae3-4c1b-9471-4b152e0f8846`
        // },
        createInstances: {
          enabled: true,
          imageId: 'ami-0ea3405d2d2522162',
          minutes: 5,
          maxPerUser: 2,
          maxInstances: 3,
          domain: {
            domainName: `i.${sharedDevAccountProps.zoneName.slice(0,-1)}`,
            hostedZoneId: 'Z0847928PFMOCU700U4U',
            certArn: `arn:aws:acm:eu-central-1:${stageAccount.account.id}:certificate/d40cd852-5bbf-4c1d-9a18-2d96e5307b4c`,
          }
        },
        swagger: {
          domain: {
            domainName: sharedDevAccountProps.domainName,
            certificateArn: sharedDevAccountProps.acmCertRef,
          }
        },
        auth: {
          cognito: {
            userPoolArn: `arn:aws:cognito-idp:eu-central-1:981237193288:userpool/eu-central-1_xI5xo2eys`,
            // scope: 'aws.cognito.signin.user.admin'
          }
        },
      } : { // prod stage
        // domain: {
        //   domainName: `api.${sharedProdAccountProps.zoneName.slice(0,-1)}`, // 'api.alfpro.net',
        //   zoneName: sharedProdAccountProps.zoneName,
        //   hostedZoneId: sharedProdAccountProps.hostedZoneId,
        //   certificateArn: `arn:aws:acm:us-east-1:${account.id}:certificate/62010fca-125e-4780-8d71-7d745ff91789`
        // },
        createInstances: {
          enabled: false,
          imageId: 'ami-01a6e31ac994bbc09',
          minutes: 45,
          maxPerUser: 2,
          maxInstances: 50,
          domain: {
            domainName: `i.${sharedProdAccountProps.zoneName.slice(0,-1)}`,
            hostedZoneId: 'Z00371764UBVAUANTU0U',
            certArn: `arn:aws:acm:eu-central-1:${stageAccount.account.id}:certificate/4fe684df-36da-4516-bd01-7fcc22337dff`,
          }
        },
        swagger: {
          domain: {
            domainName: sharedProdAccountProps.domainName,
            certificateArn: sharedProdAccountProps.acmCertRef,
          }
        },
        auth: {
          cognito: {
            userPoolArn: `arn:aws:cognito-idp:us-east-1:${stageAccount.account.id}:userpool/us-east-1_lFlTwabjJ`,
            // scope: 'aws.cognito.signin.user.admin'
          }
        },
      }),
    }
    // console.log('echo = ' + JSON.stringify(account));
    const alfInstancesStackProps: AlfInstancesStackProps = {
      environment: stageAccount.stage,
      env: {
        region: stageAccount.account.region,
        account: stageAccount.account.id
      },
      stage: stageAccount.stage,
      stackName: `${name}-${stageAccount.stage}`,
      // domain: alfCdkSpecifics.domain,
      createInstances: {
        enabled: alfCdkSpecifics.createInstances.enabled,
        imageId: alfCdkSpecifics.createInstances.imageId,
        alfTypes,
        automatedStopping: {
          minutes: alfCdkSpecifics.createInstances.minutes
        },
        allowedConstraints: {
          maxPerUser: alfCdkSpecifics.createInstances.maxPerUser,
          maxInstances: alfCdkSpecifics.createInstances.maxInstances,
        },
        domain: alfCdkSpecifics.createInstances.domain,
      },
      executer: {
        rate: 'rate(1 minute)'
      },
      swagger: {
        file: 'templates/swagger_validations.yaml',
        domain: {
          domainName: alfCdkSpecifics.swagger.domain.domainName,
          subdomain: 'openapi',
          certificateArn: alfCdkSpecifics.swagger.domain.certificateArn,
        }
      },
      auth: alfCdkSpecifics.auth,
    };

    return new AlfInstancesStack(scope, `${name}-${stageAccount.stage}`, alfInstancesStackProps);
  },
  manualApprovals: (account) => {
    return account.stage === 'dev' ? false : true;
  },
  testCommands: (stageAccount) => [
    ...(stageAccount.stage==='dev'? [
      `${callLambda('getInstancesApi', '.statusCode == 201')}`,
      `${callLambda('getAllConfApi', '.statusCode == 200')}`,
      `${callLambda('optionsApi', '.statusCode == 200')}`,
      `${callLambda('getOneConfApi', '.statusCode == 404', {
        queryStringParameters: {
          userId: 'alice'
        },
        pathParameters: {
          alfInstanceId: '123'
        },
      })}`,
      `${callLambda('updateApi', '.statusCode == 404', {
        pathParameters: {
          alfInstanceId: '123'
        },
        body: {
          userId: 'alice'
        }
      })}`,
    ] : []),
  ],
};

// tslint:disable-next-line: no-unused-expression
new PipelineApp(pipelineAppProps);

function callLambda(name: string, jqSelect: string, payload?: object) {
  return `
    echo '${JSON.stringify(payload || {})}' > clear_payload
    aws lambda invoke --function-name ${name} --payload fileb://clear_payload --region eu-central-1 output.json
    cat output.json | jq -e 'select(${jqSelect})'`
}
