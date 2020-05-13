
export const instanceTable = {
  name: 'alfInstances',
  userId: 'userId',
  primaryKey: 'userId',
  sortKey: 'alfInstanceId',
  alfType: 'alfType',
  expectedStatus: 'expectedStatus',
  alfInstanceId: 'alfInstanceId',
  lastStatus: 'lastStatus',
  lastUpdate: 'lastUpdate',
  status: 'status'
};

export interface InstanceItem{
  alfInstanceId: string,
  readonly userId: string,
  alfType: AlfType,
  expectedStatus: InstanceStatus,
  tags?: {
    [name: string] : string
  }
  readonly lastStatus?: {
    readonly lastUpdate: string,
    readonly status: InstanceStatus
  }
}

export interface AlfTypes {
  [ec2InstanceType: string]: string[]
}

export enum Ec2InstanceType {
  t2large = 't2.large',
  t2xlarge = 't2.xlarge'
}

export enum GitRepo {
  alfec21 = 'alf-ec2-1'
}
// export interface Item {
//   readonly
// }

export enum InstanceStatus {
  running = 'running',
  stopped = 'stopped',
  terminated = 'terminated'
}

// export const staticTable = { name: 'staticTable', primaryKey: 'itemsId'};
// export const repoTable = {
//   name: 'repoTable',
//   primaryKey: 'alfType',
//   alfType: 'alfType'
// };

interface AlfType {
  readonly ec2InstanceType: Ec2InstanceType
  readonly gitRepo: GitRepo
}

export interface Instance{
  readonly tags: string | undefined;
  readonly userId: string | undefined;
  readonly instanceId: string | undefined;
  readonly alfType: AlfType;
  // readonly shortLived: boolean;
  url: string | undefined;
  readonly status: string | undefined;
  readonly adminCredentials: {
    readonly userName: string,
    readonly password: string
  }
}
