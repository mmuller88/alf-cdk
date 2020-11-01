import { InterceptorInterface } from './InterceptorInterface';

export class ABInterceptor extends InterceptorInterface {

  constructor(interceptorName: string) {
    super(interceptorName);
  };

  intercept(event: any, response: any): boolean {
    console.debug(`Interceptor: ${this.interceptorName} event: ${JSON.stringify(event)}`);
    console.debug(`Interceptor: ${this.interceptorName} response: ${JSON.stringify(response)}`);
    response.a = 'b';
    return true;
  }
}
