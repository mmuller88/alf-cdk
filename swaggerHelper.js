"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lambda = require("@aws-cdk/aws-lambda");
const aws_apigateway_1 = require("@aws-cdk/aws-apigateway");
function convertSwaggerToCdkRestApi(scope, apiGateway, swaggerApi, dynamoTable) {
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
                    runtime: lambda.Runtime.NODEJS_10_X,
                    environment: endpoint["x-cdk-lambda-env"]
                }));
            }
            backingLambda = createdLambdas.get(endpoint["x-cdk-lambda-name"]);
            dynamoTable.grantReadWriteData(backingLambda);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3dhZ2dlckhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInN3YWdnZXJIZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFFQSw4Q0FBOEM7QUFDOUMsNERBQTREO0FBRzVELFNBQXdCLDBCQUEwQixDQUFDLEtBQW1CLEVBQUUsVUFBNkIsRUFBRSxVQUFlLEVBQUUsV0FBa0I7SUFFeEksSUFBSSxjQUFjLEdBQWdDLElBQUksR0FBRyxFQUEyQixDQUFDO0lBQ3JGLElBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRTFDLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUU7UUFDdkIsTUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDM0QsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFFeEQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUMzQixJQUFJLFFBQVEsR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3RELElBQUksYUFBOEIsQ0FBQztZQUVuQyxJQUFJLGNBQWMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLENBQUMsS0FBSyxLQUFLLEVBQUU7Z0JBQy9ELGNBQWMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLEVBQzlDLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLG1CQUFtQixDQUFDLEVBQUU7b0JBQ3hELElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsQ0FBQztvQkFDdEQsT0FBTyxFQUFFLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQztvQkFDekMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztvQkFDbkMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQztpQkFDMUMsQ0FBQyxDQUNILENBQUM7YUFDSDtZQUVELGFBQWEsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFFLENBQUM7WUFDbkUsV0FBVyxDQUFDLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBRTlDLElBQUkscUJBQXFCLEdBQU8sU0FBUyxDQUFDO1lBQzFDLElBQUksZ0JBQWdCLEdBQU8sU0FBUyxDQUFDO1lBRXJDLElBQUksUUFBUSxDQUFDLFVBQVUsSUFBSSxRQUFRLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRTtnQkFDckQsSUFBSSxVQUFVLEdBQVMsUUFBUSxDQUFDLFVBQVUsQ0FBQztnQkFDM0MscUJBQXFCLEdBQUcsRUFBRSxDQUFDO2dCQUMzQixnQkFBZ0IsR0FBRyxFQUFFLENBQUM7Z0JBRXRCLFVBQVUsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtvQkFDcEMscUJBQXFCLENBQUMsdUJBQXVCLGdCQUFnQixDQUFDLEVBQUUsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLGtCQUFrQixnQkFBZ0IsQ0FBQyxFQUFFLElBQUksZ0JBQWdCLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ2hLLGdCQUFnQixDQUFDLGtCQUFrQixnQkFBZ0IsQ0FBQyxFQUFFLElBQUksZ0JBQWdCLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUM7Z0JBQzVGLENBQUMsQ0FBQyxDQUFDO2FBQ0o7WUFFRCxRQUFRLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFDM0IsSUFBSSxrQ0FBaUIsQ0FBQyxhQUFhLEVBQUU7Z0JBQ25DLGlCQUFpQixFQUFFLHFCQUFxQjthQUN6QyxDQUFDLEVBQ0Y7Z0JBQ0UsaUJBQWlCLEVBQUUsZ0JBQWdCO2FBQ3BDLENBQUMsQ0FBQztRQUNQLENBQUMsQ0FBQyxDQUFDO0lBRUwsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBbkRELDZDQW1EQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdAYXdzLWNkay9jb3JlJztcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnQGF3cy1jZGsvYXdzLWFwaWdhdGV3YXknO1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ0Bhd3MtY2RrL2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgTGFtYmRhSW50ZWdyYXRpb24gfSBmcm9tIFwiQGF3cy1jZGsvYXdzLWFwaWdhdGV3YXlcIjtcbmltcG9ydCB7IFRhYmxlIH0gZnJvbSAnQGF3cy1jZGsvYXdzLWR5bmFtb2RiJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29udmVydFN3YWdnZXJUb0Nka1Jlc3RBcGkoc2NvcGU6Y2RrLkNvbnN0cnVjdCwgYXBpR2F0ZXdheTphcGlnYXRld2F5LlJlc3RBcGksIHN3YWdnZXJBcGk6IGFueSwgZHluYW1vVGFibGU6IFRhYmxlICkge1xuXG4gIGxldCBjcmVhdGVkTGFtYmRhczpNYXA8c3RyaW5nLCBsYW1iZGEuRnVuY3Rpb24+ID0gbmV3IE1hcDxzdHJpbmcsIGxhbWJkYS5GdW5jdGlvbj4oKTtcbiAgbGV0IHBhdGhzID0gT2JqZWN0LmtleXMoc3dhZ2dlckFwaS5wYXRocyk7XG5cbiAgcGF0aHMuZm9yRWFjaChwYXRoTmFtZSA9PiB7XG4gICAgY29uc3QgcmVzb3VyY2UgPSBhcGlHYXRld2F5LnJvb3QucmVzb3VyY2VGb3JQYXRoKHBhdGhOYW1lKTtcbiAgICBjb25zdCBtZXRob2RzID0gT2JqZWN0LmtleXMoc3dhZ2dlckFwaS5wYXRoc1twYXRoTmFtZV0pO1xuXG4gICAgbWV0aG9kcy5mb3JFYWNoKG1ldGhvZE5hbWUgPT4ge1xuICAgICAgbGV0IGVuZHBvaW50ID0gc3dhZ2dlckFwaS5wYXRoc1twYXRoTmFtZV1bbWV0aG9kTmFtZV07XG4gICAgICBsZXQgYmFja2luZ0xhbWJkYTogbGFtYmRhLkZ1bmN0aW9uO1xuXG4gICAgICBpZiAoY3JlYXRlZExhbWJkYXMuaGFzKGVuZHBvaW50W1wieC1jZGstbGFtYmRhLW5hbWVcIl0pID09PSBmYWxzZSkge1xuICAgICAgICBjcmVhdGVkTGFtYmRhcy5zZXQoZW5kcG9pbnRbXCJ4LWNkay1sYW1iZGEtbmFtZVwiXSxcbiAgICAgICAgICBuZXcgbGFtYmRhLkZ1bmN0aW9uKHNjb3BlLCBlbmRwb2ludFtcIngtY2RrLWxhbWJkYS1uYW1lXCJdLCB7XG4gICAgICAgICAgICBjb2RlOiBsYW1iZGEuQ29kZS5hc3NldChlbmRwb2ludFtcIngtY2RrLWxhbWJkYS1jb2RlXCJdKSxcbiAgICAgICAgICAgIGhhbmRsZXI6IGVuZHBvaW50W1wieC1jZGstbGFtYmRhLWhhbmRsZXJcIl0sXG4gICAgICAgICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgICAgICAgIGVudmlyb25tZW50OiBlbmRwb2ludFtcIngtY2RrLWxhbWJkYS1lbnZcIl1cbiAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBiYWNraW5nTGFtYmRhID0gY3JlYXRlZExhbWJkYXMuZ2V0KGVuZHBvaW50W1wieC1jZGstbGFtYmRhLW5hbWVcIl0pITtcbiAgICAgIGR5bmFtb1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShiYWNraW5nTGFtYmRhKTtcblxuICAgICAgbGV0IGludGVncmF0aW9uUGFyYW1ldGVyczphbnkgPSB1bmRlZmluZWQ7XG4gICAgICBsZXQgbWV0aG9kUGFyYW1ldGVyczphbnkgPSB1bmRlZmluZWQ7XG5cbiAgICAgIGlmIChlbmRwb2ludC5wYXJhbWV0ZXJzICYmIGVuZHBvaW50LnBhcmFtZXRlcnMubGVuZ3RoKSB7XG4gICAgICAgIGxldCBwYXJhbWV0ZXJzOmFueVtdID0gZW5kcG9pbnQucGFyYW1ldGVycztcbiAgICAgICAgaW50ZWdyYXRpb25QYXJhbWV0ZXJzID0ge307XG4gICAgICAgIG1ldGhvZFBhcmFtZXRlcnMgPSB7fTtcblxuICAgICAgICBwYXJhbWV0ZXJzLmZvckVhY2goc3dhZ2dlclBhcmFtZXRlciA9PiB7XG4gICAgICAgICAgaW50ZWdyYXRpb25QYXJhbWV0ZXJzW2BpbnRlZ3JhdGlvbi5yZXF1ZXN0LiR7c3dhZ2dlclBhcmFtZXRlci5pbn0uJHtzd2FnZ2VyUGFyYW1ldGVyLm5hbWV9YF0gPSBgbWV0aG9kLnJlcXVlc3QuJHtzd2FnZ2VyUGFyYW1ldGVyLmlufS4ke3N3YWdnZXJQYXJhbWV0ZXIubmFtZX1gO1xuICAgICAgICAgIG1ldGhvZFBhcmFtZXRlcnNbYG1ldGhvZC5yZXF1ZXN0LiR7c3dhZ2dlclBhcmFtZXRlci5pbn0uJHtzd2FnZ2VyUGFyYW1ldGVyLm5hbWV9YF0gPSB0cnVlO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgcmVzb3VyY2UuYWRkTWV0aG9kKG1ldGhvZE5hbWUsXG4gICAgICAgIG5ldyBMYW1iZGFJbnRlZ3JhdGlvbihiYWNraW5nTGFtYmRhLCB7XG4gICAgICAgICAgcmVxdWVzdFBhcmFtZXRlcnM6IGludGVncmF0aW9uUGFyYW1ldGVyc1xuICAgICAgICB9KSxcbiAgICAgICAge1xuICAgICAgICAgIHJlcXVlc3RQYXJhbWV0ZXJzOiBtZXRob2RQYXJhbWV0ZXJzXG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gIH0pO1xufVxuIl19