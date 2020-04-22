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
                    behaviors: [{
                            isDefaultBehavior: true,
                        }],
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGljLXNpdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdGF0aWMtc2l0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDREQUFzRztBQUN0RyxnREFBaUQ7QUFDakQsdURBQXdEO0FBQ3hELHFDQUFzQztBQUN0Qyw0REFBNkQ7QUFFN0Qsd0VBQWtFO0FBQ2xFLGlGQUFtRjtBQUduRixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDaEMsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBV3pCOzs7OztHQUtHO0FBQ0gsTUFBYSxVQUFVO0lBQ25CLFlBQVksS0FBZ0IsRUFBRSxLQUFzQjtRQUNoRCx1QkFBdUI7UUFFdkIsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLGFBQWEsR0FBRyxHQUFHLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQztRQUNoRSxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFDdEYsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRSxLQUFLLEVBQUUsVUFBVSxHQUFHLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFFckUsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQztRQUNuQyxNQUFNLFdBQVcsR0FBRyxrQ0FBa0MsQ0FBQztRQUN2RCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsRUFBQyxRQUFRLEVBQUUsT0FBTyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUYseUVBQXlFO1FBQ3pFLEVBQUUsQ0FBQyxhQUFhLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FB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QUFRO0FBQ1IsU0FBUztBQUNULGdCQUFnQjtBQUNoQixjQUFjO0FBQ2QsUUFBUTtBQUNSLDZCQUE2QjtBQUM3QixRQUFRO0FBQ1IsYUFBYTtBQUNiLGtCQUFrQjtBQUNsQiw2QkFBNkI7QUFDN0IsUUFBUTtBQUNSLGFBQWE7QUFDYixVQUFVO0FBQ1YsU0FBUztBQUNULDhCQUE4QjtBQUM5Qix3R0FBd0c7QUFDeEcsbUhBQW1IO0FBQ25ILFdBQVc7QUFDWCwrQkFBK0I7QUFDL0IsbUJBQW1CO0FBQ25CLHNCQUFzQjtBQUN0QixpQ0FBaUM7QUFDakMsa0JBQWtCO0FBQ2xCLDZCQUE2QjtBQUM3Qix5QkFBeUI7QUFDekIsaUJBQWlCO0FBQ2pCLHNDQUFzQztBQUN0QyxrQ0FBa0M7QUFDbEMsU0FBUztBQUNULGlCQUFpQjtBQUNqQiw0Q0FBNEM7QUFDNUMsU0FBUztBQUNULGlDQUFpQztBQUNqQyxPQUFPO0FBQ1AsbUJBQW1CO0FBQ25CLElBQUk7QUFDSixZQUFZO0FBQ1osVUFBVTtBQUNWLFVBQVU7QUFDVixJQUFJIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ2xvdWRGcm9udFdlYkRpc3RyaWJ1dGlvbiwgU1NMTWV0aG9kLCBTZWN1cml0eVBvbGljeVByb3RvY29sfSBmcm9tICdAYXdzLWNkay9hd3MtY2xvdWRmcm9udCc7XG5pbXBvcnQgcm91dGU1MyA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1yb3V0ZTUzJyk7XG5pbXBvcnQgczNkZXBsb3kgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtczMtZGVwbG95bWVudCcpO1xuaW1wb3J0IGNkayA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2NvcmUnKTtcbmltcG9ydCB0YXJnZXRzID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLXJvdXRlNTMtdGFyZ2V0cy9saWInKTtcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ0Bhd3MtY2RrL2NvcmUnO1xuaW1wb3J0IHsgQXV0b0RlbGV0ZUJ1Y2tldCB9IGZyb20gJ0Btb2JpbGVwb3NzZS9hdXRvLWRlbGV0ZS1idWNrZXQnXG5pbXBvcnQgeyBIdHRwTWV0aG9kcyB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1hcGlnYXRld2F5L25vZGVfbW9kdWxlcy9AYXdzLWNkay9hd3MtczMnO1xuXG5cbmNvbnN0IHlhbWwgPSByZXF1aXJlKCdqcy15YW1sJyk7XG5jb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5cbi8vIHZhciBzd2FnZ2VySnNvbjtcblxuZXhwb3J0IGludGVyZmFjZSBTdGF0aWNTaXRlUHJvcHMge1xuICAgIGRvbWFpbk5hbWU6IHN0cmluZztcbiAgICBzaXRlU3ViRG9tYWluOiBzdHJpbmc7XG4gICAgYWNtQ2VydFJlZjogc3RyaW5nO1xuICAgIHN3YWdnZXJGaWxlOiBzdHJpbmcsXG59XG5cbi8qKlxuICogU3RhdGljIHNpdGUgaW5mcmFzdHJ1Y3R1cmUsIHdoaWNoIGRlcGxveXMgc2l0ZSBjb250ZW50IHRvIGFuIFMzIGJ1Y2tldC5cbiAqXG4gKiBUaGUgc2l0ZSByZWRpcmVjdHMgZnJvbSBIVFRQIHRvIEhUVFBTLCB1c2luZyBhIENsb3VkRnJvbnQgZGlzdHJpYnV0aW9uLFxuICogUm91dGU1MyBhbGlhcyByZWNvcmQsIGFuZCBBQ00gY2VydGlmaWNhdGUuXG4gKi9cbmV4cG9ydCBjbGFzcyBTdGF0aWNTaXRlIHtcbiAgICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBwcm9wczogU3RhdGljU2l0ZVByb3BzKSB7XG4gICAgICAgIC8vIHN1cGVyKHBhcmVudCwgbmFtZSk7XG5cbiAgICAgICAgY29uc3Qgc2l0ZURvbWFpbiA9IHByb3BzLnNpdGVTdWJEb21haW4gKyAnLicgKyBwcm9wcy5kb21haW5OYW1lO1xuICAgICAgICBjb25zdCB6b25lID0gcm91dGU1My5Ib3N0ZWRab25lLmZyb21Mb29rdXAoc2NvcGUsICdab25lJywgeyBkb21haW5OYW1lOiBzaXRlRG9tYWluIH0pO1xuICAgICAgICBuZXcgY2RrLkNmbk91dHB1dChzY29wZSwgJ1NpdGUnLCB7IHZhbHVlOiAnaHR0cHM6Ly8nICsgc2l0ZURvbWFpbiB9KTtcblxuICAgICAgICBjb25zdCBpbnB1dFlNTCA9IHByb3BzLnN3YWdnZXJGaWxlO1xuICAgICAgICBjb25zdCBzd2FnZ2VyRmlsZSA9ICcuL2xpYi9zaXRlLWNvbnRlbnRzL3N3YWdnZXIuanNvbic7XG4gICAgICAgIGNvbnN0IHN3YWdnZXJKc29uID0gSlNPTi5zdHJpbmdpZnkoeWFtbC5sb2FkKGZzLnJlYWRGaWxlU3luYyhpbnB1dFlNTCwge2VuY29kaW5nOiAndXRmLTgnfSkpKTtcbiAgICAgICAgLy8gY29uc3Qgb2JqID0geWFtbC5sb2FkKGZzLnJlYWRGaWxlU3luYyhpbnB1dFlNTCwge2VuY29kaW5nOiAndXRmLTgnfSkpO1xuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKHN3YWdnZXJGaWxlLCBzd2FnZ2VySnNvbik7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgKiBOT1RFOiBTMyByZXF1aXJlcyBidWNrZXQgbmFtZXMgdG8gYmUgZ2xvYmFsbHkgdW5pcXVlIGFjcm9zcyBhY2NvdW50cyBzb1xuICAgICAgICAgKiB5b3Ugd2lsbCBuZWVkIHRvIGNoYW5nZSB0aGUgYnVja2V0TmFtZSB0byBzb21ldGhpbmcgdGhhdCBub2JvZHkgZWxzZSBpc1xuICAgICAgICAgKiB1c2luZy5cbiAgICAgICAgICovXG4gICAgICAgIGNvbnN0IHNpdGVCdWNrZXQgPSBuZXcgQXV0b0RlbGV0ZUJ1Y2tldChzY29wZSwgJ1NpdGVCdWNrZXQnLCB7XG4gICAgICAgICAgYnVja2V0TmFtZTogc2l0ZURvbWFpbixcbiAgICAgICAgICB3ZWJzaXRlSW5kZXhEb2N1bWVudDogJ3N3YWdnZXIuaHRtbCcsXG4gICAgICAgICAgd2Vic2l0ZUVycm9yRG9jdW1lbnQ6ICdlcnJvci5odG1sJyxcbiAgICAgICAgICBwdWJsaWNSZWFkQWNjZXNzOiB0cnVlLFxuICAgICAgICAgIGNvcnM6IFt7XG4gICAgICAgICAgICBhbGxvd2VkTWV0aG9kczogW0h0dHBNZXRob2RzLkdFVCwgSHR0cE1ldGhvZHMuSEVBRF0sXG4gICAgICAgICAgICBhbGxvd2VkT3JpZ2luczogW1wiKlwiXVxuICAgICAgICAgIH1dLFxuXG4gICAgICAgICAgLy8gVGhlIGRlZmF1bHQgcmVtb3ZhbCBwb2xpY3kgaXMgUkVUQUlOLCB3aGljaCBtZWFucyB0aGF0IGNkayBkZXN0cm95IHdpbGwgbm90IGF0dGVtcHQgdG8gZGVsZXRlXG4gICAgICAgICAgLy8gdGhlIG5ldyBidWNrZXQsIGFuZCBpdCB3aWxsIHJlbWFpbiBpbiB5b3VyIGFjY291bnQgdW50aWwgbWFudWFsbHkgZGVsZXRlZC4gQnkgc2V0dGluZyB0aGUgcG9saWN5IHRvXG4gICAgICAgICAgLy8gREVTVFJPWSwgY2RrIGRlc3Ryb3kgd2lsbCBhdHRlbXB0IHRvIGRlbGV0ZSB0aGUgYnVja2V0LCBidXQgd2lsbCBlcnJvciBpZiB0aGUgYnVja2V0IGlzIG5vdCBlbXB0eS5cbiAgICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAvLyBOT1QgcmVjb21tZW5kZWQgZm9yIHByb2R1Y3Rpb24gY29kZVxuICAgICAgICB9KVxuXG4gICAgICAgIC8vIENvbnRlbnQgYnVja2V0XG4gICAgICAgIC8vIGNvbnN0IHNpdGVCdWNrZXQgPSBuZXcgczMuQnVja2V0KHNjb3BlLCAnU2l0ZUJ1Y2tldCcsIHtcbiAgICAgICAgLy8gICAgIGJ1Y2tldE5hbWU6IHNpdGVEb21haW4sXG4gICAgICAgIC8vICAgICB3ZWJzaXRlSW5kZXhEb2N1bWVudDogJ2luZGV4Lmh0bWwnLFxuICAgICAgICAvLyAgICAgd2Vic2l0ZUVycm9yRG9jdW1lbnQ6ICdlcnJvci5odG1sJyxcbiAgICAgICAgLy8gICAgIHB1YmxpY1JlYWRBY2Nlc3M6IHRydWUsXG5cbiAgICAgICAgLy8gICAgIC8vIFRoZSBkZWZhdWx0IHJlbW92YWwgcG9saWN5IGlzIFJFVEFJTiwgd2hpY2ggbWVhbnMgdGhhdCBjZGsgZGVzdHJveSB3aWxsIG5vdCBhdHRlbXB0IHRvIGRlbGV0ZVxuICAgICAgICAvLyAgICAgLy8gdGhlIG5ldyBidWNrZXQsIGFuZCBpdCB3aWxsIHJlbWFpbiBpbiB5b3VyIGFjY291bnQgdW50aWwgbWFudWFsbHkgZGVsZXRlZC4gQnkgc2V0dGluZyB0aGUgcG9saWN5IHRvXG4gICAgICAgIC8vICAgICAvLyBERVNUUk9ZLCBjZGsgZGVzdHJveSB3aWxsIGF0dGVtcHQgdG8gZGVsZXRlIHRoZSBidWNrZXQsIGJ1dCB3aWxsIGVycm9yIGlmIHRoZSBidWNrZXQgaXMgbm90IGVtcHR5LlxuICAgICAgICAvLyAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gTk9UIHJlY29tbWVuZGVkIGZvciBwcm9kdWN0aW9uIGNvZGVcbiAgICAgICAgLy8gfSk7XG4gICAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHNjb3BlLCAnQnVja2V0JywgeyB2YWx1ZTogc2l0ZUJ1Y2tldC5idWNrZXROYW1lIH0pO1xuXG4gICAgICAgIC8vIC8vIFRMUyBjZXJ0aWZpY2F0ZVxuICAgICAgICAvLyBjb25zdCBjZXJ0aWZpY2F0ZUFybiA9IG5ldyBhY20uRG5zVmFsaWRhdGVkQ2VydGlmaWNhdGUoc2NvcGUsICdTaXRlQ2VydGlmaWNhdGUnLCB7XG4gICAgICAgIC8vICAgICBkb21haW5OYW1lOiBzaXRlRG9tYWluLFxuICAgICAgICAvLyAgICAgaG9zdGVkWm9uZTogem9uZVxuICAgICAgICAvLyB9KS5jZXJ0aWZpY2F0ZUFybjtcbiAgICAgICAgLy8gbmV3IGNkay5DZm5PdXRwdXQoc2NvcGUsICdDZXJ0aWZpY2F0ZScsIHsgdmFsdWU6IGNlcnRpZmljYXRlQXJuIH0pO1xuXG4gICAgICAgIC8vIENsb3VkRnJvbnQgZGlzdHJpYnV0aW9uIHRoYXQgcHJvdmlkZXMgSFRUUFNcbiAgICAgICAgY29uc3QgZGlzdHJpYnV0aW9uID0gbmV3IENsb3VkRnJvbnRXZWJEaXN0cmlidXRpb24oc2NvcGUsICdTaXRlRGlzdHJpYnV0aW9uJywge1xuICAgICAgICAgICAgYWxpYXNDb25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgYWNtQ2VydFJlZjogcHJvcHMuYWNtQ2VydFJlZixcbiAgICAgICAgICAgICAgICBuYW1lczogWyBzaXRlRG9tYWluIF0sXG4gICAgICAgICAgICAgICAgc3NsTWV0aG9kOiBTU0xNZXRob2QuU05JLFxuICAgICAgICAgICAgICAgIHNlY3VyaXR5UG9saWN5OiBTZWN1cml0eVBvbGljeVByb3RvY29sLlRMU19WMV8xXzIwMTYsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb3JpZ2luQ29uZmlnczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgczNPcmlnaW5Tb3VyY2U6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHMzQnVja2V0U291cmNlOiBzaXRlQnVja2V0XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGJlaGF2aW9ycyA6IFsge1xuICAgICAgICAgICAgICAgICAgICAgIGlzRGVmYXVsdEJlaGF2aW9yOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIC8vIGFsbG93ZWRNZXRob2RzOiBDbG91ZEZyb250QWxsb3dlZE1ldGhvZHMuR0VUX0hFQURfT1BUSU9OU1xuICAgICAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0pO1xuICAgICAgICBuZXcgY2RrLkNmbk91dHB1dChzY29wZSwgJ0Rpc3RyaWJ1dGlvbklkJywgeyB2YWx1ZTogZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbklkIH0pO1xuXG4gICAgICAgIC8vIFJvdXRlNTMgYWxpYXMgcmVjb3JkIGZvciB0aGUgQ2xvdWRGcm9udCBkaXN0cmlidXRpb25cbiAgICAgICAgbmV3IHJvdXRlNTMuQVJlY29yZChzY29wZSwgJ1NpdGVBbGlhc1JlY29yZCcsIHtcbiAgICAgICAgICAgIHJlY29yZE5hbWU6IHNpdGVEb21haW4sXG4gICAgICAgICAgICB0YXJnZXQ6IHJvdXRlNTMuQWRkcmVzc1JlY29yZFRhcmdldC5mcm9tQWxpYXMobmV3IHRhcmdldHMuQ2xvdWRGcm9udFRhcmdldChkaXN0cmlidXRpb24pKSxcbiAgICAgICAgICAgIHpvbmVcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRGVwbG95IHNpdGUgY29udGVudHMgdG8gUzMgYnVja2V0XG4gICAgICAgIG5ldyBzM2RlcGxveS5CdWNrZXREZXBsb3ltZW50KHNjb3BlLCAnRGVwbG95V2l0aEludmFsaWRhdGlvbicsIHtcbiAgICAgICAgICAgIHNvdXJjZXM6IFsgczNkZXBsb3kuU291cmNlLmFzc2V0KCcuL2xpYi9zaXRlLWNvbnRlbnRzJykgXSxcbiAgICAgICAgICAgIGRlc3RpbmF0aW9uQnVja2V0OiBzaXRlQnVja2V0LFxuICAgICAgICAgICAgZGlzdHJpYnV0aW9uLFxuICAgICAgICAgICAgZGlzdHJpYnV0aW9uUGF0aHM6IFsnLyonXSxcbiAgICAgICAgICB9KTtcbiAgICB9XG59XG5cbi8vIHZhciBURU1QTEFURSA9IGBcbi8vIDwhRE9DVFlQRSBodG1sPlxuLy8gPGh0bWwgbGFuZz1cImVuXCI+XG4vLyA8aGVhZD5cbi8vICAgPG1ldGEgY2hhcnNldD1cIlVURi04XCI+XG4vLyAgIDx0aXRsZT5Td2FnZ2VyIFVJPC90aXRsZT5cbi8vICAgPGxpbmsgaHJlZj1cImh0dHBzOi8vZm9udHMuZ29vZ2xlYXBpcy5jb20vY3NzP2ZhbWlseT1PcGVuK1NhbnM6NDAwLDcwMHxTb3VyY2UrQ29kZStQcm86MzAwLDYwMHxUaXRpbGxpdW0rV2ViOjQwMCw2MDAsNzAwXCIgcmVsPVwic3R5bGVzaGVldFwiPlxuLy8gICA8bGluayByZWw9XCJzdHlsZXNoZWV0XCIgdHlwZT1cInRleHQvY3NzXCIgaHJlZj1cImh0dHBzOi8vY2RuanMuY2xvdWRmbGFyZS5jb20vYWpheC9saWJzL3N3YWdnZXItdWkvMy4yLjIvc3dhZ2dlci11aS5jc3NcIiA+XG4vLyAgIDxzdHlsZT5cbi8vICAgICBodG1sXG4vLyAgICAge1xuLy8gICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDtcbi8vICAgICAgIG92ZXJmbG93OiAtbW96LXNjcm9sbGJhcnMtdmVydGljYWw7XG4vLyAgICAgICBvdmVyZmxvdy15OiBzY3JvbGw7XG4vLyAgICAgfVxuLy8gICAgICosXG4vLyAgICAgKjpiZWZvcmUsXG4vLyAgICAgKjphZnRlclxuLy8gICAgIHtcbi8vICAgICAgIGJveC1zaXppbmc6IGluaGVyaXQ7XG4vLyAgICAgfVxuLy8gICAgIGJvZHkge1xuLy8gICAgICAgbWFyZ2luOjA7XG4vLyAgICAgICBiYWNrZ3JvdW5kOiAjZmFmYWZhO1xuLy8gICAgIH1cbi8vICAgPC9zdHlsZT5cbi8vIDwvaGVhZD5cbi8vIDxib2R5PlxuLy8gPGRpdiBpZD1cInN3YWdnZXItdWlcIj48L2Rpdj5cbi8vIDxzY3JpcHQgc3JjPVwiaHR0cHM6Ly9jZG5qcy5jbG91ZGZsYXJlLmNvbS9hamF4L2xpYnMvc3dhZ2dlci11aS8zLjIuMi9zd2FnZ2VyLXVpLWJ1bmRsZS5qc1wiPiA8L3NjcmlwdD5cbi8vIDxzY3JpcHQgc3JjPVwiaHR0cHM6Ly9jZG5qcy5jbG91ZGZsYXJlLmNvbS9hamF4L2xpYnMvc3dhZ2dlci11aS8zLjIuMi9zd2FnZ2VyLXVpLXN0YW5kYWxvbmUtcHJlc2V0LmpzXCI+IDwvc2NyaXB0PlxuLy8gPHNjcmlwdD5cbi8vIHdpbmRvdy5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbi8vICAgdmFyIHNwZWMgPSAlcztcbi8vICAgLy8gQnVpbGQgYSBzeXN0ZW1cbi8vICAgY29uc3QgdWkgPSBTd2FnZ2VyVUlCdW5kbGUoe1xuLy8gICAgIHNwZWM6IHNwZWMsXG4vLyAgICAgZG9tX2lkOiAnI3N3YWdnZXItdWknLFxuLy8gICAgIGRlZXBMaW5raW5nOiB0cnVlLFxuLy8gICAgIHByZXNldHM6IFtcbi8vICAgICAgIFN3YWdnZXJVSUJ1bmRsZS5wcmVzZXRzLmFwaXMsXG4vLyAgICAgICBTd2FnZ2VyVUlTdGFuZGFsb25lUHJlc2V0XG4vLyAgICAgXSxcbi8vICAgICBwbHVnaW5zOiBbXG4vLyAgICAgICBTd2FnZ2VyVUlCdW5kbGUucGx1Z2lucy5Eb3dubG9hZFVybFxuLy8gICAgIF0sXG4vLyAgICAgbGF5b3V0OiBcIlN0YW5kYWxvbmVMYXlvdXRcIlxuLy8gICB9KVxuLy8gICB3aW5kb3cudWkgPSB1aVxuLy8gfVxuLy8gPC9zY3JpcHQ+XG4vLyA8L2JvZHk+XG4vLyA8L2h0bWw+XG4vLyBgXG4iXX0=