import { useCallback, useDeferredValue, useEffect, useRef, useState } from 'react'
import {
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Popconfirm,
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
import { RightOutlined } from '@ant-design/icons'
import {
  courseFormOptions,
  createCourseFormInitialValues,
} from '../constants/courseForm'
import { useAppState } from '../context/AppStateContext'
import { adminService } from '../services/adminService'
import { taskService } from '../services/taskService'
import {
  downloadCourseImportTemplate,
  parseCourseImportFile,
} from '../utils/courseImport'
import { TaskProcessModal } from '../components/course/TaskProcessModal'
import { TaskHistoryDetailPanel } from '../components/course/TaskHistoryDetailPanel'
import './CoursesPage.css'
import type {
  CreateCoursePayload,
  FieldConfig,
  FieldOptionConfig,
  ProjectMemberRecord,
  TaskDetailRecord,
  TaskListRecord,
  UserRole,
  WorkflowTemplateRecord,
} from '../types'

type TaskFormValue = string | number | boolean | Dayjs | null | undefined
type TaskFormValues = Record<string, TaskFormValue>

const taskStatusMeta: Record<string, { color: string; label: string }> = {
  archived: { color: 'green', label: '已归档' },
  in_progress: { color: 'processing', label: '进行中' },
  page_in_progress: { color: 'cyan', label: '内页制作中' },
  pending: { color: 'default', label: '待开始' },
}

const DEFAULT_TASK_STATUS_META = { color: 'default', label: '未知状态' }
const notBeforeTodayFieldKeys = new Set(['researchDueDate', 'finalDueDate'])

function getTaskStatusMeta(status: string) {
  return taskStatusMeta[status] ?? {
    ...DEFAULT_TASK_STATUS_META,
    label: status || DEFAULT_TASK_STATUS_META.label,
  }
}

function buildSelectOptions(values: readonly string[]): FieldOptionConfig[] {
  return values.map((value, index) => ({
    label: value,
    sort_value: (index + 1) * 10,
    status: 'enabled',
    value,
  }))
}

function buildFallbackFieldConfigs(): FieldConfig[] {
  return [
    {
      default_value: createCourseFormInitialValues.series,
      field_key: 'series',
      field_name: '品牌',
      field_type: 'select',
      option_config: buildSelectOptions(courseFormOptions.series),
      required: true,
      searchable: true,
      sort_value: 10,
      span: 12,
      status: 'enabled',
    },
    {
      default_value: createCourseFormInitialValues.subject,
      field_key: 'subject',
      field_name: '学科',
      field_type: 'select',
      option_config: buildSelectOptions(courseFormOptions.subject),
      required: true,
      searchable: true,
      sort_value: 20,
      span: 12,
      status: 'enabled',
    },
    {
      default_value: createCourseFormInitialValues.educationStage,
      field_key: 'educationStage',
      field_name: '学段',
      field_type: 'select',
      option_config: buildSelectOptions(courseFormOptions.educationStage),
      required: true,
      searchable: true,
      sort_value: 30,
      span: 12,
      status: 'enabled',
    },
    {
      default_value: createCourseFormInitialValues.grade,
      field_key: 'grade',
      field_name: '年级',
      field_type: 'select',
      option_config: buildSelectOptions(courseFormOptions.grade),
      required: true,
      searchable: true,
      sort_value: 40,
      span: 12,
      status: 'enabled',
    },
    {
      default_value: createCourseFormInitialValues.volume,
      field_key: 'volume',
      field_name: '分册',
      field_type: 'select',
      option_config: buildSelectOptions(courseFormOptions.volume),
      required: true,
      searchable: true,
      sort_value: 50,
      span: 12,
      status: 'enabled',
    },
    {
      default_value: createCourseFormInitialValues.textbook,
      field_key: 'textbook',
      field_name: '教材版本',
      field_type: 'select',
      option_config: buildSelectOptions(courseFormOptions.textbook),
      required: true,
      searchable: true,
      sort_value: 60,
      span: 12,
      status: 'enabled',
    },
    {
      default_value: createCourseFormInitialValues.researchOwner,
      field_key: 'researchOwner',
      field_name: '制作老师',
      field_type: 'select',
      option_config: buildSelectOptions(courseFormOptions.researchOwner),
      required: true,
      searchable: true,
      sort_value: 70,
      span: 12,
      status: 'enabled',
    },
    {
      field_key: 'chapterName',
      field_name: '单元/章节',
      field_type: 'text',
      placeholder: '请输入单元或章节',
      required: false,
      searchable: true,
      sort_value: 80,
      span: 12,
      status: 'enabled',
    },
    {
      field_key: 'title',
      field_name: '课件名称',
      field_type: 'text',
      placeholder: '请输入课件名称',
      required: true,
      searchable: true,
      sort_value: 90,
      span: 24,
      status: 'enabled',
    },
    {
      default_value: createCourseFormInitialValues.orderType,
      field_key: 'orderType',
      field_name: '订单类型',
      field_type: 'select',
      option_config: buildSelectOptions(courseFormOptions.orderType),
      required: true,
      searchable: true,
      sort_value: 100,
      span: 12,
      status: 'enabled',
    },
    {
      default_value: createCourseFormInitialValues.isBEnd,
      field_key: 'isBEnd',
      field_name: '是否B端',
      field_type: 'boolean',
      option_config: buildSelectOptions(courseFormOptions.isBEnd),
      required: true,
      searchable: true,
      sort_value: 110,
      span: 12,
      status: 'enabled',
    },
    {
      default_value: createCourseFormInitialValues.hasLessonPlan,
      field_key: 'hasLessonPlan',
      field_name: '教案',
      field_type: 'boolean',
      option_config: buildSelectOptions(courseFormOptions.hasLessonPlan),
      required: true,
      searchable: true,
      sort_value: 120,
      span: 12,
      status: 'enabled',
    },
    {
      default_value: createCourseFormInitialValues.hasScript,
      field_key: 'hasScript',
      field_name: '逐字稿',
      field_type: 'boolean',
      option_config: buildSelectOptions(courseFormOptions.hasScript),
      required: false,
      searchable: true,
      sort_value: 130,
      span: 12,
      status: 'enabled',
    },
    {
      default_value: createCourseFormInitialValues.artCopyright,
      field_key: 'artCopyright',
      field_name: '版权登记（美术）',
      field_type: 'boolean',
      option_config: buildSelectOptions(courseFormOptions.artCopyright),
      required: true,
      searchable: true,
      sort_value: 140,
      span: 12,
      status: 'enabled',
    },
    {
      default_value: createCourseFormInitialValues.textCopyright,
      field_key: 'textCopyright',
      field_name: '版权登记（文字）',
      field_type: 'boolean',
      option_config: buildSelectOptions(courseFormOptions.textCopyright),
      required: true,
      searchable: true,
      sort_value: 150,
      span: 12,
      status: 'enabled',
    },
    {
      default_value: createCourseFormInitialValues.researchDueDate.format('YYYY-MM-DD'),
      field_key: 'researchDueDate',
      field_name: '老师预期交稿时间',
      field_type: 'date',
      required: true,
      searchable: true,
      sort_value: 160,
      span: 12,
      status: 'enabled',
    },
    {
      default_value: createCourseFormInitialValues.finalDueDate.format('YYYY-MM-DD'),
      field_key: 'finalDueDate',
      field_name: '课件预期交付日期',
      field_type: 'date',
      required: true,
      searchable: true,
      sort_value: 170,
      span: 12,
      status: 'enabled',
    },
  ]
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

function isTaskDone(task: TaskListRecord) {
  return task.status === 'archived' || Boolean(task.archivedAt)
}

function isTaskOverdue(task: TaskListRecord) {
  if (isTaskDone(task) || !task.currentVersion.expectCompleteAt) {
    return false
  }

  return dayjs(task.currentVersion.expectCompleteAt).endOf('day').isBefore(dayjs())
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

function resolveTaskStatusQuery(
  tabKey: 'todo' | 'done' | 'overdue',
  statusFilter: string,
) {
  if (tabKey === 'done') {
    return 'archived'
  }

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

export function CoursesPage({ mode = 'default' }: { mode?: 'default' | 'myTasks' }) {
  const { currentProject, canCreateCourse, currentUser, role } = useAppState()
  const isMyTasksPage = mode === 'myTasks'
  const [tasks, setTasks] = useState<TaskListRecord[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [mutating, setMutating] = useState(false)
  const [search] = useState('')
  const [statusFilter] = useState('all')
  const [tabKey, setTabKey] = useState<'todo' | 'done' | 'overdue'>('todo')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [processingTaskId, setProcessingTaskId] = useState<string | null>(null)
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([])
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null)
  const [taskDetails, setTaskDetails] = useState<Record<string, TaskDetailRecord>>({})
  const [taskFieldConfigs, setTaskFieldConfigs] = useState<FieldConfig[]>(buildFallbackFieldConfigs())
  const [fieldConfigLoading, setFieldConfigLoading] = useState(false)
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplateRecord[]>([])
  const [workflowLoading, setWorkflowLoading] = useState(false)
  const [taskOwnerMembers, setTaskOwnerMembers] = useState<ProjectMemberRecord[]>([])
  const [taskOwnerLoading, setTaskOwnerLoading] = useState(false)
  const [secondStageMembers, setSecondStageMembers] = useState<ProjectMemberRecord[]>([])
  const [secondStageLoading, setSecondStageLoading] = useState(false)
  const deferredSearch = useDeferredValue(search)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const listRequestIdRef = useRef(0)
  const [form] = Form.useForm<TaskFormValues>()
  const selectedWorkflowTemplateId = Form.useWatch('workflowTemplateId', form)
  const canManageTaskActions = !isMyTasksPage && (role === 'planner' || role === 'admin')

  const loadTasks = useCallback(
    async (
      overrides?: Partial<{
        currentPage: number
        keyword: string
        pageSize: number
        statusFilter: string
        tabKey: 'todo' | 'done' | 'overdue'
      }>,
    ) => {
      const nextPage = overrides?.currentPage ?? currentPage
      const nextPageSize = overrides?.pageSize ?? pageSize
      const nextKeyword = overrides?.keyword ?? deferredSearch
      const nextStatusFilter = overrides?.statusFilter ?? statusFilter
      const nextTabKey = overrides?.tabKey ?? tabKey
      const requestId = listRequestIdRef.current + 1
      listRequestIdRef.current = requestId

      try {
        setTasksLoading(true)
        const response = await taskService.listTasks({
          assigneeId: isMyTasksPage ? currentUser?.id : canManageTaskActions ? undefined : currentUser?.id,
          keyword: nextKeyword.trim() || undefined,
          mineScope:
            nextTabKey === 'todo' && (isMyTasksPage || !canManageTaskActions) ? 'todo' : undefined,
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
    [canManageTaskActions, currentPage, currentUser?.id, deferredSearch, pageSize, statusFilter, tabKey],
  )

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  useEffect(() => {
    const projectId = currentProject?.id ?? ''

    if (!projectId || !canManageTaskActions) {
      setTaskFieldConfigs(buildFallbackFieldConfigs())
      return
    }

    async function loadTaskFields() {
      try {
        setFieldConfigLoading(true)
        const fields = await adminService.listTaskFields(projectId)
        setTaskFieldConfigs(fields.length > 0 ? fields : buildFallbackFieldConfigs())
      } catch (error) {
        message.error(error instanceof Error ? error.message : '任务字段配置加载失败')
        setTaskFieldConfigs(buildFallbackFieldConfigs())
      } finally {
        setFieldConfigLoading(false)
      }
    }

    void loadTaskFields()
  }, [canManageTaskActions, currentProject?.id])

  useEffect(() => {
    const projectId = currentProject?.id ?? ''

    if (!projectId || !canManageTaskActions) {
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
  }, [canManageTaskActions, currentProject?.id])
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

    if (!editingTaskId) {
      form.setFieldValue('taskOwnerUserId', undefined)
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

    if (!editingTaskId) {
      form.setFieldValue('secondStageAssigneeUserId', undefined)
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

  const enabledFieldConfigs = getEnabledFieldConfigs(taskFieldConfigs)
  const filteredTasks = (() => {
    if (tabKey === 'done') {
      return tasks.filter(isTaskDone)
    }

    if (tabKey === 'overdue') {
      return tasks.filter(isTaskOverdue)
    }

    return tasks.filter((task) => !isTaskDone(task))
  })()

  // const statusOptions = Array.from(new Set(tasks.map((task) => task.status))).map((status) => ({
  //   label: getTaskStatusMeta(status).label,
  //   value: status,
  // }))

  function openCreateDrawer() {
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

  async function ensureTaskDetail(taskId: string) {
    if (taskDetails[taskId]) {
      return taskDetails[taskId]
    }

    const detail = await taskService.getTaskDetail(taskId)
    setTaskDetails((current) => ({ ...current, [taskId]: detail }))
    return detail
  }

  async function handleExpandTask(expanded: boolean, taskId: string) {
    if (expanded) {
      setExpandedRowKeys((current) => [...new Set([...current, taskId])])

      if (!taskDetails[taskId]) {
        try {
          setLoadingDetailId(taskId)
          await ensureTaskDetail(taskId)
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

  async function openEditDrawer(task: TaskListRecord) {
    try {
      const detail = await ensureTaskDetail(task.id)
      const workflowTemplateId = resolveWorkflowTemplateId(detail, workflowTemplates)
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

  async function refreshTaskDetail(taskId: string) {
    const detail = await taskService.getTaskDetail(taskId)
    setTaskDetails((current) => ({ ...current, [taskId]: detail }))
    return detail
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

  const baseColumns: ColumnsType<TaskListRecord> = [
    {
      title: '任务',
      dataIndex: 'title',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.title}</Typography.Text>
          <Typography.Text type="secondary">
            {record.id} · {String(record.fieldValues.series ?? '未配置品牌')}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: string, record) => {
        const displayLabel = record.currentStage?.stageName || getTaskStatusMeta(status).label
        const meta = getTaskStatusMeta(record.currentStage?.status || status)
        return <Tag color={meta.color}>{displayLabel}</Tag>
      },
      width: 140,
    },
    {
      title: '当前责任人',
      render: (_, record) => {
        const assigneeNames = record.currentStage?.assignees.map((assignee) => assignee.userName) ?? []
        return assigneeNames.length > 0 ? assigneeNames.join('/') : '-'
      },
      width: 160,
    },
    // {
    //   title: '关联子任务',
    //   render: (_, record) => {
    //     if (record.activeSubTasks.length === 0) {
    //       return <Typography.Text type="secondary">-</Typography.Text>
    //     }

    //     return (
    //       <Space direction="vertical" size={0}>
    //         {record.activeSubTasks.map((subTask) => (
    //           <Typography.Text key={subTask.id}>
    //             {subTask.subTaskType} · {subTask.description}
    //           </Typography.Text>
    //         ))}
    //       </Space>
    //     )
    //   },
    // },
    {
      title: '学科',
      render: (_, record) => String(record.fieldValues.subject ?? '-'),
      width: 100,
    },
    {
      title: '年级',
      render: (_, record) => String(record.fieldValues.grade ?? '-'),
      width: 100,
    },
    {
      title: '当前版本',
      render: (_, record) => record.currentVersion.versionNo,
      width: 100,
    },
    {
      title: '预计交付',
      render: (_, record) => (
        <Typography.Text type={isTaskOverdue(record) ? 'danger' : undefined}>
          {isTaskOverdue(record)
            ? `${record.currentVersion.expectCompleteAt || '-'}（已逾期）`
            : record.currentVersion.expectCompleteAt || '-'}
        </Typography.Text>
      ),
      width: 160,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
    },
  ]

  const columns: ColumnsType<TaskListRecord> = [
    ...baseColumns,
    {
      title: '操作',
      width: 180,
      render: (_, record) => {
        const canDeleteTask = canDeleteTaskRecord(record, currentUser?.id, role)
        const canProcessTask = Boolean(
          currentUser?.id &&
            record.currentStage?.assignees.some((assignee) => assignee.userId === currentUser.id),
        )

        return (
          <Space size="small">
            {canProcessTask ? (
              <Button
                danger
                size="small"
                onClick={() => {
                  setProcessingTaskId(record.id)
                }}
              >
                处理
              </Button>
            ) : null}
            {canManageTaskActions && !record.readonly ? (
              <Button
                type="primary"
                size="small"
                onClick={() => void openEditDrawer(record)}
              >
                编辑
              </Button>
            ) : null}
            {canManageTaskActions && canDeleteTask ? (
              <Popconfirm
                title="确认删除该任务吗？"
                description="删除后不可恢复，请谨慎操作。"
                okButtonProps={{ danger: true, loading: mutating }}
                onConfirm={() => void handleDeleteTask(record.id)}
              >
                <Button
                  danger
                  size="small"
                  loading={mutating}
                >
                  删除
                </Button>
              </Popconfirm>
            ) : null}
          </Space>
        )
      },
    },
  ]

  function handleTableChange(pagination: TablePaginationConfig) {
    const nextPage = pagination.current ?? 1
    const nextPageSize = pagination.pageSize ?? 10

    setCurrentPage(nextPage)
    setPageSize(nextPageSize)
  }

  return (
    <Card className="panel-card">
      <div className="workspace-header">
        <div className="workspace-header-main">
          <Typography.Title level={4} className="workspace-header-title">
            {isMyTasksPage ? '我的任务' : '任务工单'}
          </Typography.Title>
        </div>
        <div className="workspace-header-side">
          <div className="workspace-kpi">
            <span className="workspace-kpi-value">{total}</span>
            <span className="workspace-kpi-label">主单结果</span>
          </div>
          {canCreateCourse && canManageTaskActions ? (
            <Space>
              <Button onClick={() => void downloadCourseImportTemplate()}>
                下载模版
              </Button>
              <Button onClick={() => importInputRef.current?.click()} loading={mutating}>
                批量导入
              </Button>
              <Button
                type="primary"
                onClick={openCreateDrawer}
                loading={fieldConfigLoading || workflowLoading}
              >
                新建任务
              </Button>
            </Space>
          ) : null}
        </div>
      </div>

      <input
        ref={importInputRef}
        type="file"
        accept=".xlsx"
        style={{ display: 'none' }}
        onChange={(event) => void handleImportChange(event)}
      />

      {/* <div className="workspace-filter-bar">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setCurrentPage(1)
          }}
          placeholder="搜索任务名称 / 编号 / 学科 / 品牌"
          className="workspace-filter-input"
        />
        <Select
          value={statusFilter}
          className="workspace-filter-select"
          onChange={(value) => {
            setStatusFilter(value)
            setCurrentPage(1)
          }}
          options={[{ label: '全部状态', value: 'all' }, ...statusOptions]}
        />
      </div> */}

      <Tabs
        activeKey={tabKey}
        onChange={(key) => {
          setTabKey(key as 'todo' | 'done' | 'overdue')
          setCurrentPage(1)
        }}
        items={[
          {
            key: 'todo',
            label: '我的待办',
          },
          {
            key: 'done',
            label: '已完成',
          },
          {
            key: 'overdue',
            label: '已逾期',
          },
        ]}
        className="workspace-tabs"
      />

      <Table
        rowKey="id"
        size="small"
        className="task-table"
        loading={tasksLoading}
        columns={columns}
        dataSource={filteredTasks}
        pagination={{
          current: currentPage,
          pageSize,
          pageSizeOptions: [10, 20, 50],
          showSizeChanger: true,
          showTotal: (value) => `共 ${value} 条`,
          total,
        }}
        onChange={handleTableChange}
        expandable={
          isMyTasksPage
            ? undefined
            : {
                expandedRowKeys,
                expandRowByClick: false,
                onExpand: (expanded, record) => {
                  void handleExpandTask(expanded, record.id)
                },
                expandIcon: ({ expanded, onExpand, record }) => (
                  <button
                    type="button"
                    className={`task-table-expand-button${expanded ? ' task-table-expand-button--open' : ''}`}
                    onClick={(event) => {
                      onExpand(record, event)
                    }}
                    aria-label={expanded ? '收起任务详情' : '展开任务详情'}
                  >
                    <RightOutlined />
                  </button>
                ),
                expandedRowRender: (record) => (
                  <TaskHistoryDetailPanel
                    detail={taskDetails[record.id]}
                    loading={loadingDetailId === record.id}
                    onUpdated={async () => {
                      await Promise.all([refreshTaskDetail(record.id), loadTasks()])
                    }}
                  />
                ),
              }
        }
        scroll={{ x: 1320 }}
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
                  options={workflowTemplates.map((template) => ({
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

          <Space className="form-footer-actions">
            <Button onClick={handleCloseDrawer}>取消</Button>
            <Button type="primary" htmlType="submit" loading={mutating}>
              {editingTaskId ? '保存' : '创建任务'}
            </Button>
          </Space>
        </Form>
      </Drawer>
      <TaskProcessModal
        open={Boolean(processingTaskId)}
        taskId={processingTaskId}
        onClose={handleCloseProcessModal}
        onProcessed={async () => {
          await loadTasks()
        }}
      />
    </Card>
  )
}
