import { useMemo, useState } from 'react'
import { Card, Empty, Space, Table, Tabs, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { TableExpandTrigger } from '../components/common/TableExpandTrigger'
import { ResearchTaskPanel } from '../components/course/ResearchTaskPanel'
import { StatusBadge } from '../components/common/StatusBadge'
import { formatDateLabel } from '../constants/workflow'
import { useAppState } from '../context/AppStateContext'
import { canEditResearchTask } from '../domain/permissions'
import type { CourseRecord } from '../types'

export function ResearchWorkbenchPage() {
  const {
    courses,
    selectedResearchCourse,
    role,
    currentUser,
    selectCourse,
    updateResearch,
    advanceCourse,
    mutating,
  } = useAppState()

  const [tabKey, setTabKey] = useState<'todo' | 'done' | 'overdue'>('todo')
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])
  const currentResearchUser = currentUser?.name ?? ''

  const roleTasks = useMemo(() => {
    const source = courses.filter((course) => course.status === 'research')

    if (role === 'researcher') {
      return source.filter(
        (course) =>
          course.researchOwner === currentResearchUser || course.researchOwner === '待分配',
      )
    }

    return source
  }, [courses, currentResearchUser, role])

  const completedTasks = useMemo(
    () =>
      courses.filter((course) => {
        const isMine =
          role === 'admin'
            ? true
            : course.researchOwner === currentResearchUser || course.researchOwner === '待分配'
        return isMine && course.status !== 'research'
      }),
    [courses, currentResearchUser, role],
  )

  const overdueTasks = useMemo(() => roleTasks.filter((course) => course.overdue), [roleTasks])
  const researchTasks = tabKey === 'todo' ? roleTasks : tabKey === 'done' ? completedTasks : overdueTasks
  const activeCourse =
    researchTasks.find((course) => course.id === selectedResearchCourse?.id) ?? researchTasks[0]

  const columns: ColumnsType<CourseRecord> = [
    {
      title: '课件',
      dataIndex: 'title',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.title}</Typography.Text>
          <Typography.Text type="secondary">
            {record.id} · {record.series}
          </Typography.Text>
        </Space>
      ),
    },
    { title: '制作老师', dataIndex: 'researchOwner' },
    {
      title: '预期交稿日期',
      dataIndex: 'researchDueDate',
      render: (value: string) => formatDateLabel(value),
    },
    {
      title: '成品完成时间',
      dataIndex: 'finalDueDate',
      render: (value: string) => formatDateLabel(value),
    },
    {
      title: '课件原稿',
      render: (_, record) => `${record.researchSourceFiles.length} 份`,
    },
    {
      title: '总页数',
      render: (_, record) => record.totalPageCount ?? '-',
    },
    {
      title: '实际交稿日期',
      dataIndex: 'actualResearchSubmissionDate',
      render: (value?: string) => (value ? formatDateLabel(value) : '未完成'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: () => <StatusBadge status="research" />,
    },
    {
      title: '操作',
      render: (_, record) => {
        const expanded = expandedRowKeys.includes(record.id)

        return (
          <TableExpandTrigger
            expanded={expanded}
            actionable={record.status === 'research'}
            onClick={() => {
              selectCourse(record.id)
              setExpandedRowKeys(expanded ? [] : [record.id])
            }}
          />
        )
      },
    },
  ]

  if (researchTasks.length === 0) {
    return (
      <Card>
        <Empty description="当前没有可处理的教研任务" />
      </Card>
    )
  }

  return (
    <Card className="panel-card">
      <div className="workspace-header">
        <div className="workspace-header-main">
          <Typography.Title level={4} className="workspace-header-title">
            教研任务台
          </Typography.Title>
        </div>
        <div className="workspace-header-side">
          <Typography.Text type="secondary">
            待处理 {roleTasks.length} 项
          </Typography.Text>
          <Typography.Text type="secondary">
            {role === 'researcher'
              ? `当前账号：${currentResearchUser}（模拟）`
              : '管理员查看全部教研任务'}
          </Typography.Text>
        </div>
      </div>
      <Tabs
        activeKey={tabKey}
        onChange={(key) => setTabKey(key as 'todo' | 'done' | 'overdue')}
        items={[
          { key: 'todo', label: `我的待办 (${roleTasks.length})` },
          { key: 'done', label: `已完成 (${completedTasks.length})` },
          { key: 'overdue', label: `已逾期 (${overdueTasks.length})` },
        ]}
        className="workspace-tabs"
      />
      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={researchTasks}
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
              <ResearchTaskPanel
                course={record}
                editable={canEditResearchTask(role, record)}
                busy={mutating}
                onSubmit={async (payload) => {
                  await updateResearch(record.id, payload)
                  await advanceCourse(record.id)
                }}
              />
            </div>
          ),
        }}
        rowClassName={(record) => (record.id === activeCourse?.id ? 'selected-table-row' : '')}
      />
    </Card>
  )
}
