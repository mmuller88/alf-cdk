import { Table, AttributeType, StreamViewType } from '@aws-cdk/aws-dynamodb';
import { RemovalPolicy, CfnOutput, Stack } from '@aws-cdk/core';
import { AlfCdkLambdas } from './AlfCdkLambdas';
import { instanceTable } from '../src/statics';
import { DynamoDBStreamToLambda } from '@aws-solutions-constructs/aws-dynamodb-stream-lambda';
import { LambdaToDynamoDB } from '@aws-solutions-constructs/aws-lambda-dynamodb';
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

  constructor(scope: Stack, lambdas: AlfCdkLambdas){
    this.dynamoInstanceTable = new Table(scope, instanceTable.name, {
      partitionKey: {
        name: instanceTable.primaryKey,
        type: AttributeType.STRING
      },
      sortKey: {
        name: instanceTable.sortKey,
        type: AttributeType.STRING
      },
      tableName: instanceTable.name,
      removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
    });

  new LambdaToDynamoDB(scope, 'putOrDeleteOneItemToLambda', {
    deployLambda: false,
    existingLambdaObj: lambdas.putOrDeleteOneItemLambda
  });

  new LambdaToDynamoDB(scope, 'getAllLambda', {
    deployLambda: false,
    existingLambdaObj: lambdas.getAllLambda
  });

  new LambdaToDynamoDB(scope, 'getOneLambda', {
    deployLambda: false,
    existingLambdaObj: lambdas.getOneLambda
  });

  new LambdaToDynamoDB(scope, 'checkCreationAllowanceLambda', {
    deployLambda: false,
    existingLambdaObj: lambdas.checkCreationAllowanceLambda
  });

  new LambdaToDynamoDB(scope, 'updateOneApi', {
    deployLambda: false,
    existingLambdaObj: lambdas.updateOneApi
  });

  new DynamoDBStreamToLambda(scope, 'DynamoDBStreamToLambda', {
    deployLambda: false,
    existingLambdaObj: lambdas.putInFifoSQS,
    existingTableObj:  this.dynamoInstanceTable,
    // dynamoEventSourceProps: {
    //   startingPosition: StartingPosition.LATEST,
    //   maxBatchingWindow: Duration.seconds(5)
    // }
  });

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

    new CfnOutput(scope, 'TableName', {
      value: this.dynamoInstanceTable.tableName
    });

    // new CfnOutput(scope, 'RepoTableName', {
    //   value: this.dynamoRepoTable.tableName
    // });
  }
}
