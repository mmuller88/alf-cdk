import { Table, AttributeType, StreamViewType } from '@aws-cdk/aws-dynamodb';
import { RemovalPolicy, CfnOutput } from '@aws-cdk/core';
import { AlfCdkLambdas } from './alf-cdk-lambdas';
import { instanceTable } from '../src/statics';
// import { DynamoDBStreamToLambda } from '@aws-solutions-constructs/aws-dynamodb-stream-lambda';
import { DynamoEventSource } from '@aws-cdk/aws-lambda-event-sources';
import { StartingPosition } from '@aws-cdk/aws-lambda';
import { LambdaToDynamoDB } from '@aws-solutions-constructs/aws-lambda-dynamodb';
import { CustomStack } from 'alf-cdk-app-pipeline/custom-stack';
// import { StartingPosition } from '@aws-cdk/aws-lambda';

export interface AlfCdkTablesInterface {
  readonly dynamoInstanceTable: Table,
  // readonly dynamoStaticTable: Table,
  // readonly dynamoRepoTable: Table,
};

export class AlfCdkTables implements AlfCdkTablesInterface{
  dynamoInstanceTable: Table;
  // dynamoStaticTable: Table;
  // dynamoRepoTable: Table;

  constructor(scope: CustomStack, lambdas: AlfCdkLambdas){
    this.dynamoInstanceTable = new Table(scope, instanceTable.name, {
      partitionKey: {
        name: instanceTable.userId,
        type: AttributeType.STRING
      },
      sortKey: {
        name: instanceTable.alfInstanceId,
        type: AttributeType.STRING
      },
      tableName: instanceTable.name,
      removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // tslint:disable-next-line: no-unused-expression
    new LambdaToDynamoDB(scope, 'putOrDeleteOneItemToLambdaToDDB', {
      existingLambdaObj: lambdas.putOrDeleteOneItemLambda,
      existingTableObj: this.dynamoInstanceTable
    });

    // tslint:disable-next-line: no-unused-expression
    new LambdaToDynamoDB(scope, 'getAllLambdaToDDB', {
      existingLambdaObj: lambdas.getAllLambda,
      existingTableObj: this.dynamoInstanceTable
    });

    // tslint:disable-next-line: no-unused-expression
    new LambdaToDynamoDB(scope, 'getOneLambdaToDDB', {
      existingLambdaObj: lambdas.getOneLambda,
      existingTableObj: this.dynamoInstanceTable
    });

    // tslint:disable-next-line: no-unused-expression
    new LambdaToDynamoDB(scope, 'checkCreationAllowanceLambdaToDDB', {
      existingLambdaObj: lambdas.checkCreationAllowanceLambda,
      existingTableObj: this.dynamoInstanceTable
    });

    // tslint:disable-next-line: no-unused-expression
    new LambdaToDynamoDB(scope, 'updateOneApiToDDB', {
      existingLambdaObj: lambdas.updateOneApi,
      existingTableObj: this.dynamoInstanceTable
    });

    lambdas.putInFifoSQS.addEventSource(new DynamoEventSource(this.dynamoInstanceTable,  {
      startingPosition: StartingPosition.LATEST,
    }));

    // tslint:disable-next-line: no-unused-expression
    // new DynamoDBStreamToLambda(scope, 'DynamoDBStreamToLambdaToDDB', {
    //   existingLambdaObj: lambdas.putInFifoSQS,
    //   existingTableObj:  this.dynamoInstanceTable,
    //   // dynamoEventSourceProps: {
    //   //   startingPosition: StartingPosition.LATEST,
    //   //   maxBatchingWindow: Duration.seconds(5)
    //   // }
    // });

    // dynamodbStreamToLambda.lambdaFunction.addToRolePolicy(new PolicyStatement({
    //   resources: ['*'],
    //   actions: ['ec2:*', 'logs:*', 'route53:ChangeResourceRecordSets'] }));

    // this.dynamoStaticTable = new Table(scope, staticTable.name, {
    //   partitionKey: {
    //     name: staticTable.primaryKey,
    //     type: AttributeType.STRING
    //   },
    //   tableName: staticTable.name,
    //   removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
    // });

    // this.dynamoRepoTable = new Table(scope, repoTable.name, {
    //   partitionKey: {
    //     name: repoTable.primaryKey,
    //     type: AttributeType.NUMBER
    //   },
    //   tableName: repoTable.name,
    //   removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
    // });

    // this.dynamoInstanceTable.grantFullAccess(lambdas.getAllLambda);
    // this.dynamoInstanceTable.grantFullAccess(lambdas.getOneLambda);
    // this.dynamoInstanceTable.grantFullAccess(lambdas.putOrDeleteOneItemLambda);
    // this.dynamoInstanceTable.grantFullAccess(lambdas.deleteOne);
    // this.dynamoInstanceTable.grantFullAccess(lambdas.checkCreationAllowanceLambda);
    // this.dynamoInstanceTable.grantFullAccess(lambdas.updateOneApi);
    // this.dynamoInstanceTable.grantFullAccess(lambdas.executerLambda);
    // this.dynamoRepoTable.grantFullAccess(lambdas.createInstanceLambda);

    const tableName = new CfnOutput(scope, 'TableName', {
      value: this.dynamoInstanceTable.tableName
    });
    scope.cfnOutputs['TableName'] = tableName;

    // new CfnOutput(scope, 'RepoTableName', {
    //   value: this.dynamoRepoTable.tableName
    // });
  }
}
