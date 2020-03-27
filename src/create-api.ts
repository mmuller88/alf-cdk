import { StepFunctions } from 'aws-sdk';
const AWS = require('aws-sdk');
const stepFunctions = new AWS.StepFunctions();
const { v4 : uuidv4 } = require('uuid');


const SORT_KEY = process.env.SORT_KEY || '';

// Promised based version https://stackoverflow.com/questions/49244134/starting-a-stepfunction-and-exiting-doesnt-trigger-execution

const clients = {
  stepFunctions: new StepFunctions()
}

const createExecutor = ({ clients }:any) => async (event: any) => {
  console.log('Executing media pipeline job ' + JSON.stringify(event, null, 2)  );
  console.log('Executing media pipeline job ' + JSON.stringify(clients, null, 2)  );
  const stateMachineArn = process.env.STATE_MACHINE_ARN;
  event.body[SORT_KEY] = uuidv4();
  const params = {
    stateMachineArn: stateMachineArn,
    input: JSON.stringify(event.body)
  };
  var result = await stepFunctions.startExecution(params).promise();
  result[SORT_KEY] = event.body[SORT_KEY];
  // { executionArn: "string", startDate: number }
  return result;
};

const startExecution = createExecutor({ clients });

export const handler = async (event: any = {}): Promise<any> => {

  // Pass in the event from the Lambda e.g S3 Put, SQS Message
  const result = await startExecution(event);

  var response = {
          "statusCode": 201,
          "body": JSON.stringify(result),
          "isBase64Encoded": false
      };

  return response;
}


// const AWS = require('aws-sdk');
// const stepFunctions = new AWS.StepFunctions();

// export const handler = async (event: any = {}): Promise<any> => {
//   if (!event.body) {
//     return { statusCode: 400, body: 'invalid request , you are missing the parameter body' };
//   }
//   // const item = typeof event.body == 'object' ? event.body : JSON.parse(event.body);

//   const stateMachineArn = process.env.STATE_MACHINE_ARN;

//   const startExecutionParams = {
//     stateMachineArn: stateMachineArn,
//     input: JSON.stringify(event.body),
//   };

//   console.debug('Calling startExecution with params: ' + JSON.stringify(startExecutionParams, null, 2));
//   const sfresponse = stepFunctions.startExecution(startExecutionParams).promise();

//   var response = {
//       "statusCode": 200,
//       "body": JSON.stringify(sfresponse),
//       "isBase64Encoded": false
//   };

//   return response;
// }



  // stepFunctions.startExecution(startExecutionParams, function(error, data) {
  //     if (error) {
  //         logger.error(error);
  //         let result = utils.constructAPIErrorResponse(error);
  //         logger.debug("Returning result: " + JSON.stringify(result, null, 2));
  //         callback(null, result);
  //     } else {
  //         logger.debug("startExecution result: " + JSON.stringify(data, null, 2));
  //         let responseBody = {
  //             id: clusterId
  //         };
  //         let result = utils.constructAPIResponse(responseBody, 202);
  //         logger.debug("Returning result: " + JSON.stringify(result, null, 2));
  //         callback(null, result);
  //     }
  // });

  // try {

  //   return { statusCode: 201, body: '' };
  // } catch (dbError) {
  //   const errorResponse =
  //     dbError.code === 'ValidationException' && dbError.message.includes('reserved keyword')
  //       ? DYNAMODB_EXECUTION_ERROR
  //       : RESERVED_RESPONSE;
  //   return { statusCode: 500, body: errorResponse };
  // }
// };
