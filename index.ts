import { StackProps, Stack, App, RemovalPolicy, CfnOutput } from '@aws-cdk/core';
import logs = require('@aws-cdk/aws-logs');
import { AlfCdkRestApi, Domain } from './AlfCdkRestApi';
import { AlfCdkTables } from './lib/AlfCdkTables';
import { AlfCdkLambdas } from './lib/AlfCdkLambdas';
import { AlfCdkStepFunctions } from './lib/AlfCdkStepFunctions';

export interface AlfInstancesStackProps extends StackProps {
  /**
   * if undefined no ec2 instances will be created
   */
  createInstances?: {
    imageId: string
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
      userPoolArn?: string
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

    const stepFunctions = new AlfCdkStepFunctions(this, lambdas);

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

new AlfInstancesStack(app, "AlfInstancesStackEuWest2Prod", {
    environment: 'prod',
    env: {
      region: "eu-west-2",
      account: '981237193288'
    },
    // disable create ec2 instance
    // createInstances: {
    //   imageId: 'ami-04d5cc9b88f9d1d39'
    // },
    executer: {
      rate: 'rate(30 minutes)'
    },
    // auth: {
    //   cognito: {
    //     userPoolArn: 'arn:aws:cognito-idp:eu-west-2:981237193288:userpool/eu-west-2_9BVmRPfz1'
    //   }
    // },
    swagger: {
      file: 'tmp/swagger_full_.yaml',
      domain: {
        domainName: 'h-o.dev',
        subdomain: 'api-explorer',
        certificateArn: 'arn:aws:acm:us-east-1:981237193288:certificate/ff4bd794-01eb-4a5a-8e16-c8d3151845da'
      }
    },
    domain: {
      domainName: 'api.h-o.dev',
      zoneName: 'api.h-o.dev.',
      hostedZoneId: 'Z087093236D67UXK26HG',
      certificateArn: 'arn:aws:acm:eu-west-2:981237193288:certificate/18671030-753d-4047-8e26-76794b69fa7b'
    }
  });

new AlfInstancesStack(app, "AlfInstancesStackEuWest2", {
  environment: 'dev',
  env: {
    region: 'eu-west-2',
    account: '609841182532'
  },
  // auth: {
  // },
  createInstances: {
    imageId: 'ami-0cb790308f7591fa6'
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
