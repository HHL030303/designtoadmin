import { backendRoleMap } from '../constants/roles'
import type {
  AuthUser,
  ProjectOption,
  ProjectPermission,
  ProjectRole,
  UserRole,
} from '../types'
import { apiRequest } from './apiClient'

type AuthProjectResponse = {
  id: number
  code: string
  name: string
  status: 'enabled' | 'disabled'
  workwx_bound: boolean
  roles: Array<{
    id: number
    code: string
    name: string
  }>
  permissions: Array<{
    resource: string
    resource_name: string
    action: string
  }>
}

type AuthResponse = {
  id: number
  email: string
  name: string
  status: 'enabled' | 'disabled'
  workwx_bound: boolean
  projects: AuthProjectResponse[]
}

export type WorkwxConfig = {
  corp_name: string
  corp_id: string
  agent_id: string
  can_bind_workwx: boolean
}

function mapRoleCodeToUserRole(roleCodes: string[]): UserRole {
  const matchedRole = roleCodes
    .map((code) => backendRoleMap[code])
    .find((role): role is UserRole => Boolean(role))

  return matchedRole ?? 'planner'
}

function mapProjectRole(role: AuthProjectResponse['roles'][number]): ProjectRole {
  return {
    id: role.id,
    code: role.code,
    name: role.name,
  }
}

function mapProjectPermission(
  permission: AuthProjectResponse['permissions'][number],
): ProjectPermission {
  return {
    resource: permission.resource,
    resourceName: permission.resource_name,
    action: permission.action,
  }
}

function mapProject(project: AuthProjectResponse): ProjectOption {
  const roles = project.roles.map(mapProjectRole)

  return {
    key: String(project.id),
    id: String(project.id),
    code: project.code,
    description:
      roles.length > 0
        ? `当前账号角色：${roles.map((role) => role.name).join('、')}`
        : '当前账号暂未分配项目角色',
    name: project.name,
    permissions: project.permissions.map(mapProjectPermission),
    roles,
    status: project.status,
    workwxBound: project.workwx_bound,
  }
}

function mapAuthUser(payload: AuthResponse): AuthUser {
  const projects = payload.projects.map(mapProject)
  const roleCodes = projects.flatMap((project) => project.roles.map((role) => role.code))

  return {
    email: payload.email,
    id: String(payload.id),
    name: payload.name,
    projects,
    role: mapRoleCodeToUserRole(roleCodes),
    status: payload.status,
  }
}

export const authService = {
  async login(email: string, password: string) {
    const data = await apiRequest<AuthResponse>('/api/auth/login', {
      body: { email: email.trim(), password },
      includeProjectHeader: false,
      method: 'POST',
    })

    return mapAuthUser(data)
  },

  async getCurrentUser() {
    const data = await apiRequest<AuthResponse>('/api/auth/me', {
      includeProjectHeader: false,
    })

    return mapAuthUser(data)
  },

  async getWorkwxConfig() {
    return apiRequest<WorkwxConfig>('/api/workwx/config')
  },

  async bindWorkwx(code: string, redirectUri: string) {
    await apiRequest<null>('/api/auth/workwx/bind', {
      body: {
        code,
        redirect_uri: redirectUri,
      },
      method: 'POST',
    })
  },

  async logout() {
    await apiRequest<null>('/api/auth/logout', {
      includeProjectHeader: false,
      method: 'POST',
    })
  },
}
