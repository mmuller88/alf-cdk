// import { handler } from "../src/get-instances-api";
import * as AWS from 'aws-sdk';
import * as AWSMock from 'aws-sdk-mock';
// import { Context } from "aws-lambda";

beforeAll(async (done) => {
  //get requires env vars
  done();
});

it('Empty input', async() => {
  AWSMock.setSDKInstance(AWS);
  AWSMock.mock('EC2', 'describeInstances', (params: any, callback: Function) => {
    console.log('Mock describeInstances');
    console.log(params);
    console.log(callback);
    callback(null, { pk: 'foo', sk: 'bar' });
  });
  const ec2 = new AWS.EC2({ apiVersion: '2016-11-15' });
  expect(await ec2.describeInstances({

  }).promise()).toStrictEqual( { pk: 'foo', sk: 'bar' });

  // handler({}, {} as Context, (_, result) => {
  //   expect(result?.statusCode).toBe(200);
  // })

  AWSMock.restore('EC2');
});
