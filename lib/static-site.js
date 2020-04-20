"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const aws_cloudfront_1 = require("@aws-cdk/aws-cloudfront");
const route53 = require("@aws-cdk/aws-route53");
const s3deploy = require("@aws-cdk/aws-s3-deployment");
const cdk = require("@aws-cdk/core");
const targets = require("@aws-cdk/aws-route53-targets/lib");
const auto_delete_bucket_1 = require("@mobileposse/auto-delete-bucket");
const aws_s3_1 = require("@aws-cdk/aws-apigateway/node_modules/@aws-cdk/aws-s3");
const yaml = require('js-yaml');
const fs = require('fs');
/**
 * Static site infrastructure, which deploys site content to an S3 bucket.
 *
 * The site redirects from HTTP to HTTPS, using a CloudFront distribution,
 * Route53 alias record, and ACM certificate.
 */
class StaticSite {
    constructor(scope, props) {
        // super(parent, name);
        const siteDomain = props.siteSubDomain + '.' + props.domainName;
        const zone = route53.HostedZone.fromLookup(scope, 'Zone', { domainName: siteDomain });
        new cdk.CfnOutput(scope, 'Site', { value: 'https://' + siteDomain });
        const inputYML = props.swaggerFile;
        const swaggerFile = './lib/site-contents/swagger.json';
        const swaggerJson = JSON.stringify(yaml.load(fs.readFileSync(inputYML, { encoding: 'utf-8' })));
        // const obj = yaml.load(fs.readFileSync(inputYML, {encoding: 'utf-8'}));
        fs.writeFileSync(swaggerFile, swaggerJson);
        /**
     * NOTE: S3 requires bucket names to be globally unique across accounts so
     * you will need to change the bucketName to something that nobody else is
     * using.
     */
        const siteBucket = new auto_delete_bucket_1.AutoDeleteBucket(scope, 'SiteBucket', {
            bucketName: siteDomain,
            websiteIndexDocument: 'swagger.html',
            websiteErrorDocument: 'error.html',
            publicReadAccess: true,
            cors: [{
                    allowedMethods: [aws_s3_1.HttpMethods.GET, aws_s3_1.HttpMethods.HEAD],
                    allowedOrigins: ["*"]
                }],
            // The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
            // the new bucket, and it will remain in your account until manually deleted. By setting the policy to
            // DESTROY, cdk destroy will attempt to delete the bucket, but will error if the bucket is not empty.
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Content bucket
        // const siteBucket = new s3.Bucket(scope, 'SiteBucket', {
        //     bucketName: siteDomain,
        //     websiteIndexDocument: 'index.html',
        //     websiteErrorDocument: 'error.html',
        //     publicReadAccess: true,
        //     // The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
        //     // the new bucket, and it will remain in your account until manually deleted. By setting the policy to
        //     // DESTROY, cdk destroy will attempt to delete the bucket, but will error if the bucket is not empty.
        //     removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
        // });
        new cdk.CfnOutput(scope, 'Bucket', { value: siteBucket.bucketName });
        // // TLS certificate
        // const certificateArn = new acm.DnsValidatedCertificate(scope, 'SiteCertificate', {
        //     domainName: siteDomain,
        //     hostedZone: zone
        // }).certificateArn;
        // new cdk.CfnOutput(scope, 'Certificate', { value: certificateArn });
        // CloudFront distribution that provides HTTPS
        const distribution = new aws_cloudfront_1.CloudFrontWebDistribution(scope, 'SiteDistribution', {
            aliasConfiguration: {
                acmCertRef: props.acmCertRef,
                names: [siteDomain],
                sslMethod: aws_cloudfront_1.SSLMethod.SNI,
                securityPolicy: aws_cloudfront_1.SecurityPolicyProtocol.TLS_V1_1_2016,
            },
            originConfigs: [
                {
                    s3OriginSource: {
                        s3BucketSource: siteBucket
                    },
                    behaviors: [{ isDefaultBehavior: true, allowedMethods: aws_cloudfront_1.CloudFrontAllowedMethods.GET_HEAD_OPTIONS },],
                }
            ]
        });
        new cdk.CfnOutput(scope, 'DistributionId', { value: distribution.distributionId });
        // Route53 alias record for the CloudFront distribution
        new route53.ARecord(scope, 'SiteAliasRecord', {
            recordName: siteDomain,
            target: route53.AddressRecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
            zone
        });
        // Deploy site contents to S3 bucket
        new s3deploy.BucketDeployment(scope, 'DeployWithInvalidation', {
            sources: [s3deploy.Source.asset('./lib/site-contents')],
            destinationBucket: siteBucket,
            distribution,
            distributionPaths: ['/*'],
        });
    }
}
exports.StaticSite = StaticSite;
// var TEMPLATE = `
// <!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8">
//   <title>Swagger UI</title>
//   <link href="https://fonts.googleapis.com/css?family=Open+Sans:400,700|Source+Code+Pro:300,600|Titillium+Web:400,600,700" rel="stylesheet">
//   <link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/3.2.2/swagger-ui.css" >
//   <style>
//     html
//     {
//       box-sizing: border-box;
//       overflow: -moz-scrollbars-vertical;
//       overflow-y: scroll;
//     }
//     *,
//     *:before,
//     *:after
//     {
//       box-sizing: inherit;
//     }
//     body {
//       margin:0;
//       background: #fafafa;
//     }
//   </style>
// </head>
// <body>
// <div id="swagger-ui"></div>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/3.2.2/swagger-ui-bundle.js"> </script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/3.2.2/swagger-ui-standalone-preset.js"> </script>
// <script>
// window.onload = function() {
//   var spec = %s;
//   // Build a system
//   const ui = SwaggerUIBundle({
//     spec: spec,
//     dom_id: '#swagger-ui',
//     deepLinking: true,
//     presets: [
//       SwaggerUIBundle.presets.apis,
//       SwaggerUIStandalonePreset
//     ],
//     plugins: [
//       SwaggerUIBundle.plugins.DownloadUrl
//     ],
//     layout: "StandaloneLayout"
//   })
//   window.ui = ui
// }
// </script>
// </body>
// </html>
// `
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGljLXNpdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdGF0aWMtc2l0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDREQUFnSTtBQUNoSSxnREFBaUQ7QUFDakQsdURBQXdEO0FBQ3hELHFDQUFzQztBQUN0Qyw0REFBNkQ7QUFFN0Qsd0VBQWtFO0FBQ2xFLGlGQUFtRjtBQUduRixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDaEMsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBV3pCOzs7OztHQUtHO0FBQ0gsTUFBYSxVQUFVO0lBQ25CLFlBQVksS0FBZ0IsRUFBRSxLQUFzQjtRQUNoRCx1QkFBdUI7UUFFdkIsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLGFBQWEsR0FBRyxHQUFHLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQztRQUNoRSxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFDdEYsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRSxLQUFLLEVBQUUsVUFBVSxHQUFHLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFFckUsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQztRQUNuQyxNQUFNLFdBQVcsR0FBRyxrQ0FBa0MsQ0FBQztRQUN2RCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsRUFBQyxRQUFRLEVBQUUsT0FBTyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUYseUVBQXlFO1FBQ3pFLEVBQUUsQ0FBQyxhQUFhLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FB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QUNoQyw0Q0FBNEM7QUFDNUMsNEJBQTRCO0FBQzVCLFFBQVE7QUFDUixTQUFTO0FBQ1QsZ0JBQWdCO0FBQ2hCLGNBQWM7QUFDZCxRQUFRO0FBQ1IsNkJBQTZCO0FBQzdCLFFBQVE7QUFDUixhQUFhO0FBQ2Isa0JBQWtCO0FBQ2xCLDZCQUE2QjtBQUM3QixRQUFRO0FBQ1IsYUFBYTtBQUNiLFVBQVU7QUFDVixTQUFTO0FBQ1QsOEJBQThCO0FBQzlCLHdHQUF3RztBQUN4RyxtSEFBbUg7QUFDbkgsV0FBVztBQUNYLCtCQUErQjtBQUMvQixtQkFBbUI7QUFDbkIsc0JBQXNCO0FBQ3RCLGlDQUFpQztBQUNqQyxrQkFBa0I7QUFDbEIsNkJBQTZCO0FBQzdCLHlCQUF5QjtBQUN6QixpQkFBaUI7QUFDakIsc0NBQXNDO0FBQ3RDLGtDQUFrQztBQUNsQyxTQUFTO0FBQ1QsaUJBQWlCO0FBQ2pCLDRDQUE0QztBQUM1QyxTQUFTO0FBQ1QsaUNBQWlDO0FBQ2pDLE9BQU87QUFDUCxtQkFBbUI7QUFDbkIsSUFBSTtBQUNKLFlBQVk7QUFDWixVQUFVO0FBQ1YsVUFBVTtBQUNWLElBQUkiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDbG91ZEZyb250V2ViRGlzdHJpYnV0aW9uLCBDbG91ZEZyb250QWxsb3dlZE1ldGhvZHMsIFNTTE1ldGhvZCwgU2VjdXJpdHlQb2xpY3lQcm90b2NvbH0gZnJvbSAnQGF3cy1jZGsvYXdzLWNsb3VkZnJvbnQnO1xuaW1wb3J0IHJvdXRlNTMgPSByZXF1aXJlKCdAYXdzLWNkay9hd3Mtcm91dGU1MycpO1xuaW1wb3J0IHMzZGVwbG95ID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLXMzLWRlcGxveW1lbnQnKTtcbmltcG9ydCBjZGsgPSByZXF1aXJlKCdAYXdzLWNkay9jb3JlJyk7XG5pbXBvcnQgdGFyZ2V0cyA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1yb3V0ZTUzLXRhcmdldHMvbGliJyk7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdAYXdzLWNkay9jb3JlJztcbmltcG9ydCB7IEF1dG9EZWxldGVCdWNrZXQgfSBmcm9tICdAbW9iaWxlcG9zc2UvYXV0by1kZWxldGUtYnVja2V0J1xuaW1wb3J0IHsgSHR0cE1ldGhvZHMgfSBmcm9tICdAYXdzLWNkay9hd3MtYXBpZ2F0ZXdheS9ub2RlX21vZHVsZXMvQGF3cy1jZGsvYXdzLXMzJztcblxuXG5jb25zdCB5YW1sID0gcmVxdWlyZSgnanMteWFtbCcpO1xuY29uc3QgZnMgPSByZXF1aXJlKCdmcycpO1xuXG4vLyB2YXIgc3dhZ2dlckpzb247XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3RhdGljU2l0ZVByb3BzIHtcbiAgICBkb21haW5OYW1lOiBzdHJpbmc7XG4gICAgc2l0ZVN1YkRvbWFpbjogc3RyaW5nO1xuICAgIGFjbUNlcnRSZWY6IHN0cmluZztcbiAgICBzd2FnZ2VyRmlsZTogc3RyaW5nLFxufVxuXG4vKipcbiAqIFN0YXRpYyBzaXRlIGluZnJhc3RydWN0dXJlLCB3aGljaCBkZXBsb3lzIHNpdGUgY29udGVudCB0byBhbiBTMyBidWNrZXQuXG4gKlxuICogVGhlIHNpdGUgcmVkaXJlY3RzIGZyb20gSFRUUCB0byBIVFRQUywgdXNpbmcgYSBDbG91ZEZyb250IGRpc3RyaWJ1dGlvbixcbiAqIFJvdXRlNTMgYWxpYXMgcmVjb3JkLCBhbmQgQUNNIGNlcnRpZmljYXRlLlxuICovXG5leHBvcnQgY2xhc3MgU3RhdGljU2l0ZSB7XG4gICAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgcHJvcHM6IFN0YXRpY1NpdGVQcm9wcykge1xuICAgICAgICAvLyBzdXBlcihwYXJlbnQsIG5hbWUpO1xuXG4gICAgICAgIGNvbnN0IHNpdGVEb21haW4gPSBwcm9wcy5zaXRlU3ViRG9tYWluICsgJy4nICsgcHJvcHMuZG9tYWluTmFtZTtcbiAgICAgICAgY29uc3Qgem9uZSA9IHJvdXRlNTMuSG9zdGVkWm9uZS5mcm9tTG9va3VwKHNjb3BlLCAnWm9uZScsIHsgZG9tYWluTmFtZTogc2l0ZURvbWFpbiB9KTtcbiAgICAgICAgbmV3IGNkay5DZm5PdXRwdXQoc2NvcGUsICdTaXRlJywgeyB2YWx1ZTogJ2h0dHBzOi8vJyArIHNpdGVEb21haW4gfSk7XG5cbiAgICAgICAgY29uc3QgaW5wdXRZTUwgPSBwcm9wcy5zd2FnZ2VyRmlsZTtcbiAgICAgICAgY29uc3Qgc3dhZ2dlckZpbGUgPSAnLi9saWIvc2l0ZS1jb250ZW50cy9zd2FnZ2VyLmpzb24nO1xuICAgICAgICBjb25zdCBzd2FnZ2VySnNvbiA9IEpTT04uc3RyaW5naWZ5KHlhbWwubG9hZChmcy5yZWFkRmlsZVN5bmMoaW5wdXRZTUwsIHtlbmNvZGluZzogJ3V0Zi04J30pKSk7XG4gICAgICAgIC8vIGNvbnN0IG9iaiA9IHlhbWwubG9hZChmcy5yZWFkRmlsZVN5bmMoaW5wdXRZTUwsIHtlbmNvZGluZzogJ3V0Zi04J30pKTtcbiAgICAgICAgZnMud3JpdGVGaWxlU3luYyhzd2FnZ2VyRmlsZSwgc3dhZ2dlckpzb24pO1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICogTk9URTogUzMgcmVxdWlyZXMgYnVja2V0IG5hbWVzIHRvIGJlIGdsb2JhbGx5IHVuaXF1ZSBhY3Jvc3MgYWNjb3VudHMgc29cbiAgICAgICAgICogeW91IHdpbGwgbmVlZCB0byBjaGFuZ2UgdGhlIGJ1Y2tldE5hbWUgdG8gc29tZXRoaW5nIHRoYXQgbm9ib2R5IGVsc2UgaXNcbiAgICAgICAgICogdXNpbmcuXG4gICAgICAgICAqL1xuICAgICAgICBjb25zdCBzaXRlQnVja2V0ID0gbmV3IEF1dG9EZWxldGVCdWNrZXQoc2NvcGUsICdTaXRlQnVja2V0Jywge1xuICAgICAgICAgIGJ1Y2tldE5hbWU6IHNpdGVEb21haW4sXG4gICAgICAgICAgd2Vic2l0ZUluZGV4RG9jdW1lbnQ6ICdzd2FnZ2VyLmh0bWwnLFxuICAgICAgICAgIHdlYnNpdGVFcnJvckRvY3VtZW50OiAnZXJyb3IuaHRtbCcsXG4gICAgICAgICAgcHVibGljUmVhZEFjY2VzczogdHJ1ZSxcbiAgICAgICAgICBjb3JzOiBbe1xuICAgICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IFtIdHRwTWV0aG9kcy5HRVQsIEh0dHBNZXRob2RzLkhFQURdLFxuICAgICAgICAgICAgYWxsb3dlZE9yaWdpbnM6IFtcIipcIl1cbiAgICAgICAgICB9XSxcblxuICAgICAgICAgIC8vIFRoZSBkZWZhdWx0IHJlbW92YWwgcG9saWN5IGlzIFJFVEFJTiwgd2hpY2ggbWVhbnMgdGhhdCBjZGsgZGVzdHJveSB3aWxsIG5vdCBhdHRlbXB0IHRvIGRlbGV0ZVxuICAgICAgICAgIC8vIHRoZSBuZXcgYnVja2V0LCBhbmQgaXQgd2lsbCByZW1haW4gaW4geW91ciBhY2NvdW50IHVudGlsIG1hbnVhbGx5IGRlbGV0ZWQuIEJ5IHNldHRpbmcgdGhlIHBvbGljeSB0b1xuICAgICAgICAgIC8vIERFU1RST1ksIGNkayBkZXN0cm95IHdpbGwgYXR0ZW1wdCB0byBkZWxldGUgdGhlIGJ1Y2tldCwgYnV0IHdpbGwgZXJyb3IgaWYgdGhlIGJ1Y2tldCBpcyBub3QgZW1wdHkuXG4gICAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gTk9UIHJlY29tbWVuZGVkIGZvciBwcm9kdWN0aW9uIGNvZGVcbiAgICAgICAgfSlcblxuICAgICAgICAvLyBDb250ZW50IGJ1Y2tldFxuICAgICAgICAvLyBjb25zdCBzaXRlQnVja2V0ID0gbmV3IHMzLkJ1Y2tldChzY29wZSwgJ1NpdGVCdWNrZXQnLCB7XG4gICAgICAgIC8vICAgICBidWNrZXROYW1lOiBzaXRlRG9tYWluLFxuICAgICAgICAvLyAgICAgd2Vic2l0ZUluZGV4RG9jdW1lbnQ6ICdpbmRleC5odG1sJyxcbiAgICAgICAgLy8gICAgIHdlYnNpdGVFcnJvckRvY3VtZW50OiAnZXJyb3IuaHRtbCcsXG4gICAgICAgIC8vICAgICBwdWJsaWNSZWFkQWNjZXNzOiB0cnVlLFxuXG4gICAgICAgIC8vICAgICAvLyBUaGUgZGVmYXVsdCByZW1vdmFsIHBvbGljeSBpcyBSRVRBSU4sIHdoaWNoIG1lYW5zIHRoYXQgY2RrIGRlc3Ryb3kgd2lsbCBub3QgYXR0ZW1wdCB0byBkZWxldGVcbiAgICAgICAgLy8gICAgIC8vIHRoZSBuZXcgYnVja2V0LCBhbmQgaXQgd2lsbCByZW1haW4gaW4geW91ciBhY2NvdW50IHVudGlsIG1hbnVhbGx5IGRlbGV0ZWQuIEJ5IHNldHRpbmcgdGhlIHBvbGljeSB0b1xuICAgICAgICAvLyAgICAgLy8gREVTVFJPWSwgY2RrIGRlc3Ryb3kgd2lsbCBhdHRlbXB0IHRvIGRlbGV0ZSB0aGUgYnVja2V0LCBidXQgd2lsbCBlcnJvciBpZiB0aGUgYnVja2V0IGlzIG5vdCBlbXB0eS5cbiAgICAgICAgLy8gICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIE5PVCByZWNvbW1lbmRlZCBmb3IgcHJvZHVjdGlvbiBjb2RlXG4gICAgICAgIC8vIH0pO1xuICAgICAgICBuZXcgY2RrLkNmbk91dHB1dChzY29wZSwgJ0J1Y2tldCcsIHsgdmFsdWU6IHNpdGVCdWNrZXQuYnVja2V0TmFtZSB9KTtcblxuICAgICAgICAvLyAvLyBUTFMgY2VydGlmaWNhdGVcbiAgICAgICAgLy8gY29uc3QgY2VydGlmaWNhdGVBcm4gPSBuZXcgYWNtLkRuc1ZhbGlkYXRlZENlcnRpZmljYXRlKHNjb3BlLCAnU2l0ZUNlcnRpZmljYXRlJywge1xuICAgICAgICAvLyAgICAgZG9tYWluTmFtZTogc2l0ZURvbWFpbixcbiAgICAgICAgLy8gICAgIGhvc3RlZFpvbmU6IHpvbmVcbiAgICAgICAgLy8gfSkuY2VydGlmaWNhdGVBcm47XG4gICAgICAgIC8vIG5ldyBjZGsuQ2ZuT3V0cHV0KHNjb3BlLCAnQ2VydGlmaWNhdGUnLCB7IHZhbHVlOiBjZXJ0aWZpY2F0ZUFybiB9KTtcblxuICAgICAgICAvLyBDbG91ZEZyb250IGRpc3RyaWJ1dGlvbiB0aGF0IHByb3ZpZGVzIEhUVFBTXG4gICAgICAgIGNvbnN0IGRpc3RyaWJ1dGlvbiA9IG5ldyBDbG91ZEZyb250V2ViRGlzdHJpYnV0aW9uKHNjb3BlLCAnU2l0ZURpc3RyaWJ1dGlvbicsIHtcbiAgICAgICAgICAgIGFsaWFzQ29uZmlndXJhdGlvbjoge1xuICAgICAgICAgICAgICAgIGFjbUNlcnRSZWY6IHByb3BzLmFjbUNlcnRSZWYsXG4gICAgICAgICAgICAgICAgbmFtZXM6IFsgc2l0ZURvbWFpbiBdLFxuICAgICAgICAgICAgICAgIHNzbE1ldGhvZDogU1NMTWV0aG9kLlNOSSxcbiAgICAgICAgICAgICAgICBzZWN1cml0eVBvbGljeTogU2VjdXJpdHlQb2xpY3lQcm90b2NvbC5UTFNfVjFfMV8yMDE2LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9yaWdpbkNvbmZpZ3M6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHMzT3JpZ2luU291cmNlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzM0J1Y2tldFNvdXJjZTogc2l0ZUJ1Y2tldFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBiZWhhdmlvcnMgOiBbIHtpc0RlZmF1bHRCZWhhdmlvcjogdHJ1ZSwgYWxsb3dlZE1ldGhvZHM6IENsb3VkRnJvbnRBbGxvd2VkTWV0aG9kcy5HRVRfSEVBRF9PUFRJT05TfSxdLFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfSk7XG4gICAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHNjb3BlLCAnRGlzdHJpYnV0aW9uSWQnLCB7IHZhbHVlOiBkaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uSWQgfSk7XG5cbiAgICAgICAgLy8gUm91dGU1MyBhbGlhcyByZWNvcmQgZm9yIHRoZSBDbG91ZEZyb250IGRpc3RyaWJ1dGlvblxuICAgICAgICBuZXcgcm91dGU1My5BUmVjb3JkKHNjb3BlLCAnU2l0ZUFsaWFzUmVjb3JkJywge1xuICAgICAgICAgICAgcmVjb3JkTmFtZTogc2l0ZURvbWFpbixcbiAgICAgICAgICAgIHRhcmdldDogcm91dGU1My5BZGRyZXNzUmVjb3JkVGFyZ2V0LmZyb21BbGlhcyhuZXcgdGFyZ2V0cy5DbG91ZEZyb250VGFyZ2V0KGRpc3RyaWJ1dGlvbikpLFxuICAgICAgICAgICAgem9uZVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBEZXBsb3kgc2l0ZSBjb250ZW50cyB0byBTMyBidWNrZXRcbiAgICAgICAgbmV3IHMzZGVwbG95LkJ1Y2tldERlcGxveW1lbnQoc2NvcGUsICdEZXBsb3lXaXRoSW52YWxpZGF0aW9uJywge1xuICAgICAgICAgICAgc291cmNlczogWyBzM2RlcGxveS5Tb3VyY2UuYXNzZXQoJy4vbGliL3NpdGUtY29udGVudHMnKSBdLFxuICAgICAgICAgICAgZGVzdGluYXRpb25CdWNrZXQ6IHNpdGVCdWNrZXQsXG4gICAgICAgICAgICBkaXN0cmlidXRpb24sXG4gICAgICAgICAgICBkaXN0cmlidXRpb25QYXRoczogWycvKiddLFxuICAgICAgICAgIH0pO1xuICAgIH1cbn1cblxuLy8gdmFyIFRFTVBMQVRFID0gYFxuLy8gPCFET0NUWVBFIGh0bWw+XG4vLyA8aHRtbCBsYW5nPVwiZW5cIj5cbi8vIDxoZWFkPlxuLy8gICA8bWV0YSBjaGFyc2V0PVwiVVRGLThcIj5cbi8vICAgPHRpdGxlPlN3YWdnZXIgVUk8L3RpdGxlPlxuLy8gICA8bGluayBocmVmPVwiaHR0cHM6Ly9mb250cy5nb29nbGVhcGlzLmNvbS9jc3M/ZmFtaWx5PU9wZW4rU2Fuczo0MDAsNzAwfFNvdXJjZStDb2RlK1BybzozMDAsNjAwfFRpdGlsbGl1bStXZWI6NDAwLDYwMCw3MDBcIiByZWw9XCJzdHlsZXNoZWV0XCI+XG4vLyAgIDxsaW5rIHJlbD1cInN0eWxlc2hlZXRcIiB0eXBlPVwidGV4dC9jc3NcIiBocmVmPVwiaHR0cHM6Ly9jZG5qcy5jbG91ZGZsYXJlLmNvbS9hamF4L2xpYnMvc3dhZ2dlci11aS8zLjIuMi9zd2FnZ2VyLXVpLmNzc1wiID5cbi8vICAgPHN0eWxlPlxuLy8gICAgIGh0bWxcbi8vICAgICB7XG4vLyAgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xuLy8gICAgICAgb3ZlcmZsb3c6IC1tb3otc2Nyb2xsYmFycy12ZXJ0aWNhbDtcbi8vICAgICAgIG92ZXJmbG93LXk6IHNjcm9sbDtcbi8vICAgICB9XG4vLyAgICAgKixcbi8vICAgICAqOmJlZm9yZSxcbi8vICAgICAqOmFmdGVyXG4vLyAgICAge1xuLy8gICAgICAgYm94LXNpemluZzogaW5oZXJpdDtcbi8vICAgICB9XG4vLyAgICAgYm9keSB7XG4vLyAgICAgICBtYXJnaW46MDtcbi8vICAgICAgIGJhY2tncm91bmQ6ICNmYWZhZmE7XG4vLyAgICAgfVxuLy8gICA8L3N0eWxlPlxuLy8gPC9oZWFkPlxuLy8gPGJvZHk+XG4vLyA8ZGl2IGlkPVwic3dhZ2dlci11aVwiPjwvZGl2PlxuLy8gPHNjcmlwdCBzcmM9XCJodHRwczovL2NkbmpzLmNsb3VkZmxhcmUuY29tL2FqYXgvbGlicy9zd2FnZ2VyLXVpLzMuMi4yL3N3YWdnZXItdWktYnVuZGxlLmpzXCI+IDwvc2NyaXB0PlxuLy8gPHNjcmlwdCBzcmM9XCJodHRwczovL2NkbmpzLmNsb3VkZmxhcmUuY29tL2FqYXgvbGlicy9zd2FnZ2VyLXVpLzMuMi4yL3N3YWdnZXItdWktc3RhbmRhbG9uZS1wcmVzZXQuanNcIj4gPC9zY3JpcHQ+XG4vLyA8c2NyaXB0PlxuLy8gd2luZG93Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuLy8gICB2YXIgc3BlYyA9ICVzO1xuLy8gICAvLyBCdWlsZCBhIHN5c3RlbVxuLy8gICBjb25zdCB1aSA9IFN3YWdnZXJVSUJ1bmRsZSh7XG4vLyAgICAgc3BlYzogc3BlYyxcbi8vICAgICBkb21faWQ6ICcjc3dhZ2dlci11aScsXG4vLyAgICAgZGVlcExpbmtpbmc6IHRydWUsXG4vLyAgICAgcHJlc2V0czogW1xuLy8gICAgICAgU3dhZ2dlclVJQnVuZGxlLnByZXNldHMuYXBpcyxcbi8vICAgICAgIFN3YWdnZXJVSVN0YW5kYWxvbmVQcmVzZXRcbi8vICAgICBdLFxuLy8gICAgIHBsdWdpbnM6IFtcbi8vICAgICAgIFN3YWdnZXJVSUJ1bmRsZS5wbHVnaW5zLkRvd25sb2FkVXJsXG4vLyAgICAgXSxcbi8vICAgICBsYXlvdXQ6IFwiU3RhbmRhbG9uZUxheW91dFwiXG4vLyAgIH0pXG4vLyAgIHdpbmRvdy51aSA9IHVpXG4vLyB9XG4vLyA8L3NjcmlwdD5cbi8vIDwvYm9keT5cbi8vIDwvaHRtbD5cbi8vIGBcbiJdfQ==