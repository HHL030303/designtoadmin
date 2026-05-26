import { backendRoleMap, roleViewAccess } from '../constants/roles'
import type {
  AdminAccountRecord,
  FieldConfig,
  FieldOptionConfig,
  ProjectManagementRecord,
  ProjectMemberRecord,
  SaveAdminAccountPayload,
  SystemRoleRecord,
  ViewKey,
  WorkflowStageConfig,
  WorkflowTemplateRecord,
  WorkflowTemplateStatus,
} from '../types'
import { apiRequest } from './apiClient'

type PaginatedResponse<T> = {
  items: T[]
  page?: number
  page_size?: number
  total?: number
}

type ListProjectMembersOptions = {
  keyword?: string
  page?: number
  pageSize?: number
  projectId: string
  roleId?: string
}

type ListProjectRoleUsersOptions = {
  page?: number
  pageSize?: number
  projectId: string
  roleCode: string
}

type UserListItem = {
  id: number
  name: string
  email: string
  status: 'enabled' | 'disabled'
  created_at: string
  updated_at: string
}

type RoleListItem = {
  id: number
  code: string
  name: string
  project_id: number | null
}

type ProjectListItem = {
  id: number
  name: string
  code: string
  status: 'enabled' | 'disabled'
  created_at: string
  updated_at: string
}

type ProjectMemberItem = {
  project_id: number
  user_id: number
  project: {
    id: number
    name: string
    code: string
    status: 'enabled' | 'disabled'
  }
  user: {
    id: number
    name: string
    email: string
    status: 'enabled' | 'disabled'
  }
  roles: Array<{
    member_id: number
    id: number
    code: string
    name: string
  }>
}

type WorkflowTemplateItem = {
  id: number
  name: string
  is_default: boolean
  status: WorkflowTemplateStatus
  stages?: WorkflowStageItem[]
  order_type:string
}

type WorkflowStageItem = {
  id: number
  workflow_template_id: number
  project_id: number
  stage_name: string
  sort_value: number
  default_due_days?: number | null
  operator_role_code?: string | null
  operator_role_name?: string | null
  can_assign?: boolean
  can_skip?: boolean
  collect_total_page_count?: boolean
  allow_page_assignment?: boolean
  allow_custom_due_days?: boolean
  can_update_fields?: boolean
  requires_file_upload?: boolean
  requires_validation?: boolean
  triggers_package?: boolean
  status?: WorkflowTemplateStatus
  file_rules?: WorkflowStageFileRuleItem[] | null
  config_json?: Record<string, unknown> | null
  total_page_count?:number|undefined
}

type WorkflowStageFileRuleItem = {
  id?: number | null
  item_name: string
  file_category: string
  filename_pattern: string
  required_count: number
  required?: boolean
  exclude_from_package?: boolean
}

type TaskFieldItem = {
  id?: number | null
  field_key: string
  field_name: string
  field_type: FieldConfig['field_type']
  required?: boolean
  searchable?: boolean
  option_config?: unknown
  default_value?: string | null
  sort_value?: number
  status?: 'enabled' | 'disabled'
}

type TaskFieldListResponse = {
  items?: TaskFieldItem[]
  fields?: TaskFieldItem[]
}

function mapAccountStatus(status: UserListItem['status']) {
  return status === 'enabled' ? '启用' : '停用'
}

function mapUserRecord(user: UserListItem): AdminAccountRecord {
  return {
    createdAt: user.created_at,
    email: user.email,
    id: String(user.id),
    name: user.name,
    status: mapAccountStatus(user.status),
    updatedAt: user.updated_at,
    username: user.email,
  }
}

function mapRoleViewAccess(code: string): ViewKey[] {
  const appRole = backendRoleMap[code]
  return appRole ? roleViewAccess[appRole] : ['dashboard']
}

function mapWorkflowStage(stage: WorkflowStageItem): WorkflowStageConfig {
  const configJson = (stage.config_json ?? {}) as Record<string, unknown>
  const isMerged = configJson.isMerged === true
  const nextStageIds = Array.isArray(configJson.nextStageIds)
    ? configJson.nextStageIds.filter((item): item is string => typeof item === 'string')
    : []
  const localId =
    typeof configJson.localId === 'string' && configJson.localId.trim()
      ? configJson.localId
      : `workflow-stage-${stage.id}`

  return {
    allowPageAssignment: stage.allow_page_assignment ?? false,
    allowCustomDueDays: stage.allow_custom_due_days ?? false,
    canAssign: stage.can_assign ?? false,
    canUpdateFields: stage.can_update_fields ?? false,
    canSkip: stage.can_skip ?? false,
    collectTotalPageCount: stage.collect_total_page_count ?? true,
    configJson,
    defaultDueDays: stage.default_due_days ?? undefined,
    id: String(stage.id),
    isMerged,
    localId,
    nextStageIds,
    operatorRoleCode: stage.operator_role_code ?? undefined,
    operatorRoleName: stage.operator_role_name ?? undefined,
    fileRules: (stage.file_rules ?? []).map((rule) => ({
      fileCategory: rule.file_category,
      filenamePattern: rule.filename_pattern,
      id: rule.id ? String(rule.id) : undefined,
      itemName: rule.item_name,
      excludeFromPackage: rule.exclude_from_package ?? false,
      required: rule.required ?? true,
      requiredCount: rule.required_count,
    })),
    requiresFileUpload: stage.requires_file_upload ?? false,
    requiresValidation: stage.requires_validation ?? false,
    sortValue: stage.sort_value,
    stageName: stage.stage_name,
    status: stage.status ?? 'enabled',
    triggersPackage: stage.triggers_package ?? false,
  }
}

function buildWorkflowStagePayload(stage: WorkflowStageConfig) {
  return {
    id: stage.id,
    allow_page_assignment: stage.allowPageAssignment,
    can_assign: stage.canAssign,
    can_update_fields: stage.canUpdateFields ?? false,
    can_skip: stage.canSkip,
    collect_total_page_count: stage.collectTotalPageCount,
    config_json: {
      ...(stage.configJson ?? {}),
      isMerged: stage.isMerged,
      localId: stage.localId,
      nextStageIds: stage.nextStageIds,
    },
    default_due_days: stage.defaultDueDays ?? null,
    file_rules: stage.fileRules.map((rule) => ({
      ...(rule.id ? { id: Number(rule.id) } : {}),
      exclude_from_package: rule.excludeFromPackage ?? false,
      file_category: rule.fileCategory.trim(),
      filename_pattern: rule.filenamePattern.trim(),
      item_name: rule.itemName.trim(),
      required: rule.required,
      required_count: rule.requiredCount,
    })),
    operator_role_code: stage.operatorRoleCode || null,
    requires_file_upload: stage.requiresFileUpload,
    requires_validation: stage.requiresValidation,
    sort_value: stage.sortValue,
    stage_name: stage.stageName.trim(),
    status: stage.status,
    triggers_package: stage.triggersPackage,
    allow_custom_due_days:stage.allowCustomDueDays
  }
}

function normalizeTaskFieldOptions(rawValue: unknown): FieldOptionConfig[] | undefined {
  if (!Array.isArray(rawValue)) {
    return undefined
  }

  return rawValue
    .filter(
      (
        option,
      ): option is {
        label?: unknown
        relate_show_field_key?: unknown
        value?: unknown
        sort_value?: unknown
        status?: unknown
      } =>
        typeof option === 'object' && option !== null,
    )
    .map((option) => ({
      label: typeof option.label === 'string' ? option.label : String(option.value ?? ''),
      relate_show_field_key:
        typeof option.relate_show_field_key === 'string'
          ? option.relate_show_field_key
          : undefined,
      sort_value:
        typeof option.sort_value === 'number' && Number.isFinite(option.sort_value)
          ? option.sort_value
          : undefined,
      status:
        option.status === 'enabled' || option.status === 'disabled'
          ? option.status
          : undefined,
      value: typeof option.value === 'string' ? option.value : String(option.label ?? ''),
    }))
}

function mapTaskFieldRecord(field: TaskFieldItem): FieldConfig {
  const fieldType = field.field_type

  return {
    default_value: field.default_value ?? undefined,
    field_key: field.field_key,
    field_name: field.field_name,
    field_type: fieldType,
    id: field.id ? String(field.id) : undefined,
    option_config: fieldType === 'boolean' ? undefined : normalizeTaskFieldOptions(field.option_config),
    required: field.required ?? false,
    searchable: field.searchable ?? false,
    sort_value: field.sort_value ?? 0,
    status: field.status ?? 'enabled',
    span: 12,
  }
}

export const adminService = {
  async listProjects(keyword = '') {
    const data = await apiRequest<PaginatedResponse<ProjectListItem>>('/admin_api/projects', {
      query: {
        keyword: keyword.trim() || undefined,
        page: 1,
        page_size: 100,
      },
    })

    return data.items.map<ProjectManagementRecord>((project) => ({
      code: project.code,
      createdAt: project.created_at,
      id: String(project.id),
      name: project.name,
      status: project.status,
      updatedAt: project.updated_at,
    }))
  },

  async createProject(payload: { name: string }) {
    await apiRequest<null>('/admin_api/projects', {
      body: {
        name: payload.name.trim(),
      },
      method: 'POST',
    })
  },

  async getProjectDetail(projectId: string) {
    return apiRequest<ProjectListItem>(`/admin_api/projects/${projectId}`, {
      method: 'GET',
      projectHeaderId: projectId,
    })
  },

  async updateProject(projectId: string, payload: { name?: string; status?: 'enabled' | 'disabled' }) {
    await apiRequest<null>(`/admin_api/projects/${projectId}/update`, {
      body: payload,
      method: 'POST',
      projectHeaderId: projectId,
    })
  },

  async deleteProject(projectId: string) {
    await apiRequest<null>(`/admin_api/projects/${projectId}/delete`, {
      body: {},
      method: 'POST',
      projectHeaderId: projectId,
    })
  },

  async listUsers(keyword = '') {
    const data = await apiRequest<PaginatedResponse<UserListItem>>('/admin_api/users', {
      query: {
        keyword: keyword.trim() || undefined,
        page: 1,
        page_size: 100,
      },
    })

    return data.items.map(mapUserRecord)
  },

  async createUser(payload: SaveAdminAccountPayload) {
    await apiRequest<null>('/admin_api/users', {
      body: {
        email: payload.email.trim(),
        name: payload.name.trim(),
        password: payload.password,
      },
      method: 'POST',
    })
  },

  async updateUser(userId: string, payload: { name: string; status: 'enabled' | 'disabled' }) {
    await apiRequest<null>(`/admin_api/users/${userId}/update`, {
      body: payload,
      method: 'POST',
    })
  },

  async resetUserPassword(userId: string, password: string) {
    await apiRequest<null>(`/admin_api/users/${userId}/reset_password`, {
      body: { password },
      method: 'POST',
    })
  },

  async listRoles(projectId: string) {
    const [roles, members] = await Promise.all([
      apiRequest<{ items: RoleListItem[] }>('/admin_api/roles', {
        projectHeaderId: projectId,
        query: { project_id: projectId },
      }),
      apiRequest<PaginatedResponse<ProjectMemberItem>>('/admin_api/project_members', {
        projectHeaderId: projectId,
        query: {
          page: 1,
          page_size: 100,
          project_id: projectId,
        },
      }),
    ])

    const memberCountMap = members.items.reduce<Record<string, number>>((accumulator, member) => {
      member.roles.forEach((role) => {
        accumulator[role.code] = (accumulator[role.code] ?? 0) + 1
      })
      return accumulator
    }, {})

    return roles.items.map<SystemRoleRecord>((role) => ({
      code: role.code,
      description: role.project_id ? '项目角色' : '系统角色',
      id: String(role.id),
      memberCount: memberCountMap[role.code] ?? 0,
      name: role.name,
      scope: role.project_id ? '当前项目' : '全局',
      viewAccess: mapRoleViewAccess(role.code),
    }))
  },

  async createRole(projectId: string, payload: { code: string; name: string }) {
    await apiRequest<null>('/admin_api/roles', {
      body: {
        code: payload.code.trim(),
        name: payload.name.trim(),
      },
      method: 'POST',
      projectHeaderId: projectId,
    })
  },

  async updateRole(projectId: string, roleId: string, payload: { name: string }) {
    await apiRequest<null>(`/admin_api/roles/${roleId}/update`, {
      body: {
        name: payload.name.trim(),
      },
      method: 'POST',
      projectHeaderId: projectId,
    })
  },

  async deleteRole(projectId: string, roleId: string) {
    await apiRequest<null>(`/admin_api/roles/${roleId}/delete`, {
      body: {},
      method: 'POST',
      projectHeaderId: projectId,
    })
  },

  async listProjectMembers(options: ListProjectMembersOptions) {
    const data = await apiRequest<PaginatedResponse<ProjectMemberItem>>('/admin_api/project_members', {
      projectHeaderId: options.projectId,
      query: {
        keyword: options.keyword?.trim() || undefined,
        page: options.page ?? 1,
        page_size: options.pageSize ?? 10,
        project_id: options.projectId,
        role_id: options.roleId || undefined,
      },
    })

    return {
      items: data.items.map<ProjectMemberRecord>((member) => ({
        id: String(member.user.id),
        memberIdByRoleId: Object.fromEntries(
          member.roles.map((role) => [String(role.id), String(role.member_id)]),
        ),
        memberIds: member.roles.map((role) => String(role.member_id)),
        projectId: String(member.project.id),
        projectName: member.project.name,
        roleCodes: member.roles.map((item) => item.code),
        roleIds: member.roles.map((item) => String(item.id)),
        roleNames: member.roles.map((item) => item.name),
        userEmail: member.user.email,
        userId: String(member.user.id),
        userName: member.user.name,
        userStatus: mapAccountStatus(member.user.status),
      })),
      page: data.page ?? options.page ?? 1,
      pageSize: data.page_size ?? options.pageSize ?? 10,
      total: data.total ?? data.items.length,
    }
  },

  async listProjectRoleUsers(options: ListProjectRoleUsersOptions) {
    const data = await apiRequest<PaginatedResponse<UserListItem>>('/api/project_role_users', {
      projectHeaderId: options.projectId,
      query: {
        page: options.page ?? 1,
        page_size: options.pageSize ?? 100,
        role_code: options.roleCode,
      },
    })

    return {
      items: data.items.map<ProjectMemberRecord>((user) => ({
        id: String(user.id),
        memberIdByRoleId: {},
        memberIds: [],
        projectId: options.projectId,
        projectName: '',
        roleCodes: [options.roleCode],
        roleIds: [],
        roleNames: [],
        userEmail: user.email,
        userId: String(user.id),
        userName: user.name,
        userStatus: mapAccountStatus(user.status),
      })),
      page: data.page ?? options.page ?? 1,
      pageSize: data.page_size ?? options.pageSize ?? 100,
      total: data.total ?? data.items.length,
    }
  },

  async addProjectMember(payload: {
    members: Array<{ userId: string; roleIds: string[] }>
    projectId: string
  }) {
    await apiRequest<null>('/admin_api/project_members', {
      body: {
        members: payload.members.map((member) => ({
          role_ids: member.roleIds.map(Number),
          user_id: Number(member.userId),
        })),
      },
      method: 'POST',
      projectHeaderId: payload.projectId,
    })
  },

  async updateProjectMember(memberId: string, roleId: string, projectId: string) {
    await apiRequest<null>(`/admin_api/project_members/${memberId}/update`, {
      body: {
        role_id: Number(roleId),
      },
      method: 'POST',
      projectHeaderId: projectId,
    })
  },

  async deleteProjectMember(memberId: string, projectId: string) {
    await apiRequest<null>(`/admin_api/project_members/${memberId}/delete`, {
      body: {},
      method: 'POST',
      projectHeaderId: projectId,
    })
  },

  async listWorkflowTemplates(projectId: string) {
    const data = await apiRequest<{ items: WorkflowTemplateItem[] }>('/admin_api/workflow_templates', {
      projectHeaderId: projectId,
      query: {
        include_stages: 'true',
      },
    })

    return data.items.map<WorkflowTemplateRecord>((template) => ({
      id: String(template.id),
      isDefault: template.is_default,
      name: template.name,
      stages: (template.stages ?? []).map(mapWorkflowStage),
      status: template.status,
      order_type:template.order_type
    }))
  },

  async createWorkflowTemplate(
    projectId: string,
    payload: {
      id?: string
      isDefault?: boolean
      name: string
      stages: WorkflowStageConfig[]
      status: WorkflowTemplateStatus
      orderType:string
    },
  ) {
    await apiRequest<null>('/admin_api/workflow_templates', {
      body: {
        id: payload.id,
        is_default: payload.isDefault ?? false,
        name: payload.name.trim(),
        stages: payload.stages.map(buildWorkflowStagePayload),
        status: payload.status,
        order_type:payload.orderType
      },
      method: 'POST',
      projectHeaderId: projectId,
    })
  },

  async deleteWorkflowTemplate(projectId: string, templateId: string) {
    await apiRequest<null>(`/admin_api/workflow_templates/${templateId}/delete`, {
      body: {},
      method: 'POST',
      projectHeaderId: projectId,
    })
  },

  async listTaskFields(projectId: string) {
    const data = await apiRequest<TaskFieldListResponse | TaskFieldItem[]>('/admin_api/task_fields', {
      method: 'GET',
      projectHeaderId: projectId,
    })

    const items = Array.isArray(data)
      ? data
      : Array.isArray(data.fields)
        ? data.fields
        : Array.isArray(data.items)
          ? data.items
          : []

    return items
      .map(mapTaskFieldRecord)
      .sort((left, right) => left.sort_value - right.sort_value)
  },

  async saveTaskFields(projectId: string, fields: FieldConfig[]) {
    await apiRequest<null>('/admin_api/task_fields', {
      body: fields.map((field) => ({
        ...(field.id ? { id: Number(field.id) } : {}),
        default_value:
          field.default_value === undefined || field.default_value === null
            ? null
            : String(field.default_value),
        field_key: field.field_key,
        field_name: field.field_name,
        field_type: field.field_type,
        option_config: field.field_type === 'boolean' ? null : field.option_config ?? null,
        required: field.required,
        searchable: field.searchable,
        sort_value: field.sort_value,
        status: field.status,
        type:field.type
      })),
      method: 'POST',
      projectHeaderId: projectId,
    })
  },
}
