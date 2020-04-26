
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
  readonly expectedStatus: InstanceStatus,
  readonly lastStatus?: {
    readonly lastUpdate: string,
    readonly status: InstanceStatus
  }
}

enum InstanceStatus {
  'running',
  'stopped',
  'terminated'
}

export const staticTable = { name: 'staticTable', primaryKey: 'itemsId'};
export const repoTable = { name: 'repoTable', primaryKey: 'alfType'};
export const adminTable = { name: 'adminTable', primaryKey: 'userId'};

export interface Instance{
  readonly customName: string;
  readonly userId: string;
  readonly instanceId: string;
  readonly alfType: number;
  readonly shortLived: boolean;
  readonly url: string;
  readonly status: InstanceStatus;
  readonly expectedStatus: InstanceStatus;
  readonly initialPassword: string;
}
