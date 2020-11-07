import { Context } from 'aws-lambda'; // eslint-disable-line import/no-extraneous-dependencies
import { awsSdkPromiseResponse } from '../__mocks__/aws-sdk/clients/dynamodb';
import { handler } from '../src/update-api';

describe('Update conf API', () => {
  describe('as user', () => {
    describe('with path instanceId', () => {
      it('from himself will success', async (done) => {
        awsSdkPromiseResponse.mockReturnValueOnce({ Item: { instanceId: 'i123', userId: 'martin' } });
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
            pathParameters: { instanceId: 'i123' },
          },
          {} as Context,
          (_, result) => {
            expect(result?.statusCode).toBe(200);
            expect(JSON.parse(result?.body || '{}').userId).toBe('martin');
            done();
          },
        );
      });

      it('with non existing instanceId will fail', async (done) => {
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
            pathParameters: { instanceId: 'i123' },
          },
          {} as Context,
          (_, result) => {
            expect(result?.statusCode).toBe(404);
            done();
          },
        );
      });
    });
  });
  describe('as admin', () => {
    describe('with path instanceId', () => {
      it('from himself will succeed', async (done) => {
        awsSdkPromiseResponse.mockReturnValueOnce({ Item: { instanceId: 'i123', userId: 'martin' } });
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
            pathParameters: { instanceId: 'i123' },
          },
          {} as Context,
          (_, result) => {
            expect(result?.statusCode).toBe(200);
            expect(JSON.parse(result?.body || '{}').userId).toBe('martin');
            done();
          },
        );
      });

      it('from someone else will success', async (done) => {
        awsSdkPromiseResponse.mockReturnValueOnce({ Item: { instanceId: 'i123', userId: 'alice' } });
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
            pathParameters: { instanceId: 'i123' },
          },
          {} as Context,
          (_, result) => {
            expect(result?.statusCode).toBe(200);
            expect(JSON.parse(result?.body || '{}').userId).toBe('alice');
            done();
          },
        );
      });
    });
  });
});
