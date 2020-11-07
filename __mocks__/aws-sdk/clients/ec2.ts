// import { Service } from 'aws-sdk/lib/service';
export const awsSdkPromiseResponse = jest.fn().mockReturnValue(Promise.resolve(true));

const describeInstancesFn = jest.fn().mockImplementation(() => ({ promise: awsSdkPromiseResponse }));

export default class EC2 {
  public describeInstances: jest.Mock<any, any>;

  constructor() {
    this.describeInstances = describeInstancesFn;
  }
}
