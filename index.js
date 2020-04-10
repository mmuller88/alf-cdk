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
        region: "eu-west-2"
    },
    imageId: 'ami-0cb790308f7591fa6',
    swagger: {
        file: '../tmp/swagger_full.yaml',
        domain: 'h-o.dev',
        subdomain: 'api-explorer'
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHdDQUFpRjtBQUNqRiwwQ0FBMkM7QUFDM0MsdURBQTREO0FBQzVELHFEQUFrRDtBQUNsRCx1REFBb0Q7QUFDcEQsbUVBQWdFO0FBY2hFLE1BQWEsaUJBQWtCLFNBQVEsWUFBSztJQUMxQyxZQUFZLEdBQVEsRUFBRSxFQUFVLEVBQUUsS0FBOEI7UUFDOUQsS0FBSyxDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFdEIsTUFBTSxPQUFPLEdBQUcsSUFBSSw2QkFBYSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUUvQyxJQUFJLDJCQUFZLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRWhDLElBQUksNkJBQWEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhDLE1BQU0sYUFBYSxHQUFHLElBQUkseUNBQW1CLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRTdELE9BQU8sQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLG1CQUFtQixFQUFFLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUMzRyxPQUFPLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsRUFBRSxhQUFhLENBQUMsa0JBQWtCLENBQUMsZUFBZSxDQUFDLENBQUE7UUFFMUcsMENBQTBDO1FBQzFDLE1BQU0sUUFBUSxHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFO1lBQ25ELFNBQVMsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU87WUFDckMsYUFBYSxFQUFFLG9CQUFhLENBQUMsT0FBTztZQUNwQyxZQUFZLEVBQUUscUJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVM7U0FDckQsQ0FBQyxDQUFDO1FBRUgsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBRXZELElBQUksZ0JBQVMsQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ2xDLEtBQUssRUFBRSxRQUFRLENBQUMsWUFBWTtTQUM3QixDQUFDLENBQUM7UUFFSCxJQUFJLGdCQUFTLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQ3hDLEtBQUssRUFBRSxRQUFRLENBQUMsYUFBYTtTQUM5QixDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUFoQ0QsOENBZ0NDO0FBRUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxVQUFHLEVBQUUsQ0FBQztBQUV0QiwyREFBMkQ7QUFDM0QsMkJBQTJCO0FBQzNCLGFBQWE7QUFDYiw0QkFBNEI7QUFDNUIsU0FBUztBQUNULHdDQUF3QztBQUN4Qyw0Q0FBNEM7QUFDNUMsUUFBUTtBQUVSLElBQUksaUJBQWlCLENBQUMsR0FBRyxFQUFFLDBCQUEwQixFQUFFO0lBQ3JELFdBQVcsRUFBRSxLQUFLO0lBQ2xCLEdBQUcsRUFBRTtRQUNILE1BQU0sRUFBRSxXQUFXO0tBQ3BCO0lBQ0QsT0FBTyxFQUFFLHVCQUF1QjtJQUNoQyxPQUFPLEVBQUU7UUFDUCxJQUFJLEVBQUUsMEJBQTBCO1FBQ2hDLE1BQU0sRUFBRSxTQUFTO1FBQ2pCLFNBQVMsRUFBRSxjQUFjO0tBQzFCO0lBQ0QsMkNBQTJDO0lBQzNDLE1BQU0sRUFBRTtRQUNOLFVBQVUsRUFBRSxhQUFhO1FBQ3pCLFFBQVEsRUFBRSxjQUFjO1FBQ3hCLFlBQVksRUFBRSx1QkFBdUI7UUFDckMsY0FBYyxFQUFFLHFGQUFxRjtLQUN0RztDQUNGLENBQUMsQ0FBQztBQUVILEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFN0YWNrUHJvcHMsIFN0YWNrLCBBcHAsIFJlbW92YWxQb2xpY3ksIENmbk91dHB1dCB9IGZyb20gJ0Bhd3MtY2RrL2NvcmUnO1xuaW1wb3J0IGxvZ3MgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtbG9ncycpO1xuaW1wb3J0IHsgQWxmQ2RrUmVzdEFwaSwgRG9tYWluIH0gZnJvbSAnLi9saWIvQWxmQ2RrUmVzdEFwaSc7XG5pbXBvcnQgeyBBbGZDZGtUYWJsZXMgfSBmcm9tICcuL2xpYi9BbGZDZGtUYWJsZXMnO1xuaW1wb3J0IHsgQWxmQ2RrTGFtYmRhcyB9IGZyb20gJy4vbGliL0FsZkNka0xhbWJkYXMnO1xuaW1wb3J0IHsgQWxmQ2RrU3RlcEZ1bmN0aW9ucyB9IGZyb20gJy4vbGliL0FsZkNka1N0ZXBGdW5jdGlvbnMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEFsZkluc3RhbmNlc1N0YWNrUHJvcHMgZXh0ZW5kcyBTdGFja1Byb3BzIHtcbiAgaW1hZ2VJZD86IHN0cmluZyxcbiAgc3dhZ2dlcj86IHtcbiAgICBmaWxlOiBzdHJpbmcsXG4gICAgZG9tYWluOiBzdHJpbmcsXG4gICAgc3ViZG9tYWluOiBzdHJpbmdcbiAgfVxuICAvLyBzd2FnZ2VyRmlsZT86IHN0cmluZyxcbiAgZW52aXJvbm1lbnQ6IHN0cmluZ1xuICBkb21haW4/OiBEb21haW5cbn1cblxuZXhwb3J0IGNsYXNzIEFsZkluc3RhbmNlc1N0YWNrIGV4dGVuZHMgU3RhY2sge1xuICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgaWQ6IHN0cmluZywgcHJvcHM/OiBBbGZJbnN0YW5jZXNTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoYXBwLCBpZCwgcHJvcHMpO1xuXG4gICAgY29uc3QgbGFtYmRhcyA9IG5ldyBBbGZDZGtMYW1iZGFzKHRoaXMsIHByb3BzKTtcblxuICAgIG5ldyBBbGZDZGtUYWJsZXModGhpcywgbGFtYmRhcyk7XG5cbiAgICBuZXcgQWxmQ2RrUmVzdEFwaSh0aGlzLCBsYW1iZGFzLCBwcm9wcyk7XG5cbiAgICBjb25zdCBzdGVwRnVuY3Rpb25zID0gbmV3IEFsZkNka1N0ZXBGdW5jdGlvbnModGhpcywgbGFtYmRhcyk7XG5cbiAgICBsYW1iZGFzLmNyZWF0ZU9uZUFwaS5hZGRFbnZpcm9ubWVudCgnU1RBVEVfTUFDSElORV9BUk4nLCBzdGVwRnVuY3Rpb25zLmNyZWF0ZVN0YXRlTWFjaGluZS5zdGF0ZU1hY2hpbmVBcm4pO1xuICAgIGxhbWJkYXMudXBkYXRlT25lQXBpLmFkZEVudmlyb25tZW50KCdTVEFURV9NQUNISU5FX0FSTicsIHN0ZXBGdW5jdGlvbnMudXBkYXRlU3RhdGVNYWNoaW5lLnN0YXRlTWFjaGluZUFybilcblxuICAgIC8vIENvbmZpZ3VyZSBsb2cgZ3JvdXAgZm9yIHNob3J0IHJldGVudGlvblxuICAgIGNvbnN0IGxvZ0dyb3VwID0gbmV3IGxvZ3MuTG9nR3JvdXAodGhpcywgJ0xvZ0dyb3VwJywge1xuICAgICAgcmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX0RBWSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGxvZ0dyb3VwTmFtZTogJy9hd3MvbGFtYmRhL2N1c3RvbS8nICsgdGhpcy5zdGFja05hbWVcbiAgICB9KTtcblxuICAgIGNvbnN0IGxnc3RyZWFtID0gbG9nR3JvdXAuYWRkU3RyZWFtKCdteWxvZ2dyb3VwU3RyZWFtJylcblxuICAgIG5ldyBDZm5PdXRwdXQodGhpcywgJ0xvZ0dyb3VwTmFtZScsIHtcbiAgICAgIHZhbHVlOiBsb2dHcm91cC5sb2dHcm91cE5hbWVcbiAgICB9KTtcblxuICAgIG5ldyBDZm5PdXRwdXQodGhpcywgJ0xvZ0dyb3VwU3RyZWFtTmFtZScsIHtcbiAgICAgIHZhbHVlOiBsZ3N0cmVhbS5sb2dTdHJlYW1OYW1lXG4gICAgfSk7XG4gIH1cbn1cblxuY29uc3QgYXBwID0gbmV3IEFwcCgpO1xuXG4vLyBuZXcgQWxmSW5zdGFuY2VzU3RhY2soYXBwLCBcIkFsZkluc3RhbmNlc1N0YWNrRXVXZXN0MVwiLCB7XG4vLyAgICAgZW52aXJvbm1lbnQ6ICdwcm9kJyxcbi8vICAgICBlbnY6IHtcbi8vICAgICAgIHJlZ2lvbjogXCJldS13ZXN0LTFcIlxuLy8gICAgIH0sXG4vLyAgICAgaW1hZ2VJZDogJ2FtaS0wNGQ1Y2M5Yjg4ZjlkMWQzOScsXG4vLyAgICAgc3dhZ2dlckZpbGU6ICd0bXAvc3dhZ2dlcl9mdWxsXy55YW1sJ1xuLy8gICB9KTtcblxubmV3IEFsZkluc3RhbmNlc1N0YWNrKGFwcCwgXCJBbGZJbnN0YW5jZXNTdGFja0V1V2VzdDJcIiwge1xuICBlbnZpcm9ubWVudDogJ2RldicsXG4gIGVudjoge1xuICAgIHJlZ2lvbjogXCJldS13ZXN0LTJcIlxuICB9LFxuICBpbWFnZUlkOiAnYW1pLTBjYjc5MDMwOGY3NTkxZmE2JyxcbiAgc3dhZ2dlcjoge1xuICAgIGZpbGU6ICcuLi90bXAvc3dhZ2dlcl9mdWxsLnlhbWwnLFxuICAgIGRvbWFpbjogJ2gtby5kZXYnLFxuICAgIHN1YmRvbWFpbjogJ2FwaS1leHBsb3JlcidcbiAgfSxcbiAgLy8gc3dhZ2dlckZpbGU6ICcuLi90bXAvc3dhZ2dlcl9mdWxsLnlhbWwnLFxuICBkb21haW46IHtcbiAgICBkb21haW5OYW1lOiAnYXBpLmgtby5kZXYnLFxuICAgIHpvbmVOYW1lOiAnYXBpLmgtby5kZXYuJyxcbiAgICBob3N0ZWRab25lSWQ6ICdaMDE0ODY1MjFaODEzRU1TS05XTkgnLFxuICAgIGNlcnRpZmljYXRlQXJuOiAnYXJuOmF3czphY206ZXUtd2VzdC0yOjYwOTg0MTE4MjUzMjpjZXJ0aWZpY2F0ZS84NjE2ZTRlMy04NTcwLTQyZGItOWNiZC02ZTZlNzZkYTNjNWYnXG4gIH1cbn0pO1xuXG5hcHAuc3ludGgoKTtcbiJdfQ==