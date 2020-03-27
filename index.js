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
                SORT_KEY: instanceTable.sortKey,
            },
        });
        const getAllLambda = new lambda.Function(this, 'getAllItemsFunction', {
            code: new lambda.AssetCode('src'),
            handler: 'get-all.handler',
            runtime: lambda.Runtime.NODEJS_10_X,
            environment: {
                TABLE_NAME: dynamoTable.tableName,
                PRIMARY_KEY: instanceTable.primaryKey,
            },
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHNEQUF1RDtBQUN2RCxrREFBbUQ7QUFDbkQsOENBQStDO0FBQy9DLHFDQUFzQztBQUN0QyxrREFBbUQ7QUFDbkQsOERBQStEO0FBQy9ELGlEQUFpRDtBQUNqRCwwQ0FBMkM7QUFDM0Msd0NBQXlDO0FBQ3pDLDBFQUFtRTtBQUNuRSwrQkFBNEI7QUFFNUIsTUFBTSxhQUFhLEdBQUcsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBQyxDQUFDO0FBQ2pHLE1BQU0sV0FBVyxHQUFHLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFDLENBQUE7QUFFakUsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLElBQUksTUFBTSxDQUFBO0FBRXZELE1BQWEsMEJBQTJCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDdkQsWUFBWSxHQUFZLEVBQUUsRUFBVTtRQUNsQyxLQUFLLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWYsTUFBTSxXQUFXLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsSUFBSSxFQUFFO1lBQy9ELFlBQVksRUFBRTtnQkFDWixJQUFJLEVBQUUsYUFBYSxDQUFDLFVBQVU7Z0JBQzlCLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU07YUFDcEM7WUFDRCxPQUFPLEVBQUU7Z0JBQ1AsSUFBSSxFQUFFLGFBQWEsQ0FBQyxPQUFPO2dCQUMzQixJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNO2FBQ3BDO1lBQ0QsU0FBUyxFQUFFLGFBQWEsQ0FBQyxJQUFJO1lBQzdCLGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87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QUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQzFCLElBQUksMEJBQTBCLENBQUMsR0FBRyxFQUFFLDhCQUE4QixDQUFDLENBQUM7QUFDcEUsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGFwaWdhdGV3YXkgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtYXBpZ2F0ZXdheScpO1xuaW1wb3J0IGR5bmFtb2RiID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWR5bmFtb2RiJyk7XG5pbXBvcnQgbGFtYmRhID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWxhbWJkYScpO1xuaW1wb3J0IGNkayA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2NvcmUnKTtcbmltcG9ydCBzZm4gPSByZXF1aXJlKCdAYXdzLWNkay9hd3Mtc3RlcGZ1bmN0aW9ucycpO1xuaW1wb3J0IHNmbl90YXNrcyA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1zdGVwZnVuY3Rpb25zLXRhc2tzJyk7XG5pbXBvcnQgYXNzZXRzID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLXMzLWFzc2V0cycpXG5pbXBvcnQgbG9ncyA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1sb2dzJyk7XG5pbXBvcnQgaWFtID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWlhbScpO1xuaW1wb3J0IHsgTGFtYmRhRGVzdGluYXRpb24gfSBmcm9tICdAYXdzLWNkay9hd3MtbG9ncy1kZXN0aW5hdGlvbnMnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xuXG5jb25zdCBpbnN0YW5jZVRhYmxlID0geyBuYW1lOiAnYWxmSW5zdGFuY2VzJywgcHJpbWFyeUtleTogJ2FsZlVzZXJJZCcsIHNvcnRLZXk6ICdhbGZJbnN0YW5jZUlkJ307XG5jb25zdCBzdGF0aWNUYWJsZSA9IHsgbmFtZTogJ3N0YXRpY0l0ZW1zJywgcHJpbWFyeUtleTogJ2l0ZW1zSWQnfVxuXG5jb25zdCBXSVRIX1NXQUdHRVIgPSBwcm9jZXNzLmVudi5XSVRIX1NXQUdHRVIgfHwgJ3RydWUnXG5cbmV4cG9ydCBjbGFzcyBBcGlMYW1iZGFDcnVkRHluYW1vREJTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKGFwcDogY2RrLkFwcCwgaWQ6IHN0cmluZykge1xuICAgIHN1cGVyKGFwcCwgaWQpO1xuXG4gICAgY29uc3QgZHluYW1vVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgaW5zdGFuY2VUYWJsZS5uYW1lLCB7XG4gICAgICBwYXJ0aXRpb25LZXk6IHtcbiAgICAgICAgbmFtZTogaW5zdGFuY2VUYWJsZS5wcmltYXJ5S2V5LFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklOR1xuICAgICAgfSxcbiAgICAgIHNvcnRLZXk6IHtcbiAgICAgICAgbmFtZTogaW5zdGFuY2VUYWJsZS5zb3J0S2V5LFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklOR1xuICAgICAgfSxcbiAgICAgIHRhYmxlTmFtZTogaW5zdGFuY2VUYWJsZS5uYW1lLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gTk9UIHJlY29tbWVuZGVkIGZvciBwcm9kdWN0aW9uIGNvZGVcbiAgICB9KTtcblxuICAgIGNvbnN0IGR5bmFtb1RhYmxlU3RhdGljID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsIHN0YXRpY1RhYmxlLm5hbWUsIHtcbiAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICBuYW1lOiBzdGF0aWNUYWJsZS5wcmltYXJ5S2V5LFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcbiAgICAgIH0sXG4gICAgICB0YWJsZU5hbWU6IHN0YXRpY1RhYmxlLm5hbWUsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAvLyBOT1QgcmVjb21tZW5kZWQgZm9yIHByb2R1Y3Rpb24gY29kZVxuICAgIH0pO1xuXG4gICAgY29uc3QgZ2V0T25lTGFtYmRhID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnZ2V0T25lSXRlbUZ1bmN0aW9uJywge1xuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ2dldC1vbmUuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRBQkxFX05BTUU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgU09SVF9LRVk6IGluc3RhbmNlVGFibGUuc29ydEtleSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBnZXRBbGxMYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdnZXRBbGxJdGVtc0Z1bmN0aW9uJywge1xuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ2dldC1hbGwuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRBQkxFX05BTUU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUFJJTUFSWV9LRVk6IGluc3RhbmNlVGFibGUucHJpbWFyeUtleSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCB1cGRhdGVPbmUgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICd1cGRhdGVJdGVtRnVuY3Rpb24nLCB7XG4gICAgICBjb2RlOiBuZXcgbGFtYmRhLkFzc2V0Q29kZSgnc3JjJyksXG4gICAgICBoYW5kbGVyOiAndXBkYXRlLW9uZS5oYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVEFCTEVfTkFNRTogZHluYW1vVGFibGUudGFibGVOYW1lLFxuICAgICAgICBQUklNQVJZX0tFWTogaW5zdGFuY2VUYWJsZS5wcmltYXJ5S2V5LFxuICAgICAgICBTT1JUX0tFWTogaW5zdGFuY2VUYWJsZS5zb3J0S2V5XG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgZGVsZXRlT25lID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnZGVsZXRlSXRlbUZ1bmN0aW9uJywge1xuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ2RlbGV0ZS1vbmUuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRBQkxFX05BTUU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUFJJTUFSWV9LRVk6IGluc3RhbmNlVGFibGUucHJpbWFyeUtleSxcbiAgICAgICAgU09SVF9LRVk6IGluc3RhbmNlVGFibGUuc29ydEtleVxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGNyZWF0ZU9uZUxhbWJkYSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ2NyZWF0ZUl0ZW1GdW5jdGlvbicsIHtcbiAgICAgIGNvZGU6IG5ldyBsYW1iZGEuQXNzZXRDb2RlKCdzcmMnKSxcbiAgICAgIGhhbmRsZXI6ICdjcmVhdGUuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRBQkxFX05BTUU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUFJJTUFSWV9LRVk6IGluc3RhbmNlVGFibGUucHJpbWFyeUtleSxcbiAgICAgICAgU09SVF9LRVk6IGluc3RhbmNlVGFibGUuc29ydEtleVxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGR5bmFtb1RhYmxlLmdyYW50RnVsbEFjY2VzcyhnZXRBbGxMYW1iZGEpO1xuICAgIGR5bmFtb1RhYmxlLmdyYW50RnVsbEFjY2VzcyhnZXRPbmVMYW1iZGEpO1xuICAgIGR5bmFtb1RhYmxlLmdyYW50RnVsbEFjY2VzcyhjcmVhdGVPbmVMYW1iZGEpO1xuICAgIGR5bmFtb1RhYmxlLmdyYW50RnVsbEFjY2Vzcyh1cGRhdGVPbmUpO1xuICAgIGR5bmFtb1RhYmxlLmdyYW50RnVsbEFjY2VzcyhkZWxldGVPbmUpO1xuXG4gICAgLy8gY29uc3Qgc3dhZ2dlciA9IG5ldyBjZGsuQ2ZuSW5jbHVkZSh0aGlzLCBcIkV4aXN0aW5nSW5mcmFzdHJ1Y3R1cmVcIiwge1xuICAgIC8vICAgdGVtcGxhdGU6IHlhbWwuc2FmZUxvYWQoZnMucmVhZEZpbGVTeW5jKFwiLi9teS1idWNrZXQueWFtbFwiKS50b1N0cmluZygpKVxuICAgIC8vIH0pO1xuXG4gICAgY29uc3QgYXBpID0gbmV3IGFwaWdhdGV3YXkuUmVzdEFwaSh0aGlzLCAnaXRlbXNBcGknLCB7XG4gICAgICByZXN0QXBpTmFtZTogJ0l0ZW1zIFNlcnZpY2UnLFxuICAgICAgZGVzY3JpcHRpb246ICdCbHViJyxcbiAgICAgIC8vIGRlcGxveU9wdGlvbnM6IHtcbiAgICAgIC8vICAgbG9nZ2luZ0xldmVsOiBhcGlnYXRld2F5Lk1ldGhvZExvZ2dpbmdMZXZlbC5JTkZPLFxuICAgICAgLy8gICBkYXRhVHJhY2VFbmFibGVkOiB0cnVlXG4gICAgICAvLyB9XG4gICAgfSk7XG5cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgY29uc3QgY2ZuQXBpID0gYXBpLm5vZGUuZGVmYXVsdENoaWxkIGFzIGFwaWdhdGV3YXkuQ2ZuUmVzdEFwaTtcblxuICAgIC8vIFVwbG9hZCBTd2FnZ2VyIHRvIFMzXG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIGNvbnN0IGZpbGVBc3NldCA9IG5ldyBhc3NldHMuQXNzZXQodGhpcywgJ1N3YWdnZXJBc3NldCcsIHtcbiAgICAgIHBhdGg6IGpvaW4oX19kaXJuYW1lLCAndG1wL3N3YWdnZXJfZnVsbC55YW1sJylcbiAgICB9KTtcblxuICAgIGlmKFdJVEhfU1dBR0dFUiAhPT0gJ2ZhbHNlJyl7XG4gICAgICBjZm5BcGkuYm9keVMzTG9jYXRpb24gPSB7IGJ1Y2tldDogZmlsZUFzc2V0LmJ1Y2tldC5idWNrZXROYW1lLCBrZXk6IGZpbGVBc3NldC5zM09iamVjdEtleSB9O1xuICAgIH1cblxuICAgIGNvbnN0IGl0ZW1zID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2l0ZW1zJyk7XG4gICAgY29uc3QgZ2V0QWxsSW50ZWdyYXRpb24gPSBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihnZXRBbGxMYW1iZGEpO1xuICAgIGl0ZW1zLmFkZE1ldGhvZCgnR0VUJywgZ2V0QWxsSW50ZWdyYXRpb24pO1xuXG4gICAgY29uc3Qgc2luZ2xlSXRlbSA9IGl0ZW1zLmFkZFJlc291cmNlKGB7JHtpbnN0YW5jZVRhYmxlLnNvcnRLZXl9fWApO1xuICAgIGNvbnN0IGdldE9uZUludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ2V0T25lTGFtYmRhKTtcbiAgICBzaW5nbGVJdGVtLmFkZE1ldGhvZCgnR0VUJywgZ2V0T25lSW50ZWdyYXRpb24pO1xuXG4gICAgY29uc3QgdXBkYXRlT25lSW50ZWdyYXRpb24gPSBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih1cGRhdGVPbmUpO1xuICAgIHNpbmdsZUl0ZW0uYWRkTWV0aG9kKCdQQVRDSCcsIHVwZGF0ZU9uZUludGVncmF0aW9uKTtcblxuICAgIGNvbnN0IGRlbGV0ZU9uZUludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZGVsZXRlT25lKTtcbiAgICBzaW5nbGVJdGVtLmFkZE1ldGhvZCgnREVMRVRFJywgZGVsZXRlT25lSW50ZWdyYXRpb24pO1xuICAgIGFkZENvcnNPcHRpb25zKHNpbmdsZUl0ZW0pO1xuXG4gICAgY29uc3QgY2hlY2tDcmVhdGlvbkFsbG93YW5jZUxhbWJkYSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ2NoZWNrQ3JlYXRpb25BbGxvd2FuY2VMYW1iZGEnLCB7XG4gICAgICBjb2RlOiBuZXcgbGFtYmRhLkFzc2V0Q29kZSgnc3JjJyksXG4gICAgICBoYW5kbGVyOiAnY2hlY2stY3JlYXRpb24tYWxsb3dhbmNlLmhhbmRsZXInLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEwX1gsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBUQUJMRV9OQU1FOiBkeW5hbW9UYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFRBQkxFX1NUQVRJQ19OQU1FOiBkeW5hbW9UYWJsZVN0YXRpYy50YWJsZU5hbWUsXG4gICAgICAgIFBSSU1BUllfS0VZOiBpbnN0YW5jZVRhYmxlLnByaW1hcnlLZXksXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgZHluYW1vVGFibGUuZ3JhbnRGdWxsQWNjZXNzKGNoZWNrQ3JlYXRpb25BbGxvd2FuY2VMYW1iZGEpO1xuXG4gICAgLy8gQ29uZmlndXJlIGxvZyBncm91cCBmb3Igc2hvcnQgcmV0ZW50aW9uXG4gICAgY29uc3QgbG9nR3JvdXAgPSBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnTG9nR3JvdXAnLCB7XG4gICAgICByZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfREFZLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGxvZ0dyb3VwTmFtZTogJy9hd3MvbGFtYmRhL2N1c3RvbS8nICsgdGhpcy5zdGFja05hbWVcbiAgICB9KTtcblxuICAgIGNvbnN0IGxnc3RyZWFtID0gbG9nR3JvdXAuYWRkU3RyZWFtKCdteWxvZ2dyb3VwU3RyZWFtJywge2xvZ1N0cmVhbU5hbWUgOiAnbXlsb2dncm91cFN0cmVhbSd9KVxuXG4gICAgbG9nR3JvdXAuYWRkU3Vic2NyaXB0aW9uRmlsdGVyKGlkPSdteWxvZ2dyb3VwX3N1YnMxJywge1xuICAgICAgICBkZXN0aW5hdGlvbjogbmV3IExhbWJkYURlc3RpbmF0aW9uKGNyZWF0ZU9uZUxhbWJkYSksXG4gICAgICAgIC8vIGZpbHRlclBhdHRlcm46IGxvZ3NEZXN0aW5hdGlvbnMuRmlsdGVyUGF0dGVybi5hbGxUZXJtcyhcIkVSUk9SXCIsIFwiTWFpblRocmVhZFwiKVxuICAgICAgICBmaWx0ZXJQYXR0ZXJuOiBsb2dzLkZpbHRlclBhdHRlcm4uYWxsRXZlbnRzKCksXG4gICAgICB9KTtcblxuXG4gICAgIGNyZWF0ZU9uZUxhbWJkYS5hZGRQZXJtaXNzaW9uKFxuICAgICAgaWQ9J215bGFtYmRhZnVuY3Rpb24taW52b2tlJywge1xuICAgICAgICBwcmluY2lwYWw6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnbG9ncy5ldS13ZXN0LTIuYW1hem9uYXdzLmNvbScpLFxuICAgICAgICBhY3Rpb246ICdsYW1iZGE6SW52b2tlRnVuY3Rpb24nLFxuICAgICAgICBzb3VyY2VBcm46IGxvZ0dyb3VwLmxvZ0dyb3VwQXJuXG4gICAgICB9KVxuXG4gICAgIGxvZ0dyb3VwLmdyYW50V3JpdGUoY3JlYXRlT25lTGFtYmRhKTtcblxuICAgIC8vIGNvbnN0IGNoZWNrSm9iQWN0aXZpdHkgPSBuZXcgc2ZuLkFjdGl2aXR5KHRoaXMsICdDaGVja0pvYicpO1xuXG4gICAgY29uc3QgY2hlY2tDcmVhdGlvbkFsbG93YW5jZSA9IG5ldyBzZm4uVGFzayh0aGlzLCAnQ2hlY2sgQ3JlYXRpb24gQWxsb3dhbmNlJywge1xuICAgICAgdGFzazogbmV3IHNmbl90YXNrcy5JbnZva2VGdW5jdGlvbihjaGVja0NyZWF0aW9uQWxsb3dhbmNlTGFtYmRhKSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGNyZWF0ZU9uZSA9IG5ldyBzZm4uVGFzayh0aGlzLCAnQ3JlYXRlIEl0ZW0nLCB7XG4gICAgICB0YXNrOiBuZXcgc2ZuX3Rhc2tzLkludm9rZUZ1bmN0aW9uKGNyZWF0ZU9uZUxhbWJkYSksXG4gICAgICBpbnB1dFBhdGg6ICckLml0ZW0nXG4gICAgfSk7XG4gICAgY29uc3Qgd2FpdFggPSBuZXcgc2ZuLldhaXQodGhpcywgJ1dhaXQgWCBTZWNvbmRzJywge1xuICAgICAgdGltZTogc2ZuLldhaXRUaW1lLmR1cmF0aW9uKGNkay5EdXJhdGlvbi5zZWNvbmRzKDUpKSxcbiAgICB9KTtcbiAgICAvLyBjb25zdCBnZXRTdGF0dXMgPSBuZXcgc2ZuLlRhc2sodGhpcywgJ0dldCBKb2IgU3RhdHVzJywge1xuICAgIC8vICAgdGFzazogbmV3IHNmbl90YXNrcy5JbnZva2VBY3Rpdml0eShjaGVja0pvYkFjdGl2aXR5KSxcbiAgICAvLyAgIGlucHV0UGF0aDogJyQuZ3VpZCcsXG4gICAgLy8gICByZXN1bHRQYXRoOiAnJC5zdGF0dXMnLFxuICAgIC8vIH0pO1xuICAgIGNvbnN0IGlzQWxsb3dlZCA9IG5ldyBzZm4uQ2hvaWNlKHRoaXMsICdDcmVhdGlvbiBBbGxvd2VkPycpO1xuICAgIGNvbnN0IG5vdEFsbG93ZWQgPSBuZXcgc2ZuLkZhaWwodGhpcywgJ05vdCBBbGxvd2VkJywge1xuICAgICAgY2F1c2U6ICdDcmVhdGlvbiBmYWlsZWQnLFxuICAgICAgZXJyb3I6ICdKb2IgcmV0dXJuZWQgZmFpbGVkJyxcbiAgICB9KTtcbiAgICAvLyBjb25zdCBmaW5hbFN0YXR1cyA9IG5ldyBzZm4uVGFzayh0aGlzLCAnR2V0IEZpbmFsIEpvYiBTdGF0dXMnLCB7XG4gICAgLy8gICB0YXNrOiBuZXcgc2ZuX3Rhc2tzLkludm9rZUFjdGl2aXR5KGNoZWNrSm9iQWN0aXZpdHkpLFxuICAgIC8vICAgaW5wdXRQYXRoOiAnJC5ndWlkJyxcbiAgICAvLyB9KTtcblxuICAgIGNvbnN0IGNoYWluID0gc2ZuLkNoYWluLnN0YXJ0KGNoZWNrQ3JlYXRpb25BbGxvd2FuY2UpXG4gICAgICAubmV4dChpc0FsbG93ZWRcbiAgICAgIC53aGVuKHNmbi5Db25kaXRpb24uc3RyaW5nRXF1YWxzKCckLnJlc3VsdCcsICdmYWlsZWQnKSwgbm90QWxsb3dlZClcbiAgICAgIC53aGVuKHNmbi5Db25kaXRpb24uc3RyaW5nRXF1YWxzKCckLnJlc3VsdCcsICdvaycpLCBjcmVhdGVPbmUpXG4gICAgICAub3RoZXJ3aXNlKHdhaXRYKSApO1xuICAgIC8vIC5uZXh0KGdldFN0YXR1cylcbiAgICAvLyAubmV4dChcbiAgICAvLyAgIGlzQ29tcGxldGVcbiAgICAvLyAgICAgLndoZW4oc2ZuLkNvbmRpdGlvbi5zdHJpbmdFcXVhbHMoJyQuc3RhdHVzJywgJ0ZBSUxFRCcpLCBqb2JGYWlsZWQpXG4gICAgLy8gICAgIC53aGVuKHNmbi5Db25kaXRpb24uc3RyaW5nRXF1YWxzKCckLnN0YXR1cycsICdTVUNDRUVERUQnKSwgZmluYWxTdGF0dXMpXG4gICAgLy8gICAgIC5vdGhlcndpc2Uod2FpdFgpLFxuICAgIC8vICk7XG5cbiAgICBjb25zdCBjcmVhdGVTdGF0ZU1hY2hpbmUgPSBuZXcgc2ZuLlN0YXRlTWFjaGluZSh0aGlzLCAnQ3JlYXRlU3RhdGVNYWNoaW5lJywge1xuICAgICAgZGVmaW5pdGlvbjogY2hhaW4sXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSk7XG5cbiAgICBjb25zdCBjcmVhdGVPbmVBcGkgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdjcmVhdGVJdGVtRnVuY3Rpb25BcGknLCB7XG4gICAgICBjb2RlOiBuZXcgbGFtYmRhLkFzc2V0Q29kZSgnc3JjJyksXG4gICAgICBoYW5kbGVyOiAnY3JlYXRlLWFwaS5oYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgU1RBVEVfTUFDSElORV9BUk46IGNyZWF0ZVN0YXRlTWFjaGluZS5zdGF0ZU1hY2hpbmVBcm4sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgY3JlYXRlU3RhdGVNYWNoaW5lLmdyYW50U3RhcnRFeGVjdXRpb24oY3JlYXRlT25lQXBpKTtcblxuICAgIC8vIGNvbnN0IHZhbCA9IG5ldyBhcGlnYXRld2F5LlJlcXVlc3RWYWxpZGF0b3IodGhpcywgJ0RlZmF1bHRWYWxpZGF0b3InLCB7XG4gICAgLy8gICByZXN0QXBpOiBhcGksXG4gICAgLy8gICB2YWxpZGF0ZVJlcXVlc3RCb2R5OiB0cnVlLFxuICAgIC8vICAgdmFsaWRhdGVSZXF1ZXN0UGFyYW1ldGVyczogdHJ1ZVxuICAgIC8vIH0pXG5cbiAgICAvLyBjb25zdCB2YWxpZGF0b3IgPSBhcGkuYWRkUmVxdWVzdFZhbGlkYXRvcignRGVmYXVsdFZhbGlkYXRvcicsIHtcbiAgICAvLyAgIHZhbGlkYXRlUmVxdWVzdEJvZHk6IHRydWUsXG4gICAgLy8gICB2YWxpZGF0ZVJlcXVlc3RQYXJhbWV0ZXJzOiB0cnVlXG4gICAgLy8gfSwgYXBpKTtcblxuICAgIGNvbnN0IGNyZWF0ZU9uZUludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY3JlYXRlT25lQXBpKTtcblxuICAgIGl0ZW1zLmFkZE1ldGhvZCgnUE9TVCcsIGNyZWF0ZU9uZUludGVncmF0aW9uKTtcbiAgICBhZGRDb3JzT3B0aW9ucyhpdGVtcyk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVGFibGVOYW1lJywge1xuICAgICAgdmFsdWU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZVxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1Jlc3RBcGlFbmRQb2ludCcsIHtcbiAgICAgIHZhbHVlOiBhcGkudXJsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUmVzdEFwaUlkJywge1xuICAgICAgdmFsdWU6IGFwaS5yZXN0QXBpSWRcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdMb2dHcm91cE5hbWUnLCB7XG4gICAgICB2YWx1ZTogbG9nR3JvdXAubG9nR3JvdXBOYW1lXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTG9nR3JvdXBTdHJlYW1OYW1lJywge1xuICAgICAgdmFsdWU6IGxnc3RyZWFtLmxvZ1N0cmVhbU5hbWVcbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYWRkQ29yc09wdGlvbnMoYXBpUmVzb3VyY2U6IGFwaWdhdGV3YXkuSVJlc291cmNlKSB7XG4gIGFwaVJlc291cmNlLmFkZE1ldGhvZChcbiAgICAnT1BUSU9OUycsXG4gICAgbmV3IGFwaWdhdGV3YXkuTW9ja0ludGVncmF0aW9uKHtcbiAgICAgIGludGVncmF0aW9uUmVzcG9uc2VzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcbiAgICAgICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOlxuICAgICAgICAgICAgICBcIidDb250ZW50LVR5cGUsWC1BbXotRGF0ZSxBdXRob3JpemF0aW9uLFgtQXBpLUtleSxYLUFtei1TZWN1cml0eS1Ub2tlbixYLUFtei1Vc2VyLUFnZW50J1wiLFxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogXCInKidcIixcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUNyZWRlbnRpYWxzJzogXCInZmFsc2UnXCIsXG4gICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogXCInT1BUSU9OUyxHRVQsUFVULFBPU1QsREVMRVRFJ1wiLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgcGFzc3Rocm91Z2hCZWhhdmlvcjogYXBpZ2F0ZXdheS5QYXNzdGhyb3VnaEJlaGF2aW9yLk5FVkVSLFxuICAgICAgcmVxdWVzdFRlbXBsYXRlczoge1xuICAgICAgICAnYXBwbGljYXRpb24vanNvbic6ICd7XCJzdGF0dXNDb2RlXCI6IDIwMH0nLFxuICAgICAgfSxcbiAgICB9KSxcbiAgICB7XG4gICAgICBtZXRob2RSZXNwb25zZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxuICAgICAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6IHRydWUsXG4gICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogdHJ1ZSxcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUNyZWRlbnRpYWxzJzogdHJ1ZSxcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IHRydWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSxcbiAgKTtcbn1cblxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcbm5ldyBBcGlMYW1iZGFDcnVkRHluYW1vREJTdGFjayhhcHAsICdBcGlMYW1iZGFDcnVkRHluYW1vREJFeGFtcGxlJyk7XG5hcHAuc3ludGgoKTtcbiJdfQ==