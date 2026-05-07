import { useMemo, useState } from 'react'
import { Button, Card, Empty, Space, Table, Tabs, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { TableExpandTrigger } from '../components/common/TableExpandTrigger'
import { ServiceTicketDrawer } from '../components/course/ServiceTicketDrawer'
import { StatusBadge } from '../components/common/StatusBadge'
import { roleLabelMap } from '../constants/roles'
import { today } from '../constants/workflow'
import { nextActionMap } from '../constants/workflow'
import { useAppState } from '../context/AppStateContext'
import { canAdvanceCourse, canCreateTicket } from '../domain/permissions'
import type { CourseRecord, ServiceType } from '../types'

export function ServicePage() {
  const {
    role,
    currentUser,
    courses,
    selectCourse,
    createTicket,
    advanceCourse,
    mutating,
  } = useAppState()

  const [tabKey, setTabKey] = useState<'todo' | 'done' | 'overdue'>('todo')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerType, setDrawerType] = useState<ServiceType>('售后')
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])

  const serviceCourses = useMemo(
    () => courses.filter((course) => course.orderType !== '全新订单' || course.tickets.length > 0),
    [courses],
  )
  const todoCourses = useMemo(
    () =>
      serviceCourses.filter(
        (course) => course.orderType !== '全新订单' && course.status !== 'archived',
      ),
    [serviceCourses],
  )
  const doneCourses = useMemo(
    () => serviceCourses.filter((course) => course.orderType !== '全新订单' && course.status === 'archived'),
    [serviceCourses],
  )
  const overdueCourses = useMemo(
    () => serviceCourses.filter((course) => course.overdue),
    [serviceCourses],
  )
  const filteredCourses = tabKey === 'todo' ? todoCourses : tabKey === 'done' ? doneCourses : overdueCourses
  const requesterLabel = `${roleLabelMap[role]} · ${currentUser?.name ?? '当前用户'}`

  const columns: ColumnsType<CourseRecord> = [
    {
      title: '课件',
      dataIndex: 'title',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text strong>{record.title}</Typography.Text>
          <Typography.Text type="secondary">
            {record.id} · 当前版本 {record.version}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '原工单关联',
      render: (_, record) => {
        const linkedTicket = record.tickets[0]

        if (!linkedTicket) {
          return <Typography.Text type="secondary">-</Typography.Text>
        }

        return (
          <Space orientation="vertical" size={0}>
            <Typography.Text strong>{linkedTicket.linkedCourseId}</Typography.Text>
            <Typography.Text type="secondary">
              {linkedTicket.linkedVersion} → {linkedTicket.targetVersion}
            </Typography.Text>
          </Space>
        )
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (_, record) => <StatusBadge status={record.status} />,
    },
    {
      title: '当前负责人',
      dataIndex: 'currentOwner',
    },
    {
      title: '最近工单',
      render: (_, record) => record.tickets[0]?.type ?? '暂无',
    },
    {
      title: '衍生任务',
      render: (_, record) => `${record.tickets.length} 个`,
    },
    {
      title: '操作',
      render: (_, record) => {
        const actionable = record.orderType !== '全新订单' && record.status !== 'archived'
        const expanded = expandedRowKeys.includes(record.id)

        return (
          <TableExpandTrigger
            expanded={expanded}
            actionable={actionable}
            onClick={() => {
              selectCourse(record.id)
              setExpandedRowKeys(expanded ? [] : [record.id])
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
            <span className="workspace-kpi-value">{todoCourses.length}</span>
            <span className="workspace-kpi-label">处理中</span>
          </div>
        </div>
      </div>
      <Tabs
        activeKey={tabKey}
        onChange={(key) => setTabKey(key as 'todo' | 'done' | 'overdue')}
        items={[
          { key: 'todo', label: `我的待办 (${todoCourses.length})` },
          { key: 'done', label: `已完成 (${doneCourses.length})` },
          { key: 'overdue', label: `已逾期 (${overdueCourses.length})` },
        ]}
        className="workspace-tabs"
      />
      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={filteredCourses}
        pagination={{ pageSize: 8 }}
        expandable={{
          expandedRowKeys,
          showExpandColumn: false,
          onExpand: (expanded, record) => {
            selectCourse(record.id)
            setExpandedRowKeys(expanded ? [record.id] : [])
          },
          expandedRowRender: (record) => (
            <div className="table-expanded-panel">
              <Card
                title={
                  <Space orientation="vertical" size={0}>
                    <Typography.Title level={4} className="card-title-reset">
                      {record.title}
                    </Typography.Title>
                    <Typography.Text type="secondary">
                      {record.id} · {record.version} · {record.orderType}
                    </Typography.Text>
                  </Space>
                }
                extra={<StatusBadge status={record.status} />}
              >
                <Space className="detail-action-row" wrap>
                  <Button
                    type="primary"
                    onClick={() => {
                      selectCourse(record.id)
                      setDrawerType('售后')
                      setDrawerOpen(true)
                    }}
                    disabled={!canCreateTicket(role, '售后', record)}
                    loading={mutating}
                  >
                    发起售后
                  </Button>
                  <Button
                    onClick={() => {
                      selectCourse(record.id)
                      setDrawerType('迭代')
                      setDrawerOpen(true)
                    }}
                    disabled={!canCreateTicket(role, '迭代', record) || mutating}
                  >
                    发起迭代
                  </Button>
                  {record.status === 'aftersales' ? (
                    <Button
                      onClick={() => advanceCourse(record.id)}
                      loading={mutating}
                      disabled={!canAdvanceCourse(role, record)}
                    >
                      {nextActionMap[record.status]?.label}
                    </Button>
                  ) : null}
                </Space>

                {record.tickets.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前课件还没有售后或迭代记录。" />
                ) : (
                  <Space orientation="vertical" size={12} className="panel-stack-full">
                    {record.tickets.map((ticket) => (
                      <Card key={ticket.id} size="small" className="ticket-card">
                        <Space orientation="vertical" size={4} className="panel-stack-full">
                          <Space className="ticket-card-head">
                            <Typography.Text strong>
                              {ticket.type}单 {ticket.id}
                            </Typography.Text>
                            <Typography.Text>{ticket.status}</Typography.Text>
                          </Space>
                          <Typography.Text>{ticket.description}</Typography.Text>
                          <Typography.Text type="secondary">
                            责任方：{ticket.responsibility}
                          </Typography.Text>
                          <Typography.Text type="secondary">
                            关联课件：{ticket.linkedCourseId} · 发起人：{ticket.requester}
                          </Typography.Text>
                          <Typography.Text type="secondary">
                            发起时间：{ticket.createdAt}
                          </Typography.Text>
                          {ticket.type === '迭代' ? (
                            <Typography.Text type="secondary">
                              跳过环节：{ticket.skipStages.length > 0 ? ticket.skipStages.join('、') : '不跳过'}
                            </Typography.Text>
                          ) : null}
                          <Typography.Text type="secondary">
                            来源版本 {ticket.linkedVersion} → 目标版本 {ticket.targetVersion}
                          </Typography.Text>
                        </Space>
                      </Card>
                    ))}
                  </Space>
                )}
              </Card>
            </div>
          ),
        }}
      />

      <ServiceTicketDrawer
        open={drawerOpen}
        defaultType={drawerType}
        courseId={expandedRowKeys[0] ? String(expandedRowKeys[0]) : ''}
        requester={requesterLabel}
        createdAt={today}
        loading={mutating}
        onClose={() => setDrawerOpen(false)}
        onSubmit={createTicket}
      />
    </Card>
  )
}
