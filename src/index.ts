#!/usr/bin/env node
// import autoscaling = require('@aws-cdk/aws-autoscaling');
import ec2 = require('@aws-cdk/aws-ec2');
import elbv2 = require('@aws-cdk/aws-elasticloadbalancingv2');
import cdk = require('@aws-cdk/core');
// import { InstanceProps } from '@aws-cdk/aws-ec2';

class LoadBalancerStack extends cdk.Stack {
  constructor(app: cdk.App, id: string) {
    super(app, id);

    const vpc = new ec2.Vpc(this, 'VPC');

    // const amznLinux = ec2.MachineImage.latestAmazonLinux({
    //   generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX,
    //   edition: ec2.AmazonLinuxEdition.STANDARD,
    //   virtualization: ec2.AmazonLinuxVirt.HVM,
    //   storage: ec2.AmazonLinuxStorage.GENERAL_PURPOSE,
    // });

    // const instanceProps: InstanceProps = {
    //   machineImage: amznLinux,
    //   instanceType: item.alfType.ec2InstanceType,
    //   KeyName: 'ec2dev',
    //   MinCount: 1,
    //   MaxCount: 1,
    //   InstanceInitiatedShutdownBehavior: 'terminate',
    //   SecurityGroups: [SECURITY_GROUP],
    //   UserData: userDataEncoded,
    // }
    // const instance = new ec2.Instance(this, 'bla', ):

    // const asg = new autoscaling.AutoScalingGroup(this, 'ASG', {
    //   vpc,
    //   instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
    //   machineImage: new ec2.AmazonLinuxImage(),
    // });

    const lb = new elbv2.ApplicationLoadBalancer(this, 'LB', {
      vpc,
      internetFacing: true
    });

    const listener = lb.addListener('Listener', {
      port: 80,
    });

    listener.addTargets('Target', {
      port: 80,
      // targets: [asg]
    });

    listener.connections.allowDefaultPortFromAnyIpv4('Open to the world');

    // asg.scaleOnRequestCount('AModestLoad', {
    //   targetRequestsPerSecond: 1
    // });
  }
}

const app = new cdk.App();
new LoadBalancerStack(app, 'LoadBalancerStack');
app.synth();
