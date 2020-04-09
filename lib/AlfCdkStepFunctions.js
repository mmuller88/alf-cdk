"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@aws-cdk/core");
const aws_stepfunctions_1 = require("@aws-cdk/aws-stepfunctions");
const aws_stepfunctions_tasks_1 = require("@aws-cdk/aws-stepfunctions-tasks");
;
class AlfCdkStepFunctions {
    constructor(scope, lambdas) {
        const checkCreationAllowance = new aws_stepfunctions_1.Task(scope, 'Check Creation Allowance', {
            task: new aws_stepfunctions_tasks_1.InvokeFunction(lambdas.checkCreationAllowanceLambda),
        });
        const insertItem = new aws_stepfunctions_1.Task(scope, 'Create Item', {
            task: new aws_stepfunctions_tasks_1.InvokeFunction(lambdas.putOneItemLambda),
            inputPath: '$.item'
        });
        const createInstance = new aws_stepfunctions_1.Task(scope, 'Create Instance', {
            task: new aws_stepfunctions_tasks_1.InvokeFunction(lambdas.createInstanceLambda),
            inputPath: '$.item'
        });
        // const createdInstanceUpdate = new sfn.Task(this, 'Created Instance Update', {
        //   task: new sfn_tasks.InvokeFunction(createOneLambda),
        //   inputPath: '$.item'
        // });
        const waitX = new aws_stepfunctions_1.Wait(scope, 'Wait X Seconds', {
            time: aws_stepfunctions_1.WaitTime.duration(core_1.Duration.seconds(5)),
        });
        // const getStatus = new sfn.Task(this, 'Get Job Status', {
        //   task: new sfn_tasks.InvokeActivity(checkJobActivity),
        //   inputPath: '$.guid',
        //   resultPath: '$.status',
        // });
        const isAllowed = new aws_stepfunctions_1.Choice(scope, 'Creation Allowed?');
        const notAllowed = new aws_stepfunctions_1.Fail(scope, 'Not Allowed', {
            cause: 'Creation failed',
            error: 'Job returned failed',
        });
        // const finalStatus = new sfn.Task(this, 'Get Final Job Status', {
        //   task: new sfn_tasks.InvokeActivity(checkJobActivity),
        //   inputPath: '$.guid',
        // });
        const creationChain = aws_stepfunctions_1.Chain.start(checkCreationAllowance)
            .next(isAllowed
            .when(aws_stepfunctions_1.Condition.stringEquals('$.result', 'failed'), notAllowed)
            .when(aws_stepfunctions_1.Condition.stringEquals('$.result', 'ok'), insertItem.next(createInstance))
            .otherwise(waitX));
        // .next(getStatus)
        // .next(
        //   isComplete
        //     .when(sfn.Condition.stringEquals('$.status', 'FAILED'), jobFailed)
        //     .when(sfn.Condition.stringEquals('$.status', 'SUCCEEDED'), finalStatus)
        //     .otherwise(waitX),
        // );
        const updateItem = new aws_stepfunctions_1.Task(scope, 'Update Item', {
            task: new aws_stepfunctions_tasks_1.InvokeFunction(lambdas.putOneItemLambda),
            inputPath: '$.item'
        });
        const updateChain = aws_stepfunctions_1.Chain.start(updateItem);
        this.createStateMachine = new aws_stepfunctions_1.StateMachine(scope, 'CreateStateMachine', {
            definition: creationChain,
            timeout: core_1.Duration.seconds(30),
        });
        this.updateStateMachine = new aws_stepfunctions_1.StateMachine(scope, 'UpdateStateMachine', {
            definition: updateChain,
            timeout: core_1.Duration.seconds(30),
        });
        this.createStateMachine.grantStartExecution(lambdas.createOneApi);
        this.updateStateMachine.grantStartExecution(lambdas.updateOneApi);
    }
}
exports.AlfCdkStepFunctions = AlfCdkStepFunctions;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWxmQ2RrU3RlcEZ1bmN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkFsZkNka1N0ZXBGdW5jdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx3Q0FBZ0Q7QUFDaEQsa0VBQStHO0FBQy9HLDhFQUFtRTtBQU1sRSxDQUFDO0FBRUYsTUFBYSxtQkFBbUI7SUFJOUIsWUFBWSxLQUFZLEVBQUUsT0FBc0I7UUFDOUMsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLHdCQUFJLENBQUMsS0FBSyxFQUFFLDBCQUEwQixFQUFFO1lBQ3pFLElBQUksRUFBRSxJQUFJLHdDQUFjLENBQUMsT0FBTyxDQUFDLDRCQUE0QixDQUFDO1NBQy9ELENBQUMsQ0FBQztRQUVILE1BQU0sVUFBVSxHQUFHLElBQUksd0JBQUksQ0FBQyxLQUFLLEVBQUUsYUFBYSxFQUFFO1lBQ2hELElBQUksRUFBRSxJQUFJLHdDQUFjLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDO1lBQ2xELFNBQVMsRUFBRSxRQUFRO1NBQ3BCLENBQUMsQ0FBQztRQUVILE1BQU0sY0FBYyxHQUFHLElBQUksd0JBQUksQ0FBQyxLQUFLLEVBQUUsaUJBQWlCLEVBQUU7WUFDeEQsSUFBSSxFQUFFLElBQUksd0NBQWMsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQUM7WUFDdEQsU0FBUyxFQUFFLFFBQVE7U0FDcEIsQ0FBQyxDQUFDO1FBRUgsZ0ZBQWdGO1FBQ2hGLHlEQUF5RDtRQUN6RCx3QkFBd0I7UUFDeEIsTUFBTTtRQUVOLE1BQU0sS0FBSyxHQUFHLElBQUksd0JBQUksQ0FBQyxLQUFLLEVBQUUsZ0JBQWdCLEVBQUU7WUFDOUMsSUFBSSxFQUFFLDRCQUFRLENBQUMsUUFBUSxDQUFDLGVBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDN0MsQ0FBQyxDQUFDO1FBRUgsMkRBQTJEO1FBQzNELDBEQUEwRDtRQUMxRCx5QkFBeUI7UUFDekIsNEJBQTRCO1FBQzVCLE1BQU07UUFDTixNQUFNLFNBQVMsR0FBRyxJQUFJLDBCQUFNLENBQUMsS0FBSyxFQUFFLG1CQUFtQixDQUFDLENBQUM7UUFDekQsTUFBTSxVQUFVLEdBQUcsSUFBSSx3QkFBSSxDQUFDLEtBQUssRUFBRSxhQUFhLEVBQUU7WUFDaEQsS0FBSyxFQUFFLGlCQUFpQjtZQUN4QixLQUFLLEVBQUUscUJBQXFCO1NBQzdCLENBQUMsQ0FBQztRQUVILG1FQUFtRTtRQUNuRSwwREFBMEQ7UUFDMUQseUJBQXlCO1FBQ3pCLE1BQU07UUFFTixNQUFNLGFBQWEsR0FBRyx5QkFBSyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQzthQUN0RCxJQUFJLENBQUMsU0FBUzthQUNkLElBQUksQ0FBQyw2QkFBUyxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLEVBQUUsVUFBVSxDQUFDO2FBQzlELElBQUksQ0FBQyw2QkFBUyxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQzthQUMvRSxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUUsQ0FBQztRQUN0QixtQkFBbUI7UUFDbkIsU0FBUztRQUNULGVBQWU7UUFDZix5RUFBeUU7UUFDekUsOEVBQThFO1FBQzlFLHlCQUF5QjtRQUN6QixLQUFLO1FBRUwsTUFBTSxVQUFVLEdBQUcsSUFBSSx3QkFBSSxDQUFDLEtBQUssRUFBRSxhQUFhLEVBQUU7WUFDaEQsSUFBSSxFQUFFLElBQUksd0NBQWMsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUM7WUFDbEQsU0FBUyxFQUFFLFFBQVE7U0FDcEIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxXQUFXLEdBQUcseUJBQUssQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUE7UUFFM0MsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksZ0NBQVksQ0FBQyxLQUFLLEVBQUUsb0JBQW9CLEVBQUU7WUFDdEUsVUFBVSxFQUFFLGFBQWE7WUFDekIsT0FBTyxFQUFFLGVBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1NBQzlCLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLGdDQUFZLENBQUMsS0FBSyxFQUFFLG9CQUFvQixFQUFFO1lBQ3RFLFVBQVUsRUFBRSxXQUFXO1lBQ3ZCLE9BQU8sRUFBRSxlQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztTQUM5QixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsa0JBQWtCLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ2xFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7SUFFcEUsQ0FBQztDQUNGO0FBOUVELGtEQThFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFN0YWNrLCBEdXJhdGlvbiB9IGZyb20gJ0Bhd3MtY2RrL2NvcmUnO1xuaW1wb3J0IHsgU3RhdGVNYWNoaW5lLCBUYXNrLCBXYWl0LCBXYWl0VGltZSwgQ2hhaW4sIENob2ljZSwgQ29uZGl0aW9uLCBGYWlsfSBmcm9tICdAYXdzLWNkay9hd3Mtc3RlcGZ1bmN0aW9ucyc7XG5pbXBvcnQgeyBJbnZva2VGdW5jdGlvbiwgfSBmcm9tICdAYXdzLWNkay9hd3Mtc3RlcGZ1bmN0aW9ucy10YXNrcyc7XG5pbXBvcnQgeyBBbGZDZGtMYW1iZGFzIH0gZnJvbSAnLi9BbGZDZGtMYW1iZGFzJztcblxuZXhwb3J0IGludGVyZmFjZSBBbGZDZGtTdGVwRnVuY3Rpb25zSW50ZXJmYWNlIHtcbiAgcmVhZG9ubHkgY3JlYXRlU3RhdGVNYWNoaW5lOiBTdGF0ZU1hY2hpbmUsXG4gIHJlYWRvbmx5IHVwZGF0ZVN0YXRlTWFjaGluZTogU3RhdGVNYWNoaW5lXG59O1xuXG5leHBvcnQgY2xhc3MgQWxmQ2RrU3RlcEZ1bmN0aW9ucyBpbXBsZW1lbnRzIEFsZkNka1N0ZXBGdW5jdGlvbnNJbnRlcmZhY2V7XG4gIGNyZWF0ZVN0YXRlTWFjaGluZTogU3RhdGVNYWNoaW5lO1xuICB1cGRhdGVTdGF0ZU1hY2hpbmU6IFN0YXRlTWFjaGluZTtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogU3RhY2ssIGxhbWJkYXM6IEFsZkNka0xhbWJkYXMpe1xuICAgIGNvbnN0IGNoZWNrQ3JlYXRpb25BbGxvd2FuY2UgPSBuZXcgVGFzayhzY29wZSwgJ0NoZWNrIENyZWF0aW9uIEFsbG93YW5jZScsIHtcbiAgICAgIHRhc2s6IG5ldyBJbnZva2VGdW5jdGlvbihsYW1iZGFzLmNoZWNrQ3JlYXRpb25BbGxvd2FuY2VMYW1iZGEpLFxuICAgIH0pO1xuXG4gICAgY29uc3QgaW5zZXJ0SXRlbSA9IG5ldyBUYXNrKHNjb3BlLCAnQ3JlYXRlIEl0ZW0nLCB7XG4gICAgICB0YXNrOiBuZXcgSW52b2tlRnVuY3Rpb24obGFtYmRhcy5wdXRPbmVJdGVtTGFtYmRhKSxcbiAgICAgIGlucHV0UGF0aDogJyQuaXRlbSdcbiAgICB9KTtcblxuICAgIGNvbnN0IGNyZWF0ZUluc3RhbmNlID0gbmV3IFRhc2soc2NvcGUsICdDcmVhdGUgSW5zdGFuY2UnLCB7XG4gICAgICB0YXNrOiBuZXcgSW52b2tlRnVuY3Rpb24obGFtYmRhcy5jcmVhdGVJbnN0YW5jZUxhbWJkYSksXG4gICAgICBpbnB1dFBhdGg6ICckLml0ZW0nXG4gICAgfSk7XG5cbiAgICAvLyBjb25zdCBjcmVhdGVkSW5zdGFuY2VVcGRhdGUgPSBuZXcgc2ZuLlRhc2sodGhpcywgJ0NyZWF0ZWQgSW5zdGFuY2UgVXBkYXRlJywge1xuICAgIC8vICAgdGFzazogbmV3IHNmbl90YXNrcy5JbnZva2VGdW5jdGlvbihjcmVhdGVPbmVMYW1iZGEpLFxuICAgIC8vICAgaW5wdXRQYXRoOiAnJC5pdGVtJ1xuICAgIC8vIH0pO1xuXG4gICAgY29uc3Qgd2FpdFggPSBuZXcgV2FpdChzY29wZSwgJ1dhaXQgWCBTZWNvbmRzJywge1xuICAgICAgdGltZTogV2FpdFRpbWUuZHVyYXRpb24oRHVyYXRpb24uc2Vjb25kcyg1KSksXG4gICAgfSk7XG5cbiAgICAvLyBjb25zdCBnZXRTdGF0dXMgPSBuZXcgc2ZuLlRhc2sodGhpcywgJ0dldCBKb2IgU3RhdHVzJywge1xuICAgIC8vICAgdGFzazogbmV3IHNmbl90YXNrcy5JbnZva2VBY3Rpdml0eShjaGVja0pvYkFjdGl2aXR5KSxcbiAgICAvLyAgIGlucHV0UGF0aDogJyQuZ3VpZCcsXG4gICAgLy8gICByZXN1bHRQYXRoOiAnJC5zdGF0dXMnLFxuICAgIC8vIH0pO1xuICAgIGNvbnN0IGlzQWxsb3dlZCA9IG5ldyBDaG9pY2Uoc2NvcGUsICdDcmVhdGlvbiBBbGxvd2VkPycpO1xuICAgIGNvbnN0IG5vdEFsbG93ZWQgPSBuZXcgRmFpbChzY29wZSwgJ05vdCBBbGxvd2VkJywge1xuICAgICAgY2F1c2U6ICdDcmVhdGlvbiBmYWlsZWQnLFxuICAgICAgZXJyb3I6ICdKb2IgcmV0dXJuZWQgZmFpbGVkJyxcbiAgICB9KTtcblxuICAgIC8vIGNvbnN0IGZpbmFsU3RhdHVzID0gbmV3IHNmbi5UYXNrKHRoaXMsICdHZXQgRmluYWwgSm9iIFN0YXR1cycsIHtcbiAgICAvLyAgIHRhc2s6IG5ldyBzZm5fdGFza3MuSW52b2tlQWN0aXZpdHkoY2hlY2tKb2JBY3Rpdml0eSksXG4gICAgLy8gICBpbnB1dFBhdGg6ICckLmd1aWQnLFxuICAgIC8vIH0pO1xuXG4gICAgY29uc3QgY3JlYXRpb25DaGFpbiA9IENoYWluLnN0YXJ0KGNoZWNrQ3JlYXRpb25BbGxvd2FuY2UpXG4gICAgICAubmV4dChpc0FsbG93ZWRcbiAgICAgIC53aGVuKENvbmRpdGlvbi5zdHJpbmdFcXVhbHMoJyQucmVzdWx0JywgJ2ZhaWxlZCcpLCBub3RBbGxvd2VkKVxuICAgICAgLndoZW4oQ29uZGl0aW9uLnN0cmluZ0VxdWFscygnJC5yZXN1bHQnLCAnb2snKSwgaW5zZXJ0SXRlbS5uZXh0KGNyZWF0ZUluc3RhbmNlKSlcbiAgICAgIC5vdGhlcndpc2Uod2FpdFgpICk7XG4gICAgLy8gLm5leHQoZ2V0U3RhdHVzKVxuICAgIC8vIC5uZXh0KFxuICAgIC8vICAgaXNDb21wbGV0ZVxuICAgIC8vICAgICAud2hlbihzZm4uQ29uZGl0aW9uLnN0cmluZ0VxdWFscygnJC5zdGF0dXMnLCAnRkFJTEVEJyksIGpvYkZhaWxlZClcbiAgICAvLyAgICAgLndoZW4oc2ZuLkNvbmRpdGlvbi5zdHJpbmdFcXVhbHMoJyQuc3RhdHVzJywgJ1NVQ0NFRURFRCcpLCBmaW5hbFN0YXR1cylcbiAgICAvLyAgICAgLm90aGVyd2lzZSh3YWl0WCksXG4gICAgLy8gKTtcblxuICAgIGNvbnN0IHVwZGF0ZUl0ZW0gPSBuZXcgVGFzayhzY29wZSwgJ1VwZGF0ZSBJdGVtJywge1xuICAgICAgdGFzazogbmV3IEludm9rZUZ1bmN0aW9uKGxhbWJkYXMucHV0T25lSXRlbUxhbWJkYSksXG4gICAgICBpbnB1dFBhdGg6ICckLml0ZW0nXG4gICAgfSk7XG5cbiAgICBjb25zdCB1cGRhdGVDaGFpbiA9IENoYWluLnN0YXJ0KHVwZGF0ZUl0ZW0pXG5cbiAgICB0aGlzLmNyZWF0ZVN0YXRlTWFjaGluZSA9IG5ldyBTdGF0ZU1hY2hpbmUoc2NvcGUsICdDcmVhdGVTdGF0ZU1hY2hpbmUnLCB7XG4gICAgICBkZWZpbml0aW9uOiBjcmVhdGlvbkNoYWluLFxuICAgICAgdGltZW91dDogRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSk7XG5cbiAgICB0aGlzLnVwZGF0ZVN0YXRlTWFjaGluZSA9IG5ldyBTdGF0ZU1hY2hpbmUoc2NvcGUsICdVcGRhdGVTdGF0ZU1hY2hpbmUnLCB7XG4gICAgICBkZWZpbml0aW9uOiB1cGRhdGVDaGFpbixcbiAgICAgIHRpbWVvdXQ6IER1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pO1xuXG4gICAgdGhpcy5jcmVhdGVTdGF0ZU1hY2hpbmUuZ3JhbnRTdGFydEV4ZWN1dGlvbihsYW1iZGFzLmNyZWF0ZU9uZUFwaSk7XG4gICAgdGhpcy51cGRhdGVTdGF0ZU1hY2hpbmUuZ3JhbnRTdGFydEV4ZWN1dGlvbihsYW1iZGFzLnVwZGF0ZU9uZUFwaSk7XG5cbiAgfVxufVxuIl19