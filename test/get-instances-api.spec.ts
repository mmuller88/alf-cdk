import { Context } from 'aws-lambda';
import { handler } from '../src/get-instances-api';
// import AWS from 'aws-sdk';
// import AWSMock from 'aws-sdk-mock';

beforeAll(async (done) => {
  //get requires env vars
  done();
});

describe('Get instances API', () => {
  describe('as user', () => {
    it('Empty input', async (done) => {
      // AWSMock.setSDKInstance(AWS);
      // AWSMock.mock('EC2', 'describeInstances', (params: any, callback: Function) => {
      //   console.log('Mock describeInstances');
      //   console.log(`params: ${params}`);
      //   console.log(callback);
      //   callback(null, { Reservations: [1, 2, 3, 4] });
      // });

      //const ec2 = new AWS.EC2({ apiVersion: '2016-11-15' });
      //expect(await ec2.describeInstances({}).promise()).toStrictEqual({ pk: 'foo', sk: 'bar' });

      handler(
        {
          headers: {
            'MOCK_AUTH_cognito:username': 'martin',
          },
          queryStringParameters: { userId: 'martin' },
        },
        {} as Context,
        (_, result) => {
          expect(result?.statusCode).toBe(200);
          done();
        },
      );

      // AWSMock.restore('EC2');
    });

    it('No userId in Path', async (done) => {
      await handler(
        {
          queryStringParameters: { userId: 'alice' },
        },
        {} as Context,
        async (error, result) => {
          if (error) {
            console.log(error);
          }
          expect(result?.statusCode).toBe(200);
          done();
        },
      );
    });

    it('userId in Path', async (done) => {
      await handler(
        {
          pathParameters: { alfInstanceId: 'nowhere' },
          queryStringParameters: { userId: 'alice' },
        },
        {} as Context,
        async (error, result) => {
          if (error) {
            console.log(error);
          }
          expect(result?.statusCode).toBe(403);
          done();
        },
      );
    });

    it('mock user Auth allow', async (done) => {
      await handler(
        {
          headers: {
            'MOCK_AUTH_cognito:username': 'martin',
            normalHeader: 'bla',
          },
          queryStringParameters: { userId: 'martin' },
        },
        {} as Context,
        async (error, result) => {
          if (error) {
            console.log(error);
          }
          console.log(`result = ${JSON.stringify(result)}`);
          expect(result?.statusCode).toBe(200);
          done();
        },
      );
    });

    it('mock user Auth forbidden', async (done) => {
      await handler(
        {
          headers: {
            'MOCK_AUTH_cognito:username': 'martin',
          },
          queryStringParameters: { userId: 'alice' },
        },
        {} as Context,
        async (error, result) => {
          if (error) {
            console.log(error);
          }
          console.log(`result = ${JSON.stringify(result)}`);
          expect(result?.statusCode).toBe(403);
          done();
        },
      );
    });
  });

  describe('as admin', () => {
    it('mock admin user Auth', async (done) => {
      await handler(
        {
          headers: {
            'MOCK_AUTH_cognito:username': 'martin',
            'MOCK_AUTH_cognito:groups': 'Admin',
          },
          queryStringParameters: { userId: 'alice' },
        },
        {} as Context,
        async (error, result) => {
          if (error) {
            console.log(error);
          }
          console.log(`result = ${JSON.stringify(result)}`);
          expect(result?.statusCode).toBe(200);
          done();
        },
      );
    });
  });
});
