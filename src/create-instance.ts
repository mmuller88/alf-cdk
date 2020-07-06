// import AWS from 'aws-sdk';

import AWS = require("aws-sdk");
import { CodeBuild } from "aws-sdk";

var codebuild = new AWS.CodeBuild();

const PROJECT_NAME = process.env.PROJECT_NAME || ''

export const handler = async (event: any = {}): Promise<any> => {
  console.debug("create-instance event: " + JSON.stringify(event));

  const params: CodeBuild.Types.StartBuildInput = {
    projectName: PROJECT_NAME,
    artifactsOverride: {
      type: 'NO_ARTIFACTS'
    }
  };
  console.debug("params: " + JSON.stringify(params));
  const startBuildResult = await codebuild.startBuild(params).promise();
  console.debug("startBuildResult: " + JSON.stringify(startBuildResult));
}
