#!/usr/bin/env bash

npm run build
yes | cdk destroy
export WITH_SWAGGER='false' && cdk deploy --require-approval never
STACK_NAME=ApiLambdaCrudDynamoDBExample
./createSwagger.sh $STACK_NAME
export WITH_SWAGGER='true' && cdk deploy --require-approval never
aws apigateway create-deployment --rest-api-id $REST_API_ID --stage-name prod
