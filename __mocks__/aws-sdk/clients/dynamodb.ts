export const awsSdkPromiseResponse = jest.fn().mockReturnValue(Promise.resolve(true));

const queryFn = jest.fn().mockImplementation(() => ({ promise: awsSdkPromiseResponse }));
const scanFn = jest.fn().mockImplementation(() => ({ promise: awsSdkPromiseResponse }));
const getFn = jest.fn().mockImplementation(() => ({ promise: awsSdkPromiseResponse }));
const putFn = jest.fn().mockImplementation(() => ({ promise: awsSdkPromiseResponse }));

export class DocumentClient {
  query = queryFn;
  scan = scanFn;
  get = getFn;
  put = putFn;
}
