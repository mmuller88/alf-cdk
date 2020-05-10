
import { EC2 } from 'aws-sdk';
import { instanceTable, InstanceItem, InstanceStatus } from './statics';

const STACK_NAME = process.env.STACK_NAME || '';

const ec2 = new EC2();

export const handler = async (input: any = {}): Promise<any> => {
  console.debug("executer-list data: " + JSON.stringify(input));

  const inputObj: any = typeof input === 'object' ? input : JSON.parse(input);

  var item: InstanceItem = inputObj.item;

  const alfInstanceId = item.alfInstanceId;
  const forceStatus: InstanceStatus = inputObj['forceStatus'];
  const expectedStatus = forceStatus === InstanceStatus.stopped && item.expectedStatus === InstanceStatus.running ? InstanceStatus.stopped : item.expectedStatus;
  item.expectedStatus = expectedStatus;

  const ec2params: EC2.Types.DescribeInstancesRequest  = {
    Filters: [
      // { Name: 'instance-state-code', Values: ['16'] },
      { Name: 'tag:STACK_NAME', Values: [STACK_NAME] },
      { Name: `tag:${instanceTable.sortKey}`, Values: [alfInstanceId] }
    ]
  }
  console.debug("ec2Params: " + JSON.stringify(ec2params));
  var ec2Instances: EC2.Types.DescribeInstancesResult = await ec2.describeInstances(ec2params).promise();

  console.debug('ec2 reservation found: ' + JSON.stringify(ec2Instances.Reservations))

  var updateState = false;
  const reservations = ec2Instances.Reservations;
  if(reservations){
    if(reservations[0] && reservations[0].Instances && reservations[0]?.Instances[0]){
      const instance = reservations[0]?.Instances[0];
      console.debug('Found Ec2 start update :)')
      console.debug('ec2 instance found' + JSON.stringify(instance))

      const status = instance.State?.Name
      console.debug(`status: ${status} expectedStatus: ${expectedStatus}`)
      updateState = status != expectedStatus;
      // a terminated instance can't be stopped
      updateState = updateState || !(expectedStatus === InstanceStatus.stopped && status === InstanceStatus.terminated)
      if(updateState) {
        console.debug('instance.State?.Name != expectedStatus   NOOOICE)')
        if(expectedStatus === InstanceStatus.terminated){
          const terParams: EC2.Types.TerminateInstancesRequest = {
            InstanceIds: [instance.InstanceId || '']
          }
          const terminateResult = await ec2.terminateInstances(terParams).promise();
          console.debug('terminateResult: ' + JSON.stringify(terminateResult));
        } else {
          if (expectedStatus === InstanceStatus.stopped){
            const stopParams: EC2.Types.StopInstancesRequest = {
              InstanceIds: [instance.InstanceId || '']
            }
            const stopResult = await ec2.stopInstances(stopParams).promise();
            console.debug('stopResult: ' + JSON.stringify(stopResult));
          } else if (expectedStatus === InstanceStatus.running) {
            const startParams: EC2.Types.StartInstancesRequest = {
              InstanceIds: [instance.InstanceId || '']
            }
            const startResult = await ec2.startInstances(startParams).promise();
            console.debug('runResult: ' + JSON.stringify(startResult));
          } else {
            throw new Error(`NOT HANDLED status!!!! status: ${status} expectedStatus: ${expectedStatus}`);
          }

        }
      }
      // console.debug('DB Update about lastUpdate ...')
    } else {
      console.debug('No Ec2 Instance with that instanceId and Stack Name found :-/')
    }

  }else{
    console.debug('Coudlnt find ec2 instance ?!?!')
  }


  return { item: item, updateState: updateState}
}
