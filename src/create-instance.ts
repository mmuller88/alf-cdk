import { EC2, DynamoDB } from 'aws-sdk';

const REPO_TABLE = process.env.REPO_TABLE || '';
const PRIMARY_KEY = process.env.PRIMARY_KEY || '';
const CI_USER_TOKEN = process.env.CI_USER_TOKEN || '';
const SECURITY_GROUP = process.env.SECURITY_GROUP || '';
const STACK_NAME = process.env.STACK_NAME || '';

const ec2 = new EC2();
const db = new DynamoDB.DocumentClient();


export const handler = async (data: any = {}): Promise<any> => {
  console.debug('insert item request: ' + JSON.stringify(data));
  var item: any = typeof data === 'object' ? data : JSON.parse(data);

  var createTagsResult: any;

  const params = {
    TableName: REPO_TABLE,
    Key: {
      [PRIMARY_KEY]: item[PRIMARY_KEY],
    },
  };

  console.debug("params: " + JSON.stringify(params));
  const response = await db.get(params).promise();

  if(!response.Item){
    console.error("response: " + JSON.stringify(response));
    throw Error("response.Item is null. Repo doesn't exist")
  }

  const userData : any = `#!/bin/bash
    echo "sudo halt" | at now + 55 minutes
    yum -y install git
    REPO=${response.Item['Repo']}
    git clone https://mmuller88:${CI_USER_TOKEN}@github.com/mmuller88/$REPO /usr/local/$REPO
    cd /usr/local/$REPO
    chmod +x init.sh && ./init.sh
    sudo chmod +x start.sh && ./start.sh
  `
  const userDataEncoded = Buffer.from(userData).toString('base64');

  var paramsEC2: EC2.Types.RunInstancesRequest = {
    ImageId: 'ami-0cb790308f7591fa6',
    InstanceType: response.Item['instanceType'],
    KeyName: 'ec2dev',
    MinCount: 1,
    MaxCount: 1,
    InstanceInitiatedShutdownBehavior: 'terminate',
    SecurityGroups: [SECURITY_GROUP],
    UserData: userDataEncoded,
    // HibernationOptions: {Configured: true},
  };

  const runInstancesResult: EC2.Types.Reservation = await ec2.runInstances(paramsEC2).promise();
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
            Value: 'SDK Sample'
          },
          {
            Key: 'alfInstanceId',
            Value: item['alfInstanceId']
          },
          {
            Key: 'alfUserId',
            Value: item['alfUserId']
          },
          {
            Key: 'alfType',
            Value: item['alfType']
          },
          {
            Key: 'expectedStatus',
            Value: item['expectedStatus']
          },
          {
            Key: 'STACK_NAME',
            Value: STACK_NAME
          }
      ]};

      createTagsResult = await ec2.createTags(tagParams).promise();
      console.log("createTagsResult: ", JSON.stringify(createTagsResult));
    }
    return { statusCode: 201, item: item, runInstancesResult: runInstancesResult, createTagsResult: createTagsResult};
  } catch (error) {
    // item['status'] = 'failed';
    return { statusCode: 500, error: error, item: item, runInstancesResult: runInstancesResult, createTagsResult: createTagsResult};
  }
}
