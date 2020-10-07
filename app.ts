
import { name } from './package.json';
import { PipelineApp, PipelineAppProps } from 'alf-cdk-app-pipeline/pipeline-app';
import { AlfInstancesStack, AlfInstancesStackProps, alfTypes } from './lib/alf-instances-stack'

const pipelineAppProps: PipelineAppProps = {
  branch: 'master',
  repositoryName: name,
  customStack: (scope, account) => {
    const alfCdkSpecifics = {
      ...(account.stage === 'dev' ? {
        imageId: 'ami-0ea3405d2d2522162',
        minutes: 5,
        maxPerUser: 2,
        maxInstances: 3,
      }
       : account.stage === 'prod' ? {
        imageId: 'ami-01a6e31ac994bbc09',
        minutes: 45,
        maxPerUser: 2,
        maxInstances: 50,
      } : { // No stage defined. Default back to dev
        imageId: 'ami-0ea3405d2d2522162',
        minutes: 5,
        maxPerUser: 2,
        maxInstances: 3,
      })
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
        enabled: true,
        imageId: alfCdkSpecifics.imageId,
        vpcId: account.vpc.vpcId,
        alfTypes,
        automatedStopping: {
          minutes: alfCdkSpecifics.minutes
        },
        allowedConstraints: {
          maxPerUser: alfCdkSpecifics.maxPerUser,
          maxInstances: alfCdkSpecifics.maxInstances,
        },
      },
      executer: {
        rate: 'rate(1 minute)'
      },
      swagger: {
        file: 'templates/swagger_validations.yaml',
        domain: {
          domainName: account.domainName,
          subdomain: 'openapi',
          certificateArn: account.acmCertRef,
        }
      },
    };

    return new AlfInstancesStack(scope, `${name}-${account.stage}`, alfInstancesStackProps);
  },
  destroyStack: false,
  testCommands: (_) => [
    // Use 'curl' to GET the given URL and fail if it returns an error
    // 'sleep 180',
    // 'curl -Ssf $InstancePublicDnsName',
    'echo done!!!',
  ],
};

// tslint:disable-next-line: no-unused-expression
new PipelineApp(pipelineAppProps);
