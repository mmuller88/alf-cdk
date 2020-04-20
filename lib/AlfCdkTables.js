"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const aws_dynamodb_1 = require("@aws-cdk/aws-dynamodb");
const core_1 = require("@aws-cdk/core");
const statics_1 = require("../src/statics");
;
class AlfCdkTables {
    constructor(scope, lambdas) {
        this.dynamoInstanceTable = new aws_dynamodb_1.Table(scope, statics_1.instanceTable.name, {
            partitionKey: {
                name: statics_1.instanceTable.primaryKey,
                type: aws_dynamodb_1.AttributeType.STRING
            },
            sortKey: {
                name: statics_1.instanceTable.sortKey,
                type: aws_dynamodb_1.AttributeType.STRING
            },
            tableName: statics_1.instanceTable.name,
            removalPolicy: core_1.RemovalPolicy.DESTROY,
        });
        this.dynamoStaticTable = new aws_dynamodb_1.Table(scope, statics_1.staticTable.name, {
            partitionKey: {
                name: statics_1.staticTable.primaryKey,
                type: aws_dynamodb_1.AttributeType.STRING
            },
            tableName: statics_1.staticTable.name,
            removalPolicy: core_1.RemovalPolicy.DESTROY,
        });
        this.dynamoRepoTable = new aws_dynamodb_1.Table(scope, statics_1.repoTable.name, {
            partitionKey: {
                name: statics_1.repoTable.primaryKey,
                type: aws_dynamodb_1.AttributeType.NUMBER
            },
            tableName: statics_1.repoTable.name,
            removalPolicy: core_1.RemovalPolicy.DESTROY,
        });
        this.dynamoAdminTable = new aws_dynamodb_1.Table(scope, statics_1.adminTable.name, {
            partitionKey: {
                name: statics_1.adminTable.primaryKey,
                type: aws_dynamodb_1.AttributeType.STRING
            },
            tableName: statics_1.adminTable.name,
            removalPolicy: core_1.RemovalPolicy.DESTROY,
        });
        this.dynamoInstanceTable.grantFullAccess(lambdas.getAllLambda);
        this.dynamoInstanceTable.grantFullAccess(lambdas.getOneLambda);
        this.dynamoInstanceTable.grantFullAccess(lambdas.putOneItemLambda);
        this.dynamoInstanceTable.grantFullAccess(lambdas.deleteOne);
        this.dynamoInstanceTable.grantFullAccess(lambdas.checkCreationAllowanceLambda);
        this.dynamoRepoTable.grantFullAccess(lambdas.createInstanceLambda);
        new core_1.CfnOutput(scope, 'TableName', {
            value: this.dynamoInstanceTable.tableName
        });
        new core_1.CfnOutput(scope, 'RepoTableName', {
            value: this.dynamoRepoTable.tableName
        });
    }
}
exports.AlfCdkTables = AlfCdkTables;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWxmQ2RrVGFibGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQWxmQ2RrVGFibGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsd0RBQTZEO0FBQzdELHdDQUFvRTtBQUVwRSw0Q0FBbUY7QUFPbEYsQ0FBQztBQUVGLE1BQWEsWUFBWTtJQU12QixZQUFZLEtBQWdCLEVBQUUsT0FBc0I7UUFDbEQsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksb0JBQUssQ0FBQyxLQUFLLEVBQUUsdUJBQWEsQ0FBQyxJQUFJLEVBQUU7WUFDOUQsWUFBWSxFQUFFO2dCQUNaLElBQUksRUFBRSx1QkFBYSxDQUFDLFVBQVU7Z0JBQzlCLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU07YUFDM0I7WUFDRCxPQUFPLEVBQUU7Z0JBQ1AsSUFBSSxFQUFFLHVCQUFhLENBQUMsT0FBTztnQkFDM0IsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTTthQUMzQjtZQUNELFNBQVMsRUFBRSx1QkFBYSxDQUFDLElBQUk7WUFDN0IsYUFBYSxFQUFFLG9CQUFhLENBQUMsT0FBTztTQUNyQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxvQkFBSyxDQUFDLEtBQUssRUFBRSxxQkFBVyxDQUFDLElBQUksRUFBRTtZQUMxRCxZQUFZLEVBQUU7Z0JBQ1osSUFBSSxFQUFFLHFCQUFXLENBQUMsVUFBVTtnQkFDNUIsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTTthQUMzQjtZQUNELFNBQVMsRUFBRSxxQkFBVyxDQUFDLElBQUk7WUFDM0IsYUFBYSxFQUFFLG9CQUFhLENBQUMsT0FBTztTQUNyQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksb0JBQUssQ0FBQyxLQUFLLEVBQUUsbUJBQVMsQ0FBQyxJQUFJLEVBQUU7WUFDdEQsWUFBWSxFQUFFO2dCQUNaLElBQUksRUFBRSxtQkFBUyxDQUFDLFVBQVU7Z0JBQzFCLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU07YUFDM0I7WUFDRCxTQUFTLEVBQUUsbUJBQVMsQ0FBQyxJQUFJO1lBQ3pCLGFBQWEsRUFBRSxvQkFBYSxDQUFDLE9BQU87U0FDckMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksb0JBQUssQ0FBQyxLQUFLLEVBQUUsb0JBQVUsQ0FBQyxJQUFJLEVBQUU7WUFDeEQsWUFBWSxFQUFFO2dCQUNaLElBQUksRUFBRSxvQkFBVSxDQUFDLFVBQVU7Z0JBQzNCLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU07YUFDM0I7WUFDRCxTQUFTLEVBQUUsb0JBQVUsQ0FBQyxJQUFJO1lBQzFCLGFBQWEsRUFBRSxvQkFBYSxDQUFDLE9BQU87U0FDckMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDL0QsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDL0QsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUNuRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM1RCxJQUFJLENBQUMsbUJBQW1CLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO1FBQy9FLElBQUksQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBRW5FLElBQUksZ0JBQVMsQ0FBQyxLQUFLLEVBQUUsV0FBVyxFQUFFO1lBQ2hDLEtBQUssRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUztTQUMxQyxDQUFDLENBQUM7UUFFSCxJQUFJLGdCQUFTLENBQUMsS0FBSyxFQUFFLGVBQWUsRUFBRTtZQUNwQyxLQUFLLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTO1NBQ3RDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQTlERCxvQ0E4REMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUYWJsZSwgQXR0cmlidXRlVHlwZSB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1keW5hbW9kYic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QsIFJlbW92YWxQb2xpY3ksIENmbk91dHB1dCB9IGZyb20gJ0Bhd3MtY2RrL2NvcmUnO1xuaW1wb3J0IHsgQWxmQ2RrTGFtYmRhcyB9IGZyb20gJy4vQWxmQ2RrTGFtYmRhcyc7XG5pbXBvcnQgeyBpbnN0YW5jZVRhYmxlLCBzdGF0aWNUYWJsZSwgcmVwb1RhYmxlLCBhZG1pblRhYmxlIH0gZnJvbSAnLi4vc3JjL3N0YXRpY3MnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEFsZkNka1RhYmxlc0ludGVyZmFjZSB7XG4gIHJlYWRvbmx5IGR5bmFtb0luc3RhbmNlVGFibGU6IFRhYmxlLFxuICByZWFkb25seSBkeW5hbW9TdGF0aWNUYWJsZTogVGFibGUsXG4gIHJlYWRvbmx5IGR5bmFtb1JlcG9UYWJsZTogVGFibGUsXG4gIHJlYWRvbmx5IGR5bmFtb0FkbWluVGFibGU6IFRhYmxlLFxufTtcblxuZXhwb3J0IGNsYXNzIEFsZkNka1RhYmxlcyBpbXBsZW1lbnRzIEFsZkNka1RhYmxlc0ludGVyZmFjZXtcbiAgZHluYW1vSW5zdGFuY2VUYWJsZTogVGFibGU7XG4gIGR5bmFtb1N0YXRpY1RhYmxlOiBUYWJsZTtcbiAgZHluYW1vUmVwb1RhYmxlOiBUYWJsZTtcbiAgZHluYW1vQWRtaW5UYWJsZTogVGFibGU7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgbGFtYmRhczogQWxmQ2RrTGFtYmRhcyl7XG4gICAgdGhpcy5keW5hbW9JbnN0YW5jZVRhYmxlID0gbmV3IFRhYmxlKHNjb3BlLCBpbnN0YW5jZVRhYmxlLm5hbWUsIHtcbiAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICBuYW1lOiBpbnN0YW5jZVRhYmxlLnByaW1hcnlLZXksXG4gICAgICAgIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HXG4gICAgICB9LFxuICAgICAgc29ydEtleToge1xuICAgICAgICBuYW1lOiBpbnN0YW5jZVRhYmxlLnNvcnRLZXksXG4gICAgICAgIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HXG4gICAgICB9LFxuICAgICAgdGFibGVOYW1lOiBpbnN0YW5jZVRhYmxlLm5hbWUsXG4gICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIE5PVCByZWNvbW1lbmRlZCBmb3IgcHJvZHVjdGlvbiBjb2RlXG4gICAgfSk7XG5cbiAgICB0aGlzLmR5bmFtb1N0YXRpY1RhYmxlID0gbmV3IFRhYmxlKHNjb3BlLCBzdGF0aWNUYWJsZS5uYW1lLCB7XG4gICAgICBwYXJ0aXRpb25LZXk6IHtcbiAgICAgICAgbmFtZTogc3RhdGljVGFibGUucHJpbWFyeUtleSxcbiAgICAgICAgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkdcbiAgICAgIH0sXG4gICAgICB0YWJsZU5hbWU6IHN0YXRpY1RhYmxlLm5hbWUsXG4gICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIE5PVCByZWNvbW1lbmRlZCBmb3IgcHJvZHVjdGlvbiBjb2RlXG4gICAgfSk7XG5cbiAgICB0aGlzLmR5bmFtb1JlcG9UYWJsZSA9IG5ldyBUYWJsZShzY29wZSwgcmVwb1RhYmxlLm5hbWUsIHtcbiAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICBuYW1lOiByZXBvVGFibGUucHJpbWFyeUtleSxcbiAgICAgICAgdHlwZTogQXR0cmlidXRlVHlwZS5OVU1CRVJcbiAgICAgIH0sXG4gICAgICB0YWJsZU5hbWU6IHJlcG9UYWJsZS5uYW1lLFxuICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAvLyBOT1QgcmVjb21tZW5kZWQgZm9yIHByb2R1Y3Rpb24gY29kZVxuICAgIH0pO1xuXG4gICAgdGhpcy5keW5hbW9BZG1pblRhYmxlID0gbmV3IFRhYmxlKHNjb3BlLCBhZG1pblRhYmxlLm5hbWUsIHtcbiAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICBuYW1lOiBhZG1pblRhYmxlLnByaW1hcnlLZXksXG4gICAgICAgIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HXG4gICAgICB9LFxuICAgICAgdGFibGVOYW1lOiBhZG1pblRhYmxlLm5hbWUsXG4gICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIE5PVCByZWNvbW1lbmRlZCBmb3IgcHJvZHVjdGlvbiBjb2RlXG4gICAgfSk7XG5cbiAgICB0aGlzLmR5bmFtb0luc3RhbmNlVGFibGUuZ3JhbnRGdWxsQWNjZXNzKGxhbWJkYXMuZ2V0QWxsTGFtYmRhKTtcbiAgICB0aGlzLmR5bmFtb0luc3RhbmNlVGFibGUuZ3JhbnRGdWxsQWNjZXNzKGxhbWJkYXMuZ2V0T25lTGFtYmRhKTtcbiAgICB0aGlzLmR5bmFtb0luc3RhbmNlVGFibGUuZ3JhbnRGdWxsQWNjZXNzKGxhbWJkYXMucHV0T25lSXRlbUxhbWJkYSk7XG4gICAgdGhpcy5keW5hbW9JbnN0YW5jZVRhYmxlLmdyYW50RnVsbEFjY2VzcyhsYW1iZGFzLmRlbGV0ZU9uZSk7XG4gICAgdGhpcy5keW5hbW9JbnN0YW5jZVRhYmxlLmdyYW50RnVsbEFjY2VzcyhsYW1iZGFzLmNoZWNrQ3JlYXRpb25BbGxvd2FuY2VMYW1iZGEpO1xuICAgIHRoaXMuZHluYW1vUmVwb1RhYmxlLmdyYW50RnVsbEFjY2VzcyhsYW1iZGFzLmNyZWF0ZUluc3RhbmNlTGFtYmRhKTtcblxuICAgIG5ldyBDZm5PdXRwdXQoc2NvcGUsICdUYWJsZU5hbWUnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5keW5hbW9JbnN0YW5jZVRhYmxlLnRhYmxlTmFtZVxuICAgIH0pO1xuXG4gICAgbmV3IENmbk91dHB1dChzY29wZSwgJ1JlcG9UYWJsZU5hbWUnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5keW5hbW9SZXBvVGFibGUudGFibGVOYW1lXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==