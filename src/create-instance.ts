// const AWS = require('aws-sdk');
import { EC2 } from 'aws-sdk';
// import ec2 from 'aws-ec2';

const ec2 = new EC2();

export const handler = async (data: any = {}): Promise<any> => {
  console.debug('insert item request: ' + JSON.stringify(data));
  var item: any = typeof data === 'object' ? data : JSON.parse(data);

  // var item: any = typeof data.item === 'object' ? data.item : JSON.parse(data.item);
  // const item: any = typeof data === 'object' ? data : JSON.parse(data);

  const userData= `#!/bin/bash
    echo "Hello World"
    touch /tmp/hello.txt
  `

  var userDataEncoded = new Buffer(userData).toString('base64');

  var paramsEC2 = {
    ImageId: 'ami-28c90151',
    InstanceType: 't1.micro',
    KeyName: 'ec2dev',
    MinCount: 1,
    MaxCount: 1,
    // SecurityGroups: [groupname],
    UserData: userDataEncoded
  };

  try{
    const result = await ec2.runInstances(paramsEC2).promise();
    console.log("Result: ", JSON.stringify(result));
    item['status'] = 'created';
    item['ec2data'] = data;
    item['runInstancesResult'] = result;
    return { statusCode: 201, body: item };
  } catch (err) {
    return { statusCode: 500, body: err };
  }



  // .then(data => {
  //   console.debug(data);
  //   if(data.Instances){
  //     var instanceId = data.Instances[0].InstanceId;
  //     console.log("Created instance", instanceId);

      // Add tags to the instance
      // const tagParams = {
      //   Resources: [instanceId],
      //   Tags: [
      //     {
      //         Key: 'Name',
      //         Value: 'SDK Sample'
      //     }
      // ]};
      // // Create a promise on an EC2 service object
      // const tagPromise = new EC2({apiVersion: '2016-11-15'}).createTags(tagParams).promise();
      // // Handle promise's fulfilled/rejected states
      // tagPromise.then( (data: string) => {
      //     console.log("Instance tagged " + data);
      //     return { statusCode: 201, body: '' };
      //   }).catch( (err: { stack: any; }) => {
      //     console.error(err, err.stack);
      //     return { statusCode: 500, body: err };
      //   });
  //     return { statusCode: 201, body: item };
  //   }
  //   return { statusCode: 500, body: data };
  // }).catch(err => {
  //   console.error(err, err.stack);
  //   return { statusCode: 500, body: err };
  // });

  // return { statusCode: 201, body: '' };
};
