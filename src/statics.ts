export enum Stage {
  dev = 'dev',
  prod = 'prod',
}

export enum DeployRegions {
  usEast1 = 'us-east-1',
  usEast2 = 'us-east-2',
  euWest1 = 'eu-west-1',
  euWest2 = 'eu-west-2',
}

export const accountConfig: AccountConfig = {
  prodAccount: {
    account: '981237193288',
    region: DeployRegions.usEast1,
    stage: Stage.prod,
    defaultVpc: 'vpc-615bf91b',
  },
  devAccount: {
    account: '981237193288',
    region: DeployRegions.euWest1,
    stage: Stage.dev,
    defaultVpc: 'vpc-196c437f',
  },
};

export interface AccountConfig {
  [name: string]: {
    readonly account: string;
    readonly region: DeployRegions;
    readonly stage: Stage;
    readonly defaultVpc: string;
  };
}

export const instanceTable = {
  name: 'alfInstances',
  userId: 'userId',
  alfType: 'alfType',
  expectedStatus: 'expectedStatus',
  instanceId: 'instanceId',
  // lastStatus: 'lastStatus',
  lastUpdate: 'lastUpdate',
  status: 'status',
};

export function mapToInstanceItem(instanceItemMap: { [key: string]: any }) {
  const instanceItem: InstanceItem = {
    instanceId: instanceItemMap.instanceId,
    userId: instanceItemMap.userId,
    alfType: instanceItemMap.alfType,
    expectedStatus: instanceItemMap.expectedStatus,
    tags: instanceItemMap.tags,
    region: instanceItemMap.region,
  };

  return instanceItem;
}

export interface AlfTypes {
  [ec2InstanceType: string]: string[];
}

export enum Ec2InstanceType {
  t2large = 't2.large',
  t2xlarge = 't2.xlarge',
}

export enum GitRepo {
  alfec21 = 'alf-ec2-1',
}
// export interface Item {
//   readonly
// }

export enum InstanceStatus {
  running = 'running',
  stopped = 'stopped',
  terminated = 'terminated',
}

// export const staticTable = { name: 'staticTable', primaryKey: 'itemsId'};
// export const repoTable = {
//   name: 'repoTable',
//   primaryKey: 'alfType',
//   alfType: 'alfType'
// };

export interface AlfType {
  readonly ec2InstanceType: Ec2InstanceType;
  readonly gitRepo: GitRepo;
}

export interface InstanceCore {
  instanceId: string;
  userId: string;
}

export interface InstanceItem extends InstanceCore {
  alfType: AlfType;
  expectedStatus: InstanceStatus;
  tags?: {
    [name: string]: string;
  };
  region: string;
}

export interface Instance extends InstanceCore {
  readonly tags?: string | undefined;
  readonly alfType: AlfType;
  // readonly shortLived: boolean;
  url: string | undefined;
  awsUrl?: string | undefined;
  readonly status: string | undefined;
  readonly adminCredentials: {
    readonly userName: string;
    readonly password: string;
  };
}
