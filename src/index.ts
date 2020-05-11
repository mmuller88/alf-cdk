#!/usr/bin/env node
// import autoscaling = require('@aws-cdk/aws-autoscaling');
import ec2 = require('@aws-cdk/aws-ec2');
import elbv2 = require('@aws-cdk/aws-elasticloadbalancingv2');
import { StackProps, Stack, App, CfnOutput } from '@aws-cdk/core';
import { InstanceProps, InstanceType, InstanceClass, InstanceSize, UserData } from '@aws-cdk/aws-ec2';
import { Ec2InstanceType, GitRepo, InstanceItem, InstanceStatus } from './statics';
import { ApplicationProtocol } from '@aws-cdk/aws-elasticloadbalancingv2';
import * as targets from '@aws-cdk/aws-elasticloadbalancingv2-targets';

export interface AlfInstanceProps extends StackProps {
  ciUserToken: string,
  // stackName: string,
  instanceItem: InstanceItem,
  instance: {
    securityGroup: string,
    vpc: string
  }
  customDomain?: {
    hostedZoneId: string,
    domainName: string,
    lb:{
      vpc: {
        id: string,
        subnetId1: string,
        subnetId2: string
      },
      certArn: string
    }
  }
}
class InstanceStack extends Stack {
  constructor(app: App, id: string, props?: AlfInstanceProps) {
    super(app, id, props);

    const vpc = new ec2.Vpc(this, 'VPC');

    const amznLinux = ec2.MachineImage.latestAmazonLinux({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX,
      edition: ec2.AmazonLinuxEdition.STANDARD,
      virtualization: ec2.AmazonLinuxVirt.HVM,
      storage: ec2.AmazonLinuxStorage.GENERAL_PURPOSE,
    });

    const userData : any = `Content-Type: multipart/mixed; boundary="//"
    MIME-Version: 1.0

    --//
    Content-Type: text/cloud-config; charset="us-ascii"
    MIME-Version: 1.0
    Content-Transfer-Encoding: 7bit
    Content-Disposition: attachment; filename="cloud-config.txt"

    #cloud-config
    cloud_final_modules:
    - [scripts-user, always]

    --//
    Content-Type: text/x-shellscript; charset="us-ascii"
    MIME-Version: 1.0
    Content-Transfer-Encoding: 7bit
    Content-Disposition: attachment; filename="userdata.txt"

    #!/bin/bash
    echo "sudo halt" | at now + 55 minutes
    yum -y install git
    REPO=${props?.instanceItem.alfType.gitRepo}
    git clone https://mmuller88:${props?.ciUserToken}@github.com/mmuller88/$REPO /usr/local/$REPO
    cd /usr/local/$REPO
    chmod +x init.sh && ./init.sh
    sudo chmod +x start.sh && ./start.sh
    --//
      `
    const userDataEncoded = Buffer.from(userData).toString('base64');

    const instanceVpc = ec2.Vpc.fromLookup(this, 'defaultVPC', {
      vpcId: props?.instance.vpc || ''
    })

    const instanceProps: InstanceProps = {
      machineImage: amznLinux,
      instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.LARGE),
      keyName: 'ec2dev',
      vpc: instanceVpc,
      userData: UserData.forLinux({
        shebang: userDataEncoded
      })
      // InstanceInitiatedShutdownBehavior: 'terminate',
    }

    // console.debug("instanceProps: ", JSON.stringify(instanceProps));
    const instance = new ec2.Instance(this, 'bla', instanceProps);
    // console.debug("instance: ", JSON.stringify(instance));

    // const asg = new autoscaling.AutoScalingGroup(this, 'ASG', {
    //   vpc,
    //   instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
    //   machineImage: new ec2.AmazonLinuxImage(),
    // });

    if(props?.customDomain){
      const lb = new elbv2.ApplicationLoadBalancer(this, 'LB', {
        vpc,
        internetFacing: true
      });

      // console.debug("lb: ", JSON.stringify(lb));

      // const targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      //   targetGroupName: `tg-${props?.instanceItem.alfInstanceId}`,
      //   port: 80,
      //   protocol: ApplicationProtocol.HTTP,
      // })

      const listener = lb.addListener('Listener', {
        protocol: ApplicationProtocol.HTTPS,
        port: 443,
        certificateArns: [props?.customDomain.lb.certArn || ''],
      });

      listener.addTargets('Target', {
        targets: [new targets.InstanceTarget(instance)],
        protocol: ApplicationProtocol.HTTP,
        port: 80,
      });

      // console.debug("listener: ", JSON.stringify(listener));

      // listener.connections.allowDefaultPortFromAnyIpv4('Open to the world');

      // asg.scaleOnRequestCount('AModestLoad', {
      //   targetRequestsPerSecond: 1
      // });
    }

    new CfnOutput(this, 'PublicDNS', {
      value: instance.instancePublicDnsName
    });
  }
}

const app = new App();
new InstanceStack(app, 'InstanceStack', {
  env: {
    region: 'eu-west-2',
    account: '609841182532'
  },
  ciUserToken: '',
  // stackName: '',
  instanceItem: {
    alfInstanceId: '12ab',
    userId: 'martin',
    expectedStatus: InstanceStatus.running,
    tags:{
      name: 'no name'
    },
    alfType: {
      ec2InstanceType: Ec2InstanceType.t2large,
      gitRepo: GitRepo.alfec21,
    }
  },
  instance: {
    securityGroup: 'default',
    vpc: 'default'
  },
  // customDomain: {
  //   hostedZoneId: '',
  //   domainName: '',
  //   lb:{
  //     vpc: {
  //       id: '',
  //       subnetId1: '',
  //       subnetId2: ''
  //     },
  //     certArn: ''
  //   }
  // }
});
app.synth();
