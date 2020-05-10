
import { EC2,
  // ELBv2
} from 'aws-sdk';
import { instanceTable, InstanceItem, InstanceStatus } from './statics';

const STACK_NAME = process.env.STACK_NAME || '';

const ec2 = new EC2();
// const elb = new ELBv2();

export const handler = async (input: any = {}): Promise<any> => {
  console.debug("executer-list data: " + JSON.stringify(input));

  const inputObj: any = typeof input === 'object' ? input : JSON.parse(input);

  var item: InstanceItem = inputObj.item;

  // const instanceId = inputObj.instanceId;

  const alfInstanceId = item.alfInstanceId;
  const expectedStatus = item.expectedStatus;

  // const lbParams: ELBv2.Types.DescribeLoadBalancersInput  = {
    // Filters: [
    //   // { Name: 'instance-state-code', Values: ['16'] },
    //   { Name: 'tag:STACK_NAME', Values: [STACK_NAME] },
    //   { Name: `tag:${instanceTable.sortKey}`, Values: [alfInstanceId] }
    // ]
  // }
  // const lbResult = await elb.describeLoadBalancers(lbParams).promise();
  // elb.

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
      updateState = expectedStatus === InstanceStatus.terminated || status != expectedStatus;
      if(updateState) {
        console.debug('instance.State?.Name != expectedStatus   NOOOICE)')
        const terParams: EC2.Types.TerminateInstancesRequest = {
          InstanceIds: [instance.InstanceId || '']
        }
        const terminateResult = await ec2.terminateInstances(terParams).promise();
        console.debug('terminateResult: ' + JSON.stringify(terminateResult));
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
