import { Stack, Duration } from '@aws-cdk/core';
import { StateMachine, Task, Wait, WaitTime, Chain, Choice, Condition, Fail} from '@aws-cdk/aws-stepfunctions';
import { InvokeFunction, } from '@aws-cdk/aws-stepfunctions-tasks';
import { AlfCdkLambdas } from './AlfCdkLambdas';
import { AlfInstancesStackProps } from '..';

export interface AlfCdkStepFunctionsInterface {
  readonly createStateMachine: StateMachine,
  readonly updateStateMachine: StateMachine
};

export class AlfCdkStepFunctions implements AlfCdkStepFunctionsInterface{
  createStateMachine: StateMachine;
  updateStateMachine: StateMachine;

  constructor(scope: Stack, lambdas: AlfCdkLambdas, props?: AlfInstancesStackProps){
    const checkCreationAllowance = new Task(scope, 'Check Creation Allowance', {
      task: new InvokeFunction(lambdas.checkCreationAllowanceLambda),
    });

    const insertItem = new Task(scope, 'Create Item', {
      task: new InvokeFunction(lambdas.putOrDeleteOneItemLambda),
      inputPath: '$.item'
    });

    const createInstance = new Task(scope, 'Create Instance', {
      task: new InvokeFunction(lambdas.createInstanceLambda),
      inputPath: '$.item'
    });

    const updateInstanceStatus = new Task(scope, 'Update Instance Status', {
      task: new InvokeFunction(lambdas.executerLambda),
      inputPath: '$.item'
    });

    const stopInstanceCreate = new Task(scope, 'Stop Instance Create', {
      task: new InvokeFunction(lambdas.executerLambda),
      inputPath: '$.item',
      parameters: { 'expectedStatus' : 'stopped' }
    })

    const stopInstanceUpdate = new Task(scope, 'Stop Instance Update', {
      task: new InvokeFunction(lambdas.executerLambda),
      inputPath: '$.item',
      parameters: { 'expectedStatus' : 'stopped' }
    })

    // const createdInstanceUpdate = new sfn.Task(this, 'Created Instance Update', {
    //   task: new sfn_tasks.InvokeFunction(createOneLambda),
    //   inputPath: '$.item'
    // });

    const waitXCreate = new Wait(scope, 'Wait X Create', {
      time: WaitTime.duration(Duration.minutes(props?.createInstances?.automatedStopping?.minutes || 45)),
    });

    const waitXUpdate = new Wait(scope, 'Wait X Update', {
      time: WaitTime.duration(Duration.minutes(props?.createInstances?.automatedStopping?.minutes || 45)),
    });

    // const getStatus = new sfn.Task(this, 'Get Job Status', {
    //   task: new sfn_tasks.InvokeActivity(checkJobActivity),
    //   inputPath: '$.guid',
    //   resultPath: '$.status',
    // });
    const isAllowed = new Choice(scope, 'Creation Allowed?');
    const notAllowed = new Fail(scope, 'Not Allowed', {
      cause: 'Creation failed',
      error: 'Job returned failed',
    });

    // const finalStatus = new sfn.Task(this, 'Get Final Job Status', {
    //   task: new sfn_tasks.InvokeActivity(checkJobActivity),
    //   inputPath: '$.guid',
    // });

    const updateItemCreate = new Task(scope, 'Update Item Create', {
      task: new InvokeFunction(lambdas.putOrDeleteOneItemLambda),
      inputPath: '$.item',
    });

    const updateItemUpdate = new Task(scope, 'Update Item Update', {
      task: new InvokeFunction(lambdas.putOrDeleteOneItemLambda),
      inputPath: '$.item',
    });

    const updateItemUpdate2 = new Task(scope, 'Update Item Update 2', {
      task: new InvokeFunction(lambdas.putOrDeleteOneItemLambda),
      inputPath: '$.item',
    });

    const statusNeedsUpdateCreate = new Choice(scope, 'Status needs update Create?');
    const statusNeedsUpdateUpdate = new Choice(scope, 'Status needs update Update?');
    const statusNeedsUpdateUpdate2 = new Choice(scope, 'Status needs update Update? 2');

    var creationChain = Chain.start(checkCreationAllowance)
      .next(isAllowed
        .when(Condition.stringEquals('$.result', 'failed'), notAllowed)
        .when(Condition.stringEquals('$.result', 'ok'), insertItem
          .next(createInstance
            .next(waitXCreate
              .next(stopInstanceCreate
                .next(statusNeedsUpdateCreate
                  .when(Condition.booleanEquals('$.updateState', true), updateItemCreate)))))));

    var updateChain = Chain.start(updateInstanceStatus)
      .next(statusNeedsUpdateUpdate
        .when(Condition.booleanEquals('$.updateState', true), updateItemUpdate
          .next(waitXUpdate
            .next(stopInstanceUpdate
              .next(statusNeedsUpdateUpdate2
                .when(Condition.booleanEquals('$.updateState', true), updateItemUpdate2))))));

    // if(props?.createInstances?.automatedStopping){
    //   creationChain.next(waitX)
    //   .next(stopInstance)
    //   .next(statusNeedsUpdate
    //     .when(Condition.booleanEquals('$.updateState', true), updateItem));

    //   updateChain.next(waitX)
    //   .next(stopInstance)
    //   .next(statusNeedsUpdate
    //     .when(Condition.booleanEquals('$.updateState', true), updateItem));
    // }
    // .next(getStatus)
    // .next(
    //   isComplete
    //     .when(sfn.Condition.stringEquals('$.status', 'FAILED'), jobFailed)
    //     .when(sfn.Condition.stringEquals('$.status', 'SUCCEEDED'), finalStatus)
    //     .otherwise(waitX),
    // );


    this.createStateMachine = new StateMachine(scope, 'CreateStateMachine', {
      definition: creationChain,
      timeout: Duration.seconds(30),
    });

    this.updateStateMachine = new StateMachine(scope, 'UpdateStateMachine', {
      definition: updateChain,
      timeout: Duration.seconds(30),
    });

    this.createStateMachine.grantStartExecution(lambdas.createOneApi);
    this.updateStateMachine.grantStartExecution(lambdas.updateOneApi);

  }
}
