import ecs = require('@aws-cdk/aws-ecs');

// Create an ECS cluster
const cluster = new ecs.Cluster(this, 'Cluster', {
  vpc,
});

// Add capacity to it
cluster.addCapacity('DefaultAutoScalingGroupCapacity', {
  instanceType: new ec2.InstanceType("t2.xlarge"),
  desiredCapacity: 3,
});

const taskDefinition = new ecs.Ec2TaskDefinition(this, 'TaskDef');

taskDefinition.addContainer('DefaultContainer', {
  image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
  memoryLimitMiB: 512,
});

// Instantiate an Amazon ECS Service
const ecsService = new ecs.Ec2Service(this, 'Service', {
  cluster,
  taskDefinition,
});
