#!/usr/bin/env bash

npm run build
yes | cdk destroy
export WITH_SWAGGER='false' && cdk deploy --require-approval never
STACK_NAME=ApiLambdaCrudDynamoDBExample
REST_API_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='RestApiId'].OutputValue" --output text)
mkdir -p tmp
aws apigateway get-export --parameters extensions='integrations' --rest-api-id $REST_API_ID --stage-name prod --export-type swagger --accepts application/yaml tmp/swagger_neu.yaml
npm i -g merge-yaml-cli
rm -f templates/swagger_full.yaml
merge-yaml -i tmp/swagger_neu.yaml templates/swagger_validations.yaml -o tmp/swagger_full.yaml
export WITH_SWAGGER='true' && cdk deploy --require-approval never
aws apigateway create-deployment --rest-api-id $REST_API_ID --stage-name prod
