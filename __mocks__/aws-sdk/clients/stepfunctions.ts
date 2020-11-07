// import { Service } from 'aws-sdk/lib/service';
export const awsSdkPromiseResponse = jest.fn().mockReturnValue(Promise.resolve(true));

const startExecutionFn = jest.fn().mockImplementation(() => ({ promise: awsSdkPromiseResponse }));

export default class StepFunctions {
  public startExecution: jest.Mock<any, any>;

  constructor() {
    this.startExecution = startExecutionFn;
  }
}
