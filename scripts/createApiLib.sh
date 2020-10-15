#!/usr/bin/env bash

PWD=$(pwd)
docker run --rm -v "$PWD:/local" openapitools/openapi-generator-cli generate \
  -i /local/templates/swagger_validations.yaml \
  -g typescript-axios \
  -o /local/tslib
