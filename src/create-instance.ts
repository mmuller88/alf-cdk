import { EC2 } from 'aws-sdk';
// import { AlfTypes } from './statics';
// import { repoTable } from './statics';

// const REPO_TABLE = process.env.REPO_TABLE || '';
// const ALF_TYPES = process.env.ALF_TYPES || '';
// const alfTypes: AlfTypes = JSON.parse(ALF_TYPES);
const CI_USER_TOKEN = process.env.CI_USER_TOKEN || '';
const SECURITY_GROUP = process.env.SECURITY_GROUP || '';
const STACK_NAME = process.env.STACK_NAME || '';
const IMAGE_ID = process.env.IMAGE_ID || '';
const ALF_EC2_PROFILE = process.env.ALF_EC2_ROLE || '';

const ec2 = new EC2();
// const db = new DynamoDB.DocumentClient();


export const handler = async (data: any = {}): Promise<any> => {
  console.debug('insert item request: ' + JSON.stringify(data));
  var item: any = typeof data === 'object' ? data : JSON.parse(data);

  var createTagsResult: any;
  var runInstancesResult: any;

  const shortLived = new Boolean(item['shortLived'] || true);
  const terminateIn = shortLived.valueOf()?'55 minutes':'3 days';

  console.log("shortLived: " + JSON.stringify(shortLived));
  console.log("terminateIn: " + JSON.stringify(terminateIn));

  const region = process.env.AWS_REGION
  console.log("region: ", JSON.stringify(region));

  const userData : any = `#!/bin/bash
    echo "sudo halt" | at now + ${terminateIn}
    yum -y install git
    REPO=${item.alfType.gitRepo}
    git clone https://mmuller88:${CI_USER_TOKEN}@github.com/mmuller88/$REPO /usr/local/$REPO
    cd /usr/local/$REPO
    chmod +x init.sh && ./init.sh
    instance_id=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
    export AWS_DEFAULT_REGION="${region}"
    /usr/bin/aws ec2 create-tags --resources $instance_id --tags 'Key="AcsInfo",Value="ACS is still booting"'
    sudo chmod +x start.sh && ./start.sh
    /usr/bin/aws ec2 create-tags --resources $instance_id --tags 'Key="AcsInfo",Value="ACS is ready"'
  `
  const userDataEncoded = Buffer.from(userData).toString('base64');

  var paramsEC2: EC2.Types.RunInstancesRequest = {
    ImageId: IMAGE_ID,
    InstanceType: item.alfType.ec2InstanceType,
    KeyName: 'ec2dev',
    MinCount: 1,
    MaxCount: 1,
    InstanceInitiatedShutdownBehavior: 'terminate',
    SecurityGroups: [SECURITY_GROUP],
    UserData: userDataEncoded,
    IamInstanceProfile: { Arn: ALF_EC2_PROFILE }
    // HibernationOptions: {Configured: true},
  };

  console.log("paramsEC2: ", JSON.stringify(paramsEC2));

  if(IMAGE_ID === ''){
    console.log('image id is empty. No Instance will be created')
  } else {
    runInstancesResult = await ec2.runInstances(paramsEC2).promise();
    console.log("runInstancesResult: ", JSON.stringify(runInstancesResult));
    // item['status'] = 'running';

    try {
      if(runInstancesResult.Instances && runInstancesResult.Instances[0].InstanceId){
        const instanceId = runInstancesResult.Instances[0].InstanceId;
        const tagParams: EC2.Types.CreateTagsRequest = {
          Resources: [instanceId],
          Tags: [
            {
              Key: 'Name',
              Value: item['customName'] || 'noName'
            },
            {
              Key: 'alfInstanceId',
              Value: item['alfInstanceId']
            },
            {
              Key: 'userId',
              Value: item['userId']
            },
            {
              Key: 'alfType',
              Value: JSON.stringify(item['alfType'])
            },
            {
              Key: 'STACK_NAME',
              Value: STACK_NAME
            },
            {
              Key: 'shortLived',
              Value: shortLived.toString()
            }
        ]};

        createTagsResult = await ec2.createTags(tagParams).promise();
        console.log("createTagsResult: ", JSON.stringify(createTagsResult));
      }
    } catch (error) {
      console.error("createTagsResult: ", JSON.stringify(createTagsResult));
      console.error("runInstancesResult: ", JSON.stringify(runInstancesResult));
      console.error("item: ", JSON.stringify(item));
      throw error
    }
  }
  return {item: item, runInstancesResult: runInstancesResult, createTagsResult: createTagsResult};
}
