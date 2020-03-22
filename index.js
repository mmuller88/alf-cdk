"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apigateway = require("@aws-cdk/aws-apigateway");
const dynamodb = require("@aws-cdk/aws-dynamodb");
const lambda = require("@aws-cdk/aws-lambda");
const cdk = require("@aws-cdk/core");
const sfn = require("@aws-cdk/aws-stepfunctions");
const sfn_tasks = require("@aws-cdk/aws-stepfunctions-tasks");
class ApiLambdaCrudDynamoDBStack extends cdk.Stack {
    constructor(app, id) {
        super(app, id);
        const dynamoTable = new dynamodb.Table(this, 'items', {
            partitionKey: {
                name: 'itemId',
                type: dynamodb.AttributeType.STRING,
            },
            tableName: 'items',
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
                PRIMARY_KEY: 'itemId',
            },
        });
        const getAllLambda = new lambda.Function(this, 'getAllItemsFunction', {
            code: new lambda.AssetCode('src'),
            handler: 'get-all.handler',
            runtime: lambda.Runtime.NODEJS_10_X,
            environment: {
                TABLE_NAME: dynamoTable.tableName,
                PRIMARY_KEY: 'itemId',
            },
        });
        const createOneLambda = new lambda.Function(this, 'createItemFunction', {
            code: new lambda.AssetCode('src'),
            handler: 'create.handler',
            runtime: lambda.Runtime.NODEJS_10_X,
            environment: {
                TABLE_NAME: dynamoTable.tableName,
                PRIMARY_KEY: 'itemId',
            },
        });
        const updateOne = new lambda.Function(this, 'updateItemFunction', {
            code: new lambda.AssetCode('src'),
            handler: 'update-one.handler',
            runtime: lambda.Runtime.NODEJS_10_X,
            environment: {
                TABLE_NAME: dynamoTable.tableName,
                PRIMARY_KEY: 'itemId',
            },
        });
        const deleteOne = new lambda.Function(this, 'deleteItemFunction', {
            code: new lambda.AssetCode('src'),
            handler: 'delete-one.handler',
            runtime: lambda.Runtime.NODEJS_10_X,
            environment: {
                TABLE_NAME: dynamoTable.tableName,
                PRIMARY_KEY: 'itemId',
            },
        });
        dynamoTable.grantReadWriteData(getAllLambda);
        dynamoTable.grantReadWriteData(getOneLambda);
        dynamoTable.grantReadWriteData(createOneLambda);
        dynamoTable.grantReadWriteData(updateOne);
        dynamoTable.grantReadWriteData(deleteOne);
        const api = new apigateway.RestApi(this, 'itemsApi', {
            restApiName: 'Items Service',
        });
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
        const checkCreationAllowanceFunction = new lambda.Function(this, 'checkCreationAllowanceFunction', {
            code: new lambda.AssetCode('src'),
            handler: 'check-creation-allowance.handler',
            runtime: lambda.Runtime.NODEJS_10_X,
            environment: {
                TABLE_NAME: dynamoTable.tableName,
                PRIMARY_KEY: 'itemId',
            },
        });
        // const checkJobActivity = new sfn.Activity(this, 'CheckJob');
        const checkCreationAllowance = new sfn.Task(this, 'Check Creation Allowance', {
            task: new sfn_tasks.InvokeFunction(checkCreationAllowanceFunction),
        });
        const createOne = new sfn.Task(this, 'Create Item', {
            task: new sfn_tasks.InvokeFunction(createOneLambda),
            inputPath: '$'
        });
        // const waitX = new sfn.Wait(this, 'Wait X Seconds', {
        //   time: sfn.WaitTime.secondsPath('$.wait_time'),
        // });
        // const getStatus = new sfn.Task(this, 'Get Job Status', {
        //   task: new sfn_tasks.InvokeActivity(checkJobActivity),
        //   inputPath: '$.guid',
        //   resultPath: '$.status',
        // });
        // const isComplete = new sfn.Choice(this, 'Job Complete?');
        // const jobFailed = new sfn.Fail(this, 'Job Failed', {
        //   cause: 'AWS Batch Job Failed',
        //   error: 'DescribeJob returned FAILED',
        // });
        // const finalStatus = new sfn.Task(this, 'Get Final Job Status', {
        //   task: new sfn_tasks.InvokeActivity(checkJobActivity),
        //   inputPath: '$.guid',
        // });
        const chain = sfn.Chain.start(checkCreationAllowance).next(createOne);
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
        const createOneIntegration = new apigateway.LambdaIntegration(createOneApi);
        items.addMethod('POST', createOneIntegration);
        addCorsOptions(items);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHNEQUF1RDtBQUN2RCxrREFBbUQ7QUFDbkQsOENBQStDO0FBQy9DLHFDQUFzQztBQUN0QyxrREFBbUQ7QUFDbkQsOERBQStEO0FBRS9ELE1BQWEsMEJBQTJCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDdkQsWUFBWSxHQUFZLEVBQUUsRUFBVTtRQUNsQyxLQUFLLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWYsTUFBTSxXQUFXLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUU7WUFDcEQsWUFBWSxFQUFFO2dCQUNaLElBQUksRUFBRSxRQUFRO2dCQUNkLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU07YUFDcEM7WUFDRCxTQUFTLEVBQUUsT0FBTztZQUVsQixnR0FBZ0c7WUFDaEcscUdBQXFHO1lBQ3JHLHlFQUF5RTtZQUN6RSxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1NBQ3pDLENBQUMsQ0FBQztRQUVILE1BQU0sWUFBWSxHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDbkUsSUFBSSxFQUFFLElBQUksTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUM7WUFDakMsT0FBTyxFQUFFLGlCQUFpQjtZQUMxQixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLFdBQVcsRUFBRTtnQkFDWCxVQUFVLEVBQUUsV0FBVyxDQUFDLFNBQVM7Z0JBQ2pDLFdBQVcsRUFBRSxRQUFRO2FBQ3RCO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxZQUFZLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRTtZQUNwRSxJQUFJLEVBQUUsSUFB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RUFBRTtZQUNwQjtnQkFDRSxVQUFVLEVBQUUsS0FBSztnQkFDakIsa0JBQWtCLEVBQUU7b0JBQ2xCLHFEQUFxRCxFQUNuRCx5RkFBeUY7b0JBQzNGLG9EQUFvRCxFQUFFLEtBQUs7b0JBQzNELHlEQUF5RCxFQUFFLFNBQVM7b0JBQ3BFLHFEQUFxRCxFQUFFLCtCQUErQjtpQkFDdkY7YUFDRjtTQUNGO1FBQ0QsbUJBQW1CLEVBQUUsVUFBVSxDQUFDLG1CQUFtQixDQUFDLEtBQUs7UUFDekQsZ0JBQWdCLEVBQUU7WUFDaEIsa0JBQWtCLEVBQUUscUJBQXFCO1NBQzFDO0tBQ0YsQ0FBQyxFQUNGO1FBQ0UsZUFBZSxFQUFFO1lBQ2Y7Z0JBQ0UsVUFBVSxFQUFFLEtBQUs7Z0JBQ2pCLGtCQUFrQixFQUFFO29CQUNsQixxREFBcUQsRUFBRSxJQUFJO29CQUMzRCxxREFBcUQsRUFBRSxJQUFJO29CQUMzRCx5REFBeUQsRUFBRSxJQUFJO29CQUMvRCxvREFBb0QsRUFBRSxJQUFJO2lCQUMzRDthQUNGO1NBQ0Y7S0FDRixDQUNGLENBQUM7QUFDSixDQUFDO0FBbkNELHdDQW1DQztBQUVELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQzFCLElBQUksMEJBQTBCLENBQUMsR0FBRyxFQUFFLDhCQUE4QixDQUFDLENBQUM7QUFDcEUsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGFwaWdhdGV3YXkgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtYXBpZ2F0ZXdheScpO1xuaW1wb3J0IGR5bmFtb2RiID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWR5bmFtb2RiJyk7XG5pbXBvcnQgbGFtYmRhID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWxhbWJkYScpO1xuaW1wb3J0IGNkayA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2NvcmUnKTtcbmltcG9ydCBzZm4gPSByZXF1aXJlKCdAYXdzLWNkay9hd3Mtc3RlcGZ1bmN0aW9ucycpO1xuaW1wb3J0IHNmbl90YXNrcyA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1zdGVwZnVuY3Rpb25zLXRhc2tzJyk7XG5cbmV4cG9ydCBjbGFzcyBBcGlMYW1iZGFDcnVkRHluYW1vREJTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKGFwcDogY2RrLkFwcCwgaWQ6IHN0cmluZykge1xuICAgIHN1cGVyKGFwcCwgaWQpO1xuXG4gICAgY29uc3QgZHluYW1vVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ2l0ZW1zJywge1xuICAgICAgcGFydGl0aW9uS2V5OiB7XG4gICAgICAgIG5hbWU6ICdpdGVtSWQnLFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcbiAgICAgIH0sXG4gICAgICB0YWJsZU5hbWU6ICdpdGVtcycsXG5cbiAgICAgIC8vIFRoZSBkZWZhdWx0IHJlbW92YWwgcG9saWN5IGlzIFJFVEFJTiwgd2hpY2ggbWVhbnMgdGhhdCBjZGsgZGVzdHJveSB3aWxsIG5vdCBhdHRlbXB0IHRvIGRlbGV0ZVxuICAgICAgLy8gdGhlIG5ldyB0YWJsZSwgYW5kIGl0IHdpbGwgcmVtYWluIGluIHlvdXIgYWNjb3VudCB1bnRpbCBtYW51YWxseSBkZWxldGVkLiBCeSBzZXR0aW5nIHRoZSBwb2xpY3kgdG9cbiAgICAgIC8vIERFU1RST1ksIGNkayBkZXN0cm95IHdpbGwgZGVsZXRlIHRoZSB0YWJsZSAoZXZlbiBpZiBpdCBoYXMgZGF0YSBpbiBpdClcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIE5PVCByZWNvbW1lbmRlZCBmb3IgcHJvZHVjdGlvbiBjb2RlXG4gICAgfSk7XG5cbiAgICBjb25zdCBnZXRPbmVMYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdnZXRPbmVJdGVtRnVuY3Rpb24nLCB7XG4gICAgICBjb2RlOiBuZXcgbGFtYmRhLkFzc2V0Q29kZSgnc3JjJyksXG4gICAgICBoYW5kbGVyOiAnZ2V0LW9uZS5oYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVEFCTEVfTkFNRTogZHluYW1vVGFibGUudGFibGVOYW1lLFxuICAgICAgICBQUklNQVJZX0tFWTogJ2l0ZW1JZCcsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgZ2V0QWxsTGFtYmRhID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnZ2V0QWxsSXRlbXNGdW5jdGlvbicsIHtcbiAgICAgIGNvZGU6IG5ldyBsYW1iZGEuQXNzZXRDb2RlKCdzcmMnKSxcbiAgICAgIGhhbmRsZXI6ICdnZXQtYWxsLmhhbmRsZXInLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEwX1gsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBUQUJMRV9OQU1FOiBkeW5hbW9UYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFBSSU1BUllfS0VZOiAnaXRlbUlkJyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBjcmVhdGVPbmVMYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdjcmVhdGVJdGVtRnVuY3Rpb24nLCB7XG4gICAgICBjb2RlOiBuZXcgbGFtYmRhLkFzc2V0Q29kZSgnc3JjJyksXG4gICAgICBoYW5kbGVyOiAnY3JlYXRlLmhhbmRsZXInLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEwX1gsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBUQUJMRV9OQU1FOiBkeW5hbW9UYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFBSSU1BUllfS0VZOiAnaXRlbUlkJyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCB1cGRhdGVPbmUgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICd1cGRhdGVJdGVtRnVuY3Rpb24nLCB7XG4gICAgICBjb2RlOiBuZXcgbGFtYmRhLkFzc2V0Q29kZSgnc3JjJyksXG4gICAgICBoYW5kbGVyOiAndXBkYXRlLW9uZS5oYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVEFCTEVfTkFNRTogZHluYW1vVGFibGUudGFibGVOYW1lLFxuICAgICAgICBQUklNQVJZX0tFWTogJ2l0ZW1JZCcsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgZGVsZXRlT25lID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnZGVsZXRlSXRlbUZ1bmN0aW9uJywge1xuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ2RlbGV0ZS1vbmUuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRBQkxFX05BTUU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUFJJTUFSWV9LRVk6ICdpdGVtSWQnLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGR5bmFtb1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShnZXRBbGxMYW1iZGEpO1xuICAgIGR5bmFtb1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShnZXRPbmVMYW1iZGEpO1xuICAgIGR5bmFtb1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShjcmVhdGVPbmVMYW1iZGEpO1xuICAgIGR5bmFtb1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh1cGRhdGVPbmUpO1xuICAgIGR5bmFtb1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShkZWxldGVPbmUpO1xuXG4gICAgY29uc3QgYXBpID0gbmV3IGFwaWdhdGV3YXkuUmVzdEFwaSh0aGlzLCAnaXRlbXNBcGknLCB7XG4gICAgICByZXN0QXBpTmFtZTogJ0l0ZW1zIFNlcnZpY2UnLFxuICAgIH0pO1xuXG4gICAgY29uc3QgaXRlbXMgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgnaXRlbXMnKTtcbiAgICBjb25zdCBnZXRBbGxJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGdldEFsbExhbWJkYSk7XG4gICAgaXRlbXMuYWRkTWV0aG9kKCdHRVQnLCBnZXRBbGxJbnRlZ3JhdGlvbik7XG5cbiAgICBjb25zdCBzaW5nbGVJdGVtID0gaXRlbXMuYWRkUmVzb3VyY2UoJ3tpZH0nKTtcbiAgICBjb25zdCBnZXRPbmVJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGdldE9uZUxhbWJkYSk7XG4gICAgc2luZ2xlSXRlbS5hZGRNZXRob2QoJ0dFVCcsIGdldE9uZUludGVncmF0aW9uKTtcblxuICAgIGNvbnN0IHVwZGF0ZU9uZUludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odXBkYXRlT25lKTtcbiAgICBzaW5nbGVJdGVtLmFkZE1ldGhvZCgnUEFUQ0gnLCB1cGRhdGVPbmVJbnRlZ3JhdGlvbik7XG5cbiAgICBjb25zdCBkZWxldGVPbmVJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGRlbGV0ZU9uZSk7XG4gICAgc2luZ2xlSXRlbS5hZGRNZXRob2QoJ0RFTEVURScsIGRlbGV0ZU9uZUludGVncmF0aW9uKTtcbiAgICBhZGRDb3JzT3B0aW9ucyhzaW5nbGVJdGVtKTtcblxuICAgIGNvbnN0IGNoZWNrQ3JlYXRpb25BbGxvd2FuY2VGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ2NoZWNrQ3JlYXRpb25BbGxvd2FuY2VGdW5jdGlvbicsIHtcbiAgICAgIGNvZGU6IG5ldyBsYW1iZGEuQXNzZXRDb2RlKCdzcmMnKSxcbiAgICAgIGhhbmRsZXI6ICdjaGVjay1jcmVhdGlvbi1hbGxvd2FuY2UuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRBQkxFX05BTUU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUFJJTUFSWV9LRVk6ICdpdGVtSWQnLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIGNvbnN0IGNoZWNrSm9iQWN0aXZpdHkgPSBuZXcgc2ZuLkFjdGl2aXR5KHRoaXMsICdDaGVja0pvYicpO1xuXG4gICAgY29uc3QgY2hlY2tDcmVhdGlvbkFsbG93YW5jZSA9IG5ldyBzZm4uVGFzayh0aGlzLCAnQ2hlY2sgQ3JlYXRpb24gQWxsb3dhbmNlJywge1xuICAgICAgdGFzazogbmV3IHNmbl90YXNrcy5JbnZva2VGdW5jdGlvbihjaGVja0NyZWF0aW9uQWxsb3dhbmNlRnVuY3Rpb24pLFxuICAgIH0pO1xuXG4gICAgY29uc3QgY3JlYXRlT25lID0gbmV3IHNmbi5UYXNrKHRoaXMsICdDcmVhdGUgSXRlbScsIHtcbiAgICAgIHRhc2s6IG5ldyBzZm5fdGFza3MuSW52b2tlRnVuY3Rpb24oY3JlYXRlT25lTGFtYmRhKSxcbiAgICAgIGlucHV0UGF0aDogJyQnXG4gICAgfSk7XG4gICAgLy8gY29uc3Qgd2FpdFggPSBuZXcgc2ZuLldhaXQodGhpcywgJ1dhaXQgWCBTZWNvbmRzJywge1xuICAgIC8vICAgdGltZTogc2ZuLldhaXRUaW1lLnNlY29uZHNQYXRoKCckLndhaXRfdGltZScpLFxuICAgIC8vIH0pO1xuICAgIC8vIGNvbnN0IGdldFN0YXR1cyA9IG5ldyBzZm4uVGFzayh0aGlzLCAnR2V0IEpvYiBTdGF0dXMnLCB7XG4gICAgLy8gICB0YXNrOiBuZXcgc2ZuX3Rhc2tzLkludm9rZUFjdGl2aXR5KGNoZWNrSm9iQWN0aXZpdHkpLFxuICAgIC8vICAgaW5wdXRQYXRoOiAnJC5ndWlkJyxcbiAgICAvLyAgIHJlc3VsdFBhdGg6ICckLnN0YXR1cycsXG4gICAgLy8gfSk7XG4gICAgLy8gY29uc3QgaXNDb21wbGV0ZSA9IG5ldyBzZm4uQ2hvaWNlKHRoaXMsICdKb2IgQ29tcGxldGU/Jyk7XG4gICAgLy8gY29uc3Qgam9iRmFpbGVkID0gbmV3IHNmbi5GYWlsKHRoaXMsICdKb2IgRmFpbGVkJywge1xuICAgIC8vICAgY2F1c2U6ICdBV1MgQmF0Y2ggSm9iIEZhaWxlZCcsXG4gICAgLy8gICBlcnJvcjogJ0Rlc2NyaWJlSm9iIHJldHVybmVkIEZBSUxFRCcsXG4gICAgLy8gfSk7XG4gICAgLy8gY29uc3QgZmluYWxTdGF0dXMgPSBuZXcgc2ZuLlRhc2sodGhpcywgJ0dldCBGaW5hbCBKb2IgU3RhdHVzJywge1xuICAgIC8vICAgdGFzazogbmV3IHNmbl90YXNrcy5JbnZva2VBY3Rpdml0eShjaGVja0pvYkFjdGl2aXR5KSxcbiAgICAvLyAgIGlucHV0UGF0aDogJyQuZ3VpZCcsXG4gICAgLy8gfSk7XG5cbiAgICBjb25zdCBjaGFpbiA9IHNmbi5DaGFpbi5zdGFydChjaGVja0NyZWF0aW9uQWxsb3dhbmNlKS5uZXh0KGNyZWF0ZU9uZSk7XG4gICAgLy8gLm5leHQoZ2V0U3RhdHVzKVxuICAgIC8vIC5uZXh0KFxuICAgIC8vICAgaXNDb21wbGV0ZVxuICAgIC8vICAgICAud2hlbihzZm4uQ29uZGl0aW9uLnN0cmluZ0VxdWFscygnJC5zdGF0dXMnLCAnRkFJTEVEJyksIGpvYkZhaWxlZClcbiAgICAvLyAgICAgLndoZW4oc2ZuLkNvbmRpdGlvbi5zdHJpbmdFcXVhbHMoJyQuc3RhdHVzJywgJ1NVQ0NFRURFRCcpLCBmaW5hbFN0YXR1cylcbiAgICAvLyAgICAgLm90aGVyd2lzZSh3YWl0WCksXG4gICAgLy8gKTtcblxuICAgIGNvbnN0IGNyZWF0ZVN0YXRlTWFjaGluZSA9IG5ldyBzZm4uU3RhdGVNYWNoaW5lKHRoaXMsICdDcmVhdGVTdGF0ZU1hY2hpbmUnLCB7XG4gICAgICBkZWZpbml0aW9uOiBjaGFpbixcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGNyZWF0ZU9uZUFwaSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ2NyZWF0ZUl0ZW1GdW5jdGlvbkFwaScsIHtcbiAgICAgIGNvZGU6IG5ldyBsYW1iZGEuQXNzZXRDb2RlKCdzcmMnKSxcbiAgICAgIGhhbmRsZXI6ICdjcmVhdGUtYXBpLmhhbmRsZXInLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEwX1gsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBTVEFURV9NQUNISU5FX0FSTjogY3JlYXRlU3RhdGVNYWNoaW5lLnN0YXRlTWFjaGluZUFybixcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBjcmVhdGVPbmVJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGNyZWF0ZU9uZUFwaSk7XG4gICAgaXRlbXMuYWRkTWV0aG9kKCdQT1NUJywgY3JlYXRlT25lSW50ZWdyYXRpb24pO1xuICAgIGFkZENvcnNPcHRpb25zKGl0ZW1zKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYWRkQ29yc09wdGlvbnMoYXBpUmVzb3VyY2U6IGFwaWdhdGV3YXkuSVJlc291cmNlKSB7XG4gIGFwaVJlc291cmNlLmFkZE1ldGhvZChcbiAgICAnT1BUSU9OUycsXG4gICAgbmV3IGFwaWdhdGV3YXkuTW9ja0ludGVncmF0aW9uKHtcbiAgICAgIGludGVncmF0aW9uUmVzcG9uc2VzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcbiAgICAgICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOlxuICAgICAgICAgICAgICBcIidDb250ZW50LVR5cGUsWC1BbXotRGF0ZSxBdXRob3JpemF0aW9uLFgtQXBpLUtleSxYLUFtei1TZWN1cml0eS1Ub2tlbixYLUFtei1Vc2VyLUFnZW50J1wiLFxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogXCInKidcIixcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUNyZWRlbnRpYWxzJzogXCInZmFsc2UnXCIsXG4gICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogXCInT1BUSU9OUyxHRVQsUFVULFBPU1QsREVMRVRFJ1wiLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgcGFzc3Rocm91Z2hCZWhhdmlvcjogYXBpZ2F0ZXdheS5QYXNzdGhyb3VnaEJlaGF2aW9yLk5FVkVSLFxuICAgICAgcmVxdWVzdFRlbXBsYXRlczoge1xuICAgICAgICAnYXBwbGljYXRpb24vanNvbic6ICd7XCJzdGF0dXNDb2RlXCI6IDIwMH0nLFxuICAgICAgfSxcbiAgICB9KSxcbiAgICB7XG4gICAgICBtZXRob2RSZXNwb25zZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxuICAgICAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6IHRydWUsXG4gICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogdHJ1ZSxcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUNyZWRlbnRpYWxzJzogdHJ1ZSxcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IHRydWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSxcbiAgKTtcbn1cblxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcbm5ldyBBcGlMYW1iZGFDcnVkRHluYW1vREJTdGFjayhhcHAsICdBcGlMYW1iZGFDcnVkRHluYW1vREJFeGFtcGxlJyk7XG5hcHAuc3ludGgoKTtcbiJdfQ==