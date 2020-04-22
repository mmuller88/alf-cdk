"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@aws-cdk/core");
const aws_lambda_1 = require("@aws-cdk/aws-lambda");
const aws_logs_1 = require("@aws-cdk/aws-logs");
const aws_iam_1 = require("@aws-cdk/aws-apigateway/node_modules/@aws-cdk/aws-iam");
const statics_1 = require("../src/statics");
const CI_USER_TOKEN = process.env.CI_USER_TOKEN || '';
;
class AlfCdkLambdas {
    constructor(scope, props) {
        var _a, _b, _c, _d, _e;
        this.getOneLambda = new aws_lambda_1.Function(scope, 'getOneItemFunction', {
            code: new aws_lambda_1.AssetCode('src'),
            handler: 'get-one.handler',
            runtime: aws_lambda_1.Runtime.NODEJS_10_X,
            environment: {
                TABLE_NAME: statics_1.instanceTable.name,
                PRIMARY_KEY: statics_1.instanceTable.primaryKey,
                SORT_KEY: statics_1.instanceTable.sortKey
            },
            logRetention: aws_logs_1.RetentionDays.ONE_DAY,
        });
        this.getAllLambda = new aws_lambda_1.Function(scope, 'getAllItemsFunction', {
            code: new aws_lambda_1.AssetCode('src'),
            handler: 'get-all.handler',
            runtime: aws_lambda_1.Runtime.NODEJS_10_X,
            environment: {
                // TABLE_NAME: instanceTable.name,
                // PRIMARY_KEY: instanceTable.primaryKey,
                MOCK_AUTH_USERNAME: ((_c = (_b = (_a = props) === null || _a === void 0 ? void 0 : _a.auth) === null || _b === void 0 ? void 0 : _b.mockAuth) === null || _c === void 0 ? void 0 : _c.userName) || '',
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
                PRIMARY_KEY: statics_1.instanceTable.primaryKey,
                SORT_KEY: statics_1.instanceTable.sortKey,
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
                TABLE_NAME: statics_1.instanceTable.name,
                PRIMARY_KEY: statics_1.instanceTable.primaryKey,
                SORT_KEY: statics_1.instanceTable.sortKey
            },
            logRetention: aws_logs_1.RetentionDays.ONE_DAY,
        });
        this.putOneItemLambda = new aws_lambda_1.Function(scope, 'putOneItem', {
            code: new aws_lambda_1.AssetCode('src'),
            handler: 'create.handler',
            runtime: aws_lambda_1.Runtime.NODEJS_10_X,
            environment: {
                TABLE_NAME: statics_1.instanceTable.name,
                PRIMARY_KEY: statics_1.instanceTable.primaryKey,
                SORT_KEY: statics_1.instanceTable.sortKey
            },
            logRetention: aws_logs_1.RetentionDays.ONE_DAY,
        });
        this.createInstanceLambda = new aws_lambda_1.Function(scope, 'createInstance', {
            code: new aws_lambda_1.AssetCode('src'),
            handler: 'create-instance.handler',
            runtime: aws_lambda_1.Runtime.NODEJS_10_X,
            environment: {
                REPO_TABLE: statics_1.repoTable.name,
                PRIMARY_KEY: statics_1.repoTable.primaryKey,
                CI_USER_TOKEN: CI_USER_TOKEN,
                SECURITY_GROUP: 'default',
                STACK_NAME: scope.stackName,
                IMAGE_ID: ((_e = (_d = props) === null || _d === void 0 ? void 0 : _d.createInstances) === null || _e === void 0 ? void 0 : _e.imageId) || ''
            },
            role: role,
            logRetention: aws_logs_1.RetentionDays.ONE_DAY,
        });
        this.checkCreationAllowanceLambda = new aws_lambda_1.Function(scope, 'checkCreationAllowanceLambda', {
            code: new aws_lambda_1.AssetCode('src'),
            handler: 'check-creation-allowance.handler',
            runtime: aws_lambda_1.Runtime.NODEJS_10_X,
            environment: {
                TABLE_NAME: statics_1.instanceTable.name,
                TABLE_STATIC_NAME: statics_1.repoTable.primaryKey,
                PRIMARY_KEY: statics_1.instanceTable.primaryKey,
            },
            logRetention: aws_logs_1.RetentionDays.ONE_DAY,
        });
        this.createOneApi = new aws_lambda_1.Function(scope, 'createItemFunctionApi', {
            code: new aws_lambda_1.AssetCode('src'),
            handler: 'create-api.handler',
            runtime: aws_lambda_1.Runtime.NODEJS_10_X,
            environment: {
                SORT_KEY: statics_1.instanceTable.sortKey
            },
            logRetention: aws_logs_1.RetentionDays.ONE_DAY,
        });
        this.updateOneApi = new aws_lambda_1.Function(scope, 'updateItemFunction', {
            code: new aws_lambda_1.AssetCode('src'),
            handler: 'update-one.handler',
            runtime: aws_lambda_1.Runtime.NODEJS_10_X,
            environment: {
                SORT_KEY: statics_1.instanceTable.sortKey
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWxmQ2RrTGFtYmRhcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkFsZkNka0xhbWJkYXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx3Q0FBaUQ7QUFDakQsb0RBQW1FO0FBQ25FLGdEQUFrRDtBQUNsRCxtRkFBK0g7QUFFL0gsNENBQTBEO0FBRTFELE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxJQUFJLEVBQUUsQ0FBQztBQVlyRCxDQUFDO0FBRUYsTUFBYSxhQUFhO0lBV3hCLFlBQVksS0FBWSxFQUFFLEtBQThCOztRQUN0RCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUkscUJBQVEsQ0FBQyxLQUFLLEVBQUUsb0JBQW9CLEVBQUU7WUFDNUQsSUFBSSxFQUFFLElBQUksc0JBQVMsQ0FBQyxLQUFLLENBQUM7WUFDMUIsT0FBTyxFQUFFLGlCQUFpQjtZQUMxQixPQUFPLEVBQUUsb0JBQU8sQ0FBQyxXQUFXO1lBQzVCLFdBQVcsRUFBRTtnQkFDWCxVQUFVLEVBQUUsdUJBQWEsQ0FBQyxJQUFJO2dCQUM5QixXQUFXLEVBQUUsdUJBQWEsQ0FBQyxVQUFVO2dCQUNyQyxRQUFRLEVBQUUsdUJBQWEsQ0FBQyxPQUFPO2FBQ2hDO1lBQ0QsWUFBWSxFQUFFLHdCQUFhLENBQUMsT0FBTztTQUNwQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUkscUJBQVEsQ0FBQyxLQUFLLEVBQUUscUJBQXFCLEVBQUU7WUFDN0QsSUFBSSxFQUFFLElBQUksc0JBQVMsQ0FBQyxLQUFLLENBQUM7WUFDMUIsT0FBTyxFQUFFLGlCQUFpQjtZQUMxQixPQUFPLEVBQUUsb0JBQU8sQ0FBQyxXQUFXO1lBQzVCLFdBQVcsRUFBRTtnQkFDWCxrQ0FBa0M7Z0JBQ2xDLHlDQUF5QztnQkFDekMsa0JBQWtCLEVBQUUsbUJBQUEsS0FBSywwQ0FBRSxJQUFJLDBDQUFFLFFBQVEsMENBQUUsUUFBUSxLQUFJLEVBQUU7YUFFMUQ7WUFDRCxZQUFZLEVBQUUsd0JBQWEsQ0FBQyxPQUFPO1NBQ3BDLENBQUMsQ0FBQztRQUVILE1BQU0sSUFBSSxHQUFHLElBQUksY0FBSSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUU7WUFDbkMsU0FBUyxFQUFFLElBQUksMEJBQWdCLENBQUMsc0JBQXNCLENBQUM7WUFDdkQsZUFBZSxFQUFFLENBQUMsdUJBQWEsQ0FBQyx3QkFBd0IsQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDO1NBQ3RHLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSx5QkFBZSxDQUFDO1lBQ25DLFNBQVMsRUFBRSxDQUFDLEdBQUcsQ0FBQztZQUNoQixPQUFPLEVBQUUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDO1NBQUUsQ0FBQyxDQUFDLENBQUM7UUFFbkMsSUFBSSxDQUFDLHFCQUFxQixHQUFHLElBQUkscUJBQVEsQ0FBQyxLQUFLLEVBQUUseUJBQXlCLEVBQUU7WUFDMUUsSUFBSSxFQUFFLElBQUksc0JBQVMsQ0FBQyxLQUFLLENBQUM7WUFDMUIsT0FBTyxFQUFFLDJCQUEyQjtZQUNwQyxPQUFPLEVBQUUsb0JBQU8sQ0FBQyxXQUFXO1lBQzVCLFdBQVcsRUFBRTtnQkFDWCxXQUFXLEVBQUUsdUJBQWEsQ0FBQyxVQUFVO2dCQUNyQyxRQUFRLEVBQUUsdUJBQWEsQ0FBQyxPQUFPO2dCQUMvQixVQUFVLEVBQUUsS0FBSyxDQUFDLFNBQVM7YUFDNUI7WUFDRCxJQUFJLEVBQUUsSUFBSTtZQUNWLFlBQVksRUFBRSx3QkFBYSxDQUFDLE9BQU87U0FDcEMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLHFCQUFRLENBQUMsS0FBSyxFQUFFLG9CQUFvQixFQUFFO1lBQ3pELElBQUksRUFBRSxJQUFJLHNCQUFTLENBQUMsS0FBSyxDQUFDO1lBQzFCLE9BQU8sRUFBRSxvQkFBb0I7WUFDN0IsT0FBTyxFQUFFLG9CQUFPLENBQUMsV0FBVztZQUM1QixXQUFXLEVBQUU7Z0JBQ1gsVUFBVSxFQUFFLHVCQUFhLENBQUMsSUFBSTtnQkFDOUIsV0FBVyxFQUFFLHVCQUFhLENBQUMsVUFBVTtnQkFDckMsUUFBUSxFQUFFLHVCQUFhLENBQUMsT0FBTzthQUNoQztZQUNELFlBQVksRUFBRSx3QkFBYSxDQUFDLE9BQU87U0FDcEMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUkscUJBQVEsQ0FBQyxLQUFLLEVBQUUsWUFBWSxFQUFFO1lBQ3hELElBQUksRUFBRSxJQUFJLHNCQUFTLENBQUMsS0FBSyxDQUFDO1lBQzFCLE9BQU8sRUFBRSxnQkFBZ0I7WUFDekIsT0FBTyxFQUFFLG9CQUFPLENBQUMsV0FBVztZQUM1QixXQUFXLEVBQUU7Z0JBQ1gsVUFBVSxFQUFFLHVCQUFhLENBQUMsSUFBSTtnQkFDOUIsV0FBVyxFQUFFLHVCQUFhLENBQUMsVUFBVTtnQkFDckMsUUFBUSxFQUFFLHVCQUFhLENBQUMsT0FBTzthQUNoQztZQUNELFlBQVksRUFBRSx3QkFBYSxDQUFDLE9BQU87U0FDcEMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUkscUJBQVEsQ0FBQyxLQUFLLEVBQUUsZ0JBQWdCLEVBQUU7WUFDaEUsSUFBSSxFQUFFLElBQUksc0JBQVMsQ0FBQyxLQUFLLENBQUM7WUFDMUIsT0FBTyxFQUFFLHlCQUF5QjtZQUNsQyxPQUFPLEVBQUUsb0JBQU8sQ0FBQyxXQUFXO1lBQzVCLFdBQVcsRUFBRTtnQkFDWCxVQUFVLEVBQUcsbUJBQVMsQ0FBQyxJQUFJO2dCQUMzQixXQUFXLEVBQUUsbUJBQVMsQ0FBQyxVQUFVO2dCQUNqQyxhQUFhLEVBQUUsYUFBYTtnQkFDNUIsY0FBYyxFQUFFLFNBQVM7Z0JBQ3pCLFVBQVUsRUFBRSxLQUFLLENBQUMsU0FBUztnQkFDM0IsUUFBUSxFQUFFLGFBQUEsS0FBSywwQ0FBRSxlQUFlLDBDQUFFLE9BQU8sS0FBSSxFQUFFO2FBQ2hEO1lBQ0QsSUFBSSxFQUFFLElBQUk7WUFDVixZQUFZLEVBQUUsd0JBQWEsQ0FBQyxPQUFPO1NBQ3BDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyw0QkFBNEIsR0FBRyxJQUFJLHFCQUFRLENBQUMsS0FBSyxFQUFFLDhCQUE4QixFQUFFO1lBQ3RGLElBQUksRUFBRSxJQUFJLHNCQUFTLENBQUMsS0FBSyxDQUFDO1lBQzFCLE9BQU8sRUFBRSxrQ0FBa0M7WUFDM0MsT0FBTyxFQUFFLG9CQUFPLENBQUMsV0FBVztZQUM1QixXQUFXLEVBQUU7Z0JBQ1gsVUFBVSxFQUFFLHVCQUFhLENBQUMsSUFBSTtnQkFDOUIsaUJBQWlCLEVBQUUsbUJBQVMsQ0FBQyxVQUFVO2dCQUN2QyxXQUFXLEVBQUUsdUJBQWEsQ0FBQyxVQUFVO2FBQ3RDO1lBQ0QsWUFBWSxFQUFFLHdCQUFhLENBQUMsT0FBTztTQUNwQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUkscUJBQVEsQ0FBQyxLQUFLLEVBQUUsdUJBQXVCLEVBQUU7WUFDL0QsSUFBSSxFQUFFLElBQUksc0JBQVMsQ0FBQyxLQUFLLENBQUM7WUFDMUIsT0FBTyxFQUFFLG9CQUFvQjtZQUM3QixPQUFPLEVBQUUsb0JBQU8sQ0FBQyxXQUFXO1lBQzVCLFdBQVcsRUFBRTtnQkFDWCxRQUFRLEVBQUUsdUJBQWEsQ0FBQyxPQUFPO2FBQ2hDO1lBQ0QsWUFBWSxFQUFFLHdCQUFhLENBQUMsT0FBTztTQUNwQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUkscUJBQVEsQ0FBQyxLQUFLLEVBQUUsb0JBQW9CLEVBQUU7WUFDNUQsSUFBSSxFQUFFLElBQUksc0JBQVMsQ0FBQyxLQUFLLENBQUM7WUFDMUIsT0FBTyxFQUFFLG9CQUFvQjtZQUM3QixPQUFPLEVBQUUsb0JBQU8sQ0FBQyxXQUFXO1lBQzVCLFdBQVcsRUFBRTtnQkFDWCxRQUFRLEVBQUUsdUJBQWEsQ0FBQyxPQUFPO2FBQ2hDO1lBQ0QsWUFBWSxFQUFFLHdCQUFhLENBQUMsT0FBTztTQUNwQyxDQUFDLENBQUM7UUFFSCxJQUFJLGdCQUFTLENBQUMsS0FBSyxFQUFFLGdCQUFnQixFQUFFO1lBQ3JDLEtBQUssRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLFlBQVk7U0FDbkQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxnQkFBUyxDQUFDLEtBQUssRUFBRSx3QkFBd0IsRUFBRTtZQUM3QyxLQUFLLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxZQUFZO1NBQ3ZELENBQUMsQ0FBQztRQUVILElBQUksZ0JBQVMsQ0FBQyxLQUFLLEVBQUUsbUJBQW1CLEVBQUU7WUFDeEMsS0FBSyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFlBQVk7U0FDL0MsQ0FBQyxDQUFDO0lBRUwsQ0FBQztDQUNGO0FBaEpELHNDQWdKQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENmbk91dHB1dCwgU3RhY2sgfSBmcm9tICdAYXdzLWNkay9jb3JlJztcbmltcG9ydCB7IEZ1bmN0aW9uLCBBc3NldENvZGUsIFJ1bnRpbWUgfSBmcm9tICdAYXdzLWNkay9hd3MtbGFtYmRhJztcbmltcG9ydCB7IFJldGVudGlvbkRheXMgfSBmcm9tICdAYXdzLWNkay9hd3MtbG9ncyc7XG5pbXBvcnQgeyBSb2xlLCBTZXJ2aWNlUHJpbmNpcGFsLCBNYW5hZ2VkUG9saWN5LCBQb2xpY3lTdGF0ZW1lbnQgfSBmcm9tICdAYXdzLWNkay9hd3MtYXBpZ2F0ZXdheS9ub2RlX21vZHVsZXMvQGF3cy1jZGsvYXdzLWlhbSc7XG5pbXBvcnQgeyBBbGZJbnN0YW5jZXNTdGFja1Byb3BzIH0gZnJvbSAnLi4nO1xuaW1wb3J0IHsgaW5zdGFuY2VUYWJsZSwgcmVwb1RhYmxlIH0gZnJvbSAnLi4vc3JjL3N0YXRpY3MnO1xuXG5jb25zdCBDSV9VU0VSX1RPS0VOID0gcHJvY2Vzcy5lbnYuQ0lfVVNFUl9UT0tFTiB8fCAnJztcblxuZXhwb3J0IGludGVyZmFjZSBBbGZDZGtMYW1iZGFzSW50ZXJmYWNlIHtcbiAgcmVhZG9ubHkgZ2V0T25lTGFtYmRhOiBGdW5jdGlvbixcbiAgcmVhZG9ubHkgZ2V0QWxsTGFtYmRhOiBGdW5jdGlvbixcbiAgcmVhZG9ubHkgZ2V0QWxsSW5zdGFuY2VzTGFtYmRhOiBGdW5jdGlvbixcbiAgcmVhZG9ubHkgZGVsZXRlT25lOiBGdW5jdGlvbixcbiAgcmVhZG9ubHkgcHV0T25lSXRlbUxhbWJkYTogRnVuY3Rpb24sXG4gIHJlYWRvbmx5IGNyZWF0ZUluc3RhbmNlTGFtYmRhOiBGdW5jdGlvbixcbiAgcmVhZG9ubHkgY2hlY2tDcmVhdGlvbkFsbG93YW5jZUxhbWJkYTogRnVuY3Rpb24sXG4gIGNyZWF0ZU9uZUFwaTogRnVuY3Rpb24sXG4gIHVwZGF0ZU9uZUFwaTogRnVuY3Rpb247XG59O1xuXG5leHBvcnQgY2xhc3MgQWxmQ2RrTGFtYmRhcyBpbXBsZW1lbnRzIEFsZkNka0xhbWJkYXNJbnRlcmZhY2V7XG4gIGdldE9uZUxhbWJkYTogRnVuY3Rpb247XG4gIGdldEFsbExhbWJkYTogRnVuY3Rpb247XG4gIGdldEFsbEluc3RhbmNlc0xhbWJkYTogRnVuY3Rpb247XG4gIGRlbGV0ZU9uZTogRnVuY3Rpb247XG4gIHB1dE9uZUl0ZW1MYW1iZGE6IEZ1bmN0aW9uO1xuICBjcmVhdGVJbnN0YW5jZUxhbWJkYTogRnVuY3Rpb247XG4gIGNoZWNrQ3JlYXRpb25BbGxvd2FuY2VMYW1iZGE6IEZ1bmN0aW9uO1xuICBjcmVhdGVPbmVBcGk6IEZ1bmN0aW9uO1xuICB1cGRhdGVPbmVBcGk6IEZ1bmN0aW9uO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBTdGFjaywgcHJvcHM/OiBBbGZJbnN0YW5jZXNTdGFja1Byb3BzKXtcbiAgICB0aGlzLmdldE9uZUxhbWJkYSA9IG5ldyBGdW5jdGlvbihzY29wZSwgJ2dldE9uZUl0ZW1GdW5jdGlvbicsIHtcbiAgICAgIGNvZGU6IG5ldyBBc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ2dldC1vbmUuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBSdW50aW1lLk5PREVKU18xMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVEFCTEVfTkFNRTogaW5zdGFuY2VUYWJsZS5uYW1lLFxuICAgICAgICBQUklNQVJZX0tFWTogaW5zdGFuY2VUYWJsZS5wcmltYXJ5S2V5LFxuICAgICAgICBTT1JUX0tFWTogaW5zdGFuY2VUYWJsZS5zb3J0S2V5XG4gICAgICB9LFxuICAgICAgbG9nUmV0ZW50aW9uOiBSZXRlbnRpb25EYXlzLk9ORV9EQVksXG4gICAgfSk7XG5cbiAgICB0aGlzLmdldEFsbExhbWJkYSA9IG5ldyBGdW5jdGlvbihzY29wZSwgJ2dldEFsbEl0ZW1zRnVuY3Rpb24nLCB7XG4gICAgICBjb2RlOiBuZXcgQXNzZXRDb2RlKCdzcmMnKSxcbiAgICAgIGhhbmRsZXI6ICdnZXQtYWxsLmhhbmRsZXInLFxuICAgICAgcnVudGltZTogUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIC8vIFRBQkxFX05BTUU6IGluc3RhbmNlVGFibGUubmFtZSxcbiAgICAgICAgLy8gUFJJTUFSWV9LRVk6IGluc3RhbmNlVGFibGUucHJpbWFyeUtleSxcbiAgICAgICAgTU9DS19BVVRIX1VTRVJOQU1FOiBwcm9wcz8uYXV0aD8ubW9ja0F1dGg/LnVzZXJOYW1lIHx8ICcnLFxuICAgICAgICAvLyBBRE1JTl9UQUJMRV9OQU1FOiBhZG1pblRhYmxlLm5hbWVcbiAgICAgIH0sXG4gICAgICBsb2dSZXRlbnRpb246IFJldGVudGlvbkRheXMuT05FX0RBWSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHJvbGUgPSBuZXcgUm9sZShzY29wZSwgJ1JvbGUnLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBTZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpLCAgIC8vIHJlcXVpcmVkXG4gICAgICBtYW5hZ2VkUG9saWNpZXM6IFtNYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZScpXSxcbiAgICB9KTtcblxuICAgIHJvbGUuYWRkVG9Qb2xpY3kobmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgICAgYWN0aW9uczogWydlYzI6KicsICdsb2dzOionXSB9KSk7XG5cbiAgICB0aGlzLmdldEFsbEluc3RhbmNlc0xhbWJkYSA9IG5ldyBGdW5jdGlvbihzY29wZSwgJ2dldEFsbEluc3RhbmNlc0Z1bmN0aW9uJywge1xuICAgICAgY29kZTogbmV3IEFzc2V0Q29kZSgnc3JjJyksXG4gICAgICBoYW5kbGVyOiAnZ2V0LWFsbC1pbnN0YW5jZXMuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBSdW50aW1lLk5PREVKU18xMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgUFJJTUFSWV9LRVk6IGluc3RhbmNlVGFibGUucHJpbWFyeUtleSxcbiAgICAgICAgU09SVF9LRVk6IGluc3RhbmNlVGFibGUuc29ydEtleSxcbiAgICAgICAgU1RBQ0tfTkFNRTogc2NvcGUuc3RhY2tOYW1lXG4gICAgICB9LFxuICAgICAgcm9sZTogcm9sZSxcbiAgICAgIGxvZ1JldGVudGlvbjogUmV0ZW50aW9uRGF5cy5PTkVfREFZLFxuICAgIH0pO1xuXG4gICAgdGhpcy5kZWxldGVPbmUgPSBuZXcgRnVuY3Rpb24oc2NvcGUsICdkZWxldGVJdGVtRnVuY3Rpb24nLCB7XG4gICAgICBjb2RlOiBuZXcgQXNzZXRDb2RlKCdzcmMnKSxcbiAgICAgIGhhbmRsZXI6ICdkZWxldGUtb25lLmhhbmRsZXInLFxuICAgICAgcnVudGltZTogUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRBQkxFX05BTUU6IGluc3RhbmNlVGFibGUubmFtZSxcbiAgICAgICAgUFJJTUFSWV9LRVk6IGluc3RhbmNlVGFibGUucHJpbWFyeUtleSxcbiAgICAgICAgU09SVF9LRVk6IGluc3RhbmNlVGFibGUuc29ydEtleVxuICAgICAgfSxcbiAgICAgIGxvZ1JldGVudGlvbjogUmV0ZW50aW9uRGF5cy5PTkVfREFZLFxuICAgIH0pO1xuXG4gICAgdGhpcy5wdXRPbmVJdGVtTGFtYmRhID0gbmV3IEZ1bmN0aW9uKHNjb3BlLCAncHV0T25lSXRlbScsIHtcbiAgICAgIGNvZGU6IG5ldyBBc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ2NyZWF0ZS5oYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IFJ1bnRpbWUuTk9ERUpTXzEwX1gsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBUQUJMRV9OQU1FOiBpbnN0YW5jZVRhYmxlLm5hbWUsXG4gICAgICAgIFBSSU1BUllfS0VZOiBpbnN0YW5jZVRhYmxlLnByaW1hcnlLZXksXG4gICAgICAgIFNPUlRfS0VZOiBpbnN0YW5jZVRhYmxlLnNvcnRLZXlcbiAgICAgIH0sXG4gICAgICBsb2dSZXRlbnRpb246IFJldGVudGlvbkRheXMuT05FX0RBWSxcbiAgICB9KTtcblxuICAgIHRoaXMuY3JlYXRlSW5zdGFuY2VMYW1iZGEgPSBuZXcgRnVuY3Rpb24oc2NvcGUsICdjcmVhdGVJbnN0YW5jZScsIHtcbiAgICAgIGNvZGU6IG5ldyBBc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ2NyZWF0ZS1pbnN0YW5jZS5oYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IFJ1bnRpbWUuTk9ERUpTXzEwX1gsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBSRVBPX1RBQkxFIDogcmVwb1RhYmxlLm5hbWUsXG4gICAgICAgIFBSSU1BUllfS0VZOiByZXBvVGFibGUucHJpbWFyeUtleSxcbiAgICAgICAgQ0lfVVNFUl9UT0tFTjogQ0lfVVNFUl9UT0tFTixcbiAgICAgICAgU0VDVVJJVFlfR1JPVVA6ICdkZWZhdWx0JyxcbiAgICAgICAgU1RBQ0tfTkFNRTogc2NvcGUuc3RhY2tOYW1lLFxuICAgICAgICBJTUFHRV9JRDogcHJvcHM/LmNyZWF0ZUluc3RhbmNlcz8uaW1hZ2VJZCB8fCAnJ1xuICAgICAgfSxcbiAgICAgIHJvbGU6IHJvbGUsXG4gICAgICBsb2dSZXRlbnRpb246IFJldGVudGlvbkRheXMuT05FX0RBWSxcbiAgICB9KTtcblxuICAgIHRoaXMuY2hlY2tDcmVhdGlvbkFsbG93YW5jZUxhbWJkYSA9IG5ldyBGdW5jdGlvbihzY29wZSwgJ2NoZWNrQ3JlYXRpb25BbGxvd2FuY2VMYW1iZGEnLCB7XG4gICAgICBjb2RlOiBuZXcgQXNzZXRDb2RlKCdzcmMnKSxcbiAgICAgIGhhbmRsZXI6ICdjaGVjay1jcmVhdGlvbi1hbGxvd2FuY2UuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBSdW50aW1lLk5PREVKU18xMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVEFCTEVfTkFNRTogaW5zdGFuY2VUYWJsZS5uYW1lLFxuICAgICAgICBUQUJMRV9TVEFUSUNfTkFNRTogcmVwb1RhYmxlLnByaW1hcnlLZXksXG4gICAgICAgIFBSSU1BUllfS0VZOiBpbnN0YW5jZVRhYmxlLnByaW1hcnlLZXksXG4gICAgICB9LFxuICAgICAgbG9nUmV0ZW50aW9uOiBSZXRlbnRpb25EYXlzLk9ORV9EQVksXG4gICAgfSk7XG5cbiAgICB0aGlzLmNyZWF0ZU9uZUFwaSA9IG5ldyBGdW5jdGlvbihzY29wZSwgJ2NyZWF0ZUl0ZW1GdW5jdGlvbkFwaScsIHtcbiAgICAgIGNvZGU6IG5ldyBBc3NldENvZGUoJ3NyYycpLFxuICAgICAgaGFuZGxlcjogJ2NyZWF0ZS1hcGkuaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBSdW50aW1lLk5PREVKU18xMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgU09SVF9LRVk6IGluc3RhbmNlVGFibGUuc29ydEtleVxuICAgICAgfSxcbiAgICAgIGxvZ1JldGVudGlvbjogUmV0ZW50aW9uRGF5cy5PTkVfREFZLFxuICAgIH0pO1xuXG4gICAgdGhpcy51cGRhdGVPbmVBcGkgPSBuZXcgRnVuY3Rpb24oc2NvcGUsICd1cGRhdGVJdGVtRnVuY3Rpb24nLCB7XG4gICAgICBjb2RlOiBuZXcgQXNzZXRDb2RlKCdzcmMnKSxcbiAgICAgIGhhbmRsZXI6ICd1cGRhdGUtb25lLmhhbmRsZXInLFxuICAgICAgcnVudGltZTogUnVudGltZS5OT0RFSlNfMTBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFNPUlRfS0VZOiBpbnN0YW5jZVRhYmxlLnNvcnRLZXlcbiAgICAgIH0sXG4gICAgICBsb2dSZXRlbnRpb246IFJldGVudGlvbkRheXMuT05FX0RBWSxcbiAgICB9KTtcblxuICAgIG5ldyBDZm5PdXRwdXQoc2NvcGUsICdMR0dyb3VwZENyZWF0ZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnB1dE9uZUl0ZW1MYW1iZGEubG9nR3JvdXAubG9nR3JvdXBOYW1lXG4gICAgfSk7XG5cbiAgICBuZXcgQ2ZuT3V0cHV0KHNjb3BlLCAnTEdHcm91cGRDcmVhdGVJbnN0YW5jZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmNyZWF0ZUluc3RhbmNlTGFtYmRhLmxvZ0dyb3VwLmxvZ0dyb3VwTmFtZVxuICAgIH0pO1xuXG4gICAgbmV3IENmbk91dHB1dChzY29wZSwgJ0xHR3JvdXBkQ3JlYXRlQXBpJywge1xuICAgICAgdmFsdWU6IHRoaXMuY3JlYXRlT25lQXBpLmxvZ0dyb3VwLmxvZ0dyb3VwTmFtZVxuICAgIH0pO1xuXG4gIH1cbn1cbiJdfQ==