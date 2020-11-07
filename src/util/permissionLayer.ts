import httpErrors from 'http-errors';
// import { Instance } from '../statics';

/**
 *
 *
 * @param config
 */
const permissionLayer = () => {
  let isAdmin: boolean;
  let authUser: string;
  // might set default options in config
  return {
    before: (handler: any, next: () => void) => {
      console.log(`permissionLayer handler ${JSON.stringify(handler)}`);
      handler.event = handler.event ?? {};
      handler.event.requestContext = handler.event.requestContext ?? {};
      handler.event.requestContext.authorizer = handler.event.requestContext.authorizer ?? {};
      handler.event.requestContext.authorizer.claims = handler.event.requestContext.authorizer.claims ?? {};
      authUser = handler.event.requestContext.authorizer.claims['cognito:username'];
      const userGroups: string = handler.event.requestContext.authorizer.claims['cognito:groups'];
      isAdmin = userGroups !== undefined && userGroups.includes('Admin');
      handler.event.queryStringParameters = handler.event.queryStringParameters ?? {};
      const queryStringParameterUserId = handler.event.queryStringParameters.userId;
      console.log('check permission');
      if (!isAdmin) {
        if (queryStringParameterUserId !== undefined && queryStringParameterUserId !== authUser) {
          console.log('throw permission error');
          throw new httpErrors.Forbidden(`User ${authUser} has no permission`);
        }
        handler.event.queryStringParameters.userId = authUser;
      }
      next();
    },
    // after: (handler: any, next: () => void) => {
    //   handler.response = handler.response ?? {};
    //   handler.response.body = handler.response.body ?? {};
    //   const bodyJSON = JSON.parse(handler.response.body);
    //   if (!isAdmin) {
    //     const bodyResult: Instance[] = [];
    //     let instances: Instance[] = bodyJSON;
    //     if (!Array.isArray(bodyJSON)) {
    //       instances = [bodyJSON];
    //     }
    //     for (const instance of instances) {
    //       if (authUser === instance.userId) {
    //         console.log(`Instance ${instance.instanceId} belongs to ${authUser}`);
    //         bodyResult.push(instance);
    //       }
    //     }
    //     if (bodyResult.length === 1) {
    //       handler.response.body = JSON.stringify(bodyResult[0]);
    //     } else if (bodyResult.length === 0) {
    //       throw new httpErrors.NotFound('not found');
    //     } else {
    //       handler.response.body = JSON.stringify(bodyResult);
    //     }
    //   }
    //   // might read options from `config`
    //   next();
    // },
  };
};

export default permissionLayer;
