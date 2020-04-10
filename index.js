"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@aws-cdk/core");
const logs = require("@aws-cdk/aws-logs");
const AlfCdkRestApi_1 = require("./lib/AlfCdkRestApi");
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
// new AlfInstancesStack(app, "AlfInstancesStackEuWest1", {
//     environment: 'prod',
//     env: {
//       region: "eu-west-1"
//     },
//     imageId: 'ami-04d5cc9b88f9d1d39',
//     swaggerFile: 'tmp/swagger_full_.yaml'
//   });
new AlfInstancesStack(app, "AlfInstancesStackEuWest2", {
    environment: 'dev',
    env: {
        region: 'eu-west-2',
        account: '609841182532'
    },
    imageId: 'ami-0cb790308f7591fa6',
    swagger: {
        file: '../tmp/swagger_full.yaml',
        domain: 'h-o.dev',
        subdomain: 'api-explorer',
        certificateArn: 'arn:aws:acm:us-east-1:609841182532:certificate/f299b75b-f22c-404d-98f2-89529f4d2c96'
    },
    // swaggerFile: '../tmp/swagger_full.yaml',
    domain: {
        domainName: 'api.h-o.dev',
        zoneName: 'api.h-o.dev.',
        hostedZoneId: 'Z01486521Z813EMSKNWNH',
        certificateArn: 'arn:aws:acm:eu-west-2:609841182532:certificate/8616e4e3-8570-42db-9cbd-6e6e76da3c5f'
    }
});
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHdDQUFpRjtBQUNqRiwwQ0FBMkM7QUFDM0MsdURBQTREO0FBQzVELHFEQUFrRDtBQUNsRCx1REFBb0Q7QUFDcEQsbUVBQWdFO0FBZWhFLE1BQWEsaUJBQWtCLFNBQVEsWUFBSztJQUMxQyxZQUFZLEdBQVEsRUFBRSxFQUFVLEVBQUUsS0FBOEI7UUFDOUQsS0FBSyxDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFdEIsTUFBTSxPQUFPLEdBQUcsSUFBSSw2QkFBYSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUUvQyxJQUFJLDJCQUFZLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRWhDLElBQUksNkJBQWEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhDLE1BQU0sYUFBYSxHQUFHLElBQUkseUNBQW1CLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRTdELE9BQU8sQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLG1CQUFtQixFQUFFLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUMzRyxPQUFPLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsRUFBRSxhQUFhLENBQUMsa0JBQWtCLENBQUMsZUFBZSxDQUFDLENBQUE7UUFFMUcsMENBQTBDO1FBQzFDLE1BQU0sUUFBUSxHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFO1lBQ25ELFNBQVMsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU87WUFDckMsYUFBYSxFQUFFLG9CQUFhLENBQUMsT0FBTztZQUNwQyxZQUFZLEVBQUUscUJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVM7U0FDckQsQ0FBQyxDQUFDO1FBRUgsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBRXZELElBQUksZ0JBQVMsQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ2xDLEtBQUssRUFBRSxRQUFRLENBQUMsWUFBWTtTQUM3QixDQUFDLENBQUM7UUFFSCxJQUFJLGdCQUFTLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQ3hDLEtBQUssRUFBRSxRQUFRLENBQUMsYUFBYTtTQUM5QixDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUFoQ0QsOENBZ0NDO0FBRUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxVQUFHLEVBQUUsQ0FBQztBQUV0QiwyREFBMkQ7QUFDM0QsMkJBQTJCO0FBQzNCLGFBQWE7QUFDYiw0QkFBNEI7QUFDNUIsU0FBUztBQUNULHdDQUF3QztBQUN4Qyw0Q0FBNEM7QUFDNUMsUUFBUTtBQUVSLElBQUksaUJBQWlCLENBQUMsR0FBRyxFQUFFLDBCQUEwQixFQUFFO0lBQ3JELFdBQVcsRUFBRSxLQUFLO0lBQ2xCLEdBQUcsRUFBRTtRQUNILE1BQU0sRUFBRSxXQUFXO1FBQ25CLE9BQU8sRUFBRSxjQUFjO0tBQ3hCO0lBQ0QsT0FBTyxFQUFFLHVCQUF1QjtJQUNoQyxPQUFPLEVBQUU7UUFDUCxJQUFJLEVBQUUsMEJBQTBCO1FBQ2hDLE1BQU0sRUFBRSxTQUFTO1FBQ2pCLFNBQVMsRUFBRSxjQUFjO1FBQ3pCLGNBQWMsRUFBRSxxRkFBcUY7S0FDdEc7SUFDRCwyQ0FBMkM7SUFDM0MsTUFBTSxFQUFFO1FBQ04sVUFBVSxFQUFFLGFBQWE7UUFDekIsUUFBUSxFQUFFLGNBQWM7UUFDeEIsWUFBWSxFQUFFLHVCQUF1QjtRQUNyQyxjQUFjLEVBQUUscUZBQXFGO0tBQ3RHO0NBQ0YsQ0FBQyxDQUFDO0FBRUgsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU3RhY2tQcm9wcywgU3RhY2ssIEFwcCwgUmVtb3ZhbFBvbGljeSwgQ2ZuT3V0cHV0IH0gZnJvbSAnQGF3cy1jZGsvY29yZSc7XG5pbXBvcnQgbG9ncyA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1sb2dzJyk7XG5pbXBvcnQgeyBBbGZDZGtSZXN0QXBpLCBEb21haW4gfSBmcm9tICcuL2xpYi9BbGZDZGtSZXN0QXBpJztcbmltcG9ydCB7IEFsZkNka1RhYmxlcyB9IGZyb20gJy4vbGliL0FsZkNka1RhYmxlcyc7XG5pbXBvcnQgeyBBbGZDZGtMYW1iZGFzIH0gZnJvbSAnLi9saWIvQWxmQ2RrTGFtYmRhcyc7XG5pbXBvcnQgeyBBbGZDZGtTdGVwRnVuY3Rpb25zIH0gZnJvbSAnLi9saWIvQWxmQ2RrU3RlcEZ1bmN0aW9ucyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQWxmSW5zdGFuY2VzU3RhY2tQcm9wcyBleHRlbmRzIFN0YWNrUHJvcHMge1xuICBpbWFnZUlkPzogc3RyaW5nLFxuICBzd2FnZ2VyPzoge1xuICAgIGZpbGU6IHN0cmluZyxcbiAgICBkb21haW46IHN0cmluZyxcbiAgICBzdWJkb21haW46IHN0cmluZyxcbiAgICBjZXJ0aWZpY2F0ZUFybjogc3RyaW5nXG4gIH1cbiAgLy8gc3dhZ2dlckZpbGU/OiBzdHJpbmcsXG4gIGVudmlyb25tZW50OiBzdHJpbmdcbiAgZG9tYWluPzogRG9tYWluXG59XG5cbmV4cG9ydCBjbGFzcyBBbGZJbnN0YW5jZXNTdGFjayBleHRlbmRzIFN0YWNrIHtcbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIGlkOiBzdHJpbmcsIHByb3BzPzogQWxmSW5zdGFuY2VzU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKGFwcCwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IGxhbWJkYXMgPSBuZXcgQWxmQ2RrTGFtYmRhcyh0aGlzLCBwcm9wcyk7XG5cbiAgICBuZXcgQWxmQ2RrVGFibGVzKHRoaXMsIGxhbWJkYXMpO1xuXG4gICAgbmV3IEFsZkNka1Jlc3RBcGkodGhpcywgbGFtYmRhcywgcHJvcHMpO1xuXG4gICAgY29uc3Qgc3RlcEZ1bmN0aW9ucyA9IG5ldyBBbGZDZGtTdGVwRnVuY3Rpb25zKHRoaXMsIGxhbWJkYXMpO1xuXG4gICAgbGFtYmRhcy5jcmVhdGVPbmVBcGkuYWRkRW52aXJvbm1lbnQoJ1NUQVRFX01BQ0hJTkVfQVJOJywgc3RlcEZ1bmN0aW9ucy5jcmVhdGVTdGF0ZU1hY2hpbmUuc3RhdGVNYWNoaW5lQXJuKTtcbiAgICBsYW1iZGFzLnVwZGF0ZU9uZUFwaS5hZGRFbnZpcm9ubWVudCgnU1RBVEVfTUFDSElORV9BUk4nLCBzdGVwRnVuY3Rpb25zLnVwZGF0ZVN0YXRlTWFjaGluZS5zdGF0ZU1hY2hpbmVBcm4pXG5cbiAgICAvLyBDb25maWd1cmUgbG9nIGdyb3VwIGZvciBzaG9ydCByZXRlbnRpb25cbiAgICBjb25zdCBsb2dHcm91cCA9IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdMb2dHcm91cCcsIHtcbiAgICAgIHJldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9EQVksXG4gICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBsb2dHcm91cE5hbWU6ICcvYXdzL2xhbWJkYS9jdXN0b20vJyArIHRoaXMuc3RhY2tOYW1lXG4gICAgfSk7XG5cbiAgICBjb25zdCBsZ3N0cmVhbSA9IGxvZ0dyb3VwLmFkZFN0cmVhbSgnbXlsb2dncm91cFN0cmVhbScpXG5cbiAgICBuZXcgQ2ZuT3V0cHV0KHRoaXMsICdMb2dHcm91cE5hbWUnLCB7XG4gICAgICB2YWx1ZTogbG9nR3JvdXAubG9nR3JvdXBOYW1lXG4gICAgfSk7XG5cbiAgICBuZXcgQ2ZuT3V0cHV0KHRoaXMsICdMb2dHcm91cFN0cmVhbU5hbWUnLCB7XG4gICAgICB2YWx1ZTogbGdzdHJlYW0ubG9nU3RyZWFtTmFtZVxuICAgIH0pO1xuICB9XG59XG5cbmNvbnN0IGFwcCA9IG5ldyBBcHAoKTtcblxuLy8gbmV3IEFsZkluc3RhbmNlc1N0YWNrKGFwcCwgXCJBbGZJbnN0YW5jZXNTdGFja0V1V2VzdDFcIiwge1xuLy8gICAgIGVudmlyb25tZW50OiAncHJvZCcsXG4vLyAgICAgZW52OiB7XG4vLyAgICAgICByZWdpb246IFwiZXUtd2VzdC0xXCJcbi8vICAgICB9LFxuLy8gICAgIGltYWdlSWQ6ICdhbWktMDRkNWNjOWI4OGY5ZDFkMzknLFxuLy8gICAgIHN3YWdnZXJGaWxlOiAndG1wL3N3YWdnZXJfZnVsbF8ueWFtbCdcbi8vICAgfSk7XG5cbm5ldyBBbGZJbnN0YW5jZXNTdGFjayhhcHAsIFwiQWxmSW5zdGFuY2VzU3RhY2tFdVdlc3QyXCIsIHtcbiAgZW52aXJvbm1lbnQ6ICdkZXYnLFxuICBlbnY6IHtcbiAgICByZWdpb246ICdldS13ZXN0LTInLFxuICAgIGFjY291bnQ6ICc2MDk4NDExODI1MzInXG4gIH0sXG4gIGltYWdlSWQ6ICdhbWktMGNiNzkwMzA4Zjc1OTFmYTYnLFxuICBzd2FnZ2VyOiB7XG4gICAgZmlsZTogJy4uL3RtcC9zd2FnZ2VyX2Z1bGwueWFtbCcsXG4gICAgZG9tYWluOiAnaC1vLmRldicsXG4gICAgc3ViZG9tYWluOiAnYXBpLWV4cGxvcmVyJyxcbiAgICBjZXJ0aWZpY2F0ZUFybjogJ2Fybjphd3M6YWNtOnVzLWVhc3QtMTo2MDk4NDExODI1MzI6Y2VydGlmaWNhdGUvZjI5OWI3NWItZjIyYy00MDRkLTk4ZjItODk1MjlmNGQyYzk2J1xuICB9LFxuICAvLyBzd2FnZ2VyRmlsZTogJy4uL3RtcC9zd2FnZ2VyX2Z1bGwueWFtbCcsXG4gIGRvbWFpbjoge1xuICAgIGRvbWFpbk5hbWU6ICdhcGkuaC1vLmRldicsXG4gICAgem9uZU5hbWU6ICdhcGkuaC1vLmRldi4nLFxuICAgIGhvc3RlZFpvbmVJZDogJ1owMTQ4NjUyMVo4MTNFTVNLTldOSCcsXG4gICAgY2VydGlmaWNhdGVBcm46ICdhcm46YXdzOmFjbTpldS13ZXN0LTI6NjA5ODQxMTgyNTMyOmNlcnRpZmljYXRlLzg2MTZlNGUzLTg1NzAtNDJkYi05Y2JkLTZlNmU3NmRhM2M1ZidcbiAgfVxufSk7XG5cbmFwcC5zeW50aCgpO1xuIl19