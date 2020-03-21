"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apigateway = require("@aws-cdk/aws-apigateway");
const dynamodb = require("@aws-cdk/aws-dynamodb");
const lambda = require("@aws-cdk/aws-lambda");
const cdk = require("@aws-cdk/core");
class ApiLambdaCrudDynamoDBStack extends cdk.Stack {
    constructor(app, id) {
        super(app, id);
        const dynamoTable = new dynamodb.Table(this, 'items', {
            partitionKey: {
                name: 'itemId',
                type: dynamodb.AttributeType.STRING
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
                PRIMARY_KEY: 'itemId'
            }
        });
        const getAllLambda = new lambda.Function(this, 'getAllItemsFunction', {
            code: new lambda.AssetCode('src'),
            handler: 'get-all.handler',
            runtime: lambda.Runtime.NODEJS_10_X,
            environment: {
                TABLE_NAME: dynamoTable.tableName,
                PRIMARY_KEY: 'itemId'
            }
        });
        const createOne = new lambda.Function(this, 'createItemFunction', {
            code: new lambda.AssetCode('src'),
            handler: 'create.handler',
            runtime: lambda.Runtime.NODEJS_10_X,
            environment: {
                TABLE_NAME: dynamoTable.tableName,
                PRIMARY_KEY: 'itemId'
            }
        });
        const updateOne = new lambda.Function(this, 'updateItemFunction', {
            code: new lambda.AssetCode('src'),
            handler: 'update-one.handler',
            runtime: lambda.Runtime.NODEJS_10_X,
            environment: {
                TABLE_NAME: dynamoTable.tableName,
                PRIMARY_KEY: 'itemId'
            }
        });
        const deleteOne = new lambda.Function(this, 'deleteItemFunction', {
            code: new lambda.AssetCode('src'),
            handler: 'delete-one.handler',
            runtime: lambda.Runtime.NODEJS_10_X,
            environment: {
                TABLE_NAME: dynamoTable.tableName,
                PRIMARY_KEY: 'itemId'
            }
        });
        dynamoTable.grantReadWriteData(getAllLambda);
        dynamoTable.grantReadWriteData(getOneLambda);
        dynamoTable.grantReadWriteData(createOne);
        dynamoTable.grantReadWriteData(updateOne);
        dynamoTable.grantReadWriteData(deleteOne);
        const api = new apigateway.RestApi(this, 'itemsApi', {
            restApiName: 'Items Service'
        });
        const items = api.root.addResource('items');
        const getAllIntegration = new apigateway.LambdaIntegration(getAllLambda);
        items.addMethod('GET', getAllIntegration);
        const createOneIntegration = new apigateway.LambdaIntegration(createOne);
        items.addMethod('POST', createOneIntegration);
        addCorsOptions(items);
        const singleItem = items.addResource('{id}');
        const getOneIntegration = new apigateway.LambdaIntegration(getOneLambda);
        singleItem.addMethod('GET', getOneIntegration);
        const updateOneIntegration = new apigateway.LambdaIntegration(updateOne);
        singleItem.addMethod('PATCH', updateOneIntegration);
        const deleteOneIntegration = new apigateway.LambdaIntegration(deleteOne);
        singleItem.addMethod('DELETE', deleteOneIntegration);
        addCorsOptions(singleItem);
    }
}
exports.ApiLambdaCrudDynamoDBStack = ApiLambdaCrudDynamoDBStack;
function addCorsOptions(apiResource) {
    apiResource.addMethod('OPTIONS', new apigateway.MockIntegration({
        integrationResponses: [{
                statusCode: '200',
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
                    'method.response.header.Access-Control-Allow-Origin': "'*'",
                    'method.response.header.Access-Control-Allow-Credentials': "'false'",
                    'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
                },
            }],
        passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
        requestTemplates: {
            "application/json": "{\"statusCode\": 200}"
        },
    }), {
        methodResponses: [{
                statusCode: '200',
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Headers': true,
                    'method.response.header.Access-Control-Allow-Methods': true,
                    'method.response.header.Access-Control-Allow-Credentials': true,
                    'method.response.header.Access-Control-Allow-Origin': true,
                },
            }]
    });
}
exports.addCorsOptions = addCorsOptions;
const app = new cdk.App();
new ApiLambdaCrudDynamoDBStack(app, 'ApiLambdaCrudDynamoDBExample');
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHNEQUF1RDtBQUN2RCxrREFBbUQ7QUFDbkQsOENBQStDO0FBQy9DLHFDQUFzQztBQUV0QyxNQUFhLDBCQUEyQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQ3ZELFlBQVksR0FBWSxFQUFFLEVBQVU7UUFDbEMsS0FBSyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVmLE1BQU0sV0FBVyxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFO1lBQ3BELFlBQVksRUFBRTtnQkFDWixJQUFJLEVBQUUsUUFBUTtnQkFDZCxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNO2FBQ3BDO1lBQ0QsU0FBUyxFQUFFLE9BQU87WUFFbEIsZ0dBQWdHO1lBQ2hHLHNHQUFzRztZQUN0Ryx5RUFBeUU7WUFDekUsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztTQUN6QyxDQUFDLENBQUM7UUFFSCxNQUFNLFlBQVksR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQ25FLElBQUksRUFBRSxJQUFJLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDO1lBQ2pDLE9BQU8sRUFBRSxpQkFBaUI7WUFDMUIsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxXQUFXLEVBQUU7Z0JBQ1gsVUFBVSxFQUFFLFdBQVcsQ0FBQyxTQUFTO2dCQUNqQyxXQUFXLEVBQUUsUUFBUTthQUN0QjtTQUNGLENBQUMsQ0FBQztRQUVILE1BQU0sWUFBWSxHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUscUJBQXFCLEVBQUU7WUFDcEUsSUFBSSxFQUFFLElBQUksTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFL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QUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQzFCLElBQUksMEJBQTBCLENBQUMsR0FBRyxFQUFFLDhCQUE4QixDQUFDLENBQUM7QUFDcEUsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGFwaWdhdGV3YXkgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtYXBpZ2F0ZXdheScpOyBcclxuaW1wb3J0IGR5bmFtb2RiID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWR5bmFtb2RiJyk7XHJcbmltcG9ydCBsYW1iZGEgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtbGFtYmRhJyk7XHJcbmltcG9ydCBjZGsgPSByZXF1aXJlKCdAYXdzLWNkay9jb3JlJyk7XHJcblxyXG5leHBvcnQgY2xhc3MgQXBpTGFtYmRhQ3J1ZER5bmFtb0RCU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIGNvbnN0cnVjdG9yKGFwcDogY2RrLkFwcCwgaWQ6IHN0cmluZykge1xyXG4gICAgc3VwZXIoYXBwLCBpZCk7XHJcblxyXG4gICAgY29uc3QgZHluYW1vVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ2l0ZW1zJywge1xyXG4gICAgICBwYXJ0aXRpb25LZXk6IHtcclxuICAgICAgICBuYW1lOiAnaXRlbUlkJyxcclxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklOR1xyXG4gICAgICB9LFxyXG4gICAgICB0YWJsZU5hbWU6ICdpdGVtcycsXHJcblxyXG4gICAgICAvLyBUaGUgZGVmYXVsdCByZW1vdmFsIHBvbGljeSBpcyBSRVRBSU4sIHdoaWNoIG1lYW5zIHRoYXQgY2RrIGRlc3Ryb3kgd2lsbCBub3QgYXR0ZW1wdCB0byBkZWxldGVcclxuICAgICAgLy8gdGhlIG5ldyB0YWJsZSwgYW5kIGl0IHdpbGwgcmVtYWluIGluIHlvdXIgYWNjb3VudCB1bnRpbCBtYW51YWxseSBkZWxldGVkLiBCeSBzZXR0aW5nIHRoZSBwb2xpY3kgdG8gXHJcbiAgICAgIC8vIERFU1RST1ksIGNkayBkZXN0cm95IHdpbGwgZGVsZXRlIHRoZSB0YWJsZSAoZXZlbiBpZiBpdCBoYXMgZGF0YSBpbiBpdClcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gTk9UIHJlY29tbWVuZGVkIGZvciBwcm9kdWN0aW9uIGNvZGVcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGdldE9uZUxhbWJkYSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ2dldE9uZUl0ZW1GdW5jdGlvbicsIHtcclxuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxyXG4gICAgICBoYW5kbGVyOiAnZ2V0LW9uZS5oYW5kbGVyJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEwX1gsXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVEFCTEVfTkFNRTogZHluYW1vVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIFBSSU1BUllfS0VZOiAnaXRlbUlkJ1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBnZXRBbGxMYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdnZXRBbGxJdGVtc0Z1bmN0aW9uJywge1xyXG4gICAgICBjb2RlOiBuZXcgbGFtYmRhLkFzc2V0Q29kZSgnc3JjJyksXHJcbiAgICAgIGhhbmRsZXI6ICdnZXQtYWxsLmhhbmRsZXInLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBUQUJMRV9OQU1FOiBkeW5hbW9UYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgUFJJTUFSWV9LRVk6ICdpdGVtSWQnXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGNyZWF0ZU9uZSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ2NyZWF0ZUl0ZW1GdW5jdGlvbicsIHtcclxuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxyXG4gICAgICBoYW5kbGVyOiAnY3JlYXRlLmhhbmRsZXInLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBUQUJMRV9OQU1FOiBkeW5hbW9UYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgUFJJTUFSWV9LRVk6ICdpdGVtSWQnXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHVwZGF0ZU9uZSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ3VwZGF0ZUl0ZW1GdW5jdGlvbicsIHtcclxuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxyXG4gICAgICBoYW5kbGVyOiAndXBkYXRlLW9uZS5oYW5kbGVyJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEwX1gsXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVEFCTEVfTkFNRTogZHluYW1vVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIFBSSU1BUllfS0VZOiAnaXRlbUlkJ1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBkZWxldGVPbmUgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdkZWxldGVJdGVtRnVuY3Rpb24nLCB7XHJcbiAgICAgIGNvZGU6IG5ldyBsYW1iZGEuQXNzZXRDb2RlKCdzcmMnKSxcclxuICAgICAgaGFuZGxlcjogJ2RlbGV0ZS1vbmUuaGFuZGxlcicsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMF9YLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFRBQkxFX05BTUU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBQUklNQVJZX0tFWTogJ2l0ZW1JZCdcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIGR5bmFtb1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShnZXRBbGxMYW1iZGEpO1xyXG4gICAgZHluYW1vVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGdldE9uZUxhbWJkYSk7XHJcbiAgICBkeW5hbW9UYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoY3JlYXRlT25lKTtcclxuICAgIGR5bmFtb1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh1cGRhdGVPbmUpO1xyXG4gICAgZHluYW1vVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGRlbGV0ZU9uZSk7XHJcblxyXG4gICAgY29uc3QgYXBpID0gbmV3IGFwaWdhdGV3YXkuUmVzdEFwaSh0aGlzLCAnaXRlbXNBcGknLCB7XHJcbiAgICAgIHJlc3RBcGlOYW1lOiAnSXRlbXMgU2VydmljZSdcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGl0ZW1zID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2l0ZW1zJyk7XHJcbiAgICBjb25zdCBnZXRBbGxJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGdldEFsbExhbWJkYSk7XHJcbiAgICBpdGVtcy5hZGRNZXRob2QoJ0dFVCcsIGdldEFsbEludGVncmF0aW9uKTtcclxuXHJcbiAgICBjb25zdCBjcmVhdGVPbmVJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGNyZWF0ZU9uZSk7XHJcbiAgICBpdGVtcy5hZGRNZXRob2QoJ1BPU1QnLCBjcmVhdGVPbmVJbnRlZ3JhdGlvbik7XHJcbiAgICBhZGRDb3JzT3B0aW9ucyhpdGVtcyk7XHJcblxyXG4gICAgY29uc3Qgc2luZ2xlSXRlbSA9IGl0ZW1zLmFkZFJlc291cmNlKCd7aWR9Jyk7XHJcbiAgICBjb25zdCBnZXRPbmVJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGdldE9uZUxhbWJkYSk7XHJcbiAgICBzaW5nbGVJdGVtLmFkZE1ldGhvZCgnR0VUJywgZ2V0T25lSW50ZWdyYXRpb24pO1xyXG5cclxuICAgIGNvbnN0IHVwZGF0ZU9uZUludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odXBkYXRlT25lKTtcclxuICAgIHNpbmdsZUl0ZW0uYWRkTWV0aG9kKCdQQVRDSCcsIHVwZGF0ZU9uZUludGVncmF0aW9uKTtcclxuXHJcbiAgICBjb25zdCBkZWxldGVPbmVJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGRlbGV0ZU9uZSk7XHJcbiAgICBzaW5nbGVJdGVtLmFkZE1ldGhvZCgnREVMRVRFJywgZGVsZXRlT25lSW50ZWdyYXRpb24pO1xyXG4gICAgYWRkQ29yc09wdGlvbnMoc2luZ2xlSXRlbSk7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYWRkQ29yc09wdGlvbnMoYXBpUmVzb3VyY2U6IGFwaWdhdGV3YXkuSVJlc291cmNlKSB7XHJcbiAgYXBpUmVzb3VyY2UuYWRkTWV0aG9kKCdPUFRJT05TJywgbmV3IGFwaWdhdGV3YXkuTW9ja0ludGVncmF0aW9uKHtcclxuICAgIGludGVncmF0aW9uUmVzcG9uc2VzOiBbe1xyXG4gICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcclxuICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XHJcbiAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6IFwiJ0NvbnRlbnQtVHlwZSxYLUFtei1EYXRlLEF1dGhvcml6YXRpb24sWC1BcGktS2V5LFgtQW16LVNlY3VyaXR5LVRva2VuLFgtQW16LVVzZXItQWdlbnQnXCIsXHJcbiAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogXCInKidcIixcclxuICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1DcmVkZW50aWFscyc6IFwiJ2ZhbHNlJ1wiLFxyXG4gICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiBcIidPUFRJT05TLEdFVCxQVVQsUE9TVCxERUxFVEUnXCIsXHJcbiAgICAgIH0sXHJcbiAgICB9XSxcclxuICAgIHBhc3N0aHJvdWdoQmVoYXZpb3I6IGFwaWdhdGV3YXkuUGFzc3Rocm91Z2hCZWhhdmlvci5ORVZFUixcclxuICAgIHJlcXVlc3RUZW1wbGF0ZXM6IHtcclxuICAgICAgXCJhcHBsaWNhdGlvbi9qc29uXCI6IFwie1xcXCJzdGF0dXNDb2RlXFxcIjogMjAwfVwiXHJcbiAgICB9LFxyXG4gIH0pLCB7XHJcbiAgICBtZXRob2RSZXNwb25zZXM6IFt7XHJcbiAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxyXG4gICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcclxuICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogdHJ1ZSxcclxuICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogdHJ1ZSxcclxuICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1DcmVkZW50aWFscyc6IHRydWUsXHJcbiAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogdHJ1ZSxcclxuICAgICAgfSwgIFxyXG4gICAgfV1cclxuICB9KVxyXG59XHJcblxyXG5jb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xyXG5uZXcgQXBpTGFtYmRhQ3J1ZER5bmFtb0RCU3RhY2soYXBwLCAnQXBpTGFtYmRhQ3J1ZER5bmFtb0RCRXhhbXBsZScpO1xyXG5hcHAuc3ludGgoKTtcclxuIl19