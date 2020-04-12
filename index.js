"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@aws-cdk/core");
const logs = require("@aws-cdk/aws-logs");
const AlfCdkRestApi_1 = require("./AlfCdkRestApi");
const AlfCdkTables_1 = require("./lib/AlfCdkTables");
const AlfCdkLambdas_1 = require("./lib/AlfCdkLambdas");
const AlfCdkStepFunctions_1 = require("./lib/AlfCdkStepFunctions");
class AlfInstancesStack extends core_1.Stack {
    constructor(app, id, props) {
        super(app, id, props);
        const lambdas = new AlfCdkLambdas_1.AlfCdkLambdas(this, props);
        new AlfCdkTables_1.AlfCdkTables(this, lambdas);
        new AlfCdkRestApi_1.AlfCdkRestApi(this, lambdas, props);
        const stepFunctions = new AlfCdkStepFunctions_1.AlfCdkStepFunctions(this, lambdas);
        lambdas.createOneApi.addEnvironment('STATE_MACHINE_ARN', stepFunctions.createStateMachine.stateMachineArn);
        lambdas.updateOneApi.addEnvironment('STATE_MACHINE_ARN', stepFunctions.updateStateMachine.stateMachineArn);
        // Configure log group for short retention
        const logGroup = new logs.LogGroup(this, 'LogGroup', {
            retention: logs.RetentionDays.ONE_DAY,
            removalPolicy: core_1.RemovalPolicy.DESTROY,
            logGroupName: '/aws/lambda/custom/' + this.stackName
        });
        const lgstream = logGroup.addStream('myloggroupStream');
        new core_1.CfnOutput(this, 'LogGroupName', {
            value: logGroup.logGroupName
        });
        new core_1.CfnOutput(this, 'LogGroupStreamName', {
            value: lgstream.logStreamName
        });
    }
}
exports.AlfInstancesStack = AlfInstancesStack;
const app = new core_1.App();
new AlfInstancesStack(app, "AlfInstancesStackEuWest1", {
    environment: 'prod',
    env: {
        region: "eu-west-1",
        account: '609841182532'
    },
    // disable create ec2 instance
    // createInstances: {
    //   imageId: 'ami-04d5cc9b88f9d1d39'
    // },
    swagger: {
        file: 'tmp/swagger_full_.yaml',
        domain: {
            domainName: 'h-o.dev',
            subdomain: 'api-explorer',
            certificateArn: 'arn:aws:acm:us-east-1:609841182532:certificate/f299b75b-f22c-404d-98f2-89529f4d2c96'
        }
    },
    domain: {
        domainName: 'api.h-o.dev',
        zoneName: 'api.h-o.dev.',
        hostedZoneId: 'Z01486521Z813EMSKNWNH',
        certificateArn: 'arn:aws:acm:eu-west-1:609841182532:certificate/e01449c5-3c02-4c4b-86aa-483dea50d197'
    }
});
new AlfInstancesStack(app, "AlfInstancesStackEuWest2", {
    environment: 'dev',
    env: {
        region: 'eu-west-2',
        account: '609841182532'
    },
    createInstances: {
        imageId: 'ami-0cb790308f7591fa6'
    },
    swagger: {
        file: 'tmp/swagger_full.yaml',
    },
});
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHdDQUFpRjtBQUNqRiwwQ0FBMkM7QUFDM0MsbURBQXdEO0FBQ3hELHFEQUFrRDtBQUNsRCx1REFBb0Q7QUFDcEQsbUVBQWdFO0FBc0JoRSxNQUFhLGlCQUFrQixTQUFRLFlBQUs7SUFDMUMsWUFBWSxHQUFRLEVBQUUsRUFBVSxFQUFFLEtBQThCO1FBQzlELEtBQUssQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXRCLE1BQU0sT0FBTyxHQUFHLElBQUksNkJBQWEsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFL0MsSUFBSSwyQkFBWSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUVoQyxJQUFJLDZCQUFhLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QyxNQUFNLGFBQWEsR0FBRyxJQUFJLHlDQUFtQixDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUU3RCxPQUFPLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsRUFBRSxhQUFhLENBQUMsa0JBQWtCLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDM0csT0FBTyxDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEVBQUUsYUFBYSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBRTFHLDBDQUEwQztRQUMxQyxNQUFNLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRTtZQUNuRCxTQUFTLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPO1lBQ3JDLGFBQWEsRUFBRSxvQkFBYSxDQUFDLE9BQU87WUFDcEMsWUFBWSxFQUFFLHFCQUFxQixHQUFHLElBQUksQ0FBQyxTQUFTO1NBQ3JELENBQUMsQ0FBQztRQUVILE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUV2RCxJQUFJLGdCQUFTLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUNsQyxLQUFLLEVBQUUsUUFBUSxDQUFDLFlBQVk7U0FDN0IsQ0FBQyxDQUFDO1FBRUgsSUFBSSxnQkFBUyxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUN4QyxLQUFLLEVBQUUsUUFBUSxDQUFDLGFBQWE7U0FDOUIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBaENELDhDQWdDQztBQUVELE1BQU0sR0FBRyxHQUFHLElBQUksVUFBRyxFQUFFLENBQUM7QUFFdEIsSUFBSSxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsMEJBQTBCLEVBQUU7SUFDbkQsV0FBVyxFQUFFLE1BQU07SUFDbkIsR0FBRyxFQUFFO1FBQ0gsTUFBTSxFQUFFLFdBQVc7UUFDbkIsT0FBTyxFQUFFLGNBQWM7S0FDeEI7SUFDRCw4QkFBOEI7SUFDOUIscUJBQXFCO0lBQ3JCLHFDQUFxQztJQUNyQyxLQUFLO0lBQ0wsT0FBTyxFQUFFO1FBQ1AsSUFBSSxFQUFFLHdCQUF3QjtRQUM5QixNQUFNLEVBQUU7WUFDTixVQUFVLEVBQUUsU0FBUztZQUNyQixTQUFTLEVBQUUsY0FBYztZQUN6QixjQUFjLEVBQUUscUZBQXFGO1NBQ3RHO0tBQ0Y7SUFDRCxNQUFNLEVBQUU7UUFDTixVQUFVLEVBQUUsYUFBYTtRQUN6QixRQUFRLEVBQUUsY0FBYztRQUN4QixZQUFZLEVBQUUsdUJBQXVCO1FBQ3JDLGNBQWMsRUFBRSxxRkFBcUY7S0FDdEc7Q0FDRixDQUFDLENBQUM7QUFFTCxJQUFJLGlCQUFpQixDQUFDLEdBQUcsRUFBRSwwQkFBMEIsRUFBRTtJQUNyRCxXQUFXLEVBQUUsS0FBSztJQUNsQixHQUFHLEVBQUU7UUFDSCxNQUFNLEVBQUUsV0FBVztRQUNuQixPQUFPLEVBQUUsY0FBYztLQUN4QjtJQUNELGVBQWUsRUFBRTtRQUNmLE9BQU8sRUFBRSx1QkFBdUI7S0FDakM7SUFDRCxPQUFPLEVBQUU7UUFDUCxJQUFJLEVBQUUsdUJBQXVCO0tBSTlCO0NBT0YsQ0FBQyxDQUFDO0FBRUgsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU3RhY2tQcm9wcywgU3RhY2ssIEFwcCwgUmVtb3ZhbFBvbGljeSwgQ2ZuT3V0cHV0IH0gZnJvbSAnQGF3cy1jZGsvY29yZSc7XG5pbXBvcnQgbG9ncyA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1sb2dzJyk7XG5pbXBvcnQgeyBBbGZDZGtSZXN0QXBpLCBEb21haW4gfSBmcm9tICcuL0FsZkNka1Jlc3RBcGknO1xuaW1wb3J0IHsgQWxmQ2RrVGFibGVzIH0gZnJvbSAnLi9saWIvQWxmQ2RrVGFibGVzJztcbmltcG9ydCB7IEFsZkNka0xhbWJkYXMgfSBmcm9tICcuL2xpYi9BbGZDZGtMYW1iZGFzJztcbmltcG9ydCB7IEFsZkNka1N0ZXBGdW5jdGlvbnMgfSBmcm9tICcuL2xpYi9BbGZDZGtTdGVwRnVuY3Rpb25zJztcblxuZXhwb3J0IGludGVyZmFjZSBBbGZJbnN0YW5jZXNTdGFja1Byb3BzIGV4dGVuZHMgU3RhY2tQcm9wcyB7XG4gIC8qKlxuICAgKiBpZiB1bmRlZmluZWQgbm8gZWMyIGluc3RhbmNlcyB3aWxsIGJlIGNyZWF0ZWRcbiAgICovXG4gIGNyZWF0ZUluc3RhbmNlcz86IHtcbiAgICBpbWFnZUlkOiBzdHJpbmdcbiAgfSxcbiAgc3dhZ2dlcj86IHtcbiAgICBmaWxlOiBzdHJpbmcsXG4gICAgZG9tYWluPzoge1xuICAgICAgZG9tYWluTmFtZTogc3RyaW5nLFxuICAgICAgc3ViZG9tYWluOiBzdHJpbmcsXG4gICAgICBjZXJ0aWZpY2F0ZUFybjogc3RyaW5nXG4gICAgfVxuICB9XG4gIC8vIHN3YWdnZXJGaWxlPzogc3RyaW5nLFxuICBlbnZpcm9ubWVudDogc3RyaW5nXG4gIGRvbWFpbj86IERvbWFpblxufVxuXG5leHBvcnQgY2xhc3MgQWxmSW5zdGFuY2VzU3RhY2sgZXh0ZW5kcyBTdGFjayB7XG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBpZDogc3RyaW5nLCBwcm9wcz86IEFsZkluc3RhbmNlc1N0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihhcHAsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCBsYW1iZGFzID0gbmV3IEFsZkNka0xhbWJkYXModGhpcywgcHJvcHMpO1xuXG4gICAgbmV3IEFsZkNka1RhYmxlcyh0aGlzLCBsYW1iZGFzKTtcblxuICAgIG5ldyBBbGZDZGtSZXN0QXBpKHRoaXMsIGxhbWJkYXMsIHByb3BzKTtcblxuICAgIGNvbnN0IHN0ZXBGdW5jdGlvbnMgPSBuZXcgQWxmQ2RrU3RlcEZ1bmN0aW9ucyh0aGlzLCBsYW1iZGFzKTtcblxuICAgIGxhbWJkYXMuY3JlYXRlT25lQXBpLmFkZEVudmlyb25tZW50KCdTVEFURV9NQUNISU5FX0FSTicsIHN0ZXBGdW5jdGlvbnMuY3JlYXRlU3RhdGVNYWNoaW5lLnN0YXRlTWFjaGluZUFybik7XG4gICAgbGFtYmRhcy51cGRhdGVPbmVBcGkuYWRkRW52aXJvbm1lbnQoJ1NUQVRFX01BQ0hJTkVfQVJOJywgc3RlcEZ1bmN0aW9ucy51cGRhdGVTdGF0ZU1hY2hpbmUuc3RhdGVNYWNoaW5lQXJuKVxuXG4gICAgLy8gQ29uZmlndXJlIGxvZyBncm91cCBmb3Igc2hvcnQgcmV0ZW50aW9uXG4gICAgY29uc3QgbG9nR3JvdXAgPSBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnTG9nR3JvdXAnLCB7XG4gICAgICByZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfREFZLFxuICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgbG9nR3JvdXBOYW1lOiAnL2F3cy9sYW1iZGEvY3VzdG9tLycgKyB0aGlzLnN0YWNrTmFtZVxuICAgIH0pO1xuXG4gICAgY29uc3QgbGdzdHJlYW0gPSBsb2dHcm91cC5hZGRTdHJlYW0oJ215bG9nZ3JvdXBTdHJlYW0nKVxuXG4gICAgbmV3IENmbk91dHB1dCh0aGlzLCAnTG9nR3JvdXBOYW1lJywge1xuICAgICAgdmFsdWU6IGxvZ0dyb3VwLmxvZ0dyb3VwTmFtZVxuICAgIH0pO1xuXG4gICAgbmV3IENmbk91dHB1dCh0aGlzLCAnTG9nR3JvdXBTdHJlYW1OYW1lJywge1xuICAgICAgdmFsdWU6IGxnc3RyZWFtLmxvZ1N0cmVhbU5hbWVcbiAgICB9KTtcbiAgfVxufVxuXG5jb25zdCBhcHAgPSBuZXcgQXBwKCk7XG5cbm5ldyBBbGZJbnN0YW5jZXNTdGFjayhhcHAsIFwiQWxmSW5zdGFuY2VzU3RhY2tFdVdlc3QxXCIsIHtcbiAgICBlbnZpcm9ubWVudDogJ3Byb2QnLFxuICAgIGVudjoge1xuICAgICAgcmVnaW9uOiBcImV1LXdlc3QtMVwiLFxuICAgICAgYWNjb3VudDogJzYwOTg0MTE4MjUzMidcbiAgICB9LFxuICAgIC8vIGRpc2FibGUgY3JlYXRlIGVjMiBpbnN0YW5jZVxuICAgIC8vIGNyZWF0ZUluc3RhbmNlczoge1xuICAgIC8vICAgaW1hZ2VJZDogJ2FtaS0wNGQ1Y2M5Yjg4ZjlkMWQzOSdcbiAgICAvLyB9LFxuICAgIHN3YWdnZXI6IHtcbiAgICAgIGZpbGU6ICd0bXAvc3dhZ2dlcl9mdWxsXy55YW1sJyxcbiAgICAgIGRvbWFpbjoge1xuICAgICAgICBkb21haW5OYW1lOiAnaC1vLmRldicsXG4gICAgICAgIHN1YmRvbWFpbjogJ2FwaS1leHBsb3JlcicsXG4gICAgICAgIGNlcnRpZmljYXRlQXJuOiAnYXJuOmF3czphY206dXMtZWFzdC0xOjYwOTg0MTE4MjUzMjpjZXJ0aWZpY2F0ZS9mMjk5Yjc1Yi1mMjJjLTQwNGQtOThmMi04OTUyOWY0ZDJjOTYnXG4gICAgICB9XG4gICAgfSxcbiAgICBkb21haW46IHtcbiAgICAgIGRvbWFpbk5hbWU6ICdhcGkuaC1vLmRldicsXG4gICAgICB6b25lTmFtZTogJ2FwaS5oLW8uZGV2LicsXG4gICAgICBob3N0ZWRab25lSWQ6ICdaMDE0ODY1MjFaODEzRU1TS05XTkgnLFxuICAgICAgY2VydGlmaWNhdGVBcm46ICdhcm46YXdzOmFjbTpldS13ZXN0LTE6NjA5ODQxMTgyNTMyOmNlcnRpZmljYXRlL2UwMTQ0OWM1LTNjMDItNGM0Yi04NmFhLTQ4M2RlYTUwZDE5NydcbiAgICB9XG4gIH0pO1xuXG5uZXcgQWxmSW5zdGFuY2VzU3RhY2soYXBwLCBcIkFsZkluc3RhbmNlc1N0YWNrRXVXZXN0MlwiLCB7XG4gIGVudmlyb25tZW50OiAnZGV2JyxcbiAgZW52OiB7XG4gICAgcmVnaW9uOiAnZXUtd2VzdC0yJyxcbiAgICBhY2NvdW50OiAnNjA5ODQxMTgyNTMyJ1xuICB9LFxuICBjcmVhdGVJbnN0YW5jZXM6IHtcbiAgICBpbWFnZUlkOiAnYW1pLTBjYjc5MDMwOGY3NTkxZmE2J1xuICB9LFxuICBzd2FnZ2VyOiB7XG4gICAgZmlsZTogJ3RtcC9zd2FnZ2VyX2Z1bGwueWFtbCcsXG4gICAgLy8gZG9tYWluOiAnaC1vLmRldicsXG4gICAgLy8gc3ViZG9tYWluOiAnYXBpLWV4cGxvcmVyJyxcbiAgICAvLyBjZXJ0aWZpY2F0ZUFybjogJ2Fybjphd3M6YWNtOnVzLWVhc3QtMTo2MDk4NDExODI1MzI6Y2VydGlmaWNhdGUvZjI5OWI3NWItZjIyYy00MDRkLTk4ZjItODk1MjlmNGQyYzk2J1xuICB9LFxuICAvLyBkb21haW46IHtcbiAgLy8gICBkb21haW5OYW1lOiAnYXBpLmgtby5kZXYnLFxuICAvLyAgIHpvbmVOYW1lOiAnYXBpLmgtby5kZXYuJyxcbiAgLy8gICBob3N0ZWRab25lSWQ6ICdaMDE0ODY1MjFaODEzRU1TS05XTkgnLFxuICAvLyAgIGNlcnRpZmljYXRlQXJuOiAnYXJuOmF3czphY206ZXUtd2VzdC0yOjYwOTg0MTE4MjUzMjpjZXJ0aWZpY2F0ZS84NjE2ZTRlMy04NTcwLTQyZGItOWNiZC02ZTZlNzZkYTNjNWYnXG4gIC8vIH1cbn0pO1xuXG5hcHAuc3ludGgoKTtcbiJdfQ==