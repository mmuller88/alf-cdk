import httpErrors from 'http-errors';

/**
 *
 *
 * @param config
 */
const permissionLayer = () => {
  // might set default options in config
  return {
    before: (handler: any, next: () => void) => {
      console.log(`permissionLayer handler ${JSON.stringify(handler)}`);
      handler.event = handler.event ?? {};
      handler.event.requestContext = handler.event.requestContext ?? {};
      handler.event.requestContext.authorizer = handler.event.requestContext.authorizer ?? {};
      handler.event.requestContext.authorizer.claims = handler.event.requestContext.authorizer.claims ?? {};
      const authUser = handler.event.requestContext.authorizer.claims['cognito:username'];
      const userGroups: string = handler.event.requestContext.authorizer.claims['cognito:groups'];
      const isAdmin = userGroups && userGroups.includes('Admin');
      handler.event.queryStringParameters = handler.event.queryStringParameters ?? {};
      const queryStringParameterUserId = handler.event.queryStringParameters.userId;
      console.log('check permission');
      if (!isAdmin) {
        if (queryStringParameterUserId != undefined && queryStringParameterUserId !== authUser) {
          console.log('throw permission error');
          throw new httpErrors.Forbidden(`User ${authUser} has no permission`);
        }
        handler.event.queryStringParameters.userId = authUser;
      }

      next();
    },
  };
};

export default permissionLayer;
