import apigateway = require('@aws-cdk/aws-apigateway');
import dynamodb = require('@aws-cdk/aws-dynamodb');
import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/core');
import sfn = require('@aws-cdk/aws-stepfunctions');
import sfn_tasks = require('@aws-cdk/aws-stepfunctions-tasks');
import assets = require('@aws-cdk/aws-s3-assets')
import logs = require('@aws-cdk/aws-logs');
import { LambdaDestination } from '@aws-cdk/aws-logs-destinations';
import { join } from 'path';

// Table identifier
const PRIMARY_KEY = 'alfInstanceId';
const USER_KEY = 'userId';
const SORT_KEY = USER_KEY;
const TABLE_NAME = 'alfInstances';

export class ApiLambdaCrudDynamoDBStack extends cdk.Stack {
  constructor(app: cdk.App, id: string) {
    super(app, id);

    const dynamoTable = new dynamodb.Table(this, 'items', {
      partitionKey: {
        name: PRIMARY_KEY,
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: SORT_KEY,
        type: dynamodb.AttributeType.STRING
      },
      tableName: TABLE_NAME,

      // The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
      // the new table, and it will remain in your account until manually deleted. By setting the policy to
      // DESTROY, cdk destroy will delete the table (even if it has data in it)
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    const dynamoTableStatic = new dynamodb.Table(this, 'staticItems', {
      partitionKey: {
        name: PRIMARY_KEY,
        type: dynamodb.AttributeType.STRING,
      },
      tableName: 'staticItems',

      // The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
      // the new table, and it will remain in your account until manually deleted. By setting the policy to
      // DESTROY, cdk destroy will delete the table (even if it has data in it)
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    const getOneLambda = new lambda.Function(this, 'getOneItemFunction', {
      code: new lambda.AssetCode('src'),
      handler: 'get-one.handler',
      runtime: lambda.Runtime.NODEJS_10_X,
      environment: {
        TABLE_NAME: dynamoTable.tableName,
        PRIMARY_KEY: PRIMARY_KEY,
      },
    });

    const getAllLambda = new lambda.Function(this, 'getAllItemsFunction', {
      code: new lambda.AssetCode('src'),
      handler: 'get-all.handler',
      runtime: lambda.Runtime.NODEJS_10_X,
      environment: {
        TABLE_NAME: dynamoTable.tableName,
        PRIMARY_KEY: PRIMARY_KEY,
        USER_KEY: USER_KEY
      },
    });

    const updateOne = new lambda.Function(this, 'updateItemFunction', {
      code: new lambda.AssetCode('src'),
      handler: 'update-one.handler',
      runtime: lambda.Runtime.NODEJS_10_X,
      environment: {
        TABLE_NAME: dynamoTable.tableName,
        PRIMARY_KEY: PRIMARY_KEY,
      },
    });

    const deleteOne = new lambda.Function(this, 'deleteItemFunction', {
      code: new lambda.AssetCode('src'),
      handler: 'delete-one.handler',
      runtime: lambda.Runtime.NODEJS_10_X,
      environment: {
        TABLE_NAME: dynamoTable.tableName,
        PRIMARY_KEY: PRIMARY_KEY,
      },
    });

    const createOneLambda = new lambda.Function(this, 'createItemFunction', {
      code: new lambda.AssetCode('src'),
      handler: 'create.handler',
      runtime: lambda.Runtime.NODEJS_10_X,
      environment: {
        TABLE_NAME: dynamoTable.tableName,
        PRIMARY_KEY: PRIMARY_KEY,
      },
    });

    dynamoTable.grantReadWriteData(getAllLambda);
    dynamoTable.grantReadWriteData(getOneLambda);
    dynamoTable.grantReadWriteData(createOneLambda);
    dynamoTable.grantReadWriteData(updateOne);
    dynamoTable.grantReadWriteData(deleteOne);

    // const swagger = new cdk.CfnInclude(this, "ExistingInfrastructure", {
    //   template: yaml.safeLoad(fs.readFileSync("./my-bucket.yaml").toString())
    // });

    const api = new apigateway.RestApi(this, 'itemsApi', {
      restApiName: 'Items Service',
      description: 'Blub'
    });

    // @ts-ignore
    const cfnApi = api.node.defaultChild as apigateway.CfnRestApi;

    // Upload Swagger to S3
    // @ts-ignore
    const fileAsset = new assets.Asset(this, 'SwaggerAsset', {
      path: join(__dirname, 'templates/swagger_full.yaml')
    });

    cfnApi.bodyS3Location = {bucket: fileAsset.bucket.bucketName, key: fileAsset.s3ObjectKey };

    const items = api.root.addResource('items');
    const getAllIntegration = new apigateway.LambdaIntegration(getAllLambda);
    items.addMethod('GET', getAllIntegration);

    const singleItem = items.addResource('{id}');
    const getOneIntegration = new apigateway.LambdaIntegration(getOneLambda);
    singleItem.addMethod('GET', getOneIntegration);

    const updateOneIntegration = new apigateway.LambdaIntegration(updateOne);
    singleItem.addMethod('PATCH', updateOneIntegration);

    const deleteOneIntegration = new apigateway.LambdaIntegration(deleteOne);
    singleItem.addMethod('DELETE', deleteOneIntegration);
    addCorsOptions(singleItem);

    const checkCreationAllowanceLambda = new lambda.Function(this, 'checkCreationAllowanceLambda', {
      code: new lambda.AssetCode('src'),
      handler: 'check-creation-allowance.handler',
      runtime: lambda.Runtime.NODEJS_10_X,
      environment: {
        TABLE_NAME: dynamoTable.tableName,
        TABLE_STATIC_NAME: dynamoTableStatic.tableName,
        PRIMARY_KEY: PRIMARY_KEY,
      },
    });

    dynamoTable.grantReadWriteData(checkCreationAllowanceLambda);

    // Configure log group for short retention
    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      retention: logs.RetentionDays.ONE_WEEK
    });

    new logs.SubscriptionFilter(this, 'Subscription', {
      logGroup,
      destination: new LambdaDestination(createOneLambda),
      // filterPattern: logsDestinations.FilterPattern.allTerms("ERROR", "MainThread")
      filterPattern: logs.FilterPattern.allEvents()
     });

    // const checkJobActivity = new sfn.Activity(this, 'CheckJob');

    const checkCreationAllowance = new sfn.Task(this, 'Check Creation Allowance', {
      task: new sfn_tasks.InvokeFunction(checkCreationAllowanceLambda),
    });

    const createOne = new sfn.Task(this, 'Create Item', {
      task: new sfn_tasks.InvokeFunction(createOneLambda),
      inputPath: '$.item'
    });
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

    const chain = sfn.Chain.start(checkCreationAllowance)
      .next(isAllowed
      .when(sfn.Condition.stringEquals('$.result', 'failed'), notAllowed)
      .when(sfn.Condition.stringEquals('$.result', 'ok'), createOne)
      .otherwise(waitX) );
    // .next(getStatus)
    // .next(
    //   isComplete
    //     .when(sfn.Condition.stringEquals('$.status', 'FAILED'), jobFailed)
    //     .when(sfn.Condition.stringEquals('$.status', 'SUCCEEDED'), finalStatus)
    //     .otherwise(waitX),
    // );

    const createStateMachine = new sfn.StateMachine(this, 'CreateStateMachine', {
      definition: chain,
      timeout: cdk.Duration.seconds(30),
    });

    const createOneApi = new lambda.Function(this, 'createItemFunctionApi', {
      code: new lambda.AssetCode('src'),
      handler: 'create-api.handler',
      runtime: lambda.Runtime.NODEJS_10_X,
      environment: {
        STATE_MACHINE_ARN: createStateMachine.stateMachineArn,
      },
    });

    createStateMachine.grantStartExecution(createOneApi);

    const val = new apigateway.RequestValidator(this, 'DefaultValidator', {
      restApi: api,
      validateRequestBody: true,
      validateRequestParameters: true
    })

    // const validator = api.addRequestValidator('DefaultValidator', {
    //   validateRequestBody: true,
    //   validateRequestParameters: true
    // }, api);

    const createOneIntegration = new apigateway.LambdaIntegration(createOneApi);

    items.addMethod('POST', createOneIntegration, { requestValidator: val});
    addCorsOptions(items);

    new cdk.CfnOutput(this, 'TableName', {
      value: dynamoTable.tableName
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
  }
}

export function addCorsOptions(apiResource: apigateway.IResource) {
  apiResource.addMethod(
    'OPTIONS',
    new apigateway.MockIntegration({
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Headers':
              "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Access-Control-Allow-Credentials': "'false'",
            'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
          },
        },
      ],
      passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
      requestTemplates: {
        'application/json': '{"statusCode": 200}',
      },
    }),
    {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true,
            'method.response.header.Access-Control-Allow-Credentials': true,
            'method.response.header.Access-Control-Allow-Origin': true,
          },
        },
      ],
    },
  );
}

const app = new cdk.App();
new ApiLambdaCrudDynamoDBStack(app, 'ApiLambdaCrudDynamoDBExample');
app.synth();
