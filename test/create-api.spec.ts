import { Context } from 'aws-lambda';
import { handler } from '../src/create-api';

describe('Create instance API', () => {
  describe('as user', () => {
    it('will succeed', async (done) => {
      // StepFunctions;
      // awsSdkPromiseResponse.mockReturnValueOnce({});
      await handler(
        {
          headers: {
            'MOCK_AUTH_cognito:username': 'martin',
          },
          body: {
            userId: 'alice',
            ec2InstanceType: 't2.large',
            gitRepo: 'alf-ec-2',
          },
        },
        {} as Context,
        (_, result) => {
          expect(result?.statusCode).toBe(201);
          expect(JSON.parse(result?.body || '{}').userId).toBe('martin');
          done();
        },
      );
    });
  });
  describe('as admin', () => {
    it('for himself will succeed', async (done) => {
      await handler(
        {
          headers: {
            'MOCK_AUTH_cognito:username': 'martin',
            'MOCK_AUTH_cognito:groups': 'Admin',
          },
          body: {
            userId: 'martin',
            ec2InstanceType: 't2.large',
            gitRepo: 'alf-ec-2',
          },
        },
        {} as Context,
        (_, result) => {
          expect(result?.statusCode).toBe(201);
          expect(JSON.parse(result?.body || '{}').userId).toBe('martin');
          done();
        },
      );
    });

    it('for someone else will succeed', async (done) => {
      await handler(
        {
          headers: {
            'MOCK_AUTH_cognito:username': 'martin',
            'MOCK_AUTH_cognito:groups': 'Admin',
          },
          body: {
            userId: 'alice',
            ec2InstanceType: 't2.large',
            gitRepo: 'alf-ec-2',
          },
        },
        {} as Context,
        (_, result) => {
          expect(result?.statusCode).toBe(201);
          expect(JSON.parse(result?.body || '{}').userId).toBe('alice');
          done();
        },
      );
    });
  });
});
