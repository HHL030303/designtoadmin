import { useCallback, useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { Button, Card, Empty, Space, Table, Tabs, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { TablePaginationConfig } from 'antd/es/table'
import { TableExpandTrigger } from '../components/common/TableExpandTrigger'
import { ServiceTicketDrawer } from '../components/course/ServiceTicketDrawer'
import { TaskHistoryDetailPanel } from '../components/course/TaskHistoryDetailPanel'
import { useAppState } from '../context/AppStateContext'
import type {
  FieldOptionConfig,
  ServiceType,
  TaskDetailRecord,
  TaskVersionRecord,
  WorkflowTemplateRecord,
} from '../types'
import type {
  ServiceSubTaskListItemResponse,
  ServiceSubTaskListResponse,
  ServiceSubTaskRecord,
} from '../types/service'
import { apiRequest } from '../services/apiClient'
import { adminService } from '../services/adminService'
import { taskService } from '../services/taskService'

const serviceTypeQueryMap: Record<ServiceType, 'aftersales' | 'iteration'> = {
  售后: 'aftersales',
  迭代: 'iteration',
}

const taskStatusMeta: Record<string, { color: string; label: string }> = {
  archived: { color: 'green', label: '已归档' },
  completed: { color: 'green', label: '已完成' },
  in_progress: { color: 'processing', label: '进行中' },
  page_in_progress: { color: 'cyan', label: '内页制作中' },
  pending: { color: 'default', label: '待开始' },
  submitted: { color: 'orange', label: '待处理' },
}

const DEFAULT_TASK_STATUS_META = { color: 'default', label: '未知状态' }

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

function normalizeServiceType(value?: string | null): ServiceType {
  return value === '迭代' || value === 'iteration' ? '迭代' : '售后'
}

// 统一版本字段，避免列表和详情各自处理后端返回结构。
function mapVersion(
  version?: ServiceSubTaskListItemResponse['current_version'] | null,
): TaskVersionRecord {
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

function mapCurrentStage(
  stage?: ServiceSubTaskListItemResponse['current_stage'] | null,
) {
  if (!stage?.id) {
    return null
  }

  return {
    assignees: (stage.assignees ?? []).map((assignee) => ({
      userId: String(assignee.user_id),
      userName: assignee.user_name ?? `用户 ${assignee.user_id}`,
    })),
    id: String(stage.id),
    stageName: stage.stage_name ?? '未命名节点',
    status: stage.status ?? 'pending',
  }
}

// 售后与迭代列表里的责任人走子任务自己的 responsible_users 字段。
function mapResponsibleUsers(
  users?: ServiceSubTaskListItemResponse['responsible_users'],
) {
  return (users ?? []).map((user) => ({
    userId:
      user.user_id !== undefined && user.user_id !== null
        ? String(user.user_id)
        : user.id !== undefined && user.id !== null
          ? String(user.id)
          : '',
    userName: user.user_name ?? user.name ?? '未命名用户',
  })).filter((user) => user.userId)
}

// 子任务列表里的主任务关联字段来源不固定，这里统一折叠成页面可直接消费的结构。
function mapSubTaskListItem(item: ServiceSubTaskListItemResponse): ServiceSubTaskRecord {
  const taskPayload = item.task ?? undefined
  const sourceTaskId = item.task_id ?? item.parent_task_id ?? item.source_task_id ?? item.linked_task_id ?? taskPayload?.id
  const title = taskPayload?.title ?? item.title ?? item.description ?? `子任务 ${item.id}`
  const status = taskPayload?.status ?? item.status ?? 'pending'
  const createdAt = item.created_at ?? taskPayload?.created_at ?? ''
  const archivedAt = item.archived_at ?? taskPayload?.archived_at ?? null
  const readonly = Boolean(item.readonly ?? taskPayload?.readonly ?? false)
  const currentStage = mapCurrentStage(item.current_stage ?? taskPayload?.current_stage)
  const currentVersion = mapVersion(item.current_version ?? taskPayload?.current_version)

  return {
    archivedAt,
    createdAt,
    currentStage,
    currentVersion,
    description: item.description ?? '',
    id: String(item.id),
    readonly,
    responsibleUsers: mapResponsibleUsers(item.responsible_users),
    sourceTaskId: sourceTaskId !== undefined && sourceTaskId !== null ? String(sourceTaskId) : undefined,
    status,
    title,
    type: normalizeServiceType(item.sub_task_type ?? item.type),
  }
}

function getTaskStatusMeta(status: string) {
  return taskStatusMeta[status] ?? {
    ...DEFAULT_TASK_STATUS_META,
    label: status || DEFAULT_TASK_STATUS_META.label,
  }
}

export function ServicePage() {
  const {
    currentProject,
    mutating,
  } = useAppState()
  const [tabKey, setTabKey] = useState<ServiceType>('售后')
  const [items, setItems] = useState<ServiceSubTaskRecord[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null)
  const [taskDetails, setTaskDetails] = useState<Record<string, TaskDetailRecord>>({})
  const [activeTaskId, setActiveTaskId] = useState<string>('')
  const [topDrawerType, setTopDrawerType] = useState<ServiceType>('售后')
  const [showTopCreateDrawer, setShowTopCreateDrawer] = useState(false)
  const [completedTaskOptions, setCompletedTaskOptions] = useState<FieldOptionConfig[]>([])
  const [ownerOptions, setOwnerOptions] = useState<FieldOptionConfig[]>([])
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplateRecord[]>([])
  const [participantOptions, setParticipantOptions] = useState<FieldOptionConfig[]>([])
  const [firstStageAssigneeLabel, setFirstStageAssigneeLabel] = useState('')
  const [firstStageAssigneeOptions, setFirstStageAssigneeOptions] = useState<FieldOptionConfig[]>([])
  const [firstStageAssignmentMeta, setFirstStageAssignmentMeta] = useState<{
    dueDays?: number
    templateStageId?: string
  }>({})
  const [workflowTemplateOptions, setWorkflowTemplateOptions] = useState<FieldOptionConfig[]>([])
  const requestIdRef = useRef(0)

  // 售后与迭代列表直接走后端分页，切 tab 和翻页都复用同一套请求逻辑。
  const loadItems = useCallback(async (
    serviceType: ServiceType,
    overrides?: Partial<{
      currentPage: number
      pageSize: number
    }>,
  ) => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const nextPage = overrides?.currentPage ?? currentPage
    const nextPageSize = overrides?.pageSize ?? pageSize

    try {
      setLoading(true)
      const response = await apiRequest<ServiceSubTaskListResponse>('/api/sub_tasks', {
        query: {
          page: nextPage,
          page_size: nextPageSize,
          sub_task_type: serviceTypeQueryMap[serviceType],
        },
      })

      if (requestId !== requestIdRef.current) {
        return
      }

      const records = response.items
        .map(mapSubTaskListItem)
        .filter((item) => item.type === serviceType)

      setItems(records)
      setCurrentPage(response.page)
      setPageSize(response.page_size)
      setTotal(response.total)
      setExpandedRowKeys([])
    } catch (error) {
      message.error(error instanceof Error ? error.message : '售后与迭代列表加载失败')
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [currentPage, pageSize])

  useEffect(() => {
    void loadItems(tabKey)
  }, [loadItems, tabKey])

  useEffect(() => {
    // 顶部发起弹窗依赖已完成主任务、流程模板和当前项目成员三个下拉数据源。
    async function loadFormOptions() {
      try {
        const [doneTasks, workflowTemplates, projectMembers] = await Promise.all([
          taskService.listTasks({
            mineScope: 'completed',
            page: 1,
            pageSize: 100,
          }),
          currentProject?.id
            ? adminService.listWorkflowTemplates(currentProject.id)
            : Promise.resolve([]),
          currentProject?.id
            ? adminService.listProjectMembers({
                page: 1,
                pageSize: 100,
                projectId: currentProject.id,
              })
            : Promise.resolve({ items: [] }),
        ])

        setCompletedTaskOptions(
          doneTasks.items.map((task) => ({
            label: `${task.title}`,
            value: task.id,
          })),
        )
        setWorkflowTemplateOptions(
          workflowTemplates.map((template) => ({
            label: template.name,
            value: template.id,
          })),
        )
        setWorkflowTemplates(workflowTemplates)
        setOwnerOptions(
          projectMembers.items.map((member) => ({
            label: `${member.userName} · ${member.userEmail}`,
            value: member.userId,
          })),
        )
      } catch (error) {
        message.error(error instanceof Error ? error.message : '发起表单数据加载失败')
        setCompletedTaskOptions([])
        setOwnerOptions([])
        setWorkflowTemplates([])
        setWorkflowTemplateOptions([])
      }
    }

    void loadFormOptions()
  }, [currentProject?.id])

  async function ensureTaskDetail(taskId: string) {
    if (taskDetails[taskId]) {
      return taskDetails[taskId]
    }

    const detail = await taskService.getTaskDetail(taskId)
    setTaskDetails((current) => ({ ...current, [taskId]: detail }))
    return detail
  }

  async function handleExpandRecord(expanded: boolean, record: ServiceSubTaskRecord) {
    if (!expanded) {
      setExpandedRowKeys((current) => current.filter((key) => key !== record.id))
      return
    }

    setExpandedRowKeys([record.id])
    if (record.sourceTaskId) {
      setActiveTaskId(record.sourceTaskId)
    }

    if (!record.sourceTaskId || taskDetails[record.sourceTaskId]) {
      return
    }

    try {
      setLoadingDetailId(record.id)
      await ensureTaskDetail(record.sourceTaskId)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '任务详情加载失败')
      setExpandedRowKeys((current) => current.filter((key) => key !== record.id))
    } finally {
      setLoadingDetailId((current) => (current === record.id ? null : current))
    }
  }

  async function refreshTaskDetail(taskId: string) {
    const detail = await taskService.getTaskDetail(taskId)
    setTaskDetails((current) => ({ ...current, [taskId]: detail }))
  }

  // 售后责任人候选项依赖所选主任务，因此按任务维度单独加载。
  const loadParticipantOptions = useCallback(async (taskId: string | undefined) => {
    if (!taskId) {
      setParticipantOptions([])
      return
    }

    try {
      const participants = await taskService.listTaskParticipants(taskId)
      setParticipantOptions(
        participants.map((participant) => ({
          label: participant.name,
          value: participant.id,
        })),
      )
    } catch (error) {
      message.error(error instanceof Error ? error.message : '责任人加载失败')
      setParticipantOptions([])
    }
  }, [])

  const loadFirstStageAssigneeOptions = useCallback(async (templateId: string | undefined) => {
    if (!currentProject?.id || !templateId) {
      setFirstStageAssigneeLabel('')
      setFirstStageAssigneeOptions([])
      setFirstStageAssignmentMeta({})
      return
    }

    const selectedTemplate = workflowTemplates.find((template) => template.id === templateId)
    const firstStage = selectedTemplate?.stages
      .slice()
      .sort((left, right) => left.sortValue - right.sortValue)[0]

    if (!firstStage?.id || !firstStage.operatorRoleCode) {
      setFirstStageAssigneeLabel('')
      setFirstStageAssigneeOptions([])
      setFirstStageAssignmentMeta({})
      return
    }

    // 选中流程后，联动第一节点角色成员，供创建时直接指定首节点执行人。
    setFirstStageAssigneeLabel(firstStage.operatorRoleName ?? firstStage.stageName)
    setFirstStageAssignmentMeta({
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
      setFirstStageAssigneeOptions(
        response.items.map((member) => ({
          label: `${member.userName} · ${member.userEmail}`,
          value: member.userId,
        })),
      )
    } catch (error) {
      message.error(error instanceof Error ? error.message : '首节点人员加载失败')
      setFirstStageAssigneeOptions([])
    }
  }, [currentProject?.id, workflowTemplates])

  // 售后和迭代虽然接口不同，但前端共用一个提交流程，统一在这里分流。
  async function handleCreateService(payload: {
    assigneeUserIds?: string[]
    description: string
    firstStageAssigneeUserId?: string
    linkedTaskId?: string
    ownerUserId?: string
    type: ServiceType
    workflowTemplateId?: string
  }) {
    const targetTaskId = payload.linkedTaskId || activeTaskId

    if (!targetTaskId) {
      message.warning('请先选择关联主任务')
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

    if (!payload.firstStageAssigneeUserId || !firstStageAssignmentMeta.templateStageId) {
      message.warning(`请选择${firstStageAssigneeLabel || '首节点执行人'}`)
      return
    }
    try {
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
          due_days: firstStageAssignmentMeta.dueDays,
          template_stage_id: Number(firstStageAssignmentMeta.templateStageId),
        },
      ]

      if (payload.type === '售后') {
        await taskService.createAfterSalesTask(targetTaskId, {
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
        await taskService.createIterationTask(targetTaskId, {
          description: payload.description,
          owner_id: Number(payload.ownerUserId),
          stage_assignments: stageAssignments,
          workflow_template_id: Number(payload.workflowTemplateId),
        })
        message.success('迭代任务已发起')
      }

      handleCloseTopCreateDrawer()
      await loadItems(tabKey, { currentPage: 1 })
    } catch (error) {
      message.error(error instanceof Error ? error.message : '创建失败')
    }
  }

  function handleTableChange(pagination: TablePaginationConfig) {
    const nextPage = pagination.current ?? 1
    const nextPageSize = pagination.pageSize ?? 10

    setCurrentPage(nextPage)
    setPageSize(nextPageSize)
    void loadItems(tabKey, {
      currentPage: nextPage,
      pageSize: nextPageSize,
    })
  }

  function handleCloseTopCreateDrawer() {
    setShowTopCreateDrawer(false)
    setFirstStageAssigneeLabel('')
    setFirstStageAssigneeOptions([])
    setFirstStageAssignmentMeta({})
  }

  const columns: ColumnsType<ServiceSubTaskRecord> = [
    {
      title: '工单',
      dataIndex: 'title',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.title}</Typography.Text>
          <Typography.Text type="secondary">
            {record.id}
            {record.sourceTaskId ? ` · 主任务 ${record.sourceTaskId}` : ''}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      render: (value: ServiceType) => (
        <Tag color={value === '售后' ? 'magenta' : 'orange'}>{value}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 140,
      render: (status: string, record) => {
        const displayLabel = record.currentStage?.stageName || getTaskStatusMeta(status).label
        const meta = getTaskStatusMeta(record.currentStage?.status || status)
        return <Tag color={meta.color}>{displayLabel}</Tag>
      },
    },
    {
      title: '当前负责人',
      width: 180,
      render: (_, record) => {
        const responsibleUserNames = record.responsibleUsers.map((user) => user.userName)
        return responsibleUserNames.length > 0 ? responsibleUserNames.join('/') : '-'
      },
    },
    {
      title: '问题描述',
      dataIndex: 'description',
      render: (value: string) =>
        value ? <Typography.Text>{value}</Typography.Text> : <Typography.Text type="secondary">-</Typography.Text>,
    },
    {
      title: '当前版本',
      width: 110,
      render: (_, record) => record.currentVersion.versionNo,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
    },
    {
      title: '操作',
      width: 110,
      render: (_, record) => {
        const expanded = expandedRowKeys.includes(record.id)

        return (
          <TableExpandTrigger
            expanded={expanded}
            actionable={Boolean(record.sourceTaskId)}
            onClick={() => {
              void handleExpandRecord(!expanded, record)
            }}
          />
        )
      },
    },
  ]

  return (
    <Card className="panel-card">
      <div className="workspace-header">
        <div className="workspace-header-main">
          <Typography.Title level={4} className="workspace-header-title">
            售后与迭代
          </Typography.Title>
        </div>
        <div className="workspace-header-side">
          <div className="workspace-kpi">
            <span className="workspace-kpi-value">{total}</span>
            <span className="workspace-kpi-label">结果数</span>
          </div>
          <Space>
            <Button
              type="primary"
              onClick={() => {
                setTopDrawerType('售后')
                setShowTopCreateDrawer(true)
                void loadParticipantOptions(undefined)
              }}
            >
              发起售后
            </Button>
            <Button
              onClick={() => {
                if (!activeTaskId) {
                  message.warning('请先展开一条任务并选定关联主任务')
                  return
                }
                setTopDrawerType('迭代')
                setShowTopCreateDrawer(true)
                void loadParticipantOptions(activeTaskId)
              }}
            >
              发起迭代
            </Button>
          </Space>
        </div>
      </div>
      <Tabs
        activeKey={tabKey}
        onChange={(key) => {
          setTabKey(key as ServiceType)
          setCurrentPage(1)
        }}
        items={[
          { key: '售后', label: '售后' },
          { key: '迭代', label: '迭代' },
        ]}
        className="workspace-tabs"
      />
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={items}
        locale={{
          emptyText: loading
            ? '加载中...'
            : <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
        }}
        pagination={{
          current: currentPage,
          pageSize,
          pageSizeOptions: [10, 20, 50],
          showSizeChanger: true,
          showTotal: (value) => `共 ${value} 条`,
          total,
        }}
        onChange={handleTableChange}
        expandable={{
          expandedRowKeys,
          showExpandColumn: false,
          onExpand: (expanded, record) => {
            void handleExpandRecord(expanded, record)
          },
          expandedRowRender: (record) => {
            const detail = record.sourceTaskId ? taskDetails[record.sourceTaskId] : undefined

            return (
              <div className="table-expanded-panel">
                <Card
                  title={
                    <Space direction="vertical" size={0}>
                      <Typography.Title level={4} className="card-title-reset">
                        {record.title}
                      </Typography.Title>
                      <Typography.Text type="secondary">
                        {record.id}
                        {record.sourceTaskId ? ` · 主任务 ${record.sourceTaskId}` : ''}
                      </Typography.Text>
                    </Space>
                  }
                  extra={
                    <Tag color={record.type === '售后' ? 'magenta' : 'orange'}>
                      {record.type}
                    </Tag>
                  }
                >
                  {record.sourceTaskId ? (
                    <TaskHistoryDetailPanel
                      detail={detail}
                      loading={loadingDetailId === record.id && !detail}
                      onUpdated={async () => {
                        await Promise.all([
                          refreshTaskDetail(record.sourceTaskId as string),
                          loadItems(tabKey, { currentPage }),
                        ])
                      }}
                    />
                  ) : (
                    <Empty
                      description="当前子任务未返回关联主任务，暂时无法展示展开详情。"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  )}
                </Card>
              </div>
            )
          },
        }}
      />
      <ServiceTicketDrawer
        open={showTopCreateDrawer}
        defaultType={topDrawerType}
        courseId={topDrawerType === '迭代' ? activeTaskId : ''}
        assigneeOptions={topDrawerType === '售后' ? participantOptions : []}
        linkedTaskOptions={topDrawerType === '售后' ? completedTaskOptions : undefined}
        loading={mutating}
        onClose={handleCloseTopCreateDrawer}
        onLinkedTaskChange={loadParticipantOptions}
        onWorkflowTemplateChange={loadFirstStageAssigneeOptions}
        firstStageAssigneeLabel={firstStageAssigneeLabel}
        firstStageAssigneeOptions={firstStageAssigneeOptions}
        ownerOptions={ownerOptions}
        onSubmit={handleCreateService}
        showAssigneeField={topDrawerType === '售后'}
        showLinkedTaskField={topDrawerType === '售后'}
        workflowTemplateOptions={workflowTemplateOptions}
      />
    </Card>
  )
}
