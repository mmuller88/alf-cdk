import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpErrorHandler from '@middy/http-error-handler';
import inputOutputLogger from '@middy/input-output-logger';
import StepFunctions from 'aws-sdk/clients/stepfunctions'; // eslint-disable-line import/no-extraneous-dependencies
import { v4 as uuidv4 } from 'uuid';
import { InstanceItem, InstanceStatus, Ec2InstanceType, GitRepo } from './statics';
import mockAuthLayer from './util/mockAuthLayer';
import permissionLayer from './util/permissionLayer';

const stepFunctions = new StepFunctions();

const STATE_MACHINE_ARN: string = process.env.STATE_MACHINE_ARN || '';
const MOCK_AUTH = process.env.MOCK_AUTH || '';

// Promised based version https://stackoverflow.com/questions/49244134/starting-a-stepfunction-and-exiting-doesnt-trigger-execution

const stepFunctionsClients = {
  stepFunctions: new StepFunctions(),
};

const createExecutor = ({ clients }: any) => async (item: InstanceItem) => {
  console.log('create-api: Step Function item: ' + JSON.stringify(item));
  console.log('create-api: Step Function clients: ' + JSON.stringify(clients));

  var id: string = uuidv4();
  id = id.substring(0, 4);
  item.instanceId = `i${id}`;

  // Defaults
  item.expectedStatus = InstanceStatus.running;
  item.alfType = item.alfType ? item.alfType : { ec2InstanceType: Ec2InstanceType.t2large, gitRepo: GitRepo.alfec21 };
  if (!item.tags) {
    item.tags = { name: 'No Name' };
  } else {
    if (!item.tags.name) {
      item.tags.name = 'No Name';
    }
  }

  const params = {
    stateMachineArn: STATE_MACHINE_ARN,
    input: JSON.stringify(item),
  };
  await stepFunctions.startExecution(params).promise();
  console.log('here');
  return item;
};

const startExecution = createExecutor({ stepFunctionsClients });

export const handler = middy(async (event: any) => {
  // export const handler = async (event: any) => {
  console.debug('create-api event: ' + JSON.stringify(event));
  let item: InstanceItem = typeof event.body === 'object' ? event.body : JSON.parse(event.body);

  const executionResult = await startExecution(item);

  return { statusCode: 201, body: JSON.stringify(executionResult), isBase64Encoded: false };
});

const onionHandler = handler;
if (MOCK_AUTH === 'true') {
  onionHandler.use(mockAuthLayer());
}
onionHandler
  .use(inputOutputLogger())
  .use(httpErrorHandler())
  .use(
    cors({
      origin: '*',
    }),
  )
  .use(permissionLayer());
