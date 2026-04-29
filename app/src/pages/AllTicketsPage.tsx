import { useDeferredValue, useMemo, useState } from 'react'
import { Card, Input, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { TableExpandTrigger } from '../components/common/TableExpandTrigger'
import { CourseDetail } from '../components/course/CourseDetail'
import { StatusBadge } from '../components/common/StatusBadge'
import { statusMeta, formatDateLabel } from '../constants/workflow'
import { roleLabelMap } from '../constants/roles'
import { useAppState } from '../context/AppStateContext'
import { canAdvanceCourse, canCreateTicket } from '../domain/permissions'
import type { CourseRecord, CourseStatus } from '../types'

export function AllTicketsPage() {
  const { role, currentUser, courses, selectCourse, createTicket, advanceCourse, mutating } = useAppState()
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | CourseStatus>('all')
  const deferredSearch = useDeferredValue(search)

  const filteredCourses = useMemo(
    () =>
      courses.filter((course) => {
        const matchesSearch =
          deferredSearch.trim().length === 0 ||
          [
            course.title,
            course.id,
            course.series,
            course.subject,
            course.researchOwner,
            course.styleDesigners[0] ?? '',
            course.pageLead,
          ]
            .join(' ')
            .toLowerCase()
            .includes(deferredSearch.toLowerCase())

        const matchesStatus = statusFilter === 'all' ? true : course.status === statusFilter
        return matchesSearch && matchesStatus
      }),
    [courses, deferredSearch, statusFilter],
  )

  const columns: ColumnsType<CourseRecord> = [
    {
      title: '工单信息',
      dataIndex: 'title',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.title}</Typography.Text>
          <Typography.Text type="secondary">
            {record.id} · {record.series} · {record.version}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '原工单关联',
      render: (_, record) => {
        const linkedTicket =
          record.orderType !== '全新订单' ? record.tickets[0] : undefined

        if (!linkedTicket) {
          return <Typography.Text type="secondary">-</Typography.Text>
        }

        return (
          <Space direction="vertical" size={0}>
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
      render: (status: CourseStatus) => <StatusBadge status={status} />,
    },
    { title: '当前负责人', dataIndex: 'currentOwner' },
    { title: '制作老师', dataIndex: 'researchOwner' },
    {
      title: '是否B端',
      render: (_, record) =>
        record.isBEnd === '是' ? <Tag color="processing">B端</Tag> : <Tag>普通</Tag>,
    },
    {
      title: '截止时间',
      dataIndex: 'overallDueDate',
      render: (value: string, record) => (
        <Typography.Text type={record.overdue ? 'danger' : undefined}>
          {record.overdue ? '已逾期' : formatDateLabel(value)}
        </Typography.Text>
      ),
    },
    {
      title: '工单数',
      render: (_, record) => `${record.tickets.length} 个`,
    },
    {
      title: '操作',
      render: (_, record) => {
        const expanded = expandedRowKeys.includes(record.id)

        return (
          <TableExpandTrigger
            expanded={expanded}
            actionable
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
            全部工单
          </Typography.Title>
        </div>
        <div className="workspace-header-side">
          <div className="workspace-kpi">
            <span className="workspace-kpi-value">{filteredCourses.length}</span>
            <span className="workspace-kpi-label">工单总数</span>
          </div>
        </div>
      </div>

      <div className="workspace-filter-bar">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="搜索工单名称 / 编号 / 负责人 / 系列"
          className="workspace-filter-input"
        />
        <Select
          value={statusFilter}
          className="workspace-filter-select"
          onChange={setStatusFilter}
          options={[
            { label: '全部状态', value: 'all' },
            ...Object.entries(statusMeta).map(([key, value]) => ({
              label: value.label,
              value: key,
            })),
          ]}
        />
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filteredCourses}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1320 }}
        expandable={{
          expandedRowKeys,
          showExpandColumn: false,
          onExpand: (expanded, record) => {
            selectCourse(record.id)
            setExpandedRowKeys(expanded ? [record.id] : [])
          },
          expandedRowRender: (record) => (
            <div className="table-expanded-panel">
              <CourseDetail
                course={record}
                onAdvance={advanceCourse}
                onCreateTicket={(payload) => createTicket(payload, record.id)}
                ticketRequester={`${roleLabelMap[role]} · ${currentUser?.name ?? '当前用户'}`}
                busy={mutating}
                canAdvance={canAdvanceCourse(role, record)}
                canCreateAftersales={canCreateTicket(role, '售后', record)}
                canCreateIteration={canCreateTicket(role, '迭代', record)}
              />
            </div>
          ),
        }}
      />
    </Card>
  )
}
