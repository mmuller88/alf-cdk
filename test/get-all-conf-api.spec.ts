import { Context } from 'aws-lambda';
import { awsSdkPromiseResponse, DocumentClient } from '../__mocks__/aws-sdk/clients/dynamodb';
import { handler } from '../src/get-all-conf-api';

const db = new DocumentClient();

describe('Get all conf API', () => {
  describe('as user', () => {
    describe('with query userId', () => {
      it('from himself will success', async (done) => {
        awsSdkPromiseResponse.mockReturnValueOnce({ Items: [{ instanceId: 'i123', userId: 'martin' }] });
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
            expect(db.query).toHaveBeenCalledWith({
              TableName: 'alfInstances',
              KeyConditionExpression: '#userId = :userId',
              ExpressionAttributeNames: { '#userId': 'userId' },
              ExpressionAttributeValues: { ':userId': 'martin' },
            });
            done();
          },
        );
      });

      it('from someone else will fail', async (done) => {
        await handler(
          {
            headers: {
              'MOCK_AUTH_cognito:username': 'martin',
            },
            queryStringParameters: { userId: 'alice' },
          },
          {} as Context,
          (_, result) => {
            expect(result?.statusCode).toBe(403);
            done();
          },
        );
      });
    });

    describe('without query userId', () => {
      it('will success', async (done) => {
        awsSdkPromiseResponse.mockReturnValueOnce({ Items: [{ instanceId: 'i123', userId: 'martin' }] });
        await handler(
          {
            headers: {
              'MOCK_AUTH_cognito:username': 'martin',
            },
          },
          {} as Context,
          (_, result) => {
            expect(result?.statusCode).toBe(200);
            expect(db.query).toHaveBeenCalledWith({
              TableName: 'alfInstances',
              KeyConditionExpression: '#userId = :userId',
              ExpressionAttributeNames: { '#userId': 'userId' },
              ExpressionAttributeValues: { ':userId': 'martin' },
            });
            done();
          },
        );
      });
    });
    describe('with path instanceId', () => {
      it('from himself will success', async (done) => {
        awsSdkPromiseResponse.mockReturnValueOnce({ Items: [{ instanceId: 'i123', userId: 'martin' }] });
        await handler(
          {
            headers: {
              'MOCK_AUTH_cognito:username': 'martin',
            },
            pathParameters: 'i123',
          },
          {} as Context,
          (_, result) => {
            expect(result?.statusCode).toBe(200);
            done();
          },
        );
      });
      it('from someone else will fail', async (done) => {
        awsSdkPromiseResponse.mockReturnValueOnce({ Items: [{ instanceId: 'i123', userId: 'alice' }] });
        await handler(
          {
            headers: {
              'MOCK_AUTH_cognito:username': 'martin',
            },
            pathParameters: 'i123',
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
    describe('with query userId', () => {
      it('from himself will success', async (done) => {
        awsSdkPromiseResponse.mockReturnValueOnce({ Items: [{ instanceId: 'i123', userId: 'martin' }] });
        await handler(
          {
            headers: {
              'MOCK_AUTH_cognito:username': 'martin',
              'MOCK_AUTH_cognito:groups': 'Admin',
            },
            queryStringParameters: { userId: 'martin' },
          },
          {} as Context,
          (_, result) => {
            expect(result?.statusCode).toBe(200);
            expect(db.query).toHaveBeenCalledWith({
              TableName: 'alfInstances',
              KeyConditionExpression: '#userId = :userId',
              ExpressionAttributeNames: { '#userId': 'userId' },
              ExpressionAttributeValues: { ':userId': 'martin' },
            });
            done();
          },
        );
      });

      it('from someone else will success', async (done) => {
        awsSdkPromiseResponse.mockReturnValueOnce({ Items: [{ instanceId: 'i123', userId: 'martin' }] });
        await handler(
          {
            headers: {
              'MOCK_AUTH_cognito:username': 'martin',
              'MOCK_AUTH_cognito:groups': 'Admin',
            },
            queryStringParameters: { userId: 'alice' },
          },
          {} as Context,
          (_, result) => {
            expect(result?.statusCode).toBe(200);
            expect(db.query).toHaveBeenCalledWith({
              TableName: 'alfInstances',
              KeyConditionExpression: '#userId = :userId',
              ExpressionAttributeNames: { '#userId': 'userId' },
              ExpressionAttributeValues: { ':userId': 'alice' },
            });
            done();
          },
        );
      });
    });

    describe('without query userId', () => {
      it('will success', async (done) => {
        awsSdkPromiseResponse.mockReturnValueOnce({ Items: [{ instanceId: 'i123', userId: 'martin' }] });
        await handler(
          {
            headers: {
              'MOCK_AUTH_cognito:username': 'martin',
              'MOCK_AUTH_cognito:groups': 'Admin',
            },
          },
          {} as Context,
          (_, result) => {
            expect(result?.statusCode).toBe(200);
            expect(db.scan).toHaveBeenCalledWith({
              TableName: 'alfInstances',
            });
            done();
          },
        );
      });
    });
    describe('with path instanceId', () => {
      it('from himself will succeed', async (done) => {
        awsSdkPromiseResponse.mockReturnValueOnce({ Items: [{ instanceId: 'i123', userId: 'martin' }] });
        await handler(
          {
            headers: {
              'MOCK_AUTH_cognito:username': 'martin',
              'MOCK_AUTH_cognito:groups': 'Admin',
            },
            pathParameters: 'i123',
          },
          {} as Context,
          (_, result) => {
            expect(result?.statusCode).toBe(200);
            done();
          },
        );
      });
      it('from someone else will succeed', async (done) => {
        awsSdkPromiseResponse.mockReturnValueOnce({ Items: [{ instanceId: 'i123', userId: 'alice' }] });
        await handler(
          {
            headers: {
              'MOCK_AUTH_cognito:username': 'martin',
              'MOCK_AUTH_cognito:groups': 'Admin',
            },
            pathParameters: 'i123',
          },
          {} as Context,
          (_, result) => {
            expect(result?.statusCode).toBe(200);
            done();
          },
        );
      });
    });
  });
});
