"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apigateway = require("@aws-cdk/aws-apigateway");
const dynamodb = require("@aws-cdk/aws-dynamodb");
// import { GlobalTable } from '@aws-cdk/aws-dynamodb-global';
const lambda = require("@aws-cdk/aws-lambda");
const cdk = require("@aws-cdk/core");
const sfn = require("@aws-cdk/aws-stepfunctions");
const sfn_tasks = require("@aws-cdk/aws-stepfunctions-tasks");
const assets = require("@aws-cdk/aws-s3-assets");
const logs = require("@aws-cdk/aws-logs");
const iam = require("@aws-cdk/aws-iam");
const path_1 = require("path");
const aws_iam_1 = require("@aws-cdk/aws-iam");
const route53 = require("@aws-cdk/aws-route53");
const targets = require("@aws-cdk/aws-route53-targets");
const aws_certificatemanager_1 = require("@aws-cdk/aws-certificatemanager");
const instanceTable = { name: 'alfInstances', primaryKey: 'alfUserId', sortKey: 'alfInstanceId' };
const staticTable = { name: 'staticTable', primaryKey: 'itemsId' };
const repoTable = { name: 'repoTable', primaryKey: 'alfType' };
const WITH_SWAGGER = process.env.WITH_SWAGGER || 'true';
const CI_USER_TOKEN = process.env.CI_USER_TOKEN || '';
class AlfInstancesStack extends cdk.Stack {
    constructor(app, id, props) {
        var _a, _b, _c, _d;
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
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        const dynamoStaticTable = new dynamodb.Table(this, staticTable.name, {
            partitionKey: {
                name: staticTable.primaryKey,
                type: dynamodb.AttributeType.STRING
            },
            tableName: staticTable.name,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        const dynamoRepoTable = new dynamodb.Table(this, repoTable.name, {
            partitionKey: {
                name: repoTable.primaryKey,
                type: dynamodb.AttributeType.NUMBER
            },
            tableName: repoTable.name,
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
            managedPolicies: [aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
        });
        role.addToPolicy(new aws_iam_1.PolicyStatement({
            resources: ['*'],
            actions: ['ec2:*', 'logs:*']
        }));
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
                REPO_TABLE: dynamoRepoTable.tableName,
                PRIMARY_KEY: repoTable.primaryKey,
                CI_USER_TOKEN: CI_USER_TOKEN,
                SECURITY_GROUP: 'default',
                STACK_NAME: this.stackName,
                IMAGE_ID: ((_a = props) === null || _a === void 0 ? void 0 : _a.imageId) || ''
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
        if ((_b = props) === null || _b === void 0 ? void 0 : _b.hodevCertArn) {
            const hodevcert = aws_certificatemanager_1.Certificate.fromCertificateArn(this, 'Certificate', props.hodevCertArn);
            // const domain = new apigateway.DomainName(this, 'custom-domain', {
            //   domainName: 'api.h-o.dev',
            //   certificate: hodevcert,
            //   // endpointType: apigw.EndpointType.EDGE, // default is REGIONAL
            //   securityPolicy: apigateway.SecurityPolicy.TLS_1_2
            // });
            api = new apigateway.RestApi(this, 'itemsApi', {
                restApiName: 'Alf Instance Service',
                description: 'An AWS Backed Service for providing Alfresco with custom domain',
                // domainName: {
                //   domainName: 'api.h-o.dev',
                //   certificate: hodevcert
                // },
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
            const domain = api.addDomainName('apiDomainName', {
                domainName: 'api.h-o.dev',
                certificate: hodevcert,
                // endpointType: apigw.EndpointType.EDGE, // default is REGIONAL
                securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
            });
            new route53.ARecord(this, 'CustomDomainAliasRecord', {
                zone: route53.HostedZone.fromHostedZoneAttributes(this, 'HodevHostedZoneId', { zoneName: 'h-o.dev.', hostedZoneId: 'Z00466842EKJWKXLA1RPG' }),
                target: route53.RecordTarget.fromAlias(new targets.ApiGateway(api))
            });
            domain.addBasePathMapping(api, { basePath: 'ab' });
            // domain.addBasePathMapping(api, {basePath: 'cd'});
        }
        else {
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
        const cfnApi = api.node.defaultChild;
        if (WITH_SWAGGER !== 'false') {
            // Upload Swagger to S3
            const fileAsset = new assets.Asset(this, 'SwaggerAsset', {
                path: path_1.join(__dirname, ((_c = props) === null || _c === void 0 ? void 0 : _c.swaggerFile) || '')
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
            .otherwise(waitX));
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
        const updateChain = sfn.Chain.start(updateItem);
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
            value: ((_d = api.domainName) === null || _d === void 0 ? void 0 : _d.domainName) || ''
        });
    }
}
exports.AlfInstancesStack = AlfInstancesStack;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHNEQUF1RDtBQUN2RCxrREFBbUQ7QUFDbkQsOERBQThEO0FBQzlELDhDQUErQztBQUMvQyxxQ0FBc0M7QUFDdEMsa0RBQW1EO0FBQ25ELDhEQUErRDtBQUMvRCxpREFBaUQ7QUFDakQsMENBQTJDO0FBQzNDLHdDQUF5QztBQUN6QywrQkFBNEI7QUFDNUIsOENBQWtFO0FBQ2xFLGdEQUFnRDtBQUNoRCx3REFBd0Q7QUFDeEQsNEVBQTZEO0FBRzdELE1BQU0sYUFBYSxHQUFHLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUMsQ0FBQztBQUNqRyxNQUFNLFdBQVcsR0FBRyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBQyxDQUFBO0FBQ2pFLE1BQU0sU0FBUyxHQUFHLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFDLENBQUE7QUFFN0QsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLElBQUksTUFBTSxDQUFBO0FBQ3ZELE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxJQUFJLEVBQUUsQ0FBQztBQVd0RCxNQUFhLGlCQUFrQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQzlDLFlBQVksR0FBWSxFQUFFLEVBQVUsRUFBRSxLQUE4Qjs7UUFDbEUsS0FBSyxDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFdEIsTUFBTSxXQUFXLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsSUFBSSxFQUFFO1lBQy9ELFlBQVksRUFBRTtnQkFDWixJQUFJLEVBQUUsYUFBYSxDQUFDLFVBQVU7Z0JBQzlC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LEVBQUUscUZBQXFGO0NBQ3BHLENBQUMsQ0FBQztBQUVILDJDQUEyQztBQUMzQyxvQkFBb0I7QUFDcEIsb0NBQW9DO0FBQ3BDLDBDQUEwQztBQUMxQyxPQUFPO0FBQ1Asa0NBQWtDO0FBQ2xDLHlDQUF5QztBQUN6QyxxRkFBcUY7QUFDckYsTUFBTTtBQUVOLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBhcGlnYXRld2F5ID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWFwaWdhdGV3YXknKTtcbmltcG9ydCBkeW5hbW9kYiA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1keW5hbW9kYicpO1xuLy8gaW1wb3J0IHsgR2xvYmFsVGFibGUgfSBmcm9tICdAYXdzLWNkay9hd3MtZHluYW1vZGItZ2xvYmFsJztcbmltcG9ydCBsYW1iZGEgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtbGFtYmRhJyk7XG5pbXBvcnQgY2RrID0gcmVxdWlyZSgnQGF3cy1jZGsvY29yZScpO1xuaW1wb3J0IHNmbiA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1zdGVwZnVuY3Rpb25zJyk7XG5pbXBvcnQgc2ZuX3Rhc2tzID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLXN0ZXBmdW5jdGlvbnMtdGFza3MnKTtcbmltcG9ydCBhc3NldHMgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtczMtYXNzZXRzJylcbmltcG9ydCBsb2dzID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWxvZ3MnKTtcbmltcG9ydCBpYW0gPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtaWFtJyk7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBNYW5hZ2VkUG9saWN5LCBQb2xpY3lTdGF0ZW1lbnQgfSBmcm9tICdAYXdzLWNkay9hd3MtaWFtJztcbmltcG9ydCAqIGFzIHJvdXRlNTMgZnJvbSAnQGF3cy1jZGsvYXdzLXJvdXRlNTMnO1xuaW1wb3J0ICogYXMgdGFyZ2V0cyBmcm9tICdAYXdzLWNkay9hd3Mtcm91dGU1My10YXJnZXRzJztcbmltcG9ydCB7IENlcnRpZmljYXRlIH0gZnJvbSAnQGF3cy1jZGsvYXdzLWNlcnRpZmljYXRlbWFuYWdlcidcblxuXG5jb25zdCBpbnN0YW5jZVRhYmxlID0geyBuYW1lOiAnYWxmSW5zdGFuY2VzJywgcHJpbWFyeUtleTogJ2FsZlVzZXJJZCcsIHNvcnRLZXk6ICdhbGZJbnN0YW5jZUlkJ307XG5jb25zdCBzdGF0aWNUYWJsZSA9IHsgbmFtZTogJ3N0YXRpY1RhYmxlJywgcHJpbWFyeUtleTogJ2l0ZW1zSWQnfVxuY29uc3QgcmVwb1RhYmxlID0geyBuYW1lOiAncmVwb1RhYmxlJywgcHJpbWFyeUtleTogJ2FsZlR5cGUnfVxuXG5jb25zdCBXSVRIX1NXQUdHRVIgPSBwcm9jZXNzLmVudi5XSVRIX1NXQUdHRVIgfHwgJ3RydWUnXG5jb25zdCBDSV9VU0VSX1RPS0VOID0gcHJvY2Vzcy5lbnYuQ0lfVVNFUl9UT0tFTiB8fCAnJztcblxuaW50ZXJmYWNlIEFsZkluc3RhbmNlc1N0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIGltYWdlSWQ/OiBzdHJpbmcsXG4gIHN3YWdnZXJGaWxlPzogc3RyaW5nLFxuICBlbmNyeXB0QnVja2V0PzogYm9vbGVhblxuICBob2RldkNlcnRBcm4/OiBzdHJpbmdcbiAgZW52aXJvbm1lbnQ6IHN0cmluZ1xuICBjdXN0b21Eb21haW4/OiB7Y2VydEFybjogc3RyaW5nLCBkb21haW5OYW1lOiBhcGlnYXRld2F5LkRvbWFpbk5hbWVPcHRpb25zfVxufVxuXG5leHBvcnQgY2xhc3MgQWxmSW5zdGFuY2VzU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25zdHJ1Y3RvcihhcHA6IGNkay5BcHAsIGlkOiBzdHJpbmcsIHByb3BzPzogQWxmSW5zdGFuY2VzU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKGFwcCwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IGR5bmFtb1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsIGluc3RhbmNlVGFibGUubmFtZSwge1xuICAgICAgcGFydGl0aW9uS2V5OiB7XG4gICAgICAgIG5hbWU6IGluc3RhbmNlVGFibGUucHJpbWFyeUtleSxcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkdcbiAgICAgIH0sXG4gICAgICBzb3J0S2V5OiB7XG4gICAgICAgIG5hbWU6IGluc3RhbmNlVGFibGUuc29ydEtleSxcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkdcbiAgICAgIH0sXG4gICAgICB0YWJsZU5hbWU6IGluc3RhbmNlVGFibGUubmFtZSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIE5PVCByZWNvbW1lbmRlZCBmb3IgcHJvZHVjdGlvbiBjb2RlXG4gICAgfSk7XG5cbiAgICBjb25zdCBkeW5hbW9TdGF0aWNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCBzdGF0aWNUYWJsZS5uYW1lLCB7XG4gICAgICBwYXJ0aXRpb25LZXk6IHtcbiAgICAgICAgbmFtZTogc3RhdGljVGFibGUucHJpbWFyeUtleSxcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkdcbiAgICAgIH0sXG4gICAgICB0YWJsZU5hbWU6IHN0YXRpY1RhYmxlLm5hbWUsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAvLyBOT1QgcmVjb21tZW5kZWQgZm9yIHByb2R1Y3Rpb24gY29kZVxuICAgIH0pO1xuXG4gICAgY29uc3QgZHluYW1vUmVwb1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsIHJlcG9UYWJsZS5uYW1lLCB7XG4gICAgICBwYXJ0aXRpb25LZXk6IHtcbiAgICAgICAgbmFtZTogcmVwb1RhYmxlLnByaW1hcnlLZXksXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSXG4gICAgICB9LFxuICAgICAgdGFibGVOYW1lOiByZXBvVGFibGUubmFtZSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIE5PVCByZWNvbW1lbmRlZCBmb3IgcHJvZHVjdGlvbiBjb2RlXG4gICAgfSk7XG5cbiAgICBjb25zdCBnZXRPbmVMYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdnZXRPbmVJdGVtRnVuY3Rpb24nLCB7XG4gICAgICBjb2RlOiBuZXcgbGFtYmRhLkFzc2V0Q29kZSgnc3JjJyksXG4gICAgICBoYW5kbGVyOiAnZ2V0LW9uZS5oYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVEFCTEVfTkFNRTogZHluYW1vVGFibGUudGFibGVOYW1lLFxuICAgICAgICBQUklNQVJZX0tFWTogaW5zdGFuY2VUYWJsZS5wcmltYXJ5S2V5LFxuICAgICAgICBTT1JUX0tFWTogaW5zdGFuY2VUYWJsZS5zb3J0S2V5XG4gICAgICB9LFxuICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX0RBWSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGdldEFsbExhbWJkYSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ2dldEFsbEl0ZW1zRnVuY3Rpb24nLCB7XG4gICAgICBjb2RlOiBuZXcgbGFtYmRhLkFzc2V0Q29kZSgnc3JjJyksXG4gICAgICBoYW5kbGVyOiAnZ2V0LWFsbC5oYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVEFCTEVfTkFNRTogZHluYW1vVGFibGUudGFibGVOYW1lLFxuICAgICAgICBQUklNQVJZX0tFWTogaW5zdGFuY2VUYWJsZS5wcmltYXJ5S2V5XG4gICAgICB9LFxuICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX0RBWSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ1JvbGUnLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnbGFtYmRhLmFtYXpvbmF3cy5jb20nKSwgICAvLyByZXF1aXJlZFxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUnKV0sXG4gICAgfSk7XG5cbiAgICByb2xlLmFkZFRvUG9saWN5KG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgcmVzb3VyY2VzOiBbJyonXSxcbiAgICAgIGFjdGlvbnM6IFsnZWMyOionLCAnbG9nczoqJ10gfSkpO1xuXG4gICAgY29uc3QgZ2V0QWxsSW5zdGFuY2VzTGFtYmRhID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnZ2V0QWxsSW5zdGFuY2VzRnVuY3Rpb24nLCB7XG4gICAgICBjb2RlOiBuZXcgbGFtYmRhLkFzc2V0Q29kZSgnc3JjJyksXG4gICAgICBoYW5kbGVyOiAnZ2V0LWFsbC1pbnN0YW5jZXMuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFBSSU1BUllfS0VZOiBpbnN0YW5jZVRhYmxlLnByaW1hcnlLZXksXG4gICAgICAgIFNPUlRfS0VZOiBpbnN0YW5jZVRhYmxlLnNvcnRLZXksXG4gICAgICAgIFNUQUNLX05BTUU6IHRoaXMuc3RhY2tOYW1lXG4gICAgICB9LFxuICAgICAgcm9sZTogcm9sZSxcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9EQVksXG4gICAgfSk7XG5cbiAgICBjb25zdCBkZWxldGVPbmUgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdkZWxldGVJdGVtRnVuY3Rpb24nLCB7XG4gICAgICBjb2RlOiBuZXcgbGFtYmRhLkFzc2V0Q29kZSgnc3JjJyksXG4gICAgICBoYW5kbGVyOiAnZGVsZXRlLW9uZS5oYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVEFCTEVfTkFNRTogZHluYW1vVGFibGUudGFibGVOYW1lLFxuICAgICAgICBQUklNQVJZX0tFWTogaW5zdGFuY2VUYWJsZS5wcmltYXJ5S2V5LFxuICAgICAgICBTT1JUX0tFWTogaW5zdGFuY2VUYWJsZS5zb3J0S2V5XG4gICAgICB9LFxuICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX0RBWSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHB1dE9uZUl0ZW1MYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdwdXRPbmVJdGVtJywge1xuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ2NyZWF0ZS5oYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVEFCTEVfTkFNRTogZHluYW1vVGFibGUudGFibGVOYW1lLFxuICAgICAgICBQUklNQVJZX0tFWTogaW5zdGFuY2VUYWJsZS5wcmltYXJ5S2V5LFxuICAgICAgICBTT1JUX0tFWTogaW5zdGFuY2VUYWJsZS5zb3J0S2V5XG4gICAgICB9LFxuICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX0RBWSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGNyZWF0ZUluc3RhbmNlTGFtYmRhID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnY3JlYXRlSW5zdGFuY2UnLCB7XG4gICAgICBjb2RlOiBuZXcgbGFtYmRhLkFzc2V0Q29kZSgnc3JjJyksXG4gICAgICBoYW5kbGVyOiAnY3JlYXRlLWluc3RhbmNlLmhhbmRsZXInLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEwX1gsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBSRVBPX1RBQkxFIDogZHluYW1vUmVwb1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUFJJTUFSWV9LRVk6IHJlcG9UYWJsZS5wcmltYXJ5S2V5LFxuICAgICAgICBDSV9VU0VSX1RPS0VOOiBDSV9VU0VSX1RPS0VOLFxuICAgICAgICBTRUNVUklUWV9HUk9VUDogJ2RlZmF1bHQnLFxuICAgICAgICBTVEFDS19OQU1FOiB0aGlzLnN0YWNrTmFtZSxcbiAgICAgICAgSU1BR0VfSUQ6IHByb3BzPy5pbWFnZUlkIHx8ICcnXG4gICAgICB9LFxuICAgICAgcm9sZTogcm9sZSxcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9EQVksXG4gICAgfSk7XG5cbiAgICBkeW5hbW9UYWJsZS5ncmFudEZ1bGxBY2Nlc3MoZ2V0QWxsTGFtYmRhKTtcbiAgICBkeW5hbW9UYWJsZS5ncmFudEZ1bGxBY2Nlc3MoZ2V0T25lTGFtYmRhKTtcbiAgICBkeW5hbW9UYWJsZS5ncmFudEZ1bGxBY2Nlc3MocHV0T25lSXRlbUxhbWJkYSk7XG4gICAgZHluYW1vVGFibGUuZ3JhbnRGdWxsQWNjZXNzKGRlbGV0ZU9uZSk7XG5cbiAgICBkeW5hbW9SZXBvVGFibGUuZ3JhbnRGdWxsQWNjZXNzKGNyZWF0ZUluc3RhbmNlTGFtYmRhKTtcblxuICAgIHZhciBhcGk7XG5cbiAgICBpZihwcm9wcz8uaG9kZXZDZXJ0QXJuKXtcbiAgICAgIGNvbnN0IGhvZGV2Y2VydCA9IENlcnRpZmljYXRlLmZyb21DZXJ0aWZpY2F0ZUFybih0aGlzLCAnQ2VydGlmaWNhdGUnLCBwcm9wcy5ob2RldkNlcnRBcm4pO1xuXG4gICAgICAvLyBjb25zdCBkb21haW4gPSBuZXcgYXBpZ2F0ZXdheS5Eb21haW5OYW1lKHRoaXMsICdjdXN0b20tZG9tYWluJywge1xuICAgICAgLy8gICBkb21haW5OYW1lOiAnYXBpLmgtby5kZXYnLFxuICAgICAgLy8gICBjZXJ0aWZpY2F0ZTogaG9kZXZjZXJ0LFxuICAgICAgLy8gICAvLyBlbmRwb2ludFR5cGU6IGFwaWd3LkVuZHBvaW50VHlwZS5FREdFLCAvLyBkZWZhdWx0IGlzIFJFR0lPTkFMXG4gICAgICAvLyAgIHNlY3VyaXR5UG9saWN5OiBhcGlnYXRld2F5LlNlY3VyaXR5UG9saWN5LlRMU18xXzJcbiAgICAgIC8vIH0pO1xuXG4gICAgICBhcGkgPSBuZXcgYXBpZ2F0ZXdheS5SZXN0QXBpKHRoaXMsICdpdGVtc0FwaScsIHtcbiAgICAgICAgcmVzdEFwaU5hbWU6ICdBbGYgSW5zdGFuY2UgU2VydmljZScsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnQW4gQVdTIEJhY2tlZCBTZXJ2aWNlIGZvciBwcm92aWRpbmcgQWxmcmVzY28gd2l0aCBjdXN0b20gZG9tYWluJyxcbiAgICAgICAgLy8gZG9tYWluTmFtZToge1xuICAgICAgICAvLyAgIGRvbWFpbk5hbWU6ICdhcGkuaC1vLmRldicsXG4gICAgICAgIC8vICAgY2VydGlmaWNhdGU6IGhvZGV2Y2VydFxuICAgICAgICAvLyB9LFxuICAgICAgICBkZWZhdWx0Q29yc1ByZWZsaWdodE9wdGlvbnM6IHtcbiAgICAgICAgICBhbGxvd09yaWdpbnM6IGFwaWdhdGV3YXkuQ29ycy5BTExfT1JJR0lOUyxcbiAgICAgICAgICBhbGxvd01ldGhvZHM6IGFwaWdhdGV3YXkuQ29ycy5BTExfTUVUSE9EUyAvLyB0aGlzIGlzIGFsc28gdGhlIGRlZmF1bHRcbiAgICAgICAgfSxcbiAgICAgICAgLy8gZGVwbG95T3B0aW9uczoge1xuICAgICAgICAvLyAgIGxvZ2dpbmdMZXZlbDogYXBpZ2F0ZXdheS5NZXRob2RMb2dnaW5nTGV2ZWwuSU5GTyxcbiAgICAgICAgLy8gICBkYXRhVHJhY2VFbmFibGVkOiB0cnVlXG4gICAgICAgIC8vIH1cbiAgICAgICAgZW5kcG9pbnRUeXBlczogW2FwaWdhdGV3YXkuRW5kcG9pbnRUeXBlLlJFR0lPTkFMXVxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IGRvbWFpbiA9IGFwaS5hZGREb21haW5OYW1lKCdhcGlEb21haW5OYW1lJywge1xuICAgICAgICBkb21haW5OYW1lOiAnYXBpLmgtby5kZXYnLFxuICAgICAgICBjZXJ0aWZpY2F0ZTogaG9kZXZjZXJ0LFxuICAgICAgICAvLyBlbmRwb2ludFR5cGU6IGFwaWd3LkVuZHBvaW50VHlwZS5FREdFLCAvLyBkZWZhdWx0IGlzIFJFR0lPTkFMXG4gICAgICAgIHNlY3VyaXR5UG9saWN5OiBhcGlnYXRld2F5LlNlY3VyaXR5UG9saWN5LlRMU18xXzIsXG4gICAgICB9KTtcblxuICAgICAgbmV3IHJvdXRlNTMuQVJlY29yZCh0aGlzLCAnQ3VzdG9tRG9tYWluQWxpYXNSZWNvcmQnLCB7XG4gICAgICAgIHpvbmU6IHJvdXRlNTMuSG9zdGVkWm9uZS5mcm9tSG9zdGVkWm9uZUF0dHJpYnV0ZXModGhpcywgJ0hvZGV2SG9zdGVkWm9uZUlkJywge3pvbmVOYW1lOiAnaC1vLmRldi4nLCBob3N0ZWRab25lSWQ6ICdaMDA0NjY4NDJFS0pXS1hMQTFSUEcnfSksXG4gICAgICAgIHRhcmdldDogcm91dGU1My5SZWNvcmRUYXJnZXQuZnJvbUFsaWFzKG5ldyB0YXJnZXRzLkFwaUdhdGV3YXkoYXBpKSlcbiAgICAgIH0pO1xuXG4gICAgICBkb21haW4uYWRkQmFzZVBhdGhNYXBwaW5nKGFwaSwge2Jhc2VQYXRoOiAnYWInfSk7XG4gICAgICAvLyBkb21haW4uYWRkQmFzZVBhdGhNYXBwaW5nKGFwaSwge2Jhc2VQYXRoOiAnY2QnfSk7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgYXBpID0gbmV3IGFwaWdhdGV3YXkuUmVzdEFwaSh0aGlzLCAnaXRlbXNBcGknLCB7XG4gICAgICAgIHJlc3RBcGlOYW1lOiAnQWxmIEluc3RhbmNlIFNlcnZpY2UnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ0FuIEFXUyBCYWNrZWQgU2VydmljZSBmb3IgcHJvdmlkaW5nIEFsZnJlc2NvIHdpdGhvdXQgY3VzdG9tIGRvbWFpbicsXG4gICAgICAgIC8vIGRlcGxveU9wdGlvbnM6IHtcbiAgICAgICAgLy8gICBsb2dnaW5nTGV2ZWw6IGFwaWdhdGV3YXkuTWV0aG9kTG9nZ2luZ0xldmVsLklORk8sXG4gICAgICAgIC8vICAgZGF0YVRyYWNlRW5hYmxlZDogdHJ1ZVxuICAgICAgICAvLyB9XG4gICAgICAgIGRlZmF1bHRDb3JzUHJlZmxpZ2h0T3B0aW9uczoge1xuICAgICAgICAgIGFsbG93T3JpZ2luczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9PUklHSU5TLFxuICAgICAgICAgIGFsbG93TWV0aG9kczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9NRVRIT0RTIC8vIHRoaXMgaXMgYWxzbyB0aGUgZGVmYXVsdFxuICAgICAgICB9LFxuICAgICAgICBlbmRwb2ludFR5cGVzOiBbYXBpZ2F0ZXdheS5FbmRwb2ludFR5cGUuUkVHSU9OQUxdXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBjZm5BcGkgPSBhcGkubm9kZS5kZWZhdWx0Q2hpbGQgYXMgYXBpZ2F0ZXdheS5DZm5SZXN0QXBpO1xuXG4gICAgaWYoV0lUSF9TV0FHR0VSICE9PSAnZmFsc2UnKXtcbiAgICAgIC8vIFVwbG9hZCBTd2FnZ2VyIHRvIFMzXG4gICAgICBjb25zdCBmaWxlQXNzZXQgPSBuZXcgYXNzZXRzLkFzc2V0KHRoaXMsICdTd2FnZ2VyQXNzZXQnLCB7XG4gICAgICAgIHBhdGg6IGpvaW4oX19kaXJuYW1lLCBwcm9wcz8uc3dhZ2dlckZpbGUgfHwgJycpXG4gICAgICB9KTtcbiAgICAgIGNmbkFwaS5ib2R5UzNMb2NhdGlvbiA9IHsgYnVja2V0OiBmaWxlQXNzZXQuYnVja2V0LmJ1Y2tldE5hbWUsIGtleTogZmlsZUFzc2V0LnMzT2JqZWN0S2V5IH07XG4gICAgfVxuXG4gICAgY29uc3QgaXRlbXMgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgnaXRlbXMnKTtcbiAgICBjb25zdCBnZXRBbGxJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGdldEFsbExhbWJkYSk7XG4gICAgaXRlbXMuYWRkTWV0aG9kKCdHRVQnLCBnZXRBbGxJbnRlZ3JhdGlvbik7XG5cbiAgICBjb25zdCBpbnN0YW5jZXMgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgnaW5zdGFuY2VzJyk7XG4gICAgY29uc3QgZ2V0QWxsSW5zdGFuY2VzSW50ZWdyYXRpb24gPSBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihnZXRBbGxJbnN0YW5jZXNMYW1iZGEpO1xuICAgIGluc3RhbmNlcy5hZGRNZXRob2QoJ0dFVCcsIGdldEFsbEluc3RhbmNlc0ludGVncmF0aW9uKTtcblxuICAgIGNvbnN0IHNpbmdsZUl0ZW0gPSBpdGVtcy5hZGRSZXNvdXJjZShgeyR7aW5zdGFuY2VUYWJsZS5zb3J0S2V5fX1gKTtcbiAgICBjb25zdCBnZXRPbmVJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGdldE9uZUxhbWJkYSk7XG4gICAgc2luZ2xlSXRlbS5hZGRNZXRob2QoJ0dFVCcsIGdldE9uZUludGVncmF0aW9uKTtcblxuICAgIGNvbnN0IGRlbGV0ZU9uZUludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZGVsZXRlT25lKTtcbiAgICBzaW5nbGVJdGVtLmFkZE1ldGhvZCgnREVMRVRFJywgZGVsZXRlT25lSW50ZWdyYXRpb24pO1xuICAgIC8vIGFkZENvcnNPcHRpb25zKHNpbmdsZUl0ZW0pO1xuXG4gICAgY29uc3QgY2hlY2tDcmVhdGlvbkFsbG93YW5jZUxhbWJkYSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ2NoZWNrQ3JlYXRpb25BbGxvd2FuY2VMYW1iZGEnLCB7XG4gICAgICBjb2RlOiBuZXcgbGFtYmRhLkFzc2V0Q29kZSgnc3JjJyksXG4gICAgICBoYW5kbGVyOiAnY2hlY2stY3JlYXRpb24tYWxsb3dhbmNlLmhhbmRsZXInLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEwX1gsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBUQUJMRV9OQU1FOiBkeW5hbW9UYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFRBQkxFX1NUQVRJQ19OQU1FOiBkeW5hbW9TdGF0aWNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFBSSU1BUllfS0VZOiBpbnN0YW5jZVRhYmxlLnByaW1hcnlLZXksXG4gICAgICB9LFxuICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX0RBWSxcbiAgICB9KTtcblxuICAgIGR5bmFtb1RhYmxlLmdyYW50RnVsbEFjY2VzcyhjaGVja0NyZWF0aW9uQWxsb3dhbmNlTGFtYmRhKTtcblxuICAgIC8vIENvbmZpZ3VyZSBsb2cgZ3JvdXAgZm9yIHNob3J0IHJldGVudGlvblxuICAgIGNvbnN0IGxvZ0dyb3VwID0gbmV3IGxvZ3MuTG9nR3JvdXAodGhpcywgJ0xvZ0dyb3VwJywge1xuICAgICAgcmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX0RBWSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBsb2dHcm91cE5hbWU6ICcvYXdzL2xhbWJkYS9jdXN0b20vJyArIHRoaXMuc3RhY2tOYW1lXG4gICAgfSk7XG5cbiAgICBjb25zdCBsZ3N0cmVhbSA9IGxvZ0dyb3VwLmFkZFN0cmVhbSgnbXlsb2dncm91cFN0cmVhbScpXG5cbiAgICAvLyBsb2dHcm91cC5hZGRTdWJzY3JpcHRpb25GaWx0ZXIoaWQ9J215bG9nZ3JvdXBfc3ViczEnLCB7XG4gICAgLy8gICAgIGRlc3RpbmF0aW9uOiBuZXcgTGFtYmRhRGVzdGluYXRpb24oY3JlYXRlT25lTGFtYmRhKSxcbiAgICAvLyAgICAgLy8gZmlsdGVyUGF0dGVybjogbG9nc0Rlc3RpbmF0aW9ucy5GaWx0ZXJQYXR0ZXJuLmFsbFRlcm1zKFwiRVJST1JcIiwgXCJNYWluVGhyZWFkXCIpXG4gICAgLy8gICAgIGZpbHRlclBhdHRlcm46IGxvZ3MuRmlsdGVyUGF0dGVybi5hbGxFdmVudHMoKSxcbiAgICAvLyAgIH0pO1xuXG4gICAgLy8gbmV3IGxvZ3MuU3Vic2NyaXB0aW9uRmlsdGVyKHRoaXMsICdteS1zdWJzMScsIHtcbiAgICAvLyAgIGRlc3RpbmF0aW9uOiBuZXcgTGFtYmRhRGVzdGluYXRpb24oY3JlYXRlT25lTGFtYmRhKSxcbiAgICAvLyAgIGZpbHRlclBhdHRlcm46IGxvZ3MuRmlsdGVyUGF0dGVybi5hbGxFdmVudHMoKSxcbiAgICAvLyAgIGxvZ0dyb3VwOiBsb2dHcm91cCxcbiAgICAvLyB9KTtcblxuXG4gICAgLy8gIGNyZWF0ZU9uZUxhbWJkYS5hZGRQZXJtaXNzaW9uKFxuICAgIC8vICAgaWQ9J215bGFtYmRhZnVuY3Rpb24taW52b2tlJywge1xuICAgIC8vICAgICBwcmluY2lwYWw6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnbG9ncy5ldS13ZXN0LTIuYW1hem9uYXdzLmNvbScpLFxuICAgIC8vICAgICBhY3Rpb246ICdsYW1iZGE6SW52b2tlRnVuY3Rpb24nLFxuICAgIC8vICAgICBzb3VyY2VBcm46IGxvZ0dyb3VwLmxvZ0dyb3VwQXJuXG4gICAgLy8gICB9KVxuXG4gICAgLy8gIGxvZ0dyb3VwLmdyYW50V3JpdGUoY3JlYXRlT25lTGFtYmRhKTtcblxuICAgIC8vIGNvbnN0IGNoZWNrSm9iQWN0aXZpdHkgPSBuZXcgc2ZuLkFjdGl2aXR5KHRoaXMsICdDaGVja0pvYicpO1xuXG4gICAgY29uc3QgY2hlY2tDcmVhdGlvbkFsbG93YW5jZSA9IG5ldyBzZm4uVGFzayh0aGlzLCAnQ2hlY2sgQ3JlYXRpb24gQWxsb3dhbmNlJywge1xuICAgICAgdGFzazogbmV3IHNmbl90YXNrcy5JbnZva2VGdW5jdGlvbihjaGVja0NyZWF0aW9uQWxsb3dhbmNlTGFtYmRhKSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGluc2VydEl0ZW0gPSBuZXcgc2ZuLlRhc2sodGhpcywgJ0NyZWF0ZSBJdGVtJywge1xuICAgICAgdGFzazogbmV3IHNmbl90YXNrcy5JbnZva2VGdW5jdGlvbihwdXRPbmVJdGVtTGFtYmRhKSxcbiAgICAgIGlucHV0UGF0aDogJyQuaXRlbSdcbiAgICB9KTtcblxuICAgIGNvbnN0IGNyZWF0ZUluc3RhbmNlID0gbmV3IHNmbi5UYXNrKHRoaXMsICdDcmVhdGUgSW5zdGFuY2UnLCB7XG4gICAgICB0YXNrOiBuZXcgc2ZuX3Rhc2tzLkludm9rZUZ1bmN0aW9uKGNyZWF0ZUluc3RhbmNlTGFtYmRhKSxcbiAgICAgIGlucHV0UGF0aDogJyQuaXRlbSdcbiAgICB9KTtcblxuICAgIC8vIGNvbnN0IGNyZWF0ZWRJbnN0YW5jZVVwZGF0ZSA9IG5ldyBzZm4uVGFzayh0aGlzLCAnQ3JlYXRlZCBJbnN0YW5jZSBVcGRhdGUnLCB7XG4gICAgLy8gICB0YXNrOiBuZXcgc2ZuX3Rhc2tzLkludm9rZUZ1bmN0aW9uKGNyZWF0ZU9uZUxhbWJkYSksXG4gICAgLy8gICBpbnB1dFBhdGg6ICckLml0ZW0nXG4gICAgLy8gfSk7XG5cbiAgICBjb25zdCB3YWl0WCA9IG5ldyBzZm4uV2FpdCh0aGlzLCAnV2FpdCBYIFNlY29uZHMnLCB7XG4gICAgICB0aW1lOiBzZm4uV2FpdFRpbWUuZHVyYXRpb24oY2RrLkR1cmF0aW9uLnNlY29uZHMoNSkpLFxuICAgIH0pO1xuXG4gICAgLy8gY29uc3QgZ2V0U3RhdHVzID0gbmV3IHNmbi5UYXNrKHRoaXMsICdHZXQgSm9iIFN0YXR1cycsIHtcbiAgICAvLyAgIHRhc2s6IG5ldyBzZm5fdGFza3MuSW52b2tlQWN0aXZpdHkoY2hlY2tKb2JBY3Rpdml0eSksXG4gICAgLy8gICBpbnB1dFBhdGg6ICckLmd1aWQnLFxuICAgIC8vICAgcmVzdWx0UGF0aDogJyQuc3RhdHVzJyxcbiAgICAvLyB9KTtcbiAgICBjb25zdCBpc0FsbG93ZWQgPSBuZXcgc2ZuLkNob2ljZSh0aGlzLCAnQ3JlYXRpb24gQWxsb3dlZD8nKTtcbiAgICBjb25zdCBub3RBbGxvd2VkID0gbmV3IHNmbi5GYWlsKHRoaXMsICdOb3QgQWxsb3dlZCcsIHtcbiAgICAgIGNhdXNlOiAnQ3JlYXRpb24gZmFpbGVkJyxcbiAgICAgIGVycm9yOiAnSm9iIHJldHVybmVkIGZhaWxlZCcsXG4gICAgfSk7XG5cbiAgICAvLyBjb25zdCBmaW5hbFN0YXR1cyA9IG5ldyBzZm4uVGFzayh0aGlzLCAnR2V0IEZpbmFsIEpvYiBTdGF0dXMnLCB7XG4gICAgLy8gICB0YXNrOiBuZXcgc2ZuX3Rhc2tzLkludm9rZUFjdGl2aXR5KGNoZWNrSm9iQWN0aXZpdHkpLFxuICAgIC8vICAgaW5wdXRQYXRoOiAnJC5ndWlkJyxcbiAgICAvLyB9KTtcblxuICAgIGNvbnN0IGNyZWF0aW9uQ2hhaW4gPSBzZm4uQ2hhaW4uc3RhcnQoY2hlY2tDcmVhdGlvbkFsbG93YW5jZSlcbiAgICAgIC5uZXh0KGlzQWxsb3dlZFxuICAgICAgLndoZW4oc2ZuLkNvbmRpdGlvbi5zdHJpbmdFcXVhbHMoJyQucmVzdWx0JywgJ2ZhaWxlZCcpLCBub3RBbGxvd2VkKVxuICAgICAgLndoZW4oc2ZuLkNvbmRpdGlvbi5zdHJpbmdFcXVhbHMoJyQucmVzdWx0JywgJ29rJyksIGluc2VydEl0ZW0ubmV4dChjcmVhdGVJbnN0YW5jZSkpXG4gICAgICAub3RoZXJ3aXNlKHdhaXRYKSApO1xuICAgIC8vIC5uZXh0KGdldFN0YXR1cylcbiAgICAvLyAubmV4dChcbiAgICAvLyAgIGlzQ29tcGxldGVcbiAgICAvLyAgICAgLndoZW4oc2ZuLkNvbmRpdGlvbi5zdHJpbmdFcXVhbHMoJyQuc3RhdHVzJywgJ0ZBSUxFRCcpLCBqb2JGYWlsZWQpXG4gICAgLy8gICAgIC53aGVuKHNmbi5Db25kaXRpb24uc3RyaW5nRXF1YWxzKCckLnN0YXR1cycsICdTVUNDRUVERUQnKSwgZmluYWxTdGF0dXMpXG4gICAgLy8gICAgIC5vdGhlcndpc2Uod2FpdFgpLFxuICAgIC8vICk7XG5cbiAgICBjb25zdCB1cGRhdGVJdGVtID0gbmV3IHNmbi5UYXNrKHRoaXMsICdVcGRhdGUgSXRlbScsIHtcbiAgICAgIHRhc2s6IG5ldyBzZm5fdGFza3MuSW52b2tlRnVuY3Rpb24ocHV0T25lSXRlbUxhbWJkYSksXG4gICAgICBpbnB1dFBhdGg6ICckLml0ZW0nXG4gICAgfSk7XG5cbiAgICBjb25zdCB1cGRhdGVDaGFpbiA9IHNmbi5DaGFpbi5zdGFydCh1cGRhdGVJdGVtKVxuXG4gICAgY29uc3QgY3JlYXRlU3RhdGVNYWNoaW5lID0gbmV3IHNmbi5TdGF0ZU1hY2hpbmUodGhpcywgJ0NyZWF0ZVN0YXRlTWFjaGluZScsIHtcbiAgICAgIGRlZmluaXRpb246IGNyZWF0aW9uQ2hhaW4sXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSk7XG5cbiAgICBjb25zdCB1cGRhdGVTdGF0ZU1hY2hpbmUgPSBuZXcgc2ZuLlN0YXRlTWFjaGluZSh0aGlzLCAnVXBkYXRlU3RhdGVNYWNoaW5lJywge1xuICAgICAgZGVmaW5pdGlvbjogdXBkYXRlQ2hhaW4sXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSk7XG5cbiAgICBjb25zdCBjcmVhdGVPbmVBcGkgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdjcmVhdGVJdGVtRnVuY3Rpb25BcGknLCB7XG4gICAgICBjb2RlOiBuZXcgbGFtYmRhLkFzc2V0Q29kZSgnc3JjJyksXG4gICAgICBoYW5kbGVyOiAnY3JlYXRlLWFwaS5oYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgU1RBVEVfTUFDSElORV9BUk46IGNyZWF0ZVN0YXRlTWFjaGluZS5zdGF0ZU1hY2hpbmVBcm4sXG4gICAgICAgIFNPUlRfS0VZOiBpbnN0YW5jZVRhYmxlLnNvcnRLZXlcbiAgICAgIH0sXG4gICAgICBsb2dSZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfREFZLFxuICAgIH0pO1xuXG4gICAgY29uc3QgdXBkYXRlT25lQXBpID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAndXBkYXRlSXRlbUZ1bmN0aW9uJywge1xuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ3VwZGF0ZS1vbmUuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFNUQVRFX01BQ0hJTkVfQVJOOiB1cGRhdGVTdGF0ZU1hY2hpbmUuc3RhdGVNYWNoaW5lQXJuLFxuICAgICAgICBTT1JUX0tFWTogaW5zdGFuY2VUYWJsZS5zb3J0S2V5XG4gICAgICB9LFxuICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX0RBWSxcbiAgICB9KTtcblxuICAgIGNyZWF0ZVN0YXRlTWFjaGluZS5ncmFudFN0YXJ0RXhlY3V0aW9uKGNyZWF0ZU9uZUFwaSk7XG4gICAgdXBkYXRlU3RhdGVNYWNoaW5lLmdyYW50U3RhcnRFeGVjdXRpb24odXBkYXRlT25lQXBpKTtcblxuICAgIGNvbnN0IGNyZWF0ZU9uZUludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY3JlYXRlT25lQXBpKTtcblxuICAgIGl0ZW1zLmFkZE1ldGhvZCgnUE9TVCcsIGNyZWF0ZU9uZUludGVncmF0aW9uKTtcbiAgICAvLyBhZGRDb3JzT3B0aW9ucyhpdGVtcyk7XG5cbiAgICBjb25zdCB1cGRhdGVPbmVJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHVwZGF0ZU9uZUFwaSk7XG4gICAgc2luZ2xlSXRlbS5hZGRNZXRob2QoJ1BVVCcsIHVwZGF0ZU9uZUludGVncmF0aW9uKTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdUYWJsZU5hbWUnLCB7XG4gICAgICB2YWx1ZTogZHluYW1vVGFibGUudGFibGVOYW1lXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUmVwb1RhYmxlTmFtZScsIHtcbiAgICAgIHZhbHVlOiBkeW5hbW9SZXBvVGFibGUudGFibGVOYW1lXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUmVzdEFwaUVuZFBvaW50Jywge1xuICAgICAgdmFsdWU6IGFwaS51cmxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdSZXN0QXBpSWQnLCB7XG4gICAgICB2YWx1ZTogYXBpLnJlc3RBcGlJZFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0xvZ0dyb3VwTmFtZScsIHtcbiAgICAgIHZhbHVlOiBsb2dHcm91cC5sb2dHcm91cE5hbWVcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdMb2dHcm91cFN0cmVhbU5hbWUnLCB7XG4gICAgICB2YWx1ZTogbGdzdHJlYW0ubG9nU3RyZWFtTmFtZVxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0xHR3JvdXBkQ3JlYXRlQXBpJywge1xuICAgICAgdmFsdWU6IGNyZWF0ZU9uZUFwaS5sb2dHcm91cC5sb2dHcm91cE5hbWVcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdMR0dyb3VwZENyZWF0ZScsIHtcbiAgICAgIHZhbHVlOiBwdXRPbmVJdGVtTGFtYmRhLmxvZ0dyb3VwLmxvZ0dyb3VwTmFtZVxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0xHR3JvdXBkQ3JlYXRlSW5zdGFuY2UnLCB7XG4gICAgICB2YWx1ZTogY3JlYXRlSW5zdGFuY2VMYW1iZGEubG9nR3JvdXAubG9nR3JvdXBOYW1lXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpRG9tYWluTmFtZScsIHtcbiAgICAgIHZhbHVlOiBhcGkuZG9tYWluTmFtZT8uZG9tYWluTmFtZSB8fCAnJ1xuICAgIH0pO1xuXG4gIH1cbn1cblxuLy8gZXhwb3J0IGZ1bmN0aW9uIGFkZENvcnNPcHRpb25zKGFwaVJlc291cmNlOiBhcGlnYXRld2F5LklSZXNvdXJjZSkge1xuLy8gICBhcGlSZXNvdXJjZS5hZGRNZXRob2QoXG4vLyAgICAgJ09QVElPTlMnLFxuLy8gICAgIG5ldyBhcGlnYXRld2F5Lk1vY2tJbnRlZ3JhdGlvbih7XG4vLyAgICAgICBpbnRlZ3JhdGlvblJlc3BvbnNlczogW1xuLy8gICAgICAgICB7XG4vLyAgICAgICAgICAgc3RhdHVzQ29kZTogJzIwMCcsXG4vLyAgICAgICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4vLyAgICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzpcbi8vICAgICAgICAgICAgICAgXCInQ29udGVudC1UeXBlLFgtQW16LURhdGUsQXV0aG9yaXphdGlvbixYLUFwaS1LZXksWC1BbXotU2VjdXJpdHktVG9rZW4sWC1BbXotVXNlci1BZ2VudCdcIixcbi8vICAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IFwiJyonXCIsXG4vLyAgICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1DcmVkZW50aWFscyc6IFwiJ2ZhbHNlJ1wiLFxuLy8gICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6IFwiJ09QVElPTlMsR0VULFBVVCxQT1NULERFTEVURSdcIixcbi8vICAgICAgICAgICB9LFxuLy8gICAgICAgICB9LFxuLy8gICAgICAgXSxcbi8vICAgICAgIHBhc3N0aHJvdWdoQmVoYXZpb3I6IGFwaWdhdGV3YXkuUGFzc3Rocm91Z2hCZWhhdmlvci5ORVZFUixcbi8vICAgICAgIHJlcXVlc3RUZW1wbGF0ZXM6IHtcbi8vICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiAne1wic3RhdHVzQ29kZVwiOiAyMDB9Jyxcbi8vICAgICAgIH0sXG4vLyAgICAgfSksXG4vLyAgICAge1xuLy8gICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbXG4vLyAgICAgICAgIHtcbi8vICAgICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcbi8vICAgICAgICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcbi8vICAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiB0cnVlLFxuLy8gICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6IHRydWUsXG4vLyAgICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1DcmVkZW50aWFscyc6IHRydWUsXG4vLyAgICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiB0cnVlLFxuLy8gICAgICAgICAgIH0sXG4vLyAgICAgICAgIH0sXG4vLyAgICAgICBdLFxuLy8gICAgIH0sXG4vLyAgICk7XG4vLyB9XG5cbmNvbnN0IGFwcCA9IG5ldyBjZGsuQXBwKCk7XG5cbi8vIG5ldyBBbGZJbnN0YW5jZXNTdGFjayhhcHAsIFwiQWxmSW5zdGFuY2VzU3RhY2tFdVdlc3QxXCIsIHtcbi8vICAgICBlbnZpcm9ubWVudDogJ3Byb2QnLFxuLy8gICAgIGVudjoge1xuLy8gICAgICAgcmVnaW9uOiBcImV1LXdlc3QtMVwiXG4vLyAgICAgfSxcbi8vICAgICBpbWFnZUlkOiAnYW1pLTA0ZDVjYzliODhmOWQxZDM5Jyxcbi8vICAgICBzd2FnZ2VyRmlsZTogJ3RtcC9zd2FnZ2VyX2Z1bGxfLnlhbWwnXG4vLyAgIH0pO1xuXG5uZXcgQWxmSW5zdGFuY2VzU3RhY2soYXBwLCBcIkFsZkluc3RhbmNlc1N0YWNrRXVXZXN0MlwiLCB7XG4gIGVudmlyb25tZW50OiAnZGV2JyxcbiAgZW52OiB7XG4gICAgcmVnaW9uOiBcImV1LXdlc3QtMlwiXG4gIH0sXG4gIGltYWdlSWQ6ICdhbWktMGNiNzkwMzA4Zjc1OTFmYTYnLFxuICBzd2FnZ2VyRmlsZTogJ3RtcC9zd2FnZ2VyX2Z1bGwueWFtbCcsXG4gIGhvZGV2Q2VydEFybjogJ2Fybjphd3M6YWNtOmV1LXdlc3QtMjo2MDk4NDExODI1MzI6Y2VydGlmaWNhdGUvZmYwZjUyMzktNzAwMi00YTZjLWEzNDctNjgwMDA0MWRmNjAxJ1xufSk7XG5cbi8vIG5ldyBHbG9iYWxUYWJsZShhcHAsIHN0YXRpY1RhYmxlLm5hbWUsIHtcbi8vICAgcGFydGl0aW9uS2V5OiB7XG4vLyAgICAgbmFtZTogc3RhdGljVGFibGUucHJpbWFyeUtleSxcbi8vICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklOR1xuLy8gICB9LFxuLy8gICB0YWJsZU5hbWU6ICdnbG9iYWxUYWJsZVRlc3QnLFxuLy8gICByZWdpb25zOiBbJ2V1LXdlc3QtMScsICdldS13ZXN0LTInXSxcbi8vICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gTk9UIHJlY29tbWVuZGVkIGZvciBwcm9kdWN0aW9uIGNvZGVcbi8vIH0pO1xuXG5hcHAuc3ludGgoKTtcbiJdfQ==