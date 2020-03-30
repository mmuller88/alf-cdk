import { EC2 } from 'aws-sdk';

const ec2 = new EC2();

export const handler = async (data: any = {}): Promise<any> => {
  console.debug('insert item request: ' + JSON.stringify(data));
  var item: any = typeof data === 'object' ? data : JSON.parse(data);

  // var result: any = {};
  var runInstancesResult: any;
  var createTagsResult: any;

  const userData : any = `#!/bin/bash
    echo "Hello World"
    touch /tmp/hello.txt
    echo "sudo halt" | at now + 55 minutes
  `

  const userDataEncoded = Buffer.from(userData).toString('base64');

  var paramsEC2: EC2.Types.RunInstancesRequest = {
    ImageId: 'ami-0cb790308f7591fa6',
    InstanceType: 't2.large',
    KeyName: 'ec2dev',
    MinCount: 1,
    MaxCount: 1,
    // SecurityGroups: [groupname],
    UserData: userDataEncoded,
  };

  try{
    runInstancesResult = await ec2.runInstances(paramsEC2).promise();
    console.log("runInstancesResult: ", JSON.stringify(runInstancesResult));
    // result['status'] = 'created';
    // result['ec2data'] = data;
    // result['runInstancesResult'] = runInstancesResult;

    if(runInstancesResult.Instances && runInstancesResult.Instances[0].InstanceId){
      item['InstanceId'] = runInstancesResult.Instances[0].InstanceId;
      const tagParams: EC2.Types.CreateTagsRequest = {
        Resources: [runInstancesResult.Instances[0].InstanceId],
        Tags: [
          {
              Key: 'Name',
              Value: 'SDK Sample'
          }
      ]};

      createTagsResult = await ec2.createTags(tagParams).promise();
      console.log("createTagsResult: ", JSON.stringify(createTagsResult));
      // result['createTagsResult'] = createTagsResult;
    }
    return { statusCode: 201, item: item, runInstancesResult: runInstancesResult, createTagsResult: createTagsResult};
  } catch (error) {
    return { statusCode: 500, item: item, error: error, runInstancesResult: runInstancesResult, createTagsResult: createTagsResult};
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
