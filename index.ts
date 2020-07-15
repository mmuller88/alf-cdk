import { StackProps, Stack, App, RemovalPolicy, CfnOutput } from '@aws-cdk/core';
import logs = require('@aws-cdk/aws-logs');
import { AlfCdkRestApi, Domain } from './AlfCdkRestApi';
import { AlfCdkTables } from './lib/AlfCdkTables';
import { AlfCdkLambdas } from './lib/AlfCdkLambdas';
import { AlfCdkStepFunctions } from './lib/AlfCdkStepFunctions';
import { AlfTypes, accountConfig } from './src/statics';

export interface AlfInstancesStackProps extends StackProps {
  /**
   * if undefined no ec2 instances will be created
   */
  createInstances?: {
    enabled: boolean
    alfTypes: AlfTypes
    imageId: string
    vpcId: string
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
  swagger: {
    file: string,
    domain?: {
      domainName: string,
      subdomain: string,
      certificateArn: string
    }
  }
  auth?: {
    cognito?: {
      userPoolArn?: string,
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

    new AlfCdkTables(this, lambdas);

    new AlfCdkRestApi(this, lambdas, props);

    const stepFunctions = new AlfCdkStepFunctions(this, lambdas, props);

    lambdas.createOneApi.addEnvironment('STATE_MACHINE_ARN', stepFunctions.createStateMachine.stateMachineArn);
    lambdas.executerLambda.addEnvironment('STOP_STATE_MACHINE_ARN', stepFunctions.stopStateMachine.stateMachineArn);
    lambdas.updateOneApi.addEnvironment('STATE_MACHINE_ARN', stepFunctions.updateStateMachine.stateMachineArn);

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

const prodAccount = accountConfig['prodAccount'];
new AlfInstancesStack(app, `AlfInstancesProd`, {
  environment: prodAccount.stage,
  env: {
    region: prodAccount.region,
    account: prodAccount.account
  },
    createInstances: {
      enabled: false,
      imageId: 'ami-01a6e31ac994bbc09',
      vpcId: prodAccount.defaultVpc,
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
        userPoolArn: 'arn:aws:cognito-idp:us-east-1:981237193288:userpool/us-east-1_8c1pujn9g',
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
      certificateArn: 'arn:aws:acm:us-east-1:981237193288:certificate/62010fca-125e-4780-8d71-7d745ff91789'
    }
  });

const devAccount = accountConfig['devAccount'];
new AlfInstancesStack(app, `AlfInstancesDev`, {
  environment: devAccount.stage,
  env: {
    region: devAccount.region,
    account: devAccount.account
  },
  createInstances: {
    enabled: true,
    imageId: 'ami-0ea3405d2d2522162',
    vpcId: devAccount.defaultVpc,
    alfTypes: alfTypes,
    automatedStopping: {
      minutes: 5
    },
    allowedConstraints: {
      maxPerUser: 2,
      maxInstances: 3
    }
  },
  executer: {
    rate: 'rate(1 minute)'
  },
  swagger: {
    file: 'tmp/swagger_full.yaml',
  },
});

app.synth();
