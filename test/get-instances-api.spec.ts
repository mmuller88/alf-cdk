import { Context } from 'aws-lambda';
import EC2, { awsSdkPromiseResponse } from '../__mocks__/aws-sdk/clients/ec2';
import { handler } from '../src/get-instances-api';
// import { DocumentClient } from '../__mocks__/aws-sdk/clients/dynamodb';

const ec2 = new EC2();
//const db = new DocumentClient();

const i123 = {
  State: { Name: 'running' },
  PublicDnsName: 'http://blub.de',
  Tags: [
    { Key: 'instanceId', Value: 'i123' },
    { Key: 'userId', Value: 'martin' },
    { Key: 'ec2InstanceType', Value: 't2.large' },
    { Key: 'gitRepo', Value: 'alf-ec2-1' },
  ],
};

describe('Get instances API', () => {
  describe('as user', () => {
    describe('with query userId', () => {
      it('from himself will success', async (done) => {
        awsSdkPromiseResponse.mockReturnValueOnce({ Reservations: [{ Instances: [i123] }] });
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
        awsSdkPromiseResponse.mockReturnValueOnce({ Reservations: [{ Instances: [i123] }] });
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

    describe('with path instanceId', () => {
      it('from himself will success', async (done) => {
        const ec2Instances = [
          {
            State: { Name: 'running' },
            PublicDnsName: 'http://blub.de',
            Tags: [
              { Key: 'instanceId', Value: 'i123' },
              { Key: 'userId', Value: 'martin' },
              { Key: 'ec2InstanceType', Value: 't2.large' },
              { Key: 'gitRepo', Value: 'alf-ec2-1' },
            ],
          },
        ];
        awsSdkPromiseResponse.mockReturnValueOnce({ Reservations: [{ Instances: ec2Instances }] });
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
    });
    it('from someone else will fail', async (done) => {
      const ec2Instances = [
        {
          State: { Name: 'running' },
          PublicDnsName: 'http://blub.de',
          Tags: [
            { Key: 'instanceId', Value: 'i123' },
            { Key: 'userId', Value: 'alice' },
            { Key: 'ec2InstanceType', Value: 't2.large' },
            { Key: 'gitRepo', Value: 'alf-ec2-1' },
          ],
        },
      ];
      awsSdkPromiseResponse.mockReturnValueOnce({ Reservations: [{ Instances: ec2Instances }] });
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
    describe('with path instanceId', () => {
      it('from himself will success', async (done) => {
        const ec2Instances = [
          {
            State: { Name: 'running' },
            PublicDnsName: 'http://blub.de',
            Tags: [
              { Key: 'instanceId', Value: 'i123' },
              { Key: 'userId', Value: 'martin' },
              { Key: 'ec2InstanceType', Value: 't2.large' },
              { Key: 'gitRepo', Value: 'alf-ec2-1' },
            ],
          },
        ];
        awsSdkPromiseResponse.mockReturnValueOnce({ Reservations: [{ Instances: ec2Instances }] });
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
    it('from someone else will fail', async (done) => {
      const ec2Instances = [
        {
          State: { Name: 'running' },
          PublicDnsName: 'http://blub.de',
          Tags: [
            { Key: 'instanceId', Value: 'i123' },
            { Key: 'userId', Value: 'alice' },
            { Key: 'ec2InstanceType', Value: 't2.large' },
            { Key: 'gitRepo', Value: 'alf-ec2-1' },
          ],
        },
      ];
      awsSdkPromiseResponse.mockReturnValueOnce({ Reservations: [{ Instances: ec2Instances }] });
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
