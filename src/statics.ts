
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
  readonly alfInstanceId: string,
  readonly userId: string,
  readonly alfType: number,
  expectedStatus: InstanceStatus,
  readonly customName: string,
  readonly lastStatus?: {
    readonly lastUpdate: string,
    readonly status: InstanceStatus
  }
}

export interface AlfTypes {
  [ec2InstanceType: string]: string[]
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

export interface Instance{
  readonly customName: string;
  readonly userId: string;
  readonly instanceId: string;
  readonly alfType: number;
  // readonly shortLived: boolean;
  readonly url: string;
  readonly status: InstanceStatus;
  readonly expectedStatus: InstanceStatus;
  readonly initialPassword: string;
}
