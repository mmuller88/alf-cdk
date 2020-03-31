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
// import ec2 = require('@aws-cdk/aws-ec2');
// import { LambdaDestination } from '@aws-cdk/aws-logs-destinations';
const path_1 = require("path");
const aws_iam_1 = require("@aws-cdk/aws-iam");
const instanceTable = { name: 'alfInstances', primaryKey: 'alfUserId', sortKey: 'alfInstanceId' };
const staticTable = { name: 'staticItems', primaryKey: 'itemsId' };
const WITH_SWAGGER = process.env.WITH_SWAGGER || 'true';
const CI_USER_TOKEN = process.env.CI_USER_TOKEN || '';
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
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        });
        role.addToPolicy(new aws_iam_1.PolicyStatement({
            resources: ['*'],
            actions: ['ec2:*', 'cloudwatch:*']
        }));
        const getAllInstancesLambda = new lambda.Function(this, 'getAllInstancesFunction', {
            code: new lambda.AssetCode('src'),
            handler: 'get-all-instances.handler',
            runtime: lambda.Runtime.NODEJS_10_X,
            role: role,
            logRetention: logs.RetentionDays.ONE_DAY,
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
        const createOneLambda = new lambda.Function(this, 'createItemFunction', {
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
                CI_USER_TOKEN: CI_USER_TOKEN,
                SECURITY_GROUP: 'default',
                STACK_NAME: this.stackName
            },
            role: role,
            logRetention: logs.RetentionDays.ONE_DAY,
        });
        dynamoTable.grantFullAccess(getAllLambda);
        dynamoTable.grantFullAccess(getOneLambda);
        dynamoTable.grantFullAccess(createOneLambda);
        dynamoTable.grantFullAccess(updateOne);
        dynamoTable.grantFullAccess(deleteOne);
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
        const instances = api.root.addResource('instances');
        const getAllInstancesIntegration = new apigateway.LambdaIntegration(getAllInstancesLambda);
        instances.addMethod('GET', getAllInstancesIntegration);
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
            logRetention: logs.RetentionDays.ONE_DAY,
        });
        dynamoTable.grantFullAccess(checkCreationAllowanceLambda);
        // Configure log group for short retention
        const logGroup = new logs.LogGroup(this, 'LogGroup', {
            retention: logs.RetentionDays.ONE_DAY,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            logGroupName: '/aws/lambda/custom/' + this.stackName
        });
        const lgstream = logGroup.addStream('myloggroupStream');
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
        const createInstanceRequest = new sfn.Task(this, 'Create Instance Request', {
            task: new sfn_tasks.InvokeFunction(createOneLambda),
            inputPath: '$.item'
        });
        const createInstance = new sfn.Task(this, 'Create Instance', {
            task: new sfn_tasks.InvokeFunction(createInstanceLambda),
            inputPath: '$.item'
        });
        const createdInstanceUpdate = new sfn.Task(this, 'Created Instance Update', {
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
            .when(sfn.Condition.stringEquals('$.result', 'ok'), createInstanceRequest.next(createInstance.next(createdInstanceUpdate)))
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
            logRetention: logs.RetentionDays.ONE_DAY,
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
        new cdk.CfnOutput(this, 'LGGroupdCreateApi', {
            value: createOneApi.logGroup.logGroupName
        });
        new cdk.CfnOutput(this, 'LGGroupdCreate', {
            value: createOneLambda.logGroup.logGroupName
        });
        new cdk.CfnOutput(this, 'LGGroupdCreateInstance', {
            value: createInstanceLambda.logGroup.logGroupName
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHNEQUF1RDtBQUN2RCxrREFBbUQ7QUFDbkQsOENBQStDO0FBQy9DLHFDQUFzQztBQUN0QyxrREFBbUQ7QUFDbkQsOERBQStEO0FBQy9ELGlEQUFpRDtBQUNqRCwwQ0FBMkM7QUFDM0Msd0NBQXlDO0FBQ3pDLDRDQUE0QztBQUM1QyxzRUFBc0U7QUFDdEUsK0JBQTRCO0FBQzVCLDhDQUFtRDtBQUVuRCxNQUFNLGFBQWEsR0FBRyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFDLENBQUM7QUFDakcsTUFBTSxXQUFXLEdBQUcsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUMsQ0FBQTtBQUVqRSxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksSUFBSSxNQUFNLENBQUE7QUFDdkQsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLElBQUksRUFBRSxDQUFDO0FBRXRELE1BQWEsMEJBQTJCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDdkQsWUFBWSxHQUFZLEVBQUUsRUFBVTtRQUNsQyxLQUFLLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWYsTUFBTSxXQUFXLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsSUFBSSxFQUFFO1lBQy9ELFlBQVksRUFBRTtnQkFDWixJQUFJLEVBQUUsYUFBYSxDQUFDLFVBQVU7Z0JBQzlCLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU07YUFDcEM7WUFDRCxPQUFPLEVBQUU7Z0JBQ1AsSUFBSSxFQUFFLGFBQWEsQ0FBQyxPQUFPO2dCQUMzQixJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEs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QUUsSUFBSTtvQkFDM0QscURBQXFELEVBQUUsSUFBSTtvQkFDM0QseURBQXlELEVBQUUsSUFBSTtvQkFDL0Qsb0RBQW9ELEVBQUUsSUFBSTtpQkFDM0Q7YUFDRjtTQUNGO0tBQ0YsQ0FDRixDQUFDO0FBQ0osQ0FBQztBQW5DRCx3Q0FtQ0M7QUFFRCxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUMxQixJQUFJLDBCQUEwQixDQUFDLEdBQUcsRUFBRSw4QkFBOEIsQ0FBQyxDQUFDO0FBQ3BFLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBhcGlnYXRld2F5ID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWFwaWdhdGV3YXknKTtcbmltcG9ydCBkeW5hbW9kYiA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1keW5hbW9kYicpO1xuaW1wb3J0IGxhbWJkYSA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1sYW1iZGEnKTtcbmltcG9ydCBjZGsgPSByZXF1aXJlKCdAYXdzLWNkay9jb3JlJyk7XG5pbXBvcnQgc2ZuID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLXN0ZXBmdW5jdGlvbnMnKTtcbmltcG9ydCBzZm5fdGFza3MgPSByZXF1aXJlKCdAYXdzLWNkay9hd3Mtc3RlcGZ1bmN0aW9ucy10YXNrcycpO1xuaW1wb3J0IGFzc2V0cyA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1zMy1hc3NldHMnKVxuaW1wb3J0IGxvZ3MgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtbG9ncycpO1xuaW1wb3J0IGlhbSA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1pYW0nKTtcbi8vIGltcG9ydCBlYzIgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtZWMyJyk7XG4vLyBpbXBvcnQgeyBMYW1iZGFEZXN0aW5hdGlvbiB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1sb2dzLWRlc3RpbmF0aW9ucyc7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBQb2xpY3lTdGF0ZW1lbnQgfSBmcm9tICdAYXdzLWNkay9hd3MtaWFtJztcblxuY29uc3QgaW5zdGFuY2VUYWJsZSA9IHsgbmFtZTogJ2FsZkluc3RhbmNlcycsIHByaW1hcnlLZXk6ICdhbGZVc2VySWQnLCBzb3J0S2V5OiAnYWxmSW5zdGFuY2VJZCd9O1xuY29uc3Qgc3RhdGljVGFibGUgPSB7IG5hbWU6ICdzdGF0aWNJdGVtcycsIHByaW1hcnlLZXk6ICdpdGVtc0lkJ31cblxuY29uc3QgV0lUSF9TV0FHR0VSID0gcHJvY2Vzcy5lbnYuV0lUSF9TV0FHR0VSIHx8ICd0cnVlJ1xuY29uc3QgQ0lfVVNFUl9UT0tFTiA9IHByb2Nlc3MuZW52LkNJX1VTRVJfVE9LRU4gfHwgJyc7XG5cbmV4cG9ydCBjbGFzcyBBcGlMYW1iZGFDcnVkRHluYW1vREJTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKGFwcDogY2RrLkFwcCwgaWQ6IHN0cmluZykge1xuICAgIHN1cGVyKGFwcCwgaWQpO1xuXG4gICAgY29uc3QgZHluYW1vVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgaW5zdGFuY2VUYWJsZS5uYW1lLCB7XG4gICAgICBwYXJ0aXRpb25LZXk6IHtcbiAgICAgICAgbmFtZTogaW5zdGFuY2VUYWJsZS5wcmltYXJ5S2V5LFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklOR1xuICAgICAgfSxcbiAgICAgIHNvcnRLZXk6IHtcbiAgICAgICAgbmFtZTogaW5zdGFuY2VUYWJsZS5zb3J0S2V5LFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklOR1xuICAgICAgfSxcbiAgICAgIHRhYmxlTmFtZTogaW5zdGFuY2VUYWJsZS5uYW1lLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gTk9UIHJlY29tbWVuZGVkIGZvciBwcm9kdWN0aW9uIGNvZGVcbiAgICB9KTtcblxuICAgIGNvbnN0IGR5bmFtb1RhYmxlU3RhdGljID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsIHN0YXRpY1RhYmxlLm5hbWUsIHtcbiAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICBuYW1lOiBzdGF0aWNUYWJsZS5wcmltYXJ5S2V5LFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklOR1xuICAgICAgfSxcbiAgICAgIHRhYmxlTmFtZTogc3RhdGljVGFibGUubmFtZSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIE5PVCByZWNvbW1lbmRlZCBmb3IgcHJvZHVjdGlvbiBjb2RlXG4gICAgfSk7XG5cbiAgICBjb25zdCBnZXRPbmVMYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdnZXRPbmVJdGVtRnVuY3Rpb24nLCB7XG4gICAgICBjb2RlOiBuZXcgbGFtYmRhLkFzc2V0Q29kZSgnc3JjJyksXG4gICAgICBoYW5kbGVyOiAnZ2V0LW9uZS5oYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVEFCTEVfTkFNRTogZHluYW1vVGFibGUudGFibGVOYW1lLFxuICAgICAgICBQUklNQVJZX0tFWTogaW5zdGFuY2VUYWJsZS5wcmltYXJ5S2V5LFxuICAgICAgICBTT1JUX0tFWTogaW5zdGFuY2VUYWJsZS5zb3J0S2V5XG4gICAgICB9LFxuICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX0RBWSxcbiAgICAgIC8vIGZ1bmN0aW9uTmFtZTogJ2dldE9uZUl0ZW1GdW5jdGlvbicsXG4gICAgfSk7XG5cbiAgICBjb25zdCBnZXRBbGxMYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdnZXRBbGxJdGVtc0Z1bmN0aW9uJywge1xuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ2dldC1hbGwuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRBQkxFX05BTUU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUFJJTUFSWV9LRVk6IGluc3RhbmNlVGFibGUucHJpbWFyeUtleVxuICAgICAgfSxcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9EQVksXG4gICAgICAvLyBmdW5jdGlvbk5hbWU6ICdnZXRBbGxJdGVtc0Z1bmN0aW9uJ1xuICAgIH0pO1xuXG4gICAgY29uc3Qgcm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpLCAgIC8vIHJlcXVpcmVkXG4gICAgfSk7XG5cbiAgICByb2xlLmFkZFRvUG9saWN5KG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgcmVzb3VyY2VzOiBbJyonXSxcbiAgICAgIGFjdGlvbnM6IFsnZWMyOionLCAnY2xvdWR3YXRjaDoqJ10gfSkpO1xuXG4gICAgY29uc3QgZ2V0QWxsSW5zdGFuY2VzTGFtYmRhID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnZ2V0QWxsSW5zdGFuY2VzRnVuY3Rpb24nLCB7XG4gICAgICBjb2RlOiBuZXcgbGFtYmRhLkFzc2V0Q29kZSgnc3JjJyksXG4gICAgICBoYW5kbGVyOiAnZ2V0LWFsbC1pbnN0YW5jZXMuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIHJvbGU6IHJvbGUsXG4gICAgICBsb2dSZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfREFZLFxuICAgIH0pO1xuXG4gICAgY29uc3QgdXBkYXRlT25lID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAndXBkYXRlSXRlbUZ1bmN0aW9uJywge1xuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ3VwZGF0ZS1vbmUuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRBQkxFX05BTUU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUFJJTUFSWV9LRVk6IGluc3RhbmNlVGFibGUucHJpbWFyeUtleSxcbiAgICAgICAgU09SVF9LRVk6IGluc3RhbmNlVGFibGUuc29ydEtleVxuICAgICAgfSxcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9EQVksXG4gICAgICAvLyBmdW5jdGlvbk5hbWU6ICd1cGRhdGVJdGVtRnVuY3Rpb24nXG4gICAgfSk7XG5cbiAgICBjb25zdCBkZWxldGVPbmUgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdkZWxldGVJdGVtRnVuY3Rpb24nLCB7XG4gICAgICBjb2RlOiBuZXcgbGFtYmRhLkFzc2V0Q29kZSgnc3JjJyksXG4gICAgICBoYW5kbGVyOiAnZGVsZXRlLW9uZS5oYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVEFCTEVfTkFNRTogZHluYW1vVGFibGUudGFibGVOYW1lLFxuICAgICAgICBQUklNQVJZX0tFWTogaW5zdGFuY2VUYWJsZS5wcmltYXJ5S2V5LFxuICAgICAgICBTT1JUX0tFWTogaW5zdGFuY2VUYWJsZS5zb3J0S2V5XG4gICAgICB9LFxuICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX0RBWSxcbiAgICAgIC8vIGZ1bmN0aW9uTmFtZTogJ2RlbGV0ZUl0ZW1GdW5jdGlvbidcbiAgICB9KTtcblxuICAgIGNvbnN0IGNyZWF0ZU9uZUxhbWJkYSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ2NyZWF0ZUl0ZW1GdW5jdGlvbicsIHtcbiAgICAgIGNvZGU6IG5ldyBsYW1iZGEuQXNzZXRDb2RlKCdzcmMnKSxcbiAgICAgIGhhbmRsZXI6ICdjcmVhdGUuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRBQkxFX05BTUU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUFJJTUFSWV9LRVk6IGluc3RhbmNlVGFibGUucHJpbWFyeUtleSxcbiAgICAgICAgU09SVF9LRVk6IGluc3RhbmNlVGFibGUuc29ydEtleVxuICAgICAgfSxcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9EQVksXG4gICAgICAvLyBmdW5jdGlvbk5hbWU6ICdjcmVhdGVJdGVtRnVuY3Rpb24nXG4gICAgfSk7XG5cbiAgICBjb25zdCBjcmVhdGVJbnN0YW5jZUxhbWJkYSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ2NyZWF0ZUluc3RhbmNlJywge1xuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ2NyZWF0ZS1pbnN0YW5jZS5oYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgQ0lfVVNFUl9UT0tFTjogQ0lfVVNFUl9UT0tFTixcbiAgICAgICAgU0VDVVJJVFlfR1JPVVA6ICdkZWZhdWx0JyxcbiAgICAgICAgU1RBQ0tfTkFNRTogdGhpcy5zdGFja05hbWVcbiAgICAgIH0sXG4gICAgICByb2xlOiByb2xlLFxuICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX0RBWSxcbiAgICB9KTtcblxuICAgIGR5bmFtb1RhYmxlLmdyYW50RnVsbEFjY2VzcyhnZXRBbGxMYW1iZGEpO1xuICAgIGR5bmFtb1RhYmxlLmdyYW50RnVsbEFjY2VzcyhnZXRPbmVMYW1iZGEpO1xuICAgIGR5bmFtb1RhYmxlLmdyYW50RnVsbEFjY2VzcyhjcmVhdGVPbmVMYW1iZGEpO1xuICAgIGR5bmFtb1RhYmxlLmdyYW50RnVsbEFjY2Vzcyh1cGRhdGVPbmUpO1xuICAgIGR5bmFtb1RhYmxlLmdyYW50RnVsbEFjY2VzcyhkZWxldGVPbmUpO1xuXG4gICAgY29uc3QgYXBpID0gbmV3IGFwaWdhdGV3YXkuUmVzdEFwaSh0aGlzLCAnaXRlbXNBcGknLCB7XG4gICAgICByZXN0QXBpTmFtZTogJ0l0ZW1zIFNlcnZpY2UnLFxuICAgICAgZGVzY3JpcHRpb246ICdCbHViJyxcbiAgICAgIC8vIGRlcGxveU9wdGlvbnM6IHtcbiAgICAgIC8vICAgbG9nZ2luZ0xldmVsOiBhcGlnYXRld2F5Lk1ldGhvZExvZ2dpbmdMZXZlbC5JTkZPLFxuICAgICAgLy8gICBkYXRhVHJhY2VFbmFibGVkOiB0cnVlXG4gICAgICAvLyB9XG4gICAgfSk7XG5cbiAgICBjb25zdCBjZm5BcGkgPSBhcGkubm9kZS5kZWZhdWx0Q2hpbGQgYXMgYXBpZ2F0ZXdheS5DZm5SZXN0QXBpO1xuXG4gICAgaWYoV0lUSF9TV0FHR0VSICE9PSAnZmFsc2UnKXtcbiAgICAgIC8vIFVwbG9hZCBTd2FnZ2VyIHRvIFMzXG4gICAgICBjb25zdCBmaWxlQXNzZXQgPSBuZXcgYXNzZXRzLkFzc2V0KHRoaXMsICdTd2FnZ2VyQXNzZXQnLCB7XG4gICAgICAgIHBhdGg6IGpvaW4oX19kaXJuYW1lLCAndG1wL3N3YWdnZXJfZnVsbC55YW1sJylcbiAgICAgIH0pO1xuICAgICAgY2ZuQXBpLmJvZHlTM0xvY2F0aW9uID0geyBidWNrZXQ6IGZpbGVBc3NldC5idWNrZXQuYnVja2V0TmFtZSwga2V5OiBmaWxlQXNzZXQuczNPYmplY3RLZXkgfTtcbiAgICB9XG5cbiAgICBjb25zdCBpdGVtcyA9IGFwaS5yb290LmFkZFJlc291cmNlKCdpdGVtcycpO1xuICAgIGNvbnN0IGdldEFsbEludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ2V0QWxsTGFtYmRhKTtcbiAgICBpdGVtcy5hZGRNZXRob2QoJ0dFVCcsIGdldEFsbEludGVncmF0aW9uKTtcblxuICAgIGNvbnN0IGluc3RhbmNlcyA9IGFwaS5yb290LmFkZFJlc291cmNlKCdpbnN0YW5jZXMnKTtcbiAgICBjb25zdCBnZXRBbGxJbnN0YW5jZXNJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGdldEFsbEluc3RhbmNlc0xhbWJkYSk7XG4gICAgaW5zdGFuY2VzLmFkZE1ldGhvZCgnR0VUJywgZ2V0QWxsSW5zdGFuY2VzSW50ZWdyYXRpb24pO1xuXG4gICAgY29uc3Qgc2luZ2xlSXRlbSA9IGl0ZW1zLmFkZFJlc291cmNlKGB7JHtpbnN0YW5jZVRhYmxlLnNvcnRLZXl9fWApO1xuICAgIGNvbnN0IGdldE9uZUludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ2V0T25lTGFtYmRhKTtcbiAgICBzaW5nbGVJdGVtLmFkZE1ldGhvZCgnR0VUJywgZ2V0T25lSW50ZWdyYXRpb24pO1xuXG4gICAgY29uc3QgdXBkYXRlT25lSW50ZWdyYXRpb24gPSBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih1cGRhdGVPbmUpO1xuICAgIHNpbmdsZUl0ZW0uYWRkTWV0aG9kKCdQQVRDSCcsIHVwZGF0ZU9uZUludGVncmF0aW9uKTtcblxuICAgIGNvbnN0IGRlbGV0ZU9uZUludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZGVsZXRlT25lKTtcbiAgICBzaW5nbGVJdGVtLmFkZE1ldGhvZCgnREVMRVRFJywgZGVsZXRlT25lSW50ZWdyYXRpb24pO1xuICAgIGFkZENvcnNPcHRpb25zKHNpbmdsZUl0ZW0pO1xuXG4gICAgY29uc3QgY2hlY2tDcmVhdGlvbkFsbG93YW5jZUxhbWJkYSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ2NoZWNrQ3JlYXRpb25BbGxvd2FuY2VMYW1iZGEnLCB7XG4gICAgICBjb2RlOiBuZXcgbGFtYmRhLkFzc2V0Q29kZSgnc3JjJyksXG4gICAgICBoYW5kbGVyOiAnY2hlY2stY3JlYXRpb24tYWxsb3dhbmNlLmhhbmRsZXInLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEwX1gsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBUQUJMRV9OQU1FOiBkeW5hbW9UYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFRBQkxFX1NUQVRJQ19OQU1FOiBkeW5hbW9UYWJsZVN0YXRpYy50YWJsZU5hbWUsXG4gICAgICAgIFBSSU1BUllfS0VZOiBpbnN0YW5jZVRhYmxlLnByaW1hcnlLZXksXG4gICAgICB9LFxuICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX0RBWSxcbiAgICAgIC8vIGZ1bmN0aW9uTmFtZTogJ2NoZWNrQ3JlYXRpb25BbGxvd2FuY2VMYW1iZGEnXG4gICAgfSk7XG5cbiAgICBkeW5hbW9UYWJsZS5ncmFudEZ1bGxBY2Nlc3MoY2hlY2tDcmVhdGlvbkFsbG93YW5jZUxhbWJkYSk7XG5cbiAgICAvLyBDb25maWd1cmUgbG9nIGdyb3VwIGZvciBzaG9ydCByZXRlbnRpb25cbiAgICBjb25zdCBsb2dHcm91cCA9IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdMb2dHcm91cCcsIHtcbiAgICAgIHJldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9EQVksXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgbG9nR3JvdXBOYW1lOiAnL2F3cy9sYW1iZGEvY3VzdG9tLycgKyB0aGlzLnN0YWNrTmFtZVxuICAgIH0pO1xuXG4gICAgY29uc3QgbGdzdHJlYW0gPSBsb2dHcm91cC5hZGRTdHJlYW0oJ215bG9nZ3JvdXBTdHJlYW0nKVxuXG4gICAgLy8gbG9nR3JvdXAuYWRkU3Vic2NyaXB0aW9uRmlsdGVyKGlkPSdteWxvZ2dyb3VwX3N1YnMxJywge1xuICAgIC8vICAgICBkZXN0aW5hdGlvbjogbmV3IExhbWJkYURlc3RpbmF0aW9uKGNyZWF0ZU9uZUxhbWJkYSksXG4gICAgLy8gICAgIC8vIGZpbHRlclBhdHRlcm46IGxvZ3NEZXN0aW5hdGlvbnMuRmlsdGVyUGF0dGVybi5hbGxUZXJtcyhcIkVSUk9SXCIsIFwiTWFpblRocmVhZFwiKVxuICAgIC8vICAgICBmaWx0ZXJQYXR0ZXJuOiBsb2dzLkZpbHRlclBhdHRlcm4uYWxsRXZlbnRzKCksXG4gICAgLy8gICB9KTtcblxuICAgIC8vIG5ldyBsb2dzLlN1YnNjcmlwdGlvbkZpbHRlcih0aGlzLCAnbXktc3ViczEnLCB7XG4gICAgLy8gICBkZXN0aW5hdGlvbjogbmV3IExhbWJkYURlc3RpbmF0aW9uKGNyZWF0ZU9uZUxhbWJkYSksXG4gICAgLy8gICBmaWx0ZXJQYXR0ZXJuOiBsb2dzLkZpbHRlclBhdHRlcm4uYWxsRXZlbnRzKCksXG4gICAgLy8gICBsb2dHcm91cDogbG9nR3JvdXAsXG4gICAgLy8gfSk7XG5cblxuICAgIC8vICBjcmVhdGVPbmVMYW1iZGEuYWRkUGVybWlzc2lvbihcbiAgICAvLyAgIGlkPSdteWxhbWJkYWZ1bmN0aW9uLWludm9rZScsIHtcbiAgICAvLyAgICAgcHJpbmNpcGFsOiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2xvZ3MuZXUtd2VzdC0yLmFtYXpvbmF3cy5jb20nKSxcbiAgICAvLyAgICAgYWN0aW9uOiAnbGFtYmRhOkludm9rZUZ1bmN0aW9uJyxcbiAgICAvLyAgICAgc291cmNlQXJuOiBsb2dHcm91cC5sb2dHcm91cEFyblxuICAgIC8vICAgfSlcblxuICAgIC8vICBsb2dHcm91cC5ncmFudFdyaXRlKGNyZWF0ZU9uZUxhbWJkYSk7XG5cbiAgICAvLyBjb25zdCBjaGVja0pvYkFjdGl2aXR5ID0gbmV3IHNmbi5BY3Rpdml0eSh0aGlzLCAnQ2hlY2tKb2InKTtcblxuICAgIGNvbnN0IGNoZWNrQ3JlYXRpb25BbGxvd2FuY2UgPSBuZXcgc2ZuLlRhc2sodGhpcywgJ0NoZWNrIENyZWF0aW9uIEFsbG93YW5jZScsIHtcbiAgICAgIHRhc2s6IG5ldyBzZm5fdGFza3MuSW52b2tlRnVuY3Rpb24oY2hlY2tDcmVhdGlvbkFsbG93YW5jZUxhbWJkYSksXG4gICAgfSk7XG5cbiAgICBjb25zdCBjcmVhdGVJbnN0YW5jZVJlcXVlc3QgPSBuZXcgc2ZuLlRhc2sodGhpcywgJ0NyZWF0ZSBJbnN0YW5jZSBSZXF1ZXN0Jywge1xuICAgICAgdGFzazogbmV3IHNmbl90YXNrcy5JbnZva2VGdW5jdGlvbihjcmVhdGVPbmVMYW1iZGEpLFxuICAgICAgaW5wdXRQYXRoOiAnJC5pdGVtJ1xuICAgIH0pO1xuICAgIGNvbnN0IGNyZWF0ZUluc3RhbmNlID0gbmV3IHNmbi5UYXNrKHRoaXMsICdDcmVhdGUgSW5zdGFuY2UnLCB7XG4gICAgICB0YXNrOiBuZXcgc2ZuX3Rhc2tzLkludm9rZUZ1bmN0aW9uKGNyZWF0ZUluc3RhbmNlTGFtYmRhKSxcbiAgICAgIGlucHV0UGF0aDogJyQuaXRlbSdcbiAgICB9KTtcbiAgICBjb25zdCBjcmVhdGVkSW5zdGFuY2VVcGRhdGUgPSBuZXcgc2ZuLlRhc2sodGhpcywgJ0NyZWF0ZWQgSW5zdGFuY2UgVXBkYXRlJywge1xuICAgICAgdGFzazogbmV3IHNmbl90YXNrcy5JbnZva2VGdW5jdGlvbihjcmVhdGVPbmVMYW1iZGEpLFxuICAgICAgaW5wdXRQYXRoOiAnJC5pdGVtJ1xuICAgIH0pO1xuICAgIGNvbnN0IHdhaXRYID0gbmV3IHNmbi5XYWl0KHRoaXMsICdXYWl0IFggU2Vjb25kcycsIHtcbiAgICAgIHRpbWU6IHNmbi5XYWl0VGltZS5kdXJhdGlvbihjZGsuRHVyYXRpb24uc2Vjb25kcyg1KSksXG4gICAgfSk7XG4gICAgLy8gY29uc3QgZ2V0U3RhdHVzID0gbmV3IHNmbi5UYXNrKHRoaXMsICdHZXQgSm9iIFN0YXR1cycsIHtcbiAgICAvLyAgIHRhc2s6IG5ldyBzZm5fdGFza3MuSW52b2tlQWN0aXZpdHkoY2hlY2tKb2JBY3Rpdml0eSksXG4gICAgLy8gICBpbnB1dFBhdGg6ICckLmd1aWQnLFxuICAgIC8vICAgcmVzdWx0UGF0aDogJyQuc3RhdHVzJyxcbiAgICAvLyB9KTtcbiAgICBjb25zdCBpc0FsbG93ZWQgPSBuZXcgc2ZuLkNob2ljZSh0aGlzLCAnQ3JlYXRpb24gQWxsb3dlZD8nKTtcbiAgICBjb25zdCBub3RBbGxvd2VkID0gbmV3IHNmbi5GYWlsKHRoaXMsICdOb3QgQWxsb3dlZCcsIHtcbiAgICAgIGNhdXNlOiAnQ3JlYXRpb24gZmFpbGVkJyxcbiAgICAgIGVycm9yOiAnSm9iIHJldHVybmVkIGZhaWxlZCcsXG4gICAgfSk7XG5cbiAgICAvLyBjb25zdCBmaW5hbFN0YXR1cyA9IG5ldyBzZm4uVGFzayh0aGlzLCAnR2V0IEZpbmFsIEpvYiBTdGF0dXMnLCB7XG4gICAgLy8gICB0YXNrOiBuZXcgc2ZuX3Rhc2tzLkludm9rZUFjdGl2aXR5KGNoZWNrSm9iQWN0aXZpdHkpLFxuICAgIC8vICAgaW5wdXRQYXRoOiAnJC5ndWlkJyxcbiAgICAvLyB9KTtcblxuICAgIGNvbnN0IGNoYWluID0gc2ZuLkNoYWluLnN0YXJ0KGNoZWNrQ3JlYXRpb25BbGxvd2FuY2UpXG4gICAgICAubmV4dChpc0FsbG93ZWRcbiAgICAgIC53aGVuKHNmbi5Db25kaXRpb24uc3RyaW5nRXF1YWxzKCckLnJlc3VsdCcsICdmYWlsZWQnKSwgbm90QWxsb3dlZClcbiAgICAgIC53aGVuKHNmbi5Db25kaXRpb24uc3RyaW5nRXF1YWxzKCckLnJlc3VsdCcsICdvaycpLCBjcmVhdGVJbnN0YW5jZVJlcXVlc3QubmV4dChjcmVhdGVJbnN0YW5jZS5uZXh0KGNyZWF0ZWRJbnN0YW5jZVVwZGF0ZSkpKVxuICAgICAgLm90aGVyd2lzZSh3YWl0WCkgKTtcbiAgICAvLyAubmV4dChnZXRTdGF0dXMpXG4gICAgLy8gLm5leHQoXG4gICAgLy8gICBpc0NvbXBsZXRlXG4gICAgLy8gICAgIC53aGVuKHNmbi5Db25kaXRpb24uc3RyaW5nRXF1YWxzKCckLnN0YXR1cycsICdGQUlMRUQnKSwgam9iRmFpbGVkKVxuICAgIC8vICAgICAud2hlbihzZm4uQ29uZGl0aW9uLnN0cmluZ0VxdWFscygnJC5zdGF0dXMnLCAnU1VDQ0VFREVEJyksIGZpbmFsU3RhdHVzKVxuICAgIC8vICAgICAub3RoZXJ3aXNlKHdhaXRYKSxcbiAgICAvLyApO1xuXG4gICAgY29uc3QgY3JlYXRlU3RhdGVNYWNoaW5lID0gbmV3IHNmbi5TdGF0ZU1hY2hpbmUodGhpcywgJ0NyZWF0ZVN0YXRlTWFjaGluZScsIHtcbiAgICAgIGRlZmluaXRpb246IGNoYWluLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pO1xuXG4gICAgY29uc3QgY3JlYXRlT25lQXBpID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnY3JlYXRlSXRlbUZ1bmN0aW9uQXBpJywge1xuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ2NyZWF0ZS1hcGkuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFNUQVRFX01BQ0hJTkVfQVJOOiBjcmVhdGVTdGF0ZU1hY2hpbmUuc3RhdGVNYWNoaW5lQXJuLFxuICAgICAgICBTT1JUX0tFWTogaW5zdGFuY2VUYWJsZS5zb3J0S2V5XG4gICAgICB9LFxuICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX0RBWSxcbiAgICAgIC8vIGZ1bmN0aW9uTmFtZTogJ2NyZWF0ZUl0ZW1GdW5jdGlvbkFwaSdcbiAgICB9KTtcblxuICAgIGNyZWF0ZVN0YXRlTWFjaGluZS5ncmFudFN0YXJ0RXhlY3V0aW9uKGNyZWF0ZU9uZUFwaSk7XG5cbiAgICAvLyBjb25zdCB2YWwgPSBuZXcgYXBpZ2F0ZXdheS5SZXF1ZXN0VmFsaWRhdG9yKHRoaXMsICdEZWZhdWx0VmFsaWRhdG9yJywge1xuICAgIC8vICAgcmVzdEFwaTogYXBpLFxuICAgIC8vICAgdmFsaWRhdGVSZXF1ZXN0Qm9keTogdHJ1ZSxcbiAgICAvLyAgIHZhbGlkYXRlUmVxdWVzdFBhcmFtZXRlcnM6IHRydWVcbiAgICAvLyB9KVxuXG4gICAgLy8gY29uc3QgdmFsaWRhdG9yID0gYXBpLmFkZFJlcXVlc3RWYWxpZGF0b3IoJ0RlZmF1bHRWYWxpZGF0b3InLCB7XG4gICAgLy8gICB2YWxpZGF0ZVJlcXVlc3RCb2R5OiB0cnVlLFxuICAgIC8vICAgdmFsaWRhdGVSZXF1ZXN0UGFyYW1ldGVyczogdHJ1ZVxuICAgIC8vIH0sIGFwaSk7XG5cbiAgICBjb25zdCBjcmVhdGVPbmVJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGNyZWF0ZU9uZUFwaSk7XG5cbiAgICBpdGVtcy5hZGRNZXRob2QoJ1BPU1QnLCBjcmVhdGVPbmVJbnRlZ3JhdGlvbik7XG4gICAgYWRkQ29yc09wdGlvbnMoaXRlbXMpO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1RhYmxlTmFtZScsIHtcbiAgICAgIHZhbHVlOiBkeW5hbW9UYWJsZS50YWJsZU5hbWVcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdSZXN0QXBpRW5kUG9pbnQnLCB7XG4gICAgICB2YWx1ZTogYXBpLnVybFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1Jlc3RBcGlJZCcsIHtcbiAgICAgIHZhbHVlOiBhcGkucmVzdEFwaUlkXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTG9nR3JvdXBOYW1lJywge1xuICAgICAgdmFsdWU6IGxvZ0dyb3VwLmxvZ0dyb3VwTmFtZVxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0xvZ0dyb3VwU3RyZWFtTmFtZScsIHtcbiAgICAgIHZhbHVlOiBsZ3N0cmVhbS5sb2dTdHJlYW1OYW1lXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTEdHcm91cGRDcmVhdGVBcGknLCB7XG4gICAgICB2YWx1ZTogY3JlYXRlT25lQXBpLmxvZ0dyb3VwLmxvZ0dyb3VwTmFtZVxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0xHR3JvdXBkQ3JlYXRlJywge1xuICAgICAgdmFsdWU6IGNyZWF0ZU9uZUxhbWJkYS5sb2dHcm91cC5sb2dHcm91cE5hbWVcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdMR0dyb3VwZENyZWF0ZUluc3RhbmNlJywge1xuICAgICAgdmFsdWU6IGNyZWF0ZUluc3RhbmNlTGFtYmRhLmxvZ0dyb3VwLmxvZ0dyb3VwTmFtZVxuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhZGRDb3JzT3B0aW9ucyhhcGlSZXNvdXJjZTogYXBpZ2F0ZXdheS5JUmVzb3VyY2UpIHtcbiAgYXBpUmVzb3VyY2UuYWRkTWV0aG9kKFxuICAgICdPUFRJT05TJyxcbiAgICBuZXcgYXBpZ2F0ZXdheS5Nb2NrSW50ZWdyYXRpb24oe1xuICAgICAgaW50ZWdyYXRpb25SZXNwb25zZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxuICAgICAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6XG4gICAgICAgICAgICAgIFwiJ0NvbnRlbnQtVHlwZSxYLUFtei1EYXRlLEF1dGhvcml6YXRpb24sWC1BcGktS2V5LFgtQW16LVNlY3VyaXR5LVRva2VuLFgtQW16LVVzZXItQWdlbnQnXCIsXG4gICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiBcIicqJ1wiLFxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctQ3JlZGVudGlhbHMnOiBcIidmYWxzZSdcIixcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiBcIidPUFRJT05TLEdFVCxQVVQsUE9TVCxERUxFVEUnXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICBwYXNzdGhyb3VnaEJlaGF2aW9yOiBhcGlnYXRld2F5LlBhc3N0aHJvdWdoQmVoYXZpb3IuTkVWRVIsXG4gICAgICByZXF1ZXN0VGVtcGxhdGVzOiB7XG4gICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogJ3tcInN0YXR1c0NvZGVcIjogMjAwfScsXG4gICAgICB9LFxuICAgIH0pLFxuICAgIHtcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW1xuICAgICAgICB7XG4gICAgICAgICAgc3RhdHVzQ29kZTogJzIwMCcsXG4gICAgICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogdHJ1ZSxcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiB0cnVlLFxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctQ3JlZGVudGlhbHMnOiB0cnVlLFxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogdHJ1ZSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9LFxuICApO1xufVxuXG5jb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xubmV3IEFwaUxhbWJkYUNydWREeW5hbW9EQlN0YWNrKGFwcCwgJ0FwaUxhbWJkYUNydWREeW5hbW9EQkV4YW1wbGUnKTtcbmFwcC5zeW50aCgpO1xuIl19