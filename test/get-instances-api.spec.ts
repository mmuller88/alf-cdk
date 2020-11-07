import { Context } from 'aws-lambda';
import { handler } from '../src/get-instances-api';
// import { DocumentClient } from '../__mocks__/aws-sdk/clients/dynamodb';
import EC2 from '../__mocks__/aws-sdk/clients/ec2';

const ec2 = new EC2();
//const db = new DocumentClient();

describe('Get instances API', () => {
  describe('as user', () => {
    it('Empty input', async (done) => {
      // awsSdkPromiseResponse.mockReturnValue({});

      await handler(
        {
          headers: {
            'MOCK_AUTH_cognito:username': 'martin',
          },
          queryStringParameters: { userId: 'martin' },
        },
        {} as Context,
        (_, result) => {
          expect(result?.statusCode).toBe(200);
          expect(ec2.describeInstances).toHaveBeenCalled();
          done();
        },
      );

      //console.log(`blubbb: ${JSON.stringify(result)}`);
      // expect(result.statusCode).toBe(200);

      // done();

      //   it('No userId in Path', async (done) => {
      //     await handler(
      //       {
      //         queryStringParameters: { userId: 'alice' },
      //       },
      //       {} as Context,
      //       async (error, result) => {
      //         if (error) {
      //           console.log(error);
      //         }
      //         expect(result?.statusCode).toBe(200);
      //         done();
      //       },
      //     );
      //   });

      //   it('userId in Path', async (done) => {
      //     await handler(
      //       {
      //         pathParameters: { alfInstanceId: 'nowhere' },
      //         queryStringParameters: { userId: 'alice' },
      //       },
      //       {} as Context,
      //       async (error, result) => {
      //         if (error) {
      //           console.log(error);
      //         }
      //         expect(result?.statusCode).toBe(403);
      //         done();
      //       },
      //     );
      //   });

      //   it('mock user Auth allow', async (done) => {
      //     await handler(
      //       {
      //         headers: {
      //           'MOCK_AUTH_cognito:username': 'martin',
      //           normalHeader: 'bla',
      //         },
      //         queryStringParameters: { userId: 'martin' },
      //       },
      //       {} as Context,
      //       async (error, result) => {
      //         if (error) {
      //           console.log(error);
      //         }
      //         console.log(`result = ${JSON.stringify(result)}`);
      //         expect(result?.statusCode).toBe(200);
      //         done();
      //       },
      //     );
      //   });

      //   it('mock user Auth forbidden', async (done) => {
      //     await handler(
      //       {
      //         headers: {
      //           'MOCK_AUTH_cognito:username': 'martin',
      //         },
      //         queryStringParameters: { userId: 'alice' },
      //       },
      //       {} as Context,
      //       async (error, result) => {
      //         if (error) {
      //           console.log(error);
      //         }
      //         console.log(`result = ${JSON.stringify(result)}`);
      //         expect(result?.statusCode).toBe(403);
      //         done();
      //       },
      //     );
      //   });
      // });

      // describe('as admin', () => {
      //   it('mock admin user Auth', async (done) => {
      //     await handler(
      //       {
      //         headers: {
      //           'MOCK_AUTH_cognito:username': 'martin',
      //           'MOCK_AUTH_cognito:groups': 'Admin',
      //         },
      //         queryStringParameters: { userId: 'alice' },
      //       },
      //       {} as Context,
      //       async (error, result) => {
      //         if (error) {
      //           console.log(error);
      //         }
      //         console.log(`result = ${JSON.stringify(result)}`);
      //         expect(result?.statusCode).toBe(200);
      //         done();
      //       },
      // );
    });
  });
});
