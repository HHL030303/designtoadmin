import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Col,
  Radio,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { useAppState } from '../../context/AppStateContext'
import { adminService } from '../../services/adminService'
import { fileService } from '../../services/fileService'
import { taskService } from '../../services/taskService'
import type {
  AttachmentFile,
  FieldConfig,
  ProjectMemberRecord,
  TaskDetailRecord,
  TaskWorkflowFileRuleRecord,
  TaskWorkflowStageRecord,
} from '../../types'
import { AttachmentList } from '../common/AttachmentList'
import { ObjectStorageUploadField } from '../common/ObjectStorageUploadField'
import './TaskProcessModal.css'

type StageCompletionFormValues = {
  total_page_count?: number
  due_days?: number
  package_original_name?: string
  remark?: string
  nextStageUserId?: string
  nextStageAssignees?: Array<{
    assignedPageCount?: number
    userId?: string
  }>
  [key: string]: unknown
}

// 业务约定：创建任务时会把制作来源和制作人员写入 field_values。
// 当 productionSource 为“内部”且 menbers 有值时，表示下一阶段人员已在创建任务时预指派。
const INTERNAL_PRODUCTION_SOURCE_FIELD_KEY = 'productionSource'
const PREASSIGNED_MEMBERS_FIELD_KEY = 'menbers'
const INTERNAL_PRODUCTION_SOURCE_VALUE = '内部'
const EXTERNAL_PRODUCTION_SOURCE_VALUE = '外部'
const NEXT_STAGE_MEMBER_PAGE_SIZE = 100

// const taskStatusMeta: Record<string, { color: string; label: string }> = {
//   archived: { color: 'green', label: '已归档' },
//   assigned: { color: 'blue', label: '已指派' },
//   completed: { color: 'green', label: '已完成' },
//   in_progress: { color: 'processing', label: '进行中' },
//   page_in_progress: { color: 'cyan', label: '内页制作中' },
//   pending: { color: 'default', label: '待开始' },
//   submitted: { color: 'orange', label: '待处理' },
//   unpublished: { color: 'default', label: '未发布' },
// }

// function getStatusLabel(status: string) {
//   return taskStatusMeta[status]?.label ?? status
// }

// function getStatusColor(status: string) {
//   return taskStatusMeta[status]?.color ?? 'default'
// }

function getNextStageDisplayName(stage: TaskWorkflowStageRecord | undefined) {
  if (!stage) {
    return '当前已是最后节点'
  }

  return stage.operatorRoleCode
    ? `${stage.stageName}`
    : stage.stageName
}

// function isActionableStageStatus(status: string) {
//   return ['assigned', 'in_progress', 'page_in_progress', 'pending', 'submitted'].includes(status)
// }

function buildAssigneeText(stage: TaskWorkflowStageRecord) {
  if (stage.stageAssignees.length === 0) {
    return '未指派'
  }

  return stage.stageAssignees
    .map((assignee) => `${assignee.userName}${assignee.isPrimary  &&stage.stageAssignees.length>1? '（主）' : ''}`)
    .join('、')
}

// function getStageModeLabel(isLastStage: boolean) {
//   return isLastStage ? '最终校验' : '阶段流转'
// }

function resolveCurrentWorkflowStage(detail: TaskDetailRecord | null) {
  const currentStageId = detail?.currentStage?.id

  if (!detail || !currentStageId) {
    return detail?.currentStage ?? null
  }

  return detail.workflowStages.find((stage) => stage.id === currentStageId) ?? detail.currentStage ?? null
}

function resolveWorkflowStageById(
  detail: TaskDetailRecord | null,
  targetStageId?: string | null,
) {
  if (!detail) {
    return null
  }

  if (!targetStageId) {
    return resolveCurrentWorkflowStage(detail)
  }

  return detail.workflowStages.find((stage) => stage.id === targetStageId) ?? null
}

function isStageOverdue(stage: TaskWorkflowStageRecord | null) {
  if (!stage?.dueDate) {
    return false
  }

  return dayjs(stage.dueDate).endOf('day').isBefore(dayjs())
}

function buildDefaultNextStageAssignees() {
  return [
    {
      assignedPageCount: 0,
      userId: undefined,
    },
  ]
}

function hasPreassignedInternalNextStageAssignee(detail: TaskDetailRecord | null) {
  if (!detail) {
    return false
  }

  const productionSource = detail.fieldValues[INTERNAL_PRODUCTION_SOURCE_FIELD_KEY]
  const members = detail.fieldValues[PREASSIGNED_MEMBERS_FIELD_KEY]

  if (String(productionSource ?? '').trim() !== INTERNAL_PRODUCTION_SOURCE_VALUE) {
    return false
  }

  if (Array.isArray(members)) {
    return members.some((item) => String(item).trim() !== '')
  }

  return String(members ?? '').trim() !== ''
}

function isExternalProductionSource(detail: TaskDetailRecord | null) {
  if (!detail) {
    return false
  }

  return String(detail.fieldValues[INTERNAL_PRODUCTION_SOURCE_FIELD_KEY] ?? '').trim() === EXTERNAL_PRODUCTION_SOURCE_VALUE
}

function buildFirstStageAssignees(detail: TaskDetailRecord | null) {
  if (!detail || detail.workflowStages.length === 0) {
    return []
  }

  const firstStage = detail.workflowStages
    .slice()
    .sort((left, right) => left.sortValue - right.sortValue)[0]

  if (!firstStage) {
    return []
  }

  return firstStage.stageAssignees.map((assignee) => ({
    assigned_page_count: assignee.assignedPageCount,
    assignee_role: 'operator' as const,
    is_primary: assignee.isPrimary,
    user_id: Number(assignee.userId),
  }))
}

const OTHER_FILES_RULE_ID = '__other_files__'

function buildEmptyFilesByRuleId(fileRules: TaskWorkflowFileRuleRecord[]) {
  const filesByRuleId = fileRules.reduce<Record<string, AttachmentFile[]>>((accumulator, rule) => {
    accumulator[rule.id] = []
    return accumulator
  }, {})

  filesByRuleId[OTHER_FILES_RULE_ID] = []
  return filesByRuleId
}

function buildPackageNameTags(fieldValues: Record<string, unknown>): string[] {
  const tags: string[] = []

  Object.values(fieldValues).forEach((value) => {
    if (value === null || value === undefined || value === '') {
      return
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        const text = String(item).trim()
        if (
          text &&
          text.toLowerCase() !== 'true' &&
          text.toLowerCase() !== 'false' &&
          !tags.includes(text)
        ) {
          tags.push(text)
        }
      })
      return
    }

    if (typeof value === 'boolean') {
      return
    }

    const text = String(value).trim()
    if (
      text &&
      text.toLowerCase() !== 'true' &&
      text.toLowerCase() !== 'false' &&
      !tags.includes(text)
    ) {
      tags.push(text)
    }
  })

  return tags
}

function buildPackageFileName(tags: string[]): string {
  return tags.join('_')
}

const normalizeBooleanLike = (value: unknown): boolean | undefined => {
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

const getEnabledFieldConfigs = (fieldConfigs: FieldConfig[]) => {
  return [...fieldConfigs]
    .filter((field) => field.status === 'enabled')
    .sort((left, right) => left.sort_value - right.sort_value)
}

const buildTaskFieldInitialValues = (
  fieldConfigs: FieldConfig[],
  rawValues?: Record<string, unknown>,
) => {
  return fieldConfigs.reduce<Record<string, unknown>>((accumulator, field) => {
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
      accumulator[field.field_key] = normalizeBooleanLike(rawValue) ?? rawValue
      return accumulator
    }

    accumulator[field.field_key] = rawValue
    return accumulator
  }, {})
}

const serializeTaskFieldValue = (field: FieldConfig, value: unknown): unknown => {
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

const renderTaskFieldControl = (field: FieldConfig) => {
  const textPlaceholder = field.placeholder || `请输入${field.field_name}`
  const selectPlaceholder = field.placeholder || `请选择${field.field_name}`

  if (field.field_type === 'textarea'||field.field_type === 'text') {
    return <Input className="task-process-modal__field-control" placeholder={textPlaceholder} />
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
        className="full-width-control task-process-modal__field-control"
        placeholder={textPlaceholder}
      />
    )
  }

  if (field.field_type === 'date') {
    return (
      <DatePicker
        className="full-width-control task-process-modal__field-control"
        placeholder={selectPlaceholder}
      />
    )
  }

  return <Input className="task-process-modal__field-control" placeholder={textPlaceholder} />
}

function isAttachmentMatchedToRule(
  file: AttachmentFile,
  rule: TaskWorkflowFileRuleRecord,
) {
  const fileName = file.name.trim()
  const fileExt = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : ''
  const fileType = file.type?.trim().toLowerCase() ?? ''
  const ruleCategories = rule.fileCategory
    .split(/[,|，、\s]+/)
    .map((category) => category.trim().toLowerCase())
    .filter(Boolean)

  const extensionMatched =
    ruleCategories.length === 0 ||
    ruleCategories.some((category) => {
      const normalizedCategory = category.startsWith('.') ? category.slice(1) : category

      if (normalizedCategory.includes('/')) {
        return fileType === normalizedCategory || fileExt === normalizedCategory.split('/').pop()
      }

      return fileExt === normalizedCategory
    })

  if (!extensionMatched) {
    return false
  }

  if (!rule.filenamePattern) {
    return true
  }

  try {
    return new RegExp(rule.filenamePattern).test(fileName)
  } catch {
    return true
  }
}

function buildInitialFilesByRuleId(
  fileRules: TaskWorkflowFileRuleRecord[],
  files: AttachmentFile[],
  workflowStageId: string,
) {
  const currentStageFiles = files.filter((file) => file.workflowStageId === workflowStageId)
  const usedFileUids = new Set<string>()

  const filesByRuleId = fileRules.reduce<Record<string, AttachmentFile[]>>((accumulator, rule) => {
    const matchedFiles = currentStageFiles
      .filter((file) => !usedFileUids.has(file.uid) && isAttachmentMatchedToRule(file, rule))
      .slice(0, rule.requiredCount)

    matchedFiles.forEach((file) => usedFileUids.add(file.uid))
    accumulator[rule.id] = matchedFiles
    return accumulator
  }, {})

  const remainingFiles = currentStageFiles.filter((file) => !usedFileUids.has(file.uid))
  filesByRuleId[OTHER_FILES_RULE_ID] = remainingFiles

  return filesByRuleId
}

function flattenFilesByRuleId(filesByRuleId: Record<string, AttachmentFile[]>) {
  const seenFileUids = new Set<string>()
  const flattenedFiles: AttachmentFile[] = []

  Object.values(filesByRuleId).forEach((files) => {
    files.forEach((file) => {
      if (seenFileUids.has(file.uid)) {
        return
      }

      seenFileUids.add(file.uid)
      flattenedFiles.push(file)
    })
  })

  return flattenedFiles
}

function replaceStageFiles(
  allFiles: AttachmentFile[],
  workflowStageId: string,
  nextStageFiles: AttachmentFile[],
) {
  return [
    ...allFiles.filter((file) => file.workflowStageId !== workflowStageId),
    ...nextStageFiles,
  ]
}

function DynamicFileRuleSection({
  disabled,
  fileRules,
  filesByRuleId,
  beforeUpload,
  onFilesChange,
  onFileUploaded,
  onFileDeleted,
  taskId,
}: {
  disabled?: boolean
  fileRules: TaskWorkflowFileRuleRecord[]
  filesByRuleId: Record<string, AttachmentFile[]>
  beforeUpload: Parameters<typeof ObjectStorageUploadField>[0]['beforeUpload']
  onFilesChange: (ruleId: string, files: AttachmentFile[]) => void
  onFileUploaded: (file: AttachmentFile) => Promise<AttachmentFile>
  onFileDeleted: (file: AttachmentFile) => Promise<void>
  taskId?: string
}) {
  return (
    <Space direction="vertical" size={12} className="panel-stack-full">
      {fileRules.map((rule) => (
        <Card key={rule.id} type="inner" className="task-detail-action-card">
          <Space direction="vertical" size={8} className="panel-stack-full">
            <Space size={8} wrap>
              <Typography.Text strong>{rule.itemName}</Typography.Text>
              <Tag color={rule.required ? 'red' : 'default'}>
                {rule.required ? '必传' : '选传'}
              </Tag>
            </Space>
            <Typography.Text type="secondary">
              {rule.required
                ? `必传：示例：xxxxx-${rule.itemName}.${rule.fileCategory}。`
                : `选传：示例：xxxxx-${rule.itemName}.${rule.fileCategory}。`}
            </Typography.Text>
          </Space>
        </Card>
      ))}
      <Card key={OTHER_FILES_RULE_ID} type="inner" className="task-detail-action-card">
        <Space direction="vertical" size={8} className="panel-stack-full">
          <Space size={8} wrap>
            <Typography.Text strong>上传文件</Typography.Text>
            <Tag>支持上传文件和文件夹</Tag>
          </Space>
          <ObjectStorageUploadField
            value={flattenFilesByRuleId(filesByRuleId)}
            beforeUpload={beforeUpload}
            onChange={(files) => onFilesChange(OTHER_FILES_RULE_ID, files)}
            onUploaded={onFileUploaded}
            onDelete={onFileDeleted}
            taskId={taskId}
            compact
            disabled={disabled}
          />
        </Space>
      </Card>
    </Space>
  )
}

export function TaskProcessModal({
  onProcessed,
  onClose,
  open,
  taskId,
  targetStageId,
}: {
  onProcessed?: () => Promise<void> | void
  onClose: () => void
  open: boolean
  taskId?: string | null
  targetStageId?: string | null
}) {
  const { currentProject, currentUser, role } = useAppState()
  const [form] = Form.useForm<StageCompletionFormValues>()
  const [detail, setDetail] = useState<TaskDetailRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [nextStageLoading, setNextStageLoading] = useState(false)
  const [nextStageMembers, setNextStageMembers] = useState<ProjectMemberRecord[]>([])
  const [nextStageMemberPage, setNextStageMemberPage] = useState(1)
  const [nextStageMemberHasMore, setNextStageMemberHasMore] = useState(false)
  const [nextStageSearchValue, setNextStageSearchValue] = useState('')
  const [filesByRuleId, setFilesByRuleId] = useState<Record<string, AttachmentFile[]>>({})
  const [selectedPackageNameTags, setSelectedPackageNameTags] = useState<string[]>([])
  const [taskFieldConfigs, setTaskFieldConfigs] = useState<FieldConfig[]>([])
  const [taskFieldLoading, setTaskFieldLoading] = useState(false)
  const nextStageLoadingRef = useRef(false)
  const nextStageRequestIdRef = useRef(0)
  const nextStageSearchTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!open || !taskId) {
      setDetail(null)
      setFilesByRuleId({})
      setNextStageMembers([])
      setNextStageSearchValue('')
      setNextStageMemberPage(1)
      setNextStageMemberHasMore(false)
      setSelectedPackageNameTags([])
      form.resetFields()
      return
    }

    const activeTaskId = taskId

    async function loadDetail() {
      try {
        setLoading(true)
        const response = await taskService.getTaskDetail(activeTaskId)
        setDetail(response)
      } catch (error) {
        message.error(error instanceof Error ? error.message : '任务详情加载失败')
        setDetail(null)
      } finally {
        setLoading(false)
      }
    }

    void loadDetail()
  }, [form, open, taskId])

  const currentStage = useMemo(
    () => resolveWorkflowStageById(detail, targetStageId),
    [detail, targetStageId],
  )
  const isHistoricalStageEdit = Boolean(
    targetStageId &&
      currentStage &&
      currentStage.id !== detail?.currentStage?.id,
  )
  const nextStage = useMemo(
    () => {
      if (!detail || !currentStage) {
        return undefined
      }

      const currentStageIndex = detail.workflowStages.findIndex((stage) => stage.id === currentStage.id)
      return currentStageIndex >= 0 ? detail.workflowStages[currentStageIndex + 1] : undefined
    },
    [currentStage, detail],
  )
  const currentStageOverdue = isStageOverdue(currentStage)
  const currentStageFiles = useMemo(
    () => (detail && currentStage ? detail.files.filter((file) => file.workflowStageId === currentStage.id) : []),
    [currentStage, detail],
  )
  const currentStageBelongsToUser = Boolean(
    currentStage &&
      currentUser?.id &&
      currentStage.stageAssignees.some((assignee) => assignee.userId === currentUser.id),
  )
  const canEditHistoricalStage = role === 'admin' || role === 'planner'
  const isLastStage = Boolean(currentStage && !nextStage)
  const shouldShowHistoryFilesUpload = Boolean(isLastStage && detail && detail.files.length > 0)
  const canProcessCurrentStage = Boolean(
    currentStage &&
      (isHistoricalStageEdit ? canEditHistoricalStage : currentStageBelongsToUser),
  )
  const shouldSelectNextStageAssignee = Boolean(
    canProcessCurrentStage &&
      !isHistoricalStageEdit &&
      currentStage?.canAssign &&
      nextStage,
  )
  const hasPreassignedNextStageAssignee = useMemo(
    () => hasPreassignedInternalNextStageAssignee(detail),
    [detail],
  )
  const isExternalProduction = useMemo(
    () => isExternalProductionSource(detail),
    [detail],
  )
  const allowPageAssignment = Boolean(
    shouldSelectNextStageAssignee &&
      currentStage?.allowPageAssignment,
  )
  const shouldCollectTotalPageCount = Boolean(
    !isHistoricalStageEdit && currentStage?.collectTotalPageCount,
  )
  const packageNameTags = useMemo(
    () => (detail ? buildPackageNameTags(detail.fieldValues) : []),
    [detail],
  )
  const enabledTaskFieldConfigs = useMemo(
    () => getEnabledFieldConfigs(taskFieldConfigs),
    [taskFieldConfigs],
  )
  const shouldLoadTaskFields = Boolean(isLastStage && currentStage?.canUpdateFields)
  const shouldBackfillTaskFields = Boolean(
    isLastStage && !isHistoricalStageEdit && currentStage?.canUpdateFields,
  )
  const shouldShowPackageNameSection = Boolean(isLastStage && !currentStage?.canUpdateFields)

  const loadNextStageMembers = useCallback(
    async (targetPage: number, append: boolean, searchKeyword: string) => {
      const projectId = currentProject?.id ?? ''
      const nextRoleCode = nextStage?.operatorRoleCode ?? ''
      const requestId = nextStageRequestIdRef.current + 1
      nextStageRequestIdRef.current = requestId

      if (
        !shouldSelectNextStageAssignee ||
        !projectId ||
        !nextRoleCode ||
        (append && nextStageLoadingRef.current)
      ) {
        return
      }

      try {
        nextStageLoadingRef.current = true
        setNextStageLoading(true)
        const response = await adminService.listProjectRoleUsers({
          keyword: searchKeyword.trim() || undefined,
          page: targetPage,
          pageSize: NEXT_STAGE_MEMBER_PAGE_SIZE,
          projectId,
          roleCode: nextRoleCode,
        })

        if (requestId !== nextStageRequestIdRef.current) {
          return
        }

        setNextStageMembers((current) => {
          if (!append) {
            return response.items
          }

          const existingMemberIds = new Set(current.map((member) => member.userId))
          const nextItems = response.items.filter((member) => !existingMemberIds.has(member.userId))
          return [...current, ...nextItems]
        })
        setNextStageMemberPage(response.page)
        setNextStageMemberHasMore(response.page * response.pageSize < response.total)
      } catch (error) {
        if (requestId !== nextStageRequestIdRef.current) {
          return
        }

        message.error(error instanceof Error ? error.message : '下一节点成员加载失败')

        if (!append) {
          setNextStageMembers([])
          setNextStageMemberPage(1)
          setNextStageMemberHasMore(false)
        }
      } finally {
        if (requestId === nextStageRequestIdRef.current) {
          nextStageLoadingRef.current = false
          setNextStageLoading(false)
        }
      }
    },
    [currentProject?.id, nextStage?.operatorRoleCode, shouldSelectNextStageAssignee],
  )

  useEffect(() => () => {
    if (nextStageSearchTimerRef.current) {
      window.clearTimeout(nextStageSearchTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const projectId = currentProject?.id

    if (!open || !projectId || !shouldLoadTaskFields) {
      setTaskFieldConfigs([])
      setTaskFieldLoading(false)
      return
    }

    const safeProjectId = projectId

    async function loadTaskFields() {
      try {
        setTaskFieldLoading(true)
        const response = await adminService.listTaskFields(safeProjectId)
        setTaskFieldConfigs(response)
      } catch (error) {
        message.error(error instanceof Error ? error.message : '任务字段加载失败')
        setTaskFieldConfigs([])
      } finally {
        setTaskFieldLoading(false)
      }
    }

    void loadTaskFields()
  }, [currentProject?.id, open, shouldLoadTaskFields])

  useEffect(() => {
    if (!detail || !currentStage) {
      setFilesByRuleId({})
      return
    }

    setFilesByRuleId(
      currentStage.fileRules.length > 0
        ? buildInitialFilesByRuleId(currentStage.fileRules, detail.files, currentStage.id)
        : buildEmptyFilesByRuleId(currentStage.fileRules),
    )
    form.resetFields()
    form.setFieldsValue({
      total_page_count: undefined,
      due_days: currentStage.dueDays,
      package_original_name: '',
      nextStageAssignees: buildDefaultNextStageAssignees(),
    })
  }, [currentStage, detail, form])

  useEffect(() => {
    if (!open || !shouldShowPackageNameSection) {
      setSelectedPackageNameTags([])
      form.setFieldValue('package_original_name', '')
      return
    }

    setSelectedPackageNameTags([])
    form.setFieldValue('package_original_name', '')
  }, [form, open, shouldShowPackageNameSection])

  useEffect(() => {
    if (!open || !detail || enabledTaskFieldConfigs.length === 0 || !shouldBackfillTaskFields) {
      return
    }

    // 最后阶段的字段编辑必须以详情接口返回的 field_values 为准回填。
    form.setFieldsValue(
      buildTaskFieldInitialValues(enabledTaskFieldConfigs, detail.fieldValues) as StageCompletionFormValues,
    )
  }, [detail, enabledTaskFieldConfigs, form, open, shouldBackfillTaskFields])

  useEffect(() => {
    const projectId = currentProject?.id ?? ''
    const nextRoleCode = nextStage?.operatorRoleCode ?? ''

    if (!shouldSelectNextStageAssignee || !projectId || !nextRoleCode) {
      setNextStageMembers([])
      setNextStageSearchValue('')
      setNextStageMemberPage(1)
      setNextStageMemberHasMore(false)
      return
    }

    form.setFieldValue('nextStageUserId', undefined)
    if (allowPageAssignment) {
      form.setFieldValue('nextStageAssignees', buildDefaultNextStageAssignees())
    }

    void loadNextStageMembers(1, false, '')
  }, [
    allowPageAssignment,
    currentProject?.id,
    form,
    loadNextStageMembers,
    nextStage?.operatorRoleCode,
    shouldSelectNextStageAssignee,
  ])

  const handleBeforeFileUpload = async ({
    checksum,
    file,
    originalPath,
  }: {
    checksum: string
    file: File
    originalPath?: string
  }) => {
    if (!detail || !currentStage) {
      throw new Error('任务阶段信息缺失，暂时无法校验重复文件')
    }

    const duplicateResult = await fileService.checkFileDuplicate({
      checksum,
      original_name: file.name,
      original_path: originalPath,
      task_id: Number(detail.task.id),
      version_id: Number(detail.currentVersion.id),
    })

    if (duplicateResult.checksum_exists) {
      const existingFile = duplicateResult.checksum_file

      if (!existingFile?.file_path) {
        throw new Error('查重命中已上传文件，但接口未返回可复用的文件路径')
      }

      // 命中相同 checksum 时直接复用已上传文件，避免重复占用对象存储空间。
      message.info(`文件“${file.name}”已上传过，本次将直接登记，不再重复上传`)

      return {
        file: {
          filePath: existingFile.file_path,
          fileUrl: existingFile.file_url ?? existingFile.file_path,
          storageKey: existingFile.file_path,
        },
        mode: 'register_only' as const,
      }
    }

    if (!duplicateResult.same_name_exists) {
      return { mode: 'upload' as const }
    }

    const shouldContinueUpload = await new Promise<boolean>((resolve) => {
      Modal.confirm({
        cancelText: '取消',
        content: `当前已存在重名文件“${file.name}”，继续上传将会覆盖，是否继续？`,
        okText: '继续上传',
        onCancel: () => resolve(false),
        onOk: () => resolve(true),
        title: '发现重名文件',
      })
    })

    return shouldContinueUpload
      ? {
          mode: 'upload' as const,
          replaceDisplay: {
            fileRecordId:
              duplicateResult.same_name_file?.id !== undefined && duplicateResult.same_name_file?.id !== null
                ? String(duplicateResult.same_name_file.id)
                : undefined,
            name: duplicateResult.same_name_file?.original_name ?? file.name,
            originalPath: duplicateResult.same_name_file?.original_path ?? originalPath,
          },
        }
      : { mode: 'abort' as const }
  }

  async function handleFileUploaded(file: AttachmentFile) {
    if (!detail || !currentStage || !file.checksum) {
      throw new Error('文件缺少登记所需信息')
    }

    const created = await fileService.createFileRecord({
      checksum: file.checksum,
      file_ext: file.fileExt || '',
      file_path: file.storageKey || file.url || '',
      original_name: file.name,
      original_path: file.originalPath,
      size_bytes: file.size ?? 0,
      task_id: Number(detail.task.id),
      version_id: Number(detail.currentVersion.id),
      workflow_stage_id: Number(currentStage.id),
    })

    return {
      ...file,
      fileRecordId: created?.file?.id !== undefined && created?.file?.id !== null ? String(created?.file?.id) : undefined,
      versionId: detail.currentVersion.id,
      workflowStageId: currentStage.id,
    }
  }

  async function handleFileDeleted(file: AttachmentFile) {
    if (!detail || !file.fileRecordId) {
      return
    }

    await fileService.deleteFileRecord(
      file.fileRecordId,
      Number(file.versionId ?? detail.currentVersion.id),
    )
  }

  function syncTaskFiles(nextFiles: AttachmentFile[]) {
    setDetail((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        files: nextFiles,
      }
    })
  }

  function syncCurrentStageFiles(nextStageFiles: AttachmentFile[]) {
    console.error(nextStageFiles,'nextStageFiles')
    if (!detail || !currentStage) {
      return
    }

    // 当前阶段上传区和最后一步的历史整理区都需要共享同一份 files 状态，
    // 否则用户删除重复文件后，弹窗里其它文件视图还会残留旧数据。
    const nextFiles = replaceStageFiles(detail.files, currentStage.id, nextStageFiles)
    syncTaskFiles(nextFiles)
    setFilesByRuleId(buildInitialFilesByRuleId(currentStage.fileRules, nextFiles, currentStage.id))
  }

  async function handleSubmit(values: StageCompletionFormValues) {
    if (!detail || !currentStage) {
      return
    }

    // const invalidRule = currentStage.fileRules.find((rule) => {
    //   if (!rule.required) {
    //     return false
    //   }

    //   return (filesByRuleId[rule.id] ?? []).length < rule.requiredCount
    // })

    // if (invalidRule) {
    //   message.warning(`请先按要求上传 ${invalidRule.itemName}`)
    //   return
    // }
    
    let nextStageAssignments:
      Array<{
        assigned_page_count?: number
        assignee_role: 'operator'
        is_primary: boolean
        user_id: number
      }> = []

    if (nextStage) {
      if (hasPreassignedNextStageAssignee) {
        // 业务约定：productionSource 为“内部”且 menbers 有值时，
        // 相关阶段责任人已在创建任务时预指派，这一步提交时显式传空数组即可。
        nextStageAssignments = []
      } else if (currentStage.canAssign) {
        if (isHistoricalStageEdit) {
          nextStageAssignments = nextStage.stageAssignees.map((assignee) => ({
            assigned_page_count: assignee.assignedPageCount,
            assignee_role: 'operator' as const,
            is_primary: assignee.isPrimary,
            user_id: Number(assignee.userId),
          }))
        } else if (allowPageAssignment) {
          nextStageAssignments = (values.nextStageAssignees ?? [])
            .filter((item) => item?.userId)
            .map((item, index) => ({
              assigned_page_count: Number(item.assignedPageCount ?? 0),
              assignee_role: 'operator' as const,
              is_primary: index === 0,
              user_id: Number(item.userId),
            }))
        } else if (values.nextStageUserId) {
          nextStageAssignments = [
            {
              assignee_role: 'operator' as const,
              is_primary: true,
              user_id: Number(values.nextStageUserId),
            },
          ]
        }
      } else if (isExternalProduction) {
        // 业务约定：productionSource 为“外部”时，默认回退到流程首节点人员，
        // 不再沿用“任务所有者接手下一阶段”的旧默认值。
        nextStageAssignments = buildFirstStageAssignees(detail)
      } else if (detail.task.ownerId) {
        nextStageAssignments = [
          {
            assignee_role: 'operator' as const,
            is_primary: true,
            user_id: Number(detail.task.ownerId),
          },
        ]
      }
    }

    if (
      !isHistoricalStageEdit &&
      nextStage &&
      !hasPreassignedNextStageAssignee &&
      nextStageAssignments.length === 0
    ) {
      message.warning(
        currentStage.canAssign
          ? '请选择下一节点人员'
          : '当前任务未配置任务所有者，无法自动指定下一节点人员',
      )
      return
    }

    if (allowPageAssignment) {
      const invalidPageAssignment = (values.nextStageAssignees ?? []).find(
        (item) =>
          !item?.userId ||
          item.assignedPageCount === undefined ||
          item.assignedPageCount == 0||
          item.assignedPageCount === null,
      )

      if (invalidPageAssignment) {
        message.warning('请完整填写下一阶段任务人员和分配页数')
        return
      }
      // if((values.nextStageAssignees as any)?.length>0){
      //   const totalpage = (values.nextStageAssignees as any).reduce((pre:any,next:any)=>{
      //     return pre + next?.assignedPageCount
      //   },0)
      //   if(totalpage>detail.currentVersion?.totalPageCount){
      //    return message.error(`总页数不能大于预定的${detail.currentVersion?.totalPageCount}页`)
      //   }
      // }
    }

    if (shouldCollectTotalPageCount && typeof values.total_page_count !== 'number') {
      message.warning('请填写总页数')
      return
    }

    if (shouldBackfillTaskFields && taskFieldLoading) {
      message.warning('任务字段仍在加载，请稍后再提交')
      return
    }

    try {
      setSubmitting(true)

      if (isLastStage) {
        await fileService.checkFileCompleteness({
          taskId: Number(detail.task.id),
          versionId: Number(detail.currentVersion.id),
        })
      }

      if (shouldBackfillTaskFields) {
        // 最后阶段开启 can_update_fields 时，需要先把任务字段通过任务编辑接口提交完成。
        const nextFieldValues = enabledTaskFieldConfigs.reduce<Record<string, unknown>>(
          (accumulator, field) => {
            const serializedValue = serializeTaskFieldValue(field, values[field.field_key])

            if (serializedValue !== undefined) {
              accumulator[field.field_key] = serializedValue
            }

            return accumulator
          },
          { ...detail.fieldValues },
        )

        await taskService.updateTask(detail.task.id, {
          expect_complete_at:
            typeof nextFieldValues.finalDueDate === 'string'
              ? nextFieldValues.finalDueDate
              : detail.currentVersion.expectCompleteAt,
          field_values: nextFieldValues,
          title: detail.task.title,
        })
      }

      await taskService.completeWorkflowStage(currentStage.id, {
        remark: values.remark?.trim() || undefined,
        package_original_name:values?.package_original_name?.trim()||undefined,
        next_stage_assignees: nextStageAssignments,
        due_days:
          !isHistoricalStageEdit && nextStage && typeof values.due_days === 'number'
            ? values.due_days
            : undefined,
        total_page_count: !isHistoricalStageEdit ? values.total_page_count : undefined,
      })

      message.success(
        isHistoricalStageEdit
          ? '历史阶段修改已保存'
          : isLastStage
            ? '文件校验通过，当前阶段已完成'
            : '当前阶段已提交',
      )
      await onProcessed?.()
      onClose()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '阶段提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={isHistoricalStageEdit ? '编辑已完成阶段(可修改上传文件）' : '处理任务'}
      open={open}
      onCancel={onClose}
      footer={null}
      width={920}
      height={600}
      className="task-process-modal"
      destroyOnClose
    >
      {loading ? (
        <div className="table-expanded-panel">
          <Spin />
        </div>
      ) : !detail || !currentStage ? (
        <Empty description="暂无可处理的任务详情" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : !canProcessCurrentStage ? (
        <Empty
          description={
            isHistoricalStageEdit
              ? '当前账号无权编辑该已完成阶段'
              : '当前账号不是该节点执行人，无法处理此任务'
          }
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <Space direction="vertical" size={12} className="panel-stack-full task-process-modal__body">
          <Card
            className="task-process-modal__hero"
            title={(
              <Space size={10} align="center" wrap>
                <span>{detail.task.title}</span>
                {currentStageOverdue ? (
                  <Tag className="task-process-modal__overdue-tag" bordered={false}>
                    已超期
                  </Tag>
                ) : null}
              </Space>
            )}
            extra={
              <Space size={8}>
                {/* <Tag color={isLastStage ? 'gold' : 'blue'}>{getStageModeLabel(isLastStage)}</Tag> */}
                {/* <Tag color={getStatusColor(detail.task.status)}>{getStatusLabel(detail.task.status)}</Tag> */}
              </Space>
            }
          >
            <Typography.Paragraph type="secondary" className="task-process-modal__hero-copy">
              {isHistoricalStageEdit
                ? '你正在编辑一个已完成阶段，可重新维护该阶段文件和备注，不会改变当前任务所处阶段。'
                : isLastStage
                ? '这是流程最后一个处理节点，提交时会先检查文件完整性，再完成当前任务阶段。'
                : '请根据当前节点的流程配置完成文件上传、下一节点指派和提交流转。'}
            </Typography.Paragraph>
            <Descriptions column={{ xs: 1, md: 2 }} size="small" className="panel-descriptions">
              <Descriptions.Item label="当前节点"><Tag color={isLastStage ? 'gold' : 'blue'}>{currentStage.stageName}</Tag></Descriptions.Item>
              <Descriptions.Item label="执行人">{buildAssigneeText(currentStage)}</Descriptions.Item>
              <Descriptions.Item label="当前版本">{detail.currentVersion.versionNo}</Descriptions.Item>
              <Descriptions.Item label="预计交付">
                {detail.currentVersion.expectCompleteAt || '未填写'}
              </Descriptions.Item>
              <Descriptions.Item label="下一节点">
                {getNextStageDisplayName(nextStage)}
              </Descriptions.Item>
              <Descriptions.Item label="截止时间">{currentStage.dueDate || '未配置'}</Descriptions.Item>
              {
                detail.currentVersion?.totalPageCount && <Descriptions.Item label="总页数">{detail.currentVersion?.totalPageCount }</Descriptions.Item>
              }
             
            </Descriptions>
          </Card>

          {currentStage.fileRules.length > 0 ? (
            <div className="task-detail-section task-process-modal__section">
              {/* <div className="task-process-modal__section-head">
                <Typography.Text strong>按流程规则上传文件</Typography.Text>
                <Tag bordered={false} color="processing">
                  {`${currentStage.fileRules.length} 项规则`}
                </Tag>
              </div> */}
            
              <DynamicFileRuleSection
                beforeUpload={handleBeforeFileUpload}
                fileRules={currentStage.fileRules}
                filesByRuleId={filesByRuleId}
                onFileUploaded={handleFileUploaded}
                onFileDeleted={handleFileDeleted}
                taskId={detail.currentVersion.id ? String(detail.currentVersion.id) : undefined}
                onFilesChange={(_, files) => syncCurrentStageFiles(files)}
                disabled={submitting}
              />
            </div>
          ) : currentStageFiles.length > 0 ? (
            <div className="task-detail-section task-process-modal__section">
              <div className="task-process-modal__section-head">
                <Typography.Text strong>阶段已上传文件</Typography.Text>
                <Tag bordered={false}>{`${currentStageFiles.length} 个文件`}</Tag>
              </div>
              <AttachmentList
                files={currentStageFiles}
                compact
                emptyText="暂无阶段文件"
                groupFolders
              />
            </div>
          ) : null}

          {shouldShowHistoryFilesUpload ? (
            <div className="task-detail-section task-process-modal__section">
              <div className="task-process-modal__section-head">
                <Typography.Text strong>历史文件整理</Typography.Text>
                <Tag bordered={false}>{`${detail.files.length} 个文件`}</Tag>
              </div>
              <Typography.Paragraph type="secondary">
                最后一步入库前，可在这里查看当前任务已上传的全部历史文件，并删除重复文件。
              </Typography.Paragraph>
              <ObjectStorageUploadField
                value={detail.files}
                beforeUpload={handleBeforeFileUpload}
                onUploaded={async (file) => {
                  const createdFile = await handleFileUploaded(file)
                  syncTaskFiles([...detail.files, createdFile])
                  setFilesByRuleId(
                    buildInitialFilesByRuleId(
                      currentStage.fileRules,
                      [...detail.files, createdFile],
                      currentStage.id,
                    ),
                  )
                  return createdFile
                }}
                onDelete={handleFileDeleted}
                onChange={(files) => {
                  syncTaskFiles(files)
                  setFilesByRuleId(
                    buildInitialFilesByRuleId(currentStage.fileRules, files, currentStage.id),
                  )
                }}
                taskId={detail.currentVersion.id ? String(detail.currentVersion.id) : undefined}
                disabled={submitting}
                compact
              />
            </div>
          ) : null}

          {!canProcessCurrentStage ? (
            <Card type="inner" className="task-detail-action-card task-process-modal__action">
              <Typography.Text type="secondary">
                当前节点暂无可处理权限。
              </Typography.Text>
            </Card>
          ) : (
            <Card type="inner" className="task-detail-action-card task-process-modal__action">
              <Space direction="vertical" size={6} className="panel-stack-full">
                {/* <div className="task-process-modal__section-head">
                  <Typography.Text strong>阶段提交流转</Typography.Text>
                  <Tag bordered={false} color={isLastStage ? 'gold' : 'blue'}>
                    {isLastStage ? '校验后完成' : '提交并流转'}
                  </Tag>
                </div>
                <div className="task-process-modal__notice">
                  <Typography.Text type="secondary">
                    {isLastStage
                      ? '提交前会先执行文件完整性校验，校验通过后完成当前最后阶段。'
                      : '提交后会按当前节点配置，把任务流转到下一阶段并指定执行人。'}
                  </Typography.Text>
                </div> */}
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={(values) => void handleSubmit(values)}
                >
                  {shouldShowPackageNameSection ? (
                    <div className="task-process-modal__package-panel">
                      <div className="task-process-modal__package-head">
                        <Typography.Text strong>请为打包文件命名，从下列选项中选出。</Typography.Text>
                        <Tag bordered={false} color="gold">
                          {`${packageNameTags.length} 个可用标签`}
                        </Tag>
                      </div>
                      <div className="task-process-modal__package-tags">
                        {packageNameTags.map((tag) => {
                          const checked = selectedPackageNameTags.includes(tag)

                          return (
                            <Tag
                              key={tag}
                              className={
                                checked
                                  ? 'task-process-modal__package-tag task-process-modal__package-tag--active'
                                  : 'task-process-modal__package-tag'
                              }
                              bordered={false}
                              onClick={() => {
                                const nextTags = checked
                                  ? selectedPackageNameTags.filter((item) => item !== tag)
                                  : [...selectedPackageNameTags, tag]

                                setSelectedPackageNameTags(nextTags)
                                form.setFieldValue('package_original_name', buildPackageFileName(nextTags))
                              }}
                            >
                              {tag}
                            </Tag>
                          )
                        })}
                      </div>
                      <Form.Item
                        label="打包文件名"
                        name="package_original_name"
                      >
                        <Input
                          className="task-process-modal__field-control"
                          placeholder="可点击上方标签自动拼接，也可以直接修改文件名"
                          onChange={(event) => {
                            form.setFieldValue('package_original_name', event.target.value)
                          }}
                        />
                      </Form.Item>
                    </div>
                  ) : null}
                  {shouldBackfillTaskFields ? (
                    <div className="task-process-modal__task-fields-panel">
                      <div className="task-process-modal__task-fields-head">
                        <div className="task-process-modal__task-fields-title-block">
                          <Typography.Text strong>任务字段回填</Typography.Text>
                          <Typography.Text type="secondary">
                            将以当前详情接口返回的字段值为基础进行回填和编辑。
                          </Typography.Text>
                        </div>
                        <div className="task-process-modal__task-fields-metas">
                          <Tag bordered={false} color="processing">
                            {`${enabledTaskFieldConfigs.length} 个字段`}
                          </Tag>
                          <span className="task-process-modal__task-fields-badge">
                            完成阶段前自动保存
                          </span>
                        </div>
                      </div>
                      <div className="task-process-modal__task-fields-notice">
                        <Typography.Paragraph type="secondary">
                        当前阶段开启了允许编辑字段，完成最后阶段前会按详情接口返回的字段值回填，
                        并在提交时同步调用任务编辑接口保存这些字段。
                        </Typography.Paragraph>
                      </div>
                      {taskFieldLoading ? (
                        <div className="table-expanded-panel task-process-modal__task-fields-loading">
                          <Spin size="small" />
                        </div>
                      ) : (
                        <div className="task-process-modal__task-fields-form-shell">
                          <Row gutter={[12, 4]}>
                          {enabledTaskFieldConfigs.map((field) => (
                            <Col span={field.span === 24 ? 24 : 12} key={field.field_key}>
                              <div className="task-process-modal__task-fields-item">
                                <Form.Item
                                  label={(
                                    <span className="task-process-modal__task-fields-label">
                                      <span>{field.field_name}</span>
                                      {field.required ? (
                                        <span className="task-process-modal__task-fields-required">必填</span>
                                      ) : (
                                        <span className="task-process-modal__task-fields-optional">选填</span>
                                      )}
                                    </span>
                                  )}
                                  name={field.field_key}
                                  rules={[
                                    ...(field.required
                                      ? [{
                                          required: true,
                                          message:
                                            `${field.field_type === 'select' ? '请选择' : '请输入'}${field.field_name}`,
                                        }]
                                      : []),
                                  ]}
                                >
                                  {renderTaskFieldControl(field)}
                                </Form.Item>
                              </div>
                            </Col>
                          ))}
                          </Row>
                        </div>
                      )}
                    </div>
                  ) : null}
                  {!isHistoricalStageEdit && currentStage.canAssign && nextStage ? (
                    allowPageAssignment ? (
                      <Form.List name="nextStageAssignees">
                        {(fields, { add, remove }) => (
                          <div className="task-process-modal__assignee-panel">
                           
                             <Row gutter={12} align="middle">
                             <Col span={1}></Col>
                             <Col span={8}>下一阶段任务人员</Col>
                             <Col span={8}>分配页数</Col>
                             <Col span={2}>操作</Col>
                             </Row>

                            {fields.map((field, index) => (
                              <div
                                key={field.key}
                                className="task-process-modal__assignee-row"
                              >
                                <Row gutter={12} align="middle">
                                  <Col span={1}>
                                    <div className="task-process-modal__assignee-identity">
                                      {index === 0 ? (
                                        <Tag
                                          bordered={false}
                                          color="blue"
                                          className="task-process-modal__assignee-role-tag"
                                        >
                                          主
                                        </Tag>
                                      ) : null}
                                    </div>
                                  </Col>
                                  <Col span={8}>
                                    <Form.Item
                                      {...field}
                                      name={[field.name, 'userId']}
                                      rules={[{ required: true, message: '请选择任务人员' }]}
                                    >
                                      <Select
                                        showSearch
                                        allowClear
                                        filterOption={false}
                                        placeholder={index === 0 ? '请选择主执行人' : '请选择执行人'}
                                        loading={nextStageLoading}
                                        searchValue={nextStageSearchValue}
                                        options={nextStageMembers.map((member) => ({
                                          label: `${member.userName} · ${member.userEmail}`,
                                          value: member.userId,
                                        }))}
                                        onSearch={(value) => {
                                          setNextStageSearchValue(value)

                                          if (nextStageSearchTimerRef.current) {
                                            window.clearTimeout(nextStageSearchTimerRef.current)
                                          }

                                          nextStageSearchTimerRef.current = window.setTimeout(() => {
                                            void loadNextStageMembers(1, false, value)
                                          }, 300)
                                        }}
                                        onClear={() => {
                                          if (nextStageSearchTimerRef.current) {
                                            window.clearTimeout(nextStageSearchTimerRef.current)
                                          }

                                          setNextStageSearchValue('')
                                          void loadNextStageMembers(1, false, '')
                                        }}
                                        onPopupScroll={(event) => {
                                          const target = event.target as HTMLDivElement
                                          const reachedBottom =
                                            target.scrollTop + target.clientHeight >= target.scrollHeight - 8

                                          if (!reachedBottom || nextStageLoading || !nextStageMemberHasMore) {
                                            return
                                          }

                                          void loadNextStageMembers(nextStageMemberPage + 1, true, nextStageSearchValue)
                                        }}
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col span={8}>
                                    <Form.Item
                                      {...field}
                                      name={[field.name, 'assignedPageCount']}
                                      rules={[{ required: true, message: '请输入分配页数' }]}
                                    >
                                      <InputNumber
                                        min={1}
                                        precision={0}
                                        className="full-width-control"
                                        placeholder="请输入分配页数"
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col span={2}>
                                    <div className="task-process-modal__assignee-actions">
                                      {index === 0 ? (
                                        <Button
                                          type="text"
                                          className="task-process-modal__assignee-action-button"
                                          icon={<PlusOutlined />}
                                          onClick={() =>
                                            add({
                                              assignedPageCount: 0,
                                              userId: undefined,
                                            })
                                          }
                                        />
                                      ) : (
                                        <Button
                                          type="text"
                                          className="task-process-modal__assignee-action-button task-process-modal__assignee-action-button--danger"
                                          icon={<MinusCircleOutlined />}
                                          onClick={() => remove(field.name)}
                                        />
                                      )}
                                    </div>
                                  </Col>
                                </Row>
                              </div>
                            ))}
                          </div>
                        )}
                      </Form.List>
                    ) : (
                          <Form.Item
                            label="下一阶段任务人员"
                            name="nextStageUserId"
                            rules={[{ required: true, message: '请选择下一阶段任务人员' }]}
                          >
                            <Select
                              allowClear
                              showSearch
                              filterOption={false}
                              placeholder="请选择下一阶段任务人员"
                              loading={nextStageLoading}
                              searchValue={nextStageSearchValue}
                              options={nextStageMembers.map((member) => ({
                                label: `${member.userName} · ${member.userEmail}`,
                                value: member.userId,
                              }))}
                              onSearch={(value) => {
                                setNextStageSearchValue(value)

                                if (nextStageSearchTimerRef.current) {
                                  window.clearTimeout(nextStageSearchTimerRef.current)
                                }

                                nextStageSearchTimerRef.current = window.setTimeout(() => {
                                  void loadNextStageMembers(1, false, value)
                                }, 300)
                              }}
                              onClear={() => {
                                if (nextStageSearchTimerRef.current) {
                                  window.clearTimeout(nextStageSearchTimerRef.current)
                                }

                                setNextStageSearchValue('')
                                void loadNextStageMembers(1, false, '')
                              }}
                              onPopupScroll={(event) => {
                                const target = event.target as HTMLDivElement
                                const reachedBottom =
                                  target.scrollTop + target.clientHeight >= target.scrollHeight - 8

                                if (!reachedBottom || nextStageLoading || !nextStageMemberHasMore) {
                                  return
                                }

                                void loadNextStageMembers(nextStageMemberPage + 1, true, nextStageSearchValue)
                              }}
                            />
                          </Form.Item>
                    )
                  ) : null}
                  <div className="task-process-modal__dual-field-row">
                    {!isHistoricalStageEdit && nextStage && currentStage.allowCustomDueDays ? (
                      <Form.Item
                        className="task-process-modal__dual-field-item"
                        label={`预期完成天数`}
                        name="due_days"
                        rules={[
                          { required: true, message: '请输入预期完成天数' },
                        ]}
                      >
                        <InputNumber
                          className="full-width-control task-process-modal__field-control"
                          min={1}
                          precision={0}
                          placeholder="请输入预期完成天数"
                        />
                      </Form.Item>
                    ) : null}
                    {/* {!isHistoricalStageEdit && nextStage && detail.currentVersion?.totalPageCount ? (
                      <Form.Item
                        className="task-process-modal__dual-field-item"
                        label='总页数'
                      >
                        <InputNumber
                          disabled
                          value={detail.currentVersion?.totalPageCount}
                          className="full-width-control task-process-modal__field-control"
                          min={1}
                          precision={0}
                          placeholder="请输入预期完成天数"
                        />
                      </Form.Item>
                    ) : null} */}
                    {/* <Form.Item
                      className="task-process-modal__dual-field-item"
                      label="备注"
                      name="remark"
                    >
                      <Input.TextArea
                        className="task-process-modal__field-control task-process-modal__remark-input"
                        placeholder={isHistoricalStageEdit ? '可选填写本次阶段修改说明' : '可选填写阶段备注，如上一阶段已完成'}
                        rows={3}
                      />
                    </Form.Item> */}
                  </div>
                  {shouldCollectTotalPageCount ? (
                          <Col span={12}>
                            {/* 当前节点要求采集总页数时，将总页数写入 next_stage_assignees 的 assigned_page_count。 */}
                            <Form.Item
                              label="总页数"
                              name="total_page_count"
                              rules={[{ required: true, message: '请输入总页数' }]}
                            >
                              <InputNumber
                                min={0}
                                precision={0}
                                className="full-width-control"
                                placeholder="请输入总页数"
                              />
                            </Form.Item>
                          </Col>
                        ) : null}
                    {
                      !isHistoricalStageEdit && 
                      <div className="task-process-modal__footer">
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={submitting}
                        disabled={!canProcessCurrentStage || (shouldBackfillTaskFields && taskFieldLoading)}
                      >
                        {isHistoricalStageEdit
                          ? '保存阶段修改'
                          : isLastStage
                            ? '完成当前阶段'
                            : '提交到下一阶段'}
                      </Button>
                    </div>
                    }
            
                </Form>
              </Space>
            </Card>
          )}
        </Space>
      )}
    </Modal>
  )
}
