const { TypeScriptProject } = require('projen');

const dependencies = {
  'alf-cdk-app-pipeline': 'github:mmuller88/alf-cdk-app-pipeline#v0.0.8',
  'aws-lambda': '^1.0.6',
  '@types/aws-lambda': '^8.10.59',
}

const name = 'alf-cdk';

const project = new TypeScriptProject({
  name: name,
  authorAddress: "damadden88g@googlemail.com",
  authorName: "Martin Müller",
  repository: `https://github.com/mmuller88/${name}`,
  dependencies,
  peerDependencies: dependencies,
  keywords: [
    "cdk",
    "api-gw"
  ],
  releaseWorkflow: false,
});

const stage = '${STAGE:-dev}';

project.addScripts({
  'clean': 'rm -rf ./cdk.out && rm -rf ./cdk.out ./build lib',
  // skip test in build: yarn run test
  'build': 'yarn run clean && yarn install && yarn run compile && cp src/package.json lib && cd lib && yarn install ',
  'cdkdeploy': `yarn run build && cdk deploy ${name}-${stage} --profile damadden88 --require-approval never`,
  'cdksynth': `yarn run build && cdk synth ${name}-${stage} --profile damadden88`,
  'cdkdestroy': `yarn run build && yes | cdk destroy ${name}-${stage} --profile damadden88`,
  'cdkpipelinediff': `yarn run build && cdk diff ${name}-pipeline --profile damadden88 || true`,
  'cdkpipelinedeploy': `yarn run build && cdk deploy ${name}-pipeline --profile damadden88 --require-approval never`,
});

project.tsconfig.compilerOptions.rootDir=undefined;
project.gitignore.exclude(['cdk.out']);
project.synth();
