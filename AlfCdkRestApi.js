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
                    'method.response.header.Access-Control-Allow-Origin': "'*'",
                    'method.response.header.Access-Control-Allow-Credentials': "'false'",
                    'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
                },
            }],
        passthroughBehavior: aws_apigateway_1.PassthroughBehavior.NEVER,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWxmQ2RrUmVzdEFwaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkFsZkNka1Jlc3RBcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSw0REFBa007QUFDbE0sd0NBQXFEO0FBQ3JELHNEQUF5RTtBQUN6RSxzRUFBZ0U7QUFDaEUsNEVBQThEO0FBRTlELHFEQUFtRDtBQUNuRCwrQkFBNEI7QUFDNUIsMERBQStDO0FBRS9DLG1EQUErQztBQUMvQyxzREFBdUU7QUFFdkUsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLElBQUksTUFBTSxDQUFDO0FBT3ZELENBQUM7QUFFRixNQUFhLGFBQWE7SUFFeEIsWUFBWSxLQUFnQixFQUFFLE9BQXNCLEVBQUUsS0FBOEI7O1FBRWxGLElBQUksR0FBRyxHQUFHLElBQUksd0JBQU8sQ0FBQyxLQUFLLEVBQUUsZUFBZSxFQUFFO1lBQzVDLFdBQVcsRUFBRSxzQkFBc0I7WUFDbkMsV0FBVyxFQUFFLGlFQUFpRTtZQUM5RSxnQkFBZ0I7WUFDaEIsbUNBQW1DO1lBQ25DLG1HQUFtRztZQUNuRyxLQUFLO1lBQ0wsaUNBQWlDO1lBQ2pDLHFCQUFxQjtZQUNyQixvQ0FBb0M7WUFDcEMsZ0VBQWdFO1lBQ2hFLDZCQUE2QjtZQUM3QixtR0FBbUc7WUFDbkcsS0FBSztZQUNMLG1CQUFtQjtZQUNuQixzREFBc0Q7WUFDdEQsMkJBQTJCO1lBQzNCLElBQUk7WUFDSixhQUFhLEVBQUUsQ0FBQyw2QkFBWSxDQUFDLFFBQVEsQ0FBQztTQUN2QyxDQUFDLENBQUM7UUFFSCxVQUFHLEtBQUssMENBQUUsTUFBTSxFQUFDO1lBQ2YsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQztZQUM1Qix3RUFBd0U7WUFDeEUsbUNBQW1DO1lBQ25DLG1HQUFtRztZQUNuRyxxRUFBcUU7WUFDckUsdURBQXVEO1lBQ3ZELG9CQUFvQjtZQUNwQixNQUFNO1lBQ04sTUFBTSxVQUFVLEdBQUcsR0FBRyxD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LENBQUM7UUFDRixtQkFBbUIsRUFBRSxvQ0FBbUIsQ0FBQyxLQUFLO1FBQzlDLGdCQUFnQixFQUFFO1lBQ2hCLGtCQUFrQixFQUFFLHVCQUF1QjtTQUM1QztLQUNGLENBQUMsRUFBRTtRQUNGLGVBQWUsRUFBRSxDQUFDO2dCQUNoQixVQUFVLEVBQUUsS0FBSztnQkFDakIsa0JBQWtCLEVBQUU7b0JBQ2xCLHFEQUFxRCxFQUFFLElBQUk7b0JBQzNELHFEQUFxRCxFQUFFLElBQUk7b0JBQzNELHlEQUF5RCxFQUFFLElBQUk7b0JBQy9ELG9EQUFvRCxFQUFFLElBQUk7aUJBQzNEO2FBQ0YsQ0FBQztLQUNILENBQUMsQ0FBQTtBQUNKLENBQUM7QUExQkQsd0NBMEJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUmVzdEFwaSwgRW5kcG9pbnRUeXBlLCBTZWN1cml0eVBvbGljeSwgTGFtYmRhSW50ZWdyYXRpb24sIENmblJlc3RBcGksIEF1dGhvcml6YXRpb25UeXBlLCBDZm5BdXRob3JpemVyLCBJUmVzb3VyY2UsIE1vY2tJbnRlZ3JhdGlvbiwgUGFzc3Rocm91Z2hCZWhhdmlvciB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1hcGlnYXRld2F5JztcbmltcG9ydCB7IENvbnN0cnVjdCwgQ2ZuT3V0cHV0IH0gZnJvbSAnQGF3cy1jZGsvY29yZSc7XG5pbXBvcnQgeyBBUmVjb3JkLCBIb3N0ZWRab25lLCBSZWNvcmRUYXJnZXQgfSBmcm9tICdAYXdzLWNkay9hd3Mtcm91dGU1Myc7XG5pbXBvcnQgeyBBcGlHYXRld2F5RG9tYWluIH0gZnJvbSAnQGF3cy1jZGsvYXdzLXJvdXRlNTMtdGFyZ2V0cyc7XG5pbXBvcnQgeyBDZXJ0aWZpY2F0ZSB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1jZXJ0aWZpY2F0ZW1hbmFnZXInO1xuaW1wb3J0IHsgQWxmQ2RrTGFtYmRhcyB9IGZyb20gJy4vbGliL0FsZkNka0xhbWJkYXMnO1xuaW1wb3J0IHsgaW5zdGFuY2VUYWJsZSB9IGZyb20gJy4vbGliL0FsZkNka1RhYmxlcyc7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBBc3NldCB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1zMy1hc3NldHMnO1xuaW1wb3J0IHsgQWxmSW5zdGFuY2VzU3RhY2tQcm9wcyB9IGZyb20gJy4nO1xuaW1wb3J0IHsgU3RhdGljU2l0ZSB9IGZyb20gJy4vbGliL3N0YXRpYy1zaXRlJztcbmltcG9ydCB7IFVzZXJQb29sLCBWZXJpZmljYXRpb25FbWFpbFN0eWxlIH0gZnJvbSAnQGF3cy1jZGsvYXdzLWNvZ25pdG8nXG5cbmNvbnN0IFdJVEhfU1dBR0dFUiA9IHByb2Nlc3MuZW52LldJVEhfU1dBR0dFUiB8fCAndHJ1ZSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRG9tYWluIHtcbiAgcmVhZG9ubHkgZG9tYWluTmFtZTogc3RyaW5nLFxuICByZWFkb25seSBjZXJ0aWZpY2F0ZUFybjogc3RyaW5nLFxuICByZWFkb25seSB6b25lTmFtZTogc3RyaW5nLFxuICByZWFkb25seSBob3N0ZWRab25lSWQ6IHN0cmluZ1xufTtcblxuZXhwb3J0IGNsYXNzIEFsZkNka1Jlc3RBcGkge1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGxhbWJkYXM6IEFsZkNka0xhbWJkYXMsIHByb3BzPzogQWxmSW5zdGFuY2VzU3RhY2tQcm9wcyl7XG5cbiAgICB2YXIgYXBpID0gbmV3IFJlc3RBcGkoc2NvcGUsICdBbGZDZGtSZXN0QXBpJywge1xuICAgICAgcmVzdEFwaU5hbWU6ICdBbGYgSW5zdGFuY2UgU2VydmljZScsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FuIEFXUyBCYWNrZWQgU2VydmljZSBmb3IgcHJvdmlkaW5nIEFsZnJlc2NvIHdpdGggY3VzdG9tIGRvbWFpbicsXG4gICAgICAvLyBkb21haW5OYW1lOiB7XG4gICAgICAvLyAgIGRvbWFpbk5hbWU6IGRvbWFpbi5kb21haW5OYW1lLFxuICAgICAgLy8gICBjZXJ0aWZpY2F0ZTogQ2VydGlmaWNhdGUuZnJvbUNlcnRpZmljYXRlQXJuKHRoaXMsICdDZXJ0aWZpY2F0ZScsIHByb3BzLmRvbWFpbi5jZXJ0aWZpY2F0ZUFybiksXG4gICAgICAvLyB9LFxuICAgICAgLy8gZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XG4gICAgICAvLyAgIHN0YXR1c0NvZGU6IDIwMCxcbiAgICAgIC8vICAgYWxsb3dPcmlnaW5zOiBDb3JzLkFMTF9PUklHSU5TLFxuICAgICAgLy8gICBhbGxvd01ldGhvZHM6IENvcnMuQUxMX01FVEhPRFMsIC8vIHRoaXMgaXMgYWxzbyB0aGUgZGVmYXVsdFxuICAgICAgLy8gICBhbGxvd0NyZWRlbnRpYWxzOiBmYWxzZSxcbiAgICAgIC8vICAgYWxsb3dIZWFkZXJzOiBbJ0NvbnRlbnQtVHlwZScsJ1gtQW16LURhdGUnLCdBdXRob3JpemF0aW9uJywnWC1BcGktS2V5JywnWC1BbXotU2VjdXJpdHktVG9rZW4nXVxuICAgICAgLy8gfSxcbiAgICAgIC8vIGRlcGxveU9wdGlvbnM6IHtcbiAgICAgIC8vICAgbG9nZ2luZ0xldmVsOiBhcGlnYXRld2F5Lk1ldGhvZExvZ2dpbmdMZXZlbC5JTkZPLFxuICAgICAgLy8gICBkYXRhVHJhY2VFbmFibGVkOiB0cnVlXG4gICAgICAvLyB9XG4gICAgICBlbmRwb2ludFR5cGVzOiBbRW5kcG9pbnRUeXBlLlJFR0lPTkFMXVxuICAgIH0pO1xuXG4gICAgaWYocHJvcHM/LmRvbWFpbil7XG4gICAgICBjb25zdCBkb21haW4gPSBwcm9wcy5kb21haW47XG4gICAgICAvLyBjb25zdCBkb21haW5OYW1lID0gbmV3IGFwaWdhdGV3YXkuRG9tYWluTmFtZSh0aGlzLCAnY3VzdG9tLWRvbWFpbicsIHtcbiAgICAgIC8vICAgZG9tYWluTmFtZTogZG9tYWluLmRvbWFpbk5hbWUsXG4gICAgICAvLyAgIGNlcnRpZmljYXRlOiBDZXJ0aWZpY2F0ZS5mcm9tQ2VydGlmaWNhdGVBcm4odGhpcywgJ0NlcnRpZmljYXRlJywgcHJvcHMuZG9tYWluLmNlcnRpZmljYXRlQXJuKSxcbiAgICAgIC8vICAgLy8gZW5kcG9pbnRUeXBlOiBhcGlndy5FbmRwb2ludFR5cGUuRURHRSwgLy8gZGVmYXVsdCBpcyBSRUdJT05BTFxuICAgICAgLy8gICBzZWN1cml0eVBvbGljeTogYXBpZ2F0ZXdheS5TZWN1cml0eVBvbGljeS5UTFNfMV8yLFxuICAgICAgLy8gICAvLyBtYXBwaW5nOiBhcGlcbiAgICAgIC8vIH0pO1xuICAgICAgY29uc3QgZG9tYWluTmFtZSA9IGFwaS5hZGREb21haW5OYW1lKCdhcGlEb21haW5OYW1lJywge1xuICAgICAgICBkb21haW5OYW1lOiBkb21haW4uZG9tYWluTmFtZSxcbiAgICAgICAgY2VydGlmaWNhdGU6IENlcnRpZmljYXRlLmZyb21DZXJ0aWZpY2F0ZUFybihzY29wZSwgJ0NlcnRpZmljYXRlJywgZG9tYWluLmNlcnRpZmljYXRlQXJuKSxcbiAgICAgICAgLy8gZW5kcG9pbnRUeXBlOiBhcGlndy5FbmRwb2ludFR5cGUuRURHRSwgLy8gZGVmYXVsdCBpcyBSRUdJT05BTFxuICAgICAgICBzZWN1cml0eVBvbGljeTogU2VjdXJpdHlQb2xpY3kuVExTXzFfMixcbiAgICAgIH0pO1xuXG4gICAgICAvLyBkb21haW5OYW1lLmFkZEJhc2VQYXRoTWFwcGluZyhhcGkpO1xuICAgICAgLy8gZG9tYWluTmFtZS5hZGRCYXNlUGF0aE1hcHBpbmcoYXBpLCB7YmFzZVBhdGg6ICdjZCd9KTtcblxuICAgICAgbmV3IEFSZWNvcmQoc2NvcGUsICdDdXN0b21Eb21haW5BbGlhc1JlY29yZCcsIHtcbiAgICAgICAgem9uZTogSG9zdGVkWm9uZS5mcm9tSG9zdGVkWm9uZUF0dHJpYnV0ZXMoc2NvcGUsICdIb2Rldkhvc3RlZFpvbmVJZCcsIHt6b25lTmFtZTogZG9tYWluLnpvbmVOYW1lLCBob3N0ZWRab25lSWQ6IGRvbWFpbi5ob3N0ZWRab25lSWR9KSxcbiAgICAgICAgdGFyZ2V0OiBSZWNvcmRUYXJnZXQuZnJvbUFsaWFzKG5ldyBBcGlHYXRld2F5RG9tYWluKGRvbWFpbk5hbWUpKVxuICAgICAgfSk7XG4gICAgICAvLyBhcGkuYWRkQmFzZVBhdGhNYXBwaW5nKGFwaSk7XG4gICAgICAvLyBkb21haW4uYWRkQmFzZVBhdGhNYXBwaW5nKGFwaSwge2Jhc2VQYXRoOiAnY2QnfSk7XG4gICAgfVxuXG4gICAgY29uc3QgY2ZuQXBpID0gYXBpLm5vZGUuZGVmYXVsdENoaWxkIGFzIENmblJlc3RBcGk7XG5cbiAgICBpZihXSVRIX1NXQUdHRVIgIT09ICdmYWxzZScpe1xuICAgICAgLy8gVXBsb2FkIFN3YWdnZXIgdG8gUzNcbiAgICAgIGNvbnN0IGZpbGVBc3NldCA9IG5ldyBBc3NldChzY29wZSwgJ1N3YWdnZXJBc3NldCcsIHtcbiAgICAgICAgcGF0aDogam9pbihfX2Rpcm5hbWUsIHByb3BzPy5zd2FnZ2VyPy5maWxlIHx8ICcnKVxuICAgICAgfSk7XG4gICAgICBjZm5BcGkuYm9keVMzTG9jYXRpb24gPSB7IGJ1Y2tldDogZmlsZUFzc2V0LmJ1Y2tldC5idWNrZXROYW1lLCBrZXk6IGZpbGVBc3NldC5zM09iamVjdEtleSB9O1xuXG4gICAgICBpZihwcm9wcz8uc3dhZ2dlcj8uZG9tYWluKXtcbiAgICAgICAgY29uc3QgZG9tYWluID0gcHJvcHMuc3dhZ2dlci5kb21haW47XG4gICAgICAgIG5ldyBTdGF0aWNTaXRlKHNjb3BlLCB7XG4gICAgICAgICAgZG9tYWluTmFtZTogZG9tYWluLmRvbWFpbk5hbWUsXG4gICAgICAgICAgc2l0ZVN1YkRvbWFpbjogZG9tYWluLnN1YmRvbWFpbixcbiAgICAgICAgICBhY21DZXJ0UmVmOiBkb21haW4uY2VydGlmaWNhdGVBcm4sXG4gICAgICAgICAgc3dhZ2dlckZpbGU6IHByb3BzLnN3YWdnZXIuZmlsZVxuICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGF1dGhvcml6ZXI7XG4gICAgaWYocHJvcHM/LmNvZ25pdG8pe1xuICAgICAgICAvLyBDb2duaXRvIFVzZXIgUG9vbCB3aXRoIEVtYWlsIFNpZ24taW4gVHlwZS5cbiAgICAgIGNvbnN0IHVzZXJQb29sID0gbmV3IFVzZXJQb29sKHNjb3BlLCAndXNlclBvb2wnLCB7XG4gICAgICAgIHNpZ25JbkFsaWFzZXM6IHtcbiAgICAgICAgICB1c2VybmFtZTogdHJ1ZSxcbiAgICAgICAgICBlbWFpbDogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICBzZWxmU2lnblVwRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgdXNlclZlcmlmaWNhdGlvbjoge1xuICAgICAgICAgIGVtYWlsU3ViamVjdDogJ1ZlcmlmeSB5b3VyIGVtYWlsIGZvciBvdXIgYXdlc29tZSBhcHAhJyxcbiAgICAgICAgICBlbWFpbEJvZHk6ICdIZWxsbyB7dXNlcm5hbWV9LCBUaGFua3MgZm9yIHNpZ25pbmcgdXAgdG8gb3VyIGF3ZXNvbWUgYXBwISBZb3VyIHZlcmlmaWNhdGlvbiBjb2RlIGlzIHsjIyMjfScsXG4gICAgICAgICAgZW1haWxTdHlsZTogVmVyaWZpY2F0aW9uRW1haWxTdHlsZS5DT0RFLFxuICAgICAgICAgIHNtc01lc3NhZ2U6ICdIZWxsbyB7dXNlcm5hbWV9LCBUaGFua3MgZm9yIHNpZ25pbmcgdXAgdG8gb3VyIGF3ZXNvbWUgYXBwISBZb3VyIHZlcmlmaWNhdGlvbiBjb2RlIGlzIHsjIyMjfScsXG4gICAgfVxuICAgICAgfSlcblxuICAgICAgLy8gQXV0aG9yaXplciBmb3IgdGhlIEhlbGxvIFdvcmxkIEFQSSB0aGF0IHVzZXMgdGhlXG4gICAgICAvLyBDb2duaXRvIFVzZXIgcG9vbCB0byBBdXRob3JpemUgdXNlcnMuXG4gICAgICBhdXRob3JpemVyID0gbmV3IENmbkF1dGhvcml6ZXIoc2NvcGUsICdjZm5BdXRoJywge1xuICAgICAgICByZXN0QXBpSWQ6IGFwaS5yZXN0QXBpSWQsXG4gICAgICAgIG5hbWU6ICdIZWxsb1dvcmxkQVBJQXV0aG9yaXplcicsXG4gICAgICAgIHR5cGU6ICdDT0dOSVRPX1VTRVJfUE9PTFMnLFxuICAgICAgICBpZGVudGl0eVNvdXJjZTogJ21ldGhvZC5yZXF1ZXN0LmhlYWRlci5BdXRob3JpemF0aW9uJyxcbiAgICAgICAgcHJvdmlkZXJBcm5zOiBbdXNlclBvb2wudXNlclBvb2xBcm5dLFxuICAgICAgfSlcbiAgICB9XG5cbiAgICBjb25zdCBpdGVtcyA9IGFwaS5yb290LmFkZFJlc291cmNlKCdpdGVtcycpO1xuICAgIC8vIGl0ZW1zLmFkZENvcnNQcmVmbGlnaHQoe1xuICAgIC8vICAgYWxsb3dPcmlnaW5zOiBDb3JzLkFMTF9PUklHSU5TLFxuICAgIC8vICAgYWxsb3dNZXRob2RzOiBDb3JzLkFMTF9NRVRIT0RTXG4gICAgLy8gfSk7XG5cbiAgICBjb25zdCBnZXRBbGxJbnRlZ3JhdGlvbiA9IG5ldyBMYW1iZGFJbnRlZ3JhdGlvbihsYW1iZGFzLmdldEFsbExhbWJkYSk7XG4gICAgaXRlbXMuYWRkTWV0aG9kKCdHRVQnLCBnZXRBbGxJbnRlZ3JhdGlvbiwge1xuICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGF1dGhvcml6ZXI/QXV0aG9yaXphdGlvblR5cGUuQ09HTklUTyA6IHVuZGVmaW5lZCxcbiAgICAgIGF1dGhvcml6ZXI6IChhdXRob3JpemVyPyB7YXV0aG9yaXplcklkOiBhdXRob3JpemVyLnJlZn0gOiB1bmRlZmluZWQpXG4gICAgfSk7XG5cbiAgICAvLyBpdGVtcy5hZGRDb3JzUHJlZmxpZ2h0KHtcbiAgICAvLyAgIGFsbG93T3JpZ2luczogQ29ycy5BTExfT1JJR0lOUyxcbiAgICAvLyAgIGFsbG93TWV0aG9kczogQ29ycy5BTExfTUVUSE9EUywgLy8gdGhpcyBpcyBhbHNvIHRoZSBkZWZhdWx0XG4gICAgLy8gICBhbGxvd0NyZWRlbnRpYWxzOiB0cnVlLFxuICAgIC8vICAgYWxsb3dIZWFkZXJzOiBbJ0NvbnRlbnQtVHlwZScsJ1gtQW16LURhdGUnLCdBdXRob3JpemF0aW9uJywnWC1BcGktS2V5JywnWC1BbXotU2VjdXJpdHktVG9rZW4nXVxuICAgIC8vIH0pO1xuXG4gICAgY29uc3QgaW5zdGFuY2VzID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2luc3RhbmNlcycpO1xuICAgIGNvbnN0IGdldEFsbEluc3RhbmNlc0ludGVncmF0aW9uID0gbmV3IExhbWJkYUludGVncmF0aW9uKGxhbWJkYXMuZ2V0QWxsSW5zdGFuY2VzTGFtYmRhKTtcbiAgICBpbnN0YW5jZXMuYWRkTWV0aG9kKCdHRVQnLCBnZXRBbGxJbnN0YW5jZXNJbnRlZ3JhdGlvbik7XG5cbiAgICBjb25zdCBzaW5nbGVJdGVtID0gaXRlbXMuYWRkUmVzb3VyY2UoYHske2luc3RhbmNlVGFibGUuc29ydEtleX19YCk7XG4gICAgY29uc3QgZ2V0T25lSW50ZWdyYXRpb24gPSBuZXcgTGFtYmRhSW50ZWdyYXRpb24obGFtYmRhcy5nZXRPbmVMYW1iZGEpO1xuICAgIHNpbmdsZUl0ZW0uYWRkTWV0aG9kKCdHRVQnLCBnZXRPbmVJbnRlZ3JhdGlvbik7XG5cbiAgICBjb25zdCBkZWxldGVPbmVJbnRlZ3JhdGlvbiA9IG5ldyBMYW1iZGFJbnRlZ3JhdGlvbihsYW1iZGFzLmRlbGV0ZU9uZSk7XG4gICAgc2luZ2xlSXRlbS5hZGRNZXRob2QoJ0RFTEVURScsIGRlbGV0ZU9uZUludGVncmF0aW9uKTtcblxuICAgIGNvbnN0IGNyZWF0ZU9uZUludGVncmF0aW9uID0gbmV3IExhbWJkYUludGVncmF0aW9uKGxhbWJkYXMuY3JlYXRlT25lQXBpKTtcbiAgICBjb25zdCB1cGRhdGVPbmVJbnRlZ3JhdGlvbiA9IG5ldyBMYW1iZGFJbnRlZ3JhdGlvbihsYW1iZGFzLnVwZGF0ZU9uZUFwaSk7XG5cbiAgICBpdGVtcy5hZGRNZXRob2QoJ1BPU1QnLCBjcmVhdGVPbmVJbnRlZ3JhdGlvbik7XG4gICAgYWRkQ29yc09wdGlvbnMoaXRlbXMpO1xuICAgIHNpbmdsZUl0ZW0uYWRkTWV0aG9kKCdQVVQnLCB1cGRhdGVPbmVJbnRlZ3JhdGlvbik7XG5cbiAgICBuZXcgQ2ZuT3V0cHV0KHNjb3BlLCAnUmVzdEFwaUVuZFBvaW50Jywge1xuICAgICAgdmFsdWU6IGFwaS51cmxcbiAgICB9KTtcblxuICAgIG5ldyBDZm5PdXRwdXQoc2NvcGUsICdSZXN0QXBpSWQnLCB7XG4gICAgICB2YWx1ZTogYXBpLnJlc3RBcGlJZFxuICAgIH0pO1xuXG4gICAgbmV3IENmbk91dHB1dChzY29wZSwgJ0FwaURvbWFpbk5hbWUnLCB7XG4gICAgICB2YWx1ZTogYXBpLmRvbWFpbk5hbWU/LmRvbWFpbk5hbWUgfHwgJydcbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYWRkQ29yc09wdGlvbnMoYXBpUmVzb3VyY2U6IElSZXNvdXJjZSkge1xuICBhcGlSZXNvdXJjZS5hZGRNZXRob2QoJ09QVElPTlMnLCBuZXcgTW9ja0ludGVncmF0aW9uKHtcbiAgICBpbnRlZ3JhdGlvblJlc3BvbnNlczogW3tcbiAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxuICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiBcIidDb250ZW50LVR5cGUsWC1BbXotRGF0ZSxBdXRob3JpemF0aW9uLFgtQXBpLUtleSxYLUFtei1TZWN1cml0eS1Ub2tlbixYLUFtei1Vc2VyLUFnZW50J1wiLFxuICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiBcIicqJ1wiLFxuICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1DcmVkZW50aWFscyc6IFwiJ2ZhbHNlJ1wiLFxuICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogXCInT1BUSU9OUyxHRVQsUFVULFBPU1QsREVMRVRFJ1wiLFxuICAgICAgfSxcbiAgICB9XSxcbiAgICBwYXNzdGhyb3VnaEJlaGF2aW9yOiBQYXNzdGhyb3VnaEJlaGF2aW9yLk5FVkVSLFxuICAgIHJlcXVlc3RUZW1wbGF0ZXM6IHtcbiAgICAgIFwiYXBwbGljYXRpb24vanNvblwiOiBcIntcXFwic3RhdHVzQ29kZVxcXCI6IDIwMH1cIlxuICAgIH0sXG4gIH0pLCB7XG4gICAgbWV0aG9kUmVzcG9uc2VzOiBbe1xuICAgICAgc3RhdHVzQ29kZTogJzIwMCcsXG4gICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcbiAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6IHRydWUsXG4gICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiB0cnVlLFxuICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1DcmVkZW50aWFscyc6IHRydWUsXG4gICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IHRydWUsXG4gICAgICB9LFxuICAgIH1dXG4gIH0pXG59XG4iXX0=