import { useMemo, useState } from 'react'
import { Card, Space, Table, Tabs, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { TableExpandTrigger } from '../components/common/TableExpandTrigger'
import { DispatchPanel } from '../components/course/DispatchPanel'
import { StatusBadge } from '../components/common/StatusBadge'
import { formatDateLabel } from '../constants/workflow'
import { useAppState } from '../context/AppStateContext'
import { canManageDispatch } from '../domain/permissions'
import type { CourseRecord } from '../types'

export function DispatchPage() {
  const {
    courses,
    selectedCourse,
    selectCourse,
    saveStyleDispatch,
    savePageDispatch,
    advanceCourse,
    mutating,
    role,
  } = useAppState()

  const [tabKey, setTabKey] = useState<'todo' | 'done' | 'overdue'>('todo')
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])

  const buckets = {
    style: courses.filter((course) => course.status === 'pendingStyleDispatch'),
    page: courses.filter((course) => course.status === 'pendingPageDispatch'),
    archive: courses.filter((course) => course.status === 'pendingArchive'),
  }

  const todoTasks = [...buckets.style, ...buckets.page, ...buckets.archive]
  const doneTasks = useMemo(
    () => courses.filter((course) => ['archived', 'packing'].includes(course.status)),
    [courses],
  )
  const overdueTasks = useMemo(() => todoTasks.filter((course) => course.overdue), [todoTasks])

  const activeCourse =
    selectedCourse && ['pendingStyleDispatch', 'pendingPageDispatch', 'pendingArchive'].includes(selectedCourse.status)
      ? selectedCourse
      : buckets.style[0] || buckets.page[0] || buckets.archive[0]

  const columns: ColumnsType<CourseRecord> = [
    {
      title: '课件',
      dataIndex: 'title',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.title}</Typography.Text>
          <Typography.Text type="secondary">
            {record.id} · {record.currentOwner}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (_, record) => <StatusBadge status={record.status} />,
    },
    {
      title: '风格稿负责人',
      render: (_, record) => record.styleDesigners[0] || '待派单',
    },
    {
      title: '内页负责人',
      render: (_, record) => (record.pageLead === '待派单' ? '待派单' : record.pageLead),
    },
    {
      title: '截止时间',
      dataIndex: 'overallDueDate',
      render: (value: string, record) => (
        <Typography.Text type={record.overdue ? 'danger' : 'secondary'}>
          {record.overdue ? '已逾期' : formatDateLabel(value)}
        </Typography.Text>
      ),
    },
    {
      title: '操作',
      render: (_, record) => {
        const actionable = ['pendingStyleDispatch', 'pendingPageDispatch', 'pendingArchive'].includes(record.status)
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
            派单中心
          </Typography.Title>
        </div>
        <div className="workspace-header-side">
          <div className="workspace-kpi">
            <span className="workspace-kpi-value">{todoTasks.length}</span>
            <span className="workspace-kpi-label">待处理</span>
          </div>
        </div>
      </div>
      <Tabs
        activeKey={tabKey}
        onChange={(key) => setTabKey(key as 'todo' | 'done' | 'overdue')}
        items={[
          { key: 'todo', label: `我的待办 (${todoTasks.length})` },
          { key: 'done', label: `已完成 (${doneTasks.length})` },
          { key: 'overdue', label: `已逾期 (${overdueTasks.length})` },
        ]}
        className="workspace-tabs"
      />
      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={tabKey === 'todo' ? todoTasks : tabKey === 'done' ? doneTasks : overdueTasks}
        pagination={{ pageSize: 8 }}
        locale={{ emptyText: '暂无任务' }}
        expandable={{
          expandedRowKeys,
          showExpandColumn: false,
          onExpand: (expanded, record) => {
            selectCourse(record.id)
            setExpandedRowKeys(expanded ? [record.id] : [])
          },
          expandedRowRender: (record) =>
            ['pendingStyleDispatch', 'pendingPageDispatch', 'pendingArchive'].includes(record.status) ? (
              <div className="table-expanded-panel">
                <DispatchPanel
                  course={record}
                  editable={canManageDispatch(role, record)}
                  busy={mutating}
                  onSaveStyleDispatch={(payload) => saveStyleDispatch(record.id, payload)}
                  onSavePageDispatch={(payload) => savePageDispatch(record.id, payload)}
                  onConfirmArchive={() => advanceCourse(record.id)}
                />
              </div>
            ) : (
              <div className="table-expanded-empty">
                当前任务已完成，可在表格中查看归档结果与负责人信息。
              </div>
            ),
        }}
        rowClassName={(record) => (record.id === activeCourse?.id ? 'selected-table-row' : '')}
      />
    </Card>
  )
}
