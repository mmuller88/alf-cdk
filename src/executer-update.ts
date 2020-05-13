
import { EC2, Route53 } from 'aws-sdk';
import { instanceTable, InstanceItem, InstanceStatus } from './statics';

const STACK_NAME = process.env.STACK_NAME || '';
const HOSTED_ZONE_ID = process.env.HOSTED_ZONE_ID || '';
const DOMAIN_NAME = process.env.DOMAIN_NAME || '';

const ec2 = new EC2();
const route = new Route53();

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
      updateState = status != expectedStatus && status != InstanceStatus.terminated && status != 'terminating';
      if(updateState) {
        console.debug('instance.State?.Name != expectedStatus   NOOOICE)')
        if(expectedStatus === InstanceStatus.terminated){
          const terParams: EC2.Types.TerminateInstancesRequest = {
            InstanceIds: [instance.InstanceId || '']
          }
          const terminateResult = await ec2.terminateInstances(terParams).promise();
          console.debug('terminateResult: ' + JSON.stringify(terminateResult));

          if (HOSTED_ZONE_ID && DOMAIN_NAME){

            const recordParams: Route53.Types.ChangeResourceRecordSetsRequest = {
              HostedZoneId: HOSTED_ZONE_ID,
              ChangeBatch: {
                Changes: [ {
                  Action: "DELETE",
                  ResourceRecordSet: {
                    TTL: 300,
                    Name: `${item.alfInstanceId}.${DOMAIN_NAME}`,
                    ResourceRecords: [ {Value: instance.PublicDnsName || ''}],
                    // AliasTarget: {
                    //   HostedZoneId: lbResult.LoadBalancers?.[0].CanonicalHostedZoneId || '',
                    //   DNSName: lbResult.LoadBalancers?.[0].DNSName || '',
                    //   EvaluateTargetHealth: false
                    // },
                    Type: 'CNAME'
                  }
                }
                ]
              }
            }
            console.debug("recordParams: ", JSON.stringify(recordParams));
            const recordResult = await route.changeResourceRecordSets(recordParams).promise();
            console.debug("recordResult: ", JSON.stringify(recordResult));
          }
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
