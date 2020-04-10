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
const static_site_1 = require("./static-site");
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
            if (((_e = (_d = props) === null || _d === void 0 ? void 0 : _d.swagger) === null || _e === void 0 ? void 0 : _e.domain) && ((_g = (_f = props) === null || _f === void 0 ? void 0 : _f.swagger) === null || _g === void 0 ? void 0 : _g.subdomain))
                new static_site_1.StaticSite(scope, 'StaticSite', {
                    domainName: props.swagger.domain,
                    siteSubDomain: props.swagger.subdomain,
                });
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
            value: ((_h = api.domainName) === null || _h === void 0 ? void 0 : _h.domainName) || ''
        });
    }
}
exports.AlfCdkRestApi = AlfCdkRestApi;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWxmQ2RrUmVzdEFwaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkFsZkNka1Jlc3RBcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSw0REFBcUg7QUFDckgsd0NBQXFEO0FBQ3JELHNEQUF5RTtBQUN6RSxzRUFBZ0U7QUFDaEUsNEVBQThEO0FBRTlELGlEQUErQztBQUMvQywrQkFBNEI7QUFDNUIsMERBQStDO0FBRS9DLCtDQUEyQztBQUUzQyxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksSUFBSSxNQUFNLENBQUM7QUFRdkQsQ0FBQztBQUVGLE1BQWEsYUFBYTtJQUV4QixZQUFZLEtBQWdCLEVBQUUsT0FBc0IsRUFBRSxLQUE4Qjs7UUFFbEYsSUFBSSxHQUFHLEdBQUcsSUFBSSx3QkFBTyxDQUFDLEtBQUssRUFBRSxlQUFlLEVBQUU7WUFDNUMsV0FBVyxFQUFFLHNCQUFzQjtZQUNuQyxXQUFXLEVBQUUsaUVBQWlFO1lBQzlFLGdCQUFnQjtZQUNoQixtQ0FBbUM7WUFDbkMsbUdBQW1HO1lBQ25HLEtBQUs7WUFDTCwyQkFBMkIsRUFBRTtnQkFDM0IsWUFBWSxFQUFFLHFCQUFJLENBQUMsV0FBVztnQkFDOUIsWUFBWSxFQUFFLHFCQUFJLENBQUMsV0FBVyxDQUFDLDJCQUEyQjthQUMzRDtZQUNELG1CQUFtQjtZQUNuQixzREFBc0Q7WUFDdEQsMkJBQTJCO1lBQzNCLElBQUk7WUFDSixhQUFhLEVBQUUsQ0FBQyw2QkFBWSxDQUFDLFFBQVEsQ0FBQztTQUN2QyxDQUFDLENBQUM7UUFFSCxVQUFHLEtBQUssMENBQUUsTUFBTSxFQUFDO1lBQ2YsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQztZQUM1Qix3RUFBd0U7WUFDeEUsbUNBQW1DO1lBQ25DLG1HQUFtRztZQUNuRyxxRUFBcUU7WUFDckUsdURBQXVEO1lBQ3ZELG9CQUFvQjtZQUNwQixNQUFNO1lBQ04sTUFBTSxVQUFVLEdBQUcsR0FBRyxD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QW9CLEdBQUcsSUFBSSxrQ0FBaUIsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDekUsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLGtDQUFpQixDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUV6RSxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBQzlDLFVBQVUsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFFbEQsSUFBSSxnQkFBUyxDQUFDLEtBQUssRUFBRSxpQkFBaUIsRUFBRTtZQUN0QyxLQUFLLEVBQUUsR0FBRyxDQUFDLEdBQUc7U0FDZixDQUFDLENBQUM7UUFFSCxJQUFJLGdCQUFTLENBQUMsS0FBSyxFQUFFLFdBQVcsRUFBRTtZQUNoQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVM7U0FDckIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxnQkFBUyxDQUFDLEtBQUssRUFBRSxlQUFlLEVBQUU7WUFDcEMsS0FBSyxFQUFFLE9BQUEsR0FBRyxDQUFDLFVBQVUsMENBQUUsVUFBVSxLQUFJLEVBQUU7U0FDeEMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBbEdELHNDQWtHQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFJlc3RBcGksIENvcnMsIEVuZHBvaW50VHlwZSwgU2VjdXJpdHlQb2xpY3ksIExhbWJkYUludGVncmF0aW9uLCBDZm5SZXN0QXBpIH0gZnJvbSAnQGF3cy1jZGsvYXdzLWFwaWdhdGV3YXknO1xuaW1wb3J0IHsgQ29uc3RydWN0LCBDZm5PdXRwdXQgfSBmcm9tICdAYXdzLWNkay9jb3JlJztcbmltcG9ydCB7IEFSZWNvcmQsIEhvc3RlZFpvbmUsIFJlY29yZFRhcmdldCB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1yb3V0ZTUzJztcbmltcG9ydCB7IEFwaUdhdGV3YXlEb21haW4gfSBmcm9tICdAYXdzLWNkay9hd3Mtcm91dGU1My10YXJnZXRzJztcbmltcG9ydCB7IENlcnRpZmljYXRlIH0gZnJvbSAnQGF3cy1jZGsvYXdzLWNlcnRpZmljYXRlbWFuYWdlcic7XG5pbXBvcnQgeyBBbGZDZGtMYW1iZGFzIH0gZnJvbSAnLi9BbGZDZGtMYW1iZGFzJztcbmltcG9ydCB7IGluc3RhbmNlVGFibGUgfSBmcm9tICcuL0FsZkNka1RhYmxlcyc7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBBc3NldCB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1zMy1hc3NldHMnO1xuaW1wb3J0IHsgQWxmSW5zdGFuY2VzU3RhY2tQcm9wcyB9IGZyb20gJy4uJztcbmltcG9ydCB7IFN0YXRpY1NpdGUgfSBmcm9tICcuL3N0YXRpYy1zaXRlJztcblxuY29uc3QgV0lUSF9TV0FHR0VSID0gcHJvY2Vzcy5lbnYuV0lUSF9TV0FHR0VSIHx8ICd0cnVlJztcblxuXG5leHBvcnQgaW50ZXJmYWNlIERvbWFpbiB7XG4gIHJlYWRvbmx5IGRvbWFpbk5hbWU6IHN0cmluZyxcbiAgcmVhZG9ubHkgY2VydGlmaWNhdGVBcm46IHN0cmluZyxcbiAgcmVhZG9ubHkgem9uZU5hbWU6IHN0cmluZyxcbiAgcmVhZG9ubHkgaG9zdGVkWm9uZUlkOiBzdHJpbmdcbn07XG5cbmV4cG9ydCBjbGFzcyBBbGZDZGtSZXN0QXBpIHtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBsYW1iZGFzOiBBbGZDZGtMYW1iZGFzLCBwcm9wcz86IEFsZkluc3RhbmNlc1N0YWNrUHJvcHMpe1xuXG4gICAgdmFyIGFwaSA9IG5ldyBSZXN0QXBpKHNjb3BlLCAnQWxmQ2RrUmVzdEFwaScsIHtcbiAgICAgIHJlc3RBcGlOYW1lOiAnQWxmIEluc3RhbmNlIFNlcnZpY2UnLFxuICAgICAgZGVzY3JpcHRpb246ICdBbiBBV1MgQmFja2VkIFNlcnZpY2UgZm9yIHByb3ZpZGluZyBBbGZyZXNjbyB3aXRoIGN1c3RvbSBkb21haW4nLFxuICAgICAgLy8gZG9tYWluTmFtZToge1xuICAgICAgLy8gICBkb21haW5OYW1lOiBkb21haW4uZG9tYWluTmFtZSxcbiAgICAgIC8vICAgY2VydGlmaWNhdGU6IENlcnRpZmljYXRlLmZyb21DZXJ0aWZpY2F0ZUFybih0aGlzLCAnQ2VydGlmaWNhdGUnLCBwcm9wcy5kb21haW4uY2VydGlmaWNhdGVBcm4pLFxuICAgICAgLy8gfSxcbiAgICAgIGRlZmF1bHRDb3JzUHJlZmxpZ2h0T3B0aW9uczoge1xuICAgICAgICBhbGxvd09yaWdpbnM6IENvcnMuQUxMX09SSUdJTlMsXG4gICAgICAgIGFsbG93TWV0aG9kczogQ29ycy5BTExfTUVUSE9EUyAvLyB0aGlzIGlzIGFsc28gdGhlIGRlZmF1bHRcbiAgICAgIH0sXG4gICAgICAvLyBkZXBsb3lPcHRpb25zOiB7XG4gICAgICAvLyAgIGxvZ2dpbmdMZXZlbDogYXBpZ2F0ZXdheS5NZXRob2RMb2dnaW5nTGV2ZWwuSU5GTyxcbiAgICAgIC8vICAgZGF0YVRyYWNlRW5hYmxlZDogdHJ1ZVxuICAgICAgLy8gfVxuICAgICAgZW5kcG9pbnRUeXBlczogW0VuZHBvaW50VHlwZS5SRUdJT05BTF1cbiAgICB9KTtcblxuICAgIGlmKHByb3BzPy5kb21haW4pe1xuICAgICAgY29uc3QgZG9tYWluID0gcHJvcHMuZG9tYWluO1xuICAgICAgLy8gY29uc3QgZG9tYWluTmFtZSA9IG5ldyBhcGlnYXRld2F5LkRvbWFpbk5hbWUodGhpcywgJ2N1c3RvbS1kb21haW4nLCB7XG4gICAgICAvLyAgIGRvbWFpbk5hbWU6IGRvbWFpbi5kb21haW5OYW1lLFxuICAgICAgLy8gICBjZXJ0aWZpY2F0ZTogQ2VydGlmaWNhdGUuZnJvbUNlcnRpZmljYXRlQXJuKHRoaXMsICdDZXJ0aWZpY2F0ZScsIHByb3BzLmRvbWFpbi5jZXJ0aWZpY2F0ZUFybiksXG4gICAgICAvLyAgIC8vIGVuZHBvaW50VHlwZTogYXBpZ3cuRW5kcG9pbnRUeXBlLkVER0UsIC8vIGRlZmF1bHQgaXMgUkVHSU9OQUxcbiAgICAgIC8vICAgc2VjdXJpdHlQb2xpY3k6IGFwaWdhdGV3YXkuU2VjdXJpdHlQb2xpY3kuVExTXzFfMixcbiAgICAgIC8vICAgLy8gbWFwcGluZzogYXBpXG4gICAgICAvLyB9KTtcbiAgICAgIGNvbnN0IGRvbWFpbk5hbWUgPSBhcGkuYWRkRG9tYWluTmFtZSgnYXBpRG9tYWluTmFtZScsIHtcbiAgICAgICAgZG9tYWluTmFtZTogZG9tYWluLmRvbWFpbk5hbWUsXG4gICAgICAgIGNlcnRpZmljYXRlOiBDZXJ0aWZpY2F0ZS5mcm9tQ2VydGlmaWNhdGVBcm4oc2NvcGUsICdDZXJ0aWZpY2F0ZScsIGRvbWFpbi5jZXJ0aWZpY2F0ZUFybiksXG4gICAgICAgIC8vIGVuZHBvaW50VHlwZTogYXBpZ3cuRW5kcG9pbnRUeXBlLkVER0UsIC8vIGRlZmF1bHQgaXMgUkVHSU9OQUxcbiAgICAgICAgc2VjdXJpdHlQb2xpY3k6IFNlY3VyaXR5UG9saWN5LlRMU18xXzIsXG4gICAgICB9KTtcblxuICAgICAgLy8gZG9tYWluTmFtZS5hZGRCYXNlUGF0aE1hcHBpbmcoYXBpKTtcbiAgICAgIC8vIGRvbWFpbk5hbWUuYWRkQmFzZVBhdGhNYXBwaW5nKGFwaSwge2Jhc2VQYXRoOiAnY2QnfSk7XG5cbiAgICAgIG5ldyBBUmVjb3JkKHNjb3BlLCAnQ3VzdG9tRG9tYWluQWxpYXNSZWNvcmQnLCB7XG4gICAgICAgIHpvbmU6IEhvc3RlZFpvbmUuZnJvbUhvc3RlZFpvbmVBdHRyaWJ1dGVzKHNjb3BlLCAnSG9kZXZIb3N0ZWRab25lSWQnLCB7em9uZU5hbWU6IGRvbWFpbi56b25lTmFtZSwgaG9zdGVkWm9uZUlkOiBkb21haW4uaG9zdGVkWm9uZUlkfSksXG4gICAgICAgIHRhcmdldDogUmVjb3JkVGFyZ2V0LmZyb21BbGlhcyhuZXcgQXBpR2F0ZXdheURvbWFpbihkb21haW5OYW1lKSlcbiAgICAgIH0pO1xuICAgICAgLy8gYXBpLmFkZEJhc2VQYXRoTWFwcGluZyhhcGkpO1xuICAgICAgLy8gZG9tYWluLmFkZEJhc2VQYXRoTWFwcGluZyhhcGksIHtiYXNlUGF0aDogJ2NkJ30pO1xuICAgIH1cblxuICAgIGNvbnN0IGNmbkFwaSA9IGFwaS5ub2RlLmRlZmF1bHRDaGlsZCBhcyBDZm5SZXN0QXBpO1xuXG4gICAgaWYoV0lUSF9TV0FHR0VSICE9PSAnZmFsc2UnKXtcbiAgICAgIC8vIFVwbG9hZCBTd2FnZ2VyIHRvIFMzXG4gICAgICBjb25zdCBmaWxlQXNzZXQgPSBuZXcgQXNzZXQoc2NvcGUsICdTd2FnZ2VyQXNzZXQnLCB7XG4gICAgICAgIHBhdGg6IGpvaW4oX19kaXJuYW1lLCBwcm9wcz8uc3dhZ2dlcj8uZmlsZSB8fCAnJylcbiAgICAgIH0pO1xuICAgICAgY2ZuQXBpLmJvZHlTM0xvY2F0aW9uID0geyBidWNrZXQ6IGZpbGVBc3NldC5idWNrZXQuYnVja2V0TmFtZSwga2V5OiBmaWxlQXNzZXQuczNPYmplY3RLZXkgfTtcblxuICAgICAgaWYocHJvcHM/LnN3YWdnZXI/LmRvbWFpbiAmJiBwcm9wcz8uc3dhZ2dlcj8uc3ViZG9tYWluKVxuICAgICAgbmV3IFN0YXRpY1NpdGUoc2NvcGUsICdTdGF0aWNTaXRlJywge1xuICAgICAgICAgIGRvbWFpbk5hbWU6IHByb3BzLnN3YWdnZXIuZG9tYWluLFxuICAgICAgICAgIHNpdGVTdWJEb21haW46IHByb3BzLnN3YWdnZXIuc3ViZG9tYWluLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgaXRlbXMgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgnaXRlbXMnKTtcbiAgICBjb25zdCBnZXRBbGxJbnRlZ3JhdGlvbiA9IG5ldyBMYW1iZGFJbnRlZ3JhdGlvbihsYW1iZGFzLmdldEFsbExhbWJkYSk7XG4gICAgaXRlbXMuYWRkTWV0aG9kKCdHRVQnLCBnZXRBbGxJbnRlZ3JhdGlvbik7XG5cbiAgICBjb25zdCBpbnN0YW5jZXMgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgnaW5zdGFuY2VzJyk7XG4gICAgY29uc3QgZ2V0QWxsSW5zdGFuY2VzSW50ZWdyYXRpb24gPSBuZXcgTGFtYmRhSW50ZWdyYXRpb24obGFtYmRhcy5nZXRBbGxJbnN0YW5jZXNMYW1iZGEpO1xuICAgIGluc3RhbmNlcy5hZGRNZXRob2QoJ0dFVCcsIGdldEFsbEluc3RhbmNlc0ludGVncmF0aW9uKTtcblxuICAgIGNvbnN0IHNpbmdsZUl0ZW0gPSBpdGVtcy5hZGRSZXNvdXJjZShgeyR7aW5zdGFuY2VUYWJsZS5zb3J0S2V5fX1gKTtcbiAgICBjb25zdCBnZXRPbmVJbnRlZ3JhdGlvbiA9IG5ldyBMYW1iZGFJbnRlZ3JhdGlvbihsYW1iZGFzLmdldE9uZUxhbWJkYSk7XG4gICAgc2luZ2xlSXRlbS5hZGRNZXRob2QoJ0dFVCcsIGdldE9uZUludGVncmF0aW9uKTtcblxuICAgIGNvbnN0IGRlbGV0ZU9uZUludGVncmF0aW9uID0gbmV3IExhbWJkYUludGVncmF0aW9uKGxhbWJkYXMuZGVsZXRlT25lKTtcbiAgICBzaW5nbGVJdGVtLmFkZE1ldGhvZCgnREVMRVRFJywgZGVsZXRlT25lSW50ZWdyYXRpb24pO1xuXG4gICAgY29uc3QgY3JlYXRlT25lSW50ZWdyYXRpb24gPSBuZXcgTGFtYmRhSW50ZWdyYXRpb24obGFtYmRhcy5jcmVhdGVPbmVBcGkpO1xuICAgIGNvbnN0IHVwZGF0ZU9uZUludGVncmF0aW9uID0gbmV3IExhbWJkYUludGVncmF0aW9uKGxhbWJkYXMudXBkYXRlT25lQXBpKTtcblxuICAgIGl0ZW1zLmFkZE1ldGhvZCgnUE9TVCcsIGNyZWF0ZU9uZUludGVncmF0aW9uKTtcbiAgICBzaW5nbGVJdGVtLmFkZE1ldGhvZCgnUFVUJywgdXBkYXRlT25lSW50ZWdyYXRpb24pO1xuXG4gICAgbmV3IENmbk91dHB1dChzY29wZSwgJ1Jlc3RBcGlFbmRQb2ludCcsIHtcbiAgICAgIHZhbHVlOiBhcGkudXJsXG4gICAgfSk7XG5cbiAgICBuZXcgQ2ZuT3V0cHV0KHNjb3BlLCAnUmVzdEFwaUlkJywge1xuICAgICAgdmFsdWU6IGFwaS5yZXN0QXBpSWRcbiAgICB9KTtcblxuICAgIG5ldyBDZm5PdXRwdXQoc2NvcGUsICdBcGlEb21haW5OYW1lJywge1xuICAgICAgdmFsdWU6IGFwaS5kb21haW5OYW1lPy5kb21haW5OYW1lIHx8ICcnXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==