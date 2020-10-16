
const allowedOrigins = [
  'https://api-explorer.alfpro.net',
  'https://api.alfpro.net',
  'https://app.alfpro.net',
  'https://www.alfpro.net',
  'https://api-explorer.dev.alfpro.net',
  'https://api.dev.alfpro.net',
  'https://app.dev.alfpro.net',
  'https://www.alfpro.net',
  'http://localhost:3000']

export const handler = async (event: any = {}): Promise<any> => {
  console.debug("options event: " + JSON.stringify(event));
  let headers;
  if(event.headers && event.headers.origin){
    const originUrl = event.headers.origin;
    headers = {
      'Access-Control-Allow-Headers': "'Origin,Accept,Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
      'Access-Control-Allow-Origin': allowedOrigins.includes(originUrl) ? originUrl : '',
      'Access-Control-Allow-Credentials': "'false'",
      'Access-Control-Allow-Methods': 'OPTIONS,GET,PUT,POST,DELETE',
    };
  }
  return { statusCode: 200, body: '', headers}
};
