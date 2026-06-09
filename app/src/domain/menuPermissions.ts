import { btnPermission, menuPermission } from '../constants/menu'
import type { ProjectOption, ProjectPermission, UserRole, ViewKey } from '../types'
import { roleViewAccess } from '../constants/roles'

export type PermissionAction = 'view' | 'create' | 'update' | 'delete' | 'all'

const MENU_VIEW_RESOURCE_MAP: Partial<Record<ViewKey, string>> = {
  courses: 'task',
  dashboard: 'statistics',
  projectManagement: 'project',
  settingsUsers: 'account',
}

const MANAGED_VIEW_KEYS = new Set<ViewKey>(
  Object.keys(MENU_VIEW_RESOURCE_MAP) as ViewKey[],
)

const MENU_RESOURCE_CODES = new Set(menuPermission.map((item) => item.resource_code))
const BUTTON_RESOURCE_CODES = new Set(btnPermission.map((item) => item.resource_code))

function normalizePermissionActions(permission: ProjectPermission | undefined): string[] {
  if (!permission || !Array.isArray(permission.actions)) {
    return []
  }

  return permission.actions
    .filter((action): action is string => typeof action === 'string')
    .map((action) => action.trim())
    .filter((action) => action.length > 0)
}

function findPermissionByResource(
  permissions: ProjectPermission[],
  resourceCode: string,
): ProjectPermission | undefined {
  return permissions.find((permission) => permission.resource === resourceCode)
}

export function getCurrentProjectPermissions(
  currentProject: ProjectOption | null,
  projects: ProjectOption[],
): ProjectPermission[] {
  if (!currentProject) {
    return []
  }

  const matchedProject = projects.find((project) => project.id === currentProject.id)
  return matchedProject?.permissions ?? currentProject.permissions ?? []
}

export function hasProjectPermissionAction(
  permissions: ProjectPermission[],
  resourceCode: string,
  action: PermissionAction,
): boolean {
  const matchedPermission = findPermissionByResource(permissions, resourceCode)
  const actions = normalizePermissionActions(matchedPermission)

  return actions.includes('all') || actions.includes(action)
}

export function hasButtonPermissionAction(
  permissions: ProjectPermission[],
  resourceCode: string,
  action: PermissionAction,
): boolean {
  if (!isManagedButtonResource(resourceCode)) {
    return false
  }

  return hasProjectPermissionAction(permissions, resourceCode, action)
}

export function canViewMenuResource(
  permissions: ProjectPermission[],
  resourceCode: string,
): boolean {
  return hasProjectPermissionAction(permissions, resourceCode, 'view')
}

export function getAvailableViewsByProjectPermissions(
  role: UserRole,
  permissions: ProjectPermission[],
): ViewKey[] {
  const fallbackViews = roleViewAccess[role]
  const visibleViews = new Set<ViewKey>(
    fallbackViews.filter((view) => !MANAGED_VIEW_KEYS.has(view)),
  )

  ;(Object.entries(MENU_VIEW_RESOURCE_MAP) as Array<[ViewKey, string]>).forEach(
    ([viewKey, resourceCode]) => {
      if (canViewMenuResource(permissions, resourceCode)) {
        visibleViews.add(viewKey)
      }
    },
  )

  return Array.from(visibleViews)
}

export function canAccessViewByProjectPermissions(
  role: UserRole,
  view: ViewKey,
  permissions: ProjectPermission[],
): boolean {
  if (!MANAGED_VIEW_KEYS.has(view)) {
    return roleViewAccess[role].includes(view)
  }

  const resourceCode = MENU_VIEW_RESOURCE_MAP[view]
  return resourceCode ? canViewMenuResource(permissions, resourceCode) : false
}

export function isManagedMenuResource(resourceCode: string): boolean {
  return MENU_RESOURCE_CODES.has(resourceCode)
}

export function isManagedButtonResource(resourceCode: string): boolean {
  return BUTTON_RESOURCE_CODES.has(resourceCode)
}
