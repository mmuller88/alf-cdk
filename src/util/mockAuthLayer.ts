export interface MockAuthLayerConfig {
  mockHeaderPrefix: string;
}

/**
 * Lifts the mocked auth header e.g. event.headers.MOCK_AUTH_cognito:username to
 * requestContext.authorizer.claims.cognito:username
 *
 * @param config
 */
const mockAuthLayer = (config?: MockAuthLayerConfig) => {
  // might set default options in config
  return {
    before: (handler: any, next: () => void) => {
      // console.log(`show handler ${JSON.stringify(handler)}`);
      // console.log(`show config ${JSON.stringify(config)}`);
      handler.event = handler.event ?? {};
      handler.event.headers = handler.event.headers ?? {};
      const mockHeaderPrefix = config?.mockHeaderPrefix || 'MOCK_AUTH_';
      Object.keys(handler.event.headers)
        .filter((headerKey) => {
          return headerKey.startsWith(mockHeaderPrefix);
        })
        .forEach((headerKey) => {
          const headerValue = handler.event.headers[headerKey] || 'martin';
          // console.log(`got mock header ${headerValue}`);
          handler.event.requestContext = handler.event.requestContext ?? {};
          handler.event.requestContext.authorizer = handler.event.requestContext.authorizer ?? {};
          handler.event.requestContext.authorizer.claims = handler.event.requestContext.authorizer.claims ?? {};
          handler.event.requestContext.authorizer.claims[
            headerKey.substring(mockHeaderPrefix.length).replace(/&/g, ':')
          ] = headerValue;
          console.log(`shifted header ${JSON.stringify(handler)}`);
        });
      next();
    },
    // after: (handler, next) => {
    //   // might read options from `config`
    // },
    // onError: (handler, next) => {
    //   // might read options from `config`
    // },
  };
};

export default mockAuthLayer;
