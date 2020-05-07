import { CfnOutput, Stack } from '@aws-cdk/core';
// import { Rule, Schedule } from '@aws-cdk/aws-events';
// import { LambdaFunction } from '@aws-cdk/aws-events-targets';
import { Function, AssetCode, Runtime } from '@aws-cdk/aws-lambda';
import { RetentionDays } from '@aws-cdk/aws-logs';
import { Role, ServicePrincipal, ManagedPolicy, PolicyStatement } from '@aws-cdk/aws-apigateway/node_modules/@aws-cdk/aws-iam';
import { AlfInstancesStackProps } from '..';
import { instanceTable } from '../src/statics';

const CI_USER_TOKEN = process.env.CI_USER_TOKEN || '';

export interface AlfCdkLambdasInterface {
  readonly getOneLambda: Function,
  readonly getAllLambda: Function,
  readonly getAllInstancesLambda: Function,
  // readonly deleteOne: Function,
  readonly putOrDeleteOneItemLambda: Function,
  readonly createInstanceLambda: Function,
  readonly checkCreationAllowanceLambda: Function,
  readonly optionsLambda: Function,
  readonly executerLambda: Function,
  readonly getOneInstanceLambda: Function,
  readonly deleteOne: Function;
  createOneApi: Function,
  updateOneApi: Function;
};

export class AlfCdkLambdas implements AlfCdkLambdasInterface{
  getOneLambda: Function;
  getAllLambda: Function;
  getAllInstancesLambda: Function;
  // deleteOne: Function;
  putOrDeleteOneItemLambda: Function;
  createInstanceLambda: Function;
  checkCreationAllowanceLambda: Function;
  createOneApi: Function;
  updateOneApi: Function;
  optionsLambda: Function;
  executerLambda: Function;
  getOneInstanceLambda: Function;
  deleteOne: Function

  constructor(scope: Stack, props?: AlfInstancesStackProps){

    const lambdaRole = new Role(scope, 'LambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),   // required
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
    });

    lambdaRole.addToPolicy(new PolicyStatement({
      resources: ['*'],
      actions: ['ec2:*', 'logs:*'] }));

    // this.executerLambda = new Function(scope, 'executerFunction', {
    //   code: new AssetCode('src'),
    //   handler: 'executer.handler',
    //   // timeout: Duration.seconds(300),
    //   runtime: Runtime.NODEJS_12_X,
    //   environment: {
    //     STACK_NAME: scope.stackName
    //   },
    //   role: ec2Role,
    //   logRetention: RetentionDays.ONE_DAY
    // });

    // Run every day at 6PM UTC
    // See https://docs.aws.amazon.com/lambda/latest/dg/tutorial-scheduled-events-schedule-expressions.html
    // const rule = new Rule(scope, 'Rule', {
    //   schedule: Schedule.expression(props?.executer?.rate || 'rate(30 minutes)')
    // });

    // rule.addTarget(new LambdaFunction(this.executerLambda));

    // GET /instances
    this.getAllInstancesLambda = new Function(scope, 'getAllInstancesApi', {
      code: new AssetCode('src'),
      handler: 'get-all-instances-api.handler',
      runtime: Runtime.NODEJS_12_X,
      environment: {
        STACK_NAME: scope.stackName,
      },
      role: lambdaRole,
      logRetention: RetentionDays.ONE_DAY,
    });

    // GET /instances/:id
    this.getOneInstanceLambda = new Function(scope, 'getOneInstanceApi', {
      code: new AssetCode('src'),
      handler: 'get-one-instance-api.handler',
      runtime: Runtime.NODEJS_12_X,
      environment: {
        STACK_NAME: scope.stackName,
      },
      role: lambdaRole,
      logRetention: RetentionDays.ONE_DAY,
    });

    // GET /instances-conf
    this.getAllLambda = new Function(scope, 'getAllConfApi', {
      code: new AssetCode('src'),
      handler: 'get-all-conf-api.handler',
      runtime: Runtime.NODEJS_12_X,
      logRetention: RetentionDays.ONE_DAY,
    });

    // POST /instances-conf
    this.createOneApi = new Function(scope, 'createConfApi', {
      code: new AssetCode('src'),
      handler: 'create-api.handler',
      runtime: Runtime.NODEJS_12_X,
      environment: {
        SORT_KEY: instanceTable.sortKey
      },
      logRetention: RetentionDays.ONE_DAY,
    });

    // GET /instances-conf/:id
    this.getOneLambda = new Function(scope, 'getOneConfApi', {
      code: new AssetCode('src'),
      handler: 'get-one-conf-api.handler',
      runtime: Runtime.NODEJS_12_X,
      logRetention: RetentionDays.ONE_DAY,
    });

    // PUT /instances-conf/:conf
    this.updateOneApi = new Function(scope, 'updateApi', {
      code: new AssetCode('src'),
      handler: 'update-api.handler',
      runtime: Runtime.NODEJS_12_X,
      environment: {
        SORT_KEY: instanceTable.sortKey
      },
      logRetention: RetentionDays.ONE_DAY,
    });

    // OPTIONS /instances /instances/:id /instances-conf /instances-conf/:id
    this.optionsLambda = new Function(scope, 'optionsApi', {
      code: new AssetCode('src'),
      handler: 'options.handler',
      runtime: Runtime.NODEJS_12_X,
      logRetention: RetentionDays.ONE_DAY,
    });

    this.executerLambda = new Function(scope, 'executerUpdateFunction', {
      code: new AssetCode('src'),
      handler: 'executer-update.handler',
      // timeout: Duration.seconds(300),
      runtime: Runtime.NODEJS_12_X,
      environment: {
        STACK_NAME: scope.stackName
      },
      role: lambdaRole,
      logRetention: RetentionDays.ONE_DAY
    });

    this.putOrDeleteOneItemLambda = new Function(scope, 'putOneItem', {
      code: new AssetCode('src'),
      handler: 'create.handler',
      runtime: Runtime.NODEJS_12_X,
      environment: {
        TABLE_NAME: instanceTable.name,
        PRIMARY_KEY: instanceTable.primaryKey,
        SORT_KEY: instanceTable.sortKey
      },
      logRetention: RetentionDays.ONE_DAY,
    });

    this.createInstanceLambda = new Function(scope, 'createInstance', {
      code: new AssetCode('src'),
      handler: 'create-instance.handler',
      runtime: Runtime.NODEJS_12_X,
      environment: {
        // ALF_TYPES : JSON.stringify(props?.createInstances?.alfTypes),
        CI_USER_TOKEN: CI_USER_TOKEN,
        SECURITY_GROUP: 'default',
        STACK_NAME: scope.stackName,
        IMAGE_ID: props?.createInstances?.enabled === true ? props.createInstances.imageId : '',
      },
      role: lambdaRole,
      logRetention: RetentionDays.ONE_DAY,
    });

    this.checkCreationAllowanceLambda = new Function(scope, 'checkCreationAllowanceLambda', {
      code: new AssetCode('src'),
      handler: 'check-creation-allowance.handler',
      runtime: Runtime.NODEJS_12_X,
      environment: {
        MAX_PER_USER: props?.createInstances?.allowedConstraints.maxPerUser.toString() || '',
        MAX_INSTANCES: props?.createInstances?.allowedConstraints.maxInstances.toString() || '3',
      },
      logRetention: RetentionDays.ONE_DAY,
    });

    // this.deleteOne = new Function(scope, 'deleteOneFunction', {
    //   code: new AssetCode('src'),
    //   handler: 'delete-one.handler',
    //   runtime: Runtime.NODEJS_12_X,
    //   logRetention: RetentionDays.ONE_DAY,
    // });

    new CfnOutput(scope, 'LGGroupdCreate', {
      value: this.putOrDeleteOneItemLambda.logGroup.logGroupName
    });

    new CfnOutput(scope, 'LGGroupdCreateInstance', {
      value: this.createInstanceLambda.logGroup.logGroupName
    });

    new CfnOutput(scope, 'LGGroupdCreateApi', {
      value: this.createOneApi.logGroup.logGroupName
    });

  }
}
