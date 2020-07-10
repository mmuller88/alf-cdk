import {  CloudFrontWebDistribution, SSLMethod, SecurityPolicyProtocol, CloudFrontAllowedMethods} from '@aws-cdk/aws-cloudfront';
import route53 = require('@aws-cdk/aws-route53');
import s3deploy = require('@aws-cdk/aws-s3-deployment');
import cdk = require('@aws-cdk/core');
import targets = require('@aws-cdk/aws-route53-targets/lib');
import { Construct } from '@aws-cdk/core';
import { AutoDeleteBucket } from '@mobileposse/auto-delete-bucket'
import { HttpMethods } from '@aws-cdk/aws-s3';

const yaml = require('js-yaml');
const fs = require('fs');

// var swaggerJson;

export interface StaticSiteProps {
    domainName: string;
    siteSubDomain: string;
    acmCertRef: string;
    swaggerFile: string,
}

/**
 * Static site infrastructure, which deploys site content to an S3 bucket.
 *
 * The site redirects from HTTP to HTTPS, using a CloudFront distribution,
 * Route53 alias record, and ACM certificate.
 */
export class StaticSite {
    constructor(scope: Construct, props: StaticSiteProps) {
        // super(parent, name);

        const siteDomain = props.siteSubDomain + '.' + props.domainName;
        const zone = route53.HostedZone.fromLookup(scope, 'Zone', { domainName: siteDomain });
        new cdk.CfnOutput(scope, 'Site', { value: 'https://' + siteDomain });

        const inputYML = props.swaggerFile;
        const swaggerFile = './lib/site-contents/swagger.json';
        var swaggerJsonObj = yaml.load(fs.readFileSync(inputYML, {encoding: 'utf-8'}));
        // remove options methods
        delete swaggerJsonObj['paths']['/instances']['options'];
        delete swaggerJsonObj['paths']['/instances/{alfInstanceId}']['options'];
        delete swaggerJsonObj['paths']['/instances-conf']['options'];
        delete swaggerJsonObj['paths']['/instances-conf/{alfInstanceId}']['options'];
        const swaggerJson = JSON.stringify(swaggerJsonObj)
        // const obj = yaml.load(fs.readFileSync(inputYML, {encoding: 'utf-8'}));
        fs.writeFileSync(swaggerFile, swaggerJson);

            /**
         * NOTE: S3 requires bucket names to be globally unique across accounts so
         * you will need to change the bucketName to something that nobody else is
         * using.
         */
        const siteBucket = new AutoDeleteBucket(scope, 'SiteBucket', { //AutoDeleteBucket
          bucketName: siteDomain,
          websiteIndexDocument: 'swagger.html',
          websiteErrorDocument: 'error.html',
          publicReadAccess: true,
          cors: [{
            allowedMethods: [HttpMethods.GET, HttpMethods.HEAD],
            allowedOrigins: ["*"],
            allowedHeaders: ["*"],
            exposedHeaders: ["ETag","x-amz-meta-custom-header","Authorization", "Content-Type", "Accept"]
          }],

          // The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
          // the new bucket, and it will remain in your account until manually deleted. By setting the policy to
          // DESTROY, cdk destroy will attempt to delete the bucket, but will error if the bucket is not empty.
          removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
        })

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
        // new cdk.CfnOutput(scope, 'Bucket', { value: siteBucket.bucketName });

        // TLS certificate
        // const certificateArn = new acm.DnsValidatedCertificate(scope, 'SiteCertificate', {
        //     domainName: siteDomain,
        //     hostedZone: zone
        // }).certificateArn;
        // new cdk.CfnOutput(scope, 'Certificate', { value: certificateArn });

        // CloudFront distribution that provides HTTPS
        const distribution = new CloudFrontWebDistribution(scope, 'SiteDistribution', {
            aliasConfiguration: {
                acmCertRef: props.acmCertRef,
                names: [ siteDomain ],
                sslMethod: SSLMethod.SNI,
                securityPolicy: SecurityPolicyProtocol.TLS_V1_1_2016,
            },
            originConfigs: [
                {
                    s3OriginSource: {
                        s3BucketSource: siteBucket
                    },
                    behaviors : [ {
                      isDefaultBehavior: true,
                      allowedMethods: CloudFrontAllowedMethods.GET_HEAD_OPTIONS
                    }],
                    originHeaders: {
                      'Access-Control-Allow-Origin': '*'
                    }
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
          sources: [ s3deploy.Source.asset('./lib/site-contents') ],
          destinationBucket: siteBucket,
          distribution: distribution,
          distributionPaths: ['/*'],
        });
    }
}
