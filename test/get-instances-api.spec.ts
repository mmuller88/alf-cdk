import { Context } from 'aws-lambda';
import { handler } from '../src/get-instances-api';
// import { DocumentClient } from '../__mocks__/aws-sdk/clients/dynamodb';
import EC2 from '../__mocks__/aws-sdk/clients/ec2';

const ec2 = new EC2();
//const db = new DocumentClient();

describe('Get instances API', () => {
  describe('as user', () => {
    describe('with query userId', () => {
      it('from himself will success', async (done) => {
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
            expect(ec2.describeInstances).toHaveBeenCalledWith({
              Filters: [
                { Name: 'instance-state-name', Values: ['pending', 'running', 'stopping', 'stopped'] },
                { Name: 'tag:userId', Values: ['martin'] },
              ],
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
        await handler(
          {
            headers: {
              'MOCK_AUTH_cognito:username': 'martin',
            },
          },
          {} as Context,
          (_, result) => {
            expect(result?.statusCode).toBe(200);
            expect(ec2.describeInstances).toHaveBeenCalledWith({
              Filters: [
                { Name: 'instance-state-name', Values: ['pending', 'running', 'stopping', 'stopped'] },
                { Name: 'tag:userId', Values: ['martin'] },
              ],
            });
            done();
          },
        );
      });
    });
  });
  describe('as admin', () => {
    describe('with query userId', () => {
      it('from himself will success', async (done) => {
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
            expect(ec2.describeInstances).toHaveBeenCalledWith({
              Filters: [
                { Name: 'instance-state-name', Values: ['pending', 'running', 'stopping', 'stopped'] },
                { Name: 'tag:userId', Values: ['martin'] },
              ],
            });
            done();
          },
        );
      });

      it('from someone else will success', async (done) => {
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
            expect(ec2.describeInstances).toHaveBeenCalledWith({
              Filters: [
                { Name: 'instance-state-name', Values: ['pending', 'running', 'stopping', 'stopped'] },
                { Name: 'tag:userId', Values: ['alice'] },
              ],
            });
            done();
          },
        );
      });
    });

    describe('without query userId', () => {
      it('will success', async (done) => {
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
            expect(ec2.describeInstances).toHaveBeenCalledWith({
              Filters: [{ Name: 'instance-state-name', Values: ['pending', 'running', 'stopping', 'stopped'] }],
            });
            done();
          },
        );
      });
    });
  });
});
