import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Button,
  Checkbox,
  Col,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popover,
  Radio,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { TablePaginationConfig } from 'antd/es/table'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import paginationZhCN from '@rc-component/pagination/es/locale/zh_CN'
import { useNavigate } from 'react-router-dom'
import {
  DownOutlined,
  FilterOutlined,
  UpOutlined,
} from '@ant-design/icons'
import { useAppState } from '../context/AppStateContext'
import { adminService } from '../services/adminService'
import { taskService } from '../services/taskService'
import { makeDemoDownload } from '../utils/attachments'
import {
  parseCourseImportFile,
} from '../utils/courseImport'
import { TaskProcessModal } from '../components/course/TaskProcessModal'
import { TaskHistoryDetailPanel } from '../components/course/TaskHistoryDetailPanel'
import { ServiceTicketDrawer } from '../components/course/ServiceTicketDrawer'
import './CoursesPage.css'
import type {
  CreateCoursePayload,
  FieldConfig,
  FieldOptionConfig,
  FormFieldType,
  ServiceType,
  ProjectMemberRecord,
  TaskDetailRecord,
  TaskListRecord,
  TaskVersionRecord,
  UserRole,
  WorkflowTemplateRecord,
} from '../types'

type TaskFormValue = string | number | boolean | Dayjs | null | undefined
type TaskFormValues = Record<string, TaskFormValue>
type TaskSearchFieldValue = string | number | boolean | string[] | null | undefined
type TaskSearchFormValues = Record<string, TaskSearchFieldValue>

const taskStatusMeta: Record<string, { color: string; label: string }> = {
  archived: { color: 'green', label: '已归档' },
  completed: { color: 'green', label: '已完成' },
  in_progress: { color: 'processing', label: '进行中' },
  page_in_progress: { color: 'cyan', label: '内页制作中' },
  pending: { color: 'default', label: '待开始' },
}

const DEFAULT_TASK_STATUS_META = { color: 'blue', label: '未知状态' }
const notBeforeTodayFieldKeys = new Set(['researchDueDate', 'finalDueDate'])
const mandatoryTaskColumnKeys = ['task']

type TaskColumnDefinition = {
  column: ColumnsType<TaskListRecord>[number]
  defaultVisible?: boolean
  key: string
  required?: boolean
  title: string
}

function getTaskStatusMeta(status: string) {
  return taskStatusMeta[status] ?? {
    ...DEFAULT_TASK_STATUS_META,
    label: status || DEFAULT_TASK_STATUS_META.label,
  }
}

function normalizeBooleanLike(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    if (value === 1) {
      return true
    }
    if (value === 0) {
      return false
    }
  }

  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim().toLowerCase()

  if (['true', '1', 'yes', 'y', '是', '有'].includes(normalized)) {
    return true
  }

  if (['false', '0', 'no', 'n', '否', '无'].includes(normalized)) {
    return false
  }

  return undefined
}

function formatTaskFieldValue(
  fieldType: FormFieldType,
  value: unknown,
  optionConfig?: FieldOptionConfig[],
): string {
  if (value === undefined || value === null || value === '') {
    return '-'
  }

  if (fieldType === 'boolean') {
    const booleanValue = normalizeBooleanLike(value)
    return booleanValue === undefined ? String(value) : booleanValue ? '是' : '否'
  }

  if (fieldType === 'select') {
    const option = optionConfig?.find((item) => item.value === String(value))
    return option?.label ?? String(value)
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.map((item) => String(item)).join(' / ') : '-'
  }

  return String(value)
}

function buildTaskColumnStorageKey(projectId: string, mode: 'default' | 'myTasks'): string {
  return `courses-page-visible-columns:v2:${projectId}:${mode}`
}

function readVisibleTaskColumns(storageKey: string): string[] | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey)

    if (!rawValue) {
      return null
    }

    const parsed = JSON.parse(rawValue)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : null
  } catch {
    return null
  }
}

function writeVisibleTaskColumns(storageKey: string, columnKeys: string[]) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(storageKey, JSON.stringify(columnKeys))
}

function areTaskColumnKeysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false
  }

  return left.every((key, index) => key === right[index])
}

function buildFormInitialValues(
  fieldConfigs: FieldConfig[],
  rawValues?: Record<string, unknown>,
): TaskFormValues {
  return fieldConfigs.reduce<TaskFormValues>((accumulator, field) => {
    const rawValue = rawValues?.[field.field_key] ?? field.default_value

    if (rawValue === undefined || rawValue === null || rawValue === '') {
      return accumulator
    }

    if (field.field_type === 'date') {
      if (typeof rawValue === 'number') {
        accumulator[field.field_key] = dayjs.unix(rawValue)
        return accumulator
      }

      const parsedDate = dayjs(String(rawValue))
      if (parsedDate.isValid()) {
        accumulator[field.field_key] = parsedDate
      }
      return accumulator
    }

    if (field.field_type === 'boolean') {
      accumulator[field.field_key] =
        normalizeBooleanLike(rawValue) ?? String(rawValue)
      return accumulator
    }

    accumulator[field.field_key] = rawValue as TaskFormValue
    return accumulator
  }, {})
}

function serializeFieldValue(field: FieldConfig, value: TaskFormValue): unknown {
    if (value === undefined || value === null || value === '') {
        return undefined
    }

    if (field.field_type === 'date' && dayjs.isDayjs(value)) {
        return value.format('YYYY-MM-DD')
    }

  if (field.field_type === 'number') {
    return Number(value)
  }

  if (field.field_type === 'boolean') {
    return normalizeBooleanLike(value) ?? value
  }

  return value
}

function getEnabledFieldConfigs(fieldConfigs: FieldConfig[]) {
  return [...fieldConfigs]
    .filter((field) => field.status === 'enabled')
    .sort((left, right) => left.sort_value - right.sort_value)
}

function getSearchableTaskFieldConfigs(fieldConfigs: FieldConfig[]) {
  return [...fieldConfigs]
    .filter(
      (field) =>
        field.status === 'enabled' &&
        field.searchable &&
        field.field_type !== 'date',
    )
    .sort((left, right) => left.sort_value - right.sort_value)
}

function buildTaskFieldFilters(
  fieldConfigs: FieldConfig[],
  values: TaskSearchFormValues,
): Record<string, unknown> {
  return fieldConfigs.reduce<Record<string, unknown>>((accumulator, field) => {
    const value = values[field.field_key]

    if (value === undefined || value === null || value === '') {
      return accumulator
    }

    if (Array.isArray(value)) {
      const normalizedValues = value
        .map((item) => String(item).trim())
        .filter(Boolean)

      if (normalizedValues.length > 0) {
        accumulator[field.field_key] = normalizedValues
      }
      return accumulator
    }

    if (field.field_type === 'boolean') {
      const normalizedValue = normalizeBooleanLike(value)

      if (normalizedValue !== undefined) {
        accumulator[field.field_key] = normalizedValue
      }
      return accumulator
    }

    if (field.field_type === 'number') {
      const normalizedValue = Number(value)

      if (Number.isFinite(normalizedValue)) {
        accumulator[field.field_key] = normalizedValue
      }
      return accumulator
    }

    const normalizedText = String(value).trim()

    if (normalizedText) {
      accumulator[field.field_key] = normalizedText
    }

    return accumulator
  }, {})
}

function isNotBeforeTodayField(field: FieldConfig) {
  return notBeforeTodayFieldKeys.has(field.field_key)
}

function getDisabledPastDate(current: Dayjs) {
  return current.isBefore(dayjs().startOf('day'), 'day')
}

function validateNotBeforeToday(_: unknown, value?: Dayjs) {
  if (!value || !value.isBefore(dayjs().startOf('day'), 'day')) {
    return Promise.resolve()
  }

  return Promise.reject(new Error('日期不得早于当天'))
}

function renderFieldControl(field: FieldConfig) {
  const textPlaceholder = field.placeholder || `请输入${field.field_name}`
  const selectPlaceholder = field.placeholder || `请选择${field.field_name}`

  if (field.field_type === 'textarea') {
    // return <Input.TextArea placeholder={textPlaceholder} rows={4} />
    return <Input placeholder={textPlaceholder}  />
  }

  if (field.field_type === 'select') {
    return (
      <Select
        placeholder={selectPlaceholder}
        options={(field.option_config ?? []).map((option) => ({
          label: option.label,
          value: option.value,
        }))}
      />
    )
  }

  if (field.field_type === 'boolean') {
    return (
      <Radio.Group
        optionType="button"
        buttonStyle="solid"
        className="boolean-choice-group"
        options={[
          { label: '是', value: true },
          { label: '否', value: false },
        ]}
      />
    )
  }

  if (field.field_type === 'number') {
    return (
      <InputNumber
        className="control-full-width"
        placeholder={textPlaceholder}
      />
    )
  }

  if (field.field_type === 'date') {
    return (
      <DatePicker
        className="control-full-width"
        placeholder={selectPlaceholder}
        disabledDate={isNotBeforeTodayField(field) ? getDisabledPastDate : undefined}
      />
    )
  }

  return <Input placeholder={textPlaceholder} />
}

function renderSearchFieldControl(field: FieldConfig) {
  const textPlaceholder = field.placeholder || `请输入${field.field_name}`
  const selectPlaceholder = field.placeholder || `请选择${field.field_name}`

  if (field.field_type === 'textarea' || field.field_type === 'text') {
    return <Input placeholder={textPlaceholder} allowClear />
  }

  if (field.field_type === 'select') {
    return (
      <Select
        mode="multiple"
        allowClear
        placeholder={selectPlaceholder}
        options={(field.option_config ?? []).map((option) => ({
          label: option.label,
          value: option.value,
        }))}
      />
    )
  }

  if (field.field_type === 'boolean') {
    return (
      <Select
        allowClear
        placeholder={selectPlaceholder}
        options={[
          { label: '是', value: 'true' },
          { label: '否', value: 'false' },
        ]}
      />
    )
  }

  if (field.field_type === 'number') {
    return <Input placeholder={textPlaceholder} allowClear />
  }

  return <Input placeholder={textPlaceholder} allowClear />
}

function mapOrderTypeToApi(value: unknown): 'new' | 'aftersales' | 'iteration' {
  if (value === '售后订单') {
    return 'aftersales'
  }

  if (value === '迭代订单') {
    return 'iteration'
  }

  return 'new'
}

function buildTaskPayload(
  fieldConfigs: FieldConfig[],
  values: TaskFormValues,
  secondStage?: { id?: string },
) {
  const fieldValues = getEnabledFieldConfigs(fieldConfigs).reduce<Record<string, unknown>>(
    (accumulator, field) => {
      const serialized = serializeFieldValue(field, values[field.field_key])

      if (serialized !== undefined) {
        accumulator[field.field_key] = serialized
      }

      return accumulator
    },
    {},
  )

  const titleValue = values.title
  const finalDueDateValue = values.finalDueDate
  const expectCompleteAt = dayjs.isDayjs(finalDueDateValue)
    ? finalDueDateValue.format('YYYY-MM-DD')
    : undefined
  const ownerId = normalizeTaskOwnerId(values.taskOwnerUserId)

  return {
    expect_complete_at: expectCompleteAt,
    field_values: fieldValues,
    owner_id: ownerId,
    order_type: mapOrderTypeToApi(values.orderType),
    stage_assignments: buildSecondStageAssignment(
      secondStage,
      values.secondStageAssigneeUserId,
    ),
    title: typeof titleValue === 'string' && titleValue.trim().length > 0
      ? titleValue.trim()
      : '未命名任务',
    workflow_template_id:
      typeof values.workflowTemplateId === 'string' && values.workflowTemplateId.trim().length > 0
        ? values.workflowTemplateId
        : undefined,
  }
}

function buildImportTaskPayload(payload: CreateCoursePayload) {
    const fieldValues = {
        artCopyright: normalizeBooleanLike(payload.artCopyright),
        chapterName: payload.chapterName,
        educationStage: payload.educationStage,
        finalDueDate: payload.finalDueDate,
        grade: payload.grade,
        hasLessonPlan: normalizeBooleanLike(payload.hasLessonPlan),
        hasScript: normalizeBooleanLike(payload.hasScript),
        isBEnd: normalizeBooleanLike(payload.isBEnd),
        orderType: payload.orderType,
        researchDueDate: payload.researchDueDate,
        researchOwner: payload.researchOwner,
        series: payload.series,
        subject: payload.subject,
    textbook: payload.textbook,
    textCopyright: normalizeBooleanLike(payload.textCopyright),
    title: payload.title,
    volume: payload.volume,
  }

  return {
    expect_complete_at: payload.finalDueDate,
    field_values: fieldValues,
    order_type: mapOrderTypeToApi(payload.orderType),
    title: payload.title.trim(),
  }
}

function canDeleteTaskRecord(
  task: TaskListRecord,
  currentUserId: string | undefined,
  role: UserRole,
) {
  if (role === 'admin') {
    return true
  }

  if (task.creatorUserId && currentUserId) {
    return task.creatorUserId === currentUserId
  }

  return !task.readonly
}

function isCompletedTask(task: TaskListRecord) {
  return task.status === 'completed'
}

function getActiveSubTaskTypeMeta(subTaskType: string) {
  if (subTaskType === 'aftersales') {
    return {
      color: 'gold',
      label: '售后',
    }
  }

  if (subTaskType === 'iteration') {
    return {
      color: 'purple',
      label: '迭代',
    }
  }

  return {
    color: 'default',
    label: subTaskType,
  }
}

function resolveCancelableSubTask(task: TaskListRecord) {
  return task.activeSubTasks.find((subTask) => (
    (subTask.subTaskType === 'aftersales' || subTask.subTaskType === 'iteration')
      && subTask.status !== 'completed'
  ))
}



function resolveTaskStatusQuery(
  _tabKey: 'todo' | 'joined' | 'completed',
  statusFilter: string,
) {
  if (statusFilter !== 'all') {
    return statusFilter
  }

  return undefined
}

function buildSecondStageAssignment(
  stage: { id?: string } | undefined,
  userIdValue: TaskFormValue,
) {
  const userId = normalizeTaskOwnerId(userIdValue)

  if (!stage || userId === undefined) {
    return undefined
  }

  const templateStageId = Number(stage.id)

  if (!Number.isFinite(templateStageId)) {
    return undefined
  }

  return [
    {
      assignees: [
        {
          assigned_page_count: 0,
          assignee_role: 'operator',
          is_primary: true,
          user_id: userId,
        },
      ],
      template_stage_id: templateStageId,
    },
  ]
}

function normalizeTaskOwnerId(value: TaskFormValue): number | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined
  }

  const userId = Number(value)
  return Number.isFinite(userId) ? userId : undefined
}

function resolveWorkflowTemplateId(
  detail: TaskDetailRecord,
  templates: WorkflowTemplateRecord[],
): string | undefined {
  const templateStageIds = detail.workflowStages
    .map((stage) => stage.templateStageId)
    .filter((stageId): stageId is string => Boolean(stageId))

  if (templateStageIds.length === 0) {
    return undefined
  }

  const templateStageIdSet = new Set(templateStageIds)

  return templates.find((template) => {
    const workflowStageIds = template.stages
      .map((stage) => stage.id)
      .filter((stageId): stageId is string => Boolean(stageId))

    return (
      workflowStageIds.length === templateStageIdSet.size &&
      workflowStageIds.every((stageId) => templateStageIdSet.has(stageId))
    )
  })?.id
}

function resolveFirstStageAssigneeUserId(detail: TaskDetailRecord): string | undefined {
  const firstStage = detail.workflowStages[0]

  if (!firstStage) {
    return undefined
  }

  return firstStage.stageAssignees.find((assignee) => assignee.isPrimary)?.userId
    ?? firstStage.stageAssignees[0]?.userId
}

function getTaskDetailCacheKey(taskId: string, versionId?: string): string {
  return versionId ? `${taskId}:${versionId}` : taskId
}

function buildTaskListVersionPreview(
  task: TaskListRecord,
  detail: TaskDetailRecord,
): TaskListRecord {
  return {
    ...task,
    archivedAt: detail.task.archivedAt,
    currentStage: detail.currentStage
      ? {
          assignees: detail.currentStage.stageAssignees.map((assignee) => ({
            userId: assignee.userId,
            userName: assignee.userName,
          })),
          id: detail.currentStage.id,
          stageName: detail.currentStage.stageName,
          status: detail.currentStage.status,
        }
      : null,
    currentVersion: detail.currentVersion,
    ownerId: detail.task.ownerId,
    packageInfo: detail.packageInfo,
    readonly: detail.task.readonly,
    status: detail.task.status,
    title: detail.task.title,
  }
}

type HistoryVersionDropdownProps = {
  hasHistory: boolean
  selectedVersionId?: string
  taskId: string
  versionNo: string
  onSelect: (versionId: string) => void
}

function HistoryVersionDropdown({
  hasHistory,
  selectedVersionId,
  taskId,
  versionNo,
  onSelect,
}: HistoryVersionDropdownProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [versions, setVersions] = useState<TaskVersionRecord[]>([])
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number } | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      const targetNode = event.target as Node
      const clickedTrigger = triggerRef.current?.contains(targetNode)
      const clickedMenu = menuRef.current?.contains(targetNode)

      if (!clickedTrigger && !clickedMenu) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [open])

  async function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()

    if (loading) {
      return
    }

    try {
      setLoading(true)
      const versionList = await taskService.listTaskVersions(taskId)
      const triggerRect = triggerRef.current?.getBoundingClientRect()

      setVersions(versionList)
      setMenuPosition(
        triggerRect
          ? {
              left: triggerRect.right - 108,
              top: triggerRect.bottom + 6,
            }
          : null,
      )
      setOpen(true)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '任务版本列表加载失败')
    } finally {
      setLoading(false)
    }
  }

  if (!hasHistory) {
    return <span>{versionNo}</span>
  }

  return (
    <div ref={containerRef} className="task-table__version-cell">
      <span>{versionNo}</span>
      <button
        ref={triggerRef}
        type="button"
        className="task-table__version-trigger"
        aria-label="查看任务历史版本"
        onClick={(event) => {
          void handleClick(event)
        }}
      >
        <DownOutlined spin={loading} />
      </button>
      {open && menuPosition
        ? createPortal(
            <div
              ref={menuRef}
              className="task-table__version-menu task-table__version-menu--portal"
              style={{
                left: `${menuPosition.left}px`,
                top: `${menuPosition.top}px`,
              }}
            >
              {versions.length > 0 ? (
                versions.map((version) => {
                  const isSelected = selectedVersionId === version.id

                  return (
                    <button
                      key={version.id}
                      type="button"
                      className={`task-table__version-menu-item${
                        isSelected ? ' task-table__version-menu-item--active' : ''
                      }`}
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        setOpen(false)
                        onSelect(version.id)
                      }}
                    >
                      {version.versionNo}
                    </button>
                  )
                })
              ) : (
                <div className="task-table__version-menu-empty">暂无历史版本</div>
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

export function CoursesPage({ mode = 'default' }: { mode?: 'default' | 'myTasks' }) {
  const navigate = useNavigate()
  const { currentProject, canCreateCourse, currentUser, role } = useAppState()
  const isMyTasksPage = mode === 'myTasks'
  const [tasks, setTasks] = useState<TaskListRecord[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [mutating, setMutating] = useState(false)
  const [fieldFilters, setFieldFilters] = useState<Record<string, unknown>>({})
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [statusFilter] = useState('all')
  const [tabKey, setTabKey] = useState<'todo' | 'joined' | 'completed'>('todo')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [processingTaskId, setProcessingTaskId] = useState<string | null>(null)
  const [serviceDrawerOpen, setServiceDrawerOpen] = useState(false)
  const [serviceDrawerTaskId, setServiceDrawerTaskId] = useState<string>('')
  const [serviceDrawerType, setServiceDrawerType] = useState<ServiceType>('售后')
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([])
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null)
  const [taskDetails, setTaskDetails] = useState<Record<string, TaskDetailRecord>>({})
  const [taskRowOverrides, setTaskRowOverrides] = useState<Record<string, TaskListRecord>>({})
  const [selectedVersionIds, setSelectedVersionIds] = useState<Record<string, string | undefined>>({})
  const [taskFieldConfigs, setTaskFieldConfigs] = useState<FieldConfig[]>([])
  const [fieldConfigLoading, setFieldConfigLoading] = useState(false)
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(mandatoryTaskColumnKeys)
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplateRecord[]>([])
  const [workflowLoading, setWorkflowLoading] = useState(false)
  const [taskOwnerMembers, setTaskOwnerMembers] = useState<ProjectMemberRecord[]>([])
  const [taskOwnerLoading, setTaskOwnerLoading] = useState(false)
  const [secondStageMembers, setSecondStageMembers] = useState<ProjectMemberRecord[]>([])
  const [secondStageLoading, setSecondStageLoading] = useState(false)
  const [serviceOwnerOptions, setServiceOwnerOptions] = useState<FieldOptionConfig[]>([])
  const [serviceParticipantOptions, setServiceParticipantOptions] = useState<FieldOptionConfig[]>([])
  const [serviceFirstStageAssigneeLabel, setServiceFirstStageAssigneeLabel] = useState('')
  const [serviceFirstStageAssigneeOptions, setServiceFirstStageAssigneeOptions] = useState<FieldOptionConfig[]>([])
  const [serviceFirstStageAssignmentMeta, setServiceFirstStageAssignmentMeta] = useState<{
    dueDays?: number
    templateStageId?: string
  }>({})
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const listRequestIdRef = useRef(0)
  const [form] = Form.useForm<TaskFormValues>()
  const [searchForm] = Form.useForm<TaskSearchFormValues>()
  const selectedWorkflowTemplateId = Form.useWatch('workflowTemplateId', form)
  const canManageTaskActions = !isMyTasksPage && (role === 'planner' || role === 'admin')
  const shouldShowTaskTabs = !canManageTaskActions
  // const activeTaskCount = tasks.filter((task) => task.status !== 'completed').length

  const loadTasks = useCallback(
    async (
      overrides?: Partial<{
        currentPage: number
        fieldFilters: Record<string, unknown>
        pageSize: number
        statusFilter: string
        tabKey: 'todo' | 'joined' | 'completed'
      }>,
    ) => {
      const nextPage = overrides?.currentPage ?? currentPage
      const nextPageSize = overrides?.pageSize ?? pageSize
      const nextFieldFilters = overrides?.fieldFilters ?? fieldFilters
      const nextStatusFilter = overrides?.statusFilter ?? statusFilter
      const nextTabKey = overrides?.tabKey ?? tabKey
      const requestId = listRequestIdRef.current + 1
      listRequestIdRef.current = requestId

      try {
        setTasksLoading(true)
        const response = await taskService.listTasks({
          fieldFilters: nextFieldFilters,
          // 管理员和计划员直接查看全部任务，其他角色按 mine_scope 切换接口视图。
          mineScope:
            shouldShowTaskTabs
              ? nextTabKey === 'todo'
                ? 'todo'
                : nextTabKey === 'joined'
                  ? 'joined'
                  : 'completed'
              : undefined,
          page: nextPage,
          pageSize: nextPageSize,
          status: resolveTaskStatusQuery(nextTabKey, nextStatusFilter),
        })

        if (requestId !== listRequestIdRef.current) {
          return
        }

        setTasks(response.items)
        setCurrentPage(response.page)
        setPageSize(response.pageSize)
        setTotal(response.total)
      } catch (error) {
        message.error(error instanceof Error ? error.message : '任务列表加载失败')
      } finally {
        if (requestId === listRequestIdRef.current) {
          setTasksLoading(false)
        }
      }
    },
    [currentPage, fieldFilters, pageSize, shouldShowTaskTabs, statusFilter, tabKey],
  )

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  useEffect(() => {
    const projectId = currentProject?.id ?? ''

    if (!projectId) {
      setTaskFieldConfigs([])
      searchForm.resetFields()
      setFieldFilters({})
      setSearchExpanded(false)
      return
    }

    async function loadTaskFields() {
      try {
        setFieldConfigLoading(true)
        const fields = await adminService.listTaskFields(projectId)
        setTaskFieldConfigs(fields)
      } catch (error) {
        message.error(error instanceof Error ? error.message : '任务字段配置加载失败')
        setTaskFieldConfigs([])
      } finally {
        setFieldConfigLoading(false)
      }
    }

    void loadTaskFields()
  }, [currentProject?.id, searchForm])

  useEffect(() => {
    const projectId = currentProject?.id ?? ''

    if (!projectId) {
      setWorkflowTemplates([])
      return
    }

    async function loadWorkflows() {
      try {
        setWorkflowLoading(true)
        const templates = await adminService.listWorkflowTemplates(projectId)
        setWorkflowTemplates(
          templates.filter((template) => template.status === 'enabled'),
        )
      } catch (error) {
        message.error(error instanceof Error ? error.message : '工作流模板加载失败')
        setWorkflowTemplates([])
      } finally {
        setWorkflowLoading(false)
      }
    }

    void loadWorkflows()
  }, [currentProject?.id])

  useEffect(() => {
    const projectId = currentProject?.id ?? ''

    if (!projectId) {
      setServiceOwnerOptions([])
      return
    }

    // 售后和迭代弹窗的任务负责人来自当前项目全部成员。
    async function loadServiceOwnerOptions() {
      try {
        const response = await adminService.listProjectMembers({
          page: 1,
          pageSize: 100,
          projectId,
        })
        setServiceOwnerOptions(
          response.items.map((member) => ({
            label: `${member.userName} · ${member.userEmail}`,
            value: member.userId,
          })),
        )
      } catch (error) {
        message.error(error instanceof Error ? error.message : '任务负责人列表加载失败')
        setServiceOwnerOptions([])
      }
    }

    void loadServiceOwnerOptions()
  }, [currentProject?.id])
  const selectedWorkflowTemplate = workflowTemplates.find(
    (template) => template.id === selectedWorkflowTemplateId,
  )
  const firstWorkflowStage = selectedWorkflowTemplate?.stages[0]
  const firstWorkflowRoleCode = firstWorkflowStage?.operatorRoleCode
  const firstWorkflowRoleName = firstWorkflowStage?.operatorRoleName ?? firstWorkflowStage?.stageName
  const shouldShowTaskOwnerField = Boolean(
      selectedWorkflowTemplate,
  )
  const shouldShowSecondStageAssigneeField = Boolean(
      selectedWorkflowTemplate &&
      firstWorkflowRoleCode,
  )

  useEffect(() => {
    const projectId = currentProject?.id ?? ''

    if (!projectId || !canManageTaskActions || !selectedWorkflowTemplate) {
      setTaskOwnerMembers([])
      return
    }

    async function loadTaskOwnerMembers() {
      try {
        setTaskOwnerLoading(true)
        const response = await adminService.listProjectMembers({
          page: 1,
          pageSize: 100,
          projectId,
        })
        setTaskOwnerMembers(response.items)
      } catch (error) {
        message.error(error instanceof Error ? error.message : '任务所有者成员加载失败')
        setTaskOwnerMembers([])
      } finally {
        setTaskOwnerLoading(false)
      }
    }

    void loadTaskOwnerMembers()
  }, [
    canManageTaskActions,
    currentProject?.id,
    editingTaskId,
    form,
    selectedWorkflowTemplate,
  ])

  useEffect(() => {
    const projectId = currentProject?.id ?? ''
    const roleCode = firstWorkflowRoleCode ?? ''

    if (!projectId || !canManageTaskActions || !selectedWorkflowTemplate || !roleCode) {
      setSecondStageMembers([])
      return
    }

    async function loadSecondStageMembers() {
      try {
        setSecondStageLoading(true)
        const response = await adminService.listProjectRoleUsers({
          page: 1,
          pageSize: 100,
          roleCode,
          projectId,
        })
        setSecondStageMembers(response.items)
      } catch (error) {
        message.error(error instanceof Error ? error.message : '第一阶段角色成员加载失败')
        setSecondStageMembers([])
      } finally {
        setSecondStageLoading(false)
      }
    }

    void loadSecondStageMembers()
  }, [
    canManageTaskActions,
    currentProject?.id,
    editingTaskId,
    firstWorkflowRoleCode,
    form,
    selectedWorkflowTemplate,
  ])

  const enabledFieldConfigs = useMemo(
    () => getEnabledFieldConfigs(taskFieldConfigs),
    [taskFieldConfigs],
  )
  const searchableTaskFieldConfigs = useMemo(
    () => getSearchableTaskFieldConfigs(taskFieldConfigs),
    [taskFieldConfigs],
  )
  const visibleSearchFieldConfigs = useMemo(
    () =>
      searchExpanded
        ? searchableTaskFieldConfigs
        : searchableTaskFieldConfigs.slice(0, 4),
    [searchExpanded, searchableTaskFieldConfigs],
  )
  const taskColumnStorageKey = buildTaskColumnStorageKey(currentProject?.id ?? 'global', mode)

  // const statusOptions = Array.from(new Set(tasks.map((task) => task.status))).map((status) => ({
  //   label: getTaskStatusMeta(status).label,
  //   value: status,
  // }))

  function openCreateDrawer() {
    if (enabledFieldConfigs.length === 0) {
      message.warning('当前项目尚未配置任务字段，请先在后台完成配置')
      return
    }

    setEditingTaskId(null)
    setTaskOwnerMembers([])
    setSecondStageMembers([])
    form.resetFields()
    form.setFieldsValue({
      ...buildFormInitialValues(enabledFieldConfigs),
      workflowTemplateId: undefined,
    })
    setDrawerOpen(true)
  }

  async function ensureTaskDetail(taskId: string, versionId?: string) {
    const cacheKey = getTaskDetailCacheKey(taskId, versionId)

    if (taskDetails[cacheKey]) {
      return taskDetails[cacheKey]
    }

    const detail = await taskService.getTaskDetail(taskId, { versionId })
    setTaskDetails((current) => ({ ...current, [cacheKey]: detail }))
    return detail
  }

  async function handleExpandTask(expanded: boolean, taskId: string, versionId?: string) {
    if (expanded) {
      setExpandedRowKeys((current) => [...new Set([...current, taskId])])
      const cacheKey = getTaskDetailCacheKey(taskId, versionId)

      if (!taskDetails[cacheKey]) {
        try {
          setLoadingDetailId(taskId)
          await ensureTaskDetail(taskId, versionId)
        } catch (error) {
          message.error(error instanceof Error ? error.message : '任务详情加载失败')
          setExpandedRowKeys((current) => current.filter((key) => key !== taskId))
        } finally {
          setLoadingDetailId((current) => (current === taskId ? null : current))
        }
      }

      return
    }

    setExpandedRowKeys((current) => current.filter((key) => key !== taskId))
  }

  async function handleSelectTaskVersion(taskId: string, versionId: string): Promise<void> {
    try {
      const currentTask = tasks.find((task) => task.id === taskId)
      setSelectedVersionIds((current) => ({ ...current, [taskId]: versionId }))
      const detail = await ensureTaskDetail(taskId, versionId)

      if (currentTask) {
        setTaskRowOverrides((current) => ({
          ...current,
          [taskId]: buildTaskListVersionPreview(currentTask, detail),
        }))
      }

      setExpandedRowKeys((current) => [...new Set([...current, taskId])])
    } catch {
      setSelectedVersionIds((current) => ({ ...current, [taskId]: undefined }))
    }
  }

  async function openEditDrawer(task: TaskListRecord) {
    try {
      const detail = await ensureTaskDetail(task.id)
      let availableWorkflowTemplates = workflowTemplates

      if (availableWorkflowTemplates.length === 0 && currentProject?.id) {
        const templates = await adminService.listWorkflowTemplates(currentProject.id)
        availableWorkflowTemplates = templates.filter((template) => template.status === 'enabled')
        setWorkflowTemplates(availableWorkflowTemplates)
      }

      const workflowTemplateId = resolveWorkflowTemplateId(detail, availableWorkflowTemplates)
      const firstStageAssigneeUserId = resolveFirstStageAssigneeUserId(detail)

      setEditingTaskId(task.id)
      form.resetFields()
      form.setFieldsValue({
        ...buildFormInitialValues(enabledFieldConfigs, detail.fieldValues),
        secondStageAssigneeUserId: firstStageAssigneeUserId,
        taskOwnerUserId: detail.task.ownerId,
        workflowTemplateId,
      })
      setDrawerOpen(true)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '任务详情加载失败')
    }
  }

  function handleCloseDrawer() {
    setDrawerOpen(false)
    setEditingTaskId(null)
    setTaskOwnerMembers([])
    setSecondStageMembers([])
    form.resetFields()
  }

  function handleCloseProcessModal() {
    setProcessingTaskId(null)
  }

  function handleCloseServiceDrawer() {
    setServiceDrawerOpen(false)
    setServiceDrawerTaskId('')
    setServiceParticipantOptions([])
    setServiceFirstStageAssigneeLabel('')
    setServiceFirstStageAssigneeOptions([])
    setServiceFirstStageAssignmentMeta({})
  }

  async function refreshTaskDetail(taskId: string, versionId?: string) {
    const cacheKey = getTaskDetailCacheKey(taskId, versionId)
    const detail = await taskService.getTaskDetail(taskId, { versionId })
    setTaskDetails((current) => ({ ...current, [cacheKey]: detail }))
    return detail
  }

  async function loadServiceParticipantOptions(taskId: string) {
    try {
      const participants = await taskService.listTaskParticipants(taskId)
      setServiceParticipantOptions(
        participants.map((participant) => ({
          label: participant.name,
          value: participant.id,
        })),
      )
    } catch (error) {
      message.error(error instanceof Error ? error.message : '责任人加载失败')
      setServiceParticipantOptions([])
    }
  }

  async function loadServiceFirstStageAssigneeOptions(templateId: string | undefined) {
    if (!currentProject?.id || !templateId) {
      setServiceFirstStageAssigneeLabel('')
      setServiceFirstStageAssigneeOptions([])
      setServiceFirstStageAssignmentMeta({})
      return
    }

    const selectedTemplate = workflowTemplates.find((template) => template.id === templateId)
    const firstStage = selectedTemplate?.stages
      .slice()
      .sort((left, right) => left.sortValue - right.sortValue)[0]

    if (!firstStage?.id || !firstStage.operatorRoleCode) {
      setServiceFirstStageAssigneeLabel('')
      setServiceFirstStageAssigneeOptions([])
      setServiceFirstStageAssignmentMeta({})
      return
    }

    // 选择流程后，按首节点角色加载候选人，保持和售后页的发起逻辑一致。
    setServiceFirstStageAssigneeLabel(firstStage.operatorRoleName ?? firstStage.stageName)
    setServiceFirstStageAssignmentMeta({
      dueDays: firstStage.defaultDueDays,
      templateStageId: firstStage.id,
    })

    try {
      const response = await adminService.listProjectRoleUsers({
        page: 1,
        pageSize: 100,
        projectId: currentProject.id,
        roleCode: firstStage.operatorRoleCode,
      })
      setServiceFirstStageAssigneeOptions(
        response.items.map((member) => ({
          label: `${member.userName} · ${member.userEmail}`,
          value: member.userId,
        })),
      )
    } catch (error) {
      message.error(error instanceof Error ? error.message : '首节点人员加载失败')
      setServiceFirstStageAssigneeOptions([])
    }
  }

  async function openServiceDrawer(type: ServiceType, taskId: string) {
    setServiceDrawerType(type)
    setServiceDrawerTaskId(taskId)
    setServiceParticipantOptions([])
    setServiceDrawerOpen(true)

    if (type === '售后') {
      await loadServiceParticipantOptions(taskId)
    }
  }
  async function cancelOpeTask(task: TaskListRecord) {
    const targetSubTask = resolveCancelableSubTask(task)

    if (!targetSubTask) {
      message.warning('当前没有可取消的售后/迭代子任务')
      return
    }

    Modal.confirm({
      title: '确认取消当前子任务吗？',
      content: '取消后该售后/迭代子任务会停止流转，请谨慎操作。',
      okButtonProps: { danger: true },
      okText: '确认取消',
      cancelText: '返回',
      onOk: async () => {
        try {
          setMutating(true)
          await taskService.cancelSubTask(targetSubTask.id)
          message.success('子任务已取消')
          await loadTasks()
        } catch (error) {
          message.error(error instanceof Error ? error.message : '取消子任务失败')
        } finally {
          setMutating(false)
        }
      },
    })
  }

  async function handleCreateServiceTask(payload: {
    assigneeUserIds?: string[]
    description: string
    firstStageAssigneeUserId?: string
    ownerUserId?: string
    type: ServiceType
    workflowTemplateId?: string
  }) {
    if (!serviceDrawerTaskId) {
      message.warning('缺少关联主任务，暂时无法发起')
      return
    }

    if (!payload.workflowTemplateId) {
      message.warning('请选择关联流程')
      return
    }

    if (!payload.ownerUserId) {
      message.warning('请选择任务负责人')
      return
    }

    if (!payload.firstStageAssigneeUserId || !serviceFirstStageAssignmentMeta.templateStageId) {
      message.warning(`请选择${serviceFirstStageAssigneeLabel || '首节点执行人'}`)
      return
    }

    try {
      setMutating(true)
      const stageAssignments = [
        {
          assignees: [
            {
              assigned_page_count: 0,
              assignee_role: 'operator' as const,
              is_primary: true,
              user_id: Number(payload.firstStageAssigneeUserId),
            },
          ],
          due_days: serviceFirstStageAssignmentMeta.dueDays,
          template_stage_id: Number(serviceFirstStageAssignmentMeta.templateStageId),
        },
      ]

      if (payload.type === '售后') {
        await taskService.createAfterSalesTask(serviceDrawerTaskId, {
          description: payload.description,
          owner_id: Number(payload.ownerUserId),
          responsible_user_ids: (payload.assigneeUserIds ?? [])
            .map((userId) => Number(userId))
            .filter((userId) => Number.isFinite(userId)),
          stage_assignments: stageAssignments,
          workflow_template_id: Number(payload.workflowTemplateId),
        })
        message.success('售后任务已发起')
      } else {
        await taskService.createIterationTask(serviceDrawerTaskId, {
          description: payload.description,
          owner_id: Number(payload.ownerUserId),
          stage_assignments: stageAssignments,
          workflow_template_id: Number(payload.workflowTemplateId),
        })
        message.success('迭代任务已发起')
      }

      await Promise.all([loadTasks(), refreshTaskDetail(serviceDrawerTaskId)])
      handleCloseServiceDrawer()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '发起失败')
    } finally {
      setMutating(false)
    }
  }

  async function handleFinish(values: TaskFormValues) {
    const payload = buildTaskPayload(enabledFieldConfigs, values, firstWorkflowStage)

    try {
      setMutating(true)

      if (editingTaskId) {
        await taskService.updateTask(editingTaskId, payload)
        await Promise.all([loadTasks(), refreshTaskDetail(editingTaskId)])
        message.success('任务信息已更新')
      } else {
        await taskService.createTask(payload)
        await loadTasks()
        message.success('任务创建成功')
      }

      handleCloseDrawer()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '任务保存失败')
    } finally {
      setMutating(false)
    }
  }

  async function handleImportChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    try {
      setMutating(true)
      const payloads = await parseCourseImportFile(file)

      for (const payload of payloads) {
        await taskService.createTask(buildImportTaskPayload(payload))
      }

      await loadTasks({ currentPage: 1 })
      message.success(`成功导入 ${payloads.length} 条任务`)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '批量导入失败')
    } finally {
      setMutating(false)
    }
  }

  async function handleDeleteTask(taskId: string) {
    try {
      setMutating(true)
      await taskService.deleteTask(taskId)
      setTaskDetails((current) => {
        const next = { ...current }
        delete next[taskId]
        return next
      })
      await loadTasks()
      message.success('任务已删除')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '任务删除失败')
    } finally {
      setMutating(false)
    }
  }

  // 列头里的 Popover、版本选择等都会读取当前页面状态；这里保持按渲染实时生成，
  // 避免 useMemo 持有旧闭包后出现“表格列已切换，但勾选面板还是旧状态”的错位。
  const taskColumnDefinitions: TaskColumnDefinition[] = [
      {
        column: {
      key: 'task',
      title: '任务',
      width:200,
      dataIndex: 'title',
      render: (_, record) => {
        // 子任务类型按名称去重，只展示售后/迭代这类业务标识，不重复堆叠相同标签。
        const activeSubTaskTypes = Array.from(
          new Set(record.activeSubTasks.map((subTask) => subTask.subTaskType).filter(Boolean)),
        )

        return (
          <div className="task-table__title-cell">
            <div className="task-table__title-row">
              <span className="task-table__title">{record.title}</span>
              {activeSubTaskTypes.map((subTaskType) => {
                const meta = getActiveSubTaskTypeMeta(subTaskType)

                return (
                  <Tag
                    key={subTaskType}
                    color={meta.color}
                    className="task-table__subtask-tag"
                  >
                    {meta.label}
                  </Tag>
                )
              })}
              {/* 已完成任务在列表中单独标识，方便管理员查看全量任务时快速识别。 */}
              {/* {isCompletedTask(record) ? (
                <Tag color="success" className="task-table__completed-tag">
                  已完成
                </Tag>
              ) : null} */}
            </div>
            {/* <span className="task-table__meta">
              #{record.id} · {String(record.fieldValues.series ?? '未配置品牌')}
            </span> */}
          </div>
        )
      },
        },
        key: 'task',
        required: true,
        title: '任务',
      },
      {
        column: {
      key: 'status',
      title: '状态',
      dataIndex: 'status',
      render: (status: string, record) => {
        const displayLabel = record.currentStage?.stageName || getTaskStatusMeta(status).label
        const meta = getTaskStatusMeta(record.currentStage?.status || status)
        return (
          <Tag color={meta.color} className="task-table__status-tag all-tickets-page__tag">
            {displayLabel}
          </Tag>
        )
      },
      width: 140,
        },
        defaultVisible: true,
        key: 'status',
        title: '状态',
      },
      {
        column: {
      key: 'currentAssignees',
      title: '当前责任人',
      render: (_, record) => {
        const assigneeNames = record.currentStage?.assignees.map((assignee) => assignee.userName) ?? []
        return (
          <span className="task-table__assignee">
            {assigneeNames.length > 0 ? assigneeNames.join(' / ') : '-'}
          </span>
        )
      },
      width: 160,
        },
        defaultVisible: true,
        key: 'currentAssignees',
        title: '当前责任人',
      },
      ...enabledFieldConfigs.map<TaskColumnDefinition>((field) => ({
        column: {
          key: `field:${field.field_key}`,
          dataIndex: field.field_key,
          render: (_, record) => formatTaskFieldValue(
            field.field_type,
            record.fieldValues[field.field_key],
            field.option_config,
          ),
          title: field.field_name,
          width: field.field_type === 'textarea' ? 220 : 140,
        },
        defaultVisible: enabledFieldConfigs.findIndex(
          (config) => config.field_key === field.field_key,
        ) < 2,
        key: `field:${field.field_key}`,
        title: field.field_name,
      })),
      {
        column: {
          key: 'currentVersion',
          title: '当前版本',
          render: (_, record) => {
            return (
              <HistoryVersionDropdown
                hasHistory={record.activeSubTasks.length > 0}
                selectedVersionId={selectedVersionIds[record.id]}
                taskId={record.id}
                versionNo={record.currentVersion.versionNo}
                onSelect={(versionId) => {
                  void handleSelectTaskVersion(record.id, versionId)
                }}
              />
            )
          },
          width: 140,
        },
        defaultVisible: true,
        key: 'currentVersion',
        title: '当前版本',
      },
      {
        column: {
          key: 'packageInfo',
          title: '打包信息',
          render: (_, record) => {
            const outputFile = record.packageInfo?.outputFile
            const errorMessage = record.packageInfo?.errorMessage?.trim()
            if(record.packageInfo?.status=='pending'||record.packageInfo?.status=='processing'){
              return  '打包中'
            }

            if (outputFile?.name) {
              return (
                <Button
                  type="link"
                  size="small"
                  className="task-table__package-link"
                  onClick={() => makeDemoDownload(outputFile)}
                >
                  {outputFile.name}
                </Button>
              )
            }

            if (errorMessage) {
              return <span className="task-table__package-error">{errorMessage}</span>
            }

            return ''
          },
          width: 160,
        },
        defaultVisible: true,
        key: 'packageInfo',
        title: '打包信息',
      },
      // {
      //   column: {
      //     title: '预计交付',
      //     render: (_, record) => record.currentVersion.expectCompleteAt || '-',
      //     width: 160,
      //   },
      //   defaultVisible: true,
      //   key: 'expectCompleteAt',
      //   title: '预计交付',
      // },
      {
        column: {
      key: 'actions',
      title: (
        <div className="task-table__actions-header">
          <span>操作</span>
          <Popover
            trigger="click"
            placement="bottomLeft"
            overlayClassName="task-table-column-popover"
            content={renderColumnPicker}
          >
            <Button
              type="text"
              size="small"
              className="task-table__header-filter-button"
              icon={<FilterOutlined />}
              aria-label="筛选显示列"
              title="筛选显示列"
            />
          </Popover>
        </div>
      ),
      width: 240,
      render: (_, record) => {
        const canDeleteTask = canDeleteTaskRecord(record, currentUser?.id, role)
        const completedTask = isCompletedTask(record)
        const cancelableSubTask = resolveCancelableSubTask(record)
        const canCancelServiceTask = Boolean(
          !completedTask &&
            cancelableSubTask &&
            currentUser?.id &&
            (
              record.ownerId === currentUser.id ||
              role === 'admin' ||
              role === 'planner'
            ),
        )
        const canProcessTask = Boolean(
          currentUser?.id &&
            record.currentStage?.assignees.some((assignee) => assignee.userId === currentUser.id),
        )

        return (
          <div className="task-table__actions">
            {!isMyTasksPage ? (
              <Button
                type='primary'
                size="small"
                onClick={() => {
                  const nextQuery = new URLSearchParams()
                  const selectedVersionId = selectedVersionIds[record.id]

                  if (selectedVersionId) {
                    nextQuery.set('versionId', selectedVersionId)
                  }

                  navigate({
                    pathname: `/courses/${record.id}`,
                    search: nextQuery.toString() ? `?${nextQuery.toString()}` : '',
                  })
                }}
              >
                详情
              </Button>
            ) : null}
            {completedTask ? (
              <>
                <Button
                  size="small"
                  variant="solid"
                  color='geekblue'
                  onClick={() => void openServiceDrawer('售后', record.id)}
                >
                  售后
                </Button>
                <Button
                  size="small"
                   color='volcano'
                   variant="solid"
                  onClick={() => void openServiceDrawer('迭代', record.id)}
                >
                  迭代
                </Button>
              </>
            ) : canProcessTask ? (
              <Button
                danger
                size="small"
                variant="solid"
                onClick={() => {
                  setProcessingTaskId(record.id)
                }}
              >
                处理
              </Button>
            ) : null}
            {canManageTaskActions && !record.readonly && !completedTask ? (
              <Button
                type="primary"
                size="small"
                variant="solid"
                color='green'
                onClick={() => void openEditDrawer(record)}
              >
                编辑
              </Button>
            ) : null}
            {canManageTaskActions && canDeleteTask ? (
              <Button
                danger
                size="small"
                variant="solid"
                color='red'
                loading={mutating}
                onClick={() => {
                  Modal.confirm({
                    title: '确认删除该任务吗？',
                    content: '删除后不可恢复，请谨慎操作。',
                    okButtonProps: { danger: true, loading: mutating },
                    okText: '删除',
                    cancelText: '取消',
                    onOk: async () => {
                      await handleDeleteTask(record.id)
                    },
                  })
                }}
              >
                删除
              </Button>
            ) : null}
            {canCancelServiceTask ? (
              <Button
                danger
                variant="solid"
                size="small"
                className="task-table__action-button"
                onClick={() => void cancelOpeTask(record)}
              >
                取消售后
              </Button>
            ) : null}
          </div>
        )
      },
        },
        defaultVisible: true,
        key: 'actions',
        title: '操作',
      },
    ]

  useEffect(() => {
    const availableColumnKeySet = new Set(taskColumnDefinitions.map((definition) => definition.key))
    const requiredKeys = taskColumnDefinitions
      .filter((definition) => definition.required)
      .map((definition) => definition.key)
    const storedKeys = readVisibleTaskColumns(taskColumnStorageKey)
    const fallbackKeys = taskColumnDefinitions
      .filter((definition) => definition.required || definition.defaultVisible !== false)
      .map((definition) => definition.key)
    const baseKeys = storedKeys ?? fallbackKeys
    const nextVisibleKeys = Array.from(
      new Set([
        ...requiredKeys,
        ...baseKeys.filter((key) => availableColumnKeySet.has(key)),
      ]),
    )

    setVisibleColumnKeys((current) => (
      areTaskColumnKeysEqual(current, nextVisibleKeys) ? current : nextVisibleKeys
    ))
  }, [taskColumnDefinitions, taskColumnStorageKey])

  const defaultVisibleColumnKeys = useMemo(
    () => taskColumnDefinitions
      .filter((definition) => definition.required || definition.defaultVisible !== false)
      .map((definition) => definition.key),
    [taskColumnDefinitions],
  )

  const fixedColumnDefinitions = taskColumnDefinitions.filter(
    (definition) => !definition.key.startsWith('field:'),
  )

  const fieldColumnDefinitions = taskColumnDefinitions.filter(
    (definition) => definition.key.startsWith('field:'),
  )

  const visibleColumnKeySet = useMemo(
    () => new Set(visibleColumnKeys),
    [visibleColumnKeys],
  )

  const columns: ColumnsType<TaskListRecord> = taskColumnDefinitions
    .filter((definition) => visibleColumnKeySet.has(definition.key))
    .map((definition, index) => {
      const fixedPosition =
        definition.key === 'actions'
          ? 'right'
          : index < 3
            ? 'left'
            : undefined

      return {
        ...definition.column,
        // Table 依赖稳定的 key 来区分列，否则动态切换时容易复用错误列节点。
        key: definition.key,
        // 前三列固定在左侧，操作列固定在右侧，保证宽表横向滚动时核心信息始终可见。
        fixed: fixedPosition,
      }
    })

  const displayTasks = useMemo(
    () => tasks.map((task) => taskRowOverrides[task.id] ?? task),
    [taskRowOverrides, tasks],
  )

  const tableScrollX = taskColumnDefinitions
    .filter((definition) => visibleColumnKeySet.has(definition.key))
    .reduce((totalWidth, definition) => {
      const width = 'width' in definition.column ? definition.column.width : undefined
      return totalWidth + (typeof width === 'number' ? width : 180)
    }, 0)

  function handleVisibleColumnsChange(nextKeys: Array<string | number>) {
    const requiredKeys = taskColumnDefinitions
      .filter((definition) => definition.required)
      .map((definition) => definition.key)
    const nextVisibleKeys = Array.from(
      new Set([
        ...requiredKeys,
        ...nextKeys.filter((key): key is string => typeof key === 'string'),
      ]),
    )

    setVisibleColumnKeys((current) => (
      areTaskColumnKeysEqual(current, nextVisibleKeys) ? current : nextVisibleKeys
    ))
    writeVisibleTaskColumns(taskColumnStorageKey, nextVisibleKeys)
  }

  function handleVisibleColumnToggle(columnKey: string, checked: boolean) {
    const nextVisibleKeys = checked
      ? Array.from(new Set([...visibleColumnKeys, columnKey]))
      : visibleColumnKeys.filter((key) => key !== columnKey)

    handleVisibleColumnsChange(nextVisibleKeys)
  }

  function handleResetVisibleColumns() {
    handleVisibleColumnsChange(defaultVisibleColumnKeys)
  }

  function renderColumnPicker() {
    return (
      <div className="task-table-column-picker">
        <div className="task-table-column-picker__header">
          <div>
            <Typography.Text strong className="task-table-column-picker__title">
              选择显示列
            </Typography.Text>
            <Typography.Text className="task-table-column-picker__subtitle">
              已显示 {visibleColumnKeys.length} 列
            </Typography.Text>
          </div>
          <Button
            type="text"
            size="small"
            className="task-table-column-picker__reset"
            onClick={handleResetVisibleColumns}
          >
            恢复默认
          </Button>
        </div>

        <div className="task-table-column-picker__section">
          <Typography.Text className="task-table-column-picker__section-title">
            固定列
          </Typography.Text>
          <div className="task-table-column-picker__list">
            {fixedColumnDefinitions.map((definition) => (
              <div
                key={definition.key}
                className="task-table-column-picker__option"
              >
                <Checkbox
                  checked={visibleColumnKeys.includes(definition.key)}
                  disabled={definition.required}
                  onChange={(event) => {
                    // 只保留 Checkbox 这一处点击入口，避免外层 label 二次触发导致勾选状态闪回。
                    handleVisibleColumnToggle(definition.key, event.target.checked)
                  }}
                >
                  {definition.title}
                </Checkbox>
                {definition.required ? (
                  <span className="task-table-column-picker__badge">必显</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="task-table-column-picker__section">
          <Typography.Text className="task-table-column-picker__section-title">
            配置字段
          </Typography.Text>
          <div className="task-table-column-picker__list">
            {fieldColumnDefinitions.map((definition) => (
              <div
                key={definition.key}
                className="task-table-column-picker__option"
              >
                <Checkbox
                  checked={visibleColumnKeys.includes(definition.key)}
                  onChange={(event) => {
                    // 配置字段和固定列共用同一套 visible keys，保证勾选状态与表格列同步。
                    handleVisibleColumnToggle(definition.key, event.target.checked)
                  }}
                >
                  {definition.title}
                </Checkbox>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  function handleTableChange(pagination: TablePaginationConfig) {
    const nextPage = pagination.current ?? 1
    const nextPageSize = pagination.pageSize ?? 10

    setCurrentPage(nextPage)
    setPageSize(nextPageSize)
  }

  function handleReset() {
    searchForm.resetFields()
    setFieldFilters({})
    setCurrentPage(1)
  }

  function handleQuery(values: TaskSearchFormValues) {
    setFieldFilters(buildTaskFieldFilters(searchableTaskFieldConfigs, values))
    setCurrentPage(1)
  }

  return (
    <div className="courses-page-card">
      {/* <div className="workspace-header"> */}
      <div className="workspace-filter-bar">
        {/* <div className="workspace-header-info">
          <div className="workspace-header-title-row">
            <span className="workspace-header-icon">
              <CalendarOutlined />
            </span>
            <Typography.Title level={3} className="workspace-header-title">
              {isMyTasksPage ? '我的任务' : '任务管理'}
            </Typography.Title>
          </div>
          <Typography.Text className="workspace-header-subtitle">
            共 {total} 项任务，
            <span className="workspace-header-subtitle-accent"> {activeTaskCount} 项进行中</span>
          </Typography.Text>
        </div> */}
        <div className="workspace-search">
          <Form
            form={searchForm}
            layout="vertical"
            className="task-search-form"
            onFinish={(values) => handleQuery(values)}
          >
            <Row gutter={[12, 8]} className="task-search-form__row">
              {visibleSearchFieldConfigs.map((field) => (
                <Col xs={24} md={12} xl={6} key={field.field_key}>
                  <Form.Item
                    label={field.field_name}
                    name={field.field_key}
                    className="task-search-form__item"
                  >
                    {renderSearchFieldControl(field)}
                  </Form.Item>
                </Col>
              ))}
            </Row>
            <div className="task-search-form__actions" style={
                searchExpanded && visibleSearchFieldConfigs.length % 4 !== 0
                  ? { marginTop: '-40px' }
                  : undefined
              }>
              <Space size={8} wrap>
                <Button type="primary" htmlType="submit">
                  查询
                </Button>
                <Button onClick={handleReset}>重置</Button>
                {canCreateCourse && canManageTaskActions ? (
                  <Button
                    type="primary"
                    variant="solid"
                    color="blue"
                    onClick={openCreateDrawer}
                    loading={fieldConfigLoading || workflowLoading}
                  >
                    新建任务
                  </Button>
                ) : null}
                {searchableTaskFieldConfigs.length > 4 ? (
                  <Button
                    type="link"
                    className="task-search-form__toggle"
                    onClick={() => setSearchExpanded((current) => !current)}
                  >
                    {searchExpanded ? '收起' : '展开'}
                    {searchExpanded ? <UpOutlined /> : <DownOutlined />}
                  </Button>
                ) : null}
              </Space>
            </div>
          </Form>
        </div>
     
        {/* </div> */}
      </div>

      <input
        ref={importInputRef}
        type="file"
        accept=".xlsx"
        style={{ display: 'none' }}
        onChange={(event) => void handleImportChange(event)}
      />

      {shouldShowTaskTabs ? (
        <Tabs
          activeKey={tabKey}
          onChange={(key) => {
            setTabKey(key as 'todo' | 'joined' | 'completed')
            setCurrentPage(1)
          }}
          items={[
            {
              key: 'todo',
              label: '我的待办',
            },
            {
              key: 'joined',
              label: '我相关',
            },
            {
              key: 'completed',
              label: '已完成',
            },
          ]}
          className="workspace-tabs"
        />
      ) : null}

      <Table
        rowKey="id"
        size="small"
        className="task-table"
        loading={tasksLoading}
        columns={columns}
        dataSource={displayTasks}
        pagination={{
          current: currentPage,
          locale: paginationZhCN,
          pageSize,
          pageSizeOptions: [10, 20, 50],
          showSizeChanger: true,
          total,
        }}
        onChange={handleTableChange}
        expandable={
          isMyTasksPage
            ? undefined
            : {
                expandedRowKeys,
                expandRowByClick: false,
                showExpandColumn: false,
                onExpand: (expanded, record) => {
                  void handleExpandTask(expanded, record.id, selectedVersionIds[record.id])
                },
                expandedRowRender: (record) => (
                  <TaskHistoryDetailPanel
                    detail={
                      taskDetails[
                        getTaskDetailCacheKey(record.id, selectedVersionIds[record.id])
                      ]
                    }
                    loading={loadingDetailId === record.id}
                    onUpdated={async () => {
                      await Promise.all([
                        refreshTaskDetail(record.id, selectedVersionIds[record.id]),
                        loadTasks(),
                      ])
                    }}
                    onCollapse={() => {
                      void handleExpandTask(false, record.id, selectedVersionIds[record.id])
                    }}
                  />
                ),
              }
        }
        scroll={{ x: Math.max(tableScrollX, 1320) }}
        locale={{
          emptyText: tasksLoading
            ? '任务加载中'
            : <Empty description="暂无任务数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
        }}
      />

      <Drawer
        title={editingTaskId ? '编辑任务' : '新建任务'}
        placement="right"
        size={560}
        open={drawerOpen}
        onClose={handleCloseDrawer}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => void handleFinish(values)}
        >
          <Row gutter={12}>
            <Col span={24}>
              <Form.Item
                label="关联工作流"
                name="workflowTemplateId"
                rules={[{ required: true, message: '请选择工作流模板' }]}
              >
                <Select
                  placeholder="请选择当前项目下的工作流模板"
                  loading={workflowLoading}
                  disabled={Boolean(editingTaskId)}
                  options={workflowTemplates.filter((ele)=>{return ele.order_type=='new'}).map((template) => ({
                    label: template.isDefault ? `${template.name}（默认）` : template.name,
                    value: template.id,
                  }))}
                />
              </Form.Item>
            </Col>
            {shouldShowTaskOwnerField ? (
              <Col span={24}>
                <Form.Item
                  label="任务所有者"
                  name="taskOwnerUserId"
                  rules={[{ required: true, message: '请选择任务所有者' }]}
                >
                  <Select
                    placeholder="请选择任务所有者"
                    loading={taskOwnerLoading}
                    disabled={Boolean(editingTaskId)}
                    options={taskOwnerMembers.map((member) => ({
                      label: `${member.userName} · ${member.userEmail}`,
                      value: member.userId,
                    }))}
                  />
                </Form.Item>
              </Col>
            ) : null}
            {shouldShowSecondStageAssigneeField && firstWorkflowStage ? (
              <Col span={24}>
                <Form.Item
                  label={firstWorkflowRoleName || '第一阶段执行人'}
                  name="secondStageAssigneeUserId"
                  rules={[{ required: true, message: '请选择第一阶段执行人' }]}
                >
                  <Select
                    placeholder={`请选择${firstWorkflowRoleName || '第一阶段执行人'}`}
                    loading={secondStageLoading}
                    disabled={Boolean(editingTaskId)}
                    options={secondStageMembers.map((member) => ({
                      label: `${member.userName}`,
                      value: member.userId,
                    }))}
                  />
                </Form.Item>
              </Col>
            ) : null}
            <Col span='12'>
              <Form.Item
                  label="任务名称"
                  name="title"
                  rules={[{ required: true, message: '请填写任务名称' }]}
                >
                  <Input type="text"  />
                </Form.Item>
            </Col>
            {/* {JSON.stringify(enabledFieldConfigs)} */}
            {enabledFieldConfigs.map((field) => (
              <Col span={field.span === 24 ? 24 : 12} key={field.field_key}>
                <Form.Item
                  label={field.field_name}
                  name={field.field_key}
                  rules={[
                    ...(field.required
                      ? [
                          {
                            required: true,
                            message:
                              `${field.field_type === 'select' ? '请选择' : '请输入'}${field.field_name}`,
                          },
                        ]
                      : []),
                    ...(isNotBeforeTodayField(field)
                      ? [{ validator: validateNotBeforeToday }]
                      : []),
                  ]}
                >
                  {renderFieldControl(field)}
                </Form.Item>
              </Col>
            ))}
          </Row>

          <div className="form-footer-actions">
            <Button onClick={handleCloseDrawer}>取消</Button>
            <Button type="primary" htmlType="submit" loading={mutating}>
              {editingTaskId ? '保存' : '创建任务'}
            </Button>
          </div>
        </Form>
      </Drawer>
      <TaskProcessModal
        open={Boolean(processingTaskId)}
        taskId={processingTaskId}
        onClose={handleCloseProcessModal}
        onProcessed={async () => {
          if (!processingTaskId) {
            await loadTasks()
            return
          }

          // 提交下一阶段后同时刷新列表和当前展开详情，避免展开区继续展示旧缓存。
          await Promise.all([loadTasks(), refreshTaskDetail(processingTaskId)])
        }}
      />
      <ServiceTicketDrawer
        open={serviceDrawerOpen}
        defaultType={serviceDrawerType}
        courseId={serviceDrawerTaskId}
        assigneeOptions={serviceDrawerType === '售后' ? serviceParticipantOptions : []}
        firstStageAssigneeLabel={serviceFirstStageAssigneeLabel}
        firstStageAssigneeOptions={serviceFirstStageAssigneeOptions}
        loading={mutating}
        onClose={handleCloseServiceDrawer}
        onWorkflowTemplateChange={loadServiceFirstStageAssigneeOptions}
        ownerOptions={serviceOwnerOptions}
        onSubmit={handleCreateServiceTask}
        showAssigneeField={serviceDrawerType === '售后'}
        workflowTemplateOptions={workflowTemplates
          .filter((template) =>
            serviceDrawerType === '售后'
              ? template.order_type === 'aftersales'
              : template.order_type === 'iteration',
          )
          .map((template) => ({
            label: template.name,
            value: template.id,
          }))}
      />
    </div>
  )
}
