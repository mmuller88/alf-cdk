import { CodeBuild } from 'aws-sdk'; // eslint-disable-line import/no-extraneous-dependencies

const codebuild = new CodeBuild();

const PROJECT_NAME = process.env.PROJECT_NAME || '';

export const handler = async (event: any = {}): Promise<any> => {
  console.debug('create-instance event: ' + JSON.stringify(event));

  const params: CodeBuild.Types.StartBuildInput = {
    projectName: PROJECT_NAME,
    environmentVariablesOverride: [
      { name: 'alfInstanceId', value: 'abs' },
    ],
    // artifactsOverride: {
    //   type: 'NO_ARTIFACTS'
    // },
    // secondarySourcesOverride: [{
    //   type: 'S3',
    //   location: SRC_PATH
    // }]
  };
  console.debug('params: ' + JSON.stringify(params));
  const startBuildResult = await codebuild.startBuild(params).promise();
  console.debug('startBuildResult: ' + JSON.stringify(startBuildResult));
};
