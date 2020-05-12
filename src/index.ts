#!/usr/bin/env node
// import autoscaling = require('@aws-cdk/aws-autoscaling');
import { Vpc, MachineImage, AmazonLinuxGeneration, AmazonLinuxEdition, AmazonLinuxVirt, AmazonLinuxStorage, Instance, SecurityGroup, Peer, Port, SubnetType } from '@aws-cdk/aws-ec2';
import { ApplicationLoadBalancer } from '@aws-cdk/aws-elasticloadbalancingv2';
import { StackProps, Stack, App, CfnOutput } from '@aws-cdk/core';
import { InstanceProps, InstanceType, InstanceClass, InstanceSize, UserData } from '@aws-cdk/aws-ec2';
import { Ec2InstanceType, GitRepo, InstanceItem, InstanceStatus } from './statics';
import { ApplicationProtocol, InstanceTarget } from '@aws-cdk/aws-elasticloadbalancingv2';
import { AddressRecordTarget, ARecord, HostedZone } from '@aws-cdk/aws-route53';
import { LoadBalancerTarget } from '@aws-cdk/aws-route53-targets';

export interface AlfInstanceProps extends StackProps {
  instanceItem: InstanceItem,
  instance: {
    securityGroup: string,
    vpc: string
  },
  lb: {
    certArn: string
  },
  customDomain?: {
    hostedZoneId: string,
    domainName: string,
  }
}
class InstanceStack extends Stack {
  constructor(app: App, id: string, props?: AlfInstanceProps) {
    super(app, id, props);

    const amznLinux = MachineImage.latestAmazonLinux({
      generation: AmazonLinuxGeneration.AMAZON_LINUX,
      edition: AmazonLinuxEdition.STANDARD,
      virtualization: AmazonLinuxVirt.HVM,
      storage: AmazonLinuxStorage.GENERAL_PURPOSE,
    });

    const ciUserToken = process.env.CI_USER_TOKEN || '';

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
    git clone https://mmuller88:${ciUserToken}@github.com/mmuller88/$REPO /usr/local/$REPO
    cd /usr/local/$REPO
    chmod +x init.sh && ./init.sh
    sudo chmod +x start.sh && ./start.sh
    --//
      `
    const userDataEncoded = Buffer.from(userData).toString('base64');

    const instanceVpc = new Vpc(this, 'VPC', {
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'ingress',
          subnetType: SubnetType.PUBLIC,
        },
        // {
        //   cidrMask: 24,
        //   name: 'application',
        //   subnetType: ec2.SubnetType.PRIVATE,
        // },
        // {
        //   cidrMask: 28,
        //   name: 'rds',
        //   subnetType: ec2.SubnetType.ISOLATED,
        // }
     ]
    });

    // const instanceVpc = Vpc.fromLookup(this, 'defaultVPC', {
    //   vpcId: props?.instance.vpc || ''
    // })

    const alfInstanceId = props?.instanceItem.alfInstanceId;

    const securityGroup = new SecurityGroup(this, 'alfSecurityGroup', {
      vpc: instanceVpc,
      securityGroupName: `secg-${alfInstanceId}`,
    })

    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80));
    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(22));

    const instanceProps: InstanceProps = {
      machineImage: amznLinux,
      instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.LARGE),
      keyName: 'ec2dev',
      vpc: instanceVpc,
      securityGroup,
      userData: UserData.forLinux({
        shebang: userDataEncoded
      })
      // InstanceInitiatedShutdownBehavior: 'terminate',
    }

    // console.debug("instanceProps: ", JSON.stringify(instanceProps));
    const instance = new Instance(this, 'alfInstance', instanceProps);
    // console.debug("instance: ", JSON.stringify(instance));


    // const asg = new autoscaling.AutoScalingGroup(this, 'ASG', {
    //   vpc,
    //   instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
    //   machineImage: new ec2.AmazonLinuxImage(),
    // });

    const lb = new ApplicationLoadBalancer(this, 'LB', {
      vpc: instanceVpc,
      internetFacing: true
    });

    // console.debug("lb: ", JSON.stringify(lb));

      // const targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      //   targetGroupName: `tg-${props?.instanceItem.alfInstanceId}`,
      //   port: 80,
      //   protocol: ApplicationProtocol.HTTP,
      // })


    var listener;

    if(props?.customDomain){

      listener = lb.addListener('Listener', {
        protocol: ApplicationProtocol.HTTPS,
        port: 443,
        certificateArns: [props?.lb.certArn || ''],
      });

      const zone = HostedZone.fromLookup(this, 'Zone', { domainName: props.customDomain.domainName });

      new ARecord(this, 'InstanceAliasRecord', {
        recordName: props.customDomain.domainName,
        target: AddressRecordTarget.fromAlias(new LoadBalancerTarget(lb)),
        zone
    });

      // console.debug("listener: ", JSON.stringify(listener));

      // listener.connections.allowDefaultPortFromAnyIpv4('Open to the world');

      // asg.scaleOnRequestCount('AModestLoad', {
      //   targetRequestsPerSecond: 1
      // });
    } else {
      listener = lb.addListener('Listener', {
        protocol: ApplicationProtocol.HTTP,
        port: 80
      });
    }

    listener.addTargets('Target', {
      targets: [new InstanceTarget(instance.instanceId)],
      protocol: ApplicationProtocol.HTTP,
      port: 80,
    });

    new CfnOutput(this, 'InstancePublicDnsName', {
      value: instance.instancePublicDnsName
    });

    new CfnOutput(this, 'LoadBalancerDnsName', {
      value: lb.loadBalancerDnsName
    });
  }
}

const app = new App();
new InstanceStack(app, 'InstanceStack', {
  env: {
    region: 'eu-west-2',
    account: '609841182532'
  },
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
    securityGroup: 'sg-d6926fbb',
    vpc: 'vpc-0539935cc868d3fac'
  },
  lb: {
    certArn: ''
  },
  // customDomain: {
  //   hostedZoneId: '',
  //   domainName: '',
  // }
});
app.synth();
