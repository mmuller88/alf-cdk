import { Table, AttributeType } from '@aws-cdk/aws-dynamodb';
import { Construct, RemovalPolicy, CfnOutput } from '@aws-cdk/core';
import { AlfCdkLambdas } from './AlfCdkLambdas';
import { instanceTable, staticTable, repoTable, adminTable } from '../src/statics';

export interface AlfCdkTablesInterface {
  readonly dynamoInstanceTable: Table,
  readonly dynamoStaticTable: Table,
  readonly dynamoRepoTable: Table,
  readonly dynamoAdminTable: Table,
};

export class AlfCdkTables implements AlfCdkTablesInterface{
  dynamoInstanceTable: Table;
  dynamoStaticTable: Table;
  dynamoRepoTable: Table;
  dynamoAdminTable: Table;

  constructor(scope: Construct, lambdas: AlfCdkLambdas){
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
    });

    this.dynamoStaticTable = new Table(scope, staticTable.name, {
      partitionKey: {
        name: staticTable.primaryKey,
        type: AttributeType.STRING
      },
      tableName: staticTable.name,
      removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    this.dynamoRepoTable = new Table(scope, repoTable.name, {
      partitionKey: {
        name: repoTable.primaryKey,
        type: AttributeType.NUMBER
      },
      tableName: repoTable.name,
      removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    this.dynamoAdminTable = new Table(scope, adminTable.name, {
      partitionKey: {
        name: adminTable.primaryKey,
        type: AttributeType.STRING
      },
      tableName: adminTable.name,
      removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    this.dynamoInstanceTable.grantFullAccess(lambdas.getAllLambda);
    this.dynamoInstanceTable.grantFullAccess(lambdas.getOneLambda);
    this.dynamoInstanceTable.grantFullAccess(lambdas.putOneItemLambda);
    // this.dynamoInstanceTable.grantFullAccess(lambdas.deleteOne);
    this.dynamoInstanceTable.grantFullAccess(lambdas.checkCreationAllowanceLambda);
    this.dynamoInstanceTable.grantFullAccess(lambdas.executerLambda);
    this.dynamoRepoTable.grantFullAccess(lambdas.createInstanceLambda);
    this.dynamoAdminTable.grantFullAccess(lambdas.getAllLambda);

    new CfnOutput(scope, 'TableName', {
      value: this.dynamoInstanceTable.tableName
    });

    new CfnOutput(scope, 'RepoTableName', {
      value: this.dynamoRepoTable.tableName
    });

    new CfnOutput(scope, 'AdminTableName', {
      value: this.dynamoAdminTable.tableName
    });
  }
}
