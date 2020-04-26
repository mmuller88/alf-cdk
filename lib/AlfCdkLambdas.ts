import { CfnOutput, Stack } from '@aws-cdk/core';
// import { Rule, Schedule } from '@aws-cdk/aws-events';
// import { LambdaFunction } from '@aws-cdk/aws-events-targets';
import { Function, AssetCode, Runtime } from '@aws-cdk/aws-lambda';
import { RetentionDays } from '@aws-cdk/aws-logs';
import { Role, ServicePrincipal, ManagedPolicy, PolicyStatement } from '@aws-cdk/aws-apigateway/node_modules/@aws-cdk/aws-iam';
import { AlfInstancesStackProps } from '..';
import { instanceTable, repoTable } from '../src/statics';

const CI_USER_TOKEN = process.env.CI_USER_TOKEN || '';

export interface AlfCdkLambdasInterface {
  readonly getOneLambda: Function,
  readonly getAllLambda: Function,
  readonly getAllInstancesLambda: Function,
  // readonly deleteOne: Function,
  readonly putOneItemLambda: Function,
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
  putOneItemLambda: Function;
  createInstanceLambda: Function;
  checkCreationAllowanceLambda: Function;
  createOneApi: Function;
  updateOneApi: Function;
  optionsLambda: Function;
  executerLambda: Function;
  getOneInstanceLambda: Function;
  deleteOne: Function

  constructor(scope: Stack, props?: AlfInstancesStackProps){

    const ec2Role = new Role(scope, 'Role', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),   // required
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
    });

    ec2Role.addToPolicy(new PolicyStatement({
      resources: ['*'],
      actions: ['ec2:*', 'logs:*'] }));

      this.executerLambda = new Function(scope, 'executerUpdateFunction', {
        code: new AssetCode('src'),
        handler: 'executer-update.handler',
        // timeout: Duration.seconds(300),
        runtime: Runtime.NODEJS_12_X,
        environment: {
          STACK_NAME: scope.stackName
        },
        role: ec2Role,
        logRetention: RetentionDays.ONE_DAY
      });

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

    this.optionsLambda = new Function(scope, 'optionsFunction', {
      code: new AssetCode('src'),
      handler: 'options.handler',
      runtime: Runtime.NODEJS_12_X,
      logRetention: RetentionDays.ONE_DAY,
    });

    this.getOneLambda = new Function(scope, 'getOneItemFunction', {
      code: new AssetCode('src'),
      handler: 'get-one.handler',
      runtime: Runtime.NODEJS_12_X,
      environment: {
        TABLE_NAME: instanceTable.name,
        PRIMARY_KEY: instanceTable.primaryKey,
        SORT_KEY: instanceTable.sortKey
      },
      logRetention: RetentionDays.ONE_DAY,
    });

    this.getAllLambda = new Function(scope, 'getAllItemsFunction', {
      code: new AssetCode('src'),
      handler: 'get-all.handler',
      runtime: Runtime.NODEJS_12_X,
      environment: {
        // TABLE_NAME: instanceTable.name,
        // PRIMARY_KEY: instanceTable.primaryKey,
        MOCK_AUTH_USERNAME: props?.auth?.mockAuth?.userName || '',
        // ADMIN_TABLE_NAME: adminTable.name
      },
      logRetention: RetentionDays.ONE_DAY,
    });

    this.getAllInstancesLambda = new Function(scope, 'getAllInstancesFunction', {
      code: new AssetCode('src'),
      handler: 'get-all-instances.handler',
      runtime: Runtime.NODEJS_12_X,
      environment: {
        PRIMARY_KEY: instanceTable.primaryKey,
        SORT_KEY: instanceTable.sortKey,
        STACK_NAME: scope.stackName
      },
      role: ec2Role,
      logRetention: RetentionDays.ONE_DAY,
    });

    this.getOneInstanceLambda = new Function(scope, 'getOneInstancesFunction', {
      code: new AssetCode('src'),
      handler: 'get-one-instances.handler',
      runtime: Runtime.NODEJS_12_X,
      environment: {
        STACK_NAME: scope.stackName,
        MOCK_AUTH_USERNAME: props?.auth?.mockAuth?.userName || '',
      },
      role: ec2Role,
      logRetention: RetentionDays.ONE_DAY,
    });

    // this.deleteOne = new Function(scope, 'deleteItemFunction', {
    //   code: new AssetCode('src'),
    //   handler: 'delete-one.handler',
    //   runtime: Runtime.NODEJS_12_X,
    //   environment: {
    //     TABLE_NAME: instanceTable.name,
    //     PRIMARY_KEY: instanceTable.primaryKey,
    //     SORT_KEY: instanceTable.sortKey
    //   },
    //   logRetention: RetentionDays.ONE_DAY,
    // });

    this.putOneItemLambda = new Function(scope, 'putOneItem', {
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
        REPO_TABLE : repoTable.name,
        PRIMARY_KEY: repoTable.primaryKey,
        CI_USER_TOKEN: CI_USER_TOKEN,
        SECURITY_GROUP: 'default',
        STACK_NAME: scope.stackName,
        IMAGE_ID: props?.createInstances?.imageId || ''
      },
      role: ec2Role,
      logRetention: RetentionDays.ONE_DAY,
    });

    this.checkCreationAllowanceLambda = new Function(scope, 'checkCreationAllowanceLambda', {
      code: new AssetCode('src'),
      handler: 'check-creation-allowance.handler',
      runtime: Runtime.NODEJS_12_X,
      environment: {
        TABLE_NAME: instanceTable.name,
        TABLE_STATIC_NAME: repoTable.primaryKey,
        PRIMARY_KEY: instanceTable.primaryKey,
      },
      logRetention: RetentionDays.ONE_DAY,
    });

    this.createOneApi = new Function(scope, 'createItemFunctionApi', {
      code: new AssetCode('src'),
      handler: 'create-api.handler',
      runtime: Runtime.NODEJS_12_X,
      environment: {
        SORT_KEY: instanceTable.sortKey
      },
      logRetention: RetentionDays.ONE_DAY,
    });

    this.deleteOne = new Function(scope, 'deleteOneFunction', {
      code: new AssetCode('src'),
      handler: 'delete-one.handler',
      runtime: Runtime.NODEJS_12_X,
      logRetention: RetentionDays.ONE_DAY,
    });

    this.updateOneApi = new Function(scope, 'updateItemFunction', {
      code: new AssetCode('src'),
      handler: 'update-one.handler',
      runtime: Runtime.NODEJS_12_X,
      environment: {
        SORT_KEY: instanceTable.sortKey
      },
      logRetention: RetentionDays.ONE_DAY,
    });

    new CfnOutput(scope, 'LGGroupdCreate', {
      value: this.putOneItemLambda.logGroup.logGroupName
    });

    new CfnOutput(scope, 'LGGroupdCreateInstance', {
      value: this.createInstanceLambda.logGroup.logGroupName
    });

    new CfnOutput(scope, 'LGGroupdCreateApi', {
      value: this.createOneApi.logGroup.logGroupName
    });

  }
}
