import { CfnOutput, SecretValue } from '@aws-cdk/core';
// import { Rule, Schedule } from '@aws-cdk/aws-events';
// import { LambdaFunction } from '@aws-cdk/aws-events-targets';
import { Function, AssetCode, Runtime, CfnFunction } from '@aws-cdk/aws-lambda';
import { RetentionDays } from '@aws-cdk/aws-logs';
// import { Role, ServicePrincipal, ManagedPolicy, PolicyStatement } from '@aws-cdk/aws-apigateway/node_modules/@aws-cdk/aws-iam';
import { AlfInstancesStackProps } from './alf-instances-stack';
import { instanceTable } from '../src/statics';
import { Role, ServicePrincipal, ManagedPolicy, PolicyStatement, CompositePrincipal } from '@aws-cdk/aws-iam';
// import { SqsToLambda } from '@aws-solutions-constructs/aws-sqs-lambda';
import { QueueProps, Queue } from '@aws-cdk/aws-sqs';
import { BuildEnvironmentVariableType, BuildSpec, LinuxBuildImage, Project, Source } from '@aws-cdk/aws-codebuild';
import { CustomStack } from 'alf-cdk-app-pipeline/custom-stack';
import { SqsEventSource } from '@aws-cdk/aws-lambda-event-sources';
// import * as lambda from '@aws-cdk/aws-lambda';

// const CI_USER_TOKEN = process.env.CI_USER_TOKEN || '';

export interface AlfCdkLambdasInterface {
  readonly getOneLambda: Function;
  readonly getAllLambda: Function;
  // readonly getAllInstancesLambda: Function,
  // readonly deleteOne: Function,
  readonly putOrDeleteOneItemLambda: Function;
  readonly createInstanceLambda: Function;
  readonly checkCreationAllowanceLambda: Function;
  readonly optionsLambda: Function;
  readonly putInFifoSQS: Function;
  readonly executerLambda: Function;
  readonly getInstancesLambda: Function;
  // readonly deleteOne: Function;
  createOneApi: Function;
  updateOneApi: Function;
}

export class AlfCdkLambdas implements AlfCdkLambdasInterface {
  getOneLambda: Function;
  getAllLambda: Function;
  // getAllInstancesLambda: Function;
  // deleteOne: Function;
  putOrDeleteOneItemLambda: Function;
  createInstanceLambda: Function;
  checkCreationAllowanceLambda: Function;
  createOneApi: Function;
  updateOneApi: Function;
  optionsLambda: Function;
  executerLambda: Function;
  putInFifoSQS: Function;
  getInstancesLambda: Function;
  // deleteOne: Function

  constructor(scope: CustomStack, props: AlfInstancesStackProps) {
    // super(scope, 'AlfCdkLambdasStack', props);

    const lambdaRole = new Role(scope, 'LambdaRole', {
      assumedBy: new CompositePrincipal(
        new ServicePrincipal('lambda.amazonaws.com'),
        new ServicePrincipal('apigateway.amazonaws.com'),
      ), // required
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
    });

    lambdaRole.addToPolicy(
      new PolicyStatement({
        resources: ['*'],
        actions: ['ec2:*', 'logs:*', 'route53:ChangeResourceRecordSets', 'lambda:InvokeFunction'],
      }),
    );

    // GET /instances/:id
    // tslint:disable-next-line: function-constructor
    this.getInstancesLambda = new Function(scope, 'getInstancesApi', {
      functionName: `getInstancesApi`,
      code: new AssetCode('lib'),
      handler: 'get-instances-api.handler',
      runtime: Runtime.NODEJS_12_X,
      environment: {
        STACK_NAME: scope.stackName,
        HOSTED_ZONE_ID: props?.createInstances?.domain?.hostedZoneId || '',
        DOMAIN_NAME: props?.createInstances?.domain?.domainName || '',
        MOCK_AUTH: props.auth?.mock || '',
      },
      role: lambdaRole,
      logRetention: RetentionDays.ONE_DAY,
    });

    this.getInstancesLambda.addPermission('apigw', {
      principal: new ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${scope.region}:${scope.account}:*/*/GET/instances`,
    });

    const getInstancesLambdaChild = this.getInstancesLambda.node.defaultChild as CfnFunction;
    getInstancesLambdaChild.overrideLogicalId('getInstancesApi');

    // GET /instances-conf
    // tslint:disable-next-line: function-constructor
    this.getAllLambda = new Function(scope, 'getAllConfApi', {
      functionName: `getAllConfApi`,
      code: new AssetCode('lib'),
      handler: 'get-all-conf-api.handler',
      runtime: Runtime.NODEJS_12_X,
      environment: {
        MOCK_AUTH: props.auth?.mock || '',
      },
      logRetention: RetentionDays.ONE_DAY,
    });

    this.getAllLambda.addPermission('apigw', {
      principal: new ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${scope.region}:${scope.account}:*/*/GET/instances-conf`,
    });

    // POST /instances-conf
    // tslint:disable-next-line: function-constructor
    this.createOneApi = new Function(scope, 'createConfApi', {
      functionName: `createConfApi`,
      code: new AssetCode('lib'),
      handler: 'create-api.handler',
      runtime: Runtime.NODEJS_12_X,
      environment: {
        SORT_KEY: instanceTable.instanceId,
        MOCK_AUTH: props.auth?.mock || '',
      },
      logRetention: RetentionDays.ONE_DAY,
    });

    this.createOneApi.addPermission('apigw', {
      principal: new ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${scope.region}:${scope.account}:*/*/POST/instances-conf`,
    });

    // GET /instances-conf/:id
    // tslint:disable-next-line: function-constructor
    this.getOneLambda = new Function(scope, 'getOneConfApi', {
      functionName: `getOneConfApi`,
      code: new AssetCode('lib'),
      handler: 'get-one-conf-api.handler',
      runtime: Runtime.NODEJS_12_X,
      environment: {
        MOCK_AUTH: props.auth?.mock || '',
      },
      logRetention: RetentionDays.ONE_DAY,
    });

    this.getOneLambda.addPermission('apigw', {
      principal: new ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${scope.region}:${scope.account}:*/*/GET/instances-conf/*`,
    });

    // PUT /instances-conf/:conf
    // tslint:disable-next-line: function-constructor
    this.updateOneApi = new Function(scope, 'updateApi', {
      functionName: `updateApi`,
      code: new AssetCode('lib'),
      handler: 'update-api.handler',
      runtime: Runtime.NODEJS_12_X,
      environment: {
        SORT_KEY: instanceTable.instanceId,
        MOCK_AUTH: props.auth?.mock || '',
      },
      logRetention: RetentionDays.ONE_DAY,
    });

    this.updateOneApi.addPermission('apigw', {
      principal: new ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${scope.region}:${scope.account}:*/*/PUT/instances-conf/*`,
    });

    // OPTIONS /instances /instances/:id /instances-conf /instances-conf/:id
    // tslint:disable-next-line: function-constructor
    this.optionsLambda = new Function(scope, 'optionsApi', {
      functionName: `optionsApi`,
      code: new AssetCode('lib'),
      handler: 'options.handler',
      runtime: Runtime.NODEJS_12_X,
      logRetention: RetentionDays.ONE_DAY,
    });

    this.optionsLambda.addPermission('apigw', {
      principal: new ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${scope.region}:${scope.account}:*/*/OPTIONS/instances`,
    });

    const createInstanceLambdaRole = new Role(scope, 'createInstanceLambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'), // required
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
    });

    createInstanceLambdaRole.addToPolicy(
      new PolicyStatement({
        resources: ['*'],
        actions: ['codebuild:StartBuild', 'logs:*', 'cloudformation:*', 's3:*', 'sns:*', 'sts:AssumeRole'],
      }),
    );

    const createInstanceBuildRole = new Role(scope, 'createInstanceBuildRole', {
      assumedBy: new ServicePrincipal('codebuild.amazonaws.com'), // required
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess'),
        ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'),
        ManagedPolicy.fromAwsManagedPolicyName('AWSCloudFormationFullAccess'),
        ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'),
      ],
    });

    createInstanceBuildRole.addToPolicy(
      new PolicyStatement({
        resources: ['*'],
        actions: ['codebuild:*', 'logs:*', 'cloudformation:*', 's3:*', 'sns:*', 'sts:AssumeRole'],
      }),
    );

    const gitHubSource = Source.gitHub({
      owner: 'mmuller88',
      repo: 'alf-cdk-ec2',
    });

    const oauth = SecretValue.secretsManager('alfcdk', {
      jsonField: 'muller88-github-token',
    });

    const createInstanceBuild = new Project(scope, 'LambdaBuild', {
      role: createInstanceBuildRole,
      source: gitHubSource,
      environmentVariables: {
        InstanceStackRegion: { value: props?.env?.region },
        CI_USER_TOKEN: { value: oauth.toString() },
        deployerAccessKeyId: {
          value: 'deployer-access-key-id',
          type: BuildEnvironmentVariableType.PARAMETER_STORE,
        },
        deployerSecretAccessKey: {
          value: 'deployer-secret-access-key',
          type: BuildEnvironmentVariableType.PARAMETER_STORE,
        },
      },
      buildSpec: BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              'aws --profile damadden88 configure set aws_access_key_id $deployerAccessKeyId',
              'aws --profile damadden88 configure set aws_secret_access_key $deployerSecretAccessKey',
              // @ts-ignore
              `aws --profile default configure set region ${props.env.region}`,
              `npm install -g aws-cdk@latest`,
            ],
          },
          build: {
            commands: [
              'eval $CDK_COMMAND',
              // 'cdk deploy --require-approval never'
            ],
          },
        },
        // artifacts: {
        //   'base-directory': 'src',
        //   files: [
        //     'index.ts',
        //     'node_modules/**/*',
        //   ],
        // },
      }),
      environment: {
        buildImage: LinuxBuildImage.STANDARD_4_0,
      },
    });

    // const lambdaSourceBucket = new AutoDeleteBucket(scope, 'lambdaSourceBucket', { //AutoDeleteBucket
    //   removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
    // });

    // new BucketDeployment(scope, 'DeployLambdaSourceCode', {
    //   sources: [ Source.asset('src') ],
    //   destinationBucket: lambdaSourceBucket
    // });

    // tslint:disable-next-line: function-constructor
    this.createInstanceLambda = new Function(scope, 'createCdkApp', {
      // code: new S3Code(lambdaSourceBucket, 's3code'),
      code: new AssetCode('lib'),
      handler: 'create-instance.handler',
      runtime: Runtime.NODEJS_12_X,
      environment: {
        PROJECT_NAME: createInstanceBuild.projectName,
        MOCK_AUTH: props.auth?.mock || '',
        // SRC_PATH: `${lambdaSourceBucket.s3UrlForObject('src')}`
      },
      role: createInstanceLambdaRole,
      logRetention: RetentionDays.ONE_DAY,
    });

    const executerLambdaRole = new Role(scope, 'executerLambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'), // required
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
    });

    executerLambdaRole.addToPolicy(
      new PolicyStatement({
        resources: ['*'],
        actions: [
          'ec2:*',
          'logs:*',
          'route53:ChangeResourceRecordSets',
          'codebuild:StartBuild',
          'cloudformation:*',
          's3:*',
          'sns:*',
          'sts:AssumeRole',
        ],
      }),
    );

    // tslint:disable-next-line: function-constructor
    this.executerLambda = new Function(scope, 'executerUpdateFunction', {
      code: new AssetCode('lib'),
      handler: 'executer-update-new.handler',
      // timeout: Duration.seconds(300),
      runtime: Runtime.NODEJS_12_X,
      environment: {
        CDK_COMMAND: `make cdkdeploy${props?.stage}`,
        CFN_REGION: props.env?.region || '',
        PROJECT_NAME: createInstanceBuild.projectName,
        HOSTED_ZONE_ID: props?.createInstances?.domain?.hostedZoneId || '',
        DOMAIN_NAME: props?.createInstances?.domain?.domainName || '',
        // AUTOMATED_STOPPING_MINUTES: props?.createInstances?.automatedStopping?.minutes.toString() || '',
        // ALF_TYPES : JSON.stringify(props?.createInstances?.alfTypes),
        // SECURITY_GROUP: 'default',
        CREATE_INSTANCES: props.createInstances?.enabled === true ? 'true' : 'false',
        // HOSTED_ZONE_ID: props?.createInstances?.domain?.hostedZoneId || '',
        // DOMAIN_NAME: props?.createInstances?.domain?.domainName || '',
        CERT_ARN: props.createInstances?.domain?.certArn || '',
        MOCK_AUTH: props.auth?.mock || '',
        // VPC_ID: props?.createInstances?.domain?.vpc.id || '',
        // SUBNET_ID_1: props?.createInstances?.domain?.vpc.subnetId1 || '',
        // SUBNET_ID_2: props?.createInstances?.domain?.vpc.subnetId2 || '',
      },
      role: executerLambdaRole,
      logRetention: RetentionDays.ONE_DAY,
    });

    const queueProps: QueueProps = {
      queueName: `${scope.stackName}.fifo`,
      fifo: true,
      contentBasedDeduplication: true,
    };

    const queue = new Queue(scope, 'Queue', queueProps);

    this.executerLambda.addEventSource(new SqsEventSource(queue));

    const lambdaSqsRole = new Role(scope, 'lambdaSqsRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'), // required
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
    });

    lambdaSqsRole.addToPolicy(
      new PolicyStatement({
        resources: ['*'],
        actions: ['sqs:SendMessage', 'logs:*'],
      }),
    );

    // tslint:disable-next-line: function-constructor
    this.putInFifoSQS = new Function(scope, 'putInFifoSQS', {
      code: new AssetCode('lib'),
      handler: 'put-in-fifo-sqs.handler',
      // timeout: Duration.seconds(300),
      runtime: Runtime.NODEJS_12_X,
      environment: {
        SQS_URL: queue.queueUrl,
        // SQS_URL: sqsToLambda.sqsQueue.queueUrl,
      },
      role: lambdaSqsRole,
      logRetention: RetentionDays.ONE_DAY,
    });

    // tslint:disable-next-line: function-constructor
    this.putOrDeleteOneItemLambda = new Function(scope, 'putOneItem', {
      code: new AssetCode('lib'),
      handler: 'create.handler',
      runtime: Runtime.NODEJS_12_X,
      environment: {
        TABLE_NAME: instanceTable.name,
        PRIMARY_KEY: instanceTable.userId,
        SORT_KEY: instanceTable.instanceId,
      },
      logRetention: RetentionDays.ONE_DAY,
    });

    // tslint:disable-next-line: function-constructor
    this.checkCreationAllowanceLambda = new Function(scope, 'checkCreationAllowanceLambda', {
      code: new AssetCode('lib'),
      handler: 'check-creation-allowance.handler',
      runtime: Runtime.NODEJS_12_X,
      environment: {
        MAX_PER_USER: props?.createInstances?.allowedConstraints.maxPerUser.toString() || '',
        MAX_INSTANCES: props?.createInstances?.allowedConstraints.maxInstances.toString() || '3',
      },
      logRetention: RetentionDays.ONE_DAY,
    });

    // tslint:disable-next-line: no-unused-expression
    const lGGroupdCreate = new CfnOutput(scope, 'LGGroupdCreate', {
      value: this.putOrDeleteOneItemLambda.logGroup.logGroupName,
    });

    scope.cfnOutputs['LGGroupdCreate'] = lGGroupdCreate;

    // tslint:disable-next-line: no-unused-expression
    const lGGroupdCreateApi = new CfnOutput(scope, 'LGGroupdCreateApi', {
      value: this.createOneApi.logGroup.logGroupName,
    });

    scope.cfnOutputs['LGGroupdCreateApi'] = lGGroupdCreateApi;
  }
}
