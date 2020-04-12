"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@aws-cdk/core");
const aws_lambda_1 = require("@aws-cdk/aws-lambda");
const AlfCdkTables_1 = require("./AlfCdkTables");
const aws_logs_1 = require("@aws-cdk/aws-logs");
const aws_iam_1 = require("@aws-cdk/aws-apigateway/node_modules/@aws-cdk/aws-iam");
const CI_USER_TOKEN = process.env.CI_USER_TOKEN || '';
;
class AlfCdkLambdas {
    constructor(scope, props) {
        var _a, _b;
        this.getOneLambda = new aws_lambda_1.Function(scope, 'getOneItemFunction', {
            code: new aws_lambda_1.AssetCode('src'),
            handler: 'get-one.handler',
            runtime: aws_lambda_1.Runtime.NODEJS_10_X,
            environment: {
                TABLE_NAME: AlfCdkTables_1.instanceTable.name,
                PRIMARY_KEY: AlfCdkTables_1.instanceTable.primaryKey,
                SORT_KEY: AlfCdkTables_1.instanceTable.sortKey
            },
            logRetention: aws_logs_1.RetentionDays.ONE_DAY,
        });
        this.getAllLambda = new aws_lambda_1.Function(scope, 'getAllItemsFunction', {
            code: new aws_lambda_1.AssetCode('src'),
            handler: 'get-all.handler',
            runtime: aws_lambda_1.Runtime.NODEJS_10_X,
            environment: {
                TABLE_NAME: AlfCdkTables_1.instanceTable.name,
                PRIMARY_KEY: AlfCdkTables_1.instanceTable.primaryKey
            },
            logRetention: aws_logs_1.RetentionDays.ONE_DAY,
        });
        const role = new aws_iam_1.Role(scope, 'Role', {
            assumedBy: new aws_iam_1.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
        });
        role.addToPolicy(new aws_iam_1.PolicyStatement({
            resources: ['*'],
            actions: ['ec2:*', 'logs:*']
        }));
        this.getAllInstancesLambda = new aws_lambda_1.Function(scope, 'getAllInstancesFunction', {
            code: new aws_lambda_1.AssetCode('src'),
            handler: 'get-all-instances.handler',
            runtime: aws_lambda_1.Runtime.NODEJS_10_X,
            environment: {
                PRIMARY_KEY: AlfCdkTables_1.instanceTable.primaryKey,
                SORT_KEY: AlfCdkTables_1.instanceTable.sortKey,
                STACK_NAME: scope.stackName
            },
            role: role,
            logRetention: aws_logs_1.RetentionDays.ONE_DAY,
        });
        this.deleteOne = new aws_lambda_1.Function(scope, 'deleteItemFunction', {
            code: new aws_lambda_1.AssetCode('src'),
            handler: 'delete-one.handler',
            runtime: aws_lambda_1.Runtime.NODEJS_10_X,
            environment: {
                TABLE_NAME: AlfCdkTables_1.instanceTable.name,
                PRIMARY_KEY: AlfCdkTables_1.instanceTable.primaryKey,
                SORT_KEY: AlfCdkTables_1.instanceTable.sortKey
            },
            logRetention: aws_logs_1.RetentionDays.ONE_DAY,
        });
        this.putOneItemLambda = new aws_lambda_1.Function(scope, 'putOneItem', {
            code: new aws_lambda_1.AssetCode('src'),
            handler: 'create.handler',
            runtime: aws_lambda_1.Runtime.NODEJS_10_X,
            environment: {
                TABLE_NAME: AlfCdkTables_1.instanceTable.name,
                PRIMARY_KEY: AlfCdkTables_1.instanceTable.primaryKey,
                SORT_KEY: AlfCdkTables_1.instanceTable.sortKey
            },
            logRetention: aws_logs_1.RetentionDays.ONE_DAY,
        });
        this.createInstanceLambda = new aws_lambda_1.Function(scope, 'createInstance', {
            code: new aws_lambda_1.AssetCode('src'),
            handler: 'create-instance.handler',
            runtime: aws_lambda_1.Runtime.NODEJS_10_X,
            environment: {
                REPO_TABLE: AlfCdkTables_1.repoTable.name,
                PRIMARY_KEY: AlfCdkTables_1.repoTable.primaryKey,
                CI_USER_TOKEN: CI_USER_TOKEN,
                SECURITY_GROUP: 'default',
                STACK_NAME: scope.stackName,
                IMAGE_ID: ((_b = (_a = props) === null || _a === void 0 ? void 0 : _a.createInstances) === null || _b === void 0 ? void 0 : _b.imageId) || ''
            },
            role: role,
            logRetention: aws_logs_1.RetentionDays.ONE_DAY,
        });
        this.checkCreationAllowanceLambda = new aws_lambda_1.Function(scope, 'checkCreationAllowanceLambda', {
            code: new aws_lambda_1.AssetCode('src'),
            handler: 'check-creation-allowance.handler',
            runtime: aws_lambda_1.Runtime.NODEJS_10_X,
            environment: {
                TABLE_NAME: AlfCdkTables_1.instanceTable.name,
                TABLE_STATIC_NAME: AlfCdkTables_1.repoTable.primaryKey,
                PRIMARY_KEY: AlfCdkTables_1.instanceTable.primaryKey,
            },
            logRetention: aws_logs_1.RetentionDays.ONE_DAY,
        });
        this.createOneApi = new aws_lambda_1.Function(scope, 'createItemFunctionApi', {
            code: new aws_lambda_1.AssetCode('src'),
            handler: 'create-api.handler',
            runtime: aws_lambda_1.Runtime.NODEJS_10_X,
            environment: {
                SORT_KEY: AlfCdkTables_1.instanceTable.sortKey
            },
            logRetention: aws_logs_1.RetentionDays.ONE_DAY,
        });
        this.updateOneApi = new aws_lambda_1.Function(scope, 'updateItemFunction', {
            code: new aws_lambda_1.AssetCode('src'),
            handler: 'update-one.handler',
            runtime: aws_lambda_1.Runtime.NODEJS_10_X,
            environment: {
                SORT_KEY: AlfCdkTables_1.instanceTable.sortKey
            },
            logRetention: aws_logs_1.RetentionDays.ONE_DAY,
        });
        new core_1.CfnOutput(scope, 'LGGroupdCreate', {
            value: this.putOneItemLambda.logGroup.logGroupName
        });
        new core_1.CfnOutput(scope, 'LGGroupdCreateInstance', {
            value: this.createInstanceLambda.logGroup.logGroupName
        });
        new core_1.CfnOutput(scope, 'LGGroupdCreateApi', {
            value: this.createOneApi.logGroup.logGroupName
        });
    }
}
exports.AlfCdkLambdas = AlfCdkLambdas;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWxmQ2RrTGFtYmRhcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkFsZkNka0xhbWJkYXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx3Q0FBaUQ7QUFDakQsb0RBQW1FO0FBQ25FLGlEQUEwRDtBQUMxRCxnREFBa0Q7QUFDbEQsbUZBQStIO0FBRy9ILE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxJQUFJLEVBQUUsQ0FBQztBQVlyRCxDQUFDO0FBRUYsTUFBYSxhQUFhO0lBV3hCLFlBQVksS0FBWSxFQUFFLEtBQThCOztRQUN0RCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUkscUJBQVEsQ0FBQyxLQUFLLEVBQUUsb0JBQW9CLEVBQUU7WUFDNUQsSUFBSSxFQUFFLElBQUksc0JBQVMsQ0FBQyxLQUFLLENBQUM7WUFDMUIsT0FBTyxFQUFFLGlCQUFpQjtZQUMxQixPQUFPLEVBQUUsb0JBQU8sQ0FBQyxXQUFXO1lBQzVCLFdBQVcsRUFBRTtnQkFDWCxVQUFVLEVBQUUsNEJBQWEsQ0FBQyxJQUFJO2dCQUM5QixXQUFXLEVBQUUsNEJBQWEsQ0FBQyxVQUFVO2dCQUNyQyxRQUFRLEVBQUUsNEJBQWEsQ0FBQyxPQUFPO2FBQ2hDO1lBQ0QsWUFBWSxFQUFFLHdCQUFhLENBQUMsT0FBTztTQUNwQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUkscUJBQVEsQ0FBQyxLQUFLLEVBQUUscUJBQXFCLEVBQUU7WUFDN0QsSUFBSSxFQUFFLElBQUksc0JBQVMsQ0FBQyxLQUFLLENBQUM7WUFDMUIsT0FBTyxFQUFFLGlCQUFpQjtZQUMxQixPQUFPLEVBQUUsb0JBQU8sQ0FBQyxXQUFXO1lBQzVCLFdBQVcsRUFBRTtnQkFDWCxVQUFVLEVBQUUsNEJBQWEsQ0FBQyxJQUFJO2dCQUM5QixXQUFXLEVBQUUsNEJBQWEsQ0FBQyxVQUFVO2FBQ3RDO1lBQ0QsWUFBWSxFQUFFLHdCQUFhLENBQUMsT0FBTztTQUNw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QUFnQixDQUFDLFFBQVEsQ0FBQyxZQUFZO1NBQ25ELENBQUMsQ0FBQztRQUVILElBQUksZ0JBQVMsQ0FBQyxLQUFLLEVBQUUsd0JBQXdCLEVBQUU7WUFDN0MsS0FBSyxFQUFFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsWUFBWTtTQUN2RCxDQUFDLENBQUM7UUFFSCxJQUFJLGdCQUFTLENBQUMsS0FBSyxFQUFFLG1CQUFtQixFQUFFO1lBQ3hDLEtBQUssRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxZQUFZO1NBQy9DLENBQUMsQ0FBQztJQUVMLENBQUM7Q0FDRjtBQTlJRCxzQ0E4SUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDZm5PdXRwdXQsIFN0YWNrIH0gZnJvbSAnQGF3cy1jZGsvY29yZSc7XG5pbXBvcnQgeyBGdW5jdGlvbiwgQXNzZXRDb2RlLCBSdW50aW1lIH0gZnJvbSAnQGF3cy1jZGsvYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBpbnN0YW5jZVRhYmxlLCByZXBvVGFibGUgfSBmcm9tICcuL0FsZkNka1RhYmxlcyc7XG5pbXBvcnQgeyBSZXRlbnRpb25EYXlzIH0gZnJvbSAnQGF3cy1jZGsvYXdzLWxvZ3MnO1xuaW1wb3J0IHsgUm9sZSwgU2VydmljZVByaW5jaXBhbCwgTWFuYWdlZFBvbGljeSwgUG9saWN5U3RhdGVtZW50IH0gZnJvbSAnQGF3cy1jZGsvYXdzLWFwaWdhdGV3YXkvbm9kZV9tb2R1bGVzL0Bhd3MtY2RrL2F3cy1pYW0nO1xuaW1wb3J0IHsgQWxmSW5zdGFuY2VzU3RhY2tQcm9wcyB9IGZyb20gJy4uJztcblxuY29uc3QgQ0lfVVNFUl9UT0tFTiA9IHByb2Nlc3MuZW52LkNJX1VTRVJfVE9LRU4gfHwgJyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQWxmQ2RrTGFtYmRhc0ludGVyZmFjZSB7XG4gIHJlYWRvbmx5IGdldE9uZUxhbWJkYTogRnVuY3Rpb24sXG4gIHJlYWRvbmx5IGdldEFsbExhbWJkYTogRnVuY3Rpb24sXG4gIHJlYWRvbmx5IGdldEFsbEluc3RhbmNlc0xhbWJkYTogRnVuY3Rpb24sXG4gIHJlYWRvbmx5IGRlbGV0ZU9uZTogRnVuY3Rpb24sXG4gIHJlYWRvbmx5IHB1dE9uZUl0ZW1MYW1iZGE6IEZ1bmN0aW9uLFxuICByZWFkb25seSBjcmVhdGVJbnN0YW5jZUxhbWJkYTogRnVuY3Rpb24sXG4gIHJlYWRvbmx5IGNoZWNrQ3JlYXRpb25BbGxvd2FuY2VMYW1iZGE6IEZ1bmN0aW9uLFxuICBjcmVhdGVPbmVBcGk6IEZ1bmN0aW9uLFxuICB1cGRhdGVPbmVBcGk6IEZ1bmN0aW9uO1xufTtcblxuZXhwb3J0IGNsYXNzIEFsZkNka0xhbWJkYXMgaW1wbGVtZW50cyBBbGZDZGtMYW1iZGFzSW50ZXJmYWNle1xuICBnZXRPbmVMYW1iZGE6IEZ1bmN0aW9uO1xuICBnZXRBbGxMYW1iZGE6IEZ1bmN0aW9uO1xuICBnZXRBbGxJbnN0YW5jZXNMYW1iZGE6IEZ1bmN0aW9uO1xuICBkZWxldGVPbmU6IEZ1bmN0aW9uO1xuICBwdXRPbmVJdGVtTGFtYmRhOiBGdW5jdGlvbjtcbiAgY3JlYXRlSW5zdGFuY2VMYW1iZGE6IEZ1bmN0aW9uO1xuICBjaGVja0NyZWF0aW9uQWxsb3dhbmNlTGFtYmRhOiBGdW5jdGlvbjtcbiAgY3JlYXRlT25lQXBpOiBGdW5jdGlvbjtcbiAgdXBkYXRlT25lQXBpOiBGdW5jdGlvbjtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogU3RhY2ssIHByb3BzPzogQWxmSW5zdGFuY2VzU3RhY2tQcm9wcyl7XG4gICAgdGhpcy5nZXRPbmVMYW1iZGEgPSBuZXcgRnVuY3Rpb24oc2NvcGUsICdnZXRPbmVJdGVtRnVuY3Rpb24nLCB7XG4gICAgICBjb2RlOiBuZXcgQXNzZXRDb2RlKCdzcmMnKSxcbiAgICAgIGhhbmRsZXI6ICdnZXQtb25lLmhhbmRsZXInLFxuICAgICAgcnVudGltZTogUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRBQkxFX05BTUU6IGluc3RhbmNlVGFibGUubmFtZSxcbiAgICAgICAgUFJJTUFSWV9LRVk6IGluc3RhbmNlVGFibGUucHJpbWFyeUtleSxcbiAgICAgICAgU09SVF9LRVk6IGluc3RhbmNlVGFibGUuc29ydEtleVxuICAgICAgfSxcbiAgICAgIGxvZ1JldGVudGlvbjogUmV0ZW50aW9uRGF5cy5PTkVfREFZLFxuICAgIH0pO1xuXG4gICAgdGhpcy5nZXRBbGxMYW1iZGEgPSBuZXcgRnVuY3Rpb24oc2NvcGUsICdnZXRBbGxJdGVtc0Z1bmN0aW9uJywge1xuICAgICAgY29kZTogbmV3IEFzc2V0Q29kZSgnc3JjJyksXG4gICAgICBoYW5kbGVyOiAnZ2V0LWFsbC5oYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IFJ1bnRpbWUuTk9ERUpTXzEwX1gsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBUQUJMRV9OQU1FOiBpbnN0YW5jZVRhYmxlLm5hbWUsXG4gICAgICAgIFBSSU1BUllfS0VZOiBpbnN0YW5jZVRhYmxlLnByaW1hcnlLZXlcbiAgICAgIH0sXG4gICAgICBsb2dSZXRlbnRpb246IFJldGVudGlvbkRheXMuT05FX0RBWSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHJvbGUgPSBuZXcgUm9sZShzY29wZSwgJ1JvbGUnLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBTZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpLCAgIC8vIHJlcXVpcmVkXG4gICAgICBtYW5hZ2VkUG9saWNpZXM6IFtNYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZScpXSxcbiAgICB9KTtcblxuICAgIHJvbGUuYWRkVG9Qb2xpY3kobmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgICAgYWN0aW9uczogWydlYzI6KicsICdsb2dzOionXSB9KSk7XG5cbiAgICB0aGlzLmdldEFsbEluc3RhbmNlc0xhbWJkYSA9IG5ldyBGdW5jdGlvbihzY29wZSwgJ2dldEFsbEluc3RhbmNlc0Z1bmN0aW9uJywge1xuICAgICAgY29kZTogbmV3IEFzc2V0Q29kZSgnc3JjJyksXG4gICAgICBoYW5kbGVyOiAnZ2V0LWFsbC1pbnN0YW5jZXMuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBSdW50aW1lLk5PREVKU18xMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgUFJJTUFSWV9LRVk6IGluc3RhbmNlVGFibGUucHJpbWFyeUtleSxcbiAgICAgICAgU09SVF9LRVk6IGluc3RhbmNlVGFibGUuc29ydEtleSxcbiAgICAgICAgU1RBQ0tfTkFNRTogc2NvcGUuc3RhY2tOYW1lXG4gICAgICB9LFxuICAgICAgcm9sZTogcm9sZSxcbiAgICAgIGxvZ1JldGVudGlvbjogUmV0ZW50aW9uRGF5cy5PTkVfREFZLFxuICAgIH0pO1xuXG4gICAgdGhpcy5kZWxldGVPbmUgPSBuZXcgRnVuY3Rpb24oc2NvcGUsICdkZWxldGVJdGVtRnVuY3Rpb24nLCB7XG4gICAgICBjb2RlOiBuZXcgQXNzZXRDb2RlKCdzcmMnKSxcbiAgICAgIGhhbmRsZXI6ICdkZWxldGUtb25lLmhhbmRsZXInLFxuICAgICAgcnVudGltZTogUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRBQkxFX05BTUU6IGluc3RhbmNlVGFibGUubmFtZSxcbiAgICAgICAgUFJJTUFSWV9LRVk6IGluc3RhbmNlVGFibGUucHJpbWFyeUtleSxcbiAgICAgICAgU09SVF9LRVk6IGluc3RhbmNlVGFibGUuc29ydEtleVxuICAgICAgfSxcbiAgICAgIGxvZ1JldGVudGlvbjogUmV0ZW50aW9uRGF5cy5PTkVfREFZLFxuICAgIH0pO1xuXG4gICAgdGhpcy5wdXRPbmVJdGVtTGFtYmRhID0gbmV3IEZ1bmN0aW9uKHNjb3BlLCAncHV0T25lSXRlbScsIHtcbiAgICAgIGNvZGU6IG5ldyBBc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ2NyZWF0ZS5oYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IFJ1bnRpbWUuTk9ERUpTXzEwX1gsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBUQUJMRV9OQU1FOiBpbnN0YW5jZVRhYmxlLm5hbWUsXG4gICAgICAgIFBSSU1BUllfS0VZOiBpbnN0YW5jZVRhYmxlLnByaW1hcnlLZXksXG4gICAgICAgIFNPUlRfS0VZOiBpbnN0YW5jZVRhYmxlLnNvcnRLZXlcbiAgICAgIH0sXG4gICAgICBsb2dSZXRlbnRpb246IFJldGVudGlvbkRheXMuT05FX0RBWSxcbiAgICB9KTtcblxuICAgIHRoaXMuY3JlYXRlSW5zdGFuY2VMYW1iZGEgPSBuZXcgRnVuY3Rpb24oc2NvcGUsICdjcmVhdGVJbnN0YW5jZScsIHtcbiAgICAgIGNvZGU6IG5ldyBBc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ2NyZWF0ZS1pbnN0YW5jZS5oYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IFJ1bnRpbWUuTk9ERUpTXzEwX1gsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBSRVBPX1RBQkxFIDogcmVwb1RhYmxlLm5hbWUsXG4gICAgICAgIFBSSU1BUllfS0VZOiByZXBvVGFibGUucHJpbWFyeUtleSxcbiAgICAgICAgQ0lfVVNFUl9UT0tFTjogQ0lfVVNFUl9UT0tFTixcbiAgICAgICAgU0VDVVJJVFlfR1JPVVA6ICdkZWZhdWx0JyxcbiAgICAgICAgU1RBQ0tfTkFNRTogc2NvcGUuc3RhY2tOYW1lLFxuICAgICAgICBJTUFHRV9JRDogcHJvcHM/LmNyZWF0ZUluc3RhbmNlcz8uaW1hZ2VJZCB8fCAnJ1xuICAgICAgfSxcbiAgICAgIHJvbGU6IHJvbGUsXG4gICAgICBsb2dSZXRlbnRpb246IFJldGVudGlvbkRheXMuT05FX0RBWSxcbiAgICB9KTtcblxuICAgIHRoaXMuY2hlY2tDcmVhdGlvbkFsbG93YW5jZUxhbWJkYSA9IG5ldyBGdW5jdGlvbihzY29wZSwgJ2NoZWNrQ3JlYXRpb25BbGxvd2FuY2VMYW1iZGEnLCB7XG4gICAgICBjb2RlOiBuZXcgQXNzZXRDb2RlKCdzcmMnKSxcbiAgICAgIGhhbmRsZXI6ICdjaGVjay1jcmVhdGlvbi1hbGxvd2FuY2UuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBSdW50aW1lLk5PREVKU18xMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVEFCTEVfTkFNRTogaW5zdGFuY2VUYWJsZS5uYW1lLFxuICAgICAgICBUQUJMRV9TVEFUSUNfTkFNRTogcmVwb1RhYmxlLnByaW1hcnlLZXksXG4gICAgICAgIFBSSU1BUllfS0VZOiBpbnN0YW5jZVRhYmxlLnByaW1hcnlLZXksXG4gICAgICB9LFxuICAgICAgbG9nUmV0ZW50aW9uOiBSZXRlbnRpb25EYXlzLk9ORV9EQVksXG4gICAgfSk7XG5cbiAgICB0aGlzLmNyZWF0ZU9uZUFwaSA9IG5ldyBGdW5jdGlvbihzY29wZSwgJ2NyZWF0ZUl0ZW1GdW5jdGlvbkFwaScsIHtcbiAgICAgIGNvZGU6IG5ldyBBc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ2NyZWF0ZS1hcGkuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBSdW50aW1lLk5PREVKU18xMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgU09SVF9LRVk6IGluc3RhbmNlVGFibGUuc29ydEtleVxuICAgICAgfSxcbiAgICAgIGxvZ1JldGVudGlvbjogUmV0ZW50aW9uRGF5cy5PTkVfREFZLFxuICAgIH0pO1xuXG4gICAgdGhpcy51cGRhdGVPbmVBcGkgPSBuZXcgRnVuY3Rpb24oc2NvcGUsICd1cGRhdGVJdGVtRnVuY3Rpb24nLCB7XG4gICAgICBjb2RlOiBuZXcgQXNzZXRDb2RlKCdzcmMnKSxcbiAgICAgIGhhbmRsZXI6ICd1cGRhdGUtb25lLmhhbmRsZXInLFxuICAgICAgcnVudGltZTogUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFNPUlRfS0VZOiBpbnN0YW5jZVRhYmxlLnNvcnRLZXlcbiAgICAgIH0sXG4gICAgICBsb2dSZXRlbnRpb246IFJldGVudGlvbkRheXMuT05FX0RBWSxcbiAgICB9KTtcblxuICAgIG5ldyBDZm5PdXRwdXQoc2NvcGUsICdMR0dyb3VwZENyZWF0ZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnB1dE9uZUl0ZW1MYW1iZGEubG9nR3JvdXAubG9nR3JvdXBOYW1lXG4gICAgfSk7XG5cbiAgICBuZXcgQ2ZuT3V0cHV0KHNjb3BlLCAnTEdHcm91cGRDcmVhdGVJbnN0YW5jZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmNyZWF0ZUluc3RhbmNlTGFtYmRhLmxvZ0dyb3VwLmxvZ0dyb3VwTmFtZVxuICAgIH0pO1xuXG4gICAgbmV3IENmbk91dHB1dChzY29wZSwgJ0xHR3JvdXBkQ3JlYXRlQXBpJywge1xuICAgICAgdmFsdWU6IHRoaXMuY3JlYXRlT25lQXBpLmxvZ0dyb3VwLmxvZ0dyb3VwTmFtZVxuICAgIH0pO1xuXG4gIH1cbn1cbiJdfQ==