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
            const domain = new apigateway.DomainName(this, 'custom-domain', {
                domainName: 'api.h-o.dev',
                certificate: hodevcert,
                // endpointType: apigw.EndpointType.EDGE, // default is REGIONAL
                securityPolicy: apigateway.SecurityPolicy.TLS_1_2
            });
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
            // api.addDomainName('apiDomainName', domainName.domainName);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHNEQUF1RDtBQUN2RCxrREFBbUQ7QUFDbkQsOERBQThEO0FBQzlELDhDQUErQztBQUMvQyxxQ0FBc0M7QUFDdEMsa0RBQW1EO0FBQ25ELDhEQUErRDtBQUMvRCxpREFBaUQ7QUFDakQsMENBQTJDO0FBQzNDLHdDQUF5QztBQUN6QywrQkFBNEI7QUFDNUIsOENBQWtFO0FBQ2xFLGdEQUFnRDtBQUNoRCx3REFBd0Q7QUFDeEQsNEVBQTZEO0FBRzdELE1BQU0sYUFBYSxHQUFHLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUMsQ0FBQztBQUNqRyxNQUFNLFdBQVcsR0FBRyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBQyxDQUFBO0FBQ2pFLE1BQU0sU0FBUyxHQUFHLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFDLENBQUE7QUFFN0QsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLElBQUksTUFBTSxDQUFBO0FBQ3ZELE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxJQUFJLEVBQUUsQ0FBQztBQVd0RCxNQUFhLGlCQUFrQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQzlDLFlBQVksR0FBWSxFQUFFLEVBQVUsRUFBRSxLQUE4Qjs7UUFDbEUsS0FBSyxDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFdEIsTUFBTSxXQUFXLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsSUFBSSxFQUFFO1lBQy9ELFlBQVksRUFBRTtnQkFDWixJQUFJLEVBQUUsYUFBYSxDQUFDLFVBQVU7Z0JBQzlC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b0JBQW9CO0FBQ3BCLG9DQUFvQztBQUNwQywwQ0FBMEM7QUFDMUMsT0FBTztBQUNQLGtDQUFrQztBQUNsQyx5Q0FBeUM7QUFDekMscUZBQXFGO0FBQ3JGLE1BQU07QUFFTixHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXBpZ2F0ZXdheSA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1hcGlnYXRld2F5Jyk7XG5pbXBvcnQgZHluYW1vZGIgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtZHluYW1vZGInKTtcbi8vIGltcG9ydCB7IEdsb2JhbFRhYmxlIH0gZnJvbSAnQGF3cy1jZGsvYXdzLWR5bmFtb2RiLWdsb2JhbCc7XG5pbXBvcnQgbGFtYmRhID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWxhbWJkYScpO1xuaW1wb3J0IGNkayA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2NvcmUnKTtcbmltcG9ydCBzZm4gPSByZXF1aXJlKCdAYXdzLWNkay9hd3Mtc3RlcGZ1bmN0aW9ucycpO1xuaW1wb3J0IHNmbl90YXNrcyA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1zdGVwZnVuY3Rpb25zLXRhc2tzJyk7XG5pbXBvcnQgYXNzZXRzID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLXMzLWFzc2V0cycpXG5pbXBvcnQgbG9ncyA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1sb2dzJyk7XG5pbXBvcnQgaWFtID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWlhbScpO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgTWFuYWdlZFBvbGljeSwgUG9saWN5U3RhdGVtZW50IH0gZnJvbSAnQGF3cy1jZGsvYXdzLWlhbSc7XG5pbXBvcnQgKiBhcyByb3V0ZTUzIGZyb20gJ0Bhd3MtY2RrL2F3cy1yb3V0ZTUzJztcbmltcG9ydCAqIGFzIHRhcmdldHMgZnJvbSAnQGF3cy1jZGsvYXdzLXJvdXRlNTMtdGFyZ2V0cyc7XG5pbXBvcnQgeyBDZXJ0aWZpY2F0ZSB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1jZXJ0aWZpY2F0ZW1hbmFnZXInXG5cblxuY29uc3QgaW5zdGFuY2VUYWJsZSA9IHsgbmFtZTogJ2FsZkluc3RhbmNlcycsIHByaW1hcnlLZXk6ICdhbGZVc2VySWQnLCBzb3J0S2V5OiAnYWxmSW5zdGFuY2VJZCd9O1xuY29uc3Qgc3RhdGljVGFibGUgPSB7IG5hbWU6ICdzdGF0aWNUYWJsZScsIHByaW1hcnlLZXk6ICdpdGVtc0lkJ31cbmNvbnN0IHJlcG9UYWJsZSA9IHsgbmFtZTogJ3JlcG9UYWJsZScsIHByaW1hcnlLZXk6ICdhbGZUeXBlJ31cblxuY29uc3QgV0lUSF9TV0FHR0VSID0gcHJvY2Vzcy5lbnYuV0lUSF9TV0FHR0VSIHx8ICd0cnVlJ1xuY29uc3QgQ0lfVVNFUl9UT0tFTiA9IHByb2Nlc3MuZW52LkNJX1VTRVJfVE9LRU4gfHwgJyc7XG5cbmludGVyZmFjZSBBbGZJbnN0YW5jZXNTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICBpbWFnZUlkPzogc3RyaW5nLFxuICBzd2FnZ2VyRmlsZT86IHN0cmluZyxcbiAgZW5jcnlwdEJ1Y2tldD86IGJvb2xlYW5cbiAgaG9kZXZDZXJ0QXJuPzogc3RyaW5nXG4gIGVudmlyb25tZW50OiBzdHJpbmdcbiAgY3VzdG9tRG9tYWluPzoge2NlcnRBcm46IHN0cmluZywgZG9tYWluTmFtZTogYXBpZ2F0ZXdheS5Eb21haW5OYW1lT3B0aW9uc31cbn1cblxuZXhwb3J0IGNsYXNzIEFsZkluc3RhbmNlc1N0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3IoYXBwOiBjZGsuQXBwLCBpZDogc3RyaW5nLCBwcm9wcz86IEFsZkluc3RhbmNlc1N0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihhcHAsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCBkeW5hbW9UYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCBpbnN0YW5jZVRhYmxlLm5hbWUsIHtcbiAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICBuYW1lOiBpbnN0YW5jZVRhYmxlLnByaW1hcnlLZXksXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HXG4gICAgICB9LFxuICAgICAgc29ydEtleToge1xuICAgICAgICBuYW1lOiBpbnN0YW5jZVRhYmxlLnNvcnRLZXksXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HXG4gICAgICB9LFxuICAgICAgdGFibGVOYW1lOiBpbnN0YW5jZVRhYmxlLm5hbWUsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAvLyBOT1QgcmVjb21tZW5kZWQgZm9yIHByb2R1Y3Rpb24gY29kZVxuICAgIH0pO1xuXG4gICAgY29uc3QgZHluYW1vU3RhdGljVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgc3RhdGljVGFibGUubmFtZSwge1xuICAgICAgcGFydGl0aW9uS2V5OiB7XG4gICAgICAgIG5hbWU6IHN0YXRpY1RhYmxlLnByaW1hcnlLZXksXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HXG4gICAgICB9LFxuICAgICAgdGFibGVOYW1lOiBzdGF0aWNUYWJsZS5uYW1lLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gTk9UIHJlY29tbWVuZGVkIGZvciBwcm9kdWN0aW9uIGNvZGVcbiAgICB9KTtcblxuICAgIGNvbnN0IGR5bmFtb1JlcG9UYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCByZXBvVGFibGUubmFtZSwge1xuICAgICAgcGFydGl0aW9uS2V5OiB7XG4gICAgICAgIG5hbWU6IHJlcG9UYWJsZS5wcmltYXJ5S2V5LFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLk5VTUJFUlxuICAgICAgfSxcbiAgICAgIHRhYmxlTmFtZTogcmVwb1RhYmxlLm5hbWUsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAvLyBOT1QgcmVjb21tZW5kZWQgZm9yIHByb2R1Y3Rpb24gY29kZVxuICAgIH0pO1xuXG4gICAgY29uc3QgZ2V0T25lTGFtYmRhID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnZ2V0T25lSXRlbUZ1bmN0aW9uJywge1xuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ2dldC1vbmUuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRBQkxFX05BTUU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUFJJTUFSWV9LRVk6IGluc3RhbmNlVGFibGUucHJpbWFyeUtleSxcbiAgICAgICAgU09SVF9LRVk6IGluc3RhbmNlVGFibGUuc29ydEtleVxuICAgICAgfSxcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9EQVksXG4gICAgfSk7XG5cbiAgICBjb25zdCBnZXRBbGxMYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdnZXRBbGxJdGVtc0Z1bmN0aW9uJywge1xuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ2dldC1hbGwuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRBQkxFX05BTUU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUFJJTUFSWV9LRVk6IGluc3RhbmNlVGFibGUucHJpbWFyeUtleVxuICAgICAgfSxcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9EQVksXG4gICAgfSk7XG5cbiAgICBjb25zdCByb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdSb2xlJywge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2xhbWJkYS5hbWF6b25hd3MuY29tJyksICAgLy8gcmVxdWlyZWRcbiAgICAgIG1hbmFnZWRQb2xpY2llczogW01hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdzZXJ2aWNlLXJvbGUvQVdTTGFtYmRhQmFzaWNFeGVjdXRpb25Sb2xlJyldLFxuICAgIH0pO1xuXG4gICAgcm9sZS5hZGRUb1BvbGljeShuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIHJlc291cmNlczogWycqJ10sXG4gICAgICBhY3Rpb25zOiBbJ2VjMjoqJywgJ2xvZ3M6KiddIH0pKTtcblxuICAgIGNvbnN0IGdldEFsbEluc3RhbmNlc0xhbWJkYSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ2dldEFsbEluc3RhbmNlc0Z1bmN0aW9uJywge1xuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ2dldC1hbGwtaW5zdGFuY2VzLmhhbmRsZXInLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEwX1gsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBQUklNQVJZX0tFWTogaW5zdGFuY2VUYWJsZS5wcmltYXJ5S2V5LFxuICAgICAgICBTT1JUX0tFWTogaW5zdGFuY2VUYWJsZS5zb3J0S2V5LFxuICAgICAgICBTVEFDS19OQU1FOiB0aGlzLnN0YWNrTmFtZVxuICAgICAgfSxcbiAgICAgIHJvbGU6IHJvbGUsXG4gICAgICBsb2dSZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfREFZLFxuICAgIH0pO1xuXG4gICAgY29uc3QgZGVsZXRlT25lID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnZGVsZXRlSXRlbUZ1bmN0aW9uJywge1xuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ2RlbGV0ZS1vbmUuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRBQkxFX05BTUU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUFJJTUFSWV9LRVk6IGluc3RhbmNlVGFibGUucHJpbWFyeUtleSxcbiAgICAgICAgU09SVF9LRVk6IGluc3RhbmNlVGFibGUuc29ydEtleVxuICAgICAgfSxcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9EQVksXG4gICAgfSk7XG5cbiAgICBjb25zdCBwdXRPbmVJdGVtTGFtYmRhID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAncHV0T25lSXRlbScsIHtcbiAgICAgIGNvZGU6IG5ldyBsYW1iZGEuQXNzZXRDb2RlKCdzcmMnKSxcbiAgICAgIGhhbmRsZXI6ICdjcmVhdGUuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRBQkxFX05BTUU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUFJJTUFSWV9LRVk6IGluc3RhbmNlVGFibGUucHJpbWFyeUtleSxcbiAgICAgICAgU09SVF9LRVk6IGluc3RhbmNlVGFibGUuc29ydEtleVxuICAgICAgfSxcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9EQVksXG4gICAgfSk7XG5cbiAgICBjb25zdCBjcmVhdGVJbnN0YW5jZUxhbWJkYSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ2NyZWF0ZUluc3RhbmNlJywge1xuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ2NyZWF0ZS1pbnN0YW5jZS5oYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgUkVQT19UQUJMRSA6IGR5bmFtb1JlcG9UYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFBSSU1BUllfS0VZOiByZXBvVGFibGUucHJpbWFyeUtleSxcbiAgICAgICAgQ0lfVVNFUl9UT0tFTjogQ0lfVVNFUl9UT0tFTixcbiAgICAgICAgU0VDVVJJVFlfR1JPVVA6ICdkZWZhdWx0JyxcbiAgICAgICAgU1RBQ0tfTkFNRTogdGhpcy5zdGFja05hbWUsXG4gICAgICAgIElNQUdFX0lEOiBwcm9wcz8uaW1hZ2VJZCB8fCAnJ1xuICAgICAgfSxcbiAgICAgIHJvbGU6IHJvbGUsXG4gICAgICBsb2dSZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfREFZLFxuICAgIH0pO1xuXG4gICAgZHluYW1vVGFibGUuZ3JhbnRGdWxsQWNjZXNzKGdldEFsbExhbWJkYSk7XG4gICAgZHluYW1vVGFibGUuZ3JhbnRGdWxsQWNjZXNzKGdldE9uZUxhbWJkYSk7XG4gICAgZHluYW1vVGFibGUuZ3JhbnRGdWxsQWNjZXNzKHB1dE9uZUl0ZW1MYW1iZGEpO1xuICAgIGR5bmFtb1RhYmxlLmdyYW50RnVsbEFjY2VzcyhkZWxldGVPbmUpO1xuXG4gICAgZHluYW1vUmVwb1RhYmxlLmdyYW50RnVsbEFjY2VzcyhjcmVhdGVJbnN0YW5jZUxhbWJkYSk7XG5cbiAgICB2YXIgYXBpO1xuXG4gICAgaWYocHJvcHM/LmhvZGV2Q2VydEFybil7XG4gICAgICBjb25zdCBob2RldmNlcnQgPSBDZXJ0aWZpY2F0ZS5mcm9tQ2VydGlmaWNhdGVBcm4odGhpcywgJ0NlcnRpZmljYXRlJywgcHJvcHMuaG9kZXZDZXJ0QXJuKTtcblxuICAgICAgY29uc3QgZG9tYWluID0gbmV3IGFwaWdhdGV3YXkuRG9tYWluTmFtZSh0aGlzLCAnY3VzdG9tLWRvbWFpbicsIHtcbiAgICAgICAgZG9tYWluTmFtZTogJ2FwaS5oLW8uZGV2JyxcbiAgICAgICAgY2VydGlmaWNhdGU6IGhvZGV2Y2VydCxcbiAgICAgICAgLy8gZW5kcG9pbnRUeXBlOiBhcGlndy5FbmRwb2ludFR5cGUuRURHRSwgLy8gZGVmYXVsdCBpcyBSRUdJT05BTFxuICAgICAgICBzZWN1cml0eVBvbGljeTogYXBpZ2F0ZXdheS5TZWN1cml0eVBvbGljeS5UTFNfMV8yXG4gICAgICB9KTtcblxuICAgICAgYXBpID0gbmV3IGFwaWdhdGV3YXkuUmVzdEFwaSh0aGlzLCAnaXRlbXNBcGknLCB7XG4gICAgICAgIHJlc3RBcGlOYW1lOiAnQWxmIEluc3RhbmNlIFNlcnZpY2UnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ0FuIEFXUyBCYWNrZWQgU2VydmljZSBmb3IgcHJvdmlkaW5nIEFsZnJlc2NvIHdpdGggY3VzdG9tIGRvbWFpbicsXG4gICAgICAgIC8vIGRvbWFpbk5hbWU6IHtcbiAgICAgICAgLy8gICBkb21haW5OYW1lOiAnYXBpLmgtby5kZXYnLFxuICAgICAgICAvLyAgIGNlcnRpZmljYXRlOiBob2RldmNlcnRcbiAgICAgICAgLy8gfSxcbiAgICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XG4gICAgICAgICAgYWxsb3dPcmlnaW5zOiBhcGlnYXRld2F5LkNvcnMuQUxMX09SSUdJTlMsXG4gICAgICAgICAgYWxsb3dNZXRob2RzOiBhcGlnYXRld2F5LkNvcnMuQUxMX01FVEhPRFMgLy8gdGhpcyBpcyBhbHNvIHRoZSBkZWZhdWx0XG4gICAgICAgIH0sXG4gICAgICAgIC8vIGRlcGxveU9wdGlvbnM6IHtcbiAgICAgICAgLy8gICBsb2dnaW5nTGV2ZWw6IGFwaWdhdGV3YXkuTWV0aG9kTG9nZ2luZ0xldmVsLklORk8sXG4gICAgICAgIC8vICAgZGF0YVRyYWNlRW5hYmxlZDogdHJ1ZVxuICAgICAgICAvLyB9XG4gICAgICAgIGVuZHBvaW50VHlwZXM6IFthcGlnYXRld2F5LkVuZHBvaW50VHlwZS5SRUdJT05BTF1cbiAgICAgIH0pO1xuXG4gICAgICAvLyBhcGkuYWRkRG9tYWluTmFtZSgnYXBpRG9tYWluTmFtZScsIGRvbWFpbk5hbWUuZG9tYWluTmFtZSk7XG5cbiAgICAgIG5ldyByb3V0ZTUzLkFSZWNvcmQodGhpcywgJ0N1c3RvbURvbWFpbkFsaWFzUmVjb3JkJywge1xuICAgICAgICB6b25lOiByb3V0ZTUzLkhvc3RlZFpvbmUuZnJvbUhvc3RlZFpvbmVBdHRyaWJ1dGVzKHRoaXMsICdIb2Rldkhvc3RlZFpvbmVJZCcsIHt6b25lTmFtZTogJ2gtby5kZXYuJywgaG9zdGVkWm9uZUlkOiAnWjAwNDY2ODQyRUtKV0tYTEExUlBHJ30pLFxuICAgICAgICB0YXJnZXQ6IHJvdXRlNTMuUmVjb3JkVGFyZ2V0LmZyb21BbGlhcyhuZXcgdGFyZ2V0cy5BcGlHYXRld2F5KGFwaSkpXG4gICAgICB9KTtcblxuICAgICAgZG9tYWluLmFkZEJhc2VQYXRoTWFwcGluZyhhcGksIHtiYXNlUGF0aDogJ2FiJ30pO1xuICAgICAgLy8gZG9tYWluLmFkZEJhc2VQYXRoTWFwcGluZyhhcGksIHtiYXNlUGF0aDogJ2NkJ30pO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIGFwaSA9IG5ldyBhcGlnYXRld2F5LlJlc3RBcGkodGhpcywgJ2l0ZW1zQXBpJywge1xuICAgICAgICByZXN0QXBpTmFtZTogJ0FsZiBJbnN0YW5jZSBTZXJ2aWNlJyxcbiAgICAgICAgZGVzY3JpcHRpb246ICdBbiBBV1MgQmFja2VkIFNlcnZpY2UgZm9yIHByb3ZpZGluZyBBbGZyZXNjbyB3aXRob3V0IGN1c3RvbSBkb21haW4nLFxuICAgICAgICAvLyBkZXBsb3lPcHRpb25zOiB7XG4gICAgICAgIC8vICAgbG9nZ2luZ0xldmVsOiBhcGlnYXRld2F5Lk1ldGhvZExvZ2dpbmdMZXZlbC5JTkZPLFxuICAgICAgICAvLyAgIGRhdGFUcmFjZUVuYWJsZWQ6IHRydWVcbiAgICAgICAgLy8gfVxuICAgICAgICBkZWZhdWx0Q29yc1ByZWZsaWdodE9wdGlvbnM6IHtcbiAgICAgICAgICBhbGxvd09yaWdpbnM6IGFwaWdhdGV3YXkuQ29ycy5BTExfT1JJR0lOUyxcbiAgICAgICAgICBhbGxvd01ldGhvZHM6IGFwaWdhdGV3YXkuQ29ycy5BTExfTUVUSE9EUyAvLyB0aGlzIGlzIGFsc28gdGhlIGRlZmF1bHRcbiAgICAgICAgfSxcbiAgICAgICAgZW5kcG9pbnRUeXBlczogW2FwaWdhdGV3YXkuRW5kcG9pbnRUeXBlLlJFR0lPTkFMXVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgY2ZuQXBpID0gYXBpLm5vZGUuZGVmYXVsdENoaWxkIGFzIGFwaWdhdGV3YXkuQ2ZuUmVzdEFwaTtcblxuICAgIGlmKFdJVEhfU1dBR0dFUiAhPT0gJ2ZhbHNlJyl7XG4gICAgICAvLyBVcGxvYWQgU3dhZ2dlciB0byBTM1xuICAgICAgY29uc3QgZmlsZUFzc2V0ID0gbmV3IGFzc2V0cy5Bc3NldCh0aGlzLCAnU3dhZ2dlckFzc2V0Jywge1xuICAgICAgICBwYXRoOiBqb2luKF9fZGlybmFtZSwgcHJvcHM/LnN3YWdnZXJGaWxlIHx8ICcnKVxuICAgICAgfSk7XG4gICAgICBjZm5BcGkuYm9keVMzTG9jYXRpb24gPSB7IGJ1Y2tldDogZmlsZUFzc2V0LmJ1Y2tldC5idWNrZXROYW1lLCBrZXk6IGZpbGVBc3NldC5zM09iamVjdEtleSB9O1xuICAgIH1cblxuICAgIGNvbnN0IGl0ZW1zID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2l0ZW1zJyk7XG4gICAgY29uc3QgZ2V0QWxsSW50ZWdyYXRpb24gPSBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihnZXRBbGxMYW1iZGEpO1xuICAgIGl0ZW1zLmFkZE1ldGhvZCgnR0VUJywgZ2V0QWxsSW50ZWdyYXRpb24pO1xuXG4gICAgY29uc3QgaW5zdGFuY2VzID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2luc3RhbmNlcycpO1xuICAgIGNvbnN0IGdldEFsbEluc3RhbmNlc0ludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ2V0QWxsSW5zdGFuY2VzTGFtYmRhKTtcbiAgICBpbnN0YW5jZXMuYWRkTWV0aG9kKCdHRVQnLCBnZXRBbGxJbnN0YW5jZXNJbnRlZ3JhdGlvbik7XG5cbiAgICBjb25zdCBzaW5nbGVJdGVtID0gaXRlbXMuYWRkUmVzb3VyY2UoYHske2luc3RhbmNlVGFibGUuc29ydEtleX19YCk7XG4gICAgY29uc3QgZ2V0T25lSW50ZWdyYXRpb24gPSBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihnZXRPbmVMYW1iZGEpO1xuICAgIHNpbmdsZUl0ZW0uYWRkTWV0aG9kKCdHRVQnLCBnZXRPbmVJbnRlZ3JhdGlvbik7XG5cbiAgICBjb25zdCBkZWxldGVPbmVJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGRlbGV0ZU9uZSk7XG4gICAgc2luZ2xlSXRlbS5hZGRNZXRob2QoJ0RFTEVURScsIGRlbGV0ZU9uZUludGVncmF0aW9uKTtcbiAgICAvLyBhZGRDb3JzT3B0aW9ucyhzaW5nbGVJdGVtKTtcblxuICAgIGNvbnN0IGNoZWNrQ3JlYXRpb25BbGxvd2FuY2VMYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdjaGVja0NyZWF0aW9uQWxsb3dhbmNlTGFtYmRhJywge1xuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ2NoZWNrLWNyZWF0aW9uLWFsbG93YW5jZS5oYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVEFCTEVfTkFNRTogZHluYW1vVGFibGUudGFibGVOYW1lLFxuICAgICAgICBUQUJMRV9TVEFUSUNfTkFNRTogZHluYW1vU3RhdGljVGFibGUudGFibGVOYW1lLFxuICAgICAgICBQUklNQVJZX0tFWTogaW5zdGFuY2VUYWJsZS5wcmltYXJ5S2V5LFxuICAgICAgfSxcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9EQVksXG4gICAgfSk7XG5cbiAgICBkeW5hbW9UYWJsZS5ncmFudEZ1bGxBY2Nlc3MoY2hlY2tDcmVhdGlvbkFsbG93YW5jZUxhbWJkYSk7XG5cbiAgICAvLyBDb25maWd1cmUgbG9nIGdyb3VwIGZvciBzaG9ydCByZXRlbnRpb25cbiAgICBjb25zdCBsb2dHcm91cCA9IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdMb2dHcm91cCcsIHtcbiAgICAgIHJldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9EQVksXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgbG9nR3JvdXBOYW1lOiAnL2F3cy9sYW1iZGEvY3VzdG9tLycgKyB0aGlzLnN0YWNrTmFtZVxuICAgIH0pO1xuXG4gICAgY29uc3QgbGdzdHJlYW0gPSBsb2dHcm91cC5hZGRTdHJlYW0oJ215bG9nZ3JvdXBTdHJlYW0nKVxuXG4gICAgLy8gbG9nR3JvdXAuYWRkU3Vic2NyaXB0aW9uRmlsdGVyKGlkPSdteWxvZ2dyb3VwX3N1YnMxJywge1xuICAgIC8vICAgICBkZXN0aW5hdGlvbjogbmV3IExhbWJkYURlc3RpbmF0aW9uKGNyZWF0ZU9uZUxhbWJkYSksXG4gICAgLy8gICAgIC8vIGZpbHRlclBhdHRlcm46IGxvZ3NEZXN0aW5hdGlvbnMuRmlsdGVyUGF0dGVybi5hbGxUZXJtcyhcIkVSUk9SXCIsIFwiTWFpblRocmVhZFwiKVxuICAgIC8vICAgICBmaWx0ZXJQYXR0ZXJuOiBsb2dzLkZpbHRlclBhdHRlcm4uYWxsRXZlbnRzKCksXG4gICAgLy8gICB9KTtcblxuICAgIC8vIG5ldyBsb2dzLlN1YnNjcmlwdGlvbkZpbHRlcih0aGlzLCAnbXktc3ViczEnLCB7XG4gICAgLy8gICBkZXN0aW5hdGlvbjogbmV3IExhbWJkYURlc3RpbmF0aW9uKGNyZWF0ZU9uZUxhbWJkYSksXG4gICAgLy8gICBmaWx0ZXJQYXR0ZXJuOiBsb2dzLkZpbHRlclBhdHRlcm4uYWxsRXZlbnRzKCksXG4gICAgLy8gICBsb2dHcm91cDogbG9nR3JvdXAsXG4gICAgLy8gfSk7XG5cblxuICAgIC8vICBjcmVhdGVPbmVMYW1iZGEuYWRkUGVybWlzc2lvbihcbiAgICAvLyAgIGlkPSdteWxhbWJkYWZ1bmN0aW9uLWludm9rZScsIHtcbiAgICAvLyAgICAgcHJpbmNpcGFsOiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2xvZ3MuZXUtd2VzdC0yLmFtYXpvbmF3cy5jb20nKSxcbiAgICAvLyAgICAgYWN0aW9uOiAnbGFtYmRhOkludm9rZUZ1bmN0aW9uJyxcbiAgICAvLyAgICAgc291cmNlQXJuOiBsb2dHcm91cC5sb2dHcm91cEFyblxuICAgIC8vICAgfSlcblxuICAgIC8vICBsb2dHcm91cC5ncmFudFdyaXRlKGNyZWF0ZU9uZUxhbWJkYSk7XG5cbiAgICAvLyBjb25zdCBjaGVja0pvYkFjdGl2aXR5ID0gbmV3IHNmbi5BY3Rpdml0eSh0aGlzLCAnQ2hlY2tKb2InKTtcblxuICAgIGNvbnN0IGNoZWNrQ3JlYXRpb25BbGxvd2FuY2UgPSBuZXcgc2ZuLlRhc2sodGhpcywgJ0NoZWNrIENyZWF0aW9uIEFsbG93YW5jZScsIHtcbiAgICAgIHRhc2s6IG5ldyBzZm5fdGFza3MuSW52b2tlRnVuY3Rpb24oY2hlY2tDcmVhdGlvbkFsbG93YW5jZUxhbWJkYSksXG4gICAgfSk7XG5cbiAgICBjb25zdCBpbnNlcnRJdGVtID0gbmV3IHNmbi5UYXNrKHRoaXMsICdDcmVhdGUgSXRlbScsIHtcbiAgICAgIHRhc2s6IG5ldyBzZm5fdGFza3MuSW52b2tlRnVuY3Rpb24ocHV0T25lSXRlbUxhbWJkYSksXG4gICAgICBpbnB1dFBhdGg6ICckLml0ZW0nXG4gICAgfSk7XG5cbiAgICBjb25zdCBjcmVhdGVJbnN0YW5jZSA9IG5ldyBzZm4uVGFzayh0aGlzLCAnQ3JlYXRlIEluc3RhbmNlJywge1xuICAgICAgdGFzazogbmV3IHNmbl90YXNrcy5JbnZva2VGdW5jdGlvbihjcmVhdGVJbnN0YW5jZUxhbWJkYSksXG4gICAgICBpbnB1dFBhdGg6ICckLml0ZW0nXG4gICAgfSk7XG5cbiAgICAvLyBjb25zdCBjcmVhdGVkSW5zdGFuY2VVcGRhdGUgPSBuZXcgc2ZuLlRhc2sodGhpcywgJ0NyZWF0ZWQgSW5zdGFuY2UgVXBkYXRlJywge1xuICAgIC8vICAgdGFzazogbmV3IHNmbl90YXNrcy5JbnZva2VGdW5jdGlvbihjcmVhdGVPbmVMYW1iZGEpLFxuICAgIC8vICAgaW5wdXRQYXRoOiAnJC5pdGVtJ1xuICAgIC8vIH0pO1xuXG4gICAgY29uc3Qgd2FpdFggPSBuZXcgc2ZuLldhaXQodGhpcywgJ1dhaXQgWCBTZWNvbmRzJywge1xuICAgICAgdGltZTogc2ZuLldhaXRUaW1lLmR1cmF0aW9uKGNkay5EdXJhdGlvbi5zZWNvbmRzKDUpKSxcbiAgICB9KTtcblxuICAgIC8vIGNvbnN0IGdldFN0YXR1cyA9IG5ldyBzZm4uVGFzayh0aGlzLCAnR2V0IEpvYiBTdGF0dXMnLCB7XG4gICAgLy8gICB0YXNrOiBuZXcgc2ZuX3Rhc2tzLkludm9rZUFjdGl2aXR5KGNoZWNrSm9iQWN0aXZpdHkpLFxuICAgIC8vICAgaW5wdXRQYXRoOiAnJC5ndWlkJyxcbiAgICAvLyAgIHJlc3VsdFBhdGg6ICckLnN0YXR1cycsXG4gICAgLy8gfSk7XG4gICAgY29uc3QgaXNBbGxvd2VkID0gbmV3IHNmbi5DaG9pY2UodGhpcywgJ0NyZWF0aW9uIEFsbG93ZWQ/Jyk7XG4gICAgY29uc3Qgbm90QWxsb3dlZCA9IG5ldyBzZm4uRmFpbCh0aGlzLCAnTm90IEFsbG93ZWQnLCB7XG4gICAgICBjYXVzZTogJ0NyZWF0aW9uIGZhaWxlZCcsXG4gICAgICBlcnJvcjogJ0pvYiByZXR1cm5lZCBmYWlsZWQnLFxuICAgIH0pO1xuXG4gICAgLy8gY29uc3QgZmluYWxTdGF0dXMgPSBuZXcgc2ZuLlRhc2sodGhpcywgJ0dldCBGaW5hbCBKb2IgU3RhdHVzJywge1xuICAgIC8vICAgdGFzazogbmV3IHNmbl90YXNrcy5JbnZva2VBY3Rpdml0eShjaGVja0pvYkFjdGl2aXR5KSxcbiAgICAvLyAgIGlucHV0UGF0aDogJyQuZ3VpZCcsXG4gICAgLy8gfSk7XG5cbiAgICBjb25zdCBjcmVhdGlvbkNoYWluID0gc2ZuLkNoYWluLnN0YXJ0KGNoZWNrQ3JlYXRpb25BbGxvd2FuY2UpXG4gICAgICAubmV4dChpc0FsbG93ZWRcbiAgICAgIC53aGVuKHNmbi5Db25kaXRpb24uc3RyaW5nRXF1YWxzKCckLnJlc3VsdCcsICdmYWlsZWQnKSwgbm90QWxsb3dlZClcbiAgICAgIC53aGVuKHNmbi5Db25kaXRpb24uc3RyaW5nRXF1YWxzKCckLnJlc3VsdCcsICdvaycpLCBpbnNlcnRJdGVtLm5leHQoY3JlYXRlSW5zdGFuY2UpKVxuICAgICAgLm90aGVyd2lzZSh3YWl0WCkgKTtcbiAgICAvLyAubmV4dChnZXRTdGF0dXMpXG4gICAgLy8gLm5leHQoXG4gICAgLy8gICBpc0NvbXBsZXRlXG4gICAgLy8gICAgIC53aGVuKHNmbi5Db25kaXRpb24uc3RyaW5nRXF1YWxzKCckLnN0YXR1cycsICdGQUlMRUQnKSwgam9iRmFpbGVkKVxuICAgIC8vICAgICAud2hlbihzZm4uQ29uZGl0aW9uLnN0cmluZ0VxdWFscygnJC5zdGF0dXMnLCAnU1VDQ0VFREVEJyksIGZpbmFsU3RhdHVzKVxuICAgIC8vICAgICAub3RoZXJ3aXNlKHdhaXRYKSxcbiAgICAvLyApO1xuXG4gICAgY29uc3QgdXBkYXRlSXRlbSA9IG5ldyBzZm4uVGFzayh0aGlzLCAnVXBkYXRlIEl0ZW0nLCB7XG4gICAgICB0YXNrOiBuZXcgc2ZuX3Rhc2tzLkludm9rZUZ1bmN0aW9uKHB1dE9uZUl0ZW1MYW1iZGEpLFxuICAgICAgaW5wdXRQYXRoOiAnJC5pdGVtJ1xuICAgIH0pO1xuXG4gICAgY29uc3QgdXBkYXRlQ2hhaW4gPSBzZm4uQ2hhaW4uc3RhcnQodXBkYXRlSXRlbSlcblxuICAgIGNvbnN0IGNyZWF0ZVN0YXRlTWFjaGluZSA9IG5ldyBzZm4uU3RhdGVNYWNoaW5lKHRoaXMsICdDcmVhdGVTdGF0ZU1hY2hpbmUnLCB7XG4gICAgICBkZWZpbml0aW9uOiBjcmVhdGlvbkNoYWluLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pO1xuXG4gICAgY29uc3QgdXBkYXRlU3RhdGVNYWNoaW5lID0gbmV3IHNmbi5TdGF0ZU1hY2hpbmUodGhpcywgJ1VwZGF0ZVN0YXRlTWFjaGluZScsIHtcbiAgICAgIGRlZmluaXRpb246IHVwZGF0ZUNoYWluLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pO1xuXG4gICAgY29uc3QgY3JlYXRlT25lQXBpID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnY3JlYXRlSXRlbUZ1bmN0aW9uQXBpJywge1xuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ2NyZWF0ZS1hcGkuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFNUQVRFX01BQ0hJTkVfQVJOOiBjcmVhdGVTdGF0ZU1hY2hpbmUuc3RhdGVNYWNoaW5lQXJuLFxuICAgICAgICBTT1JUX0tFWTogaW5zdGFuY2VUYWJsZS5zb3J0S2V5XG4gICAgICB9LFxuICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX0RBWSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHVwZGF0ZU9uZUFwaSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ3VwZGF0ZUl0ZW1GdW5jdGlvbicsIHtcbiAgICAgIGNvZGU6IG5ldyBsYW1iZGEuQXNzZXRDb2RlKCdzcmMnKSxcbiAgICAgIGhhbmRsZXI6ICd1cGRhdGUtb25lLmhhbmRsZXInLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEwX1gsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBTVEFURV9NQUNISU5FX0FSTjogdXBkYXRlU3RhdGVNYWNoaW5lLnN0YXRlTWFjaGluZUFybixcbiAgICAgICAgU09SVF9LRVk6IGluc3RhbmNlVGFibGUuc29ydEtleVxuICAgICAgfSxcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9EQVksXG4gICAgfSk7XG5cbiAgICBjcmVhdGVTdGF0ZU1hY2hpbmUuZ3JhbnRTdGFydEV4ZWN1dGlvbihjcmVhdGVPbmVBcGkpO1xuICAgIHVwZGF0ZVN0YXRlTWFjaGluZS5ncmFudFN0YXJ0RXhlY3V0aW9uKHVwZGF0ZU9uZUFwaSk7XG5cbiAgICBjb25zdCBjcmVhdGVPbmVJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGNyZWF0ZU9uZUFwaSk7XG5cbiAgICBpdGVtcy5hZGRNZXRob2QoJ1BPU1QnLCBjcmVhdGVPbmVJbnRlZ3JhdGlvbik7XG4gICAgLy8gYWRkQ29yc09wdGlvbnMoaXRlbXMpO1xuXG4gICAgY29uc3QgdXBkYXRlT25lSW50ZWdyYXRpb24gPSBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih1cGRhdGVPbmVBcGkpO1xuICAgIHNpbmdsZUl0ZW0uYWRkTWV0aG9kKCdQVVQnLCB1cGRhdGVPbmVJbnRlZ3JhdGlvbik7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVGFibGVOYW1lJywge1xuICAgICAgdmFsdWU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZVxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1JlcG9UYWJsZU5hbWUnLCB7XG4gICAgICB2YWx1ZTogZHluYW1vUmVwb1RhYmxlLnRhYmxlTmFtZVxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1Jlc3RBcGlFbmRQb2ludCcsIHtcbiAgICAgIHZhbHVlOiBhcGkudXJsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUmVzdEFwaUlkJywge1xuICAgICAgdmFsdWU6IGFwaS5yZXN0QXBpSWRcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdMb2dHcm91cE5hbWUnLCB7XG4gICAgICB2YWx1ZTogbG9nR3JvdXAubG9nR3JvdXBOYW1lXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTG9nR3JvdXBTdHJlYW1OYW1lJywge1xuICAgICAgdmFsdWU6IGxnc3RyZWFtLmxvZ1N0cmVhbU5hbWVcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdMR0dyb3VwZENyZWF0ZUFwaScsIHtcbiAgICAgIHZhbHVlOiBjcmVhdGVPbmVBcGkubG9nR3JvdXAubG9nR3JvdXBOYW1lXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTEdHcm91cGRDcmVhdGUnLCB7XG4gICAgICB2YWx1ZTogcHV0T25lSXRlbUxhbWJkYS5sb2dHcm91cC5sb2dHcm91cE5hbWVcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdMR0dyb3VwZENyZWF0ZUluc3RhbmNlJywge1xuICAgICAgdmFsdWU6IGNyZWF0ZUluc3RhbmNlTGFtYmRhLmxvZ0dyb3VwLmxvZ0dyb3VwTmFtZVxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwaURvbWFpbk5hbWUnLCB7XG4gICAgICB2YWx1ZTogYXBpLmRvbWFpbk5hbWU/LmRvbWFpbk5hbWUgfHwgJydcbiAgICB9KTtcblxuICB9XG59XG5cbi8vIGV4cG9ydCBmdW5jdGlvbiBhZGRDb3JzT3B0aW9ucyhhcGlSZXNvdXJjZTogYXBpZ2F0ZXdheS5JUmVzb3VyY2UpIHtcbi8vICAgYXBpUmVzb3VyY2UuYWRkTWV0aG9kKFxuLy8gICAgICdPUFRJT05TJyxcbi8vICAgICBuZXcgYXBpZ2F0ZXdheS5Nb2NrSW50ZWdyYXRpb24oe1xuLy8gICAgICAgaW50ZWdyYXRpb25SZXNwb25zZXM6IFtcbi8vICAgICAgICAge1xuLy8gICAgICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxuLy8gICAgICAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuLy8gICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6XG4vLyAgICAgICAgICAgICAgIFwiJ0NvbnRlbnQtVHlwZSxYLUFtei1EYXRlLEF1dGhvcml6YXRpb24sWC1BcGktS2V5LFgtQW16LVNlY3VyaXR5LVRva2VuLFgtQW16LVVzZXItQWdlbnQnXCIsXG4vLyAgICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiBcIicqJ1wiLFxuLy8gICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctQ3JlZGVudGlhbHMnOiBcIidmYWxzZSdcIixcbi8vICAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiBcIidPUFRJT05TLEdFVCxQVVQsUE9TVCxERUxFVEUnXCIsXG4vLyAgICAgICAgICAgfSxcbi8vICAgICAgICAgfSxcbi8vICAgICAgIF0sXG4vLyAgICAgICBwYXNzdGhyb3VnaEJlaGF2aW9yOiBhcGlnYXRld2F5LlBhc3N0aHJvdWdoQmVoYXZpb3IuTkVWRVIsXG4vLyAgICAgICByZXF1ZXN0VGVtcGxhdGVzOiB7XG4vLyAgICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogJ3tcInN0YXR1c0NvZGVcIjogMjAwfScsXG4vLyAgICAgICB9LFxuLy8gICAgIH0pLFxuLy8gICAgIHtcbi8vICAgICAgIG1ldGhvZFJlc3BvbnNlczogW1xuLy8gICAgICAgICB7XG4vLyAgICAgICAgICAgc3RhdHVzQ29kZTogJzIwMCcsXG4vLyAgICAgICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4vLyAgICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogdHJ1ZSxcbi8vICAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiB0cnVlLFxuLy8gICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctQ3JlZGVudGlhbHMnOiB0cnVlLFxuLy8gICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogdHJ1ZSxcbi8vICAgICAgICAgICB9LFxuLy8gICAgICAgICB9LFxuLy8gICAgICAgXSxcbi8vICAgICB9LFxuLy8gICApO1xuLy8gfVxuXG5jb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xuXG4vLyBuZXcgQWxmSW5zdGFuY2VzU3RhY2soYXBwLCBcIkFsZkluc3RhbmNlc1N0YWNrRXVXZXN0MVwiLCB7XG4vLyAgICAgZW52aXJvbm1lbnQ6ICdwcm9kJyxcbi8vICAgICBlbnY6IHtcbi8vICAgICAgIHJlZ2lvbjogXCJldS13ZXN0LTFcIlxuLy8gICAgIH0sXG4vLyAgICAgaW1hZ2VJZDogJ2FtaS0wNGQ1Y2M5Yjg4ZjlkMWQzOScsXG4vLyAgICAgc3dhZ2dlckZpbGU6ICd0bXAvc3dhZ2dlcl9mdWxsXy55YW1sJ1xuLy8gICB9KTtcblxubmV3IEFsZkluc3RhbmNlc1N0YWNrKGFwcCwgXCJBbGZJbnN0YW5jZXNTdGFja0V1V2VzdDJcIiwge1xuICBlbnZpcm9ubWVudDogJ2RldicsXG4gIGVudjoge1xuICAgIHJlZ2lvbjogXCJldS13ZXN0LTJcIlxuICB9LFxuICBpbWFnZUlkOiAnYW1pLTBjYjc5MDMwOGY3NTkxZmE2JyxcbiAgc3dhZ2dlckZpbGU6ICd0bXAvc3dhZ2dlcl9mdWxsLnlhbWwnLFxuICBob2RldkNlcnRBcm46ICdhcm46YXdzOmFjbTpldS13ZXN0LTI6NjA5ODQxMTgyNTMyOmNlcnRpZmljYXRlL2ZmMGY1MjM5LTcwMDItNGE2Yy1hMzQ3LTY4MDAwNDFkZjYwMSdcbn0pO1xuXG4vLyBuZXcgR2xvYmFsVGFibGUoYXBwLCBzdGF0aWNUYWJsZS5uYW1lLCB7XG4vLyAgIHBhcnRpdGlvbktleToge1xuLy8gICAgIG5hbWU6IHN0YXRpY1RhYmxlLnByaW1hcnlLZXksXG4vLyAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkdcbi8vICAgfSxcbi8vICAgdGFibGVOYW1lOiAnZ2xvYmFsVGFibGVUZXN0Jyxcbi8vICAgcmVnaW9uczogWydldS13ZXN0LTEnLCAnZXUtd2VzdC0yJ10sXG4vLyAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIE5PVCByZWNvbW1lbmRlZCBmb3IgcHJvZHVjdGlvbiBjb2RlXG4vLyB9KTtcblxuYXBwLnN5bnRoKCk7XG4iXX0=