const AWS = require('aws-sdk');
const stepFunctions = new AWS.StepFunctions();

export const handler = async (event: any = {}): Promise<any> => {
  if (!event.body) {
    return { statusCode: 400, body: 'invalid request , you are missing the parameter body' };
  }
  // const item = typeof event.body == 'object' ? event.body : JSON.parse(event.body);

  const stateMachineArn = process.env.STATE_MACHINE_ARN;

  const startExecutionParams = {
    stateMachineArn: stateMachineArn,
    input: event.bod,
  };

  console.debug('Calling startExecution with params: ' + JSON.stringify(startExecutionParams, null, 2));
  stepFunctions.startExecution(
    startExecutionParams,
    async (data: any = {}): Promise<any> => {
      console.debug('startExecution result: ' + JSON.stringify(data, null, 2));
      // let responseBody = {
      //     id: item
      // };
      // let result = utils.constructAPIResponse(responseBody, 202);
      // console.debug("Returning result: " + JSON.stringify(result, null, 2));

      const response = {
        statusCode: '202',
        headers: {},
        body: event.body,
      };

      console.debug('Returning result: ' + JSON.stringify(response, null, 2));
      return response;
    },
  );

  return { statusCode: 201, body: '' };

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
};
