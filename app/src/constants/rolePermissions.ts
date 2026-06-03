import type {
  RolePermissionAction,
  RolePermissionRecord,
  RolePermissionResourceRecord,
} from '../types'

export const ROLE_PERMISSION_ACTION_OPTIONS: Array<{
  label: string
  value: RolePermissionAction
}> = [
  { label: '查看', value: 'view' },
  { label: '创建', value: 'create' },
  { label: '修改', value: 'update' },
  { label: '删除', value: 'delete' },
  { label: '全部', value: 'all' },
]

const ROLE_PERMISSION_ACTION_SET = new Set<RolePermissionAction>(
  ROLE_PERMISSION_ACTION_OPTIONS.map((item) => item.value),
)

const BASE_ROLE_PERMISSION_ACTIONS: RolePermissionAction[] = [
  'view',
  'create',
  'update',
  'delete',
]

export function normalizeRolePermissionActions(
  actions: RolePermissionAction[],
): RolePermissionAction[] {
  const uniqueActions = Array.from(new Set(actions)).filter((action) =>
    ROLE_PERMISSION_ACTION_SET.has(action),
  )

  if (uniqueActions.includes('all')) {
    return ['all']
  }

  const hasSelectedEveryBaseAction = BASE_ROLE_PERMISSION_ACTIONS.every((action) =>
    uniqueActions.includes(action),
  )

  return hasSelectedEveryBaseAction ? ['all'] : uniqueActions
}

export function createDefaultRolePermissionRecords(): RolePermissionRecord[] {
  return []
}

export function createRolePermissionRecords(
  resources: RolePermissionResourceRecord[],
): RolePermissionRecord[] {
  return resources.map((item) => ({
    ...item,
    actions: [],
  }))
}

export function mergeRolePermissionRecords(
  resources: RolePermissionResourceRecord[],
  permissions: RolePermissionRecord[],
): RolePermissionRecord[] {
  const permissionMap = new Map(
    permissions.map((item) => [
      item.resourceCode,
      normalizeRolePermissionActions(item.actions),
    ]),
  )

  return resources.map((resource) => ({
    ...resource,
    actions: permissionMap.get(resource.resourceCode) ?? [],
  }))
}
