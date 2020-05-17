import { EC2 } from 'aws-sdk';
import { InstanceItem } from './statics';

const CI_USER_TOKEN = process.env.CI_USER_TOKEN || '';
const SECURITY_GROUP = process.env.SECURITY_GROUP || '';
const STACK_NAME = process.env.STACK_NAME || '';
const IMAGE_ID = process.env.IMAGE_ID || '';

const ec2 = new EC2();

export const handler = async (data: any = {}): Promise<any> => {
  console.debug('insert item request: ' + JSON.stringify(data));
  var item: InstanceItem = typeof data === 'object' ? data : JSON.parse(data);

  var createTagsResult: any;
  var runInstancesResult: EC2.Types.Reservation = {};

  const userData : any = `Content-Type: multipart/mixed; boundary="//"
MIME-Version: 1.0

--//
Content-Type: text/cloud-config; charset="us-ascii"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit
Content-Disposition: attachment; filename="cloud-config.txt"

#cloud-config
cloud_final_modules:
- [scripts-user, always]

--//
Content-Type: text/x-shellscript; charset="us-ascii"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit
Content-Disposition: attachment; filename="userdata.txt"

#!/bin/bash
# echo "sudo halt" | at now + 55 minutes
yum -y install git
REPO=${item.alfType.gitRepo}
git clone https://mmuller88:${CI_USER_TOKEN}@github.com/mmuller88/$REPO /usr/local/$REPO
cd /usr/local/$REPO
chmod +x init.sh && ./init.sh
sudo chmod +x start.sh && ./start.sh
sudo chown -R 33007 data/solr-data
sudo chown -R 999 logs
--//
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
    // HibernationOptions: {Configured: true},
  };

  console.debug("paramsEC2: ", JSON.stringify(paramsEC2));

  if(IMAGE_ID === ''){
    console.debug('image id is empty. No Instance will be created')
  } else {
    runInstancesResult = await ec2.runInstances(paramsEC2).promise();
    console.debug("runInstancesResult: ", JSON.stringify(runInstancesResult));
    // item['status'] = 'running';

    if(runInstancesResult.Instances && runInstancesResult.Instances[0].InstanceId){
      const instance = runInstancesResult.Instances[0];
      const tagParams: EC2.Types.CreateTagsRequest = {
        Resources: [instance.InstanceId || ''],
        Tags: [
          {
            Key: 'Name',
            Value: item.tags?.name || 'no name'
          },
          {
            Key: 'alfInstanceId',
            Value: item.alfInstanceId
          },
          {
            Key: 'userId',
            Value: item.userId
          },
          {
            Key: 'alfType',
            Value: JSON.stringify(item.alfType)
          },
          {
            Key: 'STACK_NAME',
            Value: STACK_NAME
          },
          {
            Key: 'tags',
            Value: JSON.stringify(item.tags)
          }
      ]};

      console.debug("tagParams: ", JSON.stringify(tagParams));
      createTagsResult = await ec2.createTags(tagParams).promise();
      console.debug("createTagsResult: ", JSON.stringify(createTagsResult));
    }
  }
  return {item: item, runInstancesResult: runInstancesResult, createTagsResult: createTagsResult};
}
