import {
  ResponseType,
  CfnGatewayResponse,
  RequestValidator,
  SpecRestApi,
  ApiDefinition,
} from '@aws-cdk/aws-apigateway';
import { CfnOutput } from '@aws-cdk/core';
// import { ARecord, HostedZone, RecordTarget } from '@aws-cdk/aws-route53';
// import { ApiGatewayDomain } from '@aws-cdk/aws-route53-targets';
// import { Certificate } from '@aws-cdk/aws-certificatemanager';
// import { AlfCdkLambdas } from './lib/AlfCdkLambdas';
import { join } from 'path';
// import { Asset } from '@aws-cdk/aws-s3-assets';
import { AlfInstancesStackProps } from './alf-instances-stack';
import { StaticSite } from './static-site';
// import { UserPool, VerificationEmailStyle } from '@aws-cdk/aws-cognito'
// import { AlfCdkLambdas } from './lib/AlfCdkLambdas';
import { Role, ServicePrincipal, PolicyStatement } from '@aws-cdk/aws-iam';
import { CustomStack } from 'alf-cdk-app-pipeline/custom-stack';
// import { instanceTable } from './src/statics';

// const WITH_SWAGGER = process.env.WITH_SWAGGER || 'true';

export interface Domain {
  readonly domainName: string;
  readonly certificateArn: string;
  readonly zoneName: string;
  readonly hostedZoneId: string;
}

export class AlfCdkRestApi {
  constructor(scope: CustomStack, props: AlfInstancesStackProps) {
    // super(scope, 'AlfCdkRestApiStack', props);

    const apiRole = new Role(scope, 'apiRole', {
      roleName: `apiRole-${props.stage}`,
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    });

    apiRole.addToPolicy(
      new PolicyStatement({
        resources: ['*'],
        actions: ['lambda:InvokeFunction'],
      }),
    );

    // replace in swagger file
    const swaggerFile = `${props.swagger.file}`;
    const swaggerFileStage = `build/${props.swagger.file.slice(10, -5)}-${props.stage}.yaml`;

    const fs = require('fs');
    const data = fs.readFileSync(swaggerFile, 'utf8');

    const result = data
      .replace(/@@STAGE@@/g, props.stage)
      .replace(/@@COGNITO_ARN@@/g, props.auth?.cognito?.userPoolArn)
      .replace(/@@API_STAGE@@/g, props.stage === 'dev' ? '.dev' : '');

    fs.writeFileSync(swaggerFileStage, result, 'utf8');

    const api = new SpecRestApi(scope, 'AlfCdkRestApi', {
      restApiName: 'Alf Instance Service',
      apiDefinition: ApiDefinition.fromAsset(join(__dirname, `../${swaggerFileStage}`)),
      // deploy: false
      // description: 'The Alfresco Provisioner',
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
      // endpointTypes: [EndpointType.REGIONAL]
    });

    // api.node.addDependency(lambdas.getInstancesLambda);
    // api.node.addDependency(apiRole);

    // if(props?.domain){
    //   const domain = props.domain;
    //   // const domainName = new apigateway.DomainName(this, 'custom-domain', {
    //   //   domainName: domain.domainName,
    //   //   certificate: Certificate.fromCertificateArn(this, 'Certificate', props.domain.certificateArn),
    //   //   // endpointType: apigw.EndpointType.EDGE, // default is REGIONAL
    //   //   securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
    //   //   // mapping: api
    //   // });
    //   const domainName = api.addDomainName('apiDomainName', {
    //     domainName: domain.domainName,
    //     certificate: Certificate.fromCertificateArn(scope, 'Certificate', domain.certificateArn),
    //     endpointType: EndpointType.EDGE, // default is REGIONAL
    //     securityPolicy: SecurityPolicy.TLS_1_2,
    //   });

    //   // domainName.addBasePathMapping(api);
    //   // domainName.addBasePathMapping(api, {basePath: 'cd'});

    //   // tslint:disable-next-line: no-unused-expression
    //   new ARecord(scope, 'CustomDomainAliasRecord', {
    //     recordName: domain.domainName,
    //     zone: HostedZone.fromHostedZoneAttributes(scope, 'HostedZoneId', {zoneName: domain.zoneName, hostedZoneId: domain.hostedZoneId}),
    //     target: RecordTarget.fromAlias(new ApiGatewayDomain(domainName))
    //   });
    //   // api.addBasePathMapping(api);
    //   // domain.addBasePathMapping(api, {basePath: 'cd'});
    // }

    // const instancesConf = api.root.addResource('instances-conf');
    // addCorsOptions(items);
    // items.addCorsPreflight({
    //   allowOrigins: Cors.ALL_ORIGINS,
    //   allowMethods: Cors.ALL_METHODS
    // });

    // const cfnApi = api.node.defaultChild as CfnRestApi;

    // if(WITH_SWAGGER !== 'false'){
    //   // Upload Swagger to S3
    //   const fileAsset = new Asset(scope, 'SwaggerAsset', {
    //     path: join(__dirname, props?.swagger?.file || '')
    //   });
    //   cfnApi.bodyS3Location = { bucket: fileAsset.bucket.bucketName, key: fileAsset.s3ObjectKey };

    if (props.swagger.domain) {
      const domain = props.swagger.domain;
      // tslint:disable-next-line: no-unused-expression
      new StaticSite(scope, {
        stage: props.stage,
        domainName: domain.domainName,
        siteSubDomain: domain.subdomain,
        acmCertRef: domain.certificateArn,
      });
    }
    // }

    // tslint:disable-next-line: no-unused-expression
    new RequestValidator(scope, 'RequestValidator', {
      restApi: api,
    });

    // tslint:disable-next-line: no-unused-expression
    new CfnGatewayResponse(scope, 'get400Response', {
      responseType: ResponseType.BAD_REQUEST_BODY.responseType,
      // MISSING_AUTHENTICATION_TOKEN
      restApiId: api.restApiId,
      responseTemplates: {
        'application/json':
          '{"message":$context.error.messageString,"validationErrors":"$context.error.validationErrorString"}',
      },
      responseParameters: {
        'gatewayresponse.header.Access-Control-Allow-Methods': "'*'",
        'gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
        'gatewayresponse.header.Access-Control-Allow-Headers': "'*'",
        'gatewayresponse.header.Access-Control-Exposed-Headers':
          "'ETag','x-amz-meta-custom-header','Authorization','Content-Type','Accept'",
      },
    });

    // tslint:disable-next-line: no-unused-expression
    new CfnGatewayResponse(scope, 'get301Response', {
      responseType: ResponseType.RESOURCE_NOT_FOUND.responseType,
      restApiId: api.restApiId,
      responseParameters: {
        'gatewayresponse.header.Access-Control-Allow-Methods': "'*'",
        'gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
        'gatewayresponse.header.Access-Control-Allow-Headers': "'*'",
        'gatewayresponse.header.Access-Control-Exposed-Headers':
          "'ETag','x-amz-meta-custom-header','Authorization','Content-Type','Accept'",
      },
    });

    // var options: MethodOptions = {};
    // var authorizer;
    if (props.auth?.cognito) {
      // let userPool;

      // if(props.auth.cognito.userPoolArn){
      //   userPool = UserPool.fromUserPoolArn(scope, 'cognitoUserPool', props.auth.cognito.userPoolArn);
      // } else {
      //   userPool = new UserPool(scope, 'cognitoUserPool', {
      //     signInAliases: {
      //       username: true,
      //       email: true
      //     },
      //     selfSignUpEnabled: true,
      //     userVerification: {
      //       emailSubject: 'Verify your email for our awesome app!',
      //       emailBody: 'Hello {username}, Thanks for signing up to our awesome app! Your verification code is {####}',
      //       emailStyle: VerificationEmailStyle.CODE,
      //       smsMessage: 'Hello {username}, Thanks for signing up to our awesome app! Your verification code is {####}',
      //     }
      //   })
      // }

      // Authorizer for the Hello World API that uses the
      // Cognito User pool to Authorize users.
      // tslint:disable-next-line: no-unused-expression
      // new CfnAuthorizer(scope, 'cfnAuth', {
      //   restApiId: api.restApiId,
      //   name: 'AlfCDKAuthorizer',
      //   type: 'COGNITO_USER_POOLS',
      //   identitySource: 'method.request.header.Authorization',
      //   providerArns: [userPool.userPoolArn],
      // })

      // tslint:disable-next-line: no-unused-expression
      new CfnGatewayResponse(scope, 'get4xxResponse', {
        responseType: ResponseType.DEFAULT_4XX.responseType,
        // MISSING_AUTHENTICATION_TOKEN
        restApiId: api.restApiId,
        responseParameters: {
          'gatewayresponse.header.Access-Control-Allow-Methods': "'*'",
          'gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
          'gatewayresponse.header.Access-Control-Allow-Headers': "'*'",
          'gatewayresponse.header.Access-Control-Exposed-Headers':
            "'ETag','x-amz-meta-custom-header','Authorization','Content-Type','Accept'",
        },
      });

      // options = {
      //   authorizationScopes: props?.auth?.cognito.scope? [props?.auth?.cognito.scope] : undefined,
      //   authorizationType: AuthorizationType.COGNITO,
      //   authorizer: {authorizerId: authorizer.ref}
      // }
    }

    // api.addModel('ResponseModel', {
    //   contentType: 'application/json',
    //   modelName: 'ResponseModel',
    //   schema: {
    //     schema: JsonSchemaVersion.DRAFT4,
    //     title: 'pollResponse',
    //     type: JsonSchemaType.OBJECT,
    //     additionalProperties: false,
    //     properties: {
    //       state: { type: JsonSchemaType.STRING },
    //       greeting: { type: JsonSchemaType.STRING }
    //     }
    //   }
    // });

    // const getAllIntegration = new LambdaIntegration(lambdas.getAllLambda);
    // instancesConf.addMethod('GET', getAllIntegration, options);

    // items.addCorsPreflight({
    //   allowOrigins: Cors.ALL_ORIGINS,
    //   allowMethods: Cors.ALL_METHODS, // this is also the default
    //   allowCredentials: true,
    //   allowHeaders: ['Content-Type','X-Amz-Date','Authorization','X-Api-Key','X-Amz-Security-Token']
    // });

    // const instances = api.root.addResource('instances');
    // const getAllInstancesIntegration = new LambdaIntegration(lambdas.getInstancesLambda);
    // instances.addMethod('GET', getAllInstancesIntegration, options);

    // const getOneInstance = instances.addResource(`{${instanceTable.instanceId}}`);
    // const getOneInstanceIntegration = new LambdaIntegration(lambdas.getInstancesLambda);
    // getOneInstance.addMethod('GET', getOneInstanceIntegration, options)

    // instancesConf.addResource(`{${instanceTable.instanceId}}`);

    // const optionsIntegration = new LambdaIntegration(lambdas.optionsLambda);
    // instances.addMethod('OPTIONS', optionsIntegration);
    // getOneInstance.addMethod('OPTIONS', optionsIntegration);
    // instancesConf.addMethod('OPTIONS', optionsIntegration);
    // singleItem.addMethod('OPTIONS', optionsIntegration);

    // const getOneIntegration = new LambdaIntegration(lambdas.getOneLambda);
    // singleItem.addMethod('GET', getOneIntegration, options);

    // const deleteOneIntegration = new LambdaIntegration(lambdas.deleteOne);
    // singleItem.addMethod('DELETE', deleteOneIntegration);

    // const createOneIntegration = new LambdaIntegration(lambdas.createOneApi);
    // instancesConf.addMethod('POST', createOneIntegration, options);

    // const updateOneIntegration = new LambdaIntegration(lambdas.updateOneApi);
    // singleItem.addMethod('PUT', updateOneIntegration, options);

    const restApiEndPoint = new CfnOutput(scope, 'RestApiEndPoint', {
      value: api.urlForPath(),
    });
    scope.cfnOutputs['RestApiEndPoint'] = restApiEndPoint;

    const restApiId = new CfnOutput(scope, 'RestApiId', {
      value: api.restApiId,
    });
    scope.cfnOutputs['RestApiId'] = restApiId;

    const apiDomainName = new CfnOutput(scope, 'ApiDomainName', {
      value: api.domainName?.domainName || '',
    });
    scope.cfnOutputs['ApiDomainName'] = apiDomainName;
  }
}

// export function addCorsOptions(apiResource: IResource) {
//   apiResource.addMethod('OPTIONS', new MockIntegration({
//     integrationResponses: [{
//       statusCode: '200',
//       responseParameters: {
//         'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
//         'method.response.header.Access-Control-Allow-Origin': "'https://www.h-o.dev'",
//         'method.response.header.Access-Control-Allow-Credentials': "'false'",
//         'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
//       },
//     }],
//     passthroughBehavior: PassthroughBehavior.WHEN_NO_MATCH,
//     requestTemplates: {
//       "application/json": "{\"statusCode\": 200}"
//     },
//   }), {
//     methodResponses: [{
//       statusCode: '200',
//       responseParameters: {
//         'method.response.header.Access-Control-Allow-Headers': true,
//         'method.response.header.Access-Control-Allow-Methods': true,
//         'method.response.header.Access-Control-Allow-Credentials': true,
//         'method.response.header.Access-Control-Allow-Origin': true,
//       },
//     }]
//   })
// }
