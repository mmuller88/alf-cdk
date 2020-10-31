
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
      `aws lambda invoke --function getInstancesApi --payload '{}' output.json --region ${stageAccount.account.region} | jq -e 'select(.StatusCode == 200)'`
    ] : []),
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
