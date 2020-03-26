"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apigateway = require("@aws-cdk/aws-apigateway");
const dynamodb = require("@aws-cdk/aws-dynamodb");
const lambda = require("@aws-cdk/aws-lambda");
const cdk = require("@aws-cdk/core");
const sfn = require("@aws-cdk/aws-stepfunctions");
const sfn_tasks = require("@aws-cdk/aws-stepfunctions-tasks");
const assets = require("@aws-cdk/aws-s3-assets");
// import logs = require('@aws-cdk/aws-logs');
// import iam = require('@aws-cdk/aws-iam');
// import { LambdaDestination } from '@aws-cdk/aws-logs-destinations';
const path_1 = require("path");
// Table identifier
const USER_KEY = 'alfUserId';
const ALF_INSTANCE_ID = 'alfInstanceId';
const PRIMARY_KEY = USER_KEY;
const SORT_KEY = ALF_INSTANCE_ID;
const TABLE_NAME = 'alfInstances';
const staticTable = { name: 'staticItems', primaryKey: 'itemsId' };
const WITH_SWAGGER = process.env.WITH_SWAGGER || 'true';
class ApiLambdaCrudDynamoDBStack extends cdk.Stack {
    constructor(app, id) {
        super(app, id);
        const dynamoTable = new dynamodb.Table(this, TABLE_NAME, {
            partitionKey: {
                name: PRIMARY_KEY,
                type: dynamodb.AttributeType.STRING
            },
            sortKey: {
                name: SORT_KEY,
                type: dynamodb.AttributeType.STRING
            },
            tableName: TABLE_NAME,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        const dynamoTableStatic = new dynamodb.Table(this, staticTable.name, {
            partitionKey: {
                name: staticTable.primaryKey,
                type: dynamodb.AttributeType.STRING,
            },
            tableName: staticTable.name,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
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
                SORT_KEY: SORT_KEY
            },
        });
        dynamoTable.grantFullAccess(getAllLambda);
        dynamoTable.grantFullAccess(getOneLambda);
        dynamoTable.grantFullAccess(createOneLambda);
        dynamoTable.grantFullAccess(updateOne);
        dynamoTable.grantFullAccess(deleteOne);
        // const swagger = new cdk.CfnInclude(this, "ExistingInfrastructure", {
        //   template: yaml.safeLoad(fs.readFileSync("./my-bucket.yaml").toString())
        // });
        const api = new apigateway.RestApi(this, 'itemsApi', {
            restApiName: 'Items Service',
            description: 'Blub',
        });
        // @ts-ignore
        const cfnApi = api.node.defaultChild;
        // Upload Swagger to S3
        // @ts-ignore
        const fileAsset = new assets.Asset(this, 'SwaggerAsset', {
            path: path_1.join(__dirname, 'tmp/swagger_full.yaml')
        });
        if (WITH_SWAGGER !== 'false') {
            cfnApi.bodyS3Location = { bucket: fileAsset.bucket.bucketName, key: fileAsset.s3ObjectKey };
        }
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
        dynamoTable.grantFullAccess(checkCreationAllowanceLambda);
        // Configure log group for short retention
        // const logGroup = new logs.LogGroup(this, 'LogGroup', {
        //   retention: logs.RetentionDays.ONE_DAY,
        //   removalPolicy: cdk.RemovalPolicy.DESTROY,
        //   logGroupName: '/aws/lambda/custom/' + this.stackName
        // });
        // const lgstream = logGroup.addStream('myloggroupStream', {logStreamName : 'myloggroupStream'})
        // logGroup.addSubscriptionFilter(id='myloggroup_subs1', {
        //     destination: new LambdaDestination(createOneLambda),
        //     // filterPattern: logsDestinations.FilterPattern.allTerms("ERROR", "MainThread")
        //     filterPattern: logs.FilterPattern.allEvents(),
        //   });
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
            .otherwise(waitX));
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
        // const val = new apigateway.RequestValidator(this, 'DefaultValidator', {
        //   restApi: api,
        //   validateRequestBody: true,
        //   validateRequestParameters: true
        // })
        // const validator = api.addRequestValidator('DefaultValidator', {
        //   validateRequestBody: true,
        //   validateRequestParameters: true
        // }, api);
        const createOneIntegration = new apigateway.LambdaIntegration(createOneApi);
        items.addMethod('POST', createOneIntegration);
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
        // new cdk.CfnOutput(this, 'LogGroupName', {
        //   value: logGroup.logGroupName
        // });
        // new cdk.CfnOutput(this, 'LogGroupStreamName', {
        //   value: lgstream.logStreamName
        // });
    }
}
exports.ApiLambdaCrudDynamoDBStack = ApiLambdaCrudDynamoDBStack;
function addCorsOptions(apiResource) {
    apiResource.addMethod('OPTIONS', new apigateway.MockIntegration({
        integrationResponses: [
            {
                statusCode: '200',
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
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
    }), {
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
    });
}
exports.addCorsOptions = addCorsOptions;
const app = new cdk.App();
new ApiLambdaCrudDynamoDBStack(app, 'ApiLambdaCrudDynamoDBExample');
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHNEQUF1RDtBQUN2RCxrREFBbUQ7QUFDbkQsOENBQStDO0FBQy9DLHFDQUFzQztBQUN0QyxrREFBbUQ7QUFDbkQsOERBQStEO0FBQy9ELGlEQUFpRDtBQUNqRCw4Q0FBOEM7QUFDOUMsNENBQTRDO0FBQzVDLHNFQUFzRTtBQUN0RSwrQkFBNEI7QUFFNUIsbUJBQW1CO0FBQ25CLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQztBQUM3QixNQUFNLGVBQWUsR0FBRyxlQUFlLENBQUM7QUFDeEMsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDO0FBQzdCLE1BQU0sUUFBUSxHQUFHLGVBQWUsQ0FBQztBQUNqQyxNQUFNLFVBQVUsR0FBRyxjQUFjLENBQUM7QUFDbEMsTUFBTSxXQUFXLEdBQUcsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUMsQ0FBQTtBQUVqRSxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksSUFBSSxNQUFNLENBQUE7QUFFdkQsTUFBYSwwQkFBMkIsU0FBUSxHQUFHLENBQUMsS0FBSztJQUN2RCxZQUFZLEdBQVksRUFBRSxFQUFVO1FBQ2xDLEtBQUssQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFZixNQUFNLFdBQVcsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRTtZQUN2RCxZQUFZLEVBQUU7Z0JBQ1osSUFBSSxFQUFFLFdBQVc7Z0JBQ2pCLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU07YUFDcEM7WUFDRCxPQUFPLEVBQUU7Z0JBQ1AsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTTthQUNwQztZQUNELFNBQVMsRUFBRSxVQUFVO1lBQ3JC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ZUFBZSxFQUFFO1lBQ2Y7Z0JBQ0UsVUFBVSxFQUFFLEtBQUs7Z0JBQ2pCLGtCQUFrQixFQUFFO29CQUNsQixxREFBcUQsRUFBRSxJQUFJO29CQUMzRCxxREFBcUQsRUFBRSxJQUFJO29CQUMzRCx5REFBeUQsRUFBRSxJQUFJO29CQUMvRCxvREFBb0QsRUFBRSxJQUFJO2lCQUMzRDthQUNGO1NBQ0Y7S0FDRixDQUNGLENBQUM7QUFDSixDQUFDO0FBbkNELHdDQW1DQztBQUVELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQzFCLElBQUksMEJBQTBCLENBQUMsR0FBRyxFQUFFLDhCQUE4QixDQUFDLENBQUM7QUFDcEUsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGFwaWdhdGV3YXkgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtYXBpZ2F0ZXdheScpO1xyXG5pbXBvcnQgZHluYW1vZGIgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtZHluYW1vZGInKTtcclxuaW1wb3J0IGxhbWJkYSA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1sYW1iZGEnKTtcclxuaW1wb3J0IGNkayA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2NvcmUnKTtcclxuaW1wb3J0IHNmbiA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1zdGVwZnVuY3Rpb25zJyk7XHJcbmltcG9ydCBzZm5fdGFza3MgPSByZXF1aXJlKCdAYXdzLWNkay9hd3Mtc3RlcGZ1bmN0aW9ucy10YXNrcycpO1xyXG5pbXBvcnQgYXNzZXRzID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLXMzLWFzc2V0cycpXHJcbi8vIGltcG9ydCBsb2dzID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWxvZ3MnKTtcclxuLy8gaW1wb3J0IGlhbSA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1pYW0nKTtcclxuLy8gaW1wb3J0IHsgTGFtYmRhRGVzdGluYXRpb24gfSBmcm9tICdAYXdzLWNkay9hd3MtbG9ncy1kZXN0aW5hdGlvbnMnO1xyXG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XHJcblxyXG4vLyBUYWJsZSBpZGVudGlmaWVyXHJcbmNvbnN0IFVTRVJfS0VZID0gJ2FsZlVzZXJJZCc7XHJcbmNvbnN0IEFMRl9JTlNUQU5DRV9JRCA9ICdhbGZJbnN0YW5jZUlkJztcclxuY29uc3QgUFJJTUFSWV9LRVkgPSBVU0VSX0tFWTtcclxuY29uc3QgU09SVF9LRVkgPSBBTEZfSU5TVEFOQ0VfSUQ7XHJcbmNvbnN0IFRBQkxFX05BTUUgPSAnYWxmSW5zdGFuY2VzJztcclxuY29uc3Qgc3RhdGljVGFibGUgPSB7IG5hbWU6ICdzdGF0aWNJdGVtcycsIHByaW1hcnlLZXk6ICdpdGVtc0lkJ31cclxuXHJcbmNvbnN0IFdJVEhfU1dBR0dFUiA9IHByb2Nlc3MuZW52LldJVEhfU1dBR0dFUiB8fCAndHJ1ZSdcclxuXHJcbmV4cG9ydCBjbGFzcyBBcGlMYW1iZGFDcnVkRHluYW1vREJTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgY29uc3RydWN0b3IoYXBwOiBjZGsuQXBwLCBpZDogc3RyaW5nKSB7XHJcbiAgICBzdXBlcihhcHAsIGlkKTtcclxuXHJcbiAgICBjb25zdCBkeW5hbW9UYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCBUQUJMRV9OQU1FLCB7XHJcbiAgICAgIHBhcnRpdGlvbktleToge1xyXG4gICAgICAgIG5hbWU6IFBSSU1BUllfS0VZLFxyXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HXHJcbiAgICAgIH0sXHJcbiAgICAgIHNvcnRLZXk6IHtcclxuICAgICAgICBuYW1lOiBTT1JUX0tFWSxcclxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklOR1xyXG4gICAgICB9LFxyXG4gICAgICB0YWJsZU5hbWU6IFRBQkxFX05BTUUsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIE5PVCByZWNvbW1lbmRlZCBmb3IgcHJvZHVjdGlvbiBjb2RlXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBkeW5hbW9UYWJsZVN0YXRpYyA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCBzdGF0aWNUYWJsZS5uYW1lLCB7XHJcbiAgICAgIHBhcnRpdGlvbktleToge1xyXG4gICAgICAgIG5hbWU6IHN0YXRpY1RhYmxlLnByaW1hcnlLZXksXHJcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRhYmxlTmFtZTogc3RhdGljVGFibGUubmFtZSxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gTk9UIHJlY29tbWVuZGVkIGZvciBwcm9kdWN0aW9uIGNvZGVcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGdldE9uZUxhbWJkYSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ2dldE9uZUl0ZW1GdW5jdGlvbicsIHtcclxuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxyXG4gICAgICBoYW5kbGVyOiAnZ2V0LW9uZS5oYW5kbGVyJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEwX1gsXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVEFCTEVfTkFNRTogZHluYW1vVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIFBSSU1BUllfS0VZOiBQUklNQVJZX0tFWSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGdldEFsbExhbWJkYSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ2dldEFsbEl0ZW1zRnVuY3Rpb24nLCB7XHJcbiAgICAgIGNvZGU6IG5ldyBsYW1iZGEuQXNzZXRDb2RlKCdzcmMnKSxcclxuICAgICAgaGFuZGxlcjogJ2dldC1hbGwuaGFuZGxlcicsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMF9YLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFRBQkxFX05BTUU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBQUklNQVJZX0tFWTogUFJJTUFSWV9LRVksXHJcbiAgICAgICAgVVNFUl9LRVk6IFVTRVJfS0VZXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCB1cGRhdGVPbmUgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICd1cGRhdGVJdGVtRnVuY3Rpb24nLCB7XHJcbiAgICAgIGNvZGU6IG5ldyBsYW1iZGEuQXNzZXRDb2RlKCdzcmMnKSxcclxuICAgICAgaGFuZGxlcjogJ3VwZGF0ZS1vbmUuaGFuZGxlcicsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMF9YLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFRBQkxFX05BTUU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBQUklNQVJZX0tFWTogUFJJTUFSWV9LRVksXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBkZWxldGVPbmUgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdkZWxldGVJdGVtRnVuY3Rpb24nLCB7XHJcbiAgICAgIGNvZGU6IG5ldyBsYW1iZGEuQXNzZXRDb2RlKCdzcmMnKSxcclxuICAgICAgaGFuZGxlcjogJ2RlbGV0ZS1vbmUuaGFuZGxlcicsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMF9YLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFRBQkxFX05BTUU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBQUklNQVJZX0tFWTogUFJJTUFSWV9LRVksXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBjcmVhdGVPbmVMYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdjcmVhdGVJdGVtRnVuY3Rpb24nLCB7XHJcbiAgICAgIGNvZGU6IG5ldyBsYW1iZGEuQXNzZXRDb2RlKCdzcmMnKSxcclxuICAgICAgaGFuZGxlcjogJ2NyZWF0ZS5oYW5kbGVyJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEwX1gsXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVEFCTEVfTkFNRTogZHluYW1vVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIFBSSU1BUllfS0VZOiBQUklNQVJZX0tFWSxcclxuICAgICAgICBTT1JUX0tFWTogU09SVF9LRVlcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIGR5bmFtb1RhYmxlLmdyYW50RnVsbEFjY2VzcyhnZXRBbGxMYW1iZGEpO1xyXG4gICAgZHluYW1vVGFibGUuZ3JhbnRGdWxsQWNjZXNzKGdldE9uZUxhbWJkYSk7XHJcbiAgICBkeW5hbW9UYWJsZS5ncmFudEZ1bGxBY2Nlc3MoY3JlYXRlT25lTGFtYmRhKTtcclxuICAgIGR5bmFtb1RhYmxlLmdyYW50RnVsbEFjY2Vzcyh1cGRhdGVPbmUpO1xyXG4gICAgZHluYW1vVGFibGUuZ3JhbnRGdWxsQWNjZXNzKGRlbGV0ZU9uZSk7XHJcblxyXG4gICAgLy8gY29uc3Qgc3dhZ2dlciA9IG5ldyBjZGsuQ2ZuSW5jbHVkZSh0aGlzLCBcIkV4aXN0aW5nSW5mcmFzdHJ1Y3R1cmVcIiwge1xyXG4gICAgLy8gICB0ZW1wbGF0ZTogeWFtbC5zYWZlTG9hZChmcy5yZWFkRmlsZVN5bmMoXCIuL215LWJ1Y2tldC55YW1sXCIpLnRvU3RyaW5nKCkpXHJcbiAgICAvLyB9KTtcclxuXHJcbiAgICBjb25zdCBhcGkgPSBuZXcgYXBpZ2F0ZXdheS5SZXN0QXBpKHRoaXMsICdpdGVtc0FwaScsIHtcclxuICAgICAgcmVzdEFwaU5hbWU6ICdJdGVtcyBTZXJ2aWNlJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdCbHViJyxcclxuICAgICAgLy8gZGVwbG95T3B0aW9uczoge1xyXG4gICAgICAvLyAgIGxvZ2dpbmdMZXZlbDogYXBpZ2F0ZXdheS5NZXRob2RMb2dnaW5nTGV2ZWwuSU5GTyxcclxuICAgICAgLy8gICBkYXRhVHJhY2VFbmFibGVkOiB0cnVlXHJcbiAgICAgIC8vIH1cclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEB0cy1pZ25vcmVcclxuICAgIGNvbnN0IGNmbkFwaSA9IGFwaS5ub2RlLmRlZmF1bHRDaGlsZCBhcyBhcGlnYXRld2F5LkNmblJlc3RBcGk7XHJcblxyXG4gICAgLy8gVXBsb2FkIFN3YWdnZXIgdG8gUzNcclxuICAgIC8vIEB0cy1pZ25vcmVcclxuICAgIGNvbnN0IGZpbGVBc3NldCA9IG5ldyBhc3NldHMuQXNzZXQodGhpcywgJ1N3YWdnZXJBc3NldCcsIHtcclxuICAgICAgcGF0aDogam9pbihfX2Rpcm5hbWUsICd0bXAvc3dhZ2dlcl9mdWxsLnlhbWwnKVxyXG4gICAgfSk7XHJcblxyXG4gICAgaWYoV0lUSF9TV0FHR0VSICE9PSAnZmFsc2UnKXtcclxuICAgICAgY2ZuQXBpLmJvZHlTM0xvY2F0aW9uID0geyBidWNrZXQ6IGZpbGVBc3NldC5idWNrZXQuYnVja2V0TmFtZSwga2V5OiBmaWxlQXNzZXQuczNPYmplY3RLZXkgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBpdGVtcyA9IGFwaS5yb290LmFkZFJlc291cmNlKCdpdGVtcycpO1xyXG4gICAgY29uc3QgZ2V0QWxsSW50ZWdyYXRpb24gPSBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihnZXRBbGxMYW1iZGEpO1xyXG4gICAgaXRlbXMuYWRkTWV0aG9kKCdHRVQnLCBnZXRBbGxJbnRlZ3JhdGlvbik7XHJcblxyXG4gICAgY29uc3Qgc2luZ2xlSXRlbSA9IGl0ZW1zLmFkZFJlc291cmNlKCd7aWR9Jyk7XHJcbiAgICBjb25zdCBnZXRPbmVJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGdldE9uZUxhbWJkYSk7XHJcbiAgICBzaW5nbGVJdGVtLmFkZE1ldGhvZCgnR0VUJywgZ2V0T25lSW50ZWdyYXRpb24pO1xyXG5cclxuICAgIGNvbnN0IHVwZGF0ZU9uZUludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odXBkYXRlT25lKTtcclxuICAgIHNpbmdsZUl0ZW0uYWRkTWV0aG9kKCdQQVRDSCcsIHVwZGF0ZU9uZUludGVncmF0aW9uKTtcclxuXHJcbiAgICBjb25zdCBkZWxldGVPbmVJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGRlbGV0ZU9uZSk7XHJcbiAgICBzaW5nbGVJdGVtLmFkZE1ldGhvZCgnREVMRVRFJywgZGVsZXRlT25lSW50ZWdyYXRpb24pO1xyXG4gICAgYWRkQ29yc09wdGlvbnMoc2luZ2xlSXRlbSk7XHJcblxyXG4gICAgY29uc3QgY2hlY2tDcmVhdGlvbkFsbG93YW5jZUxhbWJkYSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ2NoZWNrQ3JlYXRpb25BbGxvd2FuY2VMYW1iZGEnLCB7XHJcbiAgICAgIGNvZGU6IG5ldyBsYW1iZGEuQXNzZXRDb2RlKCdzcmMnKSxcclxuICAgICAgaGFuZGxlcjogJ2NoZWNrLWNyZWF0aW9uLWFsbG93YW5jZS5oYW5kbGVyJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEwX1gsXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVEFCTEVfTkFNRTogZHluYW1vVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIFRBQkxFX1NUQVRJQ19OQU1FOiBkeW5hbW9UYWJsZVN0YXRpYy50YWJsZU5hbWUsXHJcbiAgICAgICAgUFJJTUFSWV9LRVk6IFBSSU1BUllfS0VZLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgZHluYW1vVGFibGUuZ3JhbnRGdWxsQWNjZXNzKGNoZWNrQ3JlYXRpb25BbGxvd2FuY2VMYW1iZGEpO1xyXG5cclxuICAgIC8vIENvbmZpZ3VyZSBsb2cgZ3JvdXAgZm9yIHNob3J0IHJldGVudGlvblxyXG4gICAgLy8gY29uc3QgbG9nR3JvdXAgPSBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnTG9nR3JvdXAnLCB7XHJcbiAgICAvLyAgIHJldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9EQVksXHJcbiAgICAvLyAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICAvLyAgIGxvZ0dyb3VwTmFtZTogJy9hd3MvbGFtYmRhL2N1c3RvbS8nICsgdGhpcy5zdGFja05hbWVcclxuICAgIC8vIH0pO1xyXG5cclxuICAgIC8vIGNvbnN0IGxnc3RyZWFtID0gbG9nR3JvdXAuYWRkU3RyZWFtKCdteWxvZ2dyb3VwU3RyZWFtJywge2xvZ1N0cmVhbU5hbWUgOiAnbXlsb2dncm91cFN0cmVhbSd9KVxyXG5cclxuICAgIC8vIGxvZ0dyb3VwLmFkZFN1YnNjcmlwdGlvbkZpbHRlcihpZD0nbXlsb2dncm91cF9zdWJzMScsIHtcclxuICAgIC8vICAgICBkZXN0aW5hdGlvbjogbmV3IExhbWJkYURlc3RpbmF0aW9uKGNyZWF0ZU9uZUxhbWJkYSksXHJcbiAgICAvLyAgICAgLy8gZmlsdGVyUGF0dGVybjogbG9nc0Rlc3RpbmF0aW9ucy5GaWx0ZXJQYXR0ZXJuLmFsbFRlcm1zKFwiRVJST1JcIiwgXCJNYWluVGhyZWFkXCIpXHJcbiAgICAvLyAgICAgZmlsdGVyUGF0dGVybjogbG9ncy5GaWx0ZXJQYXR0ZXJuLmFsbEV2ZW50cygpLFxyXG4gICAgLy8gICB9KTtcclxuXHJcblxyXG4gICAgLy8gIGNyZWF0ZU9uZUxhbWJkYS5hZGRQZXJtaXNzaW9uKFxyXG4gICAgLy8gICBpZD0nbXlsYW1iZGFmdW5jdGlvbi1pbnZva2UnLCB7XHJcbiAgICAvLyAgICAgcHJpbmNpcGFsOiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2xvZ3MuZXUtd2VzdC0yLmFtYXpvbmF3cy5jb20nKSxcclxuICAgIC8vICAgICBhY3Rpb246ICdsYW1iZGE6SW52b2tlRnVuY3Rpb24nLFxyXG4gICAgLy8gICAgIHNvdXJjZUFybjogbG9nR3JvdXAubG9nR3JvdXBBcm5cclxuICAgIC8vICAgfSlcclxuXHJcbiAgICAvLyAgbG9nR3JvdXAuZ3JhbnRXcml0ZShjcmVhdGVPbmVMYW1iZGEpO1xyXG5cclxuICAgIC8vIGNvbnN0IGNoZWNrSm9iQWN0aXZpdHkgPSBuZXcgc2ZuLkFjdGl2aXR5KHRoaXMsICdDaGVja0pvYicpO1xyXG5cclxuICAgIGNvbnN0IGNoZWNrQ3JlYXRpb25BbGxvd2FuY2UgPSBuZXcgc2ZuLlRhc2sodGhpcywgJ0NoZWNrIENyZWF0aW9uIEFsbG93YW5jZScsIHtcclxuICAgICAgdGFzazogbmV3IHNmbl90YXNrcy5JbnZva2VGdW5jdGlvbihjaGVja0NyZWF0aW9uQWxsb3dhbmNlTGFtYmRhKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGNyZWF0ZU9uZSA9IG5ldyBzZm4uVGFzayh0aGlzLCAnQ3JlYXRlIEl0ZW0nLCB7XHJcbiAgICAgIHRhc2s6IG5ldyBzZm5fdGFza3MuSW52b2tlRnVuY3Rpb24oY3JlYXRlT25lTGFtYmRhKSxcclxuICAgICAgaW5wdXRQYXRoOiAnJC5pdGVtJ1xyXG4gICAgfSk7XHJcbiAgICBjb25zdCB3YWl0WCA9IG5ldyBzZm4uV2FpdCh0aGlzLCAnV2FpdCBYIFNlY29uZHMnLCB7XHJcbiAgICAgIHRpbWU6IHNmbi5XYWl0VGltZS5kdXJhdGlvbihjZGsuRHVyYXRpb24uc2Vjb25kcyg1KSksXHJcbiAgICB9KTtcclxuICAgIC8vIGNvbnN0IGdldFN0YXR1cyA9IG5ldyBzZm4uVGFzayh0aGlzLCAnR2V0IEpvYiBTdGF0dXMnLCB7XHJcbiAgICAvLyAgIHRhc2s6IG5ldyBzZm5fdGFza3MuSW52b2tlQWN0aXZpdHkoY2hlY2tKb2JBY3Rpdml0eSksXHJcbiAgICAvLyAgIGlucHV0UGF0aDogJyQuZ3VpZCcsXHJcbiAgICAvLyAgIHJlc3VsdFBhdGg6ICckLnN0YXR1cycsXHJcbiAgICAvLyB9KTtcclxuICAgIGNvbnN0IGlzQWxsb3dlZCA9IG5ldyBzZm4uQ2hvaWNlKHRoaXMsICdDcmVhdGlvbiBBbGxvd2VkPycpO1xyXG4gICAgY29uc3Qgbm90QWxsb3dlZCA9IG5ldyBzZm4uRmFpbCh0aGlzLCAnTm90IEFsbG93ZWQnLCB7XHJcbiAgICAgIGNhdXNlOiAnQ3JlYXRpb24gZmFpbGVkJyxcclxuICAgICAgZXJyb3I6ICdKb2IgcmV0dXJuZWQgZmFpbGVkJyxcclxuICAgIH0pO1xyXG4gICAgLy8gY29uc3QgZmluYWxTdGF0dXMgPSBuZXcgc2ZuLlRhc2sodGhpcywgJ0dldCBGaW5hbCBKb2IgU3RhdHVzJywge1xyXG4gICAgLy8gICB0YXNrOiBuZXcgc2ZuX3Rhc2tzLkludm9rZUFjdGl2aXR5KGNoZWNrSm9iQWN0aXZpdHkpLFxyXG4gICAgLy8gICBpbnB1dFBhdGg6ICckLmd1aWQnLFxyXG4gICAgLy8gfSk7XHJcblxyXG4gICAgY29uc3QgY2hhaW4gPSBzZm4uQ2hhaW4uc3RhcnQoY2hlY2tDcmVhdGlvbkFsbG93YW5jZSlcclxuICAgICAgLm5leHQoaXNBbGxvd2VkXHJcbiAgICAgIC53aGVuKHNmbi5Db25kaXRpb24uc3RyaW5nRXF1YWxzKCckLnJlc3VsdCcsICdmYWlsZWQnKSwgbm90QWxsb3dlZClcclxuICAgICAgLndoZW4oc2ZuLkNvbmRpdGlvbi5zdHJpbmdFcXVhbHMoJyQucmVzdWx0JywgJ29rJyksIGNyZWF0ZU9uZSlcclxuICAgICAgLm90aGVyd2lzZSh3YWl0WCkgKTtcclxuICAgIC8vIC5uZXh0KGdldFN0YXR1cylcclxuICAgIC8vIC5uZXh0KFxyXG4gICAgLy8gICBpc0NvbXBsZXRlXHJcbiAgICAvLyAgICAgLndoZW4oc2ZuLkNvbmRpdGlvbi5zdHJpbmdFcXVhbHMoJyQuc3RhdHVzJywgJ0ZBSUxFRCcpLCBqb2JGYWlsZWQpXHJcbiAgICAvLyAgICAgLndoZW4oc2ZuLkNvbmRpdGlvbi5zdHJpbmdFcXVhbHMoJyQuc3RhdHVzJywgJ1NVQ0NFRURFRCcpLCBmaW5hbFN0YXR1cylcclxuICAgIC8vICAgICAub3RoZXJ3aXNlKHdhaXRYKSxcclxuICAgIC8vICk7XHJcblxyXG4gICAgY29uc3QgY3JlYXRlU3RhdGVNYWNoaW5lID0gbmV3IHNmbi5TdGF0ZU1hY2hpbmUodGhpcywgJ0NyZWF0ZVN0YXRlTWFjaGluZScsIHtcclxuICAgICAgZGVmaW5pdGlvbjogY2hhaW4sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGNyZWF0ZU9uZUFwaSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ2NyZWF0ZUl0ZW1GdW5jdGlvbkFwaScsIHtcclxuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxyXG4gICAgICBoYW5kbGVyOiAnY3JlYXRlLWFwaS5oYW5kbGVyJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEwX1gsXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgU1RBVEVfTUFDSElORV9BUk46IGNyZWF0ZVN0YXRlTWFjaGluZS5zdGF0ZU1hY2hpbmVBcm4sXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBjcmVhdGVTdGF0ZU1hY2hpbmUuZ3JhbnRTdGFydEV4ZWN1dGlvbihjcmVhdGVPbmVBcGkpO1xyXG5cclxuICAgIC8vIGNvbnN0IHZhbCA9IG5ldyBhcGlnYXRld2F5LlJlcXVlc3RWYWxpZGF0b3IodGhpcywgJ0RlZmF1bHRWYWxpZGF0b3InLCB7XHJcbiAgICAvLyAgIHJlc3RBcGk6IGFwaSxcclxuICAgIC8vICAgdmFsaWRhdGVSZXF1ZXN0Qm9keTogdHJ1ZSxcclxuICAgIC8vICAgdmFsaWRhdGVSZXF1ZXN0UGFyYW1ldGVyczogdHJ1ZVxyXG4gICAgLy8gfSlcclxuXHJcbiAgICAvLyBjb25zdCB2YWxpZGF0b3IgPSBhcGkuYWRkUmVxdWVzdFZhbGlkYXRvcignRGVmYXVsdFZhbGlkYXRvcicsIHtcclxuICAgIC8vICAgdmFsaWRhdGVSZXF1ZXN0Qm9keTogdHJ1ZSxcclxuICAgIC8vICAgdmFsaWRhdGVSZXF1ZXN0UGFyYW1ldGVyczogdHJ1ZVxyXG4gICAgLy8gfSwgYXBpKTtcclxuXHJcbiAgICBjb25zdCBjcmVhdGVPbmVJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGNyZWF0ZU9uZUFwaSk7XHJcblxyXG4gICAgaXRlbXMuYWRkTWV0aG9kKCdQT1NUJywgY3JlYXRlT25lSW50ZWdyYXRpb24pO1xyXG4gICAgYWRkQ29yc09wdGlvbnMoaXRlbXMpO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdUYWJsZU5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiBkeW5hbW9UYWJsZS50YWJsZU5hbWVcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdSZXN0QXBpRW5kUG9pbnQnLCB7XHJcbiAgICAgIHZhbHVlOiBhcGkudXJsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUmVzdEFwaUlkJywge1xyXG4gICAgICB2YWx1ZTogYXBpLnJlc3RBcGlJZFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0xvZ0dyb3VwTmFtZScsIHtcclxuICAgIC8vICAgdmFsdWU6IGxvZ0dyb3VwLmxvZ0dyb3VwTmFtZVxyXG4gICAgLy8gfSk7XHJcblxyXG4gICAgLy8gbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0xvZ0dyb3VwU3RyZWFtTmFtZScsIHtcclxuICAgIC8vICAgdmFsdWU6IGxnc3RyZWFtLmxvZ1N0cmVhbU5hbWVcclxuICAgIC8vIH0pO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFkZENvcnNPcHRpb25zKGFwaVJlc291cmNlOiBhcGlnYXRld2F5LklSZXNvdXJjZSkge1xyXG4gIGFwaVJlc291cmNlLmFkZE1ldGhvZChcclxuICAgICdPUFRJT05TJyxcclxuICAgIG5ldyBhcGlnYXRld2F5Lk1vY2tJbnRlZ3JhdGlvbih7XHJcbiAgICAgIGludGVncmF0aW9uUmVzcG9uc2VzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgc3RhdHVzQ29kZTogJzIwMCcsXHJcbiAgICAgICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcclxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6XHJcbiAgICAgICAgICAgICAgXCInQ29udGVudC1UeXBlLFgtQW16LURhdGUsQXV0aG9yaXphdGlvbixYLUFwaS1LZXksWC1BbXotU2VjdXJpdHktVG9rZW4sWC1BbXotVXNlci1BZ2VudCdcIixcclxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogXCInKidcIixcclxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctQ3JlZGVudGlhbHMnOiBcIidmYWxzZSdcIixcclxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6IFwiJ09QVElPTlMsR0VULFBVVCxQT1NULERFTEVURSdcIixcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuICAgICAgXSxcclxuICAgICAgcGFzc3Rocm91Z2hCZWhhdmlvcjogYXBpZ2F0ZXdheS5QYXNzdGhyb3VnaEJlaGF2aW9yLk5FVkVSLFxyXG4gICAgICByZXF1ZXN0VGVtcGxhdGVzOiB7XHJcbiAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiAne1wic3RhdHVzQ29kZVwiOiAyMDB9JyxcclxuICAgICAgfSxcclxuICAgIH0pLFxyXG4gICAge1xyXG4gICAgICBtZXRob2RSZXNwb25zZXM6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcclxuICAgICAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xyXG4gICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogdHJ1ZSxcclxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6IHRydWUsXHJcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUNyZWRlbnRpYWxzJzogdHJ1ZSxcclxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogdHJ1ZSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuICAgICAgXSxcclxuICAgIH0sXHJcbiAgKTtcclxufVxyXG5cclxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcclxubmV3IEFwaUxhbWJkYUNydWREeW5hbW9EQlN0YWNrKGFwcCwgJ0FwaUxhbWJkYUNydWREeW5hbW9EQkV4YW1wbGUnKTtcclxuYXBwLnN5bnRoKCk7XHJcbiJdfQ==