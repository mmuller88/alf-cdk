import { RestApi, Cors, EndpointType, SecurityPolicy, LambdaIntegration, CfnRestApi, AuthorizationType, CfnAuthorizer } from '@aws-cdk/aws-apigateway';
import { Construct, CfnOutput } from '@aws-cdk/core';
import { ARecord, HostedZone, RecordTarget } from '@aws-cdk/aws-route53';
import { ApiGatewayDomain } from '@aws-cdk/aws-route53-targets';
import { Certificate } from '@aws-cdk/aws-certificatemanager';
import { AlfCdkLambdas } from './lib/AlfCdkLambdas';
import { instanceTable } from './lib/AlfCdkTables';
import { join } from 'path';
import { Asset } from '@aws-cdk/aws-s3-assets';
import { AlfInstancesStackProps } from '.';
import { StaticSite } from './lib/static-site';
import { UserPool, VerificationEmailStyle } from '@aws-cdk/aws-cognito'

const WITH_SWAGGER = process.env.WITH_SWAGGER || 'true';

export interface Domain {
  readonly domainName: string,
  readonly certificateArn: string,
  readonly zoneName: string,
  readonly hostedZoneId: string
};

export class AlfCdkRestApi {

  constructor(scope: Construct, lambdas: AlfCdkLambdas, props?: AlfInstancesStackProps){

    var api = new RestApi(scope, 'AlfCdkRestApi', {
      restApiName: 'Alf Instance Service',
      description: 'An AWS Backed Service for providing Alfresco with custom domain',
      // domainName: {
      //   domainName: domain.domainName,
      //   certificate: Certificate.fromCertificateArn(this, 'Certificate', props.domain.certificateArn),
      // },
      // defaultCorsPreflightOptions: {
      //   allowOrigins: Cors.ALL_ORIGINS,
      //   allowMethods: Cors.ALL_METHODS // this is also the default
      // },
      // deployOptions: {
      //   loggingLevel: apigateway.MethodLoggingLevel.INFO,
      //   dataTraceEnabled: true
      // }
      endpointTypes: [EndpointType.REGIONAL]
    });

    if(props?.domain){
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
        certificate: Certificate.fromCertificateArn(scope, 'Certificate', domain.certificateArn),
        // endpointType: apigw.EndpointType.EDGE, // default is REGIONAL
        securityPolicy: SecurityPolicy.TLS_1_2,
      });

      // domainName.addBasePathMapping(api);
      // domainName.addBasePathMapping(api, {basePath: 'cd'});

      new ARecord(scope, 'CustomDomainAliasRecord', {
        zone: HostedZone.fromHostedZoneAttributes(scope, 'HodevHostedZoneId', {zoneName: domain.zoneName, hostedZoneId: domain.hostedZoneId}),
        target: RecordTarget.fromAlias(new ApiGatewayDomain(domainName))
      });
      // api.addBasePathMapping(api);
      // domain.addBasePathMapping(api, {basePath: 'cd'});
    }

    const cfnApi = api.node.defaultChild as CfnRestApi;

    if(WITH_SWAGGER !== 'false'){
      // Upload Swagger to S3
      const fileAsset = new Asset(scope, 'SwaggerAsset', {
        path: join(__dirname, props?.swagger?.file || '')
      });
      cfnApi.bodyS3Location = { bucket: fileAsset.bucket.bucketName, key: fileAsset.s3ObjectKey };

      if(props?.swagger?.domain){
        const domain = props.swagger.domain;
        new StaticSite(scope, {
          domainName: domain.domainName,
          siteSubDomain: domain.subdomain,
          acmCertRef: domain.certificateArn,
          swaggerFile: props.swagger.file
      });
      }
    }

    var authorizer;
    if(props?.cognito){
        // Cognito User Pool with Email Sign-in Type.
      const userPool = new UserPool(scope, 'userPool', {
        signInAliases: {
          username: true,
          email: true
        },
        selfSignUpEnabled: true,
        userVerification: {
          emailSubject: 'Verify your email for our awesome app!',
          emailBody: 'Hello {username}, Thanks for signing up to our awesome app! Your verification code is {####}',
          emailStyle: VerificationEmailStyle.CODE,
          smsMessage: 'Hello {username}, Thanks for signing up to our awesome app! Your verification code is {####}',
    }
      })

      // Authorizer for the Hello World API that uses the
      // Cognito User pool to Authorize users.
      authorizer = new CfnAuthorizer(scope, 'cfnAuth', {
        restApiId: api.restApiId,
        name: 'HelloWorldAPIAuthorizer',
        type: 'COGNITO_USER_POOLS',
        identitySource: 'method.request.header.Authorization',
        providerArns: [userPool.userPoolArn],
      })
    }

    const items = api.root.addResource('items');
    items.addCorsPreflight({
      allowOrigins: Cors.ALL_ORIGINS,
      allowMethods: Cors.ALL_METHODS
    });

    const getAllIntegration = new LambdaIntegration(lambdas.getAllLambda);
    items.addMethod('GET', getAllIntegration, {
      authorizationType: authorizer?AuthorizationType.COGNITO : undefined,
      authorizer: (authorizer? {authorizerId: authorizer.ref} : undefined)
    });

    const instances = api.root.addResource('instances');
    const getAllInstancesIntegration = new LambdaIntegration(lambdas.getAllInstancesLambda);
    instances.addMethod('GET', getAllInstancesIntegration);

    const singleItem = items.addResource(`{${instanceTable.sortKey}}`);
    const getOneIntegration = new LambdaIntegration(lambdas.getOneLambda);
    singleItem.addMethod('GET', getOneIntegration);

    const deleteOneIntegration = new LambdaIntegration(lambdas.deleteOne);
    singleItem.addMethod('DELETE', deleteOneIntegration);

    const createOneIntegration = new LambdaIntegration(lambdas.createOneApi);
    const updateOneIntegration = new LambdaIntegration(lambdas.updateOneApi);

    items.addMethod('POST', createOneIntegration);
    singleItem.addMethod('PUT', updateOneIntegration);

    new CfnOutput(scope, 'RestApiEndPoint', {
      value: api.url
    });

    new CfnOutput(scope, 'RestApiId', {
      value: api.restApiId
    });

    new CfnOutput(scope, 'ApiDomainName', {
      value: api.domainName?.domainName || ''
    });
  }
}
