import { StackProps, Stack, App, RemovalPolicy, CfnOutput } from '@aws-cdk/core';
import logs = require('@aws-cdk/aws-logs');
import { AlfCdkRestApi, Domain } from './AlfCdkRestApi';
import { AlfCdkTables } from './lib/AlfCdkTables';
import { AlfCdkLambdas } from './lib/AlfCdkLambdas';
import { AlfCdkStepFunctions } from './lib/AlfCdkStepFunctions';
import { AlfTypes } from './src/statics';

export interface AlfInstancesStackProps extends StackProps {
  /**
   * if undefined no ec2 instances will be created
   */
  createInstances?: {
    enabled: boolean
    alfTypes: AlfTypes
    imageId: string
    automatedStopping?: {
      minutes: number
    }
    allowedConstraints: {
      maxPerUser: number
      maxInstances: number
    }
    domain?: {
      domainName: string,
      hostedZoneId: string,
      vpc: {
        id: string,
        subnetId1: string,
        subnetId2: string
      }
    }
  }
  executer?: {
    rate: string,
  }
  swagger?: {
    file: string,
    domain?: {
      domainName: string,
      subdomain: string,
      certificateArn: string
    }
  }
  auth?: {
    cognito?: {
      userPoolArn: string,
      scope?: string
    },
  }
  environment: string
  domain?: Domain
}

export class AlfInstancesStack extends Stack {
  constructor(app: App, id: string, props?: AlfInstancesStackProps) {
    super(app, id, props);

    const lambdas = new AlfCdkLambdas(this, props);
    this.stackName

    new AlfCdkTables(this, lambdas);

    new AlfCdkRestApi(this, lambdas, props);

    const stepFunctions = new AlfCdkStepFunctions(this, lambdas, props);

    lambdas.createOneApi.addEnvironment('STATE_MACHINE_ARN', stepFunctions.createStateMachine.stateMachineArn);
    lambdas.updateOneApi.addEnvironment('STATE_MACHINE_ARN', stepFunctions.updateStateMachine.stateMachineArn)

    // Configure log group for short retention
    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      retention: logs.RetentionDays.ONE_DAY,
      removalPolicy: RemovalPolicy.DESTROY,
      logGroupName: '/aws/lambda/custom/' + this.stackName
    });

    const lgstream = logGroup.addStream('myloggroupStream')

    new CfnOutput(this, 'LogGroupName', {
      value: logGroup.logGroupName
    });

    new CfnOutput(this, 'LogGroupStreamName', {
      value: lgstream.logStreamName
    });
  }
}

const app = new App();

const alfTypes: AlfTypes = { 't2.large': ['alf-ec2-1'], 't2.xlarge': ['alf-ec2-1']};

new AlfInstancesStack(app, "AlfInstancesStackEuWest2Prod", {
    environment: 'prod',
    env: {
      region: "eu-west-2",
      account: '981237193288'
    },
    createInstances: {
      enabled: true,
      imageId: 'ami-01a6e31ac994bbc09',
      alfTypes: alfTypes,
      automatedStopping: {
        minutes: 45
      },
      allowedConstraints: {
        maxPerUser: 2,
        maxInstances: 50
      },
      domain: {
        domainName: 'i.alfpro.net',
        hostedZoneId: 'Z00371764UBVAUANTU0U',
        vpc: {
          id: 'vpc-410e9d29',
          subnetId1: 'subnet-5e45e424',
          subnetId2: 'subnet-b19166fd'
        }
      }
    },
    // executer: {
    //   rate: 'rate(30 minutes)'
    // },
    auth: {
      cognito: {
        userPoolArn: 'arn:aws:cognito-idp:eu-west-2:981237193288:userpool/eu-west-2_9BVmRPfz1',
        scope: 'aws.cognito.signin.user.admin'
      }
    },
    swagger: {
      file: 'tmp/swagger_full_.yaml',
      domain: {
        domainName: 'alfpro.net',
        subdomain: 'api-explorer',
        certificateArn: 'arn:aws:acm:us-east-1:981237193288:certificate/62010fca-125e-4780-8d71-7d745ff91789'
      }
    },
    domain: {
      domainName: 'api.alfpro.net',
      zoneName: 'api.alfpro.net.',
      hostedZoneId: 'Z04953172FKBG951SIZNM',
      certificateArn: 'arn:aws:acm:eu-west-2:981237193288:certificate/eda6e2ed-2715-4127-b52f-70a1b734b9f9'
    }
  });

new AlfInstancesStack(app, "AlfInstancesStackEuWest1Dev", {
  environment: 'dev',
  env: {
    region: 'eu-west-1',
    account: '981237193288'
  },
  // autau
  createInstances: {
    enabled: true,
    imageId: 'ami-0ea3405d2d2522162',
    alfTypes: alfTypes,
    automatedStopping: {
      minutes: 1
    },
    allowedConstraints: {
      maxPerUser: 2,
      maxInstances: 3
    }
  },
  executer: {
    rate: 'rate(1 minute)'
  },
  // cognito
  swagger: {
    file: 'tmp/swagger_full.yaml',
    // domain: 'h-o.dev',
    // subdomain: 'api-explorer',
    // certificateArn: 'arn:aws:acm:us-east-1:609841182532:certificate/f299b75b-f22c-404d-98f2-89529f4d2c96'
  },
  // domain: {
  //   domainName: 'api.h-o.dev',
  //   zoneName: 'api.h-o.dev.',
  //   hostedZoneId: 'Z01486521Z813EMSKNWNH',
  //   certificateArn: 'arn:aws:acm:eu-west-2:609841182532:certificate/8616e4e3-8570-42db-9cbd-6e6e76da3c5f'
  // }
});

app.synth();
