"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const aws_apigateway_1 = require("@aws-cdk/aws-apigateway");
const core_1 = require("@aws-cdk/core");
const aws_route53_1 = require("@aws-cdk/aws-route53");
const aws_route53_targets_1 = require("@aws-cdk/aws-route53-targets");
const aws_certificatemanager_1 = require("@aws-cdk/aws-certificatemanager");
const AlfCdkTables_1 = require("./lib/AlfCdkTables");
const path_1 = require("path");
const aws_s3_assets_1 = require("@aws-cdk/aws-s3-assets");
const static_site_1 = require("./lib/static-site");
const aws_cognito_1 = require("@aws-cdk/aws-cognito");
const WITH_SWAGGER = process.env.WITH_SWAGGER || 'true';
;
class AlfCdkRestApi {
    constructor(scope, lambdas, props) {
        var _a, _b, _c, _d, _e, _f, _g;
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
        if ((_f = props) === null || _f === void 0 ? void 0 : _f.cognito) {
            // Cognito User Pool with Email Sign-in Type.
            const userPool = new aws_cognito_1.UserPool(scope, 'userPool', {
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
        const singleItem = items.addResource(`{${AlfCdkTables_1.instanceTable.sortKey}}`);
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
            value: ((_g = api.domainName) === null || _g === void 0 ? void 0 : _g.domainName) || ''
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWxmQ2RrUmVzdEFwaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkFsZkNka1Jlc3RBcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSw0REFBc047QUFDdE4sd0NBQXFEO0FBQ3JELHNEQUF5RTtBQUN6RSxzRUFBZ0U7QUFDaEUsNEVBQThEO0FBRTlELHFEQUFtRDtBQUNuRCwrQkFBNEI7QUFDNUIsMERBQStDO0FBRS9DLG1EQUErQztBQUMvQyxzREFBdUU7QUFFdkUsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLElBQUksTUFBTSxDQUFDO0FBT3ZELENBQUM7QUFFRixNQUFhLGFBQWE7SUFFeEIsWUFBWSxLQUFnQixFQUFFLE9BQXNCLEVBQUUsS0FBOEI7O1FBRWxGLElBQUksR0FBRyxHQUFHLElBQUksd0JBQU8sQ0FBQyxLQUFLLEVBQUUsZUFBZSxFQUFFO1lBQzVDLFdBQVcsRUFBRSxzQkFBc0I7WUFDbkMsV0FBVyxFQUFFLGlFQUFpRTtZQUM5RSxnQkFBZ0I7WUFDaEIsbUNBQW1DO1lBQ25DLG1HQUFtRztZQUNuRyxLQUFLO1lBQ0wsaUNBQWlDO1lBQ2pDLHFCQUFxQjtZQUNyQixvQ0FBb0M7WUFDcEMsZ0VBQWdFO1lBQ2hFLDZCQUE2QjtZQUM3QixtR0FBbUc7WUFDbkcsS0FBSztZQUNMLG1CQUFtQjtZQUNuQixzREFBc0Q7WUFDdEQsMkJBQTJCO1lBQzNCLElBQUk7WUFDSixhQUFhLEVBQUUsQ0FBQyw2QkFBWSxDQUFDLFFBQVEsQ0FBQztTQUN2QyxDQUFDLENBQUM7UUFFSCxVQUFHLEtBQUssMENBQUUsTUFBTSxFQUFDO1lBQ2YsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQztZQUM1Qix3RUFBd0U7WUFDeEUsbUNBQW1DO1lBQ25DLG1HQUFtRztZQUNuRyxxRUFBcUU7WUFDckUsdURBQXVEO1lBQ3ZELG9CQUFvQjtZQUNwQixNQUFNO1lBQ04sTUFBTSxVQUFVLEdBQUcsR0FBRyxD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U0FBUyxFQUFFLElBQUksZ0NBQWUsQ0FBQztRQUNuRCxvQkFBb0IsRUFBRSxDQUFDO2dCQUNyQixVQUFVLEVBQUUsS0FBSztnQkFDakIsa0JBQWtCLEVBQUU7b0JBQ2xCLHFEQUFxRCxFQUFFLHlGQUF5RjtvQkFDaEosb0RBQW9ELEVBQUUsaUNBQWlDO29CQUN2Rix5REFBeUQsRUFBRSxTQUFTO29CQUNwRSxxREFBcUQsRUFBRSwrQkFBK0I7aUJBQ3ZGO2FBQ0YsQ0FBQztRQUNGLG1CQUFtQixFQUFFLG9DQUFtQixDQUFDLGFBQWE7UUFDdEQsZ0JBQWdCLEVBQUU7WUFDaEIsa0JBQWtCLEVBQUUsdUJBQXVCO1NBQzVDO0tBQ0YsQ0FBQyxFQUFFO1FBQ0YsZUFBZSxFQUFFLENBQUM7Z0JBQ2hCLFVBQVUsRUFBRSxLQUFLO2dCQUNqQixrQkFBa0IsRUFBRTtvQkFDbEIscURBQXFELEVBQUUsSUFBSTtvQkFDM0QscURBQXFELEVBQUUsSUFBSTtvQkFDM0QseURBQXlELEVBQUUsSUFBSTtvQkFDL0Qsb0RBQW9ELEVBQUUsSUFBSTtpQkFDM0Q7YUFDRixDQUFDO0tBQ0gsQ0FBQyxDQUFBO0FBQ0osQ0FBQztBQTFCRCx3Q0EwQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBSZXN0QXBpLCBFbmRwb2ludFR5cGUsIFNlY3VyaXR5UG9saWN5LCBMYW1iZGFJbnRlZ3JhdGlvbiwgQ2ZuUmVzdEFwaSwgQXV0aG9yaXphdGlvblR5cGUsIENmbkF1dGhvcml6ZXIsIElSZXNvdXJjZSwgTW9ja0ludGVncmF0aW9uLCBQYXNzdGhyb3VnaEJlaGF2aW9yLCBDZm5HYXRld2F5UmVzcG9uc2UgfSBmcm9tICdAYXdzLWNkay9hd3MtYXBpZ2F0ZXdheSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QsIENmbk91dHB1dCB9IGZyb20gJ0Bhd3MtY2RrL2NvcmUnO1xuaW1wb3J0IHsgQVJlY29yZCwgSG9zdGVkWm9uZSwgUmVjb3JkVGFyZ2V0IH0gZnJvbSAnQGF3cy1jZGsvYXdzLXJvdXRlNTMnO1xuaW1wb3J0IHsgQXBpR2F0ZXdheURvbWFpbiB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1yb3V0ZTUzLXRhcmdldHMnO1xuaW1wb3J0IHsgQ2VydGlmaWNhdGUgfSBmcm9tICdAYXdzLWNkay9hd3MtY2VydGlmaWNhdGVtYW5hZ2VyJztcbmltcG9ydCB7IEFsZkNka0xhbWJkYXMgfSBmcm9tICcuL2xpYi9BbGZDZGtMYW1iZGFzJztcbmltcG9ydCB7IGluc3RhbmNlVGFibGUgfSBmcm9tICcuL2xpYi9BbGZDZGtUYWJsZXMnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgQXNzZXQgfSBmcm9tICdAYXdzLWNkay9hd3MtczMtYXNzZXRzJztcbmltcG9ydCB7IEFsZkluc3RhbmNlc1N0YWNrUHJvcHMgfSBmcm9tICcuJztcbmltcG9ydCB7IFN0YXRpY1NpdGUgfSBmcm9tICcuL2xpYi9zdGF0aWMtc2l0ZSc7XG5pbXBvcnQgeyBVc2VyUG9vbCwgVmVyaWZpY2F0aW9uRW1haWxTdHlsZSB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1jb2duaXRvJ1xuXG5jb25zdCBXSVRIX1NXQUdHRVIgPSBwcm9jZXNzLmVudi5XSVRIX1NXQUdHRVIgfHwgJ3RydWUnO1xuXG5leHBvcnQgaW50ZXJmYWNlIERvbWFpbiB7XG4gIHJlYWRvbmx5IGRvbWFpbk5hbWU6IHN0cmluZyxcbiAgcmVhZG9ubHkgY2VydGlmaWNhdGVBcm46IHN0cmluZyxcbiAgcmVhZG9ubHkgem9uZU5hbWU6IHN0cmluZyxcbiAgcmVhZG9ubHkgaG9zdGVkWm9uZUlkOiBzdHJpbmdcbn07XG5cbmV4cG9ydCBjbGFzcyBBbGZDZGtSZXN0QXBpIHtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBsYW1iZGFzOiBBbGZDZGtMYW1iZGFzLCBwcm9wcz86IEFsZkluc3RhbmNlc1N0YWNrUHJvcHMpe1xuXG4gICAgdmFyIGFwaSA9IG5ldyBSZXN0QXBpKHNjb3BlLCAnQWxmQ2RrUmVzdEFwaScsIHtcbiAgICAgIHJlc3RBcGlOYW1lOiAnQWxmIEluc3RhbmNlIFNlcnZpY2UnLFxuICAgICAgZGVzY3JpcHRpb246ICdBbiBBV1MgQmFja2VkIFNlcnZpY2UgZm9yIHByb3ZpZGluZyBBbGZyZXNjbyB3aXRoIGN1c3RvbSBkb21haW4nLFxuICAgICAgLy8gZG9tYWluTmFtZToge1xuICAgICAgLy8gICBkb21haW5OYW1lOiBkb21haW4uZG9tYWluTmFtZSxcbiAgICAgIC8vICAgY2VydGlmaWNhdGU6IENlcnRpZmljYXRlLmZyb21DZXJ0aWZpY2F0ZUFybih0aGlzLCAnQ2VydGlmaWNhdGUnLCBwcm9wcy5kb21haW4uY2VydGlmaWNhdGVBcm4pLFxuICAgICAgLy8gfSxcbiAgICAgIC8vIGRlZmF1bHRDb3JzUHJlZmxpZ2h0T3B0aW9uczoge1xuICAgICAgLy8gICBzdGF0dXNDb2RlOiAyMDAsXG4gICAgICAvLyAgIGFsbG93T3JpZ2luczogQ29ycy5BTExfT1JJR0lOUyxcbiAgICAgIC8vICAgYWxsb3dNZXRob2RzOiBDb3JzLkFMTF9NRVRIT0RTLCAvLyB0aGlzIGlzIGFsc28gdGhlIGRlZmF1bHRcbiAgICAgIC8vICAgYWxsb3dDcmVkZW50aWFsczogZmFsc2UsXG4gICAgICAvLyAgIGFsbG93SGVhZGVyczogWydDb250ZW50LVR5cGUnLCdYLUFtei1EYXRlJywnQXV0aG9yaXphdGlvbicsJ1gtQXBpLUtleScsJ1gtQW16LVNlY3VyaXR5LVRva2VuJ11cbiAgICAgIC8vIH0sXG4gICAgICAvLyBkZXBsb3lPcHRpb25zOiB7XG4gICAgICAvLyAgIGxvZ2dpbmdMZXZlbDogYXBpZ2F0ZXdheS5NZXRob2RMb2dnaW5nTGV2ZWwuSU5GTyxcbiAgICAgIC8vICAgZGF0YVRyYWNlRW5hYmxlZDogdHJ1ZVxuICAgICAgLy8gfVxuICAgICAgZW5kcG9pbnRUeXBlczogW0VuZHBvaW50VHlwZS5SRUdJT05BTF1cbiAgICB9KTtcblxuICAgIGlmKHByb3BzPy5kb21haW4pe1xuICAgICAgY29uc3QgZG9tYWluID0gcHJvcHMuZG9tYWluO1xuICAgICAgLy8gY29uc3QgZG9tYWluTmFtZSA9IG5ldyBhcGlnYXRld2F5LkRvbWFpbk5hbWUodGhpcywgJ2N1c3RvbS1kb21haW4nLCB7XG4gICAgICAvLyAgIGRvbWFpbk5hbWU6IGRvbWFpbi5kb21haW5OYW1lLFxuICAgICAgLy8gICBjZXJ0aWZpY2F0ZTogQ2VydGlmaWNhdGUuZnJvbUNlcnRpZmljYXRlQXJuKHRoaXMsICdDZXJ0aWZpY2F0ZScsIHByb3BzLmRvbWFpbi5jZXJ0aWZpY2F0ZUFybiksXG4gICAgICAvLyAgIC8vIGVuZHBvaW50VHlwZTogYXBpZ3cuRW5kcG9pbnRUeXBlLkVER0UsIC8vIGRlZmF1bHQgaXMgUkVHSU9OQUxcbiAgICAgIC8vICAgc2VjdXJpdHlQb2xpY3k6IGFwaWdhdGV3YXkuU2VjdXJpdHlQb2xpY3kuVExTXzFfMixcbiAgICAgIC8vICAgLy8gbWFwcGluZzogYXBpXG4gICAgICAvLyB9KTtcbiAgICAgIGNvbnN0IGRvbWFpbk5hbWUgPSBhcGkuYWRkRG9tYWluTmFtZSgnYXBpRG9tYWluTmFtZScsIHtcbiAgICAgICAgZG9tYWluTmFtZTogZG9tYWluLmRvbWFpbk5hbWUsXG4gICAgICAgIGNlcnRpZmljYXRlOiBDZXJ0aWZpY2F0ZS5mcm9tQ2VydGlmaWNhdGVBcm4oc2NvcGUsICdDZXJ0aWZpY2F0ZScsIGRvbWFpbi5jZXJ0aWZpY2F0ZUFybiksXG4gICAgICAgIC8vIGVuZHBvaW50VHlwZTogYXBpZ3cuRW5kcG9pbnRUeXBlLkVER0UsIC8vIGRlZmF1bHQgaXMgUkVHSU9OQUxcbiAgICAgICAgc2VjdXJpdHlQb2xpY3k6IFNlY3VyaXR5UG9saWN5LlRMU18xXzIsXG4gICAgICB9KTtcblxuICAgICAgLy8gZG9tYWluTmFtZS5hZGRCYXNlUGF0aE1hcHBpbmcoYXBpKTtcbiAgICAgIC8vIGRvbWFpbk5hbWUuYWRkQmFzZVBhdGhNYXBwaW5nKGFwaSwge2Jhc2VQYXRoOiAnY2QnfSk7XG5cbiAgICAgIG5ldyBBUmVjb3JkKHNjb3BlLCAnQ3VzdG9tRG9tYWluQWxpYXNSZWNvcmQnLCB7XG4gICAgICAgIHpvbmU6IEhvc3RlZFpvbmUuZnJvbUhvc3RlZFpvbmVBdHRyaWJ1dGVzKHNjb3BlLCAnSG9kZXZIb3N0ZWRab25lSWQnLCB7em9uZU5hbWU6IGRvbWFpbi56b25lTmFtZSwgaG9zdGVkWm9uZUlkOiBkb21haW4uaG9zdGVkWm9uZUlkfSksXG4gICAgICAgIHRhcmdldDogUmVjb3JkVGFyZ2V0LmZyb21BbGlhcyhuZXcgQXBpR2F0ZXdheURvbWFpbihkb21haW5OYW1lKSlcbiAgICAgIH0pO1xuICAgICAgLy8gYXBpLmFkZEJhc2VQYXRoTWFwcGluZyhhcGkpO1xuICAgICAgLy8gZG9tYWluLmFkZEJhc2VQYXRoTWFwcGluZyhhcGksIHtiYXNlUGF0aDogJ2NkJ30pO1xuICAgIH1cblxuICAgIGNvbnN0IGNmbkFwaSA9IGFwaS5ub2RlLmRlZmF1bHRDaGlsZCBhcyBDZm5SZXN0QXBpO1xuXG4gICAgaWYoV0lUSF9TV0FHR0VSICE9PSAnZmFsc2UnKXtcbiAgICAgIC8vIFVwbG9hZCBTd2FnZ2VyIHRvIFMzXG4gICAgICBjb25zdCBmaWxlQXNzZXQgPSBuZXcgQXNzZXQoc2NvcGUsICdTd2FnZ2VyQXNzZXQnLCB7XG4gICAgICAgIHBhdGg6IGpvaW4oX19kaXJuYW1lLCBwcm9wcz8uc3dhZ2dlcj8uZmlsZSB8fCAnJylcbiAgICAgIH0pO1xuICAgICAgY2ZuQXBpLmJvZHlTM0xvY2F0aW9uID0geyBidWNrZXQ6IGZpbGVBc3NldC5idWNrZXQuYnVja2V0TmFtZSwga2V5OiBmaWxlQXNzZXQuczNPYmplY3RLZXkgfTtcblxuICAgICAgaWYocHJvcHM/LnN3YWdnZXI/LmRvbWFpbil7XG4gICAgICAgIGNvbnN0IGRvbWFpbiA9IHByb3BzLnN3YWdnZXIuZG9tYWluO1xuICAgICAgICBuZXcgU3RhdGljU2l0ZShzY29wZSwge1xuICAgICAgICAgIGRvbWFpbk5hbWU6IGRvbWFpbi5kb21haW5OYW1lLFxuICAgICAgICAgIHNpdGVTdWJEb21haW46IGRvbWFpbi5zdWJkb21haW4sXG4gICAgICAgICAgYWNtQ2VydFJlZjogZG9tYWluLmNlcnRpZmljYXRlQXJuLFxuICAgICAgICAgIHN3YWdnZXJGaWxlOiBwcm9wcy5zd2FnZ2VyLmZpbGVcbiAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBhdXRob3JpemVyO1xuICAgIGlmKHByb3BzPy5jb2duaXRvKXtcbiAgICAgICAgLy8gQ29nbml0byBVc2VyIFBvb2wgd2l0aCBFbWFpbCBTaWduLWluIFR5cGUuXG4gICAgICBjb25zdCB1c2VyUG9vbCA9IG5ldyBVc2VyUG9vbChzY29wZSwgJ3VzZXJQb29sJywge1xuICAgICAgICBzaWduSW5BbGlhc2VzOiB7XG4gICAgICAgICAgdXNlcm5hbWU6IHRydWUsXG4gICAgICAgICAgZW1haWw6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgc2VsZlNpZ25VcEVuYWJsZWQ6IHRydWUsXG4gICAgICAgIHVzZXJWZXJpZmljYXRpb246IHtcbiAgICAgICAgICBlbWFpbFN1YmplY3Q6ICdWZXJpZnkgeW91ciBlbWFpbCBmb3Igb3VyIGF3ZXNvbWUgYXBwIScsXG4gICAgICAgICAgZW1haWxCb2R5OiAnSGVsbG8ge3VzZXJuYW1lfSwgVGhhbmtzIGZvciBzaWduaW5nIHVwIHRvIG91ciBhd2Vzb21lIGFwcCEgWW91ciB2ZXJpZmljYXRpb24gY29kZSBpcyB7IyMjI30nLFxuICAgICAgICAgIGVtYWlsU3R5bGU6IFZlcmlmaWNhdGlvbkVtYWlsU3R5bGUuQ09ERSxcbiAgICAgICAgICBzbXNNZXNzYWdlOiAnSGVsbG8ge3VzZXJuYW1lfSwgVGhhbmtzIGZvciBzaWduaW5nIHVwIHRvIG91ciBhd2Vzb21lIGFwcCEgWW91ciB2ZXJpZmljYXRpb24gY29kZSBpcyB7IyMjI30nLFxuICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIC8vIEF1dGhvcml6ZXIgZm9yIHRoZSBIZWxsbyBXb3JsZCBBUEkgdGhhdCB1c2VzIHRoZVxuICAgICAgLy8gQ29nbml0byBVc2VyIHBvb2wgdG8gQXV0aG9yaXplIHVzZXJzLlxuICAgICAgYXV0aG9yaXplciA9IG5ldyBDZm5BdXRob3JpemVyKHNjb3BlLCAnY2ZuQXV0aCcsIHtcbiAgICAgICAgcmVzdEFwaUlkOiBhcGkucmVzdEFwaUlkLFxuICAgICAgICBuYW1lOiAnSGVsbG9Xb3JsZEFQSUF1dGhvcml6ZXInLFxuICAgICAgICB0eXBlOiAnQ09HTklUT19VU0VSX1BPT0xTJyxcbiAgICAgICAgaWRlbnRpdHlTb3VyY2U6ICdtZXRob2QucmVxdWVzdC5oZWFkZXIuQXV0aG9yaXphdGlvbicsXG4gICAgICAgIHByb3ZpZGVyQXJuczogW3VzZXJQb29sLnVzZXJQb29sQXJuXSxcbiAgICAgIH0pXG5cbiAgICAgIG5ldyBDZm5HYXRld2F5UmVzcG9uc2Uoc2NvcGUsICdnZXRBbGxSZXNwb25zZScsIHtcbiAgICAgICAgcmVzcG9uc2VUeXBlOiBcIkRFRkFVTFRfNFhYXCIsXG4gICAgICAgIC8vIE1JU1NJTkdfQVVUSEVOVElDQVRJT05fVE9LRU5cbiAgICAgICAgcmVzdEFwaUlkOiBhcGkucmVzdEFwaUlkLFxuICAgICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAnZ2F0ZXdheXJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiBcIicqJ1wiLFxuICAgICAgICAgICdnYXRld2F5cmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiBcIicqJ1wiLFxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cblxuICAgIGNvbnN0IGl0ZW1zID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2l0ZW1zJyk7XG4gICAgLy8gaXRlbXMuYWRkQ29yc1ByZWZsaWdodCh7XG4gICAgLy8gICBhbGxvd09yaWdpbnM6IENvcnMuQUxMX09SSUdJTlMsXG4gICAgLy8gICBhbGxvd01ldGhvZHM6IENvcnMuQUxMX01FVEhPRFNcbiAgICAvLyB9KTtcblxuICAgIGNvbnN0IGdldEFsbEludGVncmF0aW9uID0gbmV3IExhbWJkYUludGVncmF0aW9uKGxhbWJkYXMuZ2V0QWxsTGFtYmRhKTtcbiAgICBpdGVtcy5hZGRNZXRob2QoJ0dFVCcsIGdldEFsbEludGVncmF0aW9uLCB7XG4gICAgICBhdXRob3JpemF0aW9uVHlwZTogYXV0aG9yaXplcj9BdXRob3JpemF0aW9uVHlwZS5DT0dOSVRPIDogdW5kZWZpbmVkLFxuICAgICAgYXV0aG9yaXplcjogKGF1dGhvcml6ZXI/IHthdXRob3JpemVySWQ6IGF1dGhvcml6ZXIucmVmfSA6IHVuZGVmaW5lZClcbiAgICB9KTtcblxuXG5cblxuICAgIC8vIGl0ZW1zLmFkZENvcnNQcmVmbGlnaHQoe1xuICAgIC8vICAgYWxsb3dPcmlnaW5zOiBDb3JzLkFMTF9PUklHSU5TLFxuICAgIC8vICAgYWxsb3dNZXRob2RzOiBDb3JzLkFMTF9NRVRIT0RTLCAvLyB0aGlzIGlzIGFsc28gdGhlIGRlZmF1bHRcbiAgICAvLyAgIGFsbG93Q3JlZGVudGlhbHM6IHRydWUsXG4gICAgLy8gICBhbGxvd0hlYWRlcnM6IFsnQ29udGVudC1UeXBlJywnWC1BbXotRGF0ZScsJ0F1dGhvcml6YXRpb24nLCdYLUFwaS1LZXknLCdYLUFtei1TZWN1cml0eS1Ub2tlbiddXG4gICAgLy8gfSk7XG5cbiAgICBjb25zdCBpbnN0YW5jZXMgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgnaW5zdGFuY2VzJyk7XG4gICAgY29uc3QgZ2V0QWxsSW5zdGFuY2VzSW50ZWdyYXRpb24gPSBuZXcgTGFtYmRhSW50ZWdyYXRpb24obGFtYmRhcy5nZXRBbGxJbnN0YW5jZXNMYW1iZGEpO1xuICAgIGluc3RhbmNlcy5hZGRNZXRob2QoJ0dFVCcsIGdldEFsbEluc3RhbmNlc0ludGVncmF0aW9uKTtcblxuICAgIGNvbnN0IHNpbmdsZUl0ZW0gPSBpdGVtcy5hZGRSZXNvdXJjZShgeyR7aW5zdGFuY2VUYWJsZS5zb3J0S2V5fX1gKTtcbiAgICBjb25zdCBnZXRPbmVJbnRlZ3JhdGlvbiA9IG5ldyBMYW1iZGFJbnRlZ3JhdGlvbihsYW1iZGFzLmdldE9uZUxhbWJkYSk7XG4gICAgc2luZ2xlSXRlbS5hZGRNZXRob2QoJ0dFVCcsIGdldE9uZUludGVncmF0aW9uKTtcblxuICAgIGNvbnN0IGRlbGV0ZU9uZUludGVncmF0aW9uID0gbmV3IExhbWJkYUludGVncmF0aW9uKGxhbWJkYXMuZGVsZXRlT25lKTtcbiAgICBzaW5nbGVJdGVtLmFkZE1ldGhvZCgnREVMRVRFJywgZGVsZXRlT25lSW50ZWdyYXRpb24pO1xuXG4gICAgY29uc3QgY3JlYXRlT25lSW50ZWdyYXRpb24gPSBuZXcgTGFtYmRhSW50ZWdyYXRpb24obGFtYmRhcy5jcmVhdGVPbmVBcGkpO1xuICAgIGNvbnN0IHVwZGF0ZU9uZUludGVncmF0aW9uID0gbmV3IExhbWJkYUludGVncmF0aW9uKGxhbWJkYXMudXBkYXRlT25lQXBpKTtcblxuICAgIGl0ZW1zLmFkZE1ldGhvZCgnUE9TVCcsIGNyZWF0ZU9uZUludGVncmF0aW9uKTtcbiAgICBhZGRDb3JzT3B0aW9ucyhpdGVtcyk7XG4gICAgc2luZ2xlSXRlbS5hZGRNZXRob2QoJ1BVVCcsIHVwZGF0ZU9uZUludGVncmF0aW9uKTtcblxuICAgIG5ldyBDZm5PdXRwdXQoc2NvcGUsICdSZXN0QXBpRW5kUG9pbnQnLCB7XG4gICAgICB2YWx1ZTogYXBpLnVybFxuICAgIH0pO1xuXG4gICAgbmV3IENmbk91dHB1dChzY29wZSwgJ1Jlc3RBcGlJZCcsIHtcbiAgICAgIHZhbHVlOiBhcGkucmVzdEFwaUlkXG4gICAgfSk7XG5cbiAgICBuZXcgQ2ZuT3V0cHV0KHNjb3BlLCAnQXBpRG9tYWluTmFtZScsIHtcbiAgICAgIHZhbHVlOiBhcGkuZG9tYWluTmFtZT8uZG9tYWluTmFtZSB8fCAnJ1xuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhZGRDb3JzT3B0aW9ucyhhcGlSZXNvdXJjZTogSVJlc291cmNlKSB7XG4gIGFwaVJlc291cmNlLmFkZE1ldGhvZCgnT1BUSU9OUycsIG5ldyBNb2NrSW50ZWdyYXRpb24oe1xuICAgIGludGVncmF0aW9uUmVzcG9uc2VzOiBbe1xuICAgICAgc3RhdHVzQ29kZTogJzIwMCcsXG4gICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcbiAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6IFwiJ0NvbnRlbnQtVHlwZSxYLUFtei1EYXRlLEF1dGhvcml6YXRpb24sWC1BcGktS2V5LFgtQW16LVNlY3VyaXR5LVRva2VuLFgtQW16LVVzZXItQWdlbnQnXCIsXG4gICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IFwiJ2h0dHBzOi8vYXBpLWV4cGxvcmVyLmgtby5kZXYnJ1wiLFxuICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1DcmVkZW50aWFscyc6IFwiJ2ZhbHNlJ1wiLFxuICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogXCInT1BUSU9OUyxHRVQsUFVULFBPU1QsREVMRVRFJ1wiLFxuICAgICAgfSxcbiAgICB9XSxcbiAgICBwYXNzdGhyb3VnaEJlaGF2aW9yOiBQYXNzdGhyb3VnaEJlaGF2aW9yLldIRU5fTk9fTUFUQ0gsXG4gICAgcmVxdWVzdFRlbXBsYXRlczoge1xuICAgICAgXCJhcHBsaWNhdGlvbi9qc29uXCI6IFwie1xcXCJzdGF0dXNDb2RlXFxcIjogMjAwfVwiXG4gICAgfSxcbiAgfSksIHtcbiAgICBtZXRob2RSZXNwb25zZXM6IFt7XG4gICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcbiAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogdHJ1ZSxcbiAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6IHRydWUsXG4gICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUNyZWRlbnRpYWxzJzogdHJ1ZSxcbiAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfV1cbiAgfSlcbn1cbiJdfQ==