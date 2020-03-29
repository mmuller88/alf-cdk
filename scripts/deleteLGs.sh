#!/usr/bin/env bash

REGION=eu-west-2
aws logs describe-log-groups --query 'logGroups[*].logGroupName' --output table | awk '{print $2}' | grep -v ^$ | \
while read x; do echo $x; aws logs delete-log-group --log-group-name $x; done
