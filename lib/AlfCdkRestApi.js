"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const aws_apigateway_1 = require("@aws-cdk/aws-apigateway");
const core_1 = require("@aws-cdk/core");
const aws_route53_1 = require("@aws-cdk/aws-route53");
const aws_route53_targets_1 = require("@aws-cdk/aws-route53-targets");
const aws_certificatemanager_1 = require("@aws-cdk/aws-certificatemanager");
const AlfCdkTables_1 = require("./AlfCdkTables");
const path_1 = require("path");
const aws_s3_assets_1 = require("@aws-cdk/aws-s3-assets");
const WITH_SWAGGER = process.env.WITH_SWAGGER || 'true';
;
class AlfCdkRestApi {
    constructor(scope, lambdas, props) {
        var _a, _b, _c;
        var api = new aws_apigateway_1.RestApi(scope, 'AlfCdkRestApi', {
            restApiName: 'Alf Instance Service',
            description: 'An AWS Backed Service for providing Alfresco with custom domain',
            // domainName: {
            //   domainName: domain.domainName,
            //   certificate: Certificate.fromCertificateArn(this, 'Certificate', props.domain.certificateArn),
            // },
            defaultCorsPreflightOptions: {
                allowOrigins: aws_apigateway_1.Cors.ALL_ORIGINS,
                allowMethods: aws_apigateway_1.Cors.ALL_METHODS // this is also the default
            },
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
            domainName.addBasePathMapping(api);
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
                path: path_1.join(__dirname, ((_b = props) === null || _b === void 0 ? void 0 : _b.swaggerFile) || '')
            });
            cfnApi.bodyS3Location = { bucket: fileAsset.bucket.bucketName, key: fileAsset.s3ObjectKey };
        }
        const items = api.root.addResource('items');
        const getAllIntegration = new aws_apigateway_1.LambdaIntegration(lambdas.getAllLambda);
        items.addMethod('GET', getAllIntegration);
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
        singleItem.addMethod('PUT', updateOneIntegration);
        new core_1.CfnOutput(scope, 'RestApiEndPoint', {
            value: api.url
        });
        new core_1.CfnOutput(scope, 'RestApiId', {
            value: api.restApiId
        });
        new core_1.CfnOutput(scope, 'ApiDomainName', {
            value: ((_c = api.domainName) === null || _c === void 0 ? void 0 : _c.domainName) || ''
        });
    }
}
exports.AlfCdkRestApi = AlfCdkRestApi;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWxmQ2RrUmVzdEFwaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkFsZkNka1Jlc3RBcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSw0REFBb0g7QUFDcEgsd0NBQXFEO0FBQ3JELHNEQUF5RTtBQUN6RSxzRUFBZ0U7QUFDaEUsNEVBQTZEO0FBRTdELGlEQUErQztBQUMvQywrQkFBNEI7QUFDNUIsMERBQStDO0FBRy9DLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxJQUFJLE1BQU0sQ0FBQTtBQVF0RCxDQUFDO0FBRUYsTUFBYSxhQUFhO0lBRXhCLFlBQVksS0FBZ0IsRUFBRSxPQUFzQixFQUFFLEtBQThCOztRQUVsRixJQUFJLEdBQUcsR0FBRyxJQUFJLHdCQUFPLENBQUMsS0FBSyxFQUFFLGVBQWUsRUFBRTtZQUM1QyxXQUFXLEVBQUUsc0JBQXNCO1lBQ25DLFdBQVcsRUFBRSxpRUFBaUU7WUFDOUUsZ0JBQWdCO1lBQ2hCLG1DQUFtQztZQUNuQyxtR0FBbUc7WUFDbkcsS0FBSztZQUNMLDJCQUEyQixFQUFFO2dCQUMzQixZQUFZLEVBQUUscUJBQUksQ0FBQyxXQUFXO2dCQUM5QixZQUFZLEVBQUUscUJBQUksQ0FBQyxXQUFXLENBQUMsMkJBQTJCO2FBQzNEO1lBQ0QsbUJBQW1CO1lBQ25CLHNEQUFzRDtZQUN0RCwyQkFBMkI7WUFDM0IsSUFBSTtZQUNKLGFBQWEsRUFBRSxDQUFDLDZCQUFZLENBQUMsUUFBUSxDQUFDO1NBQ3ZDLENBQUMsQ0FBQztRQUVILFVBQUcsS0FBSywwQ0FBRSxNQUFNLEVBQUM7WUFDZixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDO1lBQzVCLHdFQUF3RTtZQUN4RSxtQ0FBbUM7WUFDbkMsbUdBQW1HO1lBQ25HLHFFQUFxRTtZQUNyRSx1REFBdUQ7WUFDdkQsb0JBQW9CO1lBQ3BCLE1BQU07WUFDTixNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsYUFBYSxDQUFD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QUFDO1FBRWxELElBQUksZ0JBQVMsQ0FBQyxLQUFLLEVBQUUsaUJBQWlCLEVBQUU7WUFDdEMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxHQUFHO1NBQ2YsQ0FBQyxDQUFDO1FBRUgsSUFBSSxnQkFBUyxDQUFDLEtBQUssRUFBRSxXQUFXLEVBQUU7WUFDaEMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTO1NBQ3JCLENBQUMsQ0FBQztRQUVILElBQUksZ0JBQVMsQ0FBQyxLQUFLLEVBQUUsZUFBZSxFQUFFO1lBQ3BDLEtBQUssRUFBRSxPQUFBLEdBQUcsQ0FBQyxVQUFVLDBDQUFFLFVBQVUsS0FBSSxFQUFFO1NBQ3hDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQTVGRCxzQ0E0RkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBSZXN0QXBpLCBDb3JzLCBFbmRwb2ludFR5cGUsIFNlY3VyaXR5UG9saWN5LCBMYW1iZGFJbnRlZ3JhdGlvbiwgQ2ZuUmVzdEFwaSB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1hcGlnYXRld2F5J1xuaW1wb3J0IHsgQ29uc3RydWN0LCBDZm5PdXRwdXQgfSBmcm9tICdAYXdzLWNkay9jb3JlJztcbmltcG9ydCB7IEFSZWNvcmQsIEhvc3RlZFpvbmUsIFJlY29yZFRhcmdldCB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1yb3V0ZTUzJztcbmltcG9ydCB7IEFwaUdhdGV3YXlEb21haW4gfSBmcm9tICdAYXdzLWNkay9hd3Mtcm91dGU1My10YXJnZXRzJztcbmltcG9ydCB7IENlcnRpZmljYXRlIH0gZnJvbSAnQGF3cy1jZGsvYXdzLWNlcnRpZmljYXRlbWFuYWdlcidcbmltcG9ydCB7IEFsZkNka0xhbWJkYXMgfSBmcm9tICcuL0FsZkNka0xhbWJkYXMnO1xuaW1wb3J0IHsgaW5zdGFuY2VUYWJsZSB9IGZyb20gJy4vQWxmQ2RrVGFibGVzJztcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IEFzc2V0IH0gZnJvbSAnQGF3cy1jZGsvYXdzLXMzLWFzc2V0cyc7XG5pbXBvcnQgeyBBbGZJbnN0YW5jZXNTdGFja1Byb3BzIH0gZnJvbSAnLi4nO1xuXG5jb25zdCBXSVRIX1NXQUdHRVIgPSBwcm9jZXNzLmVudi5XSVRIX1NXQUdHRVIgfHwgJ3RydWUnXG5cblxuZXhwb3J0IGludGVyZmFjZSBEb21haW4ge1xuICByZWFkb25seSBkb21haW5OYW1lOiBzdHJpbmcsXG4gIHJlYWRvbmx5IGNlcnRpZmljYXRlQXJuOiBzdHJpbmcsXG4gIHJlYWRvbmx5IHpvbmVOYW1lOiBzdHJpbmcsXG4gIHJlYWRvbmx5IGhvc3RlZFpvbmVJZDogc3RyaW5nXG59O1xuXG5leHBvcnQgY2xhc3MgQWxmQ2RrUmVzdEFwaSB7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgbGFtYmRhczogQWxmQ2RrTGFtYmRhcywgcHJvcHM/OiBBbGZJbnN0YW5jZXNTdGFja1Byb3BzKXtcblxuICAgIHZhciBhcGkgPSBuZXcgUmVzdEFwaShzY29wZSwgJ0FsZkNka1Jlc3RBcGknLCB7XG4gICAgICByZXN0QXBpTmFtZTogJ0FsZiBJbnN0YW5jZSBTZXJ2aWNlJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQW4gQVdTIEJhY2tlZCBTZXJ2aWNlIGZvciBwcm92aWRpbmcgQWxmcmVzY28gd2l0aCBjdXN0b20gZG9tYWluJyxcbiAgICAgIC8vIGRvbWFpbk5hbWU6IHtcbiAgICAgIC8vICAgZG9tYWluTmFtZTogZG9tYWluLmRvbWFpbk5hbWUsXG4gICAgICAvLyAgIGNlcnRpZmljYXRlOiBDZXJ0aWZpY2F0ZS5mcm9tQ2VydGlmaWNhdGVBcm4odGhpcywgJ0NlcnRpZmljYXRlJywgcHJvcHMuZG9tYWluLmNlcnRpZmljYXRlQXJuKSxcbiAgICAgIC8vIH0sXG4gICAgICBkZWZhdWx0Q29yc1ByZWZsaWdodE9wdGlvbnM6IHtcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBDb3JzLkFMTF9PUklHSU5TLFxuICAgICAgICBhbGxvd01ldGhvZHM6IENvcnMuQUxMX01FVEhPRFMgLy8gdGhpcyBpcyBhbHNvIHRoZSBkZWZhdWx0XG4gICAgICB9LFxuICAgICAgLy8gZGVwbG95T3B0aW9uczoge1xuICAgICAgLy8gICBsb2dnaW5nTGV2ZWw6IGFwaWdhdGV3YXkuTWV0aG9kTG9nZ2luZ0xldmVsLklORk8sXG4gICAgICAvLyAgIGRhdGFUcmFjZUVuYWJsZWQ6IHRydWVcbiAgICAgIC8vIH1cbiAgICAgIGVuZHBvaW50VHlwZXM6IFtFbmRwb2ludFR5cGUuUkVHSU9OQUxdXG4gICAgfSk7XG5cbiAgICBpZihwcm9wcz8uZG9tYWluKXtcbiAgICAgIGNvbnN0IGRvbWFpbiA9IHByb3BzLmRvbWFpbjtcbiAgICAgIC8vIGNvbnN0IGRvbWFpbk5hbWUgPSBuZXcgYXBpZ2F0ZXdheS5Eb21haW5OYW1lKHRoaXMsICdjdXN0b20tZG9tYWluJywge1xuICAgICAgLy8gICBkb21haW5OYW1lOiBkb21haW4uZG9tYWluTmFtZSxcbiAgICAgIC8vICAgY2VydGlmaWNhdGU6IENlcnRpZmljYXRlLmZyb21DZXJ0aWZpY2F0ZUFybih0aGlzLCAnQ2VydGlmaWNhdGUnLCBwcm9wcy5kb21haW4uY2VydGlmaWNhdGVBcm4pLFxuICAgICAgLy8gICAvLyBlbmRwb2ludFR5cGU6IGFwaWd3LkVuZHBvaW50VHlwZS5FREdFLCAvLyBkZWZhdWx0IGlzIFJFR0lPTkFMXG4gICAgICAvLyAgIHNlY3VyaXR5UG9saWN5OiBhcGlnYXRld2F5LlNlY3VyaXR5UG9saWN5LlRMU18xXzIsXG4gICAgICAvLyAgIC8vIG1hcHBpbmc6IGFwaVxuICAgICAgLy8gfSk7XG4gICAgICBjb25zdCBkb21haW5OYW1lID0gYXBpLmFkZERvbWFpbk5hbWUoJ2FwaURvbWFpbk5hbWUnLCB7XG4gICAgICAgIGRvbWFpbk5hbWU6IGRvbWFpbi5kb21haW5OYW1lLFxuICAgICAgICBjZXJ0aWZpY2F0ZTogQ2VydGlmaWNhdGUuZnJvbUNlcnRpZmljYXRlQXJuKHNjb3BlLCAnQ2VydGlmaWNhdGUnLCBkb21haW4uY2VydGlmaWNhdGVBcm4pLFxuICAgICAgICAvLyBlbmRwb2ludFR5cGU6IGFwaWd3LkVuZHBvaW50VHlwZS5FREdFLCAvLyBkZWZhdWx0IGlzIFJFR0lPTkFMXG4gICAgICAgIHNlY3VyaXR5UG9saWN5OiBTZWN1cml0eVBvbGljeS5UTFNfMV8yLFxuICAgICAgfSk7XG5cbiAgICAgIGRvbWFpbk5hbWUuYWRkQmFzZVBhdGhNYXBwaW5nKGFwaSk7XG4gICAgICAvLyBkb21haW5OYW1lLmFkZEJhc2VQYXRoTWFwcGluZyhhcGksIHtiYXNlUGF0aDogJ2NkJ30pO1xuXG4gICAgICBuZXcgQVJlY29yZChzY29wZSwgJ0N1c3RvbURvbWFpbkFsaWFzUmVjb3JkJywge1xuICAgICAgICB6b25lOiBIb3N0ZWRab25lLmZyb21Ib3N0ZWRab25lQXR0cmlidXRlcyhzY29wZSwgJ0hvZGV2SG9zdGVkWm9uZUlkJywge3pvbmVOYW1lOiBkb21haW4uem9uZU5hbWUsIGhvc3RlZFpvbmVJZDogZG9tYWluLmhvc3RlZFpvbmVJZH0pLFxuICAgICAgICB0YXJnZXQ6IFJlY29yZFRhcmdldC5mcm9tQWxpYXMobmV3IEFwaUdhdGV3YXlEb21haW4oZG9tYWluTmFtZSkpXG4gICAgICB9KTtcbiAgICAgIC8vIGFwaS5hZGRCYXNlUGF0aE1hcHBpbmcoYXBpKTtcbiAgICAgIC8vIGRvbWFpbi5hZGRCYXNlUGF0aE1hcHBpbmcoYXBpLCB7YmFzZVBhdGg6ICdjZCd9KTtcbiAgICB9XG5cbiAgICBjb25zdCBjZm5BcGkgPSBhcGkubm9kZS5kZWZhdWx0Q2hpbGQgYXMgQ2ZuUmVzdEFwaTtcblxuICAgIGlmKFdJVEhfU1dBR0dFUiAhPT0gJ2ZhbHNlJyl7XG4gICAgICAvLyBVcGxvYWQgU3dhZ2dlciB0byBTM1xuICAgICAgY29uc3QgZmlsZUFzc2V0ID0gbmV3IEFzc2V0KHNjb3BlLCAnU3dhZ2dlckFzc2V0Jywge1xuICAgICAgICBwYXRoOiBqb2luKF9fZGlybmFtZSwgcHJvcHM/LnN3YWdnZXJGaWxlIHx8ICcnKVxuICAgICAgfSk7XG4gICAgICBjZm5BcGkuYm9keVMzTG9jYXRpb24gPSB7IGJ1Y2tldDogZmlsZUFzc2V0LmJ1Y2tldC5idWNrZXROYW1lLCBrZXk6IGZpbGVBc3NldC5zM09iamVjdEtleSB9O1xuICAgIH1cblxuICAgIGNvbnN0IGl0ZW1zID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2l0ZW1zJyk7XG4gICAgY29uc3QgZ2V0QWxsSW50ZWdyYXRpb24gPSBuZXcgTGFtYmRhSW50ZWdyYXRpb24obGFtYmRhcy5nZXRBbGxMYW1iZGEpO1xuICAgIGl0ZW1zLmFkZE1ldGhvZCgnR0VUJywgZ2V0QWxsSW50ZWdyYXRpb24pO1xuXG4gICAgY29uc3QgaW5zdGFuY2VzID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2luc3RhbmNlcycpO1xuICAgIGNvbnN0IGdldEFsbEluc3RhbmNlc0ludGVncmF0aW9uID0gbmV3IExhbWJkYUludGVncmF0aW9uKGxhbWJkYXMuZ2V0QWxsSW5zdGFuY2VzTGFtYmRhKTtcbiAgICBpbnN0YW5jZXMuYWRkTWV0aG9kKCdHRVQnLCBnZXRBbGxJbnN0YW5jZXNJbnRlZ3JhdGlvbik7XG5cbiAgICBjb25zdCBzaW5nbGVJdGVtID0gaXRlbXMuYWRkUmVzb3VyY2UoYHske2luc3RhbmNlVGFibGUuc29ydEtleX19YCk7XG4gICAgY29uc3QgZ2V0T25lSW50ZWdyYXRpb24gPSBuZXcgTGFtYmRhSW50ZWdyYXRpb24obGFtYmRhcy5nZXRPbmVMYW1iZGEpO1xuICAgIHNpbmdsZUl0ZW0uYWRkTWV0aG9kKCdHRVQnLCBnZXRPbmVJbnRlZ3JhdGlvbik7XG5cbiAgICBjb25zdCBkZWxldGVPbmVJbnRlZ3JhdGlvbiA9IG5ldyBMYW1iZGFJbnRlZ3JhdGlvbihsYW1iZGFzLmRlbGV0ZU9uZSk7XG4gICAgc2luZ2xlSXRlbS5hZGRNZXRob2QoJ0RFTEVURScsIGRlbGV0ZU9uZUludGVncmF0aW9uKTtcblxuICAgIGNvbnN0IGNyZWF0ZU9uZUludGVncmF0aW9uID0gbmV3IExhbWJkYUludGVncmF0aW9uKGxhbWJkYXMuY3JlYXRlT25lQXBpKTtcbiAgICBjb25zdCB1cGRhdGVPbmVJbnRlZ3JhdGlvbiA9IG5ldyBMYW1iZGFJbnRlZ3JhdGlvbihsYW1iZGFzLnVwZGF0ZU9uZUFwaSk7XG5cbiAgICBpdGVtcy5hZGRNZXRob2QoJ1BPU1QnLCBjcmVhdGVPbmVJbnRlZ3JhdGlvbik7XG4gICAgc2luZ2xlSXRlbS5hZGRNZXRob2QoJ1BVVCcsIHVwZGF0ZU9uZUludGVncmF0aW9uKTtcblxuICAgIG5ldyBDZm5PdXRwdXQoc2NvcGUsICdSZXN0QXBpRW5kUG9pbnQnLCB7XG4gICAgICB2YWx1ZTogYXBpLnVybFxuICAgIH0pO1xuXG4gICAgbmV3IENmbk91dHB1dChzY29wZSwgJ1Jlc3RBcGlJZCcsIHtcbiAgICAgIHZhbHVlOiBhcGkucmVzdEFwaUlkXG4gICAgfSk7XG5cbiAgICBuZXcgQ2ZuT3V0cHV0KHNjb3BlLCAnQXBpRG9tYWluTmFtZScsIHtcbiAgICAgIHZhbHVlOiBhcGkuZG9tYWluTmFtZT8uZG9tYWluTmFtZSB8fCAnJ1xuICAgIH0pO1xuICB9XG59XG4iXX0=