
const allowedOrigins = ['https://api-explorer.h-o.dev','https://www.h-o.dev']

export const handler = async (event: any = {}): Promise<any> => {
  console.debug("options event: " + JSON.stringify(event));
  var headers;
  if(event.headers && event.headers.origin){
    const originUrl = event.headers.origin;
    headers = {
      'Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
      'Access-Control-Allow-Origin': allowedOrigins.includes(originUrl) ? originUrl : '',
      'Access-Control-Allow-Credentials': "'false'",
      'Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
    };
  }
  return { statusCode: 200, body: '', headers: headers}
};
