import apigateway = require('@aws-cdk/aws-apigateway');
import dynamodb = require('@aws-cdk/aws-dynamodb');
// import { GlobalTable } from '@aws-cdk/aws-dynamodb-global';
import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/core');
import sfn = require('@aws-cdk/aws-stepfunctions');
import sfn_tasks = require('@aws-cdk/aws-stepfunctions-tasks');
import assets = require('@aws-cdk/aws-s3-assets')
import logs = require('@aws-cdk/aws-logs');
import iam = require('@aws-cdk/aws-iam');
import { join } from 'path';
import { ManagedPolicy, PolicyStatement } from '@aws-cdk/aws-iam';
import * as route53 from '@aws-cdk/aws-route53';
import * as targets from '@aws-cdk/aws-route53-targets';
import { Certificate } from '@aws-cdk/aws-certificatemanager'


const instanceTable = { name: 'alfInstances', primaryKey: 'alfUserId', sortKey: 'alfInstanceId'};
const staticTable = { name: 'staticTable', primaryKey: 'itemsId'}
const repoTable = { name: 'repoTable', primaryKey: 'alfType'}

const WITH_SWAGGER = process.env.WITH_SWAGGER || 'true'
const CI_USER_TOKEN = process.env.CI_USER_TOKEN || '';

interface AlfInstancesStackProps extends cdk.StackProps {
  imageId?: string,
  swaggerFile?: string,
  encryptBucket?: boolean
  hodevCertArn?: string
  environment: string
  customDomain?: {certArn: string, domainName: apigateway.DomainNameOptions}
}

export class AlfInstancesStack extends cdk.Stack {
  constructor(app: cdk.App, id: string, props?: AlfInstancesStackProps) {
    super(app, id, props);

    const dynamoTable = new dynamodb.Table(this, instanceTable.name, {
      partitionKey: {
        name: instanceTable.primaryKey,
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: instanceTable.sortKey,
        type: dynamodb.AttributeType.STRING
      },
      tableName: instanceTable.name,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    const dynamoStaticTable = new dynamodb.Table(this, staticTable.name, {
      partitionKey: {
        name: staticTable.primaryKey,
        type: dynamodb.AttributeType.STRING
      },
      tableName: staticTable.name,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    const dynamoRepoTable = new dynamodb.Table(this, repoTable.name, {
      partitionKey: {
        name: repoTable.primaryKey,
        type: dynamodb.AttributeType.NUMBER
      },
      tableName: repoTable.name,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    const getOneLambda = new lambda.Function(this, 'getOneItemFunction', {
      code: new lambda.AssetCode('src'),
      handler: 'get-one.handler',
      runtime: lambda.Runtime.NODEJS_10_X,
      environment: {
        TABLE_NAME: dynamoTable.tableName,
        PRIMARY_KEY: instanceTable.primaryKey,
        SORT_KEY: instanceTable.sortKey
      },
      logRetention: logs.RetentionDays.ONE_DAY,
    });

    const getAllLambda = new lambda.Function(this, 'getAllItemsFunction', {
      code: new lambda.AssetCode('src'),
      handler: 'get-all.handler',
      runtime: lambda.Runtime.NODEJS_10_X,
      environment: {
        TABLE_NAME: dynamoTable.tableName,
        PRIMARY_KEY: instanceTable.primaryKey
      },
      logRetention: logs.RetentionDays.ONE_DAY,
    });

    const role = new iam.Role(this, 'Role', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),   // required
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
    });

    role.addToPolicy(new PolicyStatement({
      resources: ['*'],
      actions: ['ec2:*', 'logs:*'] }));

    const getAllInstancesLambda = new lambda.Function(this, 'getAllInstancesFunction', {
      code: new lambda.AssetCode('src'),
      handler: 'get-all-instances.handler',
      runtime: lambda.Runtime.NODEJS_10_X,
      environment: {
        PRIMARY_KEY: instanceTable.primaryKey,
        SORT_KEY: instanceTable.sortKey,
        STACK_NAME: this.stackName
      },
      role: role,
      logRetention: logs.RetentionDays.ONE_DAY,
    });

    const deleteOne = new lambda.Function(this, 'deleteItemFunction', {
      code: new lambda.AssetCode('src'),
      handler: 'delete-one.handler',
      runtime: lambda.Runtime.NODEJS_10_X,
      environment: {
        TABLE_NAME: dynamoTable.tableName,
        PRIMARY_KEY: instanceTable.primaryKey,
        SORT_KEY: instanceTable.sortKey
      },
      logRetention: logs.RetentionDays.ONE_DAY,
    });

    const putOneItemLambda = new lambda.Function(this, 'putOneItem', {
      code: new lambda.AssetCode('src'),
      handler: 'create.handler',
      runtime: lambda.Runtime.NODEJS_10_X,
      environment: {
        TABLE_NAME: dynamoTable.tableName,
        PRIMARY_KEY: instanceTable.primaryKey,
        SORT_KEY: instanceTable.sortKey
      },
      logRetention: logs.RetentionDays.ONE_DAY,
    });

    const createInstanceLambda = new lambda.Function(this, 'createInstance', {
      code: new lambda.AssetCode('src'),
      handler: 'create-instance.handler',
      runtime: lambda.Runtime.NODEJS_10_X,
      environment: {
        REPO_TABLE : dynamoRepoTable.tableName,
        PRIMARY_KEY: repoTable.primaryKey,
        CI_USER_TOKEN: CI_USER_TOKEN,
        SECURITY_GROUP: 'default',
        STACK_NAME: this.stackName,
        IMAGE_ID: props?.imageId || ''
      },
      role: role,
      logRetention: logs.RetentionDays.ONE_DAY,
    });

    dynamoTable.grantFullAccess(getAllLambda);
    dynamoTable.grantFullAccess(getOneLambda);
    dynamoTable.grantFullAccess(putOneItemLambda);
    dynamoTable.grantFullAccess(deleteOne);

    dynamoRepoTable.grantFullAccess(createInstanceLambda);

    var api;

    if(props?.hodevCertArn){
      const hodevcert = Certificate.fromCertificateArn(this, 'Certificate', props.hodevCertArn);

      api = new apigateway.RestApi(this, 'itemsApi', {
        restApiName: 'Alf Instance Service',
        description: 'An AWS Backed Service for providing Alfresco with custom domain',
        domainName: {
          domainName: 'api.h-o.dev',
          certificate: hodevcert
        },
        defaultCorsPreflightOptions: {
          allowOrigins: apigateway.Cors.ALL_ORIGINS,
          allowMethods: apigateway.Cors.ALL_METHODS // this is also the default
        },
        // deployOptions: {
        //   loggingLevel: apigateway.MethodLoggingLevel.INFO,
        //   dataTraceEnabled: true
        // }
        endpointTypes: [apigateway.EndpointType.REGIONAL]
      });

      new route53.ARecord(this, 'CustomDomainAliasRecord', {
        zone: route53.HostedZone.fromHostedZoneAttributes(this, 'HodevHostedZoneId', {zoneName: 'h-o.dev.', hostedZoneId: 'Z00466842EKJWKXLA1RPG'}),
        target: route53.RecordTarget.fromAlias(new targets.ApiGateway(api))
      });

      api.domainName?.addBasePathMapping(api)

    } else {
      api = new apigateway.RestApi(this, 'itemsApi', {
        restApiName: 'Alf Instance Service',
        description: 'An AWS Backed Service for providing Alfresco without custom domain',
        // deployOptions: {
        //   loggingLevel: apigateway.MethodLoggingLevel.INFO,
        //   dataTraceEnabled: true
        // }
        defaultCorsPreflightOptions: {
          allowOrigins: apigateway.Cors.ALL_ORIGINS,
          allowMethods: apigateway.Cors.ALL_METHODS // this is also the default
        },
        endpointTypes: [apigateway.EndpointType.REGIONAL]
      });
    }

    const cfnApi = api.node.defaultChild as apigateway.CfnRestApi;

    if(WITH_SWAGGER !== 'false'){
      // Upload Swagger to S3
      const fileAsset = new assets.Asset(this, 'SwaggerAsset', {
        path: join(__dirname, props?.swaggerFile || '')
      });
      cfnApi.bodyS3Location = { bucket: fileAsset.bucket.bucketName, key: fileAsset.s3ObjectKey };
    }

    const items = api.root.addResource('items');
    const getAllIntegration = new apigateway.LambdaIntegration(getAllLambda);
    items.addMethod('GET', getAllIntegration);

    const instances = api.root.addResource('instances');
    const getAllInstancesIntegration = new apigateway.LambdaIntegration(getAllInstancesLambda);
    instances.addMethod('GET', getAllInstancesIntegration);

    const singleItem = items.addResource(`{${instanceTable.sortKey}}`);
    const getOneIntegration = new apigateway.LambdaIntegration(getOneLambda);
    singleItem.addMethod('GET', getOneIntegration);

    const deleteOneIntegration = new apigateway.LambdaIntegration(deleteOne);
    singleItem.addMethod('DELETE', deleteOneIntegration);
    // addCorsOptions(singleItem);

    const checkCreationAllowanceLambda = new lambda.Function(this, 'checkCreationAllowanceLambda', {
      code: new lambda.AssetCode('src'),
      handler: 'check-creation-allowance.handler',
      runtime: lambda.Runtime.NODEJS_10_X,
      environment: {
        TABLE_NAME: dynamoTable.tableName,
        TABLE_STATIC_NAME: dynamoStaticTable.tableName,
        PRIMARY_KEY: instanceTable.primaryKey,
      },
      logRetention: logs.RetentionDays.ONE_DAY,
    });

    dynamoTable.grantFullAccess(checkCreationAllowanceLambda);

    // Configure log group for short retention
    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      retention: logs.RetentionDays.ONE_DAY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      logGroupName: '/aws/lambda/custom/' + this.stackName
    });

    const lgstream = logGroup.addStream('myloggroupStream')

    // logGroup.addSubscriptionFilter(id='myloggroup_subs1', {
    //     destination: new LambdaDestination(createOneLambda),
    //     // filterPattern: logsDestinations.FilterPattern.allTerms("ERROR", "MainThread")
    //     filterPattern: logs.FilterPattern.allEvents(),
    //   });

    // new logs.SubscriptionFilter(this, 'my-subs1', {
    //   destination: new LambdaDestination(createOneLambda),
    //   filterPattern: logs.FilterPattern.allEvents(),
    //   logGroup: logGroup,
    // });


    //  createOneLambda.addPermission(
    //   id='mylambdafunction-invoke', {
    //     principal: new iam.ServicePrincipal('logs.eu-west-2.amazonaws.com'),
    //     action: 'lambda:InvokeFunction',
    //     sourceArn: logGroup.logGroupArn
    //   })

    //  logGroup.grantWrite(createOneLambda);

    // const checkJobActivity = new sfn.Activity(this, 'CheckJob');

    const checkCreationAllowance = new sfn.Task(this, 'Check Creation Allowance', {
      task: new sfn_tasks.InvokeFunction(checkCreationAllowanceLambda),
    });

    const insertItem = new sfn.Task(this, 'Create Item', {
      task: new sfn_tasks.InvokeFunction(putOneItemLambda),
      inputPath: '$.item'
    });

    const createInstance = new sfn.Task(this, 'Create Instance', {
      task: new sfn_tasks.InvokeFunction(createInstanceLambda),
      inputPath: '$.item'
    });

    // const createdInstanceUpdate = new sfn.Task(this, 'Created Instance Update', {
    //   task: new sfn_tasks.InvokeFunction(createOneLambda),
    //   inputPath: '$.item'
    // });

    const waitX = new sfn.Wait(this, 'Wait X Seconds', {
      time: sfn.WaitTime.duration(cdk.Duration.seconds(5)),
    });

    // const getStatus = new sfn.Task(this, 'Get Job Status', {
    //   task: new sfn_tasks.InvokeActivity(checkJobActivity),
    //   inputPath: '$.guid',
    //   resultPath: '$.status',
    // });
    const isAllowed = new sfn.Choice(this, 'Creation Allowed?');
    const notAllowed = new sfn.Fail(this, 'Not Allowed', {
      cause: 'Creation failed',
      error: 'Job returned failed',
    });

    // const finalStatus = new sfn.Task(this, 'Get Final Job Status', {
    //   task: new sfn_tasks.InvokeActivity(checkJobActivity),
    //   inputPath: '$.guid',
    // });

    const creationChain = sfn.Chain.start(checkCreationAllowance)
      .next(isAllowed
      .when(sfn.Condition.stringEquals('$.result', 'failed'), notAllowed)
      .when(sfn.Condition.stringEquals('$.result', 'ok'), insertItem.next(createInstance))
      .otherwise(waitX) );
    // .next(getStatus)
    // .next(
    //   isComplete
    //     .when(sfn.Condition.stringEquals('$.status', 'FAILED'), jobFailed)
    //     .when(sfn.Condition.stringEquals('$.status', 'SUCCEEDED'), finalStatus)
    //     .otherwise(waitX),
    // );

    const updateItem = new sfn.Task(this, 'Update Item', {
      task: new sfn_tasks.InvokeFunction(putOneItemLambda),
      inputPath: '$.item'
    });

    const updateChain = sfn.Chain.start(updateItem)

    const createStateMachine = new sfn.StateMachine(this, 'CreateStateMachine', {
      definition: creationChain,
      timeout: cdk.Duration.seconds(30),
    });

    const updateStateMachine = new sfn.StateMachine(this, 'UpdateStateMachine', {
      definition: updateChain,
      timeout: cdk.Duration.seconds(30),
    });

    const createOneApi = new lambda.Function(this, 'createItemFunctionApi', {
      code: new lambda.AssetCode('src'),
      handler: 'create-api.handler',
      runtime: lambda.Runtime.NODEJS_10_X,
      environment: {
        STATE_MACHINE_ARN: createStateMachine.stateMachineArn,
        SORT_KEY: instanceTable.sortKey
      },
      logRetention: logs.RetentionDays.ONE_DAY,
    });

    const updateOneApi = new lambda.Function(this, 'updateItemFunction', {
      code: new lambda.AssetCode('src'),
      handler: 'update-one.handler',
      runtime: lambda.Runtime.NODEJS_10_X,
      environment: {
        STATE_MACHINE_ARN: updateStateMachine.stateMachineArn,
        SORT_KEY: instanceTable.sortKey
      },
      logRetention: logs.RetentionDays.ONE_DAY,
    });

    createStateMachine.grantStartExecution(createOneApi);
    updateStateMachine.grantStartExecution(updateOneApi);

    const createOneIntegration = new apigateway.LambdaIntegration(createOneApi);

    items.addMethod('POST', createOneIntegration);
    // addCorsOptions(items);

    const updateOneIntegration = new apigateway.LambdaIntegration(updateOneApi);
    singleItem.addMethod('PUT', updateOneIntegration);

    new cdk.CfnOutput(this, 'TableName', {
      value: dynamoTable.tableName
    });

    new cdk.CfnOutput(this, 'RepoTableName', {
      value: dynamoRepoTable.tableName
    });

    new cdk.CfnOutput(this, 'RestApiEndPoint', {
      value: api.url
    });

    new cdk.CfnOutput(this, 'RestApiId', {
      value: api.restApiId
    });

    new cdk.CfnOutput(this, 'LogGroupName', {
      value: logGroup.logGroupName
    });

    new cdk.CfnOutput(this, 'LogGroupStreamName', {
      value: lgstream.logStreamName
    });

    new cdk.CfnOutput(this, 'LGGroupdCreateApi', {
      value: createOneApi.logGroup.logGroupName
    });

    new cdk.CfnOutput(this, 'LGGroupdCreate', {
      value: putOneItemLambda.logGroup.logGroupName
    });

    new cdk.CfnOutput(this, 'LGGroupdCreateInstance', {
      value: createInstanceLambda.logGroup.logGroupName
    });

    new cdk.CfnOutput(this, 'ApiDomainName', {
      value: api.domainName?.domainName || ''
    });

  }
}

// export function addCorsOptions(apiResource: apigateway.IResource) {
//   apiResource.addMethod(
//     'OPTIONS',
//     new apigateway.MockIntegration({
//       integrationResponses: [
//         {
//           statusCode: '200',
//           responseParameters: {
//             'method.response.header.Access-Control-Allow-Headers':
//               "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
//             'method.response.header.Access-Control-Allow-Origin': "'*'",
//             'method.response.header.Access-Control-Allow-Credentials': "'false'",
//             'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
//           },
//         },
//       ],
//       passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
//       requestTemplates: {
//         'application/json': '{"statusCode": 200}',
//       },
//     }),
//     {
//       methodResponses: [
//         {
//           statusCode: '200',
//           responseParameters: {
//             'method.response.header.Access-Control-Allow-Headers': true,
//             'method.response.header.Access-Control-Allow-Methods': true,
//             'method.response.header.Access-Control-Allow-Credentials': true,
//             'method.response.header.Access-Control-Allow-Origin': true,
//           },
//         },
//       ],
//     },
//   );
// }

const app = new cdk.App();

// new AlfInstancesStack(app, "AlfInstancesStackEuWest1", {
//     environment: 'prod',
//     env: {
//       region: "eu-west-1"
//     },
//     imageId: 'ami-04d5cc9b88f9d1d39',
//     swaggerFile: 'tmp/swagger_full_.yaml'
//   });

new AlfInstancesStack(app, "AlfInstancesStackEuWest2", {
  environment: 'dev',
  env: {
    region: "eu-west-2"
  },
  imageId: 'ami-0cb790308f7591fa6',
  swaggerFile: 'tmp/swagger_full.yaml',
  hodevCertArn: 'arn:aws:acm:eu-west-2:609841182532:certificate/ff0f5239-7002-4a6c-a347-6800041df601'
});

// new GlobalTable(app, staticTable.name, {
//   partitionKey: {
//     name: staticTable.primaryKey,
//     type: dynamodb.AttributeType.STRING
//   },
//   tableName: 'globalTableTest',
//   regions: ['eu-west-1', 'eu-west-2'],
//   removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
// });

app.synth();
