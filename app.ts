
import { name } from './package.json';
import { PipelineApp, PipelineAppProps } from 'alf-cdk-app-pipeline/pipeline-app';
import { AlfInstancesStack, AlfInstancesStackProps, alfTypes } from './lib/alf-instances-stack'
import { sharedDevAccountProps, sharedProdAccountProps } from 'alf-cdk-app-pipeline/accountConfig';

const pipelineAppProps: PipelineAppProps = {
  branch: 'master',
  repositoryName: name,
  accounts: [
    {
      id: '981237193288',
      region: 'eu-central-1',
      stage: 'dev',
    },
    {
      id: '981237193288',
      region: 'us-east-1',
      stage: 'prod',
    },
  ],
  buildAccount: {
    id: '981237193288',
    region: 'eu-central-1',
    stage: 'dev',
  },
  customStack: (scope, account) => {
    // values that are differs from the stages
    const alfCdkSpecifics = {
      ...(account.stage === 'dev' ? {
        createInstances: {
          enabled: true,
          imageId: 'ami-0ea3405d2d2522162',
          minutes: 5,
          maxPerUser: 2,
          maxInstances: 3,
          domain: {
            domainName: 'i.dev.alfpro.net',
            hostedZoneId: 'Z0847928PFMOCU700U4U',
            certArn: 'arn:aws:acm:eu-central-1:981237193288:certificate/d40cd852-5bbf-4c1d-9a18-2d96e5307b4c',
          }
        },
        swagger: {
          domain: {
            domainName: sharedDevAccountProps.domainName,
            certificateArn: sharedDevAccountProps.acmCertRef,
          }
        },
      } : { // prod stage
        createInstances: {
          enabled: false,
          imageId: 'ami-01a6e31ac994bbc09',
          minutes: 45,
          maxPerUser: 2,
          maxInstances: 50,
          domain: {
            domainName: 'i.alfpro.net',
            hostedZoneId: 'Z00371764UBVAUANTU0U',
            certArn: 'arn:aws:acm:eu-central-1:981237193288:certificate/4fe684df-36da-4516-bd01-7fcc22337dff',
          }
        },
        swagger: {
          domain: {
            domainName: sharedProdAccountProps.domainName,
            certificateArn: sharedProdAccountProps.acmCertRef,
          }
        },
      }),
    }
    // console.log('echo = ' + JSON.stringify(account));
    const alfInstancesStackProps: AlfInstancesStackProps = {
      environment: account.stage,
      env: {
        region: account.region,
        account: account.id
      },
      stage: account.stage,
      stackName: `${name}-${account.stage}`,
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
    };

    return new AlfInstancesStack(scope, `${name}-${account.stage}`, alfInstancesStackProps);
  },
  destroyStack: () => {
    return false;
  },
  manualApprovals: (account) => {
    return account.stage === 'dev' ? false : true;
  },
  testCommands: (account) => [
    // Use 'curl' to GET the given URL and fail if it returns an error
    // 'sleep 180',
    // 'curl -Ssf $InstancePublicDnsName',
    `npx newman run test/alf-cdk.postman_collection.json --env-var baseUrl=$RestApiEndPoint -r cli,json --reporter-json-export tmp/newman/report.json --export-environment tmp/newman/env-vars.json --export-globals tmp/newman/global-vars.json`,
    'echo done! Delete all remaining Stacks!',
    `aws cloudformation describe-stacks --query "Stacks[?Tags[?Key == 'alfInstanceId'][]].StackName" --region ${account.region} --output text |
    awk '{print $1}' |
    while read line;
    do aws cloudformation delete-stack --stack-name $line --region ${account.region};
    done`,
  ],
};

// tslint:disable-next-line: no-unused-expression
new PipelineApp(pipelineAppProps);

// new AlfInstancesStack(app, `AlfInstancesProd`, {
//   environment: prodAccount.stage,
//   env: {
//     region: prodAccount.region,
//     account: prodAccount.account
//   },
//     createInstances: {
//       enabled: false,
//       imageId: 'ami-01a6e31ac994bbc09',
//       vpcId: prodAccount.defaultVpc,
//       alfTypes: alfTypes,
//       automatedStopping: {
//         minutes: 45
//       },
//       allowedConstraints: {
//         maxPerUser: 2,
//         maxInstances: 50
//       },
//       domain: {
//         domainName: 'i.alfpro.net',
//         hostedZoneId: 'Z00371764UBVAUANTU0U',
//         vpc: {
//           id: 'vpc-410e9d29',
//           subnetId1: 'subnet-5e45e424',
//           subnetId2: 'subnet-b19166fd'
//         }
//       }
//     },
//     // executer: {
//     //   rate: 'rate(30 minutes)'
//     // },
//     auth: {
//       cognito: {
//         userPoolArn: 'arn:aws:cognito-idp:us-east-1:981237193288:userpool/us-east-1_8c1pujn9g',
//         scope: 'aws.cognito.signin.user.admin'
//       }
//     },
//     swagger: {
//       file: 'templates/swagger_validations.yaml',
//       domain: {
//         domainName: 'alfpro.net',
//         subdomain: 'api-explorer',
//         certificateArn: 'arn:aws:acm:us-east-1:981237193288:certificate/62010fca-125e-4780-8d71-7d745ff91789'
//       }
//     },
//     domain: {
//       domainName: 'api.alfpro.net',
//       zoneName: 'api.alfpro.net.',
//       hostedZoneId: 'Z04953172FKBG951SIZNM',
//       certificateArn: 'arn:aws:acm:us-east-1:981237193288:certificate/62010fca-125e-4780-8d71-7d745ff91789'
//     }
//   });
