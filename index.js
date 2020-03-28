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
const iam = require("@aws-cdk/aws-iam");
const aws_logs_destinations_1 = require("@aws-cdk/aws-logs-destinations");
const path_1 = require("path");
// import * as replace from 'replace-in-file';
const fs = require("fs");
const replace = require('replace-in-file');
const instanceTable = { name: 'alfInstances', primaryKey: 'alfUserId', sortKey: 'alfInstanceId' };
const staticTable = { name: 'staticItems', primaryKey: 'itemsId' };
const WITH_SWAGGER = process.env.WITH_SWAGGER || 'true';
class ApiLambdaCrudDynamoDBStack extends cdk.Stack {
    constructor(app, id) {
        super(app, id);
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
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        const dynamoTableStatic = new dynamodb.Table(this, staticTable.name, {
            partitionKey: {
                name: staticTable.primaryKey,
                type: dynamodb.AttributeType.STRING
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
                PRIMARY_KEY: instanceTable.primaryKey,
                SORT_KEY: instanceTable.sortKey
            },
        });
        const getAllLambda = new lambda.Function(this, 'getAllItemsFunction', {
            code: new lambda.AssetCode('src'),
            handler: 'get-all.handler',
            runtime: lambda.Runtime.NODEJS_10_X,
            environment: {
                TABLE_NAME: dynamoTable.tableName,
                PRIMARY_KEY: instanceTable.primaryKey
            },
            functionName: 'getAllItemsFunction'
        });
        const updateOne = new lambda.Function(this, 'updateItemFunction', {
            code: new lambda.AssetCode('src'),
            handler: 'update-one.handler',
            runtime: lambda.Runtime.NODEJS_10_X,
            environment: {
                TABLE_NAME: dynamoTable.tableName,
                PRIMARY_KEY: instanceTable.primaryKey,
                SORT_KEY: instanceTable.sortKey
            },
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
        });
        const createOneLambda = new lambda.Function(this, 'createItemFunction', {
            code: new lambda.AssetCode('src'),
            handler: 'create.handler',
            runtime: lambda.Runtime.NODEJS_10_X,
            environment: {
                TABLE_NAME: dynamoTable.tableName,
                PRIMARY_KEY: instanceTable.primaryKey,
                SORT_KEY: instanceTable.sortKey
            },
        });
        dynamoTable.grantFullAccess(getAllLambda);
        dynamoTable.grantFullAccess(getOneLambda);
        dynamoTable.grantFullAccess(createOneLambda);
        dynamoTable.grantFullAccess(updateOne);
        dynamoTable.grantFullAccess(deleteOne);
        let createdAPILambdas = new Map();
        createdAPILambdas.set(getAllLambda.functionName, getAllLambda);
        fs.copyFileSync('templates/swagger_validations.yaml', 'tmp/swagger_full.yaml');
        var options = {
            files: 'tmp/swagger_full.yaml',
            from: /foo/g,
            to: 'bar',
        };
        createdAPILambdas.forEach(lambda => {
            options['from'] = new RegExp(`@@getAllItemsFunction@@`, "g");
            options['to'] = lambda.functionName;
            replace.sync(options);
            // content.replace(`@@${lambda.functionName}@@`, lambda.functionArn)
        });
        // const swagger = new cdk.CfnInclude(this, "ExistingInfrastructure", {
        //   template: yaml.safeLoad(fs.readFileSync("./my-bucket.yaml").toString())
        // });
        const api = new apigateway.RestApi(this, 'itemsApi', {
            restApiName: 'Items Service',
            description: 'Blub',
        });
        const cfnApi = api.node.defaultChild;
        if (WITH_SWAGGER !== 'false') {
            // Upload Swagger to S3
            const fileAsset = new assets.Asset(this, 'SwaggerAsset', {
                path: path_1.join(__dirname, 'tmp/swagger_full.yaml')
            });
            cfnApi.bodyS3Location = { bucket: fileAsset.bucket.bucketName, key: fileAsset.s3ObjectKey };
        }
        const items = api.root.addResource('items');
        const getAllIntegration = new apigateway.LambdaIntegration(getAllLambda);
        items.addMethod('GET', getAllIntegration);
        const singleItem = items.addResource(`{${instanceTable.sortKey}}`);
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
                PRIMARY_KEY: instanceTable.primaryKey,
            },
        });
        dynamoTable.grantFullAccess(checkCreationAllowanceLambda);
        // Configure log group for short retention
        const logGroup = new logs.LogGroup(this, 'LogGroup', {
            retention: logs.RetentionDays.ONE_DAY,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            logGroupName: '/aws/lambda/custom/' + this.stackName
        });
        const lgstream = logGroup.addStream('myloggroupStream', { logStreamName: 'myloggroupStream' });
        logGroup.addSubscriptionFilter(id = 'myloggroup_subs1', {
            destination: new aws_logs_destinations_1.LambdaDestination(createOneLambda),
            // filterPattern: logsDestinations.FilterPattern.allTerms("ERROR", "MainThread")
            filterPattern: logs.FilterPattern.allEvents(),
        });
        createOneLambda.addPermission(id = 'mylambdafunction-invoke', {
            principal: new iam.ServicePrincipal('logs.eu-west-2.amazonaws.com'),
            action: 'lambda:InvokeFunction',
            sourceArn: logGroup.logGroupArn
        });
        logGroup.grantWrite(createOneLambda);
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
                SORT_KEY: instanceTable.sortKey
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
        new cdk.CfnOutput(this, 'LogGroupName', {
            value: logGroup.logGroupName
        });
        new cdk.CfnOutput(this, 'LogGroupStreamName', {
            value: lgstream.logStreamName
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHNEQUF1RDtBQUN2RCxrREFBbUQ7QUFDbkQsOENBQStDO0FBQy9DLHFDQUFzQztBQUN0QyxrREFBbUQ7QUFDbkQsOERBQStEO0FBQy9ELGlEQUFpRDtBQUNqRCwwQ0FBMkM7QUFDM0Msd0NBQXlDO0FBQ3pDLDBFQUFtRTtBQUNuRSwrQkFBNEI7QUFDNUIsOENBQThDO0FBQzlDLHlCQUF5QjtBQUN6QixNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtBQUUxQyxNQUFNLGFBQWEsR0FBRyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFDLENBQUM7QUFDakcsTUFBTSxXQUFXLEdBQUcsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUMsQ0FBQTtBQUVqRSxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksSUFBSSxNQUFNLENBQUE7QUFFdkQsTUFBYSwwQkFBMkIsU0FBUSxHQUFHLENBQUMsS0FBSztJQUN2RCxZQUFZLEdBQVksRUFBRSxFQUFVO1FBQ2xDLEtBQUssQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFZixNQUFNLFdBQVcsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxJQUFJLEVBQUU7WUFDL0QsWUFBWSxFQUFFO2dCQUNaLElBQUksRUFBRSxhQUFhLENBQUMsVUFBVTtnQkFDOUIsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTTthQUNwQztZQUNELE9BQU8sRUFBRTtnQkFDUCxJQUFJLEVBQUUsYUFBYSxDQUFDLE9BQU87Z0JBQzNCLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU07YUFD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QUNMLENBQUM7Q0FDRjtBQXpSRCxnRUF5UkM7QUFFRCxTQUFnQixjQUFjLENBQUMsV0FBaUM7SUFDOUQsV0FBVyxDQUFDLFNBQVMsQ0FDbkIsU0FBUyxFQUNULElBQUksVUFBVSxDQUFDLGVBQWUsQ0FBQztRQUM3QixvQkFBb0IsRUFBRTtZQUNwQjtnQkFDRSxVQUFVLEVBQUUsS0FBSztnQkFDakIsa0JBQWtCLEVBQUU7b0JBQ2xCLHFEQUFxRCxFQUNuRCx5RkFBeUY7b0JBQzNGLG9EQUFvRCxFQUFFLEtBQUs7b0JBQzNELHlEQUF5RCxFQUFFLFNBQVM7b0JBQ3BFLHFEQUFxRCxFQUFFLCtCQUErQjtpQkFDdkY7YUFDRjtTQUNGO1FBQ0QsbUJBQW1CLEVBQUUsVUFBVSxDQUFDLG1CQUFtQixDQUFDLEtBQUs7UUFDekQsZ0JBQWdCLEVBQUU7WUFDaEIsa0JBQWtCLEVBQUUscUJBQXFCO1NBQzFDO0tBQ0YsQ0FBQyxFQUNGO1FBQ0UsZUFBZSxFQUFFO1lBQ2Y7Z0JBQ0UsVUFBVSxFQUFFLEtBQUs7Z0JBQ2pCLGtCQUFrQixFQUFFO29CQUNsQixxREFBcUQsRUFBRSxJQUFJO29CQUMzRCxxREFBcUQsRUFBRSxJQUFJO29CQUMzRCx5REFBeUQsRUFBRSxJQUFJO29CQUMvRCxvREFBb0QsRUFBRSxJQUFJO2lCQUMzRDthQUNGO1NBQ0Y7S0FDRixDQUNGLENBQUM7QUFDSixDQUFDO0FBbkNELHdDQW1DQztBQUVELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQzFCLElBQUksMEJBQTBCLENBQUMsR0FBRyxFQUFFLDhCQUE4QixDQUFDLENBQUM7QUFDcEUsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGFwaWdhdGV3YXkgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtYXBpZ2F0ZXdheScpO1xuaW1wb3J0IGR5bmFtb2RiID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWR5bmFtb2RiJyk7XG5pbXBvcnQgbGFtYmRhID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWxhbWJkYScpO1xuaW1wb3J0IGNkayA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2NvcmUnKTtcbmltcG9ydCBzZm4gPSByZXF1aXJlKCdAYXdzLWNkay9hd3Mtc3RlcGZ1bmN0aW9ucycpO1xuaW1wb3J0IHNmbl90YXNrcyA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1zdGVwZnVuY3Rpb25zLXRhc2tzJyk7XG5pbXBvcnQgYXNzZXRzID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLXMzLWFzc2V0cycpXG5pbXBvcnQgbG9ncyA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1sb2dzJyk7XG5pbXBvcnQgaWFtID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWlhbScpO1xuaW1wb3J0IHsgTGFtYmRhRGVzdGluYXRpb24gfSBmcm9tICdAYXdzLWNkay9hd3MtbG9ncy1kZXN0aW5hdGlvbnMnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xuLy8gaW1wb3J0ICogYXMgcmVwbGFjZSBmcm9tICdyZXBsYWNlLWluLWZpbGUnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuY29uc3QgcmVwbGFjZSA9IHJlcXVpcmUoJ3JlcGxhY2UtaW4tZmlsZScpXG5cbmNvbnN0IGluc3RhbmNlVGFibGUgPSB7IG5hbWU6ICdhbGZJbnN0YW5jZXMnLCBwcmltYXJ5S2V5OiAnYWxmVXNlcklkJywgc29ydEtleTogJ2FsZkluc3RhbmNlSWQnfTtcbmNvbnN0IHN0YXRpY1RhYmxlID0geyBuYW1lOiAnc3RhdGljSXRlbXMnLCBwcmltYXJ5S2V5OiAnaXRlbXNJZCd9XG5cbmNvbnN0IFdJVEhfU1dBR0dFUiA9IHByb2Nlc3MuZW52LldJVEhfU1dBR0dFUiB8fCAndHJ1ZSdcblxuZXhwb3J0IGNsYXNzIEFwaUxhbWJkYUNydWREeW5hbW9EQlN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3IoYXBwOiBjZGsuQXBwLCBpZDogc3RyaW5nKSB7XG4gICAgc3VwZXIoYXBwLCBpZCk7XG5cbiAgICBjb25zdCBkeW5hbW9UYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCBpbnN0YW5jZVRhYmxlLm5hbWUsIHtcbiAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICBuYW1lOiBpbnN0YW5jZVRhYmxlLnByaW1hcnlLZXksXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HXG4gICAgICB9LFxuICAgICAgc29ydEtleToge1xuICAgICAgICBuYW1lOiBpbnN0YW5jZVRhYmxlLnNvcnRLZXksXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HXG4gICAgICB9LFxuICAgICAgdGFibGVOYW1lOiBpbnN0YW5jZVRhYmxlLm5hbWUsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAvLyBOT1QgcmVjb21tZW5kZWQgZm9yIHByb2R1Y3Rpb24gY29kZVxuICAgIH0pO1xuXG4gICAgY29uc3QgZHluYW1vVGFibGVTdGF0aWMgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgc3RhdGljVGFibGUubmFtZSwge1xuICAgICAgcGFydGl0aW9uS2V5OiB7XG4gICAgICAgIG5hbWU6IHN0YXRpY1RhYmxlLnByaW1hcnlLZXksXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HXG4gICAgICB9LFxuICAgICAgdGFibGVOYW1lOiBzdGF0aWNUYWJsZS5uYW1lLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gTk9UIHJlY29tbWVuZGVkIGZvciBwcm9kdWN0aW9uIGNvZGVcbiAgICB9KTtcblxuICAgIGNvbnN0IGdldE9uZUxhbWJkYSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ2dldE9uZUl0ZW1GdW5jdGlvbicsIHtcbiAgICAgIGNvZGU6IG5ldyBsYW1iZGEuQXNzZXRDb2RlKCdzcmMnKSxcbiAgICAgIGhhbmRsZXI6ICdnZXQtb25lLmhhbmRsZXInLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEwX1gsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBUQUJMRV9OQU1FOiBkeW5hbW9UYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFBSSU1BUllfS0VZOiBpbnN0YW5jZVRhYmxlLnByaW1hcnlLZXksXG4gICAgICAgIFNPUlRfS0VZOiBpbnN0YW5jZVRhYmxlLnNvcnRLZXlcbiAgICAgIH0sXG4gICAgICAvLyBmdW5jdGlvbk5hbWU6ICdnZXRPbmVJdGVtRnVuY3Rpb24nLFxuICAgIH0pO1xuXG4gICAgY29uc3QgZ2V0QWxsTGFtYmRhID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnZ2V0QWxsSXRlbXNGdW5jdGlvbicsIHtcbiAgICAgIGNvZGU6IG5ldyBsYW1iZGEuQXNzZXRDb2RlKCdzcmMnKSxcbiAgICAgIGhhbmRsZXI6ICdnZXQtYWxsLmhhbmRsZXInLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEwX1gsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBUQUJMRV9OQU1FOiBkeW5hbW9UYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFBSSU1BUllfS0VZOiBpbnN0YW5jZVRhYmxlLnByaW1hcnlLZXlcbiAgICAgIH0sXG4gICAgICBmdW5jdGlvbk5hbWU6ICdnZXRBbGxJdGVtc0Z1bmN0aW9uJ1xuICAgIH0pO1xuXG4gICAgY29uc3QgdXBkYXRlT25lID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAndXBkYXRlSXRlbUZ1bmN0aW9uJywge1xuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ3VwZGF0ZS1vbmUuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRBQkxFX05BTUU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUFJJTUFSWV9LRVk6IGluc3RhbmNlVGFibGUucHJpbWFyeUtleSxcbiAgICAgICAgU09SVF9LRVk6IGluc3RhbmNlVGFibGUuc29ydEtleVxuICAgICAgfSxcbiAgICAgIC8vIGZ1bmN0aW9uTmFtZTogJ3VwZGF0ZUl0ZW1GdW5jdGlvbidcbiAgICB9KTtcblxuICAgIGNvbnN0IGRlbGV0ZU9uZSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ2RlbGV0ZUl0ZW1GdW5jdGlvbicsIHtcbiAgICAgIGNvZGU6IG5ldyBsYW1iZGEuQXNzZXRDb2RlKCdzcmMnKSxcbiAgICAgIGhhbmRsZXI6ICdkZWxldGUtb25lLmhhbmRsZXInLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEwX1gsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBUQUJMRV9OQU1FOiBkeW5hbW9UYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFBSSU1BUllfS0VZOiBpbnN0YW5jZVRhYmxlLnByaW1hcnlLZXksXG4gICAgICAgIFNPUlRfS0VZOiBpbnN0YW5jZVRhYmxlLnNvcnRLZXlcbiAgICAgIH0sXG4gICAgICAvLyBmdW5jdGlvbk5hbWU6ICdkZWxldGVJdGVtRnVuY3Rpb24nXG4gICAgfSk7XG5cbiAgICBjb25zdCBjcmVhdGVPbmVMYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdjcmVhdGVJdGVtRnVuY3Rpb24nLCB7XG4gICAgICBjb2RlOiBuZXcgbGFtYmRhLkFzc2V0Q29kZSgnc3JjJyksXG4gICAgICBoYW5kbGVyOiAnY3JlYXRlLmhhbmRsZXInLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEwX1gsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBUQUJMRV9OQU1FOiBkeW5hbW9UYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFBSSU1BUllfS0VZOiBpbnN0YW5jZVRhYmxlLnByaW1hcnlLZXksXG4gICAgICAgIFNPUlRfS0VZOiBpbnN0YW5jZVRhYmxlLnNvcnRLZXlcbiAgICAgIH0sXG4gICAgICAvLyBmdW5jdGlvbk5hbWU6ICdjcmVhdGVJdGVtRnVuY3Rpb24nXG4gICAgfSk7XG5cbiAgICBkeW5hbW9UYWJsZS5ncmFudEZ1bGxBY2Nlc3MoZ2V0QWxsTGFtYmRhKTtcbiAgICBkeW5hbW9UYWJsZS5ncmFudEZ1bGxBY2Nlc3MoZ2V0T25lTGFtYmRhKTtcbiAgICBkeW5hbW9UYWJsZS5ncmFudEZ1bGxBY2Nlc3MoY3JlYXRlT25lTGFtYmRhKTtcbiAgICBkeW5hbW9UYWJsZS5ncmFudEZ1bGxBY2Nlc3ModXBkYXRlT25lKTtcbiAgICBkeW5hbW9UYWJsZS5ncmFudEZ1bGxBY2Nlc3MoZGVsZXRlT25lKTtcblxuICAgIGxldCBjcmVhdGVkQVBJTGFtYmRhczpNYXA8c3RyaW5nLCBsYW1iZGEuRnVuY3Rpb24+ID0gbmV3IE1hcDxzdHJpbmcsIGxhbWJkYS5GdW5jdGlvbj4oKTtcbiAgICBjcmVhdGVkQVBJTGFtYmRhcy5zZXQoZ2V0QWxsTGFtYmRhLmZ1bmN0aW9uTmFtZSwgZ2V0QWxsTGFtYmRhKVxuXG4gICAgZnMuY29weUZpbGVTeW5jKCd0ZW1wbGF0ZXMvc3dhZ2dlcl92YWxpZGF0aW9ucy55YW1sJywgJ3RtcC9zd2FnZ2VyX2Z1bGwueWFtbCcpXG5cbiAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgIGZpbGVzOiAndG1wL3N3YWdnZXJfZnVsbC55YW1sJyxcbiAgICAgIGZyb206IC9mb28vZyxcbiAgICAgIHRvOiAnYmFyJyxcbiAgICB9O1xuXG4gICAgY3JlYXRlZEFQSUxhbWJkYXMuZm9yRWFjaChsYW1iZGEgPT4ge1xuICAgICAgb3B0aW9uc1snZnJvbSddID0gbmV3IFJlZ0V4cChgQEBnZXRBbGxJdGVtc0Z1bmN0aW9uQEBgLFwiZ1wiKTtcbiAgICAgIG9wdGlvbnNbJ3RvJ10gPSBsYW1iZGEuZnVuY3Rpb25OYW1lXG4gICAgICByZXBsYWNlLnN5bmMob3B0aW9ucyk7XG4gICAgICAvLyBjb250ZW50LnJlcGxhY2UoYEBAJHtsYW1iZGEuZnVuY3Rpb25OYW1lfUBAYCwgbGFtYmRhLmZ1bmN0aW9uQXJuKVxuICAgIH0pXG5cbiAgICAvLyBjb25zdCBzd2FnZ2VyID0gbmV3IGNkay5DZm5JbmNsdWRlKHRoaXMsIFwiRXhpc3RpbmdJbmZyYXN0cnVjdHVyZVwiLCB7XG4gICAgLy8gICB0ZW1wbGF0ZTogeWFtbC5zYWZlTG9hZChmcy5yZWFkRmlsZVN5bmMoXCIuL215LWJ1Y2tldC55YW1sXCIpLnRvU3RyaW5nKCkpXG4gICAgLy8gfSk7XG5cbiAgICBjb25zdCBhcGkgPSBuZXcgYXBpZ2F0ZXdheS5SZXN0QXBpKHRoaXMsICdpdGVtc0FwaScsIHtcbiAgICAgIHJlc3RBcGlOYW1lOiAnSXRlbXMgU2VydmljZScsXG4gICAgICBkZXNjcmlwdGlvbjogJ0JsdWInLFxuICAgICAgLy8gZGVwbG95T3B0aW9uczoge1xuICAgICAgLy8gICBsb2dnaW5nTGV2ZWw6IGFwaWdhdGV3YXkuTWV0aG9kTG9nZ2luZ0xldmVsLklORk8sXG4gICAgICAvLyAgIGRhdGFUcmFjZUVuYWJsZWQ6IHRydWVcbiAgICAgIC8vIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IGNmbkFwaSA9IGFwaS5ub2RlLmRlZmF1bHRDaGlsZCBhcyBhcGlnYXRld2F5LkNmblJlc3RBcGk7XG5cbiAgICBpZihXSVRIX1NXQUdHRVIgIT09ICdmYWxzZScpe1xuICAgICAgLy8gVXBsb2FkIFN3YWdnZXIgdG8gUzNcbiAgICAgIGNvbnN0IGZpbGVBc3NldCA9IG5ldyBhc3NldHMuQXNzZXQodGhpcywgJ1N3YWdnZXJBc3NldCcsIHtcbiAgICAgICAgcGF0aDogam9pbihfX2Rpcm5hbWUsICd0bXAvc3dhZ2dlcl9mdWxsLnlhbWwnKVxuICAgICAgfSk7XG4gICAgICBjZm5BcGkuYm9keVMzTG9jYXRpb24gPSB7IGJ1Y2tldDogZmlsZUFzc2V0LmJ1Y2tldC5idWNrZXROYW1lLCBrZXk6IGZpbGVBc3NldC5zM09iamVjdEtleSB9O1xuICAgIH1cblxuICAgIGNvbnN0IGl0ZW1zID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2l0ZW1zJyk7XG4gICAgY29uc3QgZ2V0QWxsSW50ZWdyYXRpb24gPSBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihnZXRBbGxMYW1iZGEpO1xuICAgIGl0ZW1zLmFkZE1ldGhvZCgnR0VUJywgZ2V0QWxsSW50ZWdyYXRpb24pO1xuXG4gICAgY29uc3Qgc2luZ2xlSXRlbSA9IGl0ZW1zLmFkZFJlc291cmNlKGB7JHtpbnN0YW5jZVRhYmxlLnNvcnRLZXl9fWApO1xuICAgIGNvbnN0IGdldE9uZUludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ2V0T25lTGFtYmRhKTtcbiAgICBzaW5nbGVJdGVtLmFkZE1ldGhvZCgnR0VUJywgZ2V0T25lSW50ZWdyYXRpb24pO1xuXG4gICAgY29uc3QgdXBkYXRlT25lSW50ZWdyYXRpb24gPSBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih1cGRhdGVPbmUpO1xuICAgIHNpbmdsZUl0ZW0uYWRkTWV0aG9kKCdQQVRDSCcsIHVwZGF0ZU9uZUludGVncmF0aW9uKTtcblxuICAgIGNvbnN0IGRlbGV0ZU9uZUludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZGVsZXRlT25lKTtcbiAgICBzaW5nbGVJdGVtLmFkZE1ldGhvZCgnREVMRVRFJywgZGVsZXRlT25lSW50ZWdyYXRpb24pO1xuICAgIGFkZENvcnNPcHRpb25zKHNpbmdsZUl0ZW0pO1xuXG4gICAgY29uc3QgY2hlY2tDcmVhdGlvbkFsbG93YW5jZUxhbWJkYSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ2NoZWNrQ3JlYXRpb25BbGxvd2FuY2VMYW1iZGEnLCB7XG4gICAgICBjb2RlOiBuZXcgbGFtYmRhLkFzc2V0Q29kZSgnc3JjJyksXG4gICAgICBoYW5kbGVyOiAnY2hlY2stY3JlYXRpb24tYWxsb3dhbmNlLmhhbmRsZXInLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEwX1gsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBUQUJMRV9OQU1FOiBkeW5hbW9UYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFRBQkxFX1NUQVRJQ19OQU1FOiBkeW5hbW9UYWJsZVN0YXRpYy50YWJsZU5hbWUsXG4gICAgICAgIFBSSU1BUllfS0VZOiBpbnN0YW5jZVRhYmxlLnByaW1hcnlLZXksXG4gICAgICB9LFxuICAgICAgLy8gZnVuY3Rpb25OYW1lOiAnY2hlY2tDcmVhdGlvbkFsbG93YW5jZUxhbWJkYSdcbiAgICB9KTtcblxuICAgIGR5bmFtb1RhYmxlLmdyYW50RnVsbEFjY2VzcyhjaGVja0NyZWF0aW9uQWxsb3dhbmNlTGFtYmRhKTtcblxuICAgIC8vIENvbmZpZ3VyZSBsb2cgZ3JvdXAgZm9yIHNob3J0IHJldGVudGlvblxuICAgIGNvbnN0IGxvZ0dyb3VwID0gbmV3IGxvZ3MuTG9nR3JvdXAodGhpcywgJ0xvZ0dyb3VwJywge1xuICAgICAgcmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX0RBWSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBsb2dHcm91cE5hbWU6ICcvYXdzL2xhbWJkYS9jdXN0b20vJyArIHRoaXMuc3RhY2tOYW1lXG4gICAgfSk7XG5cbiAgICBjb25zdCBsZ3N0cmVhbSA9IGxvZ0dyb3VwLmFkZFN0cmVhbSgnbXlsb2dncm91cFN0cmVhbScsIHtsb2dTdHJlYW1OYW1lIDogJ215bG9nZ3JvdXBTdHJlYW0nfSlcblxuICAgIGxvZ0dyb3VwLmFkZFN1YnNjcmlwdGlvbkZpbHRlcihpZD0nbXlsb2dncm91cF9zdWJzMScsIHtcbiAgICAgICAgZGVzdGluYXRpb246IG5ldyBMYW1iZGFEZXN0aW5hdGlvbihjcmVhdGVPbmVMYW1iZGEpLFxuICAgICAgICAvLyBmaWx0ZXJQYXR0ZXJuOiBsb2dzRGVzdGluYXRpb25zLkZpbHRlclBhdHRlcm4uYWxsVGVybXMoXCJFUlJPUlwiLCBcIk1haW5UaHJlYWRcIilcbiAgICAgICAgZmlsdGVyUGF0dGVybjogbG9ncy5GaWx0ZXJQYXR0ZXJuLmFsbEV2ZW50cygpLFxuICAgICAgfSk7XG5cblxuICAgICBjcmVhdGVPbmVMYW1iZGEuYWRkUGVybWlzc2lvbihcbiAgICAgIGlkPSdteWxhbWJkYWZ1bmN0aW9uLWludm9rZScsIHtcbiAgICAgICAgcHJpbmNpcGFsOiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2xvZ3MuZXUtd2VzdC0yLmFtYXpvbmF3cy5jb20nKSxcbiAgICAgICAgYWN0aW9uOiAnbGFtYmRhOkludm9rZUZ1bmN0aW9uJyxcbiAgICAgICAgc291cmNlQXJuOiBsb2dHcm91cC5sb2dHcm91cEFyblxuICAgICAgfSlcblxuICAgICBsb2dHcm91cC5ncmFudFdyaXRlKGNyZWF0ZU9uZUxhbWJkYSk7XG5cbiAgICAvLyBjb25zdCBjaGVja0pvYkFjdGl2aXR5ID0gbmV3IHNmbi5BY3Rpdml0eSh0aGlzLCAnQ2hlY2tKb2InKTtcblxuICAgIGNvbnN0IGNoZWNrQ3JlYXRpb25BbGxvd2FuY2UgPSBuZXcgc2ZuLlRhc2sodGhpcywgJ0NoZWNrIENyZWF0aW9uIEFsbG93YW5jZScsIHtcbiAgICAgIHRhc2s6IG5ldyBzZm5fdGFza3MuSW52b2tlRnVuY3Rpb24oY2hlY2tDcmVhdGlvbkFsbG93YW5jZUxhbWJkYSksXG4gICAgfSk7XG5cbiAgICBjb25zdCBjcmVhdGVPbmUgPSBuZXcgc2ZuLlRhc2sodGhpcywgJ0NyZWF0ZSBJdGVtJywge1xuICAgICAgdGFzazogbmV3IHNmbl90YXNrcy5JbnZva2VGdW5jdGlvbihjcmVhdGVPbmVMYW1iZGEpLFxuICAgICAgaW5wdXRQYXRoOiAnJC5pdGVtJ1xuICAgIH0pO1xuICAgIGNvbnN0IHdhaXRYID0gbmV3IHNmbi5XYWl0KHRoaXMsICdXYWl0IFggU2Vjb25kcycsIHtcbiAgICAgIHRpbWU6IHNmbi5XYWl0VGltZS5kdXJhdGlvbihjZGsuRHVyYXRpb24uc2Vjb25kcyg1KSksXG4gICAgfSk7XG4gICAgLy8gY29uc3QgZ2V0U3RhdHVzID0gbmV3IHNmbi5UYXNrKHRoaXMsICdHZXQgSm9iIFN0YXR1cycsIHtcbiAgICAvLyAgIHRhc2s6IG5ldyBzZm5fdGFza3MuSW52b2tlQWN0aXZpdHkoY2hlY2tKb2JBY3Rpdml0eSksXG4gICAgLy8gICBpbnB1dFBhdGg6ICckLmd1aWQnLFxuICAgIC8vICAgcmVzdWx0UGF0aDogJyQuc3RhdHVzJyxcbiAgICAvLyB9KTtcbiAgICBjb25zdCBpc0FsbG93ZWQgPSBuZXcgc2ZuLkNob2ljZSh0aGlzLCAnQ3JlYXRpb24gQWxsb3dlZD8nKTtcbiAgICBjb25zdCBub3RBbGxvd2VkID0gbmV3IHNmbi5GYWlsKHRoaXMsICdOb3QgQWxsb3dlZCcsIHtcbiAgICAgIGNhdXNlOiAnQ3JlYXRpb24gZmFpbGVkJyxcbiAgICAgIGVycm9yOiAnSm9iIHJldHVybmVkIGZhaWxlZCcsXG4gICAgfSk7XG4gICAgLy8gY29uc3QgZmluYWxTdGF0dXMgPSBuZXcgc2ZuLlRhc2sodGhpcywgJ0dldCBGaW5hbCBKb2IgU3RhdHVzJywge1xuICAgIC8vICAgdGFzazogbmV3IHNmbl90YXNrcy5JbnZva2VBY3Rpdml0eShjaGVja0pvYkFjdGl2aXR5KSxcbiAgICAvLyAgIGlucHV0UGF0aDogJyQuZ3VpZCcsXG4gICAgLy8gfSk7XG5cbiAgICBjb25zdCBjaGFpbiA9IHNmbi5DaGFpbi5zdGFydChjaGVja0NyZWF0aW9uQWxsb3dhbmNlKVxuICAgICAgLm5leHQoaXNBbGxvd2VkXG4gICAgICAud2hlbihzZm4uQ29uZGl0aW9uLnN0cmluZ0VxdWFscygnJC5yZXN1bHQnLCAnZmFpbGVkJyksIG5vdEFsbG93ZWQpXG4gICAgICAud2hlbihzZm4uQ29uZGl0aW9uLnN0cmluZ0VxdWFscygnJC5yZXN1bHQnLCAnb2snKSwgY3JlYXRlT25lKVxuICAgICAgLm90aGVyd2lzZSh3YWl0WCkgKTtcbiAgICAvLyAubmV4dChnZXRTdGF0dXMpXG4gICAgLy8gLm5leHQoXG4gICAgLy8gICBpc0NvbXBsZXRlXG4gICAgLy8gICAgIC53aGVuKHNmbi5Db25kaXRpb24uc3RyaW5nRXF1YWxzKCckLnN0YXR1cycsICdGQUlMRUQnKSwgam9iRmFpbGVkKVxuICAgIC8vICAgICAud2hlbihzZm4uQ29uZGl0aW9uLnN0cmluZ0VxdWFscygnJC5zdGF0dXMnLCAnU1VDQ0VFREVEJyksIGZpbmFsU3RhdHVzKVxuICAgIC8vICAgICAub3RoZXJ3aXNlKHdhaXRYKSxcbiAgICAvLyApO1xuXG4gICAgY29uc3QgY3JlYXRlU3RhdGVNYWNoaW5lID0gbmV3IHNmbi5TdGF0ZU1hY2hpbmUodGhpcywgJ0NyZWF0ZVN0YXRlTWFjaGluZScsIHtcbiAgICAgIGRlZmluaXRpb246IGNoYWluLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pO1xuXG4gICAgY29uc3QgY3JlYXRlT25lQXBpID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnY3JlYXRlSXRlbUZ1bmN0aW9uQXBpJywge1xuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ2NyZWF0ZS1hcGkuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFNUQVRFX01BQ0hJTkVfQVJOOiBjcmVhdGVTdGF0ZU1hY2hpbmUuc3RhdGVNYWNoaW5lQXJuLFxuICAgICAgICBTT1JUX0tFWTogaW5zdGFuY2VUYWJsZS5zb3J0S2V5XG4gICAgICB9LFxuICAgICAgLy8gZnVuY3Rpb25OYW1lOiAnY3JlYXRlSXRlbUZ1bmN0aW9uQXBpJ1xuICAgIH0pO1xuXG4gICAgY3JlYXRlU3RhdGVNYWNoaW5lLmdyYW50U3RhcnRFeGVjdXRpb24oY3JlYXRlT25lQXBpKTtcblxuICAgIC8vIGNvbnN0IHZhbCA9IG5ldyBhcGlnYXRld2F5LlJlcXVlc3RWYWxpZGF0b3IodGhpcywgJ0RlZmF1bHRWYWxpZGF0b3InLCB7XG4gICAgLy8gICByZXN0QXBpOiBhcGksXG4gICAgLy8gICB2YWxpZGF0ZVJlcXVlc3RCb2R5OiB0cnVlLFxuICAgIC8vICAgdmFsaWRhdGVSZXF1ZXN0UGFyYW1ldGVyczogdHJ1ZVxuICAgIC8vIH0pXG5cbiAgICAvLyBjb25zdCB2YWxpZGF0b3IgPSBhcGkuYWRkUmVxdWVzdFZhbGlkYXRvcignRGVmYXVsdFZhbGlkYXRvcicsIHtcbiAgICAvLyAgIHZhbGlkYXRlUmVxdWVzdEJvZHk6IHRydWUsXG4gICAgLy8gICB2YWxpZGF0ZVJlcXVlc3RQYXJhbWV0ZXJzOiB0cnVlXG4gICAgLy8gfSwgYXBpKTtcblxuICAgIGNvbnN0IGNyZWF0ZU9uZUludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY3JlYXRlT25lQXBpKTtcblxuICAgIGl0ZW1zLmFkZE1ldGhvZCgnUE9TVCcsIGNyZWF0ZU9uZUludGVncmF0aW9uKTtcbiAgICBhZGRDb3JzT3B0aW9ucyhpdGVtcyk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVGFibGVOYW1lJywge1xuICAgICAgdmFsdWU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZVxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1Jlc3RBcGlFbmRQb2ludCcsIHtcbiAgICAgIHZhbHVlOiBhcGkudXJsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUmVzdEFwaUlkJywge1xuICAgICAgdmFsdWU6IGFwaS5yZXN0QXBpSWRcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdMb2dHcm91cE5hbWUnLCB7XG4gICAgICB2YWx1ZTogbG9nR3JvdXAubG9nR3JvdXBOYW1lXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTG9nR3JvdXBTdHJlYW1OYW1lJywge1xuICAgICAgdmFsdWU6IGxnc3RyZWFtLmxvZ1N0cmVhbU5hbWVcbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYWRkQ29yc09wdGlvbnMoYXBpUmVzb3VyY2U6IGFwaWdhdGV3YXkuSVJlc291cmNlKSB7XG4gIGFwaVJlc291cmNlLmFkZE1ldGhvZChcbiAgICAnT1BUSU9OUycsXG4gICAgbmV3IGFwaWdhdGV3YXkuTW9ja0ludGVncmF0aW9uKHtcbiAgICAgIGludGVncmF0aW9uUmVzcG9uc2VzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcbiAgICAgICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOlxuICAgICAgICAgICAgICBcIidDb250ZW50LVR5cGUsWC1BbXotRGF0ZSxBdXRob3JpemF0aW9uLFgtQXBpLUtleSxYLUFtei1TZWN1cml0eS1Ub2tlbixYLUFtei1Vc2VyLUFnZW50J1wiLFxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogXCInKidcIixcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUNyZWRlbnRpYWxzJzogXCInZmFsc2UnXCIsXG4gICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogXCInT1BUSU9OUyxHRVQsUFVULFBPU1QsREVMRVRFJ1wiLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgcGFzc3Rocm91Z2hCZWhhdmlvcjogYXBpZ2F0ZXdheS5QYXNzdGhyb3VnaEJlaGF2aW9yLk5FVkVSLFxuICAgICAgcmVxdWVzdFRlbXBsYXRlczoge1xuICAgICAgICAnYXBwbGljYXRpb24vanNvbic6ICd7XCJzdGF0dXNDb2RlXCI6IDIwMH0nLFxuICAgICAgfSxcbiAgICB9KSxcbiAgICB7XG4gICAgICBtZXRob2RSZXNwb25zZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxuICAgICAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6IHRydWUsXG4gICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogdHJ1ZSxcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUNyZWRlbnRpYWxzJzogdHJ1ZSxcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IHRydWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSxcbiAgKTtcbn1cblxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcbm5ldyBBcGlMYW1iZGFDcnVkRHluYW1vREJTdGFjayhhcHAsICdBcGlMYW1iZGFDcnVkRHluYW1vREJFeGFtcGxlJyk7XG5hcHAuc3ludGgoKTtcbiJdfQ==