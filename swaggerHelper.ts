import * as cdk from '@aws-cdk/core';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as lambda from '@aws-cdk/aws-lambda';
import { LambdaIntegration } from "@aws-cdk/aws-apigateway";

export default function convertSwaggerToCdkRestApi(scope:cdk.Construct, apiGateway:apigateway.RestApi, swaggerApi: any) {

  let createdLambdas:Map<string, lambda.Function> = new Map<string, lambda.Function>();
  let paths = Object.keys(swaggerApi.paths);

  paths.forEach(pathName => {
    const resource = apiGateway.root.resourceForPath(pathName);
    const methods = Object.keys(swaggerApi.paths[pathName]);

    methods.forEach(methodName => {
      let endpoint = swaggerApi.paths[pathName][methodName];
      let backingLambda: lambda.Function;

      if (createdLambdas.has(endpoint["x-cdk-lambda-name"]) === false) {
        createdLambdas.set(endpoint["x-cdk-lambda-name"],
          new lambda.Function(scope, endpoint["x-cdk-lambda-name"], {
            code: lambda.Code.asset(endpoint["x-cdk-lambda-code"]),
            handler: endpoint["x-cdk-lambda-handler"],
            runtime: lambda.Runtime.NODEJS_10_X
          })
        );
      }

      backingLambda = createdLambdas.get(endpoint["x-cdk-lambda-name"])!;

      let integrationParameters:any = undefined;
      let methodParameters:any = undefined;

      if (endpoint.parameters && endpoint.parameters.length) {
        let parameters:any[] = endpoint.parameters;
        integrationParameters = {};
        methodParameters = {};

        parameters.forEach(swaggerParameter => {
          integrationParameters[`integration.request.${swaggerParameter.in}.${swaggerParameter.name}`] = `method.request.${swaggerParameter.in}.${swaggerParameter.name}`;
          methodParameters[`method.request.${swaggerParameter.in}.${swaggerParameter.name}`] = true;
        });
      }

      resource.addMethod(methodName,
        new LambdaIntegration(backingLambda, {
          requestParameters: integrationParameters
        }),
        {
          requestParameters: methodParameters
        });
    });

  });
}
