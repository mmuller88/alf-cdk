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
        if ((_b = props) === null || _b === void 0 ? void 0 : _b.domain) {
            const domain = props.domain;
            // const domainName = new apigateway.DomainName(this, 'custom-domain', {
            //   domainName: domain.domainName,
            //   certificate: Certificate.fromCertificateArn(this, 'Certificate', props.domain.certificateArn),
            //   // endpointType: apigw.EndpointType.EDGE, // default is REGIONAL
            //   securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
            //   // mapping: api
            // });
            api = new apigateway.RestApi(this, 'itemsApi', {
                restApiName: 'Alf Instance Service',
                description: 'An AWS Backed Service for providing Alfresco with custom domain',
                // domainName: {
                //   domainName: domain.domainName,
                //   certificate: Certificate.fromCertificateArn(this, 'Certificate', props.domain.certificateArn),
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
            const domainName = api.addDomainName('apiDomainName', {
                domainName: domain.domainName,
                certificate: aws_certificatemanager_1.Certificate.fromCertificateArn(this, 'Certificate', props.domain.certificateArn),
                // endpointType: apigw.EndpointType.EDGE, // default is REGIONAL
                securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
            });
            domainName.addBasePathMapping(api, { basePath: 'ab' });
            // domainName.addBasePathMapping(api, { basePath: 'cd' });
            new route53.ARecord(this, 'CustomDomainAliasRecord', {
                zone: route53.HostedZone.fromHostedZoneAttributes(this, 'HodevHostedZoneId', { zoneName: domain.zoneName, hostedZoneId: domain.hostedZoneId }),
                target: route53.RecordTarget.fromAlias(new targets.ApiGateway(api))
            });
            // api.addBasePathMapping(api);
            // domain.addBasePathMapping(api, {basePath: 'cd'});
        }
        else {
            api = new apigateway.RestApi(this, 'itemsApi', {
                restApiName: 'Alf Instance Service',
                description: 'An AWS Backed Service for providing Alfresco without custom domain',
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
    domain: {
        domainName: 'api.h-o.dev',
        zoneName: 'api.h-o.dev.',
        hostedZoneId: 'Z01486521Z813EMSKNWNH',
        certificateArn: 'arn:aws:acm:eu-west-2:609841182532:certificate/8616e4e3-8570-42db-9cbd-6e6e76da3c5f'
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHNEQUF1RDtBQUN2RCxrREFBbUQ7QUFDbkQsOERBQThEO0FBQzlELDhDQUErQztBQUMvQyxxQ0FBc0M7QUFDdEMsa0RBQW1EO0FBQ25ELDhEQUErRDtBQUMvRCxpREFBaUQ7QUFDakQsMENBQTJDO0FBQzNDLHdDQUF5QztBQUN6QywrQkFBNEI7QUFDNUIsOENBQWtFO0FBQ2xFLGdEQUFnRDtBQUNoRCx3REFBd0Q7QUFDeEQsNEVBQTZEO0FBRzdELE1BQU0sYUFBYSxHQUFHLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUMsQ0FBQztBQUNqRyxNQUFNLFdBQVcsR0FBRyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBQyxDQUFBO0FBQ2pFLE1BQU0sU0FBUyxHQUFHLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFDLENBQUE7QUFFN0QsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLElBQUksTUFBTSxDQUFBO0FBQ3ZELE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxJQUFJLEVBQUUsQ0FBQztBQWdCdEQsTUFBYSxpQkFBa0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQUM5QyxZQUFZLEdBQVksRUFBRSxFQUFVLEVBQUUsS0FBOEI7O1FBQ2xFLEtBQUssQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXRCLE1BQU0sV0FBVyxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLElBQUksRUFBRTtZQUMvRCxZQUFZLEVBQUU7Z0JBQ1osSUFBSSxFQUFFLGFBQWEsQ0FBQyxVQUFVO2dCQUM5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bEIsR0FBRyxFQUFFO1FBQ0gsTUFBTSxFQUFFLFdBQVc7S0FDcEI7SUFDRCxPQUFPLEVBQUUsdUJBQXVCO0lBQ2hDLFdBQVcsRUFBRSx1QkFBdUI7SUFDcEMsTUFBTSxFQUFFO1FBQ04sVUFBVSxFQUFFLGFBQWE7UUFDekIsUUFBUSxFQUFFLGNBQWM7UUFDeEIsWUFBWSxFQUFFLHVCQUF1QjtRQUNyQyxjQUFjLEVBQUUscUZBQXFGO0tBQ3RHO0NBQ0YsQ0FBQyxDQUFDO0FBRUgsMkNBQTJDO0FBQzNDLG9CQUFvQjtBQUNwQixvQ0FBb0M7QUFDcEMsMENBQTBDO0FBQzFDLE9BQU87QUFDUCxrQ0FBa0M7QUFDbEMseUNBQXlDO0FBQ3pDLHFGQUFxRjtBQUNyRixNQUFNO0FBRU4sR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGFwaWdhdGV3YXkgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtYXBpZ2F0ZXdheScpO1xuaW1wb3J0IGR5bmFtb2RiID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWR5bmFtb2RiJyk7XG4vLyBpbXBvcnQgeyBHbG9iYWxUYWJsZSB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1keW5hbW9kYi1nbG9iYWwnO1xuaW1wb3J0IGxhbWJkYSA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1sYW1iZGEnKTtcbmltcG9ydCBjZGsgPSByZXF1aXJlKCdAYXdzLWNkay9jb3JlJyk7XG5pbXBvcnQgc2ZuID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLXN0ZXBmdW5jdGlvbnMnKTtcbmltcG9ydCBzZm5fdGFza3MgPSByZXF1aXJlKCdAYXdzLWNkay9hd3Mtc3RlcGZ1bmN0aW9ucy10YXNrcycpO1xuaW1wb3J0IGFzc2V0cyA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1zMy1hc3NldHMnKVxuaW1wb3J0IGxvZ3MgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtbG9ncycpO1xuaW1wb3J0IGlhbSA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1pYW0nKTtcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IE1hbmFnZWRQb2xpY3ksIFBvbGljeVN0YXRlbWVudCB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1pYW0nO1xuaW1wb3J0ICogYXMgcm91dGU1MyBmcm9tICdAYXdzLWNkay9hd3Mtcm91dGU1Myc7XG5pbXBvcnQgKiBhcyB0YXJnZXRzIGZyb20gJ0Bhd3MtY2RrL2F3cy1yb3V0ZTUzLXRhcmdldHMnO1xuaW1wb3J0IHsgQ2VydGlmaWNhdGUgfSBmcm9tICdAYXdzLWNkay9hd3MtY2VydGlmaWNhdGVtYW5hZ2VyJ1xuXG5cbmNvbnN0IGluc3RhbmNlVGFibGUgPSB7IG5hbWU6ICdhbGZJbnN0YW5jZXMnLCBwcmltYXJ5S2V5OiAnYWxmVXNlcklkJywgc29ydEtleTogJ2FsZkluc3RhbmNlSWQnfTtcbmNvbnN0IHN0YXRpY1RhYmxlID0geyBuYW1lOiAnc3RhdGljVGFibGUnLCBwcmltYXJ5S2V5OiAnaXRlbXNJZCd9XG5jb25zdCByZXBvVGFibGUgPSB7IG5hbWU6ICdyZXBvVGFibGUnLCBwcmltYXJ5S2V5OiAnYWxmVHlwZSd9XG5cbmNvbnN0IFdJVEhfU1dBR0dFUiA9IHByb2Nlc3MuZW52LldJVEhfU1dBR0dFUiB8fCAndHJ1ZSdcbmNvbnN0IENJX1VTRVJfVE9LRU4gPSBwcm9jZXNzLmVudi5DSV9VU0VSX1RPS0VOIHx8ICcnO1xuXG5pbnRlcmZhY2UgQWxmSW5zdGFuY2VzU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgaW1hZ2VJZD86IHN0cmluZyxcbiAgc3dhZ2dlckZpbGU/OiBzdHJpbmcsXG4gIGVuY3J5cHRCdWNrZXQ/OiBib29sZWFuXG4gIGhvZGV2Q2VydEFybj86IHN0cmluZ1xuICBlbnZpcm9ubWVudDogc3RyaW5nXG4gIGRvbWFpbj86IHtcbiAgICBkb21haW5OYW1lOiBzdHJpbmcsXG4gICAgY2VydGlmaWNhdGVBcm46IHN0cmluZyxcbiAgICB6b25lTmFtZTogc3RyaW5nLFxuICAgIGhvc3RlZFpvbmVJZDogc3RyaW5nXG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEFsZkluc3RhbmNlc1N0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3IoYXBwOiBjZGsuQXBwLCBpZDogc3RyaW5nLCBwcm9wcz86IEFsZkluc3RhbmNlc1N0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihhcHAsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCBkeW5hbW9UYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCBpbnN0YW5jZVRhYmxlLm5hbWUsIHtcbiAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICBuYW1lOiBpbnN0YW5jZVRhYmxlLnByaW1hcnlLZXksXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HXG4gICAgICB9LFxuICAgICAgc29ydEtleToge1xuICAgICAgICBuYW1lOiBpbnN0YW5jZVRhYmxlLnNvcnRLZXksXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HXG4gICAgICB9LFxuICAgICAgdGFibGVOYW1lOiBpbnN0YW5jZVRhYmxlLm5hbWUsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAvLyBOT1QgcmVjb21tZW5kZWQgZm9yIHByb2R1Y3Rpb24gY29kZVxuICAgIH0pO1xuXG4gICAgY29uc3QgZHluYW1vU3RhdGljVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgc3RhdGljVGFibGUubmFtZSwge1xuICAgICAgcGFydGl0aW9uS2V5OiB7XG4gICAgICAgIG5hbWU6IHN0YXRpY1RhYmxlLnByaW1hcnlLZXksXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HXG4gICAgICB9LFxuICAgICAgdGFibGVOYW1lOiBzdGF0aWNUYWJsZS5uYW1lLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gTk9UIHJlY29tbWVuZGVkIGZvciBwcm9kdWN0aW9uIGNvZGVcbiAgICB9KTtcblxuICAgIGNvbnN0IGR5bmFtb1JlcG9UYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCByZXBvVGFibGUubmFtZSwge1xuICAgICAgcGFydGl0aW9uS2V5OiB7XG4gICAgICAgIG5hbWU6IHJlcG9UYWJsZS5wcmltYXJ5S2V5LFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLk5VTUJFUlxuICAgICAgfSxcbiAgICAgIHRhYmxlTmFtZTogcmVwb1RhYmxlLm5hbWUsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAvLyBOT1QgcmVjb21tZW5kZWQgZm9yIHByb2R1Y3Rpb24gY29kZVxuICAgIH0pO1xuXG4gICAgY29uc3QgZ2V0T25lTGFtYmRhID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnZ2V0T25lSXRlbUZ1bmN0aW9uJywge1xuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ2dldC1vbmUuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRBQkxFX05BTUU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUFJJTUFSWV9LRVk6IGluc3RhbmNlVGFibGUucHJpbWFyeUtleSxcbiAgICAgICAgU09SVF9LRVk6IGluc3RhbmNlVGFibGUuc29ydEtleVxuICAgICAgfSxcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9EQVksXG4gICAgfSk7XG5cbiAgICBjb25zdCBnZXRBbGxMYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdnZXRBbGxJdGVtc0Z1bmN0aW9uJywge1xuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ2dldC1hbGwuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRBQkxFX05BTUU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUFJJTUFSWV9LRVk6IGluc3RhbmNlVGFibGUucHJpbWFyeUtleVxuICAgICAgfSxcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9EQVksXG4gICAgfSk7XG5cbiAgICBjb25zdCByb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdSb2xlJywge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2xhbWJkYS5hbWF6b25hd3MuY29tJyksICAgLy8gcmVxdWlyZWRcbiAgICAgIG1hbmFnZWRQb2xpY2llczogW01hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdzZXJ2aWNlLXJvbGUvQVdTTGFtYmRhQmFzaWNFeGVjdXRpb25Sb2xlJyldLFxuICAgIH0pO1xuXG4gICAgcm9sZS5hZGRUb1BvbGljeShuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIHJlc291cmNlczogWycqJ10sXG4gICAgICBhY3Rpb25zOiBbJ2VjMjoqJywgJ2xvZ3M6KiddIH0pKTtcblxuICAgIGNvbnN0IGdldEFsbEluc3RhbmNlc0xhbWJkYSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ2dldEFsbEluc3RhbmNlc0Z1bmN0aW9uJywge1xuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ2dldC1hbGwtaW5zdGFuY2VzLmhhbmRsZXInLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEwX1gsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBQUklNQVJZX0tFWTogaW5zdGFuY2VUYWJsZS5wcmltYXJ5S2V5LFxuICAgICAgICBTT1JUX0tFWTogaW5zdGFuY2VUYWJsZS5zb3J0S2V5LFxuICAgICAgICBTVEFDS19OQU1FOiB0aGlzLnN0YWNrTmFtZVxuICAgICAgfSxcbiAgICAgIHJvbGU6IHJvbGUsXG4gICAgICBsb2dSZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfREFZLFxuICAgIH0pO1xuXG4gICAgY29uc3QgZGVsZXRlT25lID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnZGVsZXRlSXRlbUZ1bmN0aW9uJywge1xuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ2RlbGV0ZS1vbmUuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRBQkxFX05BTUU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUFJJTUFSWV9LRVk6IGluc3RhbmNlVGFibGUucHJpbWFyeUtleSxcbiAgICAgICAgU09SVF9LRVk6IGluc3RhbmNlVGFibGUuc29ydEtleVxuICAgICAgfSxcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9EQVksXG4gICAgfSk7XG5cbiAgICBjb25zdCBwdXRPbmVJdGVtTGFtYmRhID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAncHV0T25lSXRlbScsIHtcbiAgICAgIGNvZGU6IG5ldyBsYW1iZGEuQXNzZXRDb2RlKCdzcmMnKSxcbiAgICAgIGhhbmRsZXI6ICdjcmVhdGUuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRBQkxFX05BTUU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUFJJTUFSWV9LRVk6IGluc3RhbmNlVGFibGUucHJpbWFyeUtleSxcbiAgICAgICAgU09SVF9LRVk6IGluc3RhbmNlVGFibGUuc29ydEtleVxuICAgICAgfSxcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9EQVksXG4gICAgfSk7XG5cbiAgICBjb25zdCBjcmVhdGVJbnN0YW5jZUxhbWJkYSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ2NyZWF0ZUluc3RhbmNlJywge1xuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ2NyZWF0ZS1pbnN0YW5jZS5oYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgUkVQT19UQUJMRSA6IGR5bmFtb1JlcG9UYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFBSSU1BUllfS0VZOiByZXBvVGFibGUucHJpbWFyeUtleSxcbiAgICAgICAgQ0lfVVNFUl9UT0tFTjogQ0lfVVNFUl9UT0tFTixcbiAgICAgICAgU0VDVVJJVFlfR1JPVVA6ICdkZWZhdWx0JyxcbiAgICAgICAgU1RBQ0tfTkFNRTogdGhpcy5zdGFja05hbWUsXG4gICAgICAgIElNQUdFX0lEOiBwcm9wcz8uaW1hZ2VJZCB8fCAnJ1xuICAgICAgfSxcbiAgICAgIHJvbGU6IHJvbGUsXG4gICAgICBsb2dSZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfREFZLFxuICAgIH0pO1xuXG4gICAgZHluYW1vVGFibGUuZ3JhbnRGdWxsQWNjZXNzKGdldEFsbExhbWJkYSk7XG4gICAgZHluYW1vVGFibGUuZ3JhbnRGdWxsQWNjZXNzKGdldE9uZUxhbWJkYSk7XG4gICAgZHluYW1vVGFibGUuZ3JhbnRGdWxsQWNjZXNzKHB1dE9uZUl0ZW1MYW1iZGEpO1xuICAgIGR5bmFtb1RhYmxlLmdyYW50RnVsbEFjY2VzcyhkZWxldGVPbmUpO1xuXG4gICAgZHluYW1vUmVwb1RhYmxlLmdyYW50RnVsbEFjY2VzcyhjcmVhdGVJbnN0YW5jZUxhbWJkYSk7XG5cbiAgICB2YXIgYXBpO1xuXG4gICAgaWYocHJvcHM/LmRvbWFpbil7XG5cbiAgICAgIGNvbnN0IGRvbWFpbiA9IHByb3BzLmRvbWFpbjtcblxuICAgICAgLy8gY29uc3QgZG9tYWluTmFtZSA9IG5ldyBhcGlnYXRld2F5LkRvbWFpbk5hbWUodGhpcywgJ2N1c3RvbS1kb21haW4nLCB7XG4gICAgICAvLyAgIGRvbWFpbk5hbWU6IGRvbWFpbi5kb21haW5OYW1lLFxuICAgICAgLy8gICBjZXJ0aWZpY2F0ZTogQ2VydGlmaWNhdGUuZnJvbUNlcnRpZmljYXRlQXJuKHRoaXMsICdDZXJ0aWZpY2F0ZScsIHByb3BzLmRvbWFpbi5jZXJ0aWZpY2F0ZUFybiksXG4gICAgICAvLyAgIC8vIGVuZHBvaW50VHlwZTogYXBpZ3cuRW5kcG9pbnRUeXBlLkVER0UsIC8vIGRlZmF1bHQgaXMgUkVHSU9OQUxcbiAgICAgIC8vICAgc2VjdXJpdHlQb2xpY3k6IGFwaWdhdGV3YXkuU2VjdXJpdHlQb2xpY3kuVExTXzFfMixcbiAgICAgIC8vICAgLy8gbWFwcGluZzogYXBpXG4gICAgICAvLyB9KTtcblxuICAgICAgYXBpID0gbmV3IGFwaWdhdGV3YXkuUmVzdEFwaSh0aGlzLCAnaXRlbXNBcGknLCB7XG4gICAgICAgIHJlc3RBcGlOYW1lOiAnQWxmIEluc3RhbmNlIFNlcnZpY2UnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ0FuIEFXUyBCYWNrZWQgU2VydmljZSBmb3IgcHJvdmlkaW5nIEFsZnJlc2NvIHdpdGggY3VzdG9tIGRvbWFpbicsXG4gICAgICAgIC8vIGRvbWFpbk5hbWU6IHtcbiAgICAgICAgLy8gICBkb21haW5OYW1lOiBkb21haW4uZG9tYWluTmFtZSxcbiAgICAgICAgLy8gICBjZXJ0aWZpY2F0ZTogQ2VydGlmaWNhdGUuZnJvbUNlcnRpZmljYXRlQXJuKHRoaXMsICdDZXJ0aWZpY2F0ZScsIHByb3BzLmRvbWFpbi5jZXJ0aWZpY2F0ZUFybiksXG4gICAgICAgIC8vIH0sXG4gICAgICAgIGRlZmF1bHRDb3JzUHJlZmxpZ2h0T3B0aW9uczoge1xuICAgICAgICAgIGFsbG93T3JpZ2luczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9PUklHSU5TLFxuICAgICAgICAgIGFsbG93TWV0aG9kczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9NRVRIT0RTIC8vIHRoaXMgaXMgYWxzbyB0aGUgZGVmYXVsdFxuICAgICAgICB9LFxuICAgICAgICAvLyBkZXBsb3lPcHRpb25zOiB7XG4gICAgICAgIC8vICAgbG9nZ2luZ0xldmVsOiBhcGlnYXRld2F5Lk1ldGhvZExvZ2dpbmdMZXZlbC5JTkZPLFxuICAgICAgICAvLyAgIGRhdGFUcmFjZUVuYWJsZWQ6IHRydWVcbiAgICAgICAgLy8gfVxuICAgICAgICBlbmRwb2ludFR5cGVzOiBbYXBpZ2F0ZXdheS5FbmRwb2ludFR5cGUuUkVHSU9OQUxdXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgZG9tYWluTmFtZSA9IGFwaS5hZGREb21haW5OYW1lKCdhcGlEb21haW5OYW1lJywge1xuICAgICAgICBkb21haW5OYW1lOiBkb21haW4uZG9tYWluTmFtZSxcbiAgICAgICAgY2VydGlmaWNhdGU6IENlcnRpZmljYXRlLmZyb21DZXJ0aWZpY2F0ZUFybih0aGlzLCAnQ2VydGlmaWNhdGUnLCBwcm9wcy5kb21haW4uY2VydGlmaWNhdGVBcm4pLFxuICAgICAgICAvLyBlbmRwb2ludFR5cGU6IGFwaWd3LkVuZHBvaW50VHlwZS5FREdFLCAvLyBkZWZhdWx0IGlzIFJFR0lPTkFMXG4gICAgICAgIHNlY3VyaXR5UG9saWN5OiBhcGlnYXRld2F5LlNlY3VyaXR5UG9saWN5LlRMU18xXzIsXG4gICAgICB9KTtcblxuICAgICAgZG9tYWluTmFtZS5hZGRCYXNlUGF0aE1hcHBpbmcoYXBpLCB7YmFzZVBhdGg6ICdhYid9KTtcbiAgICAgIGRvbWFpbk5hbWUuYWRkQmFzZVBhdGhNYXBwaW5nKGFwaSwge2Jhc2VQYXRoOiAnY2QnfSk7XG5cbiAgICAgIG5ldyByb3V0ZTUzLkFSZWNvcmQodGhpcywgJ0N1c3RvbURvbWFpbkFsaWFzUmVjb3JkJywge1xuICAgICAgICB6b25lOiByb3V0ZTUzLkhvc3RlZFpvbmUuZnJvbUhvc3RlZFpvbmVBdHRyaWJ1dGVzKHRoaXMsICdIb2Rldkhvc3RlZFpvbmVJZCcsIHt6b25lTmFtZTogZG9tYWluLnpvbmVOYW1lLCBob3N0ZWRab25lSWQ6IGRvbWFpbi5ob3N0ZWRab25lSWR9KSxcbiAgICAgICAgdGFyZ2V0OiByb3V0ZTUzLlJlY29yZFRhcmdldC5mcm9tQWxpYXMobmV3IHRhcmdldHMuQXBpR2F0ZXdheShhcGkpKVxuICAgICAgfSk7XG5cbiAgICAgIC8vIGFwaS5hZGRCYXNlUGF0aE1hcHBpbmcoYXBpKTtcbiAgICAgIC8vIGRvbWFpbi5hZGRCYXNlUGF0aE1hcHBpbmcoYXBpLCB7YmFzZVBhdGg6ICdjZCd9KTtcblxuICAgIH0gZWxzZSB7XG4gICAgICBhcGkgPSBuZXcgYXBpZ2F0ZXdheS5SZXN0QXBpKHRoaXMsICdpdGVtc0FwaScsIHtcbiAgICAgICAgcmVzdEFwaU5hbWU6ICdBbGYgSW5zdGFuY2UgU2VydmljZScsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnQW4gQVdTIEJhY2tlZCBTZXJ2aWNlIGZvciBwcm92aWRpbmcgQWxmcmVzY28gd2l0aG91dCBjdXN0b20gZG9tYWluJyxcbiAgICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XG4gICAgICAgICAgYWxsb3dPcmlnaW5zOiBhcGlnYXRld2F5LkNvcnMuQUxMX09SSUdJTlMsXG4gICAgICAgICAgYWxsb3dNZXRob2RzOiBhcGlnYXRld2F5LkNvcnMuQUxMX01FVEhPRFMgLy8gdGhpcyBpcyBhbHNvIHRoZSBkZWZhdWx0XG4gICAgICAgIH0sXG4gICAgICAgIGVuZHBvaW50VHlwZXM6IFthcGlnYXRld2F5LkVuZHBvaW50VHlwZS5SRUdJT05BTF1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IGNmbkFwaSA9IGFwaS5ub2RlLmRlZmF1bHRDaGlsZCBhcyBhcGlnYXRld2F5LkNmblJlc3RBcGk7XG5cbiAgICBpZihXSVRIX1NXQUdHRVIgIT09ICdmYWxzZScpe1xuICAgICAgLy8gVXBsb2FkIFN3YWdnZXIgdG8gUzNcbiAgICAgIGNvbnN0IGZpbGVBc3NldCA9IG5ldyBhc3NldHMuQXNzZXQodGhpcywgJ1N3YWdnZXJBc3NldCcsIHtcbiAgICAgICAgcGF0aDogam9pbihfX2Rpcm5hbWUsIHByb3BzPy5zd2FnZ2VyRmlsZSB8fCAnJylcbiAgICAgIH0pO1xuICAgICAgY2ZuQXBpLmJvZHlTM0xvY2F0aW9uID0geyBidWNrZXQ6IGZpbGVBc3NldC5idWNrZXQuYnVja2V0TmFtZSwga2V5OiBmaWxlQXNzZXQuczNPYmplY3RLZXkgfTtcbiAgICB9XG5cbiAgICBjb25zdCBpdGVtcyA9IGFwaS5yb290LmFkZFJlc291cmNlKCdpdGVtcycpO1xuICAgIGNvbnN0IGdldEFsbEludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ2V0QWxsTGFtYmRhKTtcbiAgICBpdGVtcy5hZGRNZXRob2QoJ0dFVCcsIGdldEFsbEludGVncmF0aW9uKTtcblxuICAgIGNvbnN0IGluc3RhbmNlcyA9IGFwaS5yb290LmFkZFJlc291cmNlKCdpbnN0YW5jZXMnKTtcbiAgICBjb25zdCBnZXRBbGxJbnN0YW5jZXNJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGdldEFsbEluc3RhbmNlc0xhbWJkYSk7XG4gICAgaW5zdGFuY2VzLmFkZE1ldGhvZCgnR0VUJywgZ2V0QWxsSW5zdGFuY2VzSW50ZWdyYXRpb24pO1xuXG4gICAgY29uc3Qgc2luZ2xlSXRlbSA9IGl0ZW1zLmFkZFJlc291cmNlKGB7JHtpbnN0YW5jZVRhYmxlLnNvcnRLZXl9fWApO1xuICAgIGNvbnN0IGdldE9uZUludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ2V0T25lTGFtYmRhKTtcbiAgICBzaW5nbGVJdGVtLmFkZE1ldGhvZCgnR0VUJywgZ2V0T25lSW50ZWdyYXRpb24pO1xuXG4gICAgY29uc3QgZGVsZXRlT25lSW50ZWdyYXRpb24gPSBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihkZWxldGVPbmUpO1xuICAgIHNpbmdsZUl0ZW0uYWRkTWV0aG9kKCdERUxFVEUnLCBkZWxldGVPbmVJbnRlZ3JhdGlvbik7XG4gICAgLy8gYWRkQ29yc09wdGlvbnMoc2luZ2xlSXRlbSk7XG5cbiAgICBjb25zdCBjaGVja0NyZWF0aW9uQWxsb3dhbmNlTGFtYmRhID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnY2hlY2tDcmVhdGlvbkFsbG93YW5jZUxhbWJkYScsIHtcbiAgICAgIGNvZGU6IG5ldyBsYW1iZGEuQXNzZXRDb2RlKCdzcmMnKSxcbiAgICAgIGhhbmRsZXI6ICdjaGVjay1jcmVhdGlvbi1hbGxvd2FuY2UuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRBQkxFX05BTUU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVEFCTEVfU1RBVElDX05BTUU6IGR5bmFtb1N0YXRpY1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUFJJTUFSWV9LRVk6IGluc3RhbmNlVGFibGUucHJpbWFyeUtleSxcbiAgICAgIH0sXG4gICAgICBsb2dSZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfREFZLFxuICAgIH0pO1xuXG4gICAgZHluYW1vVGFibGUuZ3JhbnRGdWxsQWNjZXNzKGNoZWNrQ3JlYXRpb25BbGxvd2FuY2VMYW1iZGEpO1xuXG4gICAgLy8gQ29uZmlndXJlIGxvZyBncm91cCBmb3Igc2hvcnQgcmV0ZW50aW9uXG4gICAgY29uc3QgbG9nR3JvdXAgPSBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnTG9nR3JvdXAnLCB7XG4gICAgICByZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfREFZLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGxvZ0dyb3VwTmFtZTogJy9hd3MvbGFtYmRhL2N1c3RvbS8nICsgdGhpcy5zdGFja05hbWVcbiAgICB9KTtcblxuICAgIGNvbnN0IGxnc3RyZWFtID0gbG9nR3JvdXAuYWRkU3RyZWFtKCdteWxvZ2dyb3VwU3RyZWFtJylcblxuICAgIC8vIGxvZ0dyb3VwLmFkZFN1YnNjcmlwdGlvbkZpbHRlcihpZD0nbXlsb2dncm91cF9zdWJzMScsIHtcbiAgICAvLyAgICAgZGVzdGluYXRpb246IG5ldyBMYW1iZGFEZXN0aW5hdGlvbihjcmVhdGVPbmVMYW1iZGEpLFxuICAgIC8vICAgICAvLyBmaWx0ZXJQYXR0ZXJuOiBsb2dzRGVzdGluYXRpb25zLkZpbHRlclBhdHRlcm4uYWxsVGVybXMoXCJFUlJPUlwiLCBcIk1haW5UaHJlYWRcIilcbiAgICAvLyAgICAgZmlsdGVyUGF0dGVybjogbG9ncy5GaWx0ZXJQYXR0ZXJuLmFsbEV2ZW50cygpLFxuICAgIC8vICAgfSk7XG5cbiAgICAvLyBuZXcgbG9ncy5TdWJzY3JpcHRpb25GaWx0ZXIodGhpcywgJ215LXN1YnMxJywge1xuICAgIC8vICAgZGVzdGluYXRpb246IG5ldyBMYW1iZGFEZXN0aW5hdGlvbihjcmVhdGVPbmVMYW1iZGEpLFxuICAgIC8vICAgZmlsdGVyUGF0dGVybjogbG9ncy5GaWx0ZXJQYXR0ZXJuLmFsbEV2ZW50cygpLFxuICAgIC8vICAgbG9nR3JvdXA6IGxvZ0dyb3VwLFxuICAgIC8vIH0pO1xuXG5cbiAgICAvLyAgY3JlYXRlT25lTGFtYmRhLmFkZFBlcm1pc3Npb24oXG4gICAgLy8gICBpZD0nbXlsYW1iZGFmdW5jdGlvbi1pbnZva2UnLCB7XG4gICAgLy8gICAgIHByaW5jaXBhbDogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdsb2dzLmV1LXdlc3QtMi5hbWF6b25hd3MuY29tJyksXG4gICAgLy8gICAgIGFjdGlvbjogJ2xhbWJkYTpJbnZva2VGdW5jdGlvbicsXG4gICAgLy8gICAgIHNvdXJjZUFybjogbG9nR3JvdXAubG9nR3JvdXBBcm5cbiAgICAvLyAgIH0pXG5cbiAgICAvLyAgbG9nR3JvdXAuZ3JhbnRXcml0ZShjcmVhdGVPbmVMYW1iZGEpO1xuXG4gICAgLy8gY29uc3QgY2hlY2tKb2JBY3Rpdml0eSA9IG5ldyBzZm4uQWN0aXZpdHkodGhpcywgJ0NoZWNrSm9iJyk7XG5cbiAgICBjb25zdCBjaGVja0NyZWF0aW9uQWxsb3dhbmNlID0gbmV3IHNmbi5UYXNrKHRoaXMsICdDaGVjayBDcmVhdGlvbiBBbGxvd2FuY2UnLCB7XG4gICAgICB0YXNrOiBuZXcgc2ZuX3Rhc2tzLkludm9rZUZ1bmN0aW9uKGNoZWNrQ3JlYXRpb25BbGxvd2FuY2VMYW1iZGEpLFxuICAgIH0pO1xuXG4gICAgY29uc3QgaW5zZXJ0SXRlbSA9IG5ldyBzZm4uVGFzayh0aGlzLCAnQ3JlYXRlIEl0ZW0nLCB7XG4gICAgICB0YXNrOiBuZXcgc2ZuX3Rhc2tzLkludm9rZUZ1bmN0aW9uKHB1dE9uZUl0ZW1MYW1iZGEpLFxuICAgICAgaW5wdXRQYXRoOiAnJC5pdGVtJ1xuICAgIH0pO1xuXG4gICAgY29uc3QgY3JlYXRlSW5zdGFuY2UgPSBuZXcgc2ZuLlRhc2sodGhpcywgJ0NyZWF0ZSBJbnN0YW5jZScsIHtcbiAgICAgIHRhc2s6IG5ldyBzZm5fdGFza3MuSW52b2tlRnVuY3Rpb24oY3JlYXRlSW5zdGFuY2VMYW1iZGEpLFxuICAgICAgaW5wdXRQYXRoOiAnJC5pdGVtJ1xuICAgIH0pO1xuXG4gICAgLy8gY29uc3QgY3JlYXRlZEluc3RhbmNlVXBkYXRlID0gbmV3IHNmbi5UYXNrKHRoaXMsICdDcmVhdGVkIEluc3RhbmNlIFVwZGF0ZScsIHtcbiAgICAvLyAgIHRhc2s6IG5ldyBzZm5fdGFza3MuSW52b2tlRnVuY3Rpb24oY3JlYXRlT25lTGFtYmRhKSxcbiAgICAvLyAgIGlucHV0UGF0aDogJyQuaXRlbSdcbiAgICAvLyB9KTtcblxuICAgIGNvbnN0IHdhaXRYID0gbmV3IHNmbi5XYWl0KHRoaXMsICdXYWl0IFggU2Vjb25kcycsIHtcbiAgICAgIHRpbWU6IHNmbi5XYWl0VGltZS5kdXJhdGlvbihjZGsuRHVyYXRpb24uc2Vjb25kcyg1KSksXG4gICAgfSk7XG5cbiAgICAvLyBjb25zdCBnZXRTdGF0dXMgPSBuZXcgc2ZuLlRhc2sodGhpcywgJ0dldCBKb2IgU3RhdHVzJywge1xuICAgIC8vICAgdGFzazogbmV3IHNmbl90YXNrcy5JbnZva2VBY3Rpdml0eShjaGVja0pvYkFjdGl2aXR5KSxcbiAgICAvLyAgIGlucHV0UGF0aDogJyQuZ3VpZCcsXG4gICAgLy8gICByZXN1bHRQYXRoOiAnJC5zdGF0dXMnLFxuICAgIC8vIH0pO1xuICAgIGNvbnN0IGlzQWxsb3dlZCA9IG5ldyBzZm4uQ2hvaWNlKHRoaXMsICdDcmVhdGlvbiBBbGxvd2VkPycpO1xuICAgIGNvbnN0IG5vdEFsbG93ZWQgPSBuZXcgc2ZuLkZhaWwodGhpcywgJ05vdCBBbGxvd2VkJywge1xuICAgICAgY2F1c2U6ICdDcmVhdGlvbiBmYWlsZWQnLFxuICAgICAgZXJyb3I6ICdKb2IgcmV0dXJuZWQgZmFpbGVkJyxcbiAgICB9KTtcblxuICAgIC8vIGNvbnN0IGZpbmFsU3RhdHVzID0gbmV3IHNmbi5UYXNrKHRoaXMsICdHZXQgRmluYWwgSm9iIFN0YXR1cycsIHtcbiAgICAvLyAgIHRhc2s6IG5ldyBzZm5fdGFza3MuSW52b2tlQWN0aXZpdHkoY2hlY2tKb2JBY3Rpdml0eSksXG4gICAgLy8gICBpbnB1dFBhdGg6ICckLmd1aWQnLFxuICAgIC8vIH0pO1xuXG4gICAgY29uc3QgY3JlYXRpb25DaGFpbiA9IHNmbi5DaGFpbi5zdGFydChjaGVja0NyZWF0aW9uQWxsb3dhbmNlKVxuICAgICAgLm5leHQoaXNBbGxvd2VkXG4gICAgICAud2hlbihzZm4uQ29uZGl0aW9uLnN0cmluZ0VxdWFscygnJC5yZXN1bHQnLCAnZmFpbGVkJyksIG5vdEFsbG93ZWQpXG4gICAgICAud2hlbihzZm4uQ29uZGl0aW9uLnN0cmluZ0VxdWFscygnJC5yZXN1bHQnLCAnb2snKSwgaW5zZXJ0SXRlbS5uZXh0KGNyZWF0ZUluc3RhbmNlKSlcbiAgICAgIC5vdGhlcndpc2Uod2FpdFgpICk7XG4gICAgLy8gLm5leHQoZ2V0U3RhdHVzKVxuICAgIC8vIC5uZXh0KFxuICAgIC8vICAgaXNDb21wbGV0ZVxuICAgIC8vICAgICAud2hlbihzZm4uQ29uZGl0aW9uLnN0cmluZ0VxdWFscygnJC5zdGF0dXMnLCAnRkFJTEVEJyksIGpvYkZhaWxlZClcbiAgICAvLyAgICAgLndoZW4oc2ZuLkNvbmRpdGlvbi5zdHJpbmdFcXVhbHMoJyQuc3RhdHVzJywgJ1NVQ0NFRURFRCcpLCBmaW5hbFN0YXR1cylcbiAgICAvLyAgICAgLm90aGVyd2lzZSh3YWl0WCksXG4gICAgLy8gKTtcblxuICAgIGNvbnN0IHVwZGF0ZUl0ZW0gPSBuZXcgc2ZuLlRhc2sodGhpcywgJ1VwZGF0ZSBJdGVtJywge1xuICAgICAgdGFzazogbmV3IHNmbl90YXNrcy5JbnZva2VGdW5jdGlvbihwdXRPbmVJdGVtTGFtYmRhKSxcbiAgICAgIGlucHV0UGF0aDogJyQuaXRlbSdcbiAgICB9KTtcblxuICAgIGNvbnN0IHVwZGF0ZUNoYWluID0gc2ZuLkNoYWluLnN0YXJ0KHVwZGF0ZUl0ZW0pXG5cbiAgICBjb25zdCBjcmVhdGVTdGF0ZU1hY2hpbmUgPSBuZXcgc2ZuLlN0YXRlTWFjaGluZSh0aGlzLCAnQ3JlYXRlU3RhdGVNYWNoaW5lJywge1xuICAgICAgZGVmaW5pdGlvbjogY3JlYXRpb25DaGFpbixcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHVwZGF0ZVN0YXRlTWFjaGluZSA9IG5ldyBzZm4uU3RhdGVNYWNoaW5lKHRoaXMsICdVcGRhdGVTdGF0ZU1hY2hpbmUnLCB7XG4gICAgICBkZWZpbml0aW9uOiB1cGRhdGVDaGFpbixcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGNyZWF0ZU9uZUFwaSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ2NyZWF0ZUl0ZW1GdW5jdGlvbkFwaScsIHtcbiAgICAgIGNvZGU6IG5ldyBsYW1iZGEuQXNzZXRDb2RlKCdzcmMnKSxcbiAgICAgIGhhbmRsZXI6ICdjcmVhdGUtYXBpLmhhbmRsZXInLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEwX1gsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBTVEFURV9NQUNISU5FX0FSTjogY3JlYXRlU3RhdGVNYWNoaW5lLnN0YXRlTWFjaGluZUFybixcbiAgICAgICAgU09SVF9LRVk6IGluc3RhbmNlVGFibGUuc29ydEtleVxuICAgICAgfSxcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9EQVksXG4gICAgfSk7XG5cbiAgICBjb25zdCB1cGRhdGVPbmVBcGkgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICd1cGRhdGVJdGVtRnVuY3Rpb24nLCB7XG4gICAgICBjb2RlOiBuZXcgbGFtYmRhLkFzc2V0Q29kZSgnc3JjJyksXG4gICAgICBoYW5kbGVyOiAndXBkYXRlLW9uZS5oYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgU1RBVEVfTUFDSElORV9BUk46IHVwZGF0ZVN0YXRlTWFjaGluZS5zdGF0ZU1hY2hpbmVBcm4sXG4gICAgICAgIFNPUlRfS0VZOiBpbnN0YW5jZVRhYmxlLnNvcnRLZXlcbiAgICAgIH0sXG4gICAgICBsb2dSZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfREFZLFxuICAgIH0pO1xuXG4gICAgY3JlYXRlU3RhdGVNYWNoaW5lLmdyYW50U3RhcnRFeGVjdXRpb24oY3JlYXRlT25lQXBpKTtcbiAgICB1cGRhdGVTdGF0ZU1hY2hpbmUuZ3JhbnRTdGFydEV4ZWN1dGlvbih1cGRhdGVPbmVBcGkpO1xuXG4gICAgY29uc3QgY3JlYXRlT25lSW50ZWdyYXRpb24gPSBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihjcmVhdGVPbmVBcGkpO1xuXG4gICAgaXRlbXMuYWRkTWV0aG9kKCdQT1NUJywgY3JlYXRlT25lSW50ZWdyYXRpb24pO1xuICAgIC8vIGFkZENvcnNPcHRpb25zKGl0ZW1zKTtcblxuICAgIGNvbnN0IHVwZGF0ZU9uZUludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odXBkYXRlT25lQXBpKTtcbiAgICBzaW5nbGVJdGVtLmFkZE1ldGhvZCgnUFVUJywgdXBkYXRlT25lSW50ZWdyYXRpb24pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1RhYmxlTmFtZScsIHtcbiAgICAgIHZhbHVlOiBkeW5hbW9UYWJsZS50YWJsZU5hbWVcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdSZXBvVGFibGVOYW1lJywge1xuICAgICAgdmFsdWU6IGR5bmFtb1JlcG9UYWJsZS50YWJsZU5hbWVcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdSZXN0QXBpRW5kUG9pbnQnLCB7XG4gICAgICB2YWx1ZTogYXBpLnVybFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1Jlc3RBcGlJZCcsIHtcbiAgICAgIHZhbHVlOiBhcGkucmVzdEFwaUlkXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTG9nR3JvdXBOYW1lJywge1xuICAgICAgdmFsdWU6IGxvZ0dyb3VwLmxvZ0dyb3VwTmFtZVxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0xvZ0dyb3VwU3RyZWFtTmFtZScsIHtcbiAgICAgIHZhbHVlOiBsZ3N0cmVhbS5sb2dTdHJlYW1OYW1lXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTEdHcm91cGRDcmVhdGVBcGknLCB7XG4gICAgICB2YWx1ZTogY3JlYXRlT25lQXBpLmxvZ0dyb3VwLmxvZ0dyb3VwTmFtZVxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0xHR3JvdXBkQ3JlYXRlJywge1xuICAgICAgdmFsdWU6IHB1dE9uZUl0ZW1MYW1iZGEubG9nR3JvdXAubG9nR3JvdXBOYW1lXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTEdHcm91cGRDcmVhdGVJbnN0YW5jZScsIHtcbiAgICAgIHZhbHVlOiBjcmVhdGVJbnN0YW5jZUxhbWJkYS5sb2dHcm91cC5sb2dHcm91cE5hbWVcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlEb21haW5OYW1lJywge1xuICAgICAgdmFsdWU6IGFwaS5kb21haW5OYW1lPy5kb21haW5OYW1lIHx8ICcnXG4gICAgfSk7XG5cbiAgfVxufVxuXG4vLyBleHBvcnQgZnVuY3Rpb24gYWRkQ29yc09wdGlvbnMoYXBpUmVzb3VyY2U6IGFwaWdhdGV3YXkuSVJlc291cmNlKSB7XG4vLyAgIGFwaVJlc291cmNlLmFkZE1ldGhvZChcbi8vICAgICAnT1BUSU9OUycsXG4vLyAgICAgbmV3IGFwaWdhdGV3YXkuTW9ja0ludGVncmF0aW9uKHtcbi8vICAgICAgIGludGVncmF0aW9uUmVzcG9uc2VzOiBbXG4vLyAgICAgICAgIHtcbi8vICAgICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcbi8vICAgICAgICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcbi8vICAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOlxuLy8gICAgICAgICAgICAgICBcIidDb250ZW50LVR5cGUsWC1BbXotRGF0ZSxBdXRob3JpemF0aW9uLFgtQXBpLUtleSxYLUFtei1TZWN1cml0eS1Ub2tlbixYLUFtei1Vc2VyLUFnZW50J1wiLFxuLy8gICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogXCInKidcIixcbi8vICAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUNyZWRlbnRpYWxzJzogXCInZmFsc2UnXCIsXG4vLyAgICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogXCInT1BUSU9OUyxHRVQsUFVULFBPU1QsREVMRVRFJ1wiLFxuLy8gICAgICAgICAgIH0sXG4vLyAgICAgICAgIH0sXG4vLyAgICAgICBdLFxuLy8gICAgICAgcGFzc3Rocm91Z2hCZWhhdmlvcjogYXBpZ2F0ZXdheS5QYXNzdGhyb3VnaEJlaGF2aW9yLk5FVkVSLFxuLy8gICAgICAgcmVxdWVzdFRlbXBsYXRlczoge1xuLy8gICAgICAgICAnYXBwbGljYXRpb24vanNvbic6ICd7XCJzdGF0dXNDb2RlXCI6IDIwMH0nLFxuLy8gICAgICAgfSxcbi8vICAgICB9KSxcbi8vICAgICB7XG4vLyAgICAgICBtZXRob2RSZXNwb25zZXM6IFtcbi8vICAgICAgICAge1xuLy8gICAgICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxuLy8gICAgICAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuLy8gICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6IHRydWUsXG4vLyAgICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogdHJ1ZSxcbi8vICAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUNyZWRlbnRpYWxzJzogdHJ1ZSxcbi8vICAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IHRydWUsXG4vLyAgICAgICAgICAgfSxcbi8vICAgICAgICAgfSxcbi8vICAgICAgIF0sXG4vLyAgICAgfSxcbi8vICAgKTtcbi8vIH1cblxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcblxuLy8gbmV3IEFsZkluc3RhbmNlc1N0YWNrKGFwcCwgXCJBbGZJbnN0YW5jZXNTdGFja0V1V2VzdDFcIiwge1xuLy8gICAgIGVudmlyb25tZW50OiAncHJvZCcsXG4vLyAgICAgZW52OiB7XG4vLyAgICAgICByZWdpb246IFwiZXUtd2VzdC0xXCJcbi8vICAgICB9LFxuLy8gICAgIGltYWdlSWQ6ICdhbWktMDRkNWNjOWI4OGY5ZDFkMzknLFxuLy8gICAgIHN3YWdnZXJGaWxlOiAndG1wL3N3YWdnZXJfZnVsbF8ueWFtbCdcbi8vICAgfSk7XG5cbm5ldyBBbGZJbnN0YW5jZXNTdGFjayhhcHAsIFwiQWxmSW5zdGFuY2VzU3RhY2tFdVdlc3QyXCIsIHtcbiAgZW52aXJvbm1lbnQ6ICdkZXYnLFxuICBlbnY6IHtcbiAgICByZWdpb246IFwiZXUtd2VzdC0yXCJcbiAgfSxcbiAgaW1hZ2VJZDogJ2FtaS0wY2I3OTAzMDhmNzU5MWZhNicsXG4gIHN3YWdnZXJGaWxlOiAndG1wL3N3YWdnZXJfZnVsbC55YW1sJyxcbiAgZG9tYWluOiB7XG4gICAgZG9tYWluTmFtZTogJ2FwaS5oLW8uZGV2JyxcbiAgICB6b25lTmFtZTogJ2FwaS5oLW8uZGV2LicsXG4gICAgaG9zdGVkWm9uZUlkOiAnWjAxNDg2NTIxWjgxM0VNU0tOV05IJyxcbiAgICBjZXJ0aWZpY2F0ZUFybjogJ2Fybjphd3M6YWNtOmV1LXdlc3QtMjo2MDk4NDExODI1MzI6Y2VydGlmaWNhdGUvODYxNmU0ZTMtODU3MC00MmRiLTljYmQtNmU2ZTc2ZGEzYzVmJ1xuICB9XG59KTtcblxuLy8gbmV3IEdsb2JhbFRhYmxlKGFwcCwgc3RhdGljVGFibGUubmFtZSwge1xuLy8gICBwYXJ0aXRpb25LZXk6IHtcbi8vICAgICBuYW1lOiBzdGF0aWNUYWJsZS5wcmltYXJ5S2V5LFxuLy8gICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HXG4vLyAgIH0sXG4vLyAgIHRhYmxlTmFtZTogJ2dsb2JhbFRhYmxlVGVzdCcsXG4vLyAgIHJlZ2lvbnM6IFsnZXUtd2VzdC0xJywgJ2V1LXdlc3QtMiddLFxuLy8gICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAvLyBOT1QgcmVjb21tZW5kZWQgZm9yIHByb2R1Y3Rpb24gY29kZVxuLy8gfSk7XG5cbmFwcC5zeW50aCgpO1xuIl19
