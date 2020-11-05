import { StackProps, Construct, RemovalPolicy, CfnOutput } from '@aws-cdk/core';
import { RetentionDays, LogGroup } from '@aws-cdk/aws-logs';
// import { Domain } from './alf-cdk-rest-api';
import { AlfCdkTables } from './alf-cdk-tables';
import { AlfCdkLambdas } from './alf-cdk-lambdas';
import { AlfCdkStepFunctions } from './alf-cdk-step-functions';
import { AlfTypes } from '../src/statics';
import { CustomStack } from 'alf-cdk-app-pipeline/custom-stack';

export interface AlfInstancesStackProps extends StackProps {
  /**
   * if undefined no ec2 instances will be created
   */
  stage: string;
  createInstances?: {
    enabled: boolean;
    alfTypes: AlfTypes;
    imageId: string;
    automatedStopping?: {
      minutes: number;
    };
    allowedConstraints: {
      maxPerUser: number;
      maxInstances: number;
    };
    domain?: {
      domainName: string;
      hostedZoneId: string;
      certArn: string;
    };
  };
  executer?: {
    rate: string;
  };
  swagger: {
    file: string;
    domain?: {
      domainName: string;
      subdomain: string;
      certificateArn: string;
    };
  };
  auth?: {
    cognito?: {
      userPoolArn?: string;
      scope?: string;
    };
    mock?: string;
  };
  environment: string;
  // domain?: Domain
}

export class AlfInstancesStack extends CustomStack {
  constructor(scope: Construct, id: string, props: AlfInstancesStackProps) {
    super(scope, id, props);

    const lambdas = new AlfCdkLambdas(this, {
      ...props,
      stackName: `lambdas-${props.stackName}`,
    });

    // tslint:disable-next-line: no-unused-expression
    new AlfCdkTables(this, lambdas);

    // tslint:disable-next-line: no-unused-expression
    // new AlfCdkRestApi(this, props);

    // const bAndC = new ConcreteDependable();
    // bAndC.add(lambdas);
    // bAndC.add(apiStack);
    // Take the dependency
    // apiStack.node.addDependency(lambdas);

    const stepFunctions = new AlfCdkStepFunctions(this, lambdas, props);

    lambdas.createOneApi.addEnvironment('STATE_MACHINE_ARN', stepFunctions.createStateMachine.stateMachineArn);
    lambdas.executerLambda.addEnvironment('STOP_STATE_MACHINE_ARN', stepFunctions.stopStateMachine.stateMachineArn);
    lambdas.updateOneApi.addEnvironment('STATE_MACHINE_ARN', stepFunctions.updateStateMachine.stateMachineArn);

    // Configure log group for short retention
    const logGroup = new LogGroup(this, 'LogGroup', {
      retention: RetentionDays.ONE_DAY,
      removalPolicy: RemovalPolicy.DESTROY,
      logGroupName: '/aws/lambda/custom/' + this.stackName,
    });

    const lgstream = logGroup.addStream('myloggroupStream');

    const logGroupName = new CfnOutput(this, 'LogGroupName', {
      value: logGroup.logGroupName,
    });

    this.cfnOutputs['LogGroupName'] = logGroupName;

    const logGroupStreamName = new CfnOutput(this, 'LogGroupStreamName', {
      value: lgstream.logStreamName,
    });

    this.cfnOutputs['LogGroupStreamName'] = logGroupStreamName;
  }
}

export const alfTypes: AlfTypes = { 't2.large': ['alf-ec2-1'], 't2.xlarge': ['alf-ec2-1'] };
