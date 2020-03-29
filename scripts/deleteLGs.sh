#!/usr/bin/env bash

LOG_GROUP_NAME=${1:-all}

if [[ $KEYCLOAK == "all" ]]; then
  aws logs describe-log-groups --query 'logGroups[*].logGroupName' --output table | awk '{print $2}' | grep -v ^$ | \
  while read x; do echo $x; aws logs delete-log-group --log-group-name $x; done
else
  aws logs describe-log-groups --query "logGroups[?starts_with(logGroupName, '$LOG_GROUP_NAME')].logGroupName" --output table | \
  awk '{print $2}' | grep -v ^$ | while read x; do aws logs delete-log-group --log-group-name $x; done
fi
