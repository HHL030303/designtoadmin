import dayjs from 'dayjs'
import type {
  AttachmentFile,
  TaskDetailRecord,
  TaskListRecord,
  TaskSubTaskRecord,
  TaskVersionRecord,
  TaskWorkflowFileRuleRecord,
  TaskWorkflowStageAssigneeRecord,
  TaskWorkflowStageRecord,
} from '../types'
import { apiRequest } from './apiClient'

type TaskListItemResponse = {
  id: number
  title: string
  status: string
  current_stage?: {
    assignees?: Array<{
      user_id: number | string
      user_name?: string
    }> | null
    id: number
    stage_name: string
    status: string
  } | null
  readonly: boolean
  creator_user_id?: number | string | null
  created_by?: number | string | null
  owner_id?: number | string | null
  created_at: string
  archived_at: string | null
  current_version?: TaskVersionResponse | null
  active_sub_tasks?: TaskSubTaskResponse[] | null
  field_values?: Record<string, unknown> | null
}

type TaskVersionResponse = {
  id: number
  version_no: string
  status: string
  publish_status: string
  total_page_count: number
  expect_complete_at?: number | string | null
  completed_at?: number | string | null
  archived_at?: number | string | null
}

type TaskSubTaskResponse = {
  id: number
  sub_task_type: string
  status: string
  description: string
  target_version?: string | null
}

type TaskListResponse = {
  items: TaskListItemResponse[]
  page: number
  page_size: number
  total: number
}

type TaskDetailResponse = {
  task: {
    id: number
    title: string
    status: string
    readonly: boolean
    owner_id?: number | string | null
    created_at: string
    archived_at: string | null
  }
  current_version: TaskVersionResponse
  current_stage?: TaskWorkflowStageResponse | null
  next_stage?: {
    id: number | string
  } | null
  next_state?: {
    id: number | string
  } | null
  field_values?: Record<string, unknown> | null
  workflow_stages?: TaskWorkflowStageResponse[] | null
  files?: AttachmentFileResponse[] | null
  sub_tasks?: TaskSubTaskResponse[] | null
}

type AttachmentFileResponse = {
  uid?: string
  id?: number | string
  name?: string
  filename?: string
  original_name?: string
  file_path?: string
  size?: number
  type?: string
  workflow_stage_id?: number | string | null
  uploaded_at?: string
  created_at?: string
}

type TaskWorkflowStageResponse = {
  id: number
  template_stage_id?: number | null
  role_id?: number | null
  stage_name: string
  sort_value: number
  status: string
  owner_id?: number | null
  operator_role_code?: string | null
  can_assign?: boolean
  can_skip?: boolean
  collect_total_page_count?: boolean
  allow_page_assignment?: boolean
  requires_file_upload?: boolean
  requires_validation?: boolean
  triggers_package?: boolean
  due_date?: number | string | null
  overdue_status?: string | null
  validation_status?: string | null
  remark?: string | null
  file_rules?: TaskWorkflowFileRuleResponse[] | null
  assignees?: TaskWorkflowStageAssigneeResponse[] | null
  stage_assignees?: TaskWorkflowStageAssigneeResponse[] | null
}

type TaskWorkflowFileRuleResponse = {
  id: number
  item_name: string
  file_category: string
  filename_pattern: string
  required_count: number
  required: boolean
  enabled?: boolean
}

type TaskWorkflowStageAssigneeResponse = {
  id: number
  user_id: number
  user_name?: string
  assignee_role: string
  assignee_role_name?: string
  is_primary: boolean
  assigned_at?: number | string | null
  assigned_page_count?: number | null
  completed_at?: number | string | null
}

type CreateTaskPayload = {
  expect_complete_at?: string
  field_values: Record<string, unknown>
  owner_id?: number
  order_type: 'new' | 'aftersales' | 'iteration'
  stage_assignments?: Array<{
    assignees: Array<{
      assigned_page_count: number
      assignee_role: string
      is_primary: boolean
      user_id: number
    }>
    template_stage_id: number
  }>
  title: string
  workflow_template_id?: string
}

type UpdateTaskPayload = {
  expect_complete_at?: string
  field_values: Record<string, unknown>
  title: string
}

type CompleteWorkflowStagePayload = {
  remark?: string
  next_stage_due_date: string
  next_stage_assignees: Array<{
    user_id: number
    assignee_role: 'operator'
    is_primary: boolean
    assigned_page_count?: number
  }>
}

type AssignWorkflowStagePayload = {
  due_date: string
  assignees: Array<{
    user_id: number
    assignee_role: 'operator'
    is_primary: boolean
  }>
}

function normalizeDate(value?: number | string | null): string | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return dayjs.unix(value).format('YYYY-MM-DD')
  }

  const parsed = dayjs(value)
  if (parsed.isValid()) {
    return parsed.format('YYYY-MM-DD')
  }

  return String(value)
}

function mapVersion(version?: TaskVersionResponse | null): TaskVersionRecord {
  return {
    archivedAt: normalizeDate(version?.archived_at) ?? null,
    completedAt: normalizeDate(version?.completed_at) ?? null,
    expectCompleteAt: normalizeDate(version?.expect_complete_at),
    id: version?.id ? String(version.id) : '',
    publishStatus: version?.publish_status ?? 'unknown',
    status: version?.status ?? 'unknown',
    totalPageCount: version?.total_page_count ?? 0,
    versionNo: version?.version_no ?? '-',
  }
}

function mapSubTask(subTask: TaskSubTaskResponse): TaskSubTaskRecord {
  return {
    description: subTask.description,
    id: String(subTask.id),
    status: subTask.status,
    subTaskType: subTask.sub_task_type,
    targetVersion: subTask.target_version ?? null,
  }
}

function mapAttachment(file: AttachmentFileResponse): AttachmentFile {
  const displayName = file.original_name ?? file.name ?? file.filename ?? '未命名文件'

  return {
    fileExt: displayName.includes('.')
      ? displayName.split('.').pop()?.toLowerCase()
      : undefined,
    name: displayName,
    size: file.size,
    storageKey: file.file_path,
    type: file.type,
    uid: String(file.id ?? file.uid ?? displayName ?? Date.now()),
    uploadedAt: file.uploaded_at ?? file.created_at,
    url: file.file_path,
    workflowStageId:
      file.workflow_stage_id !== undefined && file.workflow_stage_id !== null
        ? String(file.workflow_stage_id)
        : undefined,
  }
}

function mapFileRule(rule: TaskWorkflowFileRuleResponse): TaskWorkflowFileRuleRecord {
  return {
    enabled: rule.enabled ?? true,
    fileCategory: rule.file_category,
    filenamePattern: rule.filename_pattern,
    id: String(rule.id),
    itemName: rule.item_name,
    required: rule.required,
    requiredCount: rule.required_count,
  }
}

function mapStageAssignee(
  assignee: TaskWorkflowStageAssigneeResponse,
): TaskWorkflowStageAssigneeRecord {
  return {
    assignedAt: normalizeDate(assignee.assigned_at),
    assignedPageCount: assignee.assigned_page_count ?? 0,
    assigneeRole: assignee.assignee_role,
    assigneeRoleName: assignee.assignee_role_name,
    completedAt: normalizeDate(assignee.completed_at) ?? null,
    id: String(assignee.id),
    isPrimary: assignee.is_primary,
    userId: String(assignee.user_id),
    userName: assignee.user_name ?? `用户 ${assignee.user_id}`,
  }
}

function mapWorkflowStage(stage: TaskWorkflowStageResponse): TaskWorkflowStageRecord {
  const stageAssignees = stage.assignees ?? stage.stage_assignees ?? []

  return {
    allowPageAssignment: stage.allow_page_assignment ?? false,
    canAssign: stage.can_assign ?? false,
    canSkip: stage.can_skip ?? false,
    collectTotalPageCount: stage.collect_total_page_count ?? false,
    dueDate: normalizeDate(stage.due_date),
    fileRules: (stage.file_rules ?? []).map(mapFileRule),
    id: String(stage.id),
    operatorRoleCode: stage.operator_role_code ?? undefined,
    overdueStatus: stage.overdue_status ?? undefined,
    ownerId: stage.owner_id ? String(stage.owner_id) : undefined,
    roleId:
      stage.role_id !== undefined && stage.role_id !== null
        ? String(stage.role_id)
        : undefined,
    remark: stage.remark ?? null,
    requiresFileUpload: stage.requires_file_upload ?? false,
    requiresValidation: stage.requires_validation ?? false,
    sortValue: stage.sort_value,
    stageAssignees: stageAssignees.map(mapStageAssignee),
    stageName: stage.stage_name,
    status: stage.status,
    templateStageId:
      stage.template_stage_id !== undefined && stage.template_stage_id !== null
        ? String(stage.template_stage_id)
        : undefined,
    triggersPackage: stage.triggers_package ?? false,
    validationStatus: stage.validation_status ?? undefined,
  }
}

function mapTaskListItem(item: TaskListItemResponse): TaskListRecord {
  return {
    activeSubTasks: (item.active_sub_tasks ?? []).map(mapSubTask),
    archivedAt: item.archived_at,
    creatorUserId:
      item.creator_user_id !== undefined && item.creator_user_id !== null
        ? String(item.creator_user_id)
        : item.created_by !== undefined && item.created_by !== null
          ? String(item.created_by)
          : item.owner_id !== undefined && item.owner_id !== null
            ? String(item.owner_id)
            : undefined,
    createdAt: item.created_at,
    currentStage: item.current_stage
      ? {
          assignees: (item.current_stage.assignees ?? []).map((assignee) => ({
            userId: String(assignee.user_id),
            userName: assignee.user_name ?? `用户 ${assignee.user_id}`,
          })),
          id: String(item.current_stage.id),
          stageName: item.current_stage.stage_name,
          status: item.current_stage.status,
        }
      : null,
    currentVersion: mapVersion(item.current_version),
    fieldValues: item.field_values ?? {},
    id: String(item.id),
    ownerId:
      item.owner_id !== undefined && item.owner_id !== null
        ? String(item.owner_id)
        : undefined,
    readonly: item.readonly,
    status: item.status,
    title: item.title,
  }
}

export const taskService = {
  async listTasks(query: {
    assigneeId?: string
    keyword?: string
    mineScope?: string
    page?: number
    pageSize?: number
    status?: string
  } = {}) {
    const data = await apiRequest<TaskListResponse>('/api/tasks', {
      query: {
        keyword: query.keyword?.trim() || undefined,
        mine_scope: query.mineScope || undefined,
        page: query.page ?? 1,
        page_size: query.pageSize ?? 100,
        assignee_id: query.assigneeId || undefined,
        status: query.status || undefined,
      },
    })

    return {
      items: data.items.map(mapTaskListItem),
      page: data.page,
      pageSize: data.page_size,
      total: data.total,
    }
  },

  async getTaskDetail(taskId: string): Promise<TaskDetailRecord> {
    const data = await apiRequest<TaskDetailResponse>(`/api/tasks/${taskId}`)
    const workflowStages = (data.workflow_stages ?? [])
      .map(mapWorkflowStage)
      .sort((left, right) => left.sortValue - right.sortValue)
    const rawCurrentStage = data.current_stage ? mapWorkflowStage(data.current_stage) : null
    const currentStageTemplate = rawCurrentStage
      ? workflowStages.find((stage) => stage.id === rawCurrentStage.id)
      : undefined
    const currentStage =
      rawCurrentStage
        ? {
            ...rawCurrentStage,
            allowPageAssignment:
              currentStageTemplate?.allowPageAssignment ?? rawCurrentStage.allowPageAssignment,
            canAssign: currentStageTemplate?.canAssign ?? rawCurrentStage.canAssign,
            canSkip: currentStageTemplate?.canSkip ?? rawCurrentStage.canSkip,
            collectTotalPageCount:
              currentStageTemplate?.collectTotalPageCount ??
              rawCurrentStage.collectTotalPageCount,
            fileRules: currentStageTemplate?.fileRules ?? rawCurrentStage.fileRules,
            operatorRoleCode:
              currentStageTemplate?.operatorRoleCode ?? rawCurrentStage.operatorRoleCode,
            requiresFileUpload:
              currentStageTemplate?.requiresFileUpload ?? rawCurrentStage.requiresFileUpload,
            requiresValidation:
              currentStageTemplate?.requiresValidation ?? rawCurrentStage.requiresValidation,
            roleId: currentStageTemplate?.roleId ?? rawCurrentStage.roleId,
            triggersPackage:
              currentStageTemplate?.triggersPackage ?? rawCurrentStage.triggersPackage,
          }
        : null

    return {
      currentStage,
      currentVersion: mapVersion(data.current_version),
      fieldValues: data.field_values ?? {},
      files: (data.files ?? []).map(mapAttachment),
      nextState:
        (data.next_stage && data.next_stage.id !== undefined && data.next_stage.id !== null) ||
        (data.next_state && data.next_state.id !== undefined && data.next_state.id !== null)
          ? {
              id: String(data.next_stage?.id ?? data.next_state?.id),
            }
          : null,
      subTasks: (data.sub_tasks ?? []).map(mapSubTask),
      task: {
        archivedAt: data.task.archived_at,
        createdAt: data.task.created_at,
        id: String(data.task.id),
        ownerId:
          data.task.owner_id !== undefined && data.task.owner_id !== null
            ? String(data.task.owner_id)
            : undefined,
        readonly: data.task.readonly,
        status: data.task.status,
        title: data.task.title,
      },
      workflowStages,
    }
  },

  async createTask(payload: CreateTaskPayload) {
    return apiRequest<{
      current_version: TaskVersionResponse
      task: {
        id: number
      }
    }>('/api/tasks', {
      body: {
        ...payload,
        workflow_template_id:
          payload.workflow_template_id !== undefined
            ? Number(payload.workflow_template_id)
            : undefined,
      },
      method: 'POST',
    })
  },

  async updateTask(taskId: string, payload: UpdateTaskPayload) {
    await apiRequest<unknown>(`/api/tasks/${taskId}/update`, {
      body: payload,
      method: 'POST',
    })
  },

  async deleteTask(taskId: string) {
    await apiRequest<null>(`/api/tasks/${taskId}/delete`, {
      body: {},
      method: 'POST',
    })
  },

  async completeWorkflowStage(stageId: string, payload: CompleteWorkflowStagePayload) {
    await apiRequest<null>(`/api/workflow_stages/${stageId}/complete`, {
      body: payload,
      method: 'POST',
    })
  },

  async assignWorkflowStage(stageId: string, payload: AssignWorkflowStagePayload) {
    await apiRequest<null>(`/api/workflow_stages/${stageId}/assign`, {
      body: payload,
      method: 'POST',
    })
  },
}
