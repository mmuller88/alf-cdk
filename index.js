"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apigateway = require("@aws-cdk/aws-apigateway");
const dynamodb = require("@aws-cdk/aws-dynamodb");
const lambda = require("@aws-cdk/aws-lambda");
const cdk = require("@aws-cdk/core");
const sfn = require("@aws-cdk/aws-stepfunctions");
const sfn_tasks = require("@aws-cdk/aws-stepfunctions-tasks");
const assets = require("@aws-cdk/aws-s3-assets");
const logs = require("@aws-cdk/aws-logs");
const aws_logs_destinations_1 = require("@aws-cdk/aws-logs-destinations");
const path_1 = require("path");
// Table identifier
const PRIMARY_KEY = 'alfInstanceId';
const USER_KEY = 'userId';
const SORT_KEY = USER_KEY;
const TABLE_NAME = 'alfInstances';
const WITH_SWAGGER = process.env.WITH_SWAGGER || 'true';
class ApiLambdaCrudDynamoDBStack extends cdk.Stack {
    constructor(app, id) {
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
            removalPolicy: cdk.RemovalPolicy.DESTROY,
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
        const cfnApi = api.node.defaultChild;
        // Upload Swagger to S3
        // @ts-ignore
        const fileAsset = new assets.Asset(this, 'SwaggerAsset', {
            path: path_1.join(__dirname, 'templates/swagger_full.yaml')
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
        dynamoTable.grantReadWriteData(checkCreationAllowanceLambda);
        // Configure log group for short retention
        const logGroup = new logs.LogGroup(this, 'LogGroup', {
            retention: logs.RetentionDays.ONE_WEEK
        });
        new logs.SubscriptionFilter(this, 'Subscription', {
            logGroup,
            destination: new aws_logs_destinations_1.LambdaDestination(createOneLambda),
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
        const val = new apigateway.RequestValidator(this, 'DefaultValidator', {
            restApi: api,
            validateRequestBody: true,
            validateRequestParameters: true
        });
        // const validator = api.addRequestValidator('DefaultValidator', {
        //   validateRequestBody: true,
        //   validateRequestParameters: true
        // }, api);
        const createOneIntegration = new apigateway.LambdaIntegration(createOneApi);
        items.addMethod('POST', createOneIntegration, { requestValidator: val });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHNEQUF1RDtBQUN2RCxrREFBbUQ7QUFDbkQsOENBQStDO0FBQy9DLHFDQUFzQztBQUN0QyxrREFBbUQ7QUFDbkQsOERBQStEO0FBQy9ELGlEQUFpRDtBQUNqRCwwQ0FBMkM7QUFDM0MsMEVBQW1FO0FBQ25FLCtCQUE0QjtBQUU1QixtQkFBbUI7QUFDbkIsTUFBTSxXQUFXLEdBQUcsZUFBZSxDQUFDO0FBQ3BDLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQztBQUMxQixNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUM7QUFDMUIsTUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFDO0FBRWxDLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxJQUFJLE1BQU0sQ0FBQTtBQUV2RCxNQUFhLDBCQUEyQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQ3ZELFlBQVksR0FBWSxFQUFFLEVBQVU7UUFDbEMsS0FBSyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVmLE1BQU0sV0FBVyxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFO1lBQ3BELFlBQVksRUFBRTtnQkFDWixJQUFJLEVBQUUsV0FBVztnQkFDakIsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTTthQUNwQztZQUNELE9BQU8sRUFBRTtnQkFDUCxJQUFJLEVBQUUsUUFBUTtnQkFDZCxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNO2FBQ3BDO1lBQ0QsU0FBUyxFQUFFLFVBQVU7WUFFckIsZ0dBQWdHO1lBQ2hHLHFHQUFxRztZQUNyRyx5RUFBeUU7WUFDekUsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztTQUN6QyxDQUFDLENBQUM7UUFFSCxNQUFNLGlCQUFpQixHQUFHLElB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QXFELEVBQUUsK0JBQStCO2lCQUN2RjthQUNGO1NBQ0Y7UUFDRCxtQkFBbUIsRUFBRSxVQUFVLENBQUMsbUJBQW1CLENBQUMsS0FBSztRQUN6RCxnQkFBZ0IsRUFBRTtZQUNoQixrQkFBa0IsRUFBRSxxQkFBcUI7U0FDMUM7S0FDRixDQUFDLEVBQ0Y7UUFDRSxlQUFlLEVBQUU7WUFDZjtnQkFDRSxVQUFVLEVBQUUsS0FBSztnQkFDakIsa0JBQWtCLEVBQUU7b0JBQ2xCLHFEQUFxRCxFQUFFLElBQUk7b0JBQzNELHFEQUFxRCxFQUFFLElBQUk7b0JBQzNELHlEQUF5RCxFQUFFLElBQUk7b0JBQy9ELG9EQUFvRCxFQUFFLElBQUk7aUJBQzNEO2FBQ0Y7U0FDRjtLQUNGLENBQ0YsQ0FBQztBQUNKLENBQUM7QUFuQ0Qsd0NBbUNDO0FBRUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDMUIsSUFBSSwwQkFBMEIsQ0FBQyxHQUFHLEVBQUUsOEJBQThCLENBQUMsQ0FBQztBQUNwRSxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXBpZ2F0ZXdheSA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1hcGlnYXRld2F5Jyk7XHJcbmltcG9ydCBkeW5hbW9kYiA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1keW5hbW9kYicpO1xyXG5pbXBvcnQgbGFtYmRhID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWxhbWJkYScpO1xyXG5pbXBvcnQgY2RrID0gcmVxdWlyZSgnQGF3cy1jZGsvY29yZScpO1xyXG5pbXBvcnQgc2ZuID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLXN0ZXBmdW5jdGlvbnMnKTtcclxuaW1wb3J0IHNmbl90YXNrcyA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1zdGVwZnVuY3Rpb25zLXRhc2tzJyk7XHJcbmltcG9ydCBhc3NldHMgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtczMtYXNzZXRzJylcclxuaW1wb3J0IGxvZ3MgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtbG9ncycpO1xyXG5pbXBvcnQgeyBMYW1iZGFEZXN0aW5hdGlvbiB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1sb2dzLWRlc3RpbmF0aW9ucyc7XHJcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcclxuXHJcbi8vIFRhYmxlIGlkZW50aWZpZXJcclxuY29uc3QgUFJJTUFSWV9LRVkgPSAnYWxmSW5zdGFuY2VJZCc7XHJcbmNvbnN0IFVTRVJfS0VZID0gJ3VzZXJJZCc7XHJcbmNvbnN0IFNPUlRfS0VZID0gVVNFUl9LRVk7XHJcbmNvbnN0IFRBQkxFX05BTUUgPSAnYWxmSW5zdGFuY2VzJztcclxuXHJcbmNvbnN0IFdJVEhfU1dBR0dFUiA9IHByb2Nlc3MuZW52LldJVEhfU1dBR0dFUiB8fCAndHJ1ZSdcclxuXHJcbmV4cG9ydCBjbGFzcyBBcGlMYW1iZGFDcnVkRHluYW1vREJTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgY29uc3RydWN0b3IoYXBwOiBjZGsuQXBwLCBpZDogc3RyaW5nKSB7XHJcbiAgICBzdXBlcihhcHAsIGlkKTtcclxuXHJcbiAgICBjb25zdCBkeW5hbW9UYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnaXRlbXMnLCB7XHJcbiAgICAgIHBhcnRpdGlvbktleToge1xyXG4gICAgICAgIG5hbWU6IFBSSU1BUllfS0VZLFxyXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HXHJcbiAgICAgIH0sXHJcbiAgICAgIHNvcnRLZXk6IHtcclxuICAgICAgICBuYW1lOiBTT1JUX0tFWSxcclxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklOR1xyXG4gICAgICB9LFxyXG4gICAgICB0YWJsZU5hbWU6IFRBQkxFX05BTUUsXHJcblxyXG4gICAgICAvLyBUaGUgZGVmYXVsdCByZW1vdmFsIHBvbGljeSBpcyBSRVRBSU4sIHdoaWNoIG1lYW5zIHRoYXQgY2RrIGRlc3Ryb3kgd2lsbCBub3QgYXR0ZW1wdCB0byBkZWxldGVcclxuICAgICAgLy8gdGhlIG5ldyB0YWJsZSwgYW5kIGl0IHdpbGwgcmVtYWluIGluIHlvdXIgYWNjb3VudCB1bnRpbCBtYW51YWxseSBkZWxldGVkLiBCeSBzZXR0aW5nIHRoZSBwb2xpY3kgdG9cclxuICAgICAgLy8gREVTVFJPWSwgY2RrIGRlc3Ryb3kgd2lsbCBkZWxldGUgdGhlIHRhYmxlIChldmVuIGlmIGl0IGhhcyBkYXRhIGluIGl0KVxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAvLyBOT1QgcmVjb21tZW5kZWQgZm9yIHByb2R1Y3Rpb24gY29kZVxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgZHluYW1vVGFibGVTdGF0aWMgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ3N0YXRpY0l0ZW1zJywge1xyXG4gICAgICBwYXJ0aXRpb25LZXk6IHtcclxuICAgICAgICBuYW1lOiBQUklNQVJZX0tFWSxcclxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcclxuICAgICAgfSxcclxuICAgICAgdGFibGVOYW1lOiAnc3RhdGljSXRlbXMnLFxyXG5cclxuICAgICAgLy8gVGhlIGRlZmF1bHQgcmVtb3ZhbCBwb2xpY3kgaXMgUkVUQUlOLCB3aGljaCBtZWFucyB0aGF0IGNkayBkZXN0cm95IHdpbGwgbm90IGF0dGVtcHQgdG8gZGVsZXRlXHJcbiAgICAgIC8vIHRoZSBuZXcgdGFibGUsIGFuZCBpdCB3aWxsIHJlbWFpbiBpbiB5b3VyIGFjY291bnQgdW50aWwgbWFudWFsbHkgZGVsZXRlZC4gQnkgc2V0dGluZyB0aGUgcG9saWN5IHRvXHJcbiAgICAgIC8vIERFU1RST1ksIGNkayBkZXN0cm95IHdpbGwgZGVsZXRlIHRoZSB0YWJsZSAoZXZlbiBpZiBpdCBoYXMgZGF0YSBpbiBpdClcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gTk9UIHJlY29tbWVuZGVkIGZvciBwcm9kdWN0aW9uIGNvZGVcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGdldE9uZUxhbWJkYSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ2dldE9uZUl0ZW1GdW5jdGlvbicsIHtcclxuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxyXG4gICAgICBoYW5kbGVyOiAnZ2V0LW9uZS5oYW5kbGVyJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEwX1gsXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVEFCTEVfTkFNRTogZHluYW1vVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIFBSSU1BUllfS0VZOiBQUklNQVJZX0tFWSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGdldEFsbExhbWJkYSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ2dldEFsbEl0ZW1zRnVuY3Rpb24nLCB7XHJcbiAgICAgIGNvZGU6IG5ldyBsYW1iZGEuQXNzZXRDb2RlKCdzcmMnKSxcclxuICAgICAgaGFuZGxlcjogJ2dldC1hbGwuaGFuZGxlcicsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMF9YLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFRBQkxFX05BTUU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBQUklNQVJZX0tFWTogUFJJTUFSWV9LRVksXHJcbiAgICAgICAgVVNFUl9LRVk6IFVTRVJfS0VZXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCB1cGRhdGVPbmUgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICd1cGRhdGVJdGVtRnVuY3Rpb24nLCB7XHJcbiAgICAgIGNvZGU6IG5ldyBsYW1iZGEuQXNzZXRDb2RlKCdzcmMnKSxcclxuICAgICAgaGFuZGxlcjogJ3VwZGF0ZS1vbmUuaGFuZGxlcicsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMF9YLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFRBQkxFX05BTUU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBQUklNQVJZX0tFWTogUFJJTUFSWV9LRVksXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBkZWxldGVPbmUgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdkZWxldGVJdGVtRnVuY3Rpb24nLCB7XHJcbiAgICAgIGNvZGU6IG5ldyBsYW1iZGEuQXNzZXRDb2RlKCdzcmMnKSxcclxuICAgICAgaGFuZGxlcjogJ2RlbGV0ZS1vbmUuaGFuZGxlcicsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMF9YLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFRBQkxFX05BTUU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBQUklNQVJZX0tFWTogUFJJTUFSWV9LRVksXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBjcmVhdGVPbmVMYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdjcmVhdGVJdGVtRnVuY3Rpb24nLCB7XHJcbiAgICAgIGNvZGU6IG5ldyBsYW1iZGEuQXNzZXRDb2RlKCdzcmMnKSxcclxuICAgICAgaGFuZGxlcjogJ2NyZWF0ZS5oYW5kbGVyJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEwX1gsXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVEFCTEVfTkFNRTogZHluYW1vVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIFBSSU1BUllfS0VZOiBQUklNQVJZX0tFWSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIGR5bmFtb1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShnZXRBbGxMYW1iZGEpO1xyXG4gICAgZHluYW1vVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGdldE9uZUxhbWJkYSk7XHJcbiAgICBkeW5hbW9UYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoY3JlYXRlT25lTGFtYmRhKTtcclxuICAgIGR5bmFtb1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh1cGRhdGVPbmUpO1xyXG4gICAgZHluYW1vVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGRlbGV0ZU9uZSk7XHJcblxyXG4gICAgLy8gY29uc3Qgc3dhZ2dlciA9IG5ldyBjZGsuQ2ZuSW5jbHVkZSh0aGlzLCBcIkV4aXN0aW5nSW5mcmFzdHJ1Y3R1cmVcIiwge1xyXG4gICAgLy8gICB0ZW1wbGF0ZTogeWFtbC5zYWZlTG9hZChmcy5yZWFkRmlsZVN5bmMoXCIuL215LWJ1Y2tldC55YW1sXCIpLnRvU3RyaW5nKCkpXHJcbiAgICAvLyB9KTtcclxuXHJcbiAgICBjb25zdCBhcGkgPSBuZXcgYXBpZ2F0ZXdheS5SZXN0QXBpKHRoaXMsICdpdGVtc0FwaScsIHtcclxuICAgICAgcmVzdEFwaU5hbWU6ICdJdGVtcyBTZXJ2aWNlJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdCbHViJ1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQHRzLWlnbm9yZVxyXG4gICAgY29uc3QgY2ZuQXBpID0gYXBpLm5vZGUuZGVmYXVsdENoaWxkIGFzIGFwaWdhdGV3YXkuQ2ZuUmVzdEFwaTtcclxuXHJcbiAgICAvLyBVcGxvYWQgU3dhZ2dlciB0byBTM1xyXG4gICAgLy8gQHRzLWlnbm9yZVxyXG4gICAgY29uc3QgZmlsZUFzc2V0ID0gbmV3IGFzc2V0cy5Bc3NldCh0aGlzLCAnU3dhZ2dlckFzc2V0Jywge1xyXG4gICAgICBwYXRoOiBqb2luKF9fZGlybmFtZSwgJ3RlbXBsYXRlcy9zd2FnZ2VyX2Z1bGwueWFtbCcpXHJcbiAgICB9KTtcclxuXHJcbiAgICBpZihXSVRIX1NXQUdHRVIgIT09ICdmYWxzZScpe1xyXG4gICAgICBjZm5BcGkuYm9keVMzTG9jYXRpb24gPSB7IGJ1Y2tldDogZmlsZUFzc2V0LmJ1Y2tldC5idWNrZXROYW1lLCBrZXk6IGZpbGVBc3NldC5zM09iamVjdEtleSB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGl0ZW1zID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2l0ZW1zJyk7XHJcbiAgICBjb25zdCBnZXRBbGxJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGdldEFsbExhbWJkYSk7XHJcbiAgICBpdGVtcy5hZGRNZXRob2QoJ0dFVCcsIGdldEFsbEludGVncmF0aW9uKTtcclxuXHJcbiAgICBjb25zdCBzaW5nbGVJdGVtID0gaXRlbXMuYWRkUmVzb3VyY2UoJ3tpZH0nKTtcclxuICAgIGNvbnN0IGdldE9uZUludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ2V0T25lTGFtYmRhKTtcclxuICAgIHNpbmdsZUl0ZW0uYWRkTWV0aG9kKCdHRVQnLCBnZXRPbmVJbnRlZ3JhdGlvbik7XHJcblxyXG4gICAgY29uc3QgdXBkYXRlT25lSW50ZWdyYXRpb24gPSBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih1cGRhdGVPbmUpO1xyXG4gICAgc2luZ2xlSXRlbS5hZGRNZXRob2QoJ1BBVENIJywgdXBkYXRlT25lSW50ZWdyYXRpb24pO1xyXG5cclxuICAgIGNvbnN0IGRlbGV0ZU9uZUludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZGVsZXRlT25lKTtcclxuICAgIHNpbmdsZUl0ZW0uYWRkTWV0aG9kKCdERUxFVEUnLCBkZWxldGVPbmVJbnRlZ3JhdGlvbik7XHJcbiAgICBhZGRDb3JzT3B0aW9ucyhzaW5nbGVJdGVtKTtcclxuXHJcbiAgICBjb25zdCBjaGVja0NyZWF0aW9uQWxsb3dhbmNlTGFtYmRhID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnY2hlY2tDcmVhdGlvbkFsbG93YW5jZUxhbWJkYScsIHtcclxuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxyXG4gICAgICBoYW5kbGVyOiAnY2hlY2stY3JlYXRpb24tYWxsb3dhbmNlLmhhbmRsZXInLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBUQUJMRV9OQU1FOiBkeW5hbW9UYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgVEFCTEVfU1RBVElDX05BTUU6IGR5bmFtb1RhYmxlU3RhdGljLnRhYmxlTmFtZSxcclxuICAgICAgICBQUklNQVJZX0tFWTogUFJJTUFSWV9LRVksXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBkeW5hbW9UYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoY2hlY2tDcmVhdGlvbkFsbG93YW5jZUxhbWJkYSk7XHJcblxyXG4gICAgLy8gQ29uZmlndXJlIGxvZyBncm91cCBmb3Igc2hvcnQgcmV0ZW50aW9uXHJcbiAgICBjb25zdCBsb2dHcm91cCA9IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdMb2dHcm91cCcsIHtcclxuICAgICAgcmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUtcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBsb2dzLlN1YnNjcmlwdGlvbkZpbHRlcih0aGlzLCAnU3Vic2NyaXB0aW9uJywge1xyXG4gICAgICBsb2dHcm91cCxcclxuICAgICAgZGVzdGluYXRpb246IG5ldyBMYW1iZGFEZXN0aW5hdGlvbihjcmVhdGVPbmVMYW1iZGEpLFxyXG4gICAgICAvLyBmaWx0ZXJQYXR0ZXJuOiBsb2dzRGVzdGluYXRpb25zLkZpbHRlclBhdHRlcm4uYWxsVGVybXMoXCJFUlJPUlwiLCBcIk1haW5UaHJlYWRcIilcclxuICAgICAgZmlsdGVyUGF0dGVybjogbG9ncy5GaWx0ZXJQYXR0ZXJuLmFsbEV2ZW50cygpXHJcbiAgICAgfSk7XHJcblxyXG4gICAgLy8gY29uc3QgY2hlY2tKb2JBY3Rpdml0eSA9IG5ldyBzZm4uQWN0aXZpdHkodGhpcywgJ0NoZWNrSm9iJyk7XHJcblxyXG4gICAgY29uc3QgY2hlY2tDcmVhdGlvbkFsbG93YW5jZSA9IG5ldyBzZm4uVGFzayh0aGlzLCAnQ2hlY2sgQ3JlYXRpb24gQWxsb3dhbmNlJywge1xyXG4gICAgICB0YXNrOiBuZXcgc2ZuX3Rhc2tzLkludm9rZUZ1bmN0aW9uKGNoZWNrQ3JlYXRpb25BbGxvd2FuY2VMYW1iZGEpLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgY3JlYXRlT25lID0gbmV3IHNmbi5UYXNrKHRoaXMsICdDcmVhdGUgSXRlbScsIHtcclxuICAgICAgdGFzazogbmV3IHNmbl90YXNrcy5JbnZva2VGdW5jdGlvbihjcmVhdGVPbmVMYW1iZGEpLFxyXG4gICAgICBpbnB1dFBhdGg6ICckLml0ZW0nXHJcbiAgICB9KTtcclxuICAgIGNvbnN0IHdhaXRYID0gbmV3IHNmbi5XYWl0KHRoaXMsICdXYWl0IFggU2Vjb25kcycsIHtcclxuICAgICAgdGltZTogc2ZuLldhaXRUaW1lLmR1cmF0aW9uKGNkay5EdXJhdGlvbi5zZWNvbmRzKDUpKSxcclxuICAgIH0pO1xyXG4gICAgLy8gY29uc3QgZ2V0U3RhdHVzID0gbmV3IHNmbi5UYXNrKHRoaXMsICdHZXQgSm9iIFN0YXR1cycsIHtcclxuICAgIC8vICAgdGFzazogbmV3IHNmbl90YXNrcy5JbnZva2VBY3Rpdml0eShjaGVja0pvYkFjdGl2aXR5KSxcclxuICAgIC8vICAgaW5wdXRQYXRoOiAnJC5ndWlkJyxcclxuICAgIC8vICAgcmVzdWx0UGF0aDogJyQuc3RhdHVzJyxcclxuICAgIC8vIH0pO1xyXG4gICAgY29uc3QgaXNBbGxvd2VkID0gbmV3IHNmbi5DaG9pY2UodGhpcywgJ0NyZWF0aW9uIEFsbG93ZWQ/Jyk7XHJcbiAgICBjb25zdCBub3RBbGxvd2VkID0gbmV3IHNmbi5GYWlsKHRoaXMsICdOb3QgQWxsb3dlZCcsIHtcclxuICAgICAgY2F1c2U6ICdDcmVhdGlvbiBmYWlsZWQnLFxyXG4gICAgICBlcnJvcjogJ0pvYiByZXR1cm5lZCBmYWlsZWQnLFxyXG4gICAgfSk7XHJcbiAgICAvLyBjb25zdCBmaW5hbFN0YXR1cyA9IG5ldyBzZm4uVGFzayh0aGlzLCAnR2V0IEZpbmFsIEpvYiBTdGF0dXMnLCB7XHJcbiAgICAvLyAgIHRhc2s6IG5ldyBzZm5fdGFza3MuSW52b2tlQWN0aXZpdHkoY2hlY2tKb2JBY3Rpdml0eSksXHJcbiAgICAvLyAgIGlucHV0UGF0aDogJyQuZ3VpZCcsXHJcbiAgICAvLyB9KTtcclxuXHJcbiAgICBjb25zdCBjaGFpbiA9IHNmbi5DaGFpbi5zdGFydChjaGVja0NyZWF0aW9uQWxsb3dhbmNlKVxyXG4gICAgICAubmV4dChpc0FsbG93ZWRcclxuICAgICAgLndoZW4oc2ZuLkNvbmRpdGlvbi5zdHJpbmdFcXVhbHMoJyQucmVzdWx0JywgJ2ZhaWxlZCcpLCBub3RBbGxvd2VkKVxyXG4gICAgICAud2hlbihzZm4uQ29uZGl0aW9uLnN0cmluZ0VxdWFscygnJC5yZXN1bHQnLCAnb2snKSwgY3JlYXRlT25lKVxyXG4gICAgICAub3RoZXJ3aXNlKHdhaXRYKSApO1xyXG4gICAgLy8gLm5leHQoZ2V0U3RhdHVzKVxyXG4gICAgLy8gLm5leHQoXHJcbiAgICAvLyAgIGlzQ29tcGxldGVcclxuICAgIC8vICAgICAud2hlbihzZm4uQ29uZGl0aW9uLnN0cmluZ0VxdWFscygnJC5zdGF0dXMnLCAnRkFJTEVEJyksIGpvYkZhaWxlZClcclxuICAgIC8vICAgICAud2hlbihzZm4uQ29uZGl0aW9uLnN0cmluZ0VxdWFscygnJC5zdGF0dXMnLCAnU1VDQ0VFREVEJyksIGZpbmFsU3RhdHVzKVxyXG4gICAgLy8gICAgIC5vdGhlcndpc2Uod2FpdFgpLFxyXG4gICAgLy8gKTtcclxuXHJcbiAgICBjb25zdCBjcmVhdGVTdGF0ZU1hY2hpbmUgPSBuZXcgc2ZuLlN0YXRlTWFjaGluZSh0aGlzLCAnQ3JlYXRlU3RhdGVNYWNoaW5lJywge1xyXG4gICAgICBkZWZpbml0aW9uOiBjaGFpbixcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgY3JlYXRlT25lQXBpID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnY3JlYXRlSXRlbUZ1bmN0aW9uQXBpJywge1xyXG4gICAgICBjb2RlOiBuZXcgbGFtYmRhLkFzc2V0Q29kZSgnc3JjJyksXHJcbiAgICAgIGhhbmRsZXI6ICdjcmVhdGUtYXBpLmhhbmRsZXInLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBTVEFURV9NQUNISU5FX0FSTjogY3JlYXRlU3RhdGVNYWNoaW5lLnN0YXRlTWFjaGluZUFybixcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNyZWF0ZVN0YXRlTWFjaGluZS5ncmFudFN0YXJ0RXhlY3V0aW9uKGNyZWF0ZU9uZUFwaSk7XHJcblxyXG4gICAgY29uc3QgdmFsID0gbmV3IGFwaWdhdGV3YXkuUmVxdWVzdFZhbGlkYXRvcih0aGlzLCAnRGVmYXVsdFZhbGlkYXRvcicsIHtcclxuICAgICAgcmVzdEFwaTogYXBpLFxyXG4gICAgICB2YWxpZGF0ZVJlcXVlc3RCb2R5OiB0cnVlLFxyXG4gICAgICB2YWxpZGF0ZVJlcXVlc3RQYXJhbWV0ZXJzOiB0cnVlXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIGNvbnN0IHZhbGlkYXRvciA9IGFwaS5hZGRSZXF1ZXN0VmFsaWRhdG9yKCdEZWZhdWx0VmFsaWRhdG9yJywge1xyXG4gICAgLy8gICB2YWxpZGF0ZVJlcXVlc3RCb2R5OiB0cnVlLFxyXG4gICAgLy8gICB2YWxpZGF0ZVJlcXVlc3RQYXJhbWV0ZXJzOiB0cnVlXHJcbiAgICAvLyB9LCBhcGkpO1xyXG5cclxuICAgIGNvbnN0IGNyZWF0ZU9uZUludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY3JlYXRlT25lQXBpKTtcclxuXHJcbiAgICBpdGVtcy5hZGRNZXRob2QoJ1BPU1QnLCBjcmVhdGVPbmVJbnRlZ3JhdGlvbiwgeyByZXF1ZXN0VmFsaWRhdG9yOiB2YWx9KTtcclxuICAgIGFkZENvcnNPcHRpb25zKGl0ZW1zKTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVGFibGVOYW1lJywge1xyXG4gICAgICB2YWx1ZTogZHluYW1vVGFibGUudGFibGVOYW1lXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUmVzdEFwaUVuZFBvaW50Jywge1xyXG4gICAgICB2YWx1ZTogYXBpLnVybFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1Jlc3RBcGlJZCcsIHtcclxuICAgICAgdmFsdWU6IGFwaS5yZXN0QXBpSWRcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdMb2dHcm91cE5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiBsb2dHcm91cC5sb2dHcm91cE5hbWVcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFkZENvcnNPcHRpb25zKGFwaVJlc291cmNlOiBhcGlnYXRld2F5LklSZXNvdXJjZSkge1xyXG4gIGFwaVJlc291cmNlLmFkZE1ldGhvZChcclxuICAgICdPUFRJT05TJyxcclxuICAgIG5ldyBhcGlnYXRld2F5Lk1vY2tJbnRlZ3JhdGlvbih7XHJcbiAgICAgIGludGVncmF0aW9uUmVzcG9uc2VzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgc3RhdHVzQ29kZTogJzIwMCcsXHJcbiAgICAgICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcclxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6XHJcbiAgICAgICAgICAgICAgXCInQ29udGVudC1UeXBlLFgtQW16LURhdGUsQXV0aG9yaXphdGlvbixYLUFwaS1LZXksWC1BbXotU2VjdXJpdHktVG9rZW4sWC1BbXotVXNlci1BZ2VudCdcIixcclxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogXCInKidcIixcclxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctQ3JlZGVudGlhbHMnOiBcIidmYWxzZSdcIixcclxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6IFwiJ09QVElPTlMsR0VULFBVVCxQT1NULERFTEVURSdcIixcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuICAgICAgXSxcclxuICAgICAgcGFzc3Rocm91Z2hCZWhhdmlvcjogYXBpZ2F0ZXdheS5QYXNzdGhyb3VnaEJlaGF2aW9yLk5FVkVSLFxyXG4gICAgICByZXF1ZXN0VGVtcGxhdGVzOiB7XHJcbiAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiAne1wic3RhdHVzQ29kZVwiOiAyMDB9JyxcclxuICAgICAgfSxcclxuICAgIH0pLFxyXG4gICAge1xyXG4gICAgICBtZXRob2RSZXNwb25zZXM6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcclxuICAgICAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xyXG4gICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogdHJ1ZSxcclxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6IHRydWUsXHJcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUNyZWRlbnRpYWxzJzogdHJ1ZSxcclxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogdHJ1ZSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuICAgICAgXSxcclxuICAgIH0sXHJcbiAgKTtcclxufVxyXG5cclxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcclxubmV3IEFwaUxhbWJkYUNydWREeW5hbW9EQlN0YWNrKGFwcCwgJ0FwaUxhbWJkYUNydWREeW5hbW9EQkV4YW1wbGUnKTtcclxuYXBwLnN5bnRoKCk7XHJcbiJdfQ==