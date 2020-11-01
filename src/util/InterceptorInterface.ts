export abstract class InterceptorInterface {
  interceptorName: string;
  constructor(interceptorName: string) {
    this.interceptorName=interceptorName;
  }
  abstract intercept(event: any, response: any): boolean;
}
