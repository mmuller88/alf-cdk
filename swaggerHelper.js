"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lambda = require("@aws-cdk/aws-lambda");
const aws_apigateway_1 = require("@aws-cdk/aws-apigateway");
function convertSwaggerToCdkRestApi(scope, apiGateway, swaggerApi) {
    let createdLambdas = new Map();
    let paths = Object.keys(swaggerApi.paths);
    paths.forEach(pathName => {
        const resource = apiGateway.root.resourceForPath(pathName);
        const methods = Object.keys(swaggerApi.paths[pathName]);
        methods.forEach(methodName => {
            let endpoint = swaggerApi.paths[pathName][methodName];
            let backingLambda;
            if (createdLambdas.has(endpoint["x-cdk-lambda-name"]) === false) {
                createdLambdas.set(endpoint["x-cdk-lambda-name"], new lambda.Function(scope, endpoint["x-cdk-lambda-name"], {
                    code: lambda.Code.asset(endpoint["x-cdk-lambda-code"]),
                    handler: endpoint["x-cdk-lambda-handler"],
                    runtime: lambda.Runtime.NODEJS_10_X
                }));
            }
            backingLambda = createdLambdas.get(endpoint["x-cdk-lambda-name"]);
            let integrationParameters = undefined;
            let methodParameters = undefined;
            if (endpoint.parameters && endpoint.parameters.length) {
                let parameters = endpoint.parameters;
                integrationParameters = {};
                methodParameters = {};
                parameters.forEach(swaggerParameter => {
                    integrationParameters[`integration.request.${swaggerParameter.in}.${swaggerParameter.name}`] = `method.request.${swaggerParameter.in}.${swaggerParameter.name}`;
                    methodParameters[`method.request.${swaggerParameter.in}.${swaggerParameter.name}`] = true;
                });
            }
            resource.addMethod(methodName, new aws_apigateway_1.LambdaIntegration(backingLambda, {
                requestParameters: integrationParameters
            }), {
                requestParameters: methodParameters
            });
        });
    });
}
exports.default = convertSwaggerToCdkRestApi;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3dhZ2dlckhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInN3YWdnZXJIZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFFQSw4Q0FBOEM7QUFDOUMsNERBQTREO0FBRTVELFNBQXdCLDBCQUEwQixDQUFDLEtBQW1CLEVBQUUsVUFBNkIsRUFBRSxVQUFlO0lBRXBILElBQUksY0FBYyxHQUFnQyxJQUFJLEdBQUcsRUFBMkIsQ0FBQztJQUNyRixJQUFJLEtBQUssR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUUxQyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1FBQ3ZCLE1BQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzNELE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBRXhELE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDM0IsSUFBSSxRQUFRLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUN0RCxJQUFJLGFBQThCLENBQUM7WUFFbkMsSUFBSSxjQUFjLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLEtBQUssS0FBSyxFQUFFO2dCQUMvRCxjQUFjLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxFQUM5QyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFO29CQUN4RCxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLENBQUM7b0JBQ3RELE9BQU8sRUFBRSxRQUFRLENBQUMsc0JBQXNCLENBQUM7b0JBQ3pDLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7aUJBQ3BDLENBQUMsQ0FDSCxDQUFDO2FBQ0g7WUFFRCxhQUFhLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsQ0FBRSxDQUFDO1lBRW5FLElBQUkscUJBQXFCLEdBQU8sU0FBUyxDQUFDO1lBQzFDLElBQUksZ0JBQWdCLEdBQU8sU0FBUyxDQUFDO1lBRXJDLElBQUksUUFBUSxDQUFDLFVBQVUsSUFBSSxRQUFRLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRTtnQkFDckQsSUFBSSxVQUFVLEdBQVMsUUFBUSxDQUFDLFVBQVUsQ0FBQztnQkFDM0MscUJBQXFCLEdBQUcsRUFBRSxDQUFDO2dCQUMzQixnQkFBZ0IsR0FBRyxFQUFFLENBQUM7Z0JBRXRCLFVBQVUsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtvQkFDcEMscUJBQXFCLENBQUMsdUJBQXVCLGdCQUFnQixDQUFDLEVBQUUsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLGtCQUFrQixnQkFBZ0IsQ0FBQyxFQUFFLElBQUksZ0JBQWdCLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ2hLLGdCQUFnQixDQUFDLGtCQUFrQixnQkFBZ0IsQ0FBQyxFQUFFLElBQUksZ0JBQWdCLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUM7Z0JBQzVGLENBQUMsQ0FBQyxDQUFDO2FBQ0o7WUFFRCxRQUFRLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFDM0IsSUFBSSxrQ0FBaUIsQ0FBQyxhQUFhLEVBQUU7Z0JBQ25DLGlCQUFpQixFQUFFLHFCQUFxQjthQUN6QyxDQUFDLEVBQ0Y7Z0JBQ0UsaUJBQWlCLEVBQUUsZ0JBQWdCO2FBQ3BDLENBQUMsQ0FBQztRQUNQLENBQUMsQ0FBQyxDQUFDO0lBRUwsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBakRELDZDQWlEQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdAYXdzLWNkay9jb3JlJztcclxuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdAYXdzLWNkay9hd3MtYXBpZ2F0ZXdheSc7XHJcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdAYXdzLWNkay9hd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgTGFtYmRhSW50ZWdyYXRpb24gfSBmcm9tIFwiQGF3cy1jZGsvYXdzLWFwaWdhdGV3YXlcIjtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbnZlcnRTd2FnZ2VyVG9DZGtSZXN0QXBpKHNjb3BlOmNkay5Db25zdHJ1Y3QsIGFwaUdhdGV3YXk6YXBpZ2F0ZXdheS5SZXN0QXBpLCBzd2FnZ2VyQXBpOiBhbnkpIHtcclxuXHJcbiAgbGV0IGNyZWF0ZWRMYW1iZGFzOk1hcDxzdHJpbmcsIGxhbWJkYS5GdW5jdGlvbj4gPSBuZXcgTWFwPHN0cmluZywgbGFtYmRhLkZ1bmN0aW9uPigpO1xyXG4gIGxldCBwYXRocyA9IE9iamVjdC5rZXlzKHN3YWdnZXJBcGkucGF0aHMpO1xyXG5cclxuICBwYXRocy5mb3JFYWNoKHBhdGhOYW1lID0+IHtcclxuICAgIGNvbnN0IHJlc291cmNlID0gYXBpR2F0ZXdheS5yb290LnJlc291cmNlRm9yUGF0aChwYXRoTmFtZSk7XHJcbiAgICBjb25zdCBtZXRob2RzID0gT2JqZWN0LmtleXMoc3dhZ2dlckFwaS5wYXRoc1twYXRoTmFtZV0pO1xyXG5cclxuICAgIG1ldGhvZHMuZm9yRWFjaChtZXRob2ROYW1lID0+IHtcclxuICAgICAgbGV0IGVuZHBvaW50ID0gc3dhZ2dlckFwaS5wYXRoc1twYXRoTmFtZV1bbWV0aG9kTmFtZV07XHJcbiAgICAgIGxldCBiYWNraW5nTGFtYmRhOiBsYW1iZGEuRnVuY3Rpb247XHJcblxyXG4gICAgICBpZiAoY3JlYXRlZExhbWJkYXMuaGFzKGVuZHBvaW50W1wieC1jZGstbGFtYmRhLW5hbWVcIl0pID09PSBmYWxzZSkge1xyXG4gICAgICAgIGNyZWF0ZWRMYW1iZGFzLnNldChlbmRwb2ludFtcIngtY2RrLWxhbWJkYS1uYW1lXCJdLFxyXG4gICAgICAgICAgbmV3IGxhbWJkYS5GdW5jdGlvbihzY29wZSwgZW5kcG9pbnRbXCJ4LWNkay1sYW1iZGEtbmFtZVwiXSwge1xyXG4gICAgICAgICAgICBjb2RlOiBsYW1iZGEuQ29kZS5hc3NldChlbmRwb2ludFtcIngtY2RrLWxhbWJkYS1jb2RlXCJdKSxcclxuICAgICAgICAgICAgaGFuZGxlcjogZW5kcG9pbnRbXCJ4LWNkay1sYW1iZGEtaGFuZGxlclwiXSxcclxuICAgICAgICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzEwX1hcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgYmFja2luZ0xhbWJkYSA9IGNyZWF0ZWRMYW1iZGFzLmdldChlbmRwb2ludFtcIngtY2RrLWxhbWJkYS1uYW1lXCJdKSE7XHJcblxyXG4gICAgICBsZXQgaW50ZWdyYXRpb25QYXJhbWV0ZXJzOmFueSA9IHVuZGVmaW5lZDtcclxuICAgICAgbGV0IG1ldGhvZFBhcmFtZXRlcnM6YW55ID0gdW5kZWZpbmVkO1xyXG5cclxuICAgICAgaWYgKGVuZHBvaW50LnBhcmFtZXRlcnMgJiYgZW5kcG9pbnQucGFyYW1ldGVycy5sZW5ndGgpIHtcclxuICAgICAgICBsZXQgcGFyYW1ldGVyczphbnlbXSA9IGVuZHBvaW50LnBhcmFtZXRlcnM7XHJcbiAgICAgICAgaW50ZWdyYXRpb25QYXJhbWV0ZXJzID0ge307XHJcbiAgICAgICAgbWV0aG9kUGFyYW1ldGVycyA9IHt9O1xyXG5cclxuICAgICAgICBwYXJhbWV0ZXJzLmZvckVhY2goc3dhZ2dlclBhcmFtZXRlciA9PiB7XHJcbiAgICAgICAgICBpbnRlZ3JhdGlvblBhcmFtZXRlcnNbYGludGVncmF0aW9uLnJlcXVlc3QuJHtzd2FnZ2VyUGFyYW1ldGVyLmlufS4ke3N3YWdnZXJQYXJhbWV0ZXIubmFtZX1gXSA9IGBtZXRob2QucmVxdWVzdC4ke3N3YWdnZXJQYXJhbWV0ZXIuaW59LiR7c3dhZ2dlclBhcmFtZXRlci5uYW1lfWA7XHJcbiAgICAgICAgICBtZXRob2RQYXJhbWV0ZXJzW2BtZXRob2QucmVxdWVzdC4ke3N3YWdnZXJQYXJhbWV0ZXIuaW59LiR7c3dhZ2dlclBhcmFtZXRlci5uYW1lfWBdID0gdHJ1ZTtcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmVzb3VyY2UuYWRkTWV0aG9kKG1ldGhvZE5hbWUsXHJcbiAgICAgICAgbmV3IExhbWJkYUludGVncmF0aW9uKGJhY2tpbmdMYW1iZGEsIHtcclxuICAgICAgICAgIHJlcXVlc3RQYXJhbWV0ZXJzOiBpbnRlZ3JhdGlvblBhcmFtZXRlcnNcclxuICAgICAgICB9KSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICByZXF1ZXN0UGFyYW1ldGVyczogbWV0aG9kUGFyYW1ldGVyc1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG4gIH0pO1xyXG59XHJcbiJdfQ==
