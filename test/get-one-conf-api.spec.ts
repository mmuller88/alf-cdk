import { Context } from 'aws-lambda';
import { awsSdkPromiseResponse, DocumentClient } from '../__mocks__/aws-sdk/clients/dynamodb';
import { handler } from '../src/get-one-conf-api';

const db = new DocumentClient();

describe('Get one conf API', () => {
  describe('as user', () => {
    describe('with path instanceId', () => {
      it('from himself will success', async (done) => {
        awsSdkPromiseResponse.mockReturnValueOnce({ Item: { instanceId: 'i123', userId: 'martin' } });
        await handler(
          {
            headers: {
              'MOCK_AUTH_cognito:username': 'martin',
            },
            pathParameters: { instanceId: 'i123' },
            queryStringParameters: { userId: 'martin' },
          },
          {} as Context,
          (_, response) => {
            expect(response?.statusCode).toBe(200);
            expect(db.get).toHaveBeenCalledWith({
              TableName: 'alfInstances',
              Key: { instanceId: 'i123', userId: 'martin' },
            });
            done();
          },
        );
      });

      it('from someone else will fail', async (done) => {
        awsSdkPromiseResponse.mockReturnValueOnce({ Item: { instanceId: 'i123', userId: 'alice' } });
        await handler(
          {
            headers: {
              'MOCK_AUTH_cognito:username': 'martin',
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
      it('from himself will success', async (done) => {
        awsSdkPromiseResponse.mockReturnValueOnce({ Item: { instanceId: 'i123', userId: 'martin' } });
        await handler(
          {
            headers: {
              'MOCK_AUTH_cognito:username': 'martin',
              'MOCK_AUTH_cognito:groups': 'Admin',
            },
            pathParameters: { instanceId: 'i123' },
          },
          {} as Context,
          (_, result) => {
            expect(result?.statusCode).toBe(200);
            expect(db.get).toHaveBeenCalledWith({ TableName: 'alfInstances', Key: { instanceId: 'i123' } });
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
            pathParameters: { instanceId: 'i123' },
          },
          {} as Context,
          (_, result) => {
            expect(result?.statusCode).toBe(200);
            expect(db.get).toHaveBeenCalledWith({ TableName: 'alfInstances', Key: { instanceId: 'i123' } });
            done();
          }, // eslint-disable-line import/no-extraneous-dependencies
        );
      });
    });
  });
});
