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
const WITH_SWAGGER = process.env.WITH_SWAGGER || 'true';
;
class AlfCdkRestApi {
    constructor(scope, lambdas, props) {
        var _a, _b, _c, _d, _e, _f;
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
            value: ((_f = api.domainName) === null || _f === void 0 ? void 0 : _f.domainName) || ''
        });
    }
}
exports.AlfCdkRestApi = AlfCdkRestApi;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWxmQ2RrUmVzdEFwaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkFsZkNka1Jlc3RBcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSw0REFBcUg7QUFDckgsd0NBQXFEO0FBQ3JELHNEQUF5RTtBQUN6RSxzRUFBZ0U7QUFDaEUsNEVBQThEO0FBRTlELHFEQUFtRDtBQUNuRCwrQkFBNEI7QUFDNUIsMERBQStDO0FBRS9DLG1EQUErQztBQUkvQyxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksSUFBSSxNQUFNLENBQUM7QUFPdkQsQ0FBQztBQUVGLE1BQWEsYUFBYTtJQUV4QixZQUFZLEtBQWdCLEVBQUUsT0FBc0IsRUFBRSxLQUE4Qjs7UUFFbEYsSUFBSSxHQUFHLEdBQUcsSUFBSSx3QkFBTyxDQUFDLEtBQUssRUFBRSxlQUFlLEVBQUU7WUFDNUMsV0FBVyxFQUFFLHNCQUFzQjtZQUNuQyxXQUFXLEVBQUUsaUVBQWlFO1lBQzlFLGdCQUFnQjtZQUNoQixtQ0FBbUM7WUFDbkMsbUdBQW1HO1lBQ25HLEtBQUs7WUFDTCwyQkFBMkIsRUFBRTtnQkFDM0IsWUFBWSxFQUFFLHFCQUFJLENBQUMsV0FBVztnQkFDOUIsWUFBWSxFQUFFLHFCQUFJLENBQUMsV0FBVyxDQUFDLDJCQUEyQjthQUMzRDtZQUNELG1CQUFtQjtZQUNuQixzREFBc0Q7WUFDdEQsMkJBQTJCO1lBQzNCLElBQUk7WUFDSixhQUFhLEVBQUUsQ0FBQyw2QkFBWSxDQUFDLFFBQVEsQ0FBQztTQUN2QyxDQUFDLENBQUM7UUFFSCxVQUFHLEtBQUssMENBQUUsTUFBTSxFQUFDO1lBQ2YsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQztZQUM1Qix3RUFBd0U7WUFDeEUsbUNBQW1DO1lBQ25DLG1HQUFtRztZQUNuRyxxRUFBcUU7WUFDckUsdURBQXVEO1lBQ3ZELG9CQUFvQjtZQUNwQixNQUFNO1lBQ04sTUFBTSxVQUFVLEdBQUcsR0FBRyxD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dEUsVUFBVSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUVyRCxNQUFNLG9CQUFvQixHQUFHLElBQUksa0NBQWlCLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3pFLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxrQ0FBaUIsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFekUsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUM5QyxVQUFVLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBRWxELElBQUksZ0JBQVMsQ0FBQyxLQUFLLEVBQUUsaUJBQWlCLEVBQUU7WUFDdEMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxHQUFHO1NBQ2YsQ0FBQyxDQUFDO1FBRUgsSUFBSSxnQkFBUyxDQUFDLEtBQUssRUFBRSxXQUFXLEVBQUU7WUFDaEMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTO1NBQ3JCLENBQUMsQ0FBQztRQUVILElBQUksZ0JBQVMsQ0FBQyxLQUFLLEVBQUUsZUFBZSxFQUFFO1lBQ3BDLEtBQUssRUFBRSxPQUFBLEdBQUcsQ0FBQyxVQUFVLDBDQUFFLFVBQVUsS0FBSSxFQUFFO1NBQ3hDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXRHRCxzQ0FzR0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBSZXN0QXBpLCBDb3JzLCBFbmRwb2ludFR5cGUsIFNlY3VyaXR5UG9saWN5LCBMYW1iZGFJbnRlZ3JhdGlvbiwgQ2ZuUmVzdEFwaSB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1hcGlnYXRld2F5JztcbmltcG9ydCB7IENvbnN0cnVjdCwgQ2ZuT3V0cHV0IH0gZnJvbSAnQGF3cy1jZGsvY29yZSc7XG5pbXBvcnQgeyBBUmVjb3JkLCBIb3N0ZWRab25lLCBSZWNvcmRUYXJnZXQgfSBmcm9tICdAYXdzLWNkay9hd3Mtcm91dGU1Myc7XG5pbXBvcnQgeyBBcGlHYXRld2F5RG9tYWluIH0gZnJvbSAnQGF3cy1jZGsvYXdzLXJvdXRlNTMtdGFyZ2V0cyc7XG5pbXBvcnQgeyBDZXJ0aWZpY2F0ZSB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1jZXJ0aWZpY2F0ZW1hbmFnZXInO1xuaW1wb3J0IHsgQWxmQ2RrTGFtYmRhcyB9IGZyb20gJy4vbGliL0FsZkNka0xhbWJkYXMnO1xuaW1wb3J0IHsgaW5zdGFuY2VUYWJsZSB9IGZyb20gJy4vbGliL0FsZkNka1RhYmxlcyc7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBBc3NldCB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1zMy1hc3NldHMnO1xuaW1wb3J0IHsgQWxmSW5zdGFuY2VzU3RhY2tQcm9wcyB9IGZyb20gJy4nO1xuaW1wb3J0IHsgU3RhdGljU2l0ZSB9IGZyb20gJy4vbGliL3N0YXRpYy1zaXRlJztcblxuXG5cbmNvbnN0IFdJVEhfU1dBR0dFUiA9IHByb2Nlc3MuZW52LldJVEhfU1dBR0dFUiB8fCAndHJ1ZSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRG9tYWluIHtcbiAgcmVhZG9ubHkgZG9tYWluTmFtZTogc3RyaW5nLFxuICByZWFkb25seSBjZXJ0aWZpY2F0ZUFybjogc3RyaW5nLFxuICByZWFkb25seSB6b25lTmFtZTogc3RyaW5nLFxuICByZWFkb25seSBob3N0ZWRab25lSWQ6IHN0cmluZ1xufTtcblxuZXhwb3J0IGNsYXNzIEFsZkNka1Jlc3RBcGkge1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGxhbWJkYXM6IEFsZkNka0xhbWJkYXMsIHByb3BzPzogQWxmSW5zdGFuY2VzU3RhY2tQcm9wcyl7XG5cbiAgICB2YXIgYXBpID0gbmV3IFJlc3RBcGkoc2NvcGUsICdBbGZDZGtSZXN0QXBpJywge1xuICAgICAgcmVzdEFwaU5hbWU6ICdBbGYgSW5zdGFuY2UgU2VydmljZScsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FuIEFXUyBCYWNrZWQgU2VydmljZSBmb3IgcHJvdmlkaW5nIEFsZnJlc2NvIHdpdGggY3VzdG9tIGRvbWFpbicsXG4gICAgICAvLyBkb21haW5OYW1lOiB7XG4gICAgICAvLyAgIGRvbWFpbk5hbWU6IGRvbWFpbi5kb21haW5OYW1lLFxuICAgICAgLy8gICBjZXJ0aWZpY2F0ZTogQ2VydGlmaWNhdGUuZnJvbUNlcnRpZmljYXRlQXJuKHRoaXMsICdDZXJ0aWZpY2F0ZScsIHByb3BzLmRvbWFpbi5jZXJ0aWZpY2F0ZUFybiksXG4gICAgICAvLyB9LFxuICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XG4gICAgICAgIGFsbG93T3JpZ2luczogQ29ycy5BTExfT1JJR0lOUyxcbiAgICAgICAgYWxsb3dNZXRob2RzOiBDb3JzLkFMTF9NRVRIT0RTIC8vIHRoaXMgaXMgYWxzbyB0aGUgZGVmYXVsdFxuICAgICAgfSxcbiAgICAgIC8vIGRlcGxveU9wdGlvbnM6IHtcbiAgICAgIC8vICAgbG9nZ2luZ0xldmVsOiBhcGlnYXRld2F5Lk1ldGhvZExvZ2dpbmdMZXZlbC5JTkZPLFxuICAgICAgLy8gICBkYXRhVHJhY2VFbmFibGVkOiB0cnVlXG4gICAgICAvLyB9XG4gICAgICBlbmRwb2ludFR5cGVzOiBbRW5kcG9pbnRUeXBlLlJFR0lPTkFMXVxuICAgIH0pO1xuXG4gICAgaWYocHJvcHM/LmRvbWFpbil7XG4gICAgICBjb25zdCBkb21haW4gPSBwcm9wcy5kb21haW47XG4gICAgICAvLyBjb25zdCBkb21haW5OYW1lID0gbmV3IGFwaWdhdGV3YXkuRG9tYWluTmFtZSh0aGlzLCAnY3VzdG9tLWRvbWFpbicsIHtcbiAgICAgIC8vICAgZG9tYWluTmFtZTogZG9tYWluLmRvbWFpbk5hbWUsXG4gICAgICAvLyAgIGNlcnRpZmljYXRlOiBDZXJ0aWZpY2F0ZS5mcm9tQ2VydGlmaWNhdGVBcm4odGhpcywgJ0NlcnRpZmljYXRlJywgcHJvcHMuZG9tYWluLmNlcnRpZmljYXRlQXJuKSxcbiAgICAgIC8vICAgLy8gZW5kcG9pbnRUeXBlOiBhcGlndy5FbmRwb2ludFR5cGUuRURHRSwgLy8gZGVmYXVsdCBpcyBSRUdJT05BTFxuICAgICAgLy8gICBzZWN1cml0eVBvbGljeTogYXBpZ2F0ZXdheS5TZWN1cml0eVBvbGljeS5UTFNfMV8yLFxuICAgICAgLy8gICAvLyBtYXBwaW5nOiBhcGlcbiAgICAgIC8vIH0pO1xuICAgICAgY29uc3QgZG9tYWluTmFtZSA9IGFwaS5hZGREb21haW5OYW1lKCdhcGlEb21haW5OYW1lJywge1xuICAgICAgICBkb21haW5OYW1lOiBkb21haW4uZG9tYWluTmFtZSxcbiAgICAgICAgY2VydGlmaWNhdGU6IENlcnRpZmljYXRlLmZyb21DZXJ0aWZpY2F0ZUFybihzY29wZSwgJ0NlcnRpZmljYXRlJywgZG9tYWluLmNlcnRpZmljYXRlQXJuKSxcbiAgICAgICAgLy8gZW5kcG9pbnRUeXBlOiBhcGlndy5FbmRwb2ludFR5cGUuRURHRSwgLy8gZGVmYXVsdCBpcyBSRUdJT05BTFxuICAgICAgICBzZWN1cml0eVBvbGljeTogU2VjdXJpdHlQb2xpY3kuVExTXzFfMixcbiAgICAgIH0pO1xuXG4gICAgICAvLyBkb21haW5OYW1lLmFkZEJhc2VQYXRoTWFwcGluZyhhcGkpO1xuICAgICAgLy8gZG9tYWluTmFtZS5hZGRCYXNlUGF0aE1hcHBpbmcoYXBpLCB7YmFzZVBhdGg6ICdjZCd9KTtcblxuICAgICAgbmV3IEFSZWNvcmQoc2NvcGUsICdDdXN0b21Eb21haW5BbGlhc1JlY29yZCcsIHtcbiAgICAgICAgem9uZTogSG9zdGVkWm9uZS5mcm9tSG9zdGVkWm9uZUF0dHJpYnV0ZXMoc2NvcGUsICdIb2Rldkhvc3RlZFpvbmVJZCcsIHt6b25lTmFtZTogZG9tYWluLnpvbmVOYW1lLCBob3N0ZWRab25lSWQ6IGRvbWFpbi5ob3N0ZWRab25lSWR9KSxcbiAgICAgICAgdGFyZ2V0OiBSZWNvcmRUYXJnZXQuZnJvbUFsaWFzKG5ldyBBcGlHYXRld2F5RG9tYWluKGRvbWFpbk5hbWUpKVxuICAgICAgfSk7XG4gICAgICAvLyBhcGkuYWRkQmFzZVBhdGhNYXBwaW5nKGFwaSk7XG4gICAgICAvLyBkb21haW4uYWRkQmFzZVBhdGhNYXBwaW5nKGFwaSwge2Jhc2VQYXRoOiAnY2QnfSk7XG4gICAgfVxuXG4gICAgY29uc3QgY2ZuQXBpID0gYXBpLm5vZGUuZGVmYXVsdENoaWxkIGFzIENmblJlc3RBcGk7XG5cbiAgICBpZihXSVRIX1NXQUdHRVIgIT09ICdmYWxzZScpe1xuICAgICAgLy8gVXBsb2FkIFN3YWdnZXIgdG8gUzNcbiAgICAgIGNvbnN0IGZpbGVBc3NldCA9IG5ldyBBc3NldChzY29wZSwgJ1N3YWdnZXJBc3NldCcsIHtcbiAgICAgICAgcGF0aDogam9pbihfX2Rpcm5hbWUsIHByb3BzPy5zd2FnZ2VyPy5maWxlIHx8ICcnKVxuICAgICAgfSk7XG4gICAgICBjZm5BcGkuYm9keVMzTG9jYXRpb24gPSB7IGJ1Y2tldDogZmlsZUFzc2V0LmJ1Y2tldC5idWNrZXROYW1lLCBrZXk6IGZpbGVBc3NldC5zM09iamVjdEtleSB9O1xuXG4gICAgICBpZihwcm9wcz8uc3dhZ2dlcj8uZG9tYWluKXtcbiAgICAgICAgY29uc3QgZG9tYWluID0gcHJvcHMuc3dhZ2dlci5kb21haW47XG4gICAgICAgIG5ldyBTdGF0aWNTaXRlKHNjb3BlLCB7XG4gICAgICAgICAgZG9tYWluTmFtZTogZG9tYWluLmRvbWFpbk5hbWUsXG4gICAgICAgICAgc2l0ZVN1YkRvbWFpbjogZG9tYWluLnN1YmRvbWFpbixcbiAgICAgICAgICBhY21DZXJ0UmVmOiBkb21haW4uY2VydGlmaWNhdGVBcm4sXG4gICAgICAgICAgc3dhZ2dlckZpbGU6IHByb3BzLnN3YWdnZXIuZmlsZVxuICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgaXRlbXMgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgnaXRlbXMnKTtcbiAgICBjb25zdCBnZXRBbGxJbnRlZ3JhdGlvbiA9IG5ldyBMYW1iZGFJbnRlZ3JhdGlvbihsYW1iZGFzLmdldEFsbExhbWJkYSk7XG4gICAgaXRlbXMuYWRkTWV0aG9kKCdHRVQnLCBnZXRBbGxJbnRlZ3JhdGlvbik7XG5cbiAgICBjb25zdCBpbnN0YW5jZXMgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgnaW5zdGFuY2VzJyk7XG4gICAgY29uc3QgZ2V0QWxsSW5zdGFuY2VzSW50ZWdyYXRpb24gPSBuZXcgTGFtYmRhSW50ZWdyYXRpb24obGFtYmRhcy5nZXRBbGxJbnN0YW5jZXNMYW1iZGEpO1xuICAgIGluc3RhbmNlcy5hZGRNZXRob2QoJ0dFVCcsIGdldEFsbEluc3RhbmNlc0ludGVncmF0aW9uKTtcblxuICAgIGNvbnN0IHNpbmdsZUl0ZW0gPSBpdGVtcy5hZGRSZXNvdXJjZShgeyR7aW5zdGFuY2VUYWJsZS5zb3J0S2V5fX1gKTtcbiAgICBjb25zdCBnZXRPbmVJbnRlZ3JhdGlvbiA9IG5ldyBMYW1iZGFJbnRlZ3JhdGlvbihsYW1iZGFzLmdldE9uZUxhbWJkYSk7XG4gICAgc2luZ2xlSXRlbS5hZGRNZXRob2QoJ0dFVCcsIGdldE9uZUludGVncmF0aW9uKTtcblxuICAgIGNvbnN0IGRlbGV0ZU9uZUludGVncmF0aW9uID0gbmV3IExhbWJkYUludGVncmF0aW9uKGxhbWJkYXMuZGVsZXRlT25lKTtcbiAgICBzaW5nbGVJdGVtLmFkZE1ldGhvZCgnREVMRVRFJywgZGVsZXRlT25lSW50ZWdyYXRpb24pO1xuXG4gICAgY29uc3QgY3JlYXRlT25lSW50ZWdyYXRpb24gPSBuZXcgTGFtYmRhSW50ZWdyYXRpb24obGFtYmRhcy5jcmVhdGVPbmVBcGkpO1xuICAgIGNvbnN0IHVwZGF0ZU9uZUludGVncmF0aW9uID0gbmV3IExhbWJkYUludGVncmF0aW9uKGxhbWJkYXMudXBkYXRlT25lQXBpKTtcblxuICAgIGl0ZW1zLmFkZE1ldGhvZCgnUE9TVCcsIGNyZWF0ZU9uZUludGVncmF0aW9uKTtcbiAgICBzaW5nbGVJdGVtLmFkZE1ldGhvZCgnUFVUJywgdXBkYXRlT25lSW50ZWdyYXRpb24pO1xuXG4gICAgbmV3IENmbk91dHB1dChzY29wZSwgJ1Jlc3RBcGlFbmRQb2ludCcsIHtcbiAgICAgIHZhbHVlOiBhcGkudXJsXG4gICAgfSk7XG5cbiAgICBuZXcgQ2ZuT3V0cHV0KHNjb3BlLCAnUmVzdEFwaUlkJywge1xuICAgICAgdmFsdWU6IGFwaS5yZXN0QXBpSWRcbiAgICB9KTtcblxuICAgIG5ldyBDZm5PdXRwdXQoc2NvcGUsICdBcGlEb21haW5OYW1lJywge1xuICAgICAgdmFsdWU6IGFwaS5kb21haW5OYW1lPy5kb21haW5OYW1lIHx8ICcnXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==