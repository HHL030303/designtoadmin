import { useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import {
  Button,
  Card,
  Descriptions,
  Dropdown,
  Empty,
  Form,
  InputNumber,
  Modal,
  Select,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd'
import type { MenuProps } from 'antd'
import { DownOutlined, EditOutlined } from '@ant-design/icons'
import { AttachmentList } from '../common/AttachmentList'
import { useAppState } from '../../context/AppStateContext'
import { adminService } from '../../services/adminService'
import { taskService } from '../../services/taskService'
import { TaskProcessModal } from './TaskProcessModal'
import type { FieldConfig, ProjectMemberRecord, TaskDetailRecord } from '../../types'
import { makeDemoDownload } from '../../utils/attachments'
import './TaskHistoryDetailPanel.css'

type CurrentAssigneeFormValues = {
  dueDays?: number
  userId?: string
}

const taskStatusMeta: Record<string, { color: string; label: string }> = {
  completed: { color: 'green', label: '已完成' },
  pending: { color: 'default', label: '待开始' },
}

function resolveCurrentWorkflowStage(detail: TaskDetailRecord) {
  const currentStageId = detail.currentStage?.id

  if (!currentStageId) {
    return detail.currentStage ?? null
  }

  return detail.workflowStages.find((stage) => stage.id === currentStageId) ?? detail.currentStage ?? null
}

function getStatusLabel(status: string) {
  return taskStatusMeta[status]?.label ?? status
}

function getStatusColor(status: string) {
  return taskStatusMeta[status]?.color ?? 'default'
}

function buildAssigneeText(detailStage: TaskDetailRecord['workflowStages'][number]) {
  if (detailStage.stageAssignees.length === 0) {
    return '未指派'
  }

  return detailStage.stageAssignees
    .map((assignee) =>
      `${assignee.userName}${
        detailStage.allowPageAssignment && assignee.isPrimary ? '（主）' : ''
      }`,
    )
    .join('、')
}

function isStageOverdue(completedAt?: string | null, dueDate?: string) {
  if (!dueDate) {
    return false
  }

  if (completedAt) {
    return dayjs(completedAt).isAfter(dayjs(dueDate), 'day')
  }

  return dayjs().isAfter(dayjs(dueDate), 'day')
}

function formatTaskFieldDisplayValue(value: unknown, field?: FieldConfig): string {
  if (value === null || value === undefined || value === '') {
    return '未填写'
  }

  if (field?.field_type === 'boolean') {
    if (typeof value === 'boolean') {
      return value ? '是' : '否'
    }

    const normalizedValue = String(value).trim().toLowerCase()
    if (['true', '1', 'yes', 'y', '是', '有'].includes(normalizedValue)) {
      return '是'
    }
    if (['false', '0', 'no', 'n', '否', '无'].includes(normalizedValue)) {
      return '否'
    }
  }

  if (field?.field_type === 'select') {
    const matchedOption = field.option_config?.find((option) => option.value === String(value))
    return matchedOption?.label ?? String(value)
  }

  if (field?.field_type === 'multi_select' && Array.isArray(value)) {
    return value.length > 0 ? value.map((item) => String(item)).join(' / ') : '未填写'
  }

  return String(value)
}

export function TaskHistoryDetailPanel({
  detail,
  loading,
  onCollapse,
  onSelectVersion,
  selectedVersionId,
  onUpdated,
}: {
  detail?: TaskDetailRecord
  loading?: boolean
  onCollapse?: () => void
  onSelectVersion?: (versionId: string) => void
  selectedVersionId?: string
  onUpdated?: () => Promise<void>
}) {
  const { currentProject, currentUser, role } = useAppState()
  const [currentAssigneeForm] = Form.useForm<CurrentAssigneeFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [stageEditOpen, setStageEditOpen] = useState(false)
  const [editingStageId, setEditingStageId] = useState<string | null>(null)
  const [candidateLoading, setCandidateLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [candidateMembers, setCandidateMembers] = useState<ProjectMemberRecord[]>([])
  const [taskFieldConfigs, setTaskFieldConfigs] = useState<FieldConfig[]>([])
  const [versionMenuOpen, setVersionMenuOpen] = useState(false)
  const versionMenuTriggerRef = useRef<HTMLButtonElement | null>(null)
  const projectId = currentProject?.id
  const detailForHooks = detail
  const selectedHistoryVersionId = selectedVersionId ?? detailForHooks?.currentVersion.id
  const versionHistory = useMemo(() => {
    if (!detailForHooks) {
      return []
    }

    const versions = detailForHooks.versionHistory.length > 0
      ? detailForHooks.versionHistory
      : [detailForHooks.currentVersion]

    const uniqueVersions = new Map<string, typeof versions[number]>()

    versions.forEach((version) => {
      if (!uniqueVersions.has(version.id)) {
        uniqueVersions.set(version.id, version)
      }
    })

    if (!uniqueVersions.has(detailForHooks.currentVersion.id)) {
      uniqueVersions.set(detailForHooks.currentVersion.id, detailForHooks.currentVersion)
    }

    return Array.from(uniqueVersions.values())
  }, [detailForHooks])
  const hasVersionHistory = versionHistory.length > 1
  const versionMenuItems = useMemo<MenuProps['items']>(
    () =>
      versionHistory.map((version) => ({
        key: version.id,
        label: version.versionNo,
      })),
    [versionHistory],
  )

  useEffect(() => {
    if (!projectId) {
      setTaskFieldConfigs([])
      return
    }

    const nextProjectId = projectId
    let cancelled = false

    async function loadTaskFieldConfigs(): Promise<void> {
      try {
        const fields = await adminService.listTaskFieldsnormal(nextProjectId)

        if (!cancelled) {
          setTaskFieldConfigs(fields)
        }
      } catch (error) {
        if (!cancelled) {
          message.error(error instanceof Error ? error.message : '任务字段加载失败')
          setTaskFieldConfigs([])
        }
      }
    }

    void loadTaskFieldConfigs()

    return () => {
      cancelled = true
    }
  }, [projectId])

  useEffect(() => {
    if (!hasVersionHistory) {
      setVersionMenuOpen(false)
    }
  }, [hasVersionHistory])

  if (loading) {
    return (
      <div className="table-expanded-panel">
        <Spin />
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="table-expanded-panel">
        <Empty description="暂无任务详情" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    )
  }

  const resolvedDetail = detail

  const completedStageCount = resolvedDetail.workflowStages.filter(
    (stage) => stage.status === 'completed' || stage.status === 'archived',
  ).length
  const currentWorkflowStage = resolveCurrentWorkflowStage(resolvedDetail)
  const currentWorkflowStageIndex = resolvedDetail.workflowStages.findIndex(
    (stage) => stage.id === currentWorkflowStage?.id,
  )
  const currentRoleCode = currentWorkflowStage?.operatorRoleCode ?? ''
  const currentPrimaryAssignee = currentWorkflowStage?.stageAssignees.find((assignee) => assignee.isPrimary)
    ?? currentWorkflowStage?.stageAssignees[0]
  // 只有当前 current_stage 的执行人就是当前登录账号时，才允许显示编辑入口。
  // const currentStageBelongsToUser = Boolean(
  //   currentWorkflowStage &&
  //     currentUser?.id &&
  //     currentWorkflowStage.stageAssignees.some((assignee) => assignee.userId === currentUser.id),
  // )
  // const currentStageBelongsToUser = Boolean(
  //   currentWorkflowStage &&
  //     currentUser?.id &&
  //     currentWorkflowStage?.assignedBy == currentUser.id,
  // )
  const canEditCurrentAssignee = Boolean(
      currentProject?.id &&
      currentWorkflowStage?.id &&
      currentRoleCode &&
      resolvedDetail.task.ownerId == currentUser?.id,
  )
  const canEditCompletedStage = role === 'admin' || role === 'planner'
  const taskFieldMap = new Map(taskFieldConfigs.map((field) => [field.field_key, field]))
  const taskDetailRows = Object.entries(resolvedDetail.fieldValues)
    .map(([fieldKey, value]) => {
      const field = taskFieldMap.get(fieldKey)

      return {
        key: fieldKey,
        label: field?.field_name ?? fieldKey,
        value: formatTaskFieldDisplayValue(value, field),
      }
    })
    .filter((item) => item.value !== '未填写')

  function renderVersionLabel() {
    if (!hasVersionHistory || !onSelectVersion) {
      return resolvedDetail.currentVersion.versionNo
    }

    return (
      <span className="task-history-panel__version">
        <span>{resolvedDetail.currentVersion.versionNo}</span>
        <Dropdown
          menu={{
            items: versionMenuItems,
            onClick: ({ key }) => {
              setVersionMenuOpen(false)
              onSelectVersion(String(key))
            },
            selectedKeys: selectedHistoryVersionId ? [selectedHistoryVersionId] : [],
          }}
          open={versionMenuOpen}
          onOpenChange={setVersionMenuOpen}
          trigger={['click']}
          placement="bottomLeft"
        >
          <Button
            ref={versionMenuTriggerRef}
            type="text"
            size="small"
            className="task-history-panel__version-trigger"
            aria-label="查看任务历史版本"
            icon={<DownOutlined />}
          />
        </Dropdown>
      </span>
    )
  }

  function handleOpenStageEdit(stageId: string) {
    setEditingStageId(stageId)
    setStageEditOpen(true)
  }

  function handleCloseStageEdit() {
    setStageEditOpen(false)
    setEditingStageId(null)
    void onUpdated?.()
  }

  async function handleOpenModal() {
    if (!currentProject?.id || !currentWorkflowStage?.id || !currentRoleCode) {
      message.warning('当前阶段缺少角色配置，暂时无法编辑责任人')
      return
    }

    currentAssigneeForm.setFieldsValue({
      dueDays: currentWorkflowStage.dueDays,
      userId: currentPrimaryAssignee?.userId,
    })
    setModalOpen(true)

    try {
      setCandidateLoading(true)
      const response = await adminService.listProjectRoleUsers({
        page: 1,
        pageSize: 100,
        projectId: currentProject.id,
        roleCode: currentRoleCode,
      })
      setCandidateMembers(response.items)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '责任人候选人加载失败')
      setCandidateMembers([])
    } finally {
      setCandidateLoading(false)
    }
  }

  function handleCloseModal() {
    setModalOpen(false)
    currentAssigneeForm.resetFields()
  }

  async function handleSubmit(values: CurrentAssigneeFormValues) {
    if (!currentWorkflowStage?.id || !values.userId || !values.dueDays) {
      return
    }

    try {
      setSubmitting(true)
      await taskService.assignWorkflowStage(currentWorkflowStage.id, {
        due_days: values.dueDays,
        assignees: [
          {
            user_id: Number(values.userId),
            assignee_role: 'operator',
            is_primary: true,
          },
        ],
      })
      message.success('当前责任人已更新')
      handleCloseModal()
      await onUpdated?.()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '当前责任人更新失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="table-expanded-panel">
      <Card className="task-history-panel">
        <div className="task-history-panel__header">
          <Tag bordered={false} color="processing" className="task-history-panel__count-tag">
            {resolvedDetail.files.length} 个文件
          </Tag>
          {onCollapse ? (
            <Button size="small" className="task-history-panel__collapse-button" onClick={onCollapse}>
              收起
            </Button>
          ) : null}
        </div>
        <Descriptions column={4} size="small" className="panel-descriptions">
          <Descriptions.Item label="任务标题">{resolvedDetail.task.title}</Descriptions.Item>
          {/* <Descriptions.Item label="任务负责人">{detail?.task?.owner_id}</Descriptions.Item> */}
          <Descriptions.Item label="当前版本">{renderVersionLabel()}</Descriptions.Item>
          
          <Descriptions.Item label="当前节点">
            {resolvedDetail.currentStage?.stageName ?? '暂无'}
          </Descriptions.Item>
          <Descriptions.Item label="当前责任人">
            <span className="task-history-panel__owner">
              <span className="task-history-panel__owner-text">
                {currentPrimaryAssignee?.userName ?? '未指派'}
              </span>
              {canEditCurrentAssignee ? (
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => void handleOpenModal()}
                />
              ) : null}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="历史文件数">{resolvedDetail.files.length}</Descriptions.Item>
          <Descriptions.Item label="当前截止日期">
            {currentWorkflowStage?.dueDate ?? '未配置'}
          </Descriptions.Item>
          <Descriptions.Item label="已完成节点数">{completedStageCount}</Descriptions.Item>
          {
            resolvedDetail.currentVersion.totalPageCount && <Descriptions.Item label="总页数">{resolvedDetail.currentVersion.totalPageCount}</Descriptions.Item>
          }
        
          <Descriptions.Item label="流程节点总数">{resolvedDetail.workflowStages.length}</Descriptions.Item>
          <Descriptions.Item label="打包文件">
            {resolvedDetail.packageInfo?.outputFile?.name ? (
              <Button
                type="link"
                size="small"
                className="task-history-panel__package-link"
                onClick={() => makeDemoDownload(resolvedDetail.packageInfo!.outputFile!)}
              >
                {resolvedDetail.packageInfo.outputFile.name}
              </Button>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="打包完成时间">
            {resolvedDetail.packageInfo?.completedAt ?? '-'}
          </Descriptions.Item>
          {resolvedDetail.packageInfo?.errorMessage ? (
            <Descriptions.Item label="打包失败原因" span={2}>
              <span className="task-history-panel__package-error">
                {resolvedDetail.packageInfo.errorMessage}
              </span>
            </Descriptions.Item>
          ) : null}
         {
          resolvedDetail.currentVersion?.description &&   <Descriptions.Item label="售后原因">
            {resolvedDetail.currentVersion?.description ?? '-'}
          </Descriptions.Item>
          }
          {
          resolvedDetail.currentVersion?.workflow_template &&   <Descriptions.Item label="关联流程">
            {resolvedDetail.currentVersion?.workflow_template?.name ?? '-'}
          </Descriptions.Item>
         }
       
        </Descriptions>
        {taskDetailRows.length > 0 ? (
          <>
            <Descriptions column={4} size="small" className="panel-descriptions">
              {taskDetailRows.map((item) => (
                <Descriptions.Item key={item.key} label={item.label}>
                  {item.value}
                </Descriptions.Item>
              ))}
            </Descriptions>
          </>
        ) : null}
        <div
          className="task-history-panel__workflow-grid"
          style={{
            gridTemplateColumns: `repeat(${Math.max(resolvedDetail.workflowStages.length, 1)}, minmax(0, 1fr))`,
          }}
        >
          {resolvedDetail.workflowStages.map((stage, index) => {
            const isActive = stage.id === currentWorkflowStage?.id
            const overdue = isStageOverdue(stage.completedAt, stage.dueDate)
            const canEditThisStage = Boolean(
              canEditCompletedStage &&
                resolvedDetail.task.status !== 'completed' &&
                currentWorkflowStageIndex > 0 &&
                index < currentWorkflowStageIndex &&
                (stage.status === 'completed' || stage.status === 'archived'),
            )

            return (
              <div
                key={stage.id}
                className={[
                  'task-history-panel__workflow-item',
                  isActive ? 'task-history-panel__workflow-item--active' : '',
                ].join(' ').trim()}
              >
                {overdue ? (
                  <Tag bordered={false} className="task-history-panel__workflow-overdue-tag">
                    逾期
                  </Tag>
                ) : null}
                <div className="task-history-panel__workflow-topbar" />
                <div className="task-history-panel__workflow-headline">
                  <span className="task-history-panel__workflow-index">{index + 1}</span>
                  <span className="task-history-panel__workflow-title">{stage.stageName}</span>
                  {canEditThisStage ? (
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      className="task-history-panel__workflow-edit-button"
                      onClick={() => handleOpenStageEdit(stage.id)}
                    />
                  ) : null}
                </div>
                <div className="task-history-panel__workflow-meta">
                  <Typography.Text type="secondary">
                    负责人：{buildAssigneeText(stage)}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    截止时间：{stage.dueDate || '未配置'}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    当前阶段预期天数：{stage.dueDays || '未配置'}
                  </Typography.Text>
                  <Tag color={getStatusColor(stage.status)} bordered={false}>
                    {isActive ? '当前进行中' : getStatusLabel(stage.status)}
                  </Tag>
                </div>
              </div>
            )
          })}
        </div>
        {resolvedDetail.files.length === 0 ? (
          <Empty
            className="task-history-panel__empty"
            description="暂无历史文件"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <AttachmentList files={resolvedDetail.files} groupFolders />
        )}
      </Card>
      <Modal
        title="编辑当前责任人"
        open={modalOpen}
        onCancel={handleCloseModal}
        onOk={() => void currentAssigneeForm.submit()}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form
          form={currentAssigneeForm}
          layout="vertical"
          onFinish={(values) => void handleSubmit(values)}
        >
          <Form.Item
            label="当前责任人"
            name="userId"
            rules={[{ required: true, message: '请选择当前责任人' }]}
          >
            <Select
              placeholder="请选择当前责任人"
              loading={candidateLoading}
              options={candidateMembers.map((member) => ({
                label: `${member.userName}`,
                value: member.userId,
              }))}
            />
          </Form.Item>
          <Form.Item
            label="预期完成天数"
            name="dueDays"
            rules={[{ required: true, message: '请输入预期完成天数' }]}
          >
            <InputNumber
              className="full-width-control"
              min={1}
              precision={0}
              placeholder="请输入预期完成天数"
            />
          </Form.Item>
        </Form>
      </Modal>
      <TaskProcessModal
        open={stageEditOpen}
        onClose={handleCloseStageEdit}
        onProcessed={onUpdated}
        taskId={resolvedDetail.task.id}
        targetStageId={editingStageId}
      />
    </div>
  )
}
