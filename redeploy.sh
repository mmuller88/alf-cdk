#!/usr/bin/env bash

npm run build
export WITH_SWAGGER='false' && yes | cdk destroy
export WITH_SWAGGER='false' && cdk deploy --require-approval never
npm run build.with.swagger
export WITH_SWAGGER='true' && cdk deploy --require-approval never
STACK_NAME=ApiLambdaCrudDynamoDBExample
REST_API_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='RestApiId'].OutputValue" --output text)
aws apigateway create-deployment --rest-api-id $REST_API_ID --stage-name prod
