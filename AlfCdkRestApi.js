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
            var userPool;
            if (props.cognito.userPoolArn) {
                userPool = aws_cognito_1.UserPool.fromUserPoolArn(scope, 'cognitoUserPool', props.cognito.userPoolArn);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWxmQ2RrUmVzdEFwaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkFsZkNka1Jlc3RBcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSw0REFBc047QUFDdE4sd0NBQXFEO0FBQ3JELHNEQUF5RTtBQUN6RSxzRUFBZ0U7QUFDaEUsNEVBQThEO0FBRTlELHFEQUFtRDtBQUNuRCwrQkFBNEI7QUFDNUIsMERBQStDO0FBRS9DLG1EQUErQztBQUMvQyxzREFBdUU7QUFFdkUsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLElBQUksTUFBTSxDQUFDO0FBT3ZELENBQUM7QUFFRixNQUFhLGFBQWE7SUFFeEIsWUFBWSxLQUFnQixFQUFFLE9BQXNCLEVBQUUsS0FBOEI7O1FBRWxGLElBQUksR0FBRyxHQUFHLElBQUksd0JBQU8sQ0FBQyxLQUFLLEVBQUUsZUFBZSxFQUFFO1lBQzVDLFdBQVcsRUFBRSxzQkFBc0I7WUFDbkMsV0FBVyxFQUFFLGlFQUFpRTtZQUM5RSxnQkFBZ0I7WUFDaEIsbUNBQW1DO1lBQ25DLG1HQUFtRztZQUNuRyxLQUFLO1lBQ0wsaUNBQWlDO1lBQ2pDLHFCQUFxQjtZQUNyQixvQ0FBb0M7WUFDcEMsZ0VBQWdFO1lBQ2hFLDZCQUE2QjtZQUM3QixtR0FBbUc7WUFDbkcsS0FBSztZQUNMLG1CQUFtQjtZQUNuQixzREFBc0Q7WUFDdEQsMkJBQTJCO1lBQzNCLElBQUk7WUFDSixhQUFhLEVBQUUsQ0FBQyw2QkFBWSxDQUFDLFFBQVEsQ0FBQztTQUN2QyxDQUFDLENBQUM7UUFFSCxVQUFHLEtBQUssMENBQUUsTUFBTSxFQUFDO1lBQ2YsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQztZQUM1Qix3RUFBd0U7WUFDeEUsbUNBQW1DO1lBQ25DLG1HQUFtRztZQUNuRyxxRUFBcUU7WUFDckUsdURBQXVEO1lBQ3ZELG9CQUFvQjtZQUNwQixNQUFNO1lBQ04sTUFBTSxVQUFVLEdBQUcsR0FBRyxD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RUFBRTtZQUNwQyxLQUFLLEVBQUUsT0FBQSxHQUFHLENBQUMsVUFBVSwwQ0FBRSxVQUFVLEtBQUksRUFBRTtTQUN4QyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUF4S0Qsc0NBd0tDO0FBRUQsU0FBZ0IsY0FBYyxDQUFDLFdBQXNCO0lBQ25ELFdBQVcsQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLElBQUksZ0NBQWUsQ0FBQztRQUNuRCxvQkFBb0IsRUFBRSxDQUFDO2dCQUNyQixVQUFVLEVBQUUsS0FBSztnQkFDakIsa0JBQWtCLEVBQUU7b0JBQ2xCLHFEQUFxRCxFQUFFLHlGQUF5RjtvQkFDaEosb0RBQW9ELEVBQUUsaUNBQWlDO29CQUN2Rix5REFBeUQsRUFBRSxTQUFTO29CQUNwRSxxREFBcUQsRUFBRSwrQkFBK0I7aUJBQ3ZGO2FBQ0YsQ0FBQztRQUNGLG1CQUFtQixFQUFFLG9DQUFtQixDQUFDLGFBQWE7UUFDdEQsZ0JBQWdCLEVBQUU7WUFDaEIsa0JBQWtCLEVBQUUsdUJBQXVCO1NBQzVDO0tBQ0YsQ0FBQyxFQUFFO1FBQ0YsZUFBZSxFQUFFLENBQUM7Z0JBQ2hCLFVBQVUsRUFBRSxLQUFLO2dCQUNqQixrQkFBa0IsRUFBRTtvQkFDbEIscURBQXFELEVBQUUsSUFBSTtvQkFDM0QscURBQXFELEVBQUUsSUFBSTtvQkFDM0QseURBQXlELEVBQUUsSUFBSTtvQkFDL0Qsb0RBQW9ELEVBQUUsSUFBSTtpQkFDM0Q7YUFDRixDQUFDO0tBQ0gsQ0FBQyxDQUFBO0FBQ0osQ0FBQztBQTFCRCx3Q0EwQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBSZXN0QXBpLCBFbmRwb2ludFR5cGUsIFNlY3VyaXR5UG9saWN5LCBMYW1iZGFJbnRlZ3JhdGlvbiwgQ2ZuUmVzdEFwaSwgQXV0aG9yaXphdGlvblR5cGUsIENmbkF1dGhvcml6ZXIsIElSZXNvdXJjZSwgTW9ja0ludGVncmF0aW9uLCBQYXNzdGhyb3VnaEJlaGF2aW9yLCBDZm5HYXRld2F5UmVzcG9uc2UgfSBmcm9tICdAYXdzLWNkay9hd3MtYXBpZ2F0ZXdheSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QsIENmbk91dHB1dCB9IGZyb20gJ0Bhd3MtY2RrL2NvcmUnO1xuaW1wb3J0IHsgQVJlY29yZCwgSG9zdGVkWm9uZSwgUmVjb3JkVGFyZ2V0IH0gZnJvbSAnQGF3cy1jZGsvYXdzLXJvdXRlNTMnO1xuaW1wb3J0IHsgQXBpR2F0ZXdheURvbWFpbiB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1yb3V0ZTUzLXRhcmdldHMnO1xuaW1wb3J0IHsgQ2VydGlmaWNhdGUgfSBmcm9tICdAYXdzLWNkay9hd3MtY2VydGlmaWNhdGVtYW5hZ2VyJztcbmltcG9ydCB7IEFsZkNka0xhbWJkYXMgfSBmcm9tICcuL2xpYi9BbGZDZGtMYW1iZGFzJztcbmltcG9ydCB7IGluc3RhbmNlVGFibGUgfSBmcm9tICcuL2xpYi9BbGZDZGtUYWJsZXMnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgQXNzZXQgfSBmcm9tICdAYXdzLWNkay9hd3MtczMtYXNzZXRzJztcbmltcG9ydCB7IEFsZkluc3RhbmNlc1N0YWNrUHJvcHMgfSBmcm9tICcuJztcbmltcG9ydCB7IFN0YXRpY1NpdGUgfSBmcm9tICcuL2xpYi9zdGF0aWMtc2l0ZSc7XG5pbXBvcnQgeyBVc2VyUG9vbCwgVmVyaWZpY2F0aW9uRW1haWxTdHlsZSB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1jb2duaXRvJ1xuXG5jb25zdCBXSVRIX1NXQUdHRVIgPSBwcm9jZXNzLmVudi5XSVRIX1NXQUdHRVIgfHwgJ3RydWUnO1xuXG5leHBvcnQgaW50ZXJmYWNlIERvbWFpbiB7XG4gIHJlYWRvbmx5IGRvbWFpbk5hbWU6IHN0cmluZyxcbiAgcmVhZG9ubHkgY2VydGlmaWNhdGVBcm46IHN0cmluZyxcbiAgcmVhZG9ubHkgem9uZU5hbWU6IHN0cmluZyxcbiAgcmVhZG9ubHkgaG9zdGVkWm9uZUlkOiBzdHJpbmdcbn07XG5cbmV4cG9ydCBjbGFzcyBBbGZDZGtSZXN0QXBpIHtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBsYW1iZGFzOiBBbGZDZGtMYW1iZGFzLCBwcm9wcz86IEFsZkluc3RhbmNlc1N0YWNrUHJvcHMpe1xuXG4gICAgdmFyIGFwaSA9IG5ldyBSZXN0QXBpKHNjb3BlLCAnQWxmQ2RrUmVzdEFwaScsIHtcbiAgICAgIHJlc3RBcGlOYW1lOiAnQWxmIEluc3RhbmNlIFNlcnZpY2UnLFxuICAgICAgZGVzY3JpcHRpb246ICdBbiBBV1MgQmFja2VkIFNlcnZpY2UgZm9yIHByb3ZpZGluZyBBbGZyZXNjbyB3aXRoIGN1c3RvbSBkb21haW4nLFxuICAgICAgLy8gZG9tYWluTmFtZToge1xuICAgICAgLy8gICBkb21haW5OYW1lOiBkb21haW4uZG9tYWluTmFtZSxcbiAgICAgIC8vICAgY2VydGlmaWNhdGU6IENlcnRpZmljYXRlLmZyb21DZXJ0aWZpY2F0ZUFybih0aGlzLCAnQ2VydGlmaWNhdGUnLCBwcm9wcy5kb21haW4uY2VydGlmaWNhdGVBcm4pLFxuICAgICAgLy8gfSxcbiAgICAgIC8vIGRlZmF1bHRDb3JzUHJlZmxpZ2h0T3B0aW9uczoge1xuICAgICAgLy8gICBzdGF0dXNDb2RlOiAyMDAsXG4gICAgICAvLyAgIGFsbG93T3JpZ2luczogQ29ycy5BTExfT1JJR0lOUyxcbiAgICAgIC8vICAgYWxsb3dNZXRob2RzOiBDb3JzLkFMTF9NRVRIT0RTLCAvLyB0aGlzIGlzIGFsc28gdGhlIGRlZmF1bHRcbiAgICAgIC8vICAgYWxsb3dDcmVkZW50aWFsczogZmFsc2UsXG4gICAgICAvLyAgIGFsbG93SGVhZGVyczogWydDb250ZW50LVR5cGUnLCdYLUFtei1EYXRlJywnQXV0aG9yaXphdGlvbicsJ1gtQXBpLUtleScsJ1gtQW16LVNlY3VyaXR5LVRva2VuJ11cbiAgICAgIC8vIH0sXG4gICAgICAvLyBkZXBsb3lPcHRpb25zOiB7XG4gICAgICAvLyAgIGxvZ2dpbmdMZXZlbDogYXBpZ2F0ZXdheS5NZXRob2RMb2dnaW5nTGV2ZWwuSU5GTyxcbiAgICAgIC8vICAgZGF0YVRyYWNlRW5hYmxlZDogdHJ1ZVxuICAgICAgLy8gfVxuICAgICAgZW5kcG9pbnRUeXBlczogW0VuZHBvaW50VHlwZS5SRUdJT05BTF1cbiAgICB9KTtcblxuICAgIGlmKHByb3BzPy5kb21haW4pe1xuICAgICAgY29uc3QgZG9tYWluID0gcHJvcHMuZG9tYWluO1xuICAgICAgLy8gY29uc3QgZG9tYWluTmFtZSA9IG5ldyBhcGlnYXRld2F5LkRvbWFpbk5hbWUodGhpcywgJ2N1c3RvbS1kb21haW4nLCB7XG4gICAgICAvLyAgIGRvbWFpbk5hbWU6IGRvbWFpbi5kb21haW5OYW1lLFxuICAgICAgLy8gICBjZXJ0aWZpY2F0ZTogQ2VydGlmaWNhdGUuZnJvbUNlcnRpZmljYXRlQXJuKHRoaXMsICdDZXJ0aWZpY2F0ZScsIHByb3BzLmRvbWFpbi5jZXJ0aWZpY2F0ZUFybiksXG4gICAgICAvLyAgIC8vIGVuZHBvaW50VHlwZTogYXBpZ3cuRW5kcG9pbnRUeXBlLkVER0UsIC8vIGRlZmF1bHQgaXMgUkVHSU9OQUxcbiAgICAgIC8vICAgc2VjdXJpdHlQb2xpY3k6IGFwaWdhdGV3YXkuU2VjdXJpdHlQb2xpY3kuVExTXzFfMixcbiAgICAgIC8vICAgLy8gbWFwcGluZzogYXBpXG4gICAgICAvLyB9KTtcbiAgICAgIGNvbnN0IGRvbWFpbk5hbWUgPSBhcGkuYWRkRG9tYWluTmFtZSgnYXBpRG9tYWluTmFtZScsIHtcbiAgICAgICAgZG9tYWluTmFtZTogZG9tYWluLmRvbWFpbk5hbWUsXG4gICAgICAgIGNlcnRpZmljYXRlOiBDZXJ0aWZpY2F0ZS5mcm9tQ2VydGlmaWNhdGVBcm4oc2NvcGUsICdDZXJ0aWZpY2F0ZScsIGRvbWFpbi5jZXJ0aWZpY2F0ZUFybiksXG4gICAgICAgIC8vIGVuZHBvaW50VHlwZTogYXBpZ3cuRW5kcG9pbnRUeXBlLkVER0UsIC8vIGRlZmF1bHQgaXMgUkVHSU9OQUxcbiAgICAgICAgc2VjdXJpdHlQb2xpY3k6IFNlY3VyaXR5UG9saWN5LlRMU18xXzIsXG4gICAgICB9KTtcblxuICAgICAgLy8gZG9tYWluTmFtZS5hZGRCYXNlUGF0aE1hcHBpbmcoYXBpKTtcbiAgICAgIC8vIGRvbWFpbk5hbWUuYWRkQmFzZVBhdGhNYXBwaW5nKGFwaSwge2Jhc2VQYXRoOiAnY2QnfSk7XG5cbiAgICAgIG5ldyBBUmVjb3JkKHNjb3BlLCAnQ3VzdG9tRG9tYWluQWxpYXNSZWNvcmQnLCB7XG4gICAgICAgIHpvbmU6IEhvc3RlZFpvbmUuZnJvbUhvc3RlZFpvbmVBdHRyaWJ1dGVzKHNjb3BlLCAnSG9kZXZIb3N0ZWRab25lSWQnLCB7em9uZU5hbWU6IGRvbWFpbi56b25lTmFtZSwgaG9zdGVkWm9uZUlkOiBkb21haW4uaG9zdGVkWm9uZUlkfSksXG4gICAgICAgIHRhcmdldDogUmVjb3JkVGFyZ2V0LmZyb21BbGlhcyhuZXcgQXBpR2F0ZXdheURvbWFpbihkb21haW5OYW1lKSlcbiAgICAgIH0pO1xuICAgICAgLy8gYXBpLmFkZEJhc2VQYXRoTWFwcGluZyhhcGkpO1xuICAgICAgLy8gZG9tYWluLmFkZEJhc2VQYXRoTWFwcGluZyhhcGksIHtiYXNlUGF0aDogJ2NkJ30pO1xuICAgIH1cblxuICAgIGNvbnN0IGNmbkFwaSA9IGFwaS5ub2RlLmRlZmF1bHRDaGlsZCBhcyBDZm5SZXN0QXBpO1xuXG4gICAgaWYoV0lUSF9TV0FHR0VSICE9PSAnZmFsc2UnKXtcbiAgICAgIC8vIFVwbG9hZCBTd2FnZ2VyIHRvIFMzXG4gICAgICBjb25zdCBmaWxlQXNzZXQgPSBuZXcgQXNzZXQoc2NvcGUsICdTd2FnZ2VyQXNzZXQnLCB7XG4gICAgICAgIHBhdGg6IGpvaW4oX19kaXJuYW1lLCBwcm9wcz8uc3dhZ2dlcj8uZmlsZSB8fCAnJylcbiAgICAgIH0pO1xuICAgICAgY2ZuQXBpLmJvZHlTM0xvY2F0aW9uID0geyBidWNrZXQ6IGZpbGVBc3NldC5idWNrZXQuYnVja2V0TmFtZSwga2V5OiBmaWxlQXNzZXQuczNPYmplY3RLZXkgfTtcblxuICAgICAgaWYocHJvcHM/LnN3YWdnZXI/LmRvbWFpbil7XG4gICAgICAgIGNvbnN0IGRvbWFpbiA9IHByb3BzLnN3YWdnZXIuZG9tYWluO1xuICAgICAgICBuZXcgU3RhdGljU2l0ZShzY29wZSwge1xuICAgICAgICAgIGRvbWFpbk5hbWU6IGRvbWFpbi5kb21haW5OYW1lLFxuICAgICAgICAgIHNpdGVTdWJEb21haW46IGRvbWFpbi5zdWJkb21haW4sXG4gICAgICAgICAgYWNtQ2VydFJlZjogZG9tYWluLmNlcnRpZmljYXRlQXJuLFxuICAgICAgICAgIHN3YWdnZXJGaWxlOiBwcm9wcy5zd2FnZ2VyLmZpbGVcbiAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBhdXRob3JpemVyO1xuICAgIGlmKHByb3BzPy5jb2duaXRvKXtcblxuICAgICAgdmFyIHVzZXJQb29sO1xuXG4gICAgICBpZihwcm9wcy5jb2duaXRvLnVzZXJQb29sQXJuKXtcbiAgICAgICAgdXNlclBvb2wgPSBVc2VyUG9vbC5mcm9tVXNlclBvb2xBcm4oc2NvcGUsICdjb2duaXRvVXNlclBvb2wnLCBwcm9wcy5jb2duaXRvLnVzZXJQb29sQXJuKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHVzZXJQb29sID0gbmV3IFVzZXJQb29sKHNjb3BlLCAnY29nbml0b1VzZXJQb29sJywge1xuICAgICAgICAgIHNpZ25JbkFsaWFzZXM6IHtcbiAgICAgICAgICAgIHVzZXJuYW1lOiB0cnVlLFxuICAgICAgICAgICAgZW1haWw6IHRydWVcbiAgICAgICAgICB9LFxuICAgICAgICAgIHNlbGZTaWduVXBFbmFibGVkOiB0cnVlLFxuICAgICAgICAgIHVzZXJWZXJpZmljYXRpb246IHtcbiAgICAgICAgICAgIGVtYWlsU3ViamVjdDogJ1ZlcmlmeSB5b3VyIGVtYWlsIGZvciBvdXIgYXdlc29tZSBhcHAhJyxcbiAgICAgICAgICAgIGVtYWlsQm9keTogJ0hlbGxvIHt1c2VybmFtZX0sIFRoYW5rcyBmb3Igc2lnbmluZyB1cCB0byBvdXIgYXdlc29tZSBhcHAhIFlvdXIgdmVyaWZpY2F0aW9uIGNvZGUgaXMgeyMjIyN9JyxcbiAgICAgICAgICAgIGVtYWlsU3R5bGU6IFZlcmlmaWNhdGlvbkVtYWlsU3R5bGUuQ09ERSxcbiAgICAgICAgICAgIHNtc01lc3NhZ2U6ICdIZWxsbyB7dXNlcm5hbWV9LCBUaGFua3MgZm9yIHNpZ25pbmcgdXAgdG8gb3VyIGF3ZXNvbWUgYXBwISBZb3VyIHZlcmlmaWNhdGlvbiBjb2RlIGlzIHsjIyMjfScsXG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgfVxuXG4gICAgICAvLyBBdXRob3JpemVyIGZvciB0aGUgSGVsbG8gV29ybGQgQVBJIHRoYXQgdXNlcyB0aGVcbiAgICAgIC8vIENvZ25pdG8gVXNlciBwb29sIHRvIEF1dGhvcml6ZSB1c2Vycy5cbiAgICAgIGF1dGhvcml6ZXIgPSBuZXcgQ2ZuQXV0aG9yaXplcihzY29wZSwgJ2NmbkF1dGgnLCB7XG4gICAgICAgIHJlc3RBcGlJZDogYXBpLnJlc3RBcGlJZCxcbiAgICAgICAgbmFtZTogJ0hlbGxvV29ybGRBUElBdXRob3JpemVyJyxcbiAgICAgICAgdHlwZTogJ0NPR05JVE9fVVNFUl9QT09MUycsXG4gICAgICAgIGlkZW50aXR5U291cmNlOiAnbWV0aG9kLnJlcXVlc3QuaGVhZGVyLkF1dGhvcml6YXRpb24nLFxuICAgICAgICBwcm92aWRlckFybnM6IFt1c2VyUG9vbC51c2VyUG9vbEFybl0sXG4gICAgICB9KVxuXG4gICAgICBuZXcgQ2ZuR2F0ZXdheVJlc3BvbnNlKHNjb3BlLCAnZ2V0QWxsUmVzcG9uc2UnLCB7XG4gICAgICAgIHJlc3BvbnNlVHlwZTogXCJERUZBVUxUXzRYWFwiLFxuICAgICAgICAvLyBNSVNTSU5HX0FVVEhFTlRJQ0FUSU9OX1RPS0VOXG4gICAgICAgIHJlc3RBcGlJZDogYXBpLnJlc3RBcGlJZCxcbiAgICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgJ2dhdGV3YXlyZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogXCInKidcIixcbiAgICAgICAgICAnZ2F0ZXdheXJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogXCInKidcIixcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG5cbiAgICBjb25zdCBpdGVtcyA9IGFwaS5yb290LmFkZFJlc291cmNlKCdpdGVtcycpO1xuICAgIC8vIGl0ZW1zLmFkZENvcnNQcmVmbGlnaHQoe1xuICAgIC8vICAgYWxsb3dPcmlnaW5zOiBDb3JzLkFMTF9PUklHSU5TLFxuICAgIC8vICAgYWxsb3dNZXRob2RzOiBDb3JzLkFMTF9NRVRIT0RTXG4gICAgLy8gfSk7XG5cbiAgICBjb25zdCBnZXRBbGxJbnRlZ3JhdGlvbiA9IG5ldyBMYW1iZGFJbnRlZ3JhdGlvbihsYW1iZGFzLmdldEFsbExhbWJkYSk7XG4gICAgaXRlbXMuYWRkTWV0aG9kKCdHRVQnLCBnZXRBbGxJbnRlZ3JhdGlvbiwge1xuICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGF1dGhvcml6ZXI/QXV0aG9yaXphdGlvblR5cGUuQ09HTklUTyA6IHVuZGVmaW5lZCxcbiAgICAgIGF1dGhvcml6ZXI6IChhdXRob3JpemVyPyB7YXV0aG9yaXplcklkOiBhdXRob3JpemVyLnJlZn0gOiB1bmRlZmluZWQpXG4gICAgfSk7XG5cblxuXG5cbiAgICAvLyBpdGVtcy5hZGRDb3JzUHJlZmxpZ2h0KHtcbiAgICAvLyAgIGFsbG93T3JpZ2luczogQ29ycy5BTExfT1JJR0lOUyxcbiAgICAvLyAgIGFsbG93TWV0aG9kczogQ29ycy5BTExfTUVUSE9EUywgLy8gdGhpcyBpcyBhbHNvIHRoZSBkZWZhdWx0XG4gICAgLy8gICBhbGxvd0NyZWRlbnRpYWxzOiB0cnVlLFxuICAgIC8vICAgYWxsb3dIZWFkZXJzOiBbJ0NvbnRlbnQtVHlwZScsJ1gtQW16LURhdGUnLCdBdXRob3JpemF0aW9uJywnWC1BcGktS2V5JywnWC1BbXotU2VjdXJpdHktVG9rZW4nXVxuICAgIC8vIH0pO1xuXG4gICAgY29uc3QgaW5zdGFuY2VzID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2luc3RhbmNlcycpO1xuICAgIGNvbnN0IGdldEFsbEluc3RhbmNlc0ludGVncmF0aW9uID0gbmV3IExhbWJkYUludGVncmF0aW9uKGxhbWJkYXMuZ2V0QWxsSW5zdGFuY2VzTGFtYmRhKTtcbiAgICBpbnN0YW5jZXMuYWRkTWV0aG9kKCdHRVQnLCBnZXRBbGxJbnN0YW5jZXNJbnRlZ3JhdGlvbik7XG5cbiAgICBjb25zdCBzaW5nbGVJdGVtID0gaXRlbXMuYWRkUmVzb3VyY2UoYHske2luc3RhbmNlVGFibGUuc29ydEtleX19YCk7XG4gICAgY29uc3QgZ2V0T25lSW50ZWdyYXRpb24gPSBuZXcgTGFtYmRhSW50ZWdyYXRpb24obGFtYmRhcy5nZXRPbmVMYW1iZGEpO1xuICAgIHNpbmdsZUl0ZW0uYWRkTWV0aG9kKCdHRVQnLCBnZXRPbmVJbnRlZ3JhdGlvbik7XG5cbiAgICBjb25zdCBkZWxldGVPbmVJbnRlZ3JhdGlvbiA9IG5ldyBMYW1iZGFJbnRlZ3JhdGlvbihsYW1iZGFzLmRlbGV0ZU9uZSk7XG4gICAgc2luZ2xlSXRlbS5hZGRNZXRob2QoJ0RFTEVURScsIGRlbGV0ZU9uZUludGVncmF0aW9uKTtcblxuICAgIGNvbnN0IGNyZWF0ZU9uZUludGVncmF0aW9uID0gbmV3IExhbWJkYUludGVncmF0aW9uKGxhbWJkYXMuY3JlYXRlT25lQXBpKTtcbiAgICBjb25zdCB1cGRhdGVPbmVJbnRlZ3JhdGlvbiA9IG5ldyBMYW1iZGFJbnRlZ3JhdGlvbihsYW1iZGFzLnVwZGF0ZU9uZUFwaSk7XG5cbiAgICBpdGVtcy5hZGRNZXRob2QoJ1BPU1QnLCBjcmVhdGVPbmVJbnRlZ3JhdGlvbik7XG4gICAgYWRkQ29yc09wdGlvbnMoaXRlbXMpO1xuICAgIHNpbmdsZUl0ZW0uYWRkTWV0aG9kKCdQVVQnLCB1cGRhdGVPbmVJbnRlZ3JhdGlvbik7XG5cbiAgICBuZXcgQ2ZuT3V0cHV0KHNjb3BlLCAnUmVzdEFwaUVuZFBvaW50Jywge1xuICAgICAgdmFsdWU6IGFwaS51cmxcbiAgICB9KTtcblxuICAgIG5ldyBDZm5PdXRwdXQoc2NvcGUsICdSZXN0QXBpSWQnLCB7XG4gICAgICB2YWx1ZTogYXBpLnJlc3RBcGlJZFxuICAgIH0pO1xuXG4gICAgbmV3IENmbk91dHB1dChzY29wZSwgJ0FwaURvbWFpbk5hbWUnLCB7XG4gICAgICB2YWx1ZTogYXBpLmRvbWFpbk5hbWU/LmRvbWFpbk5hbWUgfHwgJydcbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYWRkQ29yc09wdGlvbnMoYXBpUmVzb3VyY2U6IElSZXNvdXJjZSkge1xuICBhcGlSZXNvdXJjZS5hZGRNZXRob2QoJ09QVElPTlMnLCBuZXcgTW9ja0ludGVncmF0aW9uKHtcbiAgICBpbnRlZ3JhdGlvblJlc3BvbnNlczogW3tcbiAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxuICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiBcIidDb250ZW50LVR5cGUsWC1BbXotRGF0ZSxBdXRob3JpemF0aW9uLFgtQXBpLUtleSxYLUFtei1TZWN1cml0eS1Ub2tlbixYLUFtei1Vc2VyLUFnZW50J1wiLFxuICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiBcIidodHRwczovL2FwaS1leHBsb3Jlci5oLW8uZGV2JydcIixcbiAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctQ3JlZGVudGlhbHMnOiBcIidmYWxzZSdcIixcbiAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6IFwiJ09QVElPTlMsR0VULFBVVCxQT1NULERFTEVURSdcIixcbiAgICAgIH0sXG4gICAgfV0sXG4gICAgcGFzc3Rocm91Z2hCZWhhdmlvcjogUGFzc3Rocm91Z2hCZWhhdmlvci5XSEVOX05PX01BVENILFxuICAgIHJlcXVlc3RUZW1wbGF0ZXM6IHtcbiAgICAgIFwiYXBwbGljYXRpb24vanNvblwiOiBcIntcXFwic3RhdHVzQ29kZVxcXCI6IDIwMH1cIlxuICAgIH0sXG4gIH0pLCB7XG4gICAgbWV0aG9kUmVzcG9uc2VzOiBbe1xuICAgICAgc3RhdHVzQ29kZTogJzIwMCcsXG4gICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcbiAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6IHRydWUsXG4gICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiB0cnVlLFxuICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1DcmVkZW50aWFscyc6IHRydWUsXG4gICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IHRydWUsXG4gICAgICB9LFxuICAgIH1dXG4gIH0pXG59XG4iXX0=