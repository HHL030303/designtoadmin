import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Col,
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
}

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

function DynamicFileRuleSection({
  disabled,
  fileRules,
  filesByRuleId,
  onFilesChange,
  onFileUploaded,
  onFileDeleted,
  taskId,
}: {
  disabled?: boolean
  fileRules: TaskWorkflowFileRuleRecord[]
  filesByRuleId: Record<string, AttachmentFile[]>
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
  const [filesByRuleId, setFilesByRuleId] = useState<Record<string, AttachmentFile[]>>({})
  const [selectedPackageNameTags, setSelectedPackageNameTags] = useState<string[]>([])

  useEffect(() => {
    if (!open || !taskId) {
      setDetail(null)
      setFilesByRuleId({})
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
    if (!open || !isLastStage) {
      setSelectedPackageNameTags([])
      form.setFieldValue('package_original_name', '')
      return
    }

    setSelectedPackageNameTags(packageNameTags)
    form.setFieldValue('package_original_name', buildPackageFileName(packageNameTags))
  }, [form, isLastStage, open, packageNameTags])

  useEffect(() => {
    const projectId = currentProject?.id ?? ''
    const nextRoleCode = nextStage?.operatorRoleCode ?? ''

    if (!shouldSelectNextStageAssignee || !projectId || !nextRoleCode) {
      setNextStageMembers([])
      return
    }

    form.setFieldValue('nextStageUserId', undefined)
    if (allowPageAssignment) {
      form.setFieldValue('nextStageAssignees', buildDefaultNextStageAssignees())
    }

    async function loadNextStageMembers() {
      try {
        setNextStageLoading(true)
        const response = await adminService.listProjectRoleUsers({
          page: 1,
          pageSize: 100,
          projectId,
          roleCode: nextRoleCode,
        })
        setNextStageMembers(response.items)
      } catch (error) {
        message.error(error instanceof Error ? error.message : '下一节点成员加载失败')
        setNextStageMembers([])
      } finally {
        setNextStageLoading(false)
      }
    }

    void loadNextStageMembers()
  }, [
    allowPageAssignment,
    currentProject?.id,
    form,
    nextStage?.operatorRoleCode,
    shouldCollectTotalPageCount,
    shouldSelectNextStageAssignee,
  ])

  async function handleFileUploaded(file: AttachmentFile) {
    if (!detail || !currentStage || !file.checksum) {
      throw new Error('文件缺少登记所需信息')
    }

    const created = await fileService.createFileRecord({
      checksum: file.checksum,
      file_ext: file.fileExt || '',
      file_path: file.url || '',
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
      workflowStageId: currentStage.id,
    }
  }

  async function handleFileDeleted(file: AttachmentFile) {
    if (!file.fileRecordId) {
      return
    }

    await fileService.deleteFileRecord(file.fileRecordId)
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

    const nextStageAssignments = nextStage
      ? currentStage.canAssign
        ? isHistoricalStageEdit
          ? nextStage.stageAssignees.map((assignee) => ({
              assigned_page_count: assignee.assignedPageCount,
              assignee_role: 'operator' as const,
              is_primary: assignee.isPrimary,
              user_id: Number(assignee.userId),
            }))
          : allowPageAssignment
          ? (values.nextStageAssignees ?? [])
              .filter((item) => item?.userId)
              .map((item, index) => ({
                assigned_page_count: Number(item.assignedPageCount ?? 0),
                assignee_role: 'operator' as const,
                is_primary: index === 0,
                user_id: Number(item.userId),
              }))
          : values.nextStageUserId
            ? [
                {
                  assignee_role: 'operator' as const,
                  is_primary: true,
                  user_id: Number(values.nextStageUserId),
                },
              ]
            : []
        : detail.task.ownerId
          ? [
              {
                assignee_role: 'operator' as const,
                is_primary: true,
                user_id: Number(detail.task.ownerId),
              },
            ]
          : []
      : []

    if (!isHistoricalStageEdit && nextStage && nextStageAssignments.length === 0) {
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
    try {
      setSubmitting(true)

      if (isLastStage) {
        await fileService.checkFileCompleteness({
          taskId: Number(detail.task.id),
          versionId: Number(detail.currentVersion.id),
        })
      }

      await taskService.completeWorkflowStage(currentStage.id, {
        remark: values.remark?.trim() || undefined,
        // package_original_name:values?.package_original_name?.trim()||undefined,
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
                fileRules={currentStage.fileRules}
                filesByRuleId={filesByRuleId}
                onFileUploaded={handleFileUploaded}
                onFileDeleted={handleFileDeleted}
                taskId={detail.currentVersion.id ? String(detail.currentVersion.id) : undefined}
                onFilesChange={(_, files) =>
                  setFilesByRuleId(buildInitialFilesByRuleId(currentStage.fileRules, files, currentStage.id))
                }
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
                  {isLastStage ? (
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
                                        placeholder={index === 0 ? '请选择主执行人' : '请选择执行人'}
                                        loading={nextStageLoading}
                                        options={nextStageMembers.map((member) => ({
                                          label: `${member.userName} · ${member.userEmail}`,
                                          value: member.userId,
                                        }))}
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
                                        min={0}
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
                              placeholder="请选择下一阶段任务人员"
                              loading={nextStageLoading}
                              options={nextStageMembers.map((member) => ({
                                label: `${member.userName} · ${member.userEmail}`,
                                value: member.userId,
                              }))}
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
                    <Form.Item
                      className="task-process-modal__dual-field-item"
                      label="备注"
                      name="remark"
                    >
                      <Input.TextArea
                        className="task-process-modal__field-control task-process-modal__remark-input"
                        placeholder={isHistoricalStageEdit ? '可选填写本次阶段修改说明' : '可选填写阶段备注，如上一阶段已完成'}
                        rows={3}
                      />
                    </Form.Item>
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
                        disabled={!canProcessCurrentStage}
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
