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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3dhZ2dlckhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInN3YWdnZXJIZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFFQSw4Q0FBOEM7QUFDOUMsNERBQTREO0FBRzVELFNBQXdCLDBCQUEwQixDQUFDLEtBQW1CLEVBQUUsVUFBNkIsRUFBRSxVQUFlLEVBQUUsV0FBa0I7SUFFeEksSUFBSSxjQUFjLEdBQWdDLElBQUksR0FBRyxFQUEyQixDQUFDO0lBQ3JGLElBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRTFDLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUU7UUFDdkIsTUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDM0QsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFFeEQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUMzQixJQUFJLFFBQVEsR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3RELElBQUksYUFBOEIsQ0FBQztZQUVuQyxJQUFJLGNBQWMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLENBQUMsS0FBSyxLQUFLLEVBQUU7Z0JBQy9ELGNBQWMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLEVBQzlDLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLG1CQUFtQixDQUFDLEVBQUU7b0JBQ3hELElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsQ0FBQztvQkFDdEQsT0FBTyxFQUFFLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQztvQkFDekMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztvQkFDbkMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQztpQkFDMUMsQ0FBQyxDQUNILENBQUM7YUFDSDtZQUVELGFBQWEsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFFLENBQUM7WUFDbkUsV0FBVyxDQUFDLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBRTlDLElBQUkscUJBQXFCLEdBQU8sU0FBUyxDQUFDO1lBQzFDLElBQUksZ0JBQWdCLEdBQU8sU0FBUyxDQUFDO1lBRXJDLElBQUksUUFBUSxDQUFDLFVBQVUsSUFBSSxRQUFRLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRTtnQkFDckQsSUFBSSxVQUFVLEdBQVMsUUFBUSxDQUFDLFVBQVUsQ0FBQztnQkFDM0MscUJBQXFCLEdBQUcsRUFBRSxDQUFDO2dCQUMzQixnQkFBZ0IsR0FBRyxFQUFFLENBQUM7Z0JBRXRCLFVBQVUsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtvQkFDcEMscUJBQXFCLENBQUMsdUJBQXVCLGdCQUFnQixDQUFDLEVBQUUsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLGtCQUFrQixnQkFBZ0IsQ0FBQyxFQUFFLElBQUksZ0JBQWdCLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ2hLLGdCQUFnQixDQUFDLGtCQUFrQixnQkFBZ0IsQ0FBQyxFQUFFLElBQUksZ0JBQWdCLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUM7Z0JBQzVGLENBQUMsQ0FBQyxDQUFDO2FBQ0o7WUFFRCxRQUFRLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFDM0IsSUFBSSxrQ0FBaUIsQ0FBQyxhQUFhLEVBQUU7Z0JBQ25DLGlCQUFpQixFQUFFLHFCQUFxQjthQUN6QyxDQUFDLEVBQ0Y7Z0JBQ0UsaUJBQWlCLEVBQUUsZ0JBQWdCO2FBQ3BDLENBQUMsQ0FBQztRQUNQLENBQUMsQ0FBQyxDQUFDO0lBRUwsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBbkRELDZDQW1EQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdAYXdzLWNkay9jb3JlJztcclxuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdAYXdzLWNkay9hd3MtYXBpZ2F0ZXdheSc7XHJcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdAYXdzLWNkay9hd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgTGFtYmRhSW50ZWdyYXRpb24gfSBmcm9tIFwiQGF3cy1jZGsvYXdzLWFwaWdhdGV3YXlcIjtcclxuaW1wb3J0IHsgVGFibGUgfSBmcm9tICdAYXdzLWNkay9hd3MtZHluYW1vZGInO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29udmVydFN3YWdnZXJUb0Nka1Jlc3RBcGkoc2NvcGU6Y2RrLkNvbnN0cnVjdCwgYXBpR2F0ZXdheTphcGlnYXRld2F5LlJlc3RBcGksIHN3YWdnZXJBcGk6IGFueSwgZHluYW1vVGFibGU6IFRhYmxlICkge1xyXG5cclxuICBsZXQgY3JlYXRlZExhbWJkYXM6TWFwPHN0cmluZywgbGFtYmRhLkZ1bmN0aW9uPiA9IG5ldyBNYXA8c3RyaW5nLCBsYW1iZGEuRnVuY3Rpb24+KCk7XHJcbiAgbGV0IHBhdGhzID0gT2JqZWN0LmtleXMoc3dhZ2dlckFwaS5wYXRocyk7XHJcblxyXG4gIHBhdGhzLmZvckVhY2gocGF0aE5hbWUgPT4ge1xyXG4gICAgY29uc3QgcmVzb3VyY2UgPSBhcGlHYXRld2F5LnJvb3QucmVzb3VyY2VGb3JQYXRoKHBhdGhOYW1lKTtcclxuICAgIGNvbnN0IG1ldGhvZHMgPSBPYmplY3Qua2V5cyhzd2FnZ2VyQXBpLnBhdGhzW3BhdGhOYW1lXSk7XHJcblxyXG4gICAgbWV0aG9kcy5mb3JFYWNoKG1ldGhvZE5hbWUgPT4ge1xyXG4gICAgICBsZXQgZW5kcG9pbnQgPSBzd2FnZ2VyQXBpLnBhdGhzW3BhdGhOYW1lXVttZXRob2ROYW1lXTtcclxuICAgICAgbGV0IGJhY2tpbmdMYW1iZGE6IGxhbWJkYS5GdW5jdGlvbjtcclxuXHJcbiAgICAgIGlmIChjcmVhdGVkTGFtYmRhcy5oYXMoZW5kcG9pbnRbXCJ4LWNkay1sYW1iZGEtbmFtZVwiXSkgPT09IGZhbHNlKSB7XHJcbiAgICAgICAgY3JlYXRlZExhbWJkYXMuc2V0KGVuZHBvaW50W1wieC1jZGstbGFtYmRhLW5hbWVcIl0sXHJcbiAgICAgICAgICBuZXcgbGFtYmRhLkZ1bmN0aW9uKHNjb3BlLCBlbmRwb2ludFtcIngtY2RrLWxhbWJkYS1uYW1lXCJdLCB7XHJcbiAgICAgICAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmFzc2V0KGVuZHBvaW50W1wieC1jZGstbGFtYmRhLWNvZGVcIl0pLFxyXG4gICAgICAgICAgICBoYW5kbGVyOiBlbmRwb2ludFtcIngtY2RrLWxhbWJkYS1oYW5kbGVyXCJdLFxyXG4gICAgICAgICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTBfWCxcclxuICAgICAgICAgICAgZW52aXJvbm1lbnQ6IGVuZHBvaW50W1wieC1jZGstbGFtYmRhLWVudlwiXVxyXG4gICAgICAgICAgfSlcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBiYWNraW5nTGFtYmRhID0gY3JlYXRlZExhbWJkYXMuZ2V0KGVuZHBvaW50W1wieC1jZGstbGFtYmRhLW5hbWVcIl0pITtcclxuICAgICAgZHluYW1vVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGJhY2tpbmdMYW1iZGEpO1xyXG5cclxuICAgICAgbGV0IGludGVncmF0aW9uUGFyYW1ldGVyczphbnkgPSB1bmRlZmluZWQ7XHJcbiAgICAgIGxldCBtZXRob2RQYXJhbWV0ZXJzOmFueSA9IHVuZGVmaW5lZDtcclxuXHJcbiAgICAgIGlmIChlbmRwb2ludC5wYXJhbWV0ZXJzICYmIGVuZHBvaW50LnBhcmFtZXRlcnMubGVuZ3RoKSB7XHJcbiAgICAgICAgbGV0IHBhcmFtZXRlcnM6YW55W10gPSBlbmRwb2ludC5wYXJhbWV0ZXJzO1xyXG4gICAgICAgIGludGVncmF0aW9uUGFyYW1ldGVycyA9IHt9O1xyXG4gICAgICAgIG1ldGhvZFBhcmFtZXRlcnMgPSB7fTtcclxuXHJcbiAgICAgICAgcGFyYW1ldGVycy5mb3JFYWNoKHN3YWdnZXJQYXJhbWV0ZXIgPT4ge1xyXG4gICAgICAgICAgaW50ZWdyYXRpb25QYXJhbWV0ZXJzW2BpbnRlZ3JhdGlvbi5yZXF1ZXN0LiR7c3dhZ2dlclBhcmFtZXRlci5pbn0uJHtzd2FnZ2VyUGFyYW1ldGVyLm5hbWV9YF0gPSBgbWV0aG9kLnJlcXVlc3QuJHtzd2FnZ2VyUGFyYW1ldGVyLmlufS4ke3N3YWdnZXJQYXJhbWV0ZXIubmFtZX1gO1xyXG4gICAgICAgICAgbWV0aG9kUGFyYW1ldGVyc1tgbWV0aG9kLnJlcXVlc3QuJHtzd2FnZ2VyUGFyYW1ldGVyLmlufS4ke3N3YWdnZXJQYXJhbWV0ZXIubmFtZX1gXSA9IHRydWU7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJlc291cmNlLmFkZE1ldGhvZChtZXRob2ROYW1lLFxyXG4gICAgICAgIG5ldyBMYW1iZGFJbnRlZ3JhdGlvbihiYWNraW5nTGFtYmRhLCB7XHJcbiAgICAgICAgICByZXF1ZXN0UGFyYW1ldGVyczogaW50ZWdyYXRpb25QYXJhbWV0ZXJzXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgcmVxdWVzdFBhcmFtZXRlcnM6IG1ldGhvZFBhcmFtZXRlcnNcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG5cclxuICB9KTtcclxufVxyXG4iXX0=