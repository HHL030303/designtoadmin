import dayjs from 'dayjs'
import type {
  AttachmentFile,
  MedicalTaskComplaintRecord,
  MedicalTaskSubItemRecord,
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
  additional_work_item_count?: number | null
  additional_work_items?: MedicalSubItemResponse[] | null
  complaint_count?: number | null
  complaints?: MedicalComplaintResponse[] | null
  extension_summary?: {
    additional_work?: {
      total_count?: number | null
    } | null
    complaint?: {
      total_count?: number | null
    } | null
  } | null
  field_values?: Record<string, unknown> | null
  package_info?: {
    error_message?: string | null
    status?:string
    output_file?: {
      id?: number | string
      name?: string | null
      filename?: string | null
      original_name?: string | null
      file_path?: string | null
      size?: number | null
      type?: string | null
      uploaded_at?: string | null
      created_at?: string | null
      file_url?: string | null
    } | null
  } | null
  sub_items?: MedicalSubItemResponse[] | null
  sub_item_count?: number | null
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
  description?:string
  workflow_template?:{
    id:string
    name:string
    order_type?:string
  }
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

type CurrentStageOptionResponse = {
  stage_name: string
  task_count?: number | null
  template_stage_ids?: Array<number | string> | null
}

type CurrentStageOptionsResponse = {
  items?: CurrentStageOptionResponse[] | null
}

type TaskVersionsResponse =
  | TaskVersionResponse[]
  | {
      items?: TaskVersionResponse[] | null
      versions?: TaskVersionResponse[] | null
    }

type TaskDetailResponse = {
  task: {
    id: number
    title: string
    status: string
    readonly: boolean
    owner_id?: number | string | null
    owner?: {
      user_id?: number | string | null
      user_name?: string | null
    } | null
    created_at: string
    archived_at: string | null
  }
  current_version: TaskVersionResponse
  version_history?: TaskVersionResponse[] | null
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
  package_info?: {
    error_message?: string | null
    completed_at?:string
    output_file?: {
      id?: number | string
      name?: string | null
      filename?: string | null
      original_name?: string | null
      file_path?: string | null
      size?: number | null
      type?: string | null
      uploaded_at?: string | null
      created_at?: string | null
      file_url?: string | null
    } | null
  } | null
  sub_tasks?: TaskSubTaskResponse[] | null
}

type AttachmentFileResponse = {
  uid?: string
  id?: number | string
  name?: string
  filename?: string
  original_name?: string
  original_path?: string
  file_path?: string
  size?: number
  type?: string
  workflow_stage_id?: number | string | null
  uploaded_at?: string
  created_at?: string
  file_url?:string
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
  assigned_by?:string
  collect_total_page_count?: boolean
  allow_page_assignment?: boolean
  allow_custom_due_days?: boolean
  can_update_fields?: boolean
  requires_file_upload?: boolean
  requires_validation?: boolean
  triggers_package?: boolean
  completed_at?: number | string | null
  due_days?: number | null
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
  package_original_name?:string
  due_days?: number
  total_page_count?:number
  next_stage_assignees: Array<{
    user_id: number
    assignee_role: 'operator'
    is_primary: boolean
    assigned_page_count?: number
  }>
}

type AssignWorkflowStagePayload = {
  due_days?: number
  assignees: Array<{
    user_id: number
    assignee_role: 'operator'
    is_primary: boolean
  }>
}

type CreateServiceTaskPayload = {
  description: string
  owner_id?: number
  stage_assignments?: Array<{
    template_stage_id: number
    due_days?: number
    assignees: Array<{
      user_id: number
      assignee_role: 'operator'
      is_primary: boolean
      assigned_page_count: number
    }>
  }>
  workflow_template_id: number
}

type CreateAfterSalesTaskPayload = CreateServiceTaskPayload & {
  responsible_user_ids?: number[]
}

type CreateMedicalSubItemPayload = {
  description?: string
  extra_fee_amount?: number
  item_type: string
  owner_id?: number
  remark?: string
  title: string
}

type CreateMedicalComplaintPayload = {
  handling_method?: string
  problem_description: string
  refund_amount?: number
  remark?: string
  responsibility_type?: string
  responsible_user_ids?: number[]
  stage_id: number
}

type ResolveMedicalComplaintPayload = {
  handling_method?: string
  refund_amount?: number
  remark?: string
}

type ConfirmMedicalSubItemPayload = {
  extra_fee_amount?: number
  remark?: string
}

type CompleteMedicalSubItemPayload = {
  remark?: string
}

type UpdateMedicalSubItemPayload = {
  description: string
  extra_fee_amount?: number
  item_type: string
  owner_id?: number
  remark?: string
  title: string
}

type TaskParticipantResponse =
  | Array<{
      id?: number | string
      user_id?: number | string
      name?: string
      user_name?: string
    }>
  | {
      items?: Array<{
        id?: number | string
        user_id?: number | string
        name?: string
        user_name?: string
      }>
    }

type MedicalSubItemResponse = {
  created_at?: string | null
  description?: string | null
  extra_fee_amount?: number | null
  has_contract_change?: boolean | null
  id?: number | string | null
  item_no?: string | null
  item_type?: string | null
  remark?: string | null
  status?: string | null
  sub_item_no?: string | null
  sub_item_type?: string | null
  title?: string | null
}

type MedicalComplaintResponse = {
  complaint_no?: string | null
  created_at?: string | null
  description?: string | null
  handling_method?: string | null
  id?: number | string | null
  problem_description?: string | null
  processing_method?: string | null
  remark?: string | null
  refund_amount?: number | null
  responsible_user_names?: string[] | null
  responsible_users?: Array<{
    user_name?: string | null
    name?: string | null
  }> | null
  status?: string | null
  workflow_stage_name?: string | null
}

type MedicalListResponse<T> = {
  items?: T[] | null
  page?: number | null
  page_size?: number | null
  total?: number | null
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
    description:version?.description,
    workflow_template:version?.workflow_template
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

function mapMedicalSubItem(item: MedicalSubItemResponse): MedicalTaskSubItemRecord {
  return {
    amount: item.extra_fee_amount ?? undefined,
    createdAt: item.created_at ?? undefined,
    description: item.description ?? undefined,
    hasContractChange: item.has_contract_change ?? undefined,
    id: item.id !== undefined && item.id !== null ? String(item.id) : '',
    remark: item.remark ?? undefined,
    status: item.status ?? 'unknown',
    subItemNo: item.item_no ?? item.sub_item_no ?? undefined,
    subItemType: item.item_type ?? item.sub_item_type ?? '-',
    title: item.title ?? undefined,
  }
}

function mapMedicalComplaint(item: MedicalComplaintResponse): MedicalTaskComplaintRecord {
  const responsibilityUserNames = item.responsible_user_names ??
    (item.responsible_users ?? [])
      .map((user) => user.user_name ?? user.name ?? '')
      .filter((name) => Boolean(name))

  return {
    complaintNo: item.complaint_no ?? undefined,
    createdAt: item.created_at ?? undefined,
    description: item.problem_description ?? item.description ?? '-',
    id: item.id !== undefined && item.id !== null ? String(item.id) : '',
    processingMethod: item.handling_method ?? item.processing_method ?? undefined,
    remark: item.remark ?? undefined,
    refundAmount: item.refund_amount ?? undefined,
    responsibilityUserNames,
    status: item.status ?? 'unknown',
    workflowStageName: item.workflow_stage_name ?? undefined,
  }
}

function mapAttachment(file: AttachmentFileResponse): AttachmentFile {
  const displayName = file.original_name ?? file.name ?? file.filename ?? '未命名文件'

  return {
    fileRecordId:
      file.id !== undefined && file.id !== null
        ? String(file.id)
        : undefined,
    fileExt: displayName.includes('.')
      ? displayName.split('.').pop()?.toLowerCase()
      : undefined,
    name: displayName,
    originalPath: file.original_path ?? undefined,
    size: file.size,
    storageKey: file.file_path,
    type: file.type,
    uid: String(file.id ?? file.uid ?? displayName ?? Date.now()),
    uploadedAt: file.uploaded_at ?? file.created_at,
    url:file.file_url|| file.file_path,
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
    allowCustomDueDays: stage.allow_custom_due_days ?? false,
    allowPageAssignment: stage.allow_page_assignment ?? false,
    canAssign: stage.can_assign ?? false,
    canUpdateFields: stage.can_update_fields ?? false,
    canSkip: stage.can_skip ?? false,
    collectTotalPageCount: stage.collect_total_page_count ?? false,
    completedAt: normalizeDate(stage.completed_at) ?? null,
    dueDays: stage.due_days ?? undefined,
    dueDate: normalizeDate(stage.due_date),
    assignedBy:stage.assigned_by,
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
  const medicalSubItems = (item.additional_work_items ?? item.sub_items ?? []).map(
    mapMedicalSubItem,
  )
  const medicalComplaints = (item.complaints ?? []).map(mapMedicalComplaint)
  const medicalSubItemCount = item.extension_summary?.additional_work?.total_count ??
    item.additional_work_item_count ??
    item.sub_item_count ??
    medicalSubItems.length
  const medicalComplaintCount = item.extension_summary?.complaint?.total_count ??
    item.complaint_count ??
    medicalComplaints.length

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
    medicalComplaintCount,
    medicalComplaints,
    medicalSubItemCount,
    medicalSubItems,
    packageInfo: item.package_info
      ? {
          errorMessage: item.package_info.error_message ?? null,
          status:item.package_info.status,
          outputFile: item.package_info.output_file
            ? mapAttachment({
                id: item.package_info.output_file.id,
                name: item.package_info.output_file.name ?? undefined,
                filename: item.package_info.output_file.filename ?? undefined,
                original_name: item.package_info.output_file.original_name ?? undefined,
                file_path: item.package_info.output_file.file_path ?? undefined,
                size: item.package_info.output_file.size ?? undefined,
                type: item.package_info.output_file.type ?? undefined,
                uploaded_at: item.package_info.output_file.uploaded_at ?? undefined,
                created_at: item.package_info.output_file.created_at ?? undefined,
                file_url: item.package_info.output_file.file_url ?? undefined,
              })
            : null,
        }
      : null,
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
    currentStageIds?: string[]
    fieldFilters?: Record<string, unknown>
    isOverdue?: boolean
    keyword?: string
    mineScope?: string
    page?: number
    pageSize?: number
    status?: string
    templateStageId?: string
  } = {}) {
    const normalizedCurrentStageIds = (query.currentStageIds ?? [])
      .map((stageId) => stageId.trim())
      .filter(Boolean)

    const data = await apiRequest<TaskListResponse>('/api/tasks', {
      query: {
        is_overdue: query.isOverdue ? 1 : undefined,
        field_filters:
          query.fieldFilters && Object.keys(query.fieldFilters).length > 0
            ? JSON.stringify(query.fieldFilters)
            : undefined,
        keyword: query.keyword?.trim() || undefined,
        mine_scope: query.mineScope || undefined,
        page: query.page ?? 1,
        page_size: query.pageSize ?? 100,
        assignee_id: query.assigneeId || undefined,
        current_stage_ids:
          normalizedCurrentStageIds.length > 0
            ? normalizedCurrentStageIds.join(',')
            : undefined,
        status: query.status || undefined,
        template_stage_id: query.templateStageId || undefined,
      },
    })

    return {
      items: data.items.map(mapTaskListItem),
      page: data.page,
      pageSize: data.page_size,
      total: data.total,
    }
  },

  async listCurrentStageOptions() {
    const data = await apiRequest<CurrentStageOptionsResponse>('/api/tasks/current_stage_options')

    return (data.items ?? []).map((item) => ({
      // label:
      //   typeof item.task_count === 'number'
      //     ? `${item.stage_name} (${item.task_count})`
      //     : item.stage_name,
      label: item.stage_name,
      templateStageIds: (item.template_stage_ids ?? [])
        .map((stageId) => String(stageId).trim())
        .filter(Boolean),
      value: item.stage_name,
    }))
  },

  async getTaskDetail(taskId: string, options?: { versionId?: string }): Promise<TaskDetailRecord> {
    const data = await apiRequest<TaskDetailResponse>(`/api/tasks/${taskId}`, {
      query: {
        version_id: options?.versionId,
      },
    })
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
      packageInfo: data.package_info
        ? {
            errorMessage: data.package_info.error_message ?? null,
            completedAt:data.package_info.completed_at,
            outputFile: data.package_info.output_file
              ? mapAttachment({
                  id: data.package_info.output_file.id,
                  name: data.package_info.output_file.name ?? undefined,
                  filename: data.package_info.output_file.filename ?? undefined,
                  original_name: data.package_info.output_file.original_name ?? undefined,
                  file_path: data.package_info.output_file.file_path ?? undefined,
                  size: data.package_info.output_file.size ?? undefined,
                  type: data.package_info.output_file.type ?? undefined,
                  uploaded_at: data.package_info.output_file.uploaded_at ?? undefined,
                  created_at: data.package_info.output_file.created_at ?? undefined,
                  file_url: data.package_info.output_file.file_url ?? undefined,
                })
              : null,
          }
        : null,
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
          data.task.owner?.user_id !== undefined && data.task.owner?.user_id !== null
            ? String(data.task.owner.user_id)
            : data.task.owner_id !== undefined && data.task.owner_id !== null
              ? String(data.task.owner_id)
            : undefined,
        ownerName: data.task.owner?.user_name ?? undefined,
        readonly: data.task.readonly,
        status: data.task.status,
        title: data.task.title,
      },
      // 详情页的版本切换直接复用详情接口返回的 version_history，
      // 这样可以在展示箭头前先知道是否真的存在历史版本。
      versionHistory: (data.version_history ?? []).map((version) => mapVersion(version)),
      workflowStages,
    }
  },

  async listTaskVersions(taskId: string): Promise<TaskVersionRecord[]> {
    const data = await apiRequest<TaskVersionsResponse>(`/api/tasks/${taskId}/versions`)
    const versions = Array.isArray(data)
      ? data
      : Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.versions)
          ? data.versions
          : []

    return versions.map((version) => mapVersion(version))
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

  async createAfterSalesTask(taskId: string, payload: CreateAfterSalesTaskPayload) {
    await apiRequest<null>(`/api/tasks/${taskId}/after_sales`, {
      body: payload,
      method: 'POST',
    })
  },

  async createIterationTask(taskId: string, payload: CreateServiceTaskPayload) {
    await apiRequest<null>(`/api/tasks/${taskId}/iterations`, {
      body: payload,
      method: 'POST',
    })
  },

  async cancelSubTask(subTaskId: string) {
    await apiRequest<null>(`/api/sub_tasks/${subTaskId}/cancel`, {
      body: {},
      method: 'POST',
    })
  },

  async createMedicalSubItem(taskId: string, payload: CreateMedicalSubItemPayload) {
    await apiRequest<null>(`/api/tasks/${taskId}/additional_work_items`, {
      body: payload,
      method: 'POST',
    })
  },

  async createMedicalComplaint(taskId: string, payload: CreateMedicalComplaintPayload) {
    await apiRequest<null>(`/api/tasks/${taskId}/complaints`, {
      body: payload,
      method: 'POST',
    })
  },

  async listMedicalSubItems(query: {
    page?: number
    pageSize?: number
    status?: string
    taskId: string
  }) {
    const data = await apiRequest<MedicalListResponse<MedicalSubItemResponse>>(
      '/api/additional_work_items',
      {
        query: {
          page: query.page ?? 1,
          page_size: query.pageSize ?? 20,
          status: query.status || undefined,
          task_id: query.taskId,
        },
      },
    )

    return {
      items: (data.items ?? []).map(mapMedicalSubItem),
      page: data.page ?? query.page ?? 1,
      pageSize: data.page_size ?? query.pageSize ?? 20,
      total: data.total ?? 0,
    }
  },

  async confirmMedicalSubItem(subItemId: string, payload?: ConfirmMedicalSubItemPayload) {
    await apiRequest<null>(`/api/additional_work_items/${subItemId}/confirm`, {
      body: payload ?? {},
      method: 'POST',
    })
  },

  async updateMedicalSubItem(subItemId: string, payload: UpdateMedicalSubItemPayload) {
    await apiRequest<null>(`/api/additional_work_items/${subItemId}/update`, {
      body: payload,
      method: 'POST',
    })
  },

  async cancelMedicalSubItem(subItemId: string) {
    await apiRequest<null>(`/api/additional_work_items/${subItemId}/cancel`, {
      body: {},
      method: 'POST',
    })
  },

  async completeMedicalSubItem(subItemId: string, payload?: CompleteMedicalSubItemPayload) {
    await apiRequest<null>(`/api/additional_work_items/${subItemId}/complete`, {
      body: payload ?? {},
      method: 'POST',
    })
  },

  async listMedicalComplaints(query: {
    page?: number
    pageSize?: number
    status?: string
    taskId: string
  }) {
    const data = await apiRequest<MedicalListResponse<MedicalComplaintResponse>>(
      '/api/complaints',
      {
        query: {
          page: query.page ?? 1,
          page_size: query.pageSize ?? 20,
          status: query.status || undefined,
          task_id: query.taskId,
        },
      },
    )

    return {
      items: (data.items ?? []).map(mapMedicalComplaint),
      page: data.page ?? query.page ?? 1,
      pageSize: data.page_size ?? query.pageSize ?? 20,
      total: data.total ?? 0,
    }
  },

  async resolveMedicalComplaint(complaintId: string, payload?: ResolveMedicalComplaintPayload) {
    await apiRequest<null>(`/api/complaints/${complaintId}/resolve`, {
      body: payload ?? {},
      method: 'POST',
    })
  },

  async cancelMedicalComplaint(complaintId: string) {
    await apiRequest<null>(`/api/complaints/${complaintId}/cancel`, {
      body: {},
      method: 'POST',
    })
  },

  async listTaskParticipants(taskId: string) {
    const data = await apiRequest<TaskParticipantResponse>(`/api/tasks/${taskId}/participants`)
    const items = Array.isArray(data) ? data : (data.items ?? [])

    return items.map((item) => ({
      id:
        item.user_id !== undefined && item.user_id !== null
          ? String(item.user_id)
          : item.id !== undefined && item.id !== null
            ? String(item.id)
            : '',
      name: item.user_name ?? item.name ?? '',
    })).filter((item) => item.id && item.name)
  },
}
