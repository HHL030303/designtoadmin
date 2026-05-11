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
  readonly: boolean
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
    created_at: string
    archived_at: string | null
  }
  current_version: TaskVersionResponse
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
  size?: number
  type?: string
  uploaded_at?: string
  created_at?: string
}

type TaskWorkflowStageResponse = {
  id: number
  stage_name: string
  sort_value: number
  status: string
  owner_id?: number | null
  owner_role_code?: string | null
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
  return {
    name: file.name ?? file.filename ?? '未命名文件',
    size: file.size,
    type: file.type,
    uid: String(file.id ?? file.uid ?? file.name ?? Date.now()),
    uploadedAt: file.uploaded_at ?? file.created_at,
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
    ownerRoleCode: stage.owner_role_code ?? undefined,
    remark: stage.remark ?? null,
    requiresFileUpload: stage.requires_file_upload ?? false,
    requiresValidation: stage.requires_validation ?? false,
    sortValue: stage.sort_value,
    stageAssignees: (stage.stage_assignees ?? []).map(mapStageAssignee),
    stageName: stage.stage_name,
    status: stage.status,
    triggersPackage: stage.triggers_package ?? false,
    validationStatus: stage.validation_status ?? undefined,
  }
}

function mapTaskListItem(item: TaskListItemResponse): TaskListRecord {
  return {
    activeSubTasks: (item.active_sub_tasks ?? []).map(mapSubTask),
    archivedAt: item.archived_at,
    createdAt: item.created_at,
    currentVersion: mapVersion(item.current_version),
    fieldValues: item.field_values ?? {},
    id: String(item.id),
    readonly: item.readonly,
    status: item.status,
    title: item.title,
  }
}

export const taskService = {
  async listTasks(query: {
    assigneeId?: string
    keyword?: string
    page?: number
    pageSize?: number
    status?: string
  } = {}) {
    const data = await apiRequest<TaskListResponse>('/api/tasks', {
      query: {
        keyword: query.keyword?.trim() || undefined,
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

    return {
      currentVersion: mapVersion(data.current_version),
      fieldValues: data.field_values ?? {},
      files: (data.files ?? []).map(mapAttachment),
      subTasks: (data.sub_tasks ?? []).map(mapSubTask),
      task: {
        archivedAt: data.task.archived_at,
        createdAt: data.task.created_at,
        id: String(data.task.id),
        readonly: data.task.readonly,
        status: data.task.status,
        title: data.task.title,
      },
      workflowStages: (data.workflow_stages ?? [])
        .map(mapWorkflowStage)
        .sort((left, right) => left.sortValue - right.sortValue),
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
}
