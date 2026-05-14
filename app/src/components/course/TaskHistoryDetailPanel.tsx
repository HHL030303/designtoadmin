import { useState } from 'react'
import dayjs from 'dayjs'
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd'
import { DownloadOutlined, EditOutlined, FileTextOutlined } from '@ant-design/icons'
import { useAppState } from '../../context/AppStateContext'
import { adminService } from '../../services/adminService'
import { taskService } from '../../services/taskService'
import type { ProjectMemberRecord, TaskDetailRecord } from '../../types'
import { makeDemoDownload } from '../../utils/attachments'
import './TaskHistoryDetailPanel.css'

type CurrentAssigneeFormValues = {
  dueDays?: number
  userId?: string
}

const taskStatusMeta: Record<string, { color: string; label: string }> = {
  archived: { color: 'green', label: '已归档' },
  assigned: { color: 'blue', label: '已指派' },
  completed: { color: 'green', label: '已完成' },
  in_progress: { color: 'processing', label: '进行中' },
  page_in_progress: { color: 'cyan', label: '内页制作中' },
  pending: { color: 'default', label: '待开始' },
  submitted: { color: 'orange', label: '待处理' },
  unpublished: { color: 'default', label: '未发布' },
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

function isStageOverdue(dueDate?: string) {
  if (!dueDate) {
    return false
  }

  return !dayjs(dueDate).isAfter(dayjs(), 'day')
}

export function TaskHistoryDetailPanel({
  detail,
  loading,
  onUpdated,
}: {
  detail?: TaskDetailRecord
  loading?: boolean
  onUpdated?: () => Promise<void>
}) {
  const { currentProject } = useAppState()
  const [currentAssigneeForm] = Form.useForm<CurrentAssigneeFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [candidateLoading, setCandidateLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [candidateMembers, setCandidateMembers] = useState<ProjectMemberRecord[]>([])

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

  const completedStageCount = detail.workflowStages.filter(
    (stage) => stage.status === 'completed' || stage.status === 'archived',
  ).length
  const currentWorkflowStage = resolveCurrentWorkflowStage(detail)
  const currentRoleCode = currentWorkflowStage?.operatorRoleCode ?? ''
  const currentPrimaryAssignee = currentWorkflowStage?.stageAssignees.find((assignee) => assignee.isPrimary)
    ?? currentWorkflowStage?.stageAssignees[0]
  const canEditCurrentAssignee = Boolean(currentProject?.id && currentWorkflowStage?.id && currentRoleCode)

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
        <div className="task-history-panel__head">
          <Tag bordered={false} color="processing">
            {detail.files.length} 个文件
          </Tag>
        </div>
        <Descriptions column={4} size="small" className="panel-descriptions">
          <Descriptions.Item label="任务标题">{detail.task.title}</Descriptions.Item>
          <Descriptions.Item label="当前版本">{detail.currentVersion.versionNo}</Descriptions.Item>
          <Descriptions.Item label="当前节点">
            {detail.currentStage?.stageName ?? '暂无'}
          </Descriptions.Item>
          <Descriptions.Item label="当前责任人">
            <Space size={6}>
              <Typography.Text className="task-history-panel__owner-text">
                {currentPrimaryAssignee?.userName ?? '未指派'}
              </Typography.Text>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => void handleOpenModal()}
                disabled={!canEditCurrentAssignee}
              />
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="历史文件数">{detail.files.length}</Descriptions.Item>
          <Descriptions.Item label="当前截止日期">
            {currentWorkflowStage?.dueDate ?? '未配置'}
          </Descriptions.Item>
          <Descriptions.Item label="已完成节点数">{completedStageCount}</Descriptions.Item>
          <Descriptions.Item label="流程节点总数">{detail.workflowStages.length}</Descriptions.Item>
        </Descriptions>
        <div className="task-history-panel__workflow">
          <div
            className="task-history-panel__workflow-grid"
            style={{
              gridTemplateColumns: `repeat(${Math.max(detail.workflowStages.length, 1)}, minmax(0, 1fr))`,
            }}
          >
            {detail.workflowStages.map((stage, index) => {
              const isActive = stage.id === currentWorkflowStage?.id
              const overdue = isStageOverdue(stage.dueDate)

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
                    <Typography.Text strong>{stage.stageName}</Typography.Text>
                  </div>
                  <Space
                    direction="vertical"
                    size={6}
                    className="task-history-panel__workflow-meta"
                  >
                    <Typography.Text type="secondary">
                      负责人：{buildAssigneeText(stage)}
                    </Typography.Text>
                    <Typography.Text type="secondary">
                      截止时间：{stage.dueDate || '未配置'}
                    </Typography.Text>
                    <Tag color={getStatusColor(stage.status)} bordered={false}>
                      {isActive ? '当前进行中' : getStatusLabel(stage.status)}
                    </Tag>
                  </Space>
                </div>
              )
            })}
          </div>
        </div>
        <div className="task-history-panel__files">
          {detail.files.length === 0 ? (
            <Empty description="暂无历史文件" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Space direction="vertical" size={12} className="task-history-panel__file-list">
              {detail.files.map((file) => (
                <div key={file.uid} className="task-history-panel__file-item">
                  <div className="task-history-panel__file-main">
                    <span className="task-history-panel__file-icon">
                      <FileTextOutlined />
                    </span>
                    <div className="task-history-panel__file-copy">
                      <Typography.Text strong ellipsis={{ tooltip: file.name }}>
                        {file.name}
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        {file.uploadedAt || '历史上传时间未记录'}
                      </Typography.Text>
                    </div>
                  </div>
                  <Button
                    type="default"
                    size="small"
                    icon={<DownloadOutlined />}
                    className="task-history-panel__download"
                    onClick={() => makeDemoDownload(file)}
                  >
                    下载
                  </Button>
                </div>
              ))}
            </Space>
          )}
        </div>
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
    </div>
  )
}
