
import { DynamoDB } from 'aws-sdk';
import { EC2 } from 'aws-sdk';
import { instanceTable } from './statics';
import { STATUS_CODES } from 'http';

const STACK_NAME = process.env.STACK_NAME || '';

const db = new DynamoDB.DocumentClient();
const ec2 = new EC2();

export const handler = async (event: any = {}): Promise<any> => {
  console.debug("executer event: " + JSON.stringify(event));

  try {
    var response = await db.scan({
      TableName: instanceTable.name,
    }).promise();

    console.debug('DB results :' + JSON.stringify(response.Items));

    response.Items?.forEach(async item => {
      const instanceId = item[instanceTable.alfInstanceId];
      const expectedStatus = item[instanceTable.expectedStatus]
      console.debug(`instanceId: ${instanceId} is expected to be: ${expectedStatus}`);

      // ec2 update ...
      const ec2params: EC2.Types.DescribeInstancesRequest  = {
        Filters: [
          // { Name: 'instance-state-code', Values: ['16'] },
          { Name: 'tag:STACK_NAME', Values: [STACK_NAME] },
          { Name: `tag:${instanceTable.sortKey}`, Values: [instanceId] }
        ]
      }
      console.debug("ec2Params: " + JSON.stringify(ec2params));
      var ec2Instances: EC2.Types.DescribeInstancesResult = await ec2.describeInstances(ec2params).promise();

      console.debug('ec2 reservation found: ' + JSON.stringify(ec2Instances.Reservations))

      const reservations = ec2Instances.Reservations;
      if(reservations){
        if(reservations[0] && reservations[0].Instances && reservations[0]?.Instances[0]){
          const instance = reservations[0]?.Instances[0];
          console.debug('Found Ec2 start update :)')
          console.debug('ec2 instance found' + JSON.stringify(instance))

          if(instance.State?.Name != expectedStatus) {
            console.debug('instance.State?.Name != expectedStatus   NOOOICE)')
            if(expectedStatus === 'terminated'){
              const terParams: EC2.Types.TerminateInstancesRequest = {
                InstanceIds: [instance.InstanceId || '']
              }
              const terminateResult = await ec2.terminateInstances(terParams).promise();
              console.debug('terminateResult: ' + JSON.stringify(terminateResult) )
            }
          }

          console.debug('DB Update about lastUpdate ...')
        } else {
          console.debug('No Ec2 Instance with that instanceId and Stack Name found :-/')
        }

      }else{
        console.debug('Coudlnt find ec2 instance ?!?!')
      }
      item['MapAttribute'] = {
        [instanceTable.lastStatus]: {
          [instanceTable.lastUpdate]: new Date().toTimeString(),
          [instanceTable.status]: 'stopped'
        }
      }

      console.debug('item: ' + JSON.stringify(item));

      const params: DynamoDB.DocumentClient.PutItemInput = {
        TableName: instanceTable.name,
        Item: item
      };

      console.debug('params put: ' + JSON.stringify(params));
      // const putResult = await db.put(params).promise();
      // console.debug('putResult :' + JSON.stringify(putResult));
    });

    return { statusCode: 200};
  } catch (error) {
    return { statusCode: 500, error: error };
  }

}
