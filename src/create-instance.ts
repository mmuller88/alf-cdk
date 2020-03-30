import { EC2 } from 'aws-sdk';

const CI_USER_TOKEN = process.env.CI_USER_TOKEN || '';
const SECURITY_GROUP = process.env.SECURITY_GROUP || '';

const ec2 = new EC2();

export const handler = async (data: any = {}): Promise<any> => {
  console.debug('insert item request: ' + JSON.stringify(data));
  var item: any = typeof data === 'object' ? data : JSON.parse(data);

  var runInstancesResult: any;
  var createTagsResult: any;

  const userData : any = `#!/bin/bash
    echo "sudo halt" | at now + 55 minutes
    sudo yum -y install git
    git clone https://mmuller88:${CI_USER_TOKEN}@github.com/mmuller88/alf-ec2-1
    sudo chmod +x init.sh && ./init.sh
    sudo chmod +x start.sh && ./start.sh
  `

  const userDataEncoded = Buffer.from(userData).toString('base64');

  var paramsEC2: EC2.Types.RunInstancesRequest = {
    ImageId: 'ami-0cb790308f7591fa6',
    InstanceType: 't2.large',
    KeyName: 'ec2dev',
    MinCount: 1,
    MaxCount: 1,
    InstanceInitiatedShutdownBehavior: 'terminate',
    SecurityGroups: [SECURITY_GROUP],
    UserData: userDataEncoded,
  };

  runInstancesResult = await ec2.runInstances(paramsEC2).promise();
  console.log("runInstancesResult: ", JSON.stringify(runInstancesResult));
  item['status'] = 'running';

  try {
    if(runInstancesResult.Instances && runInstancesResult.Instances[0].InstanceId){
      item['InstanceId'] = runInstancesResult.Instances[0].InstanceId;
      const tagParams: EC2.Types.CreateTagsRequest = {
        Resources: [runInstancesResult.Instances[0].InstanceId],
        Tags: [
          {
            Key: 'Name',
            Value: 'SDK Sample'
          },
          {
            Key: 'alfInstanceId',
            Value: item['alfInstanceId']
          },
          {
            Key: 'alfUserId',
            Value: item['alfUserId']
          }
      ]};

      createTagsResult = await ec2.createTags(tagParams).promise();
      console.log("createTagsResult: ", JSON.stringify(createTagsResult));
    }
    return { statusCode: 201, item: item, runInstancesResult: runInstancesResult, createTagsResult: createTagsResult};
  } catch (error) {
    item['status'] = 'failed';
    return { statusCode: 500, error: error, item: item, runInstancesResult: runInstancesResult, createTagsResult: createTagsResult};
  }
}
