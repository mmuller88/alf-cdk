"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const aws_apigateway_1 = require("@aws-cdk/aws-apigateway");
const core_1 = require("@aws-cdk/core");
const aws_route53_1 = require("@aws-cdk/aws-route53");
const aws_route53_targets_1 = require("@aws-cdk/aws-route53-targets");
const aws_certificatemanager_1 = require("@aws-cdk/aws-certificatemanager");
const path_1 = require("path");
const aws_s3_assets_1 = require("@aws-cdk/aws-s3-assets");
const static_site_1 = require("./lib/static-site");
const aws_cognito_1 = require("@aws-cdk/aws-cognito");
const statics_1 = require("./src/statics");
const WITH_SWAGGER = process.env.WITH_SWAGGER || 'true';
;
class AlfCdkRestApi {
    constructor(scope, lambdas, props) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        var api = new aws_apigateway_1.RestApi(scope, 'AlfCdkRestApi', {
            restApiName: 'Alf Instance Service',
            description: 'An AWS Backed Service for providing Alfresco with custom domain',
            // domainName: {
            //   domainName: domain.domainName,
            //   certificate: Certificate.fromCertificateArn(this, 'Certificate', props.domain.certificateArn),
            // },
            // defaultCorsPreflightOptions: {
            //   statusCode: 200,
            //   allowOrigins: Cors.ALL_ORIGINS,
            //   allowMethods: Cors.ALL_METHODS, // this is also the default
            //   allowCredentials: false,
            //   allowHeaders: ['Content-Type','X-Amz-Date','Authorization','X-Api-Key','X-Amz-Security-Token']
            // },
            // deployOptions: {
            //   loggingLevel: apigateway.MethodLoggingLevel.INFO,
            //   dataTraceEnabled: true
            // }
            endpointTypes: [aws_apigateway_1.EndpointType.REGIONAL]
        });
        if ((_a = props) === null || _a === void 0 ? void 0 : _a.domain) {
            const domain = props.domain;
            // const domainName = new apigateway.DomainName(this, 'custom-domain', {
            //   domainName: domain.domainName,
            //   certificate: Certificate.fromCertificateArn(this, 'Certificate', props.domain.certificateArn),
            //   // endpointType: apigw.EndpointType.EDGE, // default is REGIONAL
            //   securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
            //   // mapping: api
            // });
            const domainName = api.addDomainName('apiDomainName', {
                domainName: domain.domainName,
                certificate: aws_certificatemanager_1.Certificate.fromCertificateArn(scope, 'Certificate', domain.certificateArn),
                // endpointType: apigw.EndpointType.EDGE, // default is REGIONAL
                securityPolicy: aws_apigateway_1.SecurityPolicy.TLS_1_2,
            });
            // domainName.addBasePathMapping(api);
            // domainName.addBasePathMapping(api, {basePath: 'cd'});
            new aws_route53_1.ARecord(scope, 'CustomDomainAliasRecord', {
                zone: aws_route53_1.HostedZone.fromHostedZoneAttributes(scope, 'HodevHostedZoneId', { zoneName: domain.zoneName, hostedZoneId: domain.hostedZoneId }),
                target: aws_route53_1.RecordTarget.fromAlias(new aws_route53_targets_1.ApiGatewayDomain(domainName))
            });
            // api.addBasePathMapping(api);
            // domain.addBasePathMapping(api, {basePath: 'cd'});
        }
        const cfnApi = api.node.defaultChild;
        if (WITH_SWAGGER !== 'false') {
            // Upload Swagger to S3
            const fileAsset = new aws_s3_assets_1.Asset(scope, 'SwaggerAsset', {
                path: path_1.join(__dirname, ((_c = (_b = props) === null || _b === void 0 ? void 0 : _b.swagger) === null || _c === void 0 ? void 0 : _c.file) || '')
            });
            cfnApi.bodyS3Location = { bucket: fileAsset.bucket.bucketName, key: fileAsset.s3ObjectKey };
            if ((_e = (_d = props) === null || _d === void 0 ? void 0 : _d.swagger) === null || _e === void 0 ? void 0 : _e.domain) {
                const domain = props.swagger.domain;
                new static_site_1.StaticSite(scope, {
                    domainName: domain.domainName,
                    siteSubDomain: domain.subdomain,
                    acmCertRef: domain.certificateArn,
                    swaggerFile: props.swagger.file
                });
            }
        }
        var authorizer;
        if ((_g = (_f = props) === null || _f === void 0 ? void 0 : _f.auth) === null || _g === void 0 ? void 0 : _g.cognito) {
            var userPool;
            if (props.auth.cognito.userPoolArn) {
                userPool = aws_cognito_1.UserPool.fromUserPoolArn(scope, 'cognitoUserPool', props.auth.cognito.userPoolArn);
            }
            else {
                userPool = new aws_cognito_1.UserPool(scope, 'cognitoUserPool', {
                    signInAliases: {
                        username: true,
                        email: true
                    },
                    selfSignUpEnabled: true,
                    userVerification: {
                        emailSubject: 'Verify your email for our awesome app!',
                        emailBody: 'Hello {username}, Thanks for signing up to our awesome app! Your verification code is {####}',
                        emailStyle: aws_cognito_1.VerificationEmailStyle.CODE,
                        smsMessage: 'Hello {username}, Thanks for signing up to our awesome app! Your verification code is {####}',
                    }
                });
            }
            // Authorizer for the Hello World API that uses the
            // Cognito User pool to Authorize users.
            authorizer = new aws_apigateway_1.CfnAuthorizer(scope, 'cfnAuth', {
                restApiId: api.restApiId,
                name: 'HelloWorldAPIAuthorizer',
                type: 'COGNITO_USER_POOLS',
                identitySource: 'method.request.header.Authorization',
                providerArns: [userPool.userPoolArn],
            });
            new aws_apigateway_1.CfnGatewayResponse(scope, 'getAllResponse', {
                responseType: "DEFAULT_4XX",
                // MISSING_AUTHENTICATION_TOKEN
                restApiId: api.restApiId,
                responseParameters: {
                    'gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
                    'gatewayresponse.header.Access-Control-Allow-Headers': "'*'",
                }
            });
        }
        const items = api.root.addResource('items');
        // items.addCorsPreflight({
        //   allowOrigins: Cors.ALL_ORIGINS,
        //   allowMethods: Cors.ALL_METHODS
        // });
        const getAllIntegration = new aws_apigateway_1.LambdaIntegration(lambdas.getAllLambda);
        items.addMethod('GET', getAllIntegration, {
            authorizationType: authorizer ? aws_apigateway_1.AuthorizationType.COGNITO : undefined,
            authorizer: (authorizer ? { authorizerId: authorizer.ref } : undefined)
        });
        // items.addCorsPreflight({
        //   allowOrigins: Cors.ALL_ORIGINS,
        //   allowMethods: Cors.ALL_METHODS, // this is also the default
        //   allowCredentials: true,
        //   allowHeaders: ['Content-Type','X-Amz-Date','Authorization','X-Api-Key','X-Amz-Security-Token']
        // });
        const instances = api.root.addResource('instances');
        const getAllInstancesIntegration = new aws_apigateway_1.LambdaIntegration(lambdas.getAllInstancesLambda);
        instances.addMethod('GET', getAllInstancesIntegration);
        const singleItem = items.addResource(`{${statics_1.instanceTable.sortKey}}`);
        const getOneIntegration = new aws_apigateway_1.LambdaIntegration(lambdas.getOneLambda);
        singleItem.addMethod('GET', getOneIntegration);
        const deleteOneIntegration = new aws_apigateway_1.LambdaIntegration(lambdas.deleteOne);
        singleItem.addMethod('DELETE', deleteOneIntegration);
        const createOneIntegration = new aws_apigateway_1.LambdaIntegration(lambdas.createOneApi);
        const updateOneIntegration = new aws_apigateway_1.LambdaIntegration(lambdas.updateOneApi);
        items.addMethod('POST', createOneIntegration);
        addCorsOptions(items);
        singleItem.addMethod('PUT', updateOneIntegration);
        new core_1.CfnOutput(scope, 'RestApiEndPoint', {
            value: api.url
        });
        new core_1.CfnOutput(scope, 'RestApiId', {
            value: api.restApiId
        });
        new core_1.CfnOutput(scope, 'ApiDomainName', {
            value: ((_h = api.domainName) === null || _h === void 0 ? void 0 : _h.domainName) || ''
        });
    }
}
exports.AlfCdkRestApi = AlfCdkRestApi;
function addCorsOptions(apiResource) {
    apiResource.addMethod('OPTIONS', new aws_apigateway_1.MockIntegration({
        integrationResponses: [{
                statusCode: '200',
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
                    'method.response.header.Access-Control-Allow-Origin': "'https://api-explorer.h-o.dev''",
                    'method.response.header.Access-Control-Allow-Credentials': "'false'",
                    'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
                },
            }],
        passthroughBehavior: aws_apigateway_1.PassthroughBehavior.WHEN_NO_MATCH,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWxmQ2RrUmVzdEFwaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkFsZkNka1Jlc3RBcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSw0REFBc047QUFDdE4sd0NBQXFEO0FBQ3JELHNEQUF5RTtBQUN6RSxzRUFBZ0U7QUFDaEUsNEVBQThEO0FBRTlELCtCQUE0QjtBQUM1QiwwREFBK0M7QUFFL0MsbURBQStDO0FBQy9DLHNEQUF1RTtBQUN2RSwyQ0FBOEM7QUFFOUMsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLElBQUksTUFBTSxDQUFDO0FBT3ZELENBQUM7QUFFRixNQUFhLGFBQWE7SUFFeEIsWUFBWSxLQUFnQixFQUFFLE9BQXNCLEVBQUUsS0FBOEI7O1FBRWxGLElBQUksR0FBRyxHQUFHLElBQUksd0JBQU8sQ0FBQyxLQUFLLEVBQUUsZUFBZSxFQUFFO1lBQzVDLFdBQVcsRUFBRSxzQkFBc0I7WUFDbkMsV0FBVyxFQUFFLGlFQUFpRTtZQUM5RSxnQkFBZ0I7WUFDaEIsbUNBQW1DO1lBQ25DLG1HQUFtRztZQUNuRyxLQUFLO1lBQ0wsaUNBQWlDO1lBQ2pDLHFCQUFxQjtZQUNyQixvQ0FBb0M7WUFDcEMsZ0VBQWdFO1lBQ2hFLDZCQUE2QjtZQUM3QixtR0FBbUc7WUFDbkcsS0FBSztZQUNMLG1CQUFtQjtZQUNuQixzREFBc0Q7WUFDdEQsMkJBQTJCO1lBQzNCLElBQUk7WUFDSixhQUFhLEVBQUUsQ0FBQyw2QkFBWSxDQUFDLFFBQVEsQ0FBQztTQUN2QyxDQUFDLENBQUM7UUFFSCxVQUFHLEtBQUssMENBQUUsTUFBTSxFQUFDO1lBQ2YsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQztZQUM1Qix3RUFBd0U7WUFDeEUsbUNBQW1DO1lBQ25DLG1HQUFtRztZQUNuRyxxRUFBcUU7WUFDckUsdURBQXVEO1lBQ3ZELG9CQUFvQjtZQUNwQixNQUFNO1lBQ04sTUFBTSxVQUFVLEdBQUcsR0FBRyxD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LElBQUksZ0JBQVMsQ0FBQyxLQUFLLEVBQUUsZUFBZSxFQUFFO1lBQ3BDLEtBQUssRUFBRSxPQUFBLEdBQUcsQ0FBQyxVQUFVLDBDQUFFLFVBQVUsS0FBSSxFQUFFO1NBQ3hDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXhLRCxzQ0F3S0M7QUFFRCxTQUFnQixjQUFjLENBQUMsV0FBc0I7SUFDbkQsV0FBVyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxnQ0FBZSxDQUFDO1FBQ25ELG9CQUFvQixFQUFFLENBQUM7Z0JBQ3JCLFVBQVUsRUFBRSxLQUFLO2dCQUNqQixrQkFBa0IsRUFBRTtvQkFDbEIscURBQXFELEVBQUUseUZBQXlGO29CQUNoSixvREFBb0QsRUFBRSxpQ0FBaUM7b0JBQ3ZGLHlEQUF5RCxFQUFFLFNBQVM7b0JBQ3BFLHFEQUFxRCxFQUFFLCtCQUErQjtpQkFDdkY7YUFDRixDQUFDO1FBQ0YsbUJBQW1CLEVBQUUsb0NBQW1CLENBQUMsYUFBYTtRQUN0RCxnQkFBZ0IsRUFBRTtZQUNoQixrQkFBa0IsRUFBRSx1QkFBdUI7U0FDNUM7S0FDRixDQUFDLEVBQUU7UUFDRixlQUFlLEVBQUUsQ0FBQztnQkFDaEIsVUFBVSxFQUFFLEtBQUs7Z0JBQ2pCLGtCQUFrQixFQUFFO29CQUNsQixxREFBcUQsRUFBRSxJQUFJO29CQUMzRCxxREFBcUQsRUFBRSxJQUFJO29CQUMzRCx5REFBeUQsRUFBRSxJQUFJO29CQUMvRCxvREFBb0QsRUFBRSxJQUFJO2lCQUMzRDthQUNGLENBQUM7S0FDSCxDQUFDLENBQUE7QUFDSixDQUFDO0FBMUJELHdDQTBCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFJlc3RBcGksIEVuZHBvaW50VHlwZSwgU2VjdXJpdHlQb2xpY3ksIExhbWJkYUludGVncmF0aW9uLCBDZm5SZXN0QXBpLCBBdXRob3JpemF0aW9uVHlwZSwgQ2ZuQXV0aG9yaXplciwgSVJlc291cmNlLCBNb2NrSW50ZWdyYXRpb24sIFBhc3N0aHJvdWdoQmVoYXZpb3IsIENmbkdhdGV3YXlSZXNwb25zZSB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1hcGlnYXRld2F5JztcbmltcG9ydCB7IENvbnN0cnVjdCwgQ2ZuT3V0cHV0IH0gZnJvbSAnQGF3cy1jZGsvY29yZSc7XG5pbXBvcnQgeyBBUmVjb3JkLCBIb3N0ZWRab25lLCBSZWNvcmRUYXJnZXQgfSBmcm9tICdAYXdzLWNkay9hd3Mtcm91dGU1Myc7XG5pbXBvcnQgeyBBcGlHYXRld2F5RG9tYWluIH0gZnJvbSAnQGF3cy1jZGsvYXdzLXJvdXRlNTMtdGFyZ2V0cyc7XG5pbXBvcnQgeyBDZXJ0aWZpY2F0ZSB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1jZXJ0aWZpY2F0ZW1hbmFnZXInO1xuaW1wb3J0IHsgQWxmQ2RrTGFtYmRhcyB9IGZyb20gJy4vbGliL0FsZkNka0xhbWJkYXMnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgQXNzZXQgfSBmcm9tICdAYXdzLWNkay9hd3MtczMtYXNzZXRzJztcbmltcG9ydCB7IEFsZkluc3RhbmNlc1N0YWNrUHJvcHMgfSBmcm9tICcuJztcbmltcG9ydCB7IFN0YXRpY1NpdGUgfSBmcm9tICcuL2xpYi9zdGF0aWMtc2l0ZSc7XG5pbXBvcnQgeyBVc2VyUG9vbCwgVmVyaWZpY2F0aW9uRW1haWxTdHlsZSB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1jb2duaXRvJ1xuaW1wb3J0IHsgaW5zdGFuY2VUYWJsZSB9IGZyb20gJy4vc3JjL3N0YXRpY3MnO1xuXG5jb25zdCBXSVRIX1NXQUdHRVIgPSBwcm9jZXNzLmVudi5XSVRIX1NXQUdHRVIgfHwgJ3RydWUnO1xuXG5leHBvcnQgaW50ZXJmYWNlIERvbWFpbiB7XG4gIHJlYWRvbmx5IGRvbWFpbk5hbWU6IHN0cmluZyxcbiAgcmVhZG9ubHkgY2VydGlmaWNhdGVBcm46IHN0cmluZyxcbiAgcmVhZG9ubHkgem9uZU5hbWU6IHN0cmluZyxcbiAgcmVhZG9ubHkgaG9zdGVkWm9uZUlkOiBzdHJpbmdcbn07XG5cbmV4cG9ydCBjbGFzcyBBbGZDZGtSZXN0QXBpIHtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBsYW1iZGFzOiBBbGZDZGtMYW1iZGFzLCBwcm9wcz86IEFsZkluc3RhbmNlc1N0YWNrUHJvcHMpe1xuXG4gICAgdmFyIGFwaSA9IG5ldyBSZXN0QXBpKHNjb3BlLCAnQWxmQ2RrUmVzdEFwaScsIHtcbiAgICAgIHJlc3RBcGlOYW1lOiAnQWxmIEluc3RhbmNlIFNlcnZpY2UnLFxuICAgICAgZGVzY3JpcHRpb246ICdBbiBBV1MgQmFja2VkIFNlcnZpY2UgZm9yIHByb3ZpZGluZyBBbGZyZXNjbyB3aXRoIGN1c3RvbSBkb21haW4nLFxuICAgICAgLy8gZG9tYWluTmFtZToge1xuICAgICAgLy8gICBkb21haW5OYW1lOiBkb21haW4uZG9tYWluTmFtZSxcbiAgICAgIC8vICAgY2VydGlmaWNhdGU6IENlcnRpZmljYXRlLmZyb21DZXJ0aWZpY2F0ZUFybih0aGlzLCAnQ2VydGlmaWNhdGUnLCBwcm9wcy5kb21haW4uY2VydGlmaWNhdGVBcm4pLFxuICAgICAgLy8gfSxcbiAgICAgIC8vIGRlZmF1bHRDb3JzUHJlZmxpZ2h0T3B0aW9uczoge1xuICAgICAgLy8gICBzdGF0dXNDb2RlOiAyMDAsXG4gICAgICAvLyAgIGFsbG93T3JpZ2luczogQ29ycy5BTExfT1JJR0lOUyxcbiAgICAgIC8vICAgYWxsb3dNZXRob2RzOiBDb3JzLkFMTF9NRVRIT0RTLCAvLyB0aGlzIGlzIGFsc28gdGhlIGRlZmF1bHRcbiAgICAgIC8vICAgYWxsb3dDcmVkZW50aWFsczogZmFsc2UsXG4gICAgICAvLyAgIGFsbG93SGVhZGVyczogWydDb250ZW50LVR5cGUnLCdYLUFtei1EYXRlJywnQXV0aG9yaXphdGlvbicsJ1gtQXBpLUtleScsJ1gtQW16LVNlY3VyaXR5LVRva2VuJ11cbiAgICAgIC8vIH0sXG4gICAgICAvLyBkZXBsb3lPcHRpb25zOiB7XG4gICAgICAvLyAgIGxvZ2dpbmdMZXZlbDogYXBpZ2F0ZXdheS5NZXRob2RMb2dnaW5nTGV2ZWwuSU5GTyxcbiAgICAgIC8vICAgZGF0YVRyYWNlRW5hYmxlZDogdHJ1ZVxuICAgICAgLy8gfVxuICAgICAgZW5kcG9pbnRUeXBlczogW0VuZHBvaW50VHlwZS5SRUdJT05BTF1cbiAgICB9KTtcblxuICAgIGlmKHByb3BzPy5kb21haW4pe1xuICAgICAgY29uc3QgZG9tYWluID0gcHJvcHMuZG9tYWluO1xuICAgICAgLy8gY29uc3QgZG9tYWluTmFtZSA9IG5ldyBhcGlnYXRld2F5LkRvbWFpbk5hbWUodGhpcywgJ2N1c3RvbS1kb21haW4nLCB7XG4gICAgICAvLyAgIGRvbWFpbk5hbWU6IGRvbWFpbi5kb21haW5OYW1lLFxuICAgICAgLy8gICBjZXJ0aWZpY2F0ZTogQ2VydGlmaWNhdGUuZnJvbUNlcnRpZmljYXRlQXJuKHRoaXMsICdDZXJ0aWZpY2F0ZScsIHByb3BzLmRvbWFpbi5jZXJ0aWZpY2F0ZUFybiksXG4gICAgICAvLyAgIC8vIGVuZHBvaW50VHlwZTogYXBpZ3cuRW5kcG9pbnRUeXBlLkVER0UsIC8vIGRlZmF1bHQgaXMgUkVHSU9OQUxcbiAgICAgIC8vICAgc2VjdXJpdHlQb2xpY3k6IGFwaWdhdGV3YXkuU2VjdXJpdHlQb2xpY3kuVExTXzFfMixcbiAgICAgIC8vICAgLy8gbWFwcGluZzogYXBpXG4gICAgICAvLyB9KTtcbiAgICAgIGNvbnN0IGRvbWFpbk5hbWUgPSBhcGkuYWRkRG9tYWluTmFtZSgnYXBpRG9tYWluTmFtZScsIHtcbiAgICAgICAgZG9tYWluTmFtZTogZG9tYWluLmRvbWFpbk5hbWUsXG4gICAgICAgIGNlcnRpZmljYXRlOiBDZXJ0aWZpY2F0ZS5mcm9tQ2VydGlmaWNhdGVBcm4oc2NvcGUsICdDZXJ0aWZpY2F0ZScsIGRvbWFpbi5jZXJ0aWZpY2F0ZUFybiksXG4gICAgICAgIC8vIGVuZHBvaW50VHlwZTogYXBpZ3cuRW5kcG9pbnRUeXBlLkVER0UsIC8vIGRlZmF1bHQgaXMgUkVHSU9OQUxcbiAgICAgICAgc2VjdXJpdHlQb2xpY3k6IFNlY3VyaXR5UG9saWN5LlRMU18xXzIsXG4gICAgICB9KTtcblxuICAgICAgLy8gZG9tYWluTmFtZS5hZGRCYXNlUGF0aE1hcHBpbmcoYXBpKTtcbiAgICAgIC8vIGRvbWFpbk5hbWUuYWRkQmFzZVBhdGhNYXBwaW5nKGFwaSwge2Jhc2VQYXRoOiAnY2QnfSk7XG5cbiAgICAgIG5ldyBBUmVjb3JkKHNjb3BlLCAnQ3VzdG9tRG9tYWluQWxpYXNSZWNvcmQnLCB7XG4gICAgICAgIHpvbmU6IEhvc3RlZFpvbmUuZnJvbUhvc3RlZFpvbmVBdHRyaWJ1dGVzKHNjb3BlLCAnSG9kZXZIb3N0ZWRab25lSWQnLCB7em9uZU5hbWU6IGRvbWFpbi56b25lTmFtZSwgaG9zdGVkWm9uZUlkOiBkb21haW4uaG9zdGVkWm9uZUlkfSksXG4gICAgICAgIHRhcmdldDogUmVjb3JkVGFyZ2V0LmZyb21BbGlhcyhuZXcgQXBpR2F0ZXdheURvbWFpbihkb21haW5OYW1lKSlcbiAgICAgIH0pO1xuICAgICAgLy8gYXBpLmFkZEJhc2VQYXRoTWFwcGluZyhhcGkpO1xuICAgICAgLy8gZG9tYWluLmFkZEJhc2VQYXRoTWFwcGluZyhhcGksIHtiYXNlUGF0aDogJ2NkJ30pO1xuICAgIH1cblxuICAgIGNvbnN0IGNmbkFwaSA9IGFwaS5ub2RlLmRlZmF1bHRDaGlsZCBhcyBDZm5SZXN0QXBpO1xuXG4gICAgaWYoV0lUSF9TV0FHR0VSICE9PSAnZmFsc2UnKXtcbiAgICAgIC8vIFVwbG9hZCBTd2FnZ2VyIHRvIFMzXG4gICAgICBjb25zdCBmaWxlQXNzZXQgPSBuZXcgQXNzZXQoc2NvcGUsICdTd2FnZ2VyQXNzZXQnLCB7XG4gICAgICAgIHBhdGg6IGpvaW4oX19kaXJuYW1lLCBwcm9wcz8uc3dhZ2dlcj8uZmlsZSB8fCAnJylcbiAgICAgIH0pO1xuICAgICAgY2ZuQXBpLmJvZHlTM0xvY2F0aW9uID0geyBidWNrZXQ6IGZpbGVBc3NldC5idWNrZXQuYnVja2V0TmFtZSwga2V5OiBmaWxlQXNzZXQuczNPYmplY3RLZXkgfTtcblxuICAgICAgaWYocHJvcHM/LnN3YWdnZXI/LmRvbWFpbil7XG4gICAgICAgIGNvbnN0IGRvbWFpbiA9IHByb3BzLnN3YWdnZXIuZG9tYWluO1xuICAgICAgICBuZXcgU3RhdGljU2l0ZShzY29wZSwge1xuICAgICAgICAgIGRvbWFpbk5hbWU6IGRvbWFpbi5kb21haW5OYW1lLFxuICAgICAgICAgIHNpdGVTdWJEb21haW46IGRvbWFpbi5zdWJkb21haW4sXG4gICAgICAgICAgYWNtQ2VydFJlZjogZG9tYWluLmNlcnRpZmljYXRlQXJuLFxuICAgICAgICAgIHN3YWdnZXJGaWxlOiBwcm9wcy5zd2FnZ2VyLmZpbGVcbiAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBhdXRob3JpemVyO1xuICAgIGlmKHByb3BzPy5hdXRoPy5jb2duaXRvKXtcblxuICAgICAgdmFyIHVzZXJQb29sO1xuXG4gICAgICBpZihwcm9wcy5hdXRoLmNvZ25pdG8udXNlclBvb2xBcm4pe1xuICAgICAgICB1c2VyUG9vbCA9IFVzZXJQb29sLmZyb21Vc2VyUG9vbEFybihzY29wZSwgJ2NvZ25pdG9Vc2VyUG9vbCcsIHByb3BzLmF1dGguY29nbml0by51c2VyUG9vbEFybik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB1c2VyUG9vbCA9IG5ldyBVc2VyUG9vbChzY29wZSwgJ2NvZ25pdG9Vc2VyUG9vbCcsIHtcbiAgICAgICAgICBzaWduSW5BbGlhc2VzOiB7XG4gICAgICAgICAgICB1c2VybmFtZTogdHJ1ZSxcbiAgICAgICAgICAgIGVtYWlsOiB0cnVlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzZWxmU2lnblVwRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICB1c2VyVmVyaWZpY2F0aW9uOiB7XG4gICAgICAgICAgICBlbWFpbFN1YmplY3Q6ICdWZXJpZnkgeW91ciBlbWFpbCBmb3Igb3VyIGF3ZXNvbWUgYXBwIScsXG4gICAgICAgICAgICBlbWFpbEJvZHk6ICdIZWxsbyB7dXNlcm5hbWV9LCBUaGFua3MgZm9yIHNpZ25pbmcgdXAgdG8gb3VyIGF3ZXNvbWUgYXBwISBZb3VyIHZlcmlmaWNhdGlvbiBjb2RlIGlzIHsjIyMjfScsXG4gICAgICAgICAgICBlbWFpbFN0eWxlOiBWZXJpZmljYXRpb25FbWFpbFN0eWxlLkNPREUsXG4gICAgICAgICAgICBzbXNNZXNzYWdlOiAnSGVsbG8ge3VzZXJuYW1lfSwgVGhhbmtzIGZvciBzaWduaW5nIHVwIHRvIG91ciBhd2Vzb21lIGFwcCEgWW91ciB2ZXJpZmljYXRpb24gY29kZSBpcyB7IyMjI30nLFxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH1cblxuICAgICAgLy8gQXV0aG9yaXplciBmb3IgdGhlIEhlbGxvIFdvcmxkIEFQSSB0aGF0IHVzZXMgdGhlXG4gICAgICAvLyBDb2duaXRvIFVzZXIgcG9vbCB0byBBdXRob3JpemUgdXNlcnMuXG4gICAgICBhdXRob3JpemVyID0gbmV3IENmbkF1dGhvcml6ZXIoc2NvcGUsICdjZm5BdXRoJywge1xuICAgICAgICByZXN0QXBpSWQ6IGFwaS5yZXN0QXBpSWQsXG4gICAgICAgIG5hbWU6ICdIZWxsb1dvcmxkQVBJQXV0aG9yaXplcicsXG4gICAgICAgIHR5cGU6ICdDT0dOSVRPX1VTRVJfUE9PTFMnLFxuICAgICAgICBpZGVudGl0eVNvdXJjZTogJ21ldGhvZC5yZXF1ZXN0LmhlYWRlci5BdXRob3JpemF0aW9uJyxcbiAgICAgICAgcHJvdmlkZXJBcm5zOiBbdXNlclBvb2wudXNlclBvb2xBcm5dLFxuICAgICAgfSlcblxuICAgICAgbmV3IENmbkdhdGV3YXlSZXNwb25zZShzY29wZSwgJ2dldEFsbFJlc3BvbnNlJywge1xuICAgICAgICByZXNwb25zZVR5cGU6IFwiREVGQVVMVF80WFhcIixcbiAgICAgICAgLy8gTUlTU0lOR19BVVRIRU5USUNBVElPTl9UT0tFTlxuICAgICAgICByZXN0QXBpSWQ6IGFwaS5yZXN0QXBpSWQsXG4gICAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAgICdnYXRld2F5cmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IFwiJyonXCIsXG4gICAgICAgICAgJ2dhdGV3YXlyZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6IFwiJyonXCIsXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuXG4gICAgY29uc3QgaXRlbXMgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgnaXRlbXMnKTtcbiAgICAvLyBpdGVtcy5hZGRDb3JzUHJlZmxpZ2h0KHtcbiAgICAvLyAgIGFsbG93T3JpZ2luczogQ29ycy5BTExfT1JJR0lOUyxcbiAgICAvLyAgIGFsbG93TWV0aG9kczogQ29ycy5BTExfTUVUSE9EU1xuICAgIC8vIH0pO1xuXG4gICAgY29uc3QgZ2V0QWxsSW50ZWdyYXRpb24gPSBuZXcgTGFtYmRhSW50ZWdyYXRpb24obGFtYmRhcy5nZXRBbGxMYW1iZGEpO1xuICAgIGl0ZW1zLmFkZE1ldGhvZCgnR0VUJywgZ2V0QWxsSW50ZWdyYXRpb24sIHtcbiAgICAgIGF1dGhvcml6YXRpb25UeXBlOiBhdXRob3JpemVyP0F1dGhvcml6YXRpb25UeXBlLkNPR05JVE8gOiB1bmRlZmluZWQsXG4gICAgICBhdXRob3JpemVyOiAoYXV0aG9yaXplcj8ge2F1dGhvcml6ZXJJZDogYXV0aG9yaXplci5yZWZ9IDogdW5kZWZpbmVkKVxuICAgIH0pO1xuXG5cblxuXG4gICAgLy8gaXRlbXMuYWRkQ29yc1ByZWZsaWdodCh7XG4gICAgLy8gICBhbGxvd09yaWdpbnM6IENvcnMuQUxMX09SSUdJTlMsXG4gICAgLy8gICBhbGxvd01ldGhvZHM6IENvcnMuQUxMX01FVEhPRFMsIC8vIHRoaXMgaXMgYWxzbyB0aGUgZGVmYXVsdFxuICAgIC8vICAgYWxsb3dDcmVkZW50aWFsczogdHJ1ZSxcbiAgICAvLyAgIGFsbG93SGVhZGVyczogWydDb250ZW50LVR5cGUnLCdYLUFtei1EYXRlJywnQXV0aG9yaXphdGlvbicsJ1gtQXBpLUtleScsJ1gtQW16LVNlY3VyaXR5LVRva2VuJ11cbiAgICAvLyB9KTtcblxuICAgIGNvbnN0IGluc3RhbmNlcyA9IGFwaS5yb290LmFkZFJlc291cmNlKCdpbnN0YW5jZXMnKTtcbiAgICBjb25zdCBnZXRBbGxJbnN0YW5jZXNJbnRlZ3JhdGlvbiA9IG5ldyBMYW1iZGFJbnRlZ3JhdGlvbihsYW1iZGFzLmdldEFsbEluc3RhbmNlc0xhbWJkYSk7XG4gICAgaW5zdGFuY2VzLmFkZE1ldGhvZCgnR0VUJywgZ2V0QWxsSW5zdGFuY2VzSW50ZWdyYXRpb24pO1xuXG4gICAgY29uc3Qgc2luZ2xlSXRlbSA9IGl0ZW1zLmFkZFJlc291cmNlKGB7JHtpbnN0YW5jZVRhYmxlLnNvcnRLZXl9fWApO1xuICAgIGNvbnN0IGdldE9uZUludGVncmF0aW9uID0gbmV3IExhbWJkYUludGVncmF0aW9uKGxhbWJkYXMuZ2V0T25lTGFtYmRhKTtcbiAgICBzaW5nbGVJdGVtLmFkZE1ldGhvZCgnR0VUJywgZ2V0T25lSW50ZWdyYXRpb24pO1xuXG4gICAgY29uc3QgZGVsZXRlT25lSW50ZWdyYXRpb24gPSBuZXcgTGFtYmRhSW50ZWdyYXRpb24obGFtYmRhcy5kZWxldGVPbmUpO1xuICAgIHNpbmdsZUl0ZW0uYWRkTWV0aG9kKCdERUxFVEUnLCBkZWxldGVPbmVJbnRlZ3JhdGlvbik7XG5cbiAgICBjb25zdCBjcmVhdGVPbmVJbnRlZ3JhdGlvbiA9IG5ldyBMYW1iZGFJbnRlZ3JhdGlvbihsYW1iZGFzLmNyZWF0ZU9uZUFwaSk7XG4gICAgY29uc3QgdXBkYXRlT25lSW50ZWdyYXRpb24gPSBuZXcgTGFtYmRhSW50ZWdyYXRpb24obGFtYmRhcy51cGRhdGVPbmVBcGkpO1xuXG4gICAgaXRlbXMuYWRkTWV0aG9kKCdQT1NUJywgY3JlYXRlT25lSW50ZWdyYXRpb24pO1xuICAgIGFkZENvcnNPcHRpb25zKGl0ZW1zKTtcbiAgICBzaW5nbGVJdGVtLmFkZE1ldGhvZCgnUFVUJywgdXBkYXRlT25lSW50ZWdyYXRpb24pO1xuXG4gICAgbmV3IENmbk91dHB1dChzY29wZSwgJ1Jlc3RBcGlFbmRQb2ludCcsIHtcbiAgICAgIHZhbHVlOiBhcGkudXJsXG4gICAgfSk7XG5cbiAgICBuZXcgQ2ZuT3V0cHV0KHNjb3BlLCAnUmVzdEFwaUlkJywge1xuICAgICAgdmFsdWU6IGFwaS5yZXN0QXBpSWRcbiAgICB9KTtcblxuICAgIG5ldyBDZm5PdXRwdXQoc2NvcGUsICdBcGlEb21haW5OYW1lJywge1xuICAgICAgdmFsdWU6IGFwaS5kb21haW5OYW1lPy5kb21haW5OYW1lIHx8ICcnXG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFkZENvcnNPcHRpb25zKGFwaVJlc291cmNlOiBJUmVzb3VyY2UpIHtcbiAgYXBpUmVzb3VyY2UuYWRkTWV0aG9kKCdPUFRJT05TJywgbmV3IE1vY2tJbnRlZ3JhdGlvbih7XG4gICAgaW50ZWdyYXRpb25SZXNwb25zZXM6IFt7XG4gICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcbiAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogXCInQ29udGVudC1UeXBlLFgtQW16LURhdGUsQXV0aG9yaXphdGlvbixYLUFwaS1LZXksWC1BbXotU2VjdXJpdHktVG9rZW4sWC1BbXotVXNlci1BZ2VudCdcIixcbiAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogXCInaHR0cHM6Ly9hcGktZXhwbG9yZXIuaC1vLmRldicnXCIsXG4gICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUNyZWRlbnRpYWxzJzogXCInZmFsc2UnXCIsXG4gICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiBcIidPUFRJT05TLEdFVCxQVVQsUE9TVCxERUxFVEUnXCIsXG4gICAgICB9LFxuICAgIH1dLFxuICAgIHBhc3N0aHJvdWdoQmVoYXZpb3I6IFBhc3N0aHJvdWdoQmVoYXZpb3IuV0hFTl9OT19NQVRDSCxcbiAgICByZXF1ZXN0VGVtcGxhdGVzOiB7XG4gICAgICBcImFwcGxpY2F0aW9uL2pzb25cIjogXCJ7XFxcInN0YXR1c0NvZGVcXFwiOiAyMDB9XCJcbiAgICB9LFxuICB9KSwge1xuICAgIG1ldGhvZFJlc3BvbnNlczogW3tcbiAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxuICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiB0cnVlLFxuICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogdHJ1ZSxcbiAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctQ3JlZGVudGlhbHMnOiB0cnVlLFxuICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiB0cnVlLFxuICAgICAgfSxcbiAgICB9XVxuICB9KVxufVxuIl19