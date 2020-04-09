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
            domainName.addBasePathMapping(api);
            // domainName.addBasePathMapping(api, {basePath: 'cd'});
            new route53.ARecord(this, 'CustomDomainAliasRecord', {
                zone: route53.HostedZone.fromHostedZoneAttributes(this, 'HodevHostedZoneId', { zoneName: domain.zoneName, hostedZoneId: domain.hostedZoneId }),
                target: route53.RecordTarget.fromAlias(new targets.ApiGatewayDomain(domainName))
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHNEQUF1RDtBQUN2RCxrREFBbUQ7QUFDbkQsOERBQThEO0FBQzlELDhDQUErQztBQUMvQyxxQ0FBc0M7QUFDdEMsa0RBQW1EO0FBQ25ELDhEQUErRDtBQUMvRCxpREFBaUQ7QUFDakQsMENBQTJDO0FBQzNDLHdDQUF5QztBQUN6QywrQkFBNEI7QUFDNUIsOENBQWtFO0FBQ2xFLGdEQUFnRDtBQUNoRCx3REFBd0Q7QUFDeEQsNEVBQTZEO0FBRzdELE1BQU0sYUFBYSxHQUFHLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUMsQ0FBQztBQUNqRyxNQUFNLFdBQVcsR0FBRyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBQyxDQUFBO0FBQ2pFLE1BQU0sU0FBUyxHQUFHLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFDLENBQUE7QUFFN0QsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLElBQUksTUFBTSxDQUFBO0FBQ3ZELE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxJQUFJLEVBQUUsQ0FBQztBQWdCdEQsTUFBYSxpQkFBa0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQUM5QyxZQUFZLEdBQVksRUFBRSxFQUFVLEVBQUUsS0FBOEI7O1FBQ2xFLEtBQUssQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXRCLE1BQU0sV0FBVyxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLElBQUksRUFBRTtZQUMvRCxZQUFZLEVBQUU7Z0JBQ1osSUFBSSxFQUFFLGFBQWEsQ0FBQyxVQUFVO2dCQUM5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QyxNQUFNLEVBQUU7UUFDTixVQUFVLEVBQUUsYUFBYTtRQUN6QixRQUFRLEVBQUUsY0FBYztRQUN4QixZQUFZLEVBQUUsdUJBQXVCO1FBQ3JDLGNBQWMsRUFBRSxxRkFBcUY7S0FDdEc7Q0FDRixDQUFDLENBQUM7QUFFSCwyQ0FBMkM7QUFDM0Msb0JBQW9CO0FBQ3BCLG9DQUFvQztBQUNwQywwQ0FBMEM7QUFDMUMsT0FBTztBQUNQLGtDQUFrQztBQUNsQyx5Q0FBeUM7QUFDekMscUZBQXFGO0FBQ3JGLE1BQU07QUFFTixHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXBpZ2F0ZXdheSA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1hcGlnYXRld2F5Jyk7XG5pbXBvcnQgZHluYW1vZGIgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtZHluYW1vZGInKTtcbi8vIGltcG9ydCB7IEdsb2JhbFRhYmxlIH0gZnJvbSAnQGF3cy1jZGsvYXdzLWR5bmFtb2RiLWdsb2JhbCc7XG5pbXBvcnQgbGFtYmRhID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWxhbWJkYScpO1xuaW1wb3J0IGNkayA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2NvcmUnKTtcbmltcG9ydCBzZm4gPSByZXF1aXJlKCdAYXdzLWNkay9hd3Mtc3RlcGZ1bmN0aW9ucycpO1xuaW1wb3J0IHNmbl90YXNrcyA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1zdGVwZnVuY3Rpb25zLXRhc2tzJyk7XG5pbXBvcnQgYXNzZXRzID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLXMzLWFzc2V0cycpXG5pbXBvcnQgbG9ncyA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1sb2dzJyk7XG5pbXBvcnQgaWFtID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWlhbScpO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgTWFuYWdlZFBvbGljeSwgUG9saWN5U3RhdGVtZW50IH0gZnJvbSAnQGF3cy1jZGsvYXdzLWlhbSc7XG5pbXBvcnQgKiBhcyByb3V0ZTUzIGZyb20gJ0Bhd3MtY2RrL2F3cy1yb3V0ZTUzJztcbmltcG9ydCAqIGFzIHRhcmdldHMgZnJvbSAnQGF3cy1jZGsvYXdzLXJvdXRlNTMtdGFyZ2V0cyc7XG5pbXBvcnQgeyBDZXJ0aWZpY2F0ZSB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1jZXJ0aWZpY2F0ZW1hbmFnZXInXG5cblxuY29uc3QgaW5zdGFuY2VUYWJsZSA9IHsgbmFtZTogJ2FsZkluc3RhbmNlcycsIHByaW1hcnlLZXk6ICdhbGZVc2VySWQnLCBzb3J0S2V5OiAnYWxmSW5zdGFuY2VJZCd9O1xuY29uc3Qgc3RhdGljVGFibGUgPSB7IG5hbWU6ICdzdGF0aWNUYWJsZScsIHByaW1hcnlLZXk6ICdpdGVtc0lkJ31cbmNvbnN0IHJlcG9UYWJsZSA9IHsgbmFtZTogJ3JlcG9UYWJsZScsIHByaW1hcnlLZXk6ICdhbGZUeXBlJ31cblxuY29uc3QgV0lUSF9TV0FHR0VSID0gcHJvY2Vzcy5lbnYuV0lUSF9TV0FHR0VSIHx8ICd0cnVlJ1xuY29uc3QgQ0lfVVNFUl9UT0tFTiA9IHByb2Nlc3MuZW52LkNJX1VTRVJfVE9LRU4gfHwgJyc7XG5cbmludGVyZmFjZSBBbGZJbnN0YW5jZXNTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICBpbWFnZUlkPzogc3RyaW5nLFxuICBzd2FnZ2VyRmlsZT86IHN0cmluZyxcbiAgZW5jcnlwdEJ1Y2tldD86IGJvb2xlYW5cbiAgaG9kZXZDZXJ0QXJuPzogc3RyaW5nXG4gIGVudmlyb25tZW50OiBzdHJpbmdcbiAgZG9tYWluPzoge1xuICAgIGRvbWFpbk5hbWU6IHN0cmluZyxcbiAgICBjZXJ0aWZpY2F0ZUFybjogc3RyaW5nLFxuICAgIHpvbmVOYW1lOiBzdHJpbmcsXG4gICAgaG9zdGVkWm9uZUlkOiBzdHJpbmdcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgQWxmSW5zdGFuY2VzU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25zdHJ1Y3RvcihhcHA6IGNkay5BcHAsIGlkOiBzdHJpbmcsIHByb3BzPzogQWxmSW5zdGFuY2VzU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKGFwcCwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IGR5bmFtb1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsIGluc3RhbmNlVGFibGUubmFtZSwge1xuICAgICAgcGFydGl0aW9uS2V5OiB7XG4gICAgICAgIG5hbWU6IGluc3RhbmNlVGFibGUucHJpbWFyeUtleSxcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkdcbiAgICAgIH0sXG4gICAgICBzb3J0S2V5OiB7XG4gICAgICAgIG5hbWU6IGluc3RhbmNlVGFibGUuc29ydEtleSxcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkdcbiAgICAgIH0sXG4gICAgICB0YWJsZU5hbWU6IGluc3RhbmNlVGFibGUubmFtZSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIE5PVCByZWNvbW1lbmRlZCBmb3IgcHJvZHVjdGlvbiBjb2RlXG4gICAgfSk7XG5cbiAgICBjb25zdCBkeW5hbW9TdGF0aWNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCBzdGF0aWNUYWJsZS5uYW1lLCB7XG4gICAgICBwYXJ0aXRpb25LZXk6IHtcbiAgICAgICAgbmFtZTogc3RhdGljVGFibGUucHJpbWFyeUtleSxcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkdcbiAgICAgIH0sXG4gICAgICB0YWJsZU5hbWU6IHN0YXRpY1RhYmxlLm5hbWUsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAvLyBOT1QgcmVjb21tZW5kZWQgZm9yIHByb2R1Y3Rpb24gY29kZVxuICAgIH0pO1xuXG4gICAgY29uc3QgZHluYW1vUmVwb1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsIHJlcG9UYWJsZS5uYW1lLCB7XG4gICAgICBwYXJ0aXRpb25LZXk6IHtcbiAgICAgICAgbmFtZTogcmVwb1RhYmxlLnByaW1hcnlLZXksXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSXG4gICAgICB9LFxuICAgICAgdGFibGVOYW1lOiByZXBvVGFibGUubmFtZSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIE5PVCByZWNvbW1lbmRlZCBmb3IgcHJvZHVjdGlvbiBjb2RlXG4gICAgfSk7XG5cbiAgICBjb25zdCBnZXRPbmVMYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdnZXRPbmVJdGVtRnVuY3Rpb24nLCB7XG4gICAgICBjb2RlOiBuZXcgbGFtYmRhLkFzc2V0Q29kZSgnc3JjJyksXG4gICAgICBoYW5kbGVyOiAnZ2V0LW9uZS5oYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVEFCTEVfTkFNRTogZHluYW1vVGFibGUudGFibGVOYW1lLFxuICAgICAgICBQUklNQVJZX0tFWTogaW5zdGFuY2VUYWJsZS5wcmltYXJ5S2V5LFxuICAgICAgICBTT1JUX0tFWTogaW5zdGFuY2VUYWJsZS5zb3J0S2V5XG4gICAgICB9LFxuICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX0RBWSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGdldEFsbExhbWJkYSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ2dldEFsbEl0ZW1zRnVuY3Rpb24nLCB7XG4gICAgICBjb2RlOiBuZXcgbGFtYmRhLkFzc2V0Q29kZSgnc3JjJyksXG4gICAgICBoYW5kbGVyOiAnZ2V0LWFsbC5oYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVEFCTEVfTkFNRTogZHluYW1vVGFibGUudGFibGVOYW1lLFxuICAgICAgICBQUklNQVJZX0tFWTogaW5zdGFuY2VUYWJsZS5wcmltYXJ5S2V5XG4gICAgICB9LFxuICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX0RBWSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ1JvbGUnLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnbGFtYmRhLmFtYXpvbmF3cy5jb20nKSwgICAvLyByZXF1aXJlZFxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUnKV0sXG4gICAgfSk7XG5cbiAgICByb2xlLmFkZFRvUG9saWN5KG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgcmVzb3VyY2VzOiBbJyonXSxcbiAgICAgIGFjdGlvbnM6IFsnZWMyOionLCAnbG9nczoqJ10gfSkpO1xuXG4gICAgY29uc3QgZ2V0QWxsSW5zdGFuY2VzTGFtYmRhID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnZ2V0QWxsSW5zdGFuY2VzRnVuY3Rpb24nLCB7XG4gICAgICBjb2RlOiBuZXcgbGFtYmRhLkFzc2V0Q29kZSgnc3JjJyksXG4gICAgICBoYW5kbGVyOiAnZ2V0LWFsbC1pbnN0YW5jZXMuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFBSSU1BUllfS0VZOiBpbnN0YW5jZVRhYmxlLnByaW1hcnlLZXksXG4gICAgICAgIFNPUlRfS0VZOiBpbnN0YW5jZVRhYmxlLnNvcnRLZXksXG4gICAgICAgIFNUQUNLX05BTUU6IHRoaXMuc3RhY2tOYW1lXG4gICAgICB9LFxuICAgICAgcm9sZTogcm9sZSxcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9EQVksXG4gICAgfSk7XG5cbiAgICBjb25zdCBkZWxldGVPbmUgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdkZWxldGVJdGVtRnVuY3Rpb24nLCB7XG4gICAgICBjb2RlOiBuZXcgbGFtYmRhLkFzc2V0Q29kZSgnc3JjJyksXG4gICAgICBoYW5kbGVyOiAnZGVsZXRlLW9uZS5oYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVEFCTEVfTkFNRTogZHluYW1vVGFibGUudGFibGVOYW1lLFxuICAgICAgICBQUklNQVJZX0tFWTogaW5zdGFuY2VUYWJsZS5wcmltYXJ5S2V5LFxuICAgICAgICBTT1JUX0tFWTogaW5zdGFuY2VUYWJsZS5zb3J0S2V5XG4gICAgICB9LFxuICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX0RBWSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHB1dE9uZUl0ZW1MYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdwdXRPbmVJdGVtJywge1xuICAgICAgY29kZTogbmV3IGxhbWJkYS5Bc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ2NyZWF0ZS5oYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVEFCTEVfTkFNRTogZHluYW1vVGFibGUudGFibGVOYW1lLFxuICAgICAgICBQUklNQVJZX0tFWTogaW5zdGFuY2VUYWJsZS5wcmltYXJ5S2V5LFxuICAgICAgICBTT1JUX0tFWTogaW5zdGFuY2VUYWJsZS5zb3J0S2V5XG4gICAgICB9LFxuICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX0RBWSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGNyZWF0ZUluc3RhbmNlTGFtYmRhID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnY3JlYXRlSW5zdGFuY2UnLCB7XG4gICAgICBjb2RlOiBuZXcgbGFtYmRhLkFzc2V0Q29kZSgnc3JjJyksXG4gICAgICBoYW5kbGVyOiAnY3JlYXRlLWluc3RhbmNlLmhhbmRsZXInLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEwX1gsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBSRVBPX1RBQkxFIDogZHluYW1vUmVwb1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUFJJTUFSWV9LRVk6IHJlcG9UYWJsZS5wcmltYXJ5S2V5LFxuICAgICAgICBDSV9VU0VSX1RPS0VOOiBDSV9VU0VSX1RPS0VOLFxuICAgICAgICBTRUNVUklUWV9HUk9VUDogJ2RlZmF1bHQnLFxuICAgICAgICBTVEFDS19OQU1FOiB0aGlzLnN0YWNrTmFtZSxcbiAgICAgICAgSU1BR0VfSUQ6IHByb3BzPy5pbWFnZUlkIHx8ICcnXG4gICAgICB9LFxuICAgICAgcm9sZTogcm9sZSxcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9EQVksXG4gICAgfSk7XG5cbiAgICBkeW5hbW9UYWJsZS5ncmFudEZ1bGxBY2Nlc3MoZ2V0QWxsTGFtYmRhKTtcbiAgICBkeW5hbW9UYWJsZS5ncmFudEZ1bGxBY2Nlc3MoZ2V0T25lTGFtYmRhKTtcbiAgICBkeW5hbW9UYWJsZS5ncmFudEZ1bGxBY2Nlc3MocHV0T25lSXRlbUxhbWJkYSk7XG4gICAgZHluYW1vVGFibGUuZ3JhbnRGdWxsQWNjZXNzKGRlbGV0ZU9uZSk7XG5cbiAgICBkeW5hbW9SZXBvVGFibGUuZ3JhbnRGdWxsQWNjZXNzKGNyZWF0ZUluc3RhbmNlTGFtYmRhKTtcblxuICAgIHZhciBhcGk7XG5cbiAgICBpZihwcm9wcz8uZG9tYWluKXtcblxuICAgICAgY29uc3QgZG9tYWluID0gcHJvcHMuZG9tYWluO1xuXG4gICAgICAvLyBjb25zdCBkb21haW5OYW1lID0gbmV3IGFwaWdhdGV3YXkuRG9tYWluTmFtZSh0aGlzLCAnY3VzdG9tLWRvbWFpbicsIHtcbiAgICAgIC8vICAgZG9tYWluTmFtZTogZG9tYWluLmRvbWFpbk5hbWUsXG4gICAgICAvLyAgIGNlcnRpZmljYXRlOiBDZXJ0aWZpY2F0ZS5mcm9tQ2VydGlmaWNhdGVBcm4odGhpcywgJ0NlcnRpZmljYXRlJywgcHJvcHMuZG9tYWluLmNlcnRpZmljYXRlQXJuKSxcbiAgICAgIC8vICAgLy8gZW5kcG9pbnRUeXBlOiBhcGlndy5FbmRwb2ludFR5cGUuRURHRSwgLy8gZGVmYXVsdCBpcyBSRUdJT05BTFxuICAgICAgLy8gICBzZWN1cml0eVBvbGljeTogYXBpZ2F0ZXdheS5TZWN1cml0eVBvbGljeS5UTFNfMV8yLFxuICAgICAgLy8gICAvLyBtYXBwaW5nOiBhcGlcbiAgICAgIC8vIH0pO1xuXG4gICAgICBhcGkgPSBuZXcgYXBpZ2F0ZXdheS5SZXN0QXBpKHRoaXMsICdpdGVtc0FwaScsIHtcbiAgICAgICAgcmVzdEFwaU5hbWU6ICdBbGYgSW5zdGFuY2UgU2VydmljZScsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnQW4gQVdTIEJhY2tlZCBTZXJ2aWNlIGZvciBwcm92aWRpbmcgQWxmcmVzY28gd2l0aCBjdXN0b20gZG9tYWluJyxcbiAgICAgICAgLy8gZG9tYWluTmFtZToge1xuICAgICAgICAvLyAgIGRvbWFpbk5hbWU6IGRvbWFpbi5kb21haW5OYW1lLFxuICAgICAgICAvLyAgIGNlcnRpZmljYXRlOiBDZXJ0aWZpY2F0ZS5mcm9tQ2VydGlmaWNhdGVBcm4odGhpcywgJ0NlcnRpZmljYXRlJywgcHJvcHMuZG9tYWluLmNlcnRpZmljYXRlQXJuKSxcbiAgICAgICAgLy8gfSxcbiAgICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XG4gICAgICAgICAgYWxsb3dPcmlnaW5zOiBhcGlnYXRld2F5LkNvcnMuQUxMX09SSUdJTlMsXG4gICAgICAgICAgYWxsb3dNZXRob2RzOiBhcGlnYXRld2F5LkNvcnMuQUxMX01FVEhPRFMgLy8gdGhpcyBpcyBhbHNvIHRoZSBkZWZhdWx0XG4gICAgICAgIH0sXG4gICAgICAgIC8vIGRlcGxveU9wdGlvbnM6IHtcbiAgICAgICAgLy8gICBsb2dnaW5nTGV2ZWw6IGFwaWdhdGV3YXkuTWV0aG9kTG9nZ2luZ0xldmVsLklORk8sXG4gICAgICAgIC8vICAgZGF0YVRyYWNlRW5hYmxlZDogdHJ1ZVxuICAgICAgICAvLyB9XG4gICAgICAgIGVuZHBvaW50VHlwZXM6IFthcGlnYXRld2F5LkVuZHBvaW50VHlwZS5SRUdJT05BTF1cbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBkb21haW5OYW1lID0gYXBpLmFkZERvbWFpbk5hbWUoJ2FwaURvbWFpbk5hbWUnLCB7XG4gICAgICAgIGRvbWFpbk5hbWU6IGRvbWFpbi5kb21haW5OYW1lLFxuICAgICAgICBjZXJ0aWZpY2F0ZTogQ2VydGlmaWNhdGUuZnJvbUNlcnRpZmljYXRlQXJuKHRoaXMsICdDZXJ0aWZpY2F0ZScsIHByb3BzLmRvbWFpbi5jZXJ0aWZpY2F0ZUFybiksXG4gICAgICAgIC8vIGVuZHBvaW50VHlwZTogYXBpZ3cuRW5kcG9pbnRUeXBlLkVER0UsIC8vIGRlZmF1bHQgaXMgUkVHSU9OQUxcbiAgICAgICAgc2VjdXJpdHlQb2xpY3k6IGFwaWdhdGV3YXkuU2VjdXJpdHlQb2xpY3kuVExTXzFfMixcbiAgICAgIH0pO1xuXG4gICAgICBkb21haW5OYW1lLmFkZEJhc2VQYXRoTWFwcGluZyhhcGkpO1xuICAgICAgLy8gZG9tYWluTmFtZS5hZGRCYXNlUGF0aE1hcHBpbmcoYXBpLCB7YmFzZVBhdGg6ICdjZCd9KTtcblxuICAgICAgbmV3IHJvdXRlNTMuQVJlY29yZCh0aGlzLCAnQ3VzdG9tRG9tYWluQWxpYXNSZWNvcmQnLCB7XG4gICAgICAgIHpvbmU6IHJvdXRlNTMuSG9zdGVkWm9uZS5mcm9tSG9zdGVkWm9uZUF0dHJpYnV0ZXModGhpcywgJ0hvZGV2SG9zdGVkWm9uZUlkJywge3pvbmVOYW1lOiBkb21haW4uem9uZU5hbWUsIGhvc3RlZFpvbmVJZDogZG9tYWluLmhvc3RlZFpvbmVJZH0pLFxuICAgICAgICB0YXJnZXQ6IHJvdXRlNTMuUmVjb3JkVGFyZ2V0LmZyb21BbGlhcyhuZXcgdGFyZ2V0cy5BcGlHYXRld2F5RG9tYWluKGRvbWFpbk5hbWUpKVxuICAgICAgfSk7XG5cbiAgICAgIC8vIGFwaS5hZGRCYXNlUGF0aE1hcHBpbmcoYXBpKTtcbiAgICAgIC8vIGRvbWFpbi5hZGRCYXNlUGF0aE1hcHBpbmcoYXBpLCB7YmFzZVBhdGg6ICdjZCd9KTtcblxuICAgIH0gZWxzZSB7XG4gICAgICBhcGkgPSBuZXcgYXBpZ2F0ZXdheS5SZXN0QXBpKHRoaXMsICdpdGVtc0FwaScsIHtcbiAgICAgICAgcmVzdEFwaU5hbWU6ICdBbGYgSW5zdGFuY2UgU2VydmljZScsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnQW4gQVdTIEJhY2tlZCBTZXJ2aWNlIGZvciBwcm92aWRpbmcgQWxmcmVzY28gd2l0aG91dCBjdXN0b20gZG9tYWluJyxcbiAgICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XG4gICAgICAgICAgYWxsb3dPcmlnaW5zOiBhcGlnYXRld2F5LkNvcnMuQUxMX09SSUdJTlMsXG4gICAgICAgICAgYWxsb3dNZXRob2RzOiBhcGlnYXRld2F5LkNvcnMuQUxMX01FVEhPRFMgLy8gdGhpcyBpcyBhbHNvIHRoZSBkZWZhdWx0XG4gICAgICAgIH0sXG4gICAgICAgIGVuZHBvaW50VHlwZXM6IFthcGlnYXRld2F5LkVuZHBvaW50VHlwZS5SRUdJT05BTF1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IGNmbkFwaSA9IGFwaS5ub2RlLmRlZmF1bHRDaGlsZCBhcyBhcGlnYXRld2F5LkNmblJlc3RBcGk7XG5cbiAgICBpZihXSVRIX1NXQUdHRVIgIT09ICdmYWxzZScpe1xuICAgICAgLy8gVXBsb2FkIFN3YWdnZXIgdG8gUzNcbiAgICAgIGNvbnN0IGZpbGVBc3NldCA9IG5ldyBhc3NldHMuQXNzZXQodGhpcywgJ1N3YWdnZXJBc3NldCcsIHtcbiAgICAgICAgcGF0aDogam9pbihfX2Rpcm5hbWUsIHByb3BzPy5zd2FnZ2VyRmlsZSB8fCAnJylcbiAgICAgIH0pO1xuICAgICAgY2ZuQXBpLmJvZHlTM0xvY2F0aW9uID0geyBidWNrZXQ6IGZpbGVBc3NldC5idWNrZXQuYnVja2V0TmFtZSwga2V5OiBmaWxlQXNzZXQuczNPYmplY3RLZXkgfTtcbiAgICB9XG5cbiAgICBjb25zdCBpdGVtcyA9IGFwaS5yb290LmFkZFJlc291cmNlKCdpdGVtcycpO1xuICAgIGNvbnN0IGdldEFsbEludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ2V0QWxsTGFtYmRhKTtcbiAgICBpdGVtcy5hZGRNZXRob2QoJ0dFVCcsIGdldEFsbEludGVncmF0aW9uKTtcblxuICAgIGNvbnN0IGluc3RhbmNlcyA9IGFwaS5yb290LmFkZFJlc291cmNlKCdpbnN0YW5jZXMnKTtcbiAgICBjb25zdCBnZXRBbGxJbnN0YW5jZXNJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGdldEFsbEluc3RhbmNlc0xhbWJkYSk7XG4gICAgaW5zdGFuY2VzLmFkZE1ldGhvZCgnR0VUJywgZ2V0QWxsSW5zdGFuY2VzSW50ZWdyYXRpb24pO1xuXG4gICAgY29uc3Qgc2luZ2xlSXRlbSA9IGl0ZW1zLmFkZFJlc291cmNlKGB7JHtpbnN0YW5jZVRhYmxlLnNvcnRLZXl9fWApO1xuICAgIGNvbnN0IGdldE9uZUludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ2V0T25lTGFtYmRhKTtcbiAgICBzaW5nbGVJdGVtLmFkZE1ldGhvZCgnR0VUJywgZ2V0T25lSW50ZWdyYXRpb24pO1xuXG4gICAgY29uc3QgZGVsZXRlT25lSW50ZWdyYXRpb24gPSBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihkZWxldGVPbmUpO1xuICAgIHNpbmdsZUl0ZW0uYWRkTWV0aG9kKCdERUxFVEUnLCBkZWxldGVPbmVJbnRlZ3JhdGlvbik7XG4gICAgLy8gYWRkQ29yc09wdGlvbnMoc2luZ2xlSXRlbSk7XG5cbiAgICBjb25zdCBjaGVja0NyZWF0aW9uQWxsb3dhbmNlTGFtYmRhID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnY2hlY2tDcmVhdGlvbkFsbG93YW5jZUxhbWJkYScsIHtcbiAgICAgIGNvZGU6IG5ldyBsYW1iZGEuQXNzZXRDb2RlKCdzcmMnKSxcbiAgICAgIGhhbmRsZXI6ICdjaGVjay1jcmVhdGlvbi1hbGxvd2FuY2UuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRBQkxFX05BTUU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVEFCTEVfU1RBVElDX05BTUU6IGR5bmFtb1N0YXRpY1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUFJJTUFSWV9LRVk6IGluc3RhbmNlVGFibGUucHJpbWFyeUtleSxcbiAgICAgIH0sXG4gICAgICBsb2dSZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfREFZLFxuICAgIH0pO1xuXG4gICAgZHluYW1vVGFibGUuZ3JhbnRGdWxsQWNjZXNzKGNoZWNrQ3JlYXRpb25BbGxvd2FuY2VMYW1iZGEpO1xuXG4gICAgLy8gQ29uZmlndXJlIGxvZyBncm91cCBmb3Igc2hvcnQgcmV0ZW50aW9uXG4gICAgY29uc3QgbG9nR3JvdXAgPSBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnTG9nR3JvdXAnLCB7XG4gICAgICByZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfREFZLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGxvZ0dyb3VwTmFtZTogJy9hd3MvbGFtYmRhL2N1c3RvbS8nICsgdGhpcy5zdGFja05hbWVcbiAgICB9KTtcblxuICAgIGNvbnN0IGxnc3RyZWFtID0gbG9nR3JvdXAuYWRkU3RyZWFtKCdteWxvZ2dyb3VwU3RyZWFtJylcblxuICAgIC8vIGxvZ0dyb3VwLmFkZFN1YnNjcmlwdGlvbkZpbHRlcihpZD0nbXlsb2dncm91cF9zdWJzMScsIHtcbiAgICAvLyAgICAgZGVzdGluYXRpb246IG5ldyBMYW1iZGFEZXN0aW5hdGlvbihjcmVhdGVPbmVMYW1iZGEpLFxuICAgIC8vICAgICAvLyBmaWx0ZXJQYXR0ZXJuOiBsb2dzRGVzdGluYXRpb25zLkZpbHRlclBhdHRlcm4uYWxsVGVybXMoXCJFUlJPUlwiLCBcIk1haW5UaHJlYWRcIilcbiAgICAvLyAgICAgZmlsdGVyUGF0dGVybjogbG9ncy5GaWx0ZXJQYXR0ZXJuLmFsbEV2ZW50cygpLFxuICAgIC8vICAgfSk7XG5cbiAgICAvLyBuZXcgbG9ncy5TdWJzY3JpcHRpb25GaWx0ZXIodGhpcywgJ215LXN1YnMxJywge1xuICAgIC8vICAgZGVzdGluYXRpb246IG5ldyBMYW1iZGFEZXN0aW5hdGlvbihjcmVhdGVPbmVMYW1iZGEpLFxuICAgIC8vICAgZmlsdGVyUGF0dGVybjogbG9ncy5GaWx0ZXJQYXR0ZXJuLmFsbEV2ZW50cygpLFxuICAgIC8vICAgbG9nR3JvdXA6IGxvZ0dyb3VwLFxuICAgIC8vIH0pO1xuXG5cbiAgICAvLyAgY3JlYXRlT25lTGFtYmRhLmFkZFBlcm1pc3Npb24oXG4gICAgLy8gICBpZD0nbXlsYW1iZGFmdW5jdGlvbi1pbnZva2UnLCB7XG4gICAgLy8gICAgIHByaW5jaXBhbDogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdsb2dzLmV1LXdlc3QtMi5hbWF6b25hd3MuY29tJyksXG4gICAgLy8gICAgIGFjdGlvbjogJ2xhbWJkYTpJbnZva2VGdW5jdGlvbicsXG4gICAgLy8gICAgIHNvdXJjZUFybjogbG9nR3JvdXAubG9nR3JvdXBBcm5cbiAgICAvLyAgIH0pXG5cbiAgICAvLyAgbG9nR3JvdXAuZ3JhbnRXcml0ZShjcmVhdGVPbmVMYW1iZGEpO1xuXG4gICAgLy8gY29uc3QgY2hlY2tKb2JBY3Rpdml0eSA9IG5ldyBzZm4uQWN0aXZpdHkodGhpcywgJ0NoZWNrSm9iJyk7XG5cbiAgICBjb25zdCBjaGVja0NyZWF0aW9uQWxsb3dhbmNlID0gbmV3IHNmbi5UYXNrKHRoaXMsICdDaGVjayBDcmVhdGlvbiBBbGxvd2FuY2UnLCB7XG4gICAgICB0YXNrOiBuZXcgc2ZuX3Rhc2tzLkludm9rZUZ1bmN0aW9uKGNoZWNrQ3JlYXRpb25BbGxvd2FuY2VMYW1iZGEpLFxuICAgIH0pO1xuXG4gICAgY29uc3QgaW5zZXJ0SXRlbSA9IG5ldyBzZm4uVGFzayh0aGlzLCAnQ3JlYXRlIEl0ZW0nLCB7XG4gICAgICB0YXNrOiBuZXcgc2ZuX3Rhc2tzLkludm9rZUZ1bmN0aW9uKHB1dE9uZUl0ZW1MYW1iZGEpLFxuICAgICAgaW5wdXRQYXRoOiAnJC5pdGVtJ1xuICAgIH0pO1xuXG4gICAgY29uc3QgY3JlYXRlSW5zdGFuY2UgPSBuZXcgc2ZuLlRhc2sodGhpcywgJ0NyZWF0ZSBJbnN0YW5jZScsIHtcbiAgICAgIHRhc2s6IG5ldyBzZm5fdGFza3MuSW52b2tlRnVuY3Rpb24oY3JlYXRlSW5zdGFuY2VMYW1iZGEpLFxuICAgICAgaW5wdXRQYXRoOiAnJC5pdGVtJ1xuICAgIH0pO1xuXG4gICAgLy8gY29uc3QgY3JlYXRlZEluc3RhbmNlVXBkYXRlID0gbmV3IHNmbi5UYXNrKHRoaXMsICdDcmVhdGVkIEluc3RhbmNlIFVwZGF0ZScsIHtcbiAgICAvLyAgIHRhc2s6IG5ldyBzZm5fdGFza3MuSW52b2tlRnVuY3Rpb24oY3JlYXRlT25lTGFtYmRhKSxcbiAgICAvLyAgIGlucHV0UGF0aDogJyQuaXRlbSdcbiAgICAvLyB9KTtcblxuICAgIGNvbnN0IHdhaXRYID0gbmV3IHNmbi5XYWl0KHRoaXMsICdXYWl0IFggU2Vjb25kcycsIHtcbiAgICAgIHRpbWU6IHNmbi5XYWl0VGltZS5kdXJhdGlvbihjZGsuRHVyYXRpb24uc2Vjb25kcyg1KSksXG4gICAgfSk7XG5cbiAgICAvLyBjb25zdCBnZXRTdGF0dXMgPSBuZXcgc2ZuLlRhc2sodGhpcywgJ0dldCBKb2IgU3RhdHVzJywge1xuICAgIC8vICAgdGFzazogbmV3IHNmbl90YXNrcy5JbnZva2VBY3Rpdml0eShjaGVja0pvYkFjdGl2aXR5KSxcbiAgICAvLyAgIGlucHV0UGF0aDogJyQuZ3VpZCcsXG4gICAgLy8gICByZXN1bHRQYXRoOiAnJC5zdGF0dXMnLFxuICAgIC8vIH0pO1xuICAgIGNvbnN0IGlzQWxsb3dlZCA9IG5ldyBzZm4uQ2hvaWNlKHRoaXMsICdDcmVhdGlvbiBBbGxvd2VkPycpO1xuICAgIGNvbnN0IG5vdEFsbG93ZWQgPSBuZXcgc2ZuLkZhaWwodGhpcywgJ05vdCBBbGxvd2VkJywge1xuICAgICAgY2F1c2U6ICdDcmVhdGlvbiBmYWlsZWQnLFxuICAgICAgZXJyb3I6ICdKb2IgcmV0dXJuZWQgZmFpbGVkJyxcbiAgICB9KTtcblxuICAgIC8vIGNvbnN0IGZpbmFsU3RhdHVzID0gbmV3IHNmbi5UYXNrKHRoaXMsICdHZXQgRmluYWwgSm9iIFN0YXR1cycsIHtcbiAgICAvLyAgIHRhc2s6IG5ldyBzZm5fdGFza3MuSW52b2tlQWN0aXZpdHkoY2hlY2tKb2JBY3Rpdml0eSksXG4gICAgLy8gICBpbnB1dFBhdGg6ICckLmd1aWQnLFxuICAgIC8vIH0pO1xuXG4gICAgY29uc3QgY3JlYXRpb25DaGFpbiA9IHNmbi5DaGFpbi5zdGFydChjaGVja0NyZWF0aW9uQWxsb3dhbmNlKVxuICAgICAgLm5leHQoaXNBbGxvd2VkXG4gICAgICAud2hlbihzZm4uQ29uZGl0aW9uLnN0cmluZ0VxdWFscygnJC5yZXN1bHQnLCAnZmFpbGVkJyksIG5vdEFsbG93ZWQpXG4gICAgICAud2hlbihzZm4uQ29uZGl0aW9uLnN0cmluZ0VxdWFscygnJC5yZXN1bHQnLCAnb2snKSwgaW5zZXJ0SXRlbS5uZXh0KGNyZWF0ZUluc3RhbmNlKSlcbiAgICAgIC5vdGhlcndpc2Uod2FpdFgpICk7XG4gICAgLy8gLm5leHQoZ2V0U3RhdHVzKVxuICAgIC8vIC5uZXh0KFxuICAgIC8vICAgaXNDb21wbGV0ZVxuICAgIC8vICAgICAud2hlbihzZm4uQ29uZGl0aW9uLnN0cmluZ0VxdWFscygnJC5zdGF0dXMnLCAnRkFJTEVEJyksIGpvYkZhaWxlZClcbiAgICAvLyAgICAgLndoZW4oc2ZuLkNvbmRpdGlvbi5zdHJpbmdFcXVhbHMoJyQuc3RhdHVzJywgJ1NVQ0NFRURFRCcpLCBmaW5hbFN0YXR1cylcbiAgICAvLyAgICAgLm90aGVyd2lzZSh3YWl0WCksXG4gICAgLy8gKTtcblxuICAgIGNvbnN0IHVwZGF0ZUl0ZW0gPSBuZXcgc2ZuLlRhc2sodGhpcywgJ1VwZGF0ZSBJdGVtJywge1xuICAgICAgdGFzazogbmV3IHNmbl90YXNrcy5JbnZva2VGdW5jdGlvbihwdXRPbmVJdGVtTGFtYmRhKSxcbiAgICAgIGlucHV0UGF0aDogJyQuaXRlbSdcbiAgICB9KTtcblxuICAgIGNvbnN0IHVwZGF0ZUNoYWluID0gc2ZuLkNoYWluLnN0YXJ0KHVwZGF0ZUl0ZW0pXG5cbiAgICBjb25zdCBjcmVhdGVTdGF0ZU1hY2hpbmUgPSBuZXcgc2ZuLlN0YXRlTWFjaGluZSh0aGlzLCAnQ3JlYXRlU3RhdGVNYWNoaW5lJywge1xuICAgICAgZGVmaW5pdGlvbjogY3JlYXRpb25DaGFpbixcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHVwZGF0ZVN0YXRlTWFjaGluZSA9IG5ldyBzZm4uU3RhdGVNYWNoaW5lKHRoaXMsICdVcGRhdGVTdGF0ZU1hY2hpbmUnLCB7XG4gICAgICBkZWZpbml0aW9uOiB1cGRhdGVDaGFpbixcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGNyZWF0ZU9uZUFwaSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ2NyZWF0ZUl0ZW1GdW5jdGlvbkFwaScsIHtcbiAgICAgIGNvZGU6IG5ldyBsYW1iZGEuQXNzZXRDb2RlKCdzcmMnKSxcbiAgICAgIGhhbmRsZXI6ICdjcmVhdGUtYXBpLmhhbmRsZXInLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEwX1gsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBTVEFURV9NQUNISU5FX0FSTjogY3JlYXRlU3RhdGVNYWNoaW5lLnN0YXRlTWFjaGluZUFybixcbiAgICAgICAgU09SVF9LRVk6IGluc3RhbmNlVGFibGUuc29ydEtleVxuICAgICAgfSxcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9EQVksXG4gICAgfSk7XG5cbiAgICBjb25zdCB1cGRhdGVPbmVBcGkgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICd1cGRhdGVJdGVtRnVuY3Rpb24nLCB7XG4gICAgICBjb2RlOiBuZXcgbGFtYmRhLkFzc2V0Q29kZSgnc3JjJyksXG4gICAgICBoYW5kbGVyOiAndXBkYXRlLW9uZS5oYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgU1RBVEVfTUFDSElORV9BUk46IHVwZGF0ZVN0YXRlTWFjaGluZS5zdGF0ZU1hY2hpbmVBcm4sXG4gICAgICAgIFNPUlRfS0VZOiBpbnN0YW5jZVRhYmxlLnNvcnRLZXlcbiAgICAgIH0sXG4gICAgICBsb2dSZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfREFZLFxuICAgIH0pO1xuXG4gICAgY3JlYXRlU3RhdGVNYWNoaW5lLmdyYW50U3RhcnRFeGVjdXRpb24oY3JlYXRlT25lQXBpKTtcbiAgICB1cGRhdGVTdGF0ZU1hY2hpbmUuZ3JhbnRTdGFydEV4ZWN1dGlvbih1cGRhdGVPbmVBcGkpO1xuXG4gICAgY29uc3QgY3JlYXRlT25lSW50ZWdyYXRpb24gPSBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihjcmVhdGVPbmVBcGkpO1xuXG4gICAgaXRlbXMuYWRkTWV0aG9kKCdQT1NUJywgY3JlYXRlT25lSW50ZWdyYXRpb24pO1xuICAgIC8vIGFkZENvcnNPcHRpb25zKGl0ZW1zKTtcblxuICAgIGNvbnN0IHVwZGF0ZU9uZUludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odXBkYXRlT25lQXBpKTtcbiAgICBzaW5nbGVJdGVtLmFkZE1ldGhvZCgnUFVUJywgdXBkYXRlT25lSW50ZWdyYXRpb24pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1RhYmxlTmFtZScsIHtcbiAgICAgIHZhbHVlOiBkeW5hbW9UYWJsZS50YWJsZU5hbWVcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdSZXBvVGFibGVOYW1lJywge1xuICAgICAgdmFsdWU6IGR5bmFtb1JlcG9UYWJsZS50YWJsZU5hbWVcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdSZXN0QXBpRW5kUG9pbnQnLCB7XG4gICAgICB2YWx1ZTogYXBpLnVybFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1Jlc3RBcGlJZCcsIHtcbiAgICAgIHZhbHVlOiBhcGkucmVzdEFwaUlkXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTG9nR3JvdXBOYW1lJywge1xuICAgICAgdmFsdWU6IGxvZ0dyb3VwLmxvZ0dyb3VwTmFtZVxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0xvZ0dyb3VwU3RyZWFtTmFtZScsIHtcbiAgICAgIHZhbHVlOiBsZ3N0cmVhbS5sb2dTdHJlYW1OYW1lXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTEdHcm91cGRDcmVhdGVBcGknLCB7XG4gICAgICB2YWx1ZTogY3JlYXRlT25lQXBpLmxvZ0dyb3VwLmxvZ0dyb3VwTmFtZVxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0xHR3JvdXBkQ3JlYXRlJywge1xuICAgICAgdmFsdWU6IHB1dE9uZUl0ZW1MYW1iZGEubG9nR3JvdXAubG9nR3JvdXBOYW1lXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTEdHcm91cGRDcmVhdGVJbnN0YW5jZScsIHtcbiAgICAgIHZhbHVlOiBjcmVhdGVJbnN0YW5jZUxhbWJkYS5sb2dHcm91cC5sb2dHcm91cE5hbWVcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlEb21haW5OYW1lJywge1xuICAgICAgdmFsdWU6IGFwaS5kb21haW5OYW1lPy5kb21haW5OYW1lIHx8ICcnXG4gICAgfSk7XG5cbiAgfVxufVxuXG4vLyBleHBvcnQgZnVuY3Rpb24gYWRkQ29yc09wdGlvbnMoYXBpUmVzb3VyY2U6IGFwaWdhdGV3YXkuSVJlc291cmNlKSB7XG4vLyAgIGFwaVJlc291cmNlLmFkZE1ldGhvZChcbi8vICAgICAnT1BUSU9OUycsXG4vLyAgICAgbmV3IGFwaWdhdGV3YXkuTW9ja0ludGVncmF0aW9uKHtcbi8vICAgICAgIGludGVncmF0aW9uUmVzcG9uc2VzOiBbXG4vLyAgICAgICAgIHtcbi8vICAgICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcbi8vICAgICAgICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcbi8vICAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOlxuLy8gICAgICAgICAgICAgICBcIidDb250ZW50LVR5cGUsWC1BbXotRGF0ZSxBdXRob3JpemF0aW9uLFgtQXBpLUtleSxYLUFtei1TZWN1cml0eS1Ub2tlbixYLUFtei1Vc2VyLUFnZW50J1wiLFxuLy8gICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogXCInKidcIixcbi8vICAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUNyZWRlbnRpYWxzJzogXCInZmFsc2UnXCIsXG4vLyAgICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogXCInT1BUSU9OUyxHRVQsUFVULFBPU1QsREVMRVRFJ1wiLFxuLy8gICAgICAgICAgIH0sXG4vLyAgICAgICAgIH0sXG4vLyAgICAgICBdLFxuLy8gICAgICAgcGFzc3Rocm91Z2hCZWhhdmlvcjogYXBpZ2F0ZXdheS5QYXNzdGhyb3VnaEJlaGF2aW9yLk5FVkVSLFxuLy8gICAgICAgcmVxdWVzdFRlbXBsYXRlczoge1xuLy8gICAgICAgICAnYXBwbGljYXRpb24vanNvbic6ICd7XCJzdGF0dXNDb2RlXCI6IDIwMH0nLFxuLy8gICAgICAgfSxcbi8vICAgICB9KSxcbi8vICAgICB7XG4vLyAgICAgICBtZXRob2RSZXNwb25zZXM6IFtcbi8vICAgICAgICAge1xuLy8gICAgICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxuLy8gICAgICAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuLy8gICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6IHRydWUsXG4vLyAgICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogdHJ1ZSxcbi8vICAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUNyZWRlbnRpYWxzJzogdHJ1ZSxcbi8vICAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IHRydWUsXG4vLyAgICAgICAgICAgfSxcbi8vICAgICAgICAgfSxcbi8vICAgICAgIF0sXG4vLyAgICAgfSxcbi8vICAgKTtcbi8vIH1cblxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcblxuLy8gbmV3IEFsZkluc3RhbmNlc1N0YWNrKGFwcCwgXCJBbGZJbnN0YW5jZXNTdGFja0V1V2VzdDFcIiwge1xuLy8gICAgIGVudmlyb25tZW50OiAncHJvZCcsXG4vLyAgICAgZW52OiB7XG4vLyAgICAgICByZWdpb246IFwiZXUtd2VzdC0xXCJcbi8vICAgICB9LFxuLy8gICAgIGltYWdlSWQ6ICdhbWktMDRkNWNjOWI4OGY5ZDFkMzknLFxuLy8gICAgIHN3YWdnZXJGaWxlOiAndG1wL3N3YWdnZXJfZnVsbF8ueWFtbCdcbi8vICAgfSk7XG5cbm5ldyBBbGZJbnN0YW5jZXNTdGFjayhhcHAsIFwiQWxmSW5zdGFuY2VzU3RhY2tFdVdlc3QyXCIsIHtcbiAgZW52aXJvbm1lbnQ6ICdkZXYnLFxuICBlbnY6IHtcbiAgICByZWdpb246IFwiZXUtd2VzdC0yXCJcbiAgfSxcbiAgaW1hZ2VJZDogJ2FtaS0wY2I3OTAzMDhmNzU5MWZhNicsXG4gIHN3YWdnZXJGaWxlOiAndG1wL3N3YWdnZXJfZnVsbC55YW1sJyxcbiAgZG9tYWluOiB7XG4gICAgZG9tYWluTmFtZTogJ2FwaS5oLW8uZGV2JyxcbiAgICB6b25lTmFtZTogJ2FwaS5oLW8uZGV2LicsXG4gICAgaG9zdGVkWm9uZUlkOiAnWjAxNDg2NTIxWjgxM0VNU0tOV05IJyxcbiAgICBjZXJ0aWZpY2F0ZUFybjogJ2Fybjphd3M6YWNtOmV1LXdlc3QtMjo2MDk4NDExODI1MzI6Y2VydGlmaWNhdGUvODYxNmU0ZTMtODU3MC00MmRiLTljYmQtNmU2ZTc2ZGEzYzVmJ1xuICB9XG59KTtcblxuLy8gbmV3IEdsb2JhbFRhYmxlKGFwcCwgc3RhdGljVGFibGUubmFtZSwge1xuLy8gICBwYXJ0aXRpb25LZXk6IHtcbi8vICAgICBuYW1lOiBzdGF0aWNUYWJsZS5wcmltYXJ5S2V5LFxuLy8gICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HXG4vLyAgIH0sXG4vLyAgIHRhYmxlTmFtZTogJ2dsb2JhbFRhYmxlVGVzdCcsXG4vLyAgIHJlZ2lvbnM6IFsnZXUtd2VzdC0xJywgJ2V1LXdlc3QtMiddLFxuLy8gICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAvLyBOT1QgcmVjb21tZW5kZWQgZm9yIHByb2R1Y3Rpb24gY29kZVxuLy8gfSk7XG5cbmFwcC5zeW50aCgpO1xuIl19