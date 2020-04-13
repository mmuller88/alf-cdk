#!/usr/bin/env bash

REST_API_ID=$1
REST_API_ID_P=$2
REGION=eu-west-1
mkdir -p tmp
aws apigateway get-export --parameters extensions='integrations' --rest-api-id $REST_API_ID --stage-name prod --export-type oas30 --accepts application/yaml tmp/swagger_neu.yaml
aws apigateway get-export --region $REGION --parameters extensions='integrations' --rest-api-id $REST_API_ID_P --stage-name prod --export-type oas30 --accepts application/yaml tmp/swagger_neu_.yaml
# sed -i '/x-amazon-apigateway-integration/{ N; N; N; N; d; }' tmp/swagger_neu.yaml
npm i -g merge-yaml-cli
# rm -f tmp/swagger_full.yaml
merge-yaml -i tmp/swagger_neu.yaml templates/swagger_validations.yaml -o tmp/swagger_full.yaml
# docker run -i yousan/swagger-yaml-to-html < tmp/swagger_full.yaml > index.html
merge-yaml -i tmp/swagger_neu_.yaml templates/swagger_validations.yaml -o tmp/swagger_full_.yaml
docker run -i yousan/swagger-yaml-to-html < tmp/swagger_full_.yaml > index_.html
cat tmp/swagger_full.yaml
