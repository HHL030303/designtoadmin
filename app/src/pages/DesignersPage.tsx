import { useEffect, useMemo, useState } from 'react'
import { Card, List, Space, Table, Tabs, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { TableExpandTrigger } from '../components/common/TableExpandTrigger'
import { PageUploadPanel } from '../components/course/PageUploadPanel'
import { StyleUploadPanel } from '../components/course/StyleUploadPanel'
import { StatusBadge } from '../components/common/StatusBadge'
import { formatDateLabel } from '../constants/workflow'
import { useAppState } from '../context/AppStateContext'
import { canUploadPageDraft, canUploadStyleDraft } from '../domain/permissions'
import type { CourseRecord } from '../types'

export function DesignersPage() {
  const {
    courses,
    selectedCourse,
    role,
    currentUser,
    mutating,
    uploadStyle,
    uploadPage,
    selectCourse,
  } = useAppState()

  const [tabKey, setTabKey] = useState<'todo' | 'done' | 'overdue'>('todo')
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])
  const currentDesigner = currentUser?.name ?? ''

  useEffect(() => {
    if (role !== 'styleDesigner') {
      return
    }

    const styleCourses = courses
      .filter((course) => course.status === 'styleInProgress')
      .map((course) => ({
        id: course.id,
        title: course.title,
        status: course.status,
        currentOwner: course.currentOwner,
        styleDesigners: course.styleDesigners,
        styleDueDate: course.styleDueDate,
      }))

    const matchedCourses = styleCourses.filter(
      (course) =>
        course.styleDesigners.includes(currentDesigner) ||
        course.currentOwner.includes(currentDesigner),
    )

    console.log('[DesignersPage] 风格稿设计师任务排查', {
      currentDesigner,
      currentUser,
      styleCourses,
      matchedCourses,
    })
  }, [courses, currentDesigner, currentUser, role])

  const scopedTasks = useMemo(() => {
    const source = courses.filter((course) => ['styleInProgress', 'pageInProgress'].includes(course.status))

    if (role === 'styleDesigner') {
      return source.filter(
        (course) =>
          course.status === 'styleInProgress' &&
          (
            course.styleDesigners.includes(currentDesigner) ||
            course.currentOwner.includes(currentDesigner)
          ),
      )
    }

    if (role === 'pageDesigner') {
      return source.filter(
        (course) =>
          course.status === 'pageInProgress' &&
          (course.pageLead === currentDesigner || course.pageDesigners.includes(currentDesigner)),
      )
    }

    return source
  }, [courses, currentDesigner, role])

  const completedTasks = useMemo(() => {
    if (role === 'styleDesigner') {
      return courses.filter(
        (course) =>
          (
            course.styleDesigners.includes(currentDesigner) ||
            course.currentOwner.includes(currentDesigner)
          ) &&
          ['pendingPageDispatch', 'pageInProgress', 'pendingArchive', 'packing', 'archived'].includes(course.status),
      )
    }

    if (role === 'pageDesigner') {
      return courses.filter(
        (course) =>
          course.pageLead === currentDesigner && ['pendingArchive', 'packing', 'archived'].includes(course.status),
      )
    }

    return courses.filter((course) => ['pendingArchive', 'packing', 'archived'].includes(course.status))
  }, [courses, currentDesigner, role])

  const overdueTasks = useMemo(() => scopedTasks.filter((course) => course.overdue), [scopedTasks])
  const designerTasks = tabKey === 'todo' ? scopedTasks : tabKey === 'done' ? completedTasks : overdueTasks
  const activeCourse = designerTasks.find((course) => course.id === selectedCourse?.id) ?? designerTasks[0]

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
      title: '阶段负责人',
      render: (_, record) =>
        record.status === 'styleInProgress'
          ? record.styleDesigners[0] || '未分配'
          : record.pageLead || '未分配',
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
      title: '完成时间',
      render: (_, record) =>
        record.status === 'styleInProgress'
          ? (record.styleAttachments.length > 0 ? '已提交' : '未完成')
          : record.pageAttachments.length > 0
            ? '已提交'
            : '未完成',
    },
    {
      title: '操作',
      render: (_, record) => {
        const actionable = ['styleInProgress', 'pageInProgress'].includes(record.status)
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
            设计任务台
          </Typography.Title>
        </div>
        <div className="workspace-header-side">
          <Typography.Text type="secondary">
            当前角色：{role === 'styleDesigner' ? '风格稿设计师' : role === 'pageDesigner' ? '内页设计师' : '管理员'}
          </Typography.Text>
          <div className="workspace-kpi">
            <span className="workspace-kpi-value">{scopedTasks.length}</span>
            <span className="workspace-kpi-label">待处理</span>
          </div>
        </div>
      </div>
      <Tabs
        activeKey={tabKey}
        onChange={(key) => setTabKey(key as 'todo' | 'done' | 'overdue')}
        items={[
          { key: 'todo', label: `我的待办 (${scopedTasks.length})` },
          { key: 'done', label: `已完成 (${completedTasks.length})` },
          { key: 'overdue', label: `已逾期 (${overdueTasks.length})` },
        ]}
        className="workspace-tabs"
      />
      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={designerTasks}
        pagination={{ pageSize: 8 }}
        locale={{ emptyText: '当前没有可处理的设计任务' }}
        expandable={{
          expandedRowKeys,
          showExpandColumn: false,
          onExpand: (expanded, record) => {
            selectCourse(record.id)
            setExpandedRowKeys(expanded ? [record.id] : [])
          },
          expandedRowRender: (record) =>
            record.status === 'styleInProgress' ? (
              <div className="table-expanded-panel">
                <StyleUploadPanel
                  course={record}
                  editable={canUploadStyleDraft(role, record)}
                  busy={mutating}
                  onSubmit={(payload) => uploadStyle(record.id, payload)}
                />
              </div>
            ) : record.status === 'pageInProgress' ? (
              <div className="table-expanded-panel">
                <PageUploadPanel
                  course={record}
                  editable={canUploadPageDraft(role, record)}
                  busy={mutating}
                  onSubmit={(payload) => uploadPage(record.id, payload)}
                />
              </div>
            ) : (
              <div className="table-expanded-panel">
                <Card>
                  <List
                    size="small"
                    dataSource={[
                      '风格稿：课程名_风格稿_版本号',
                      '内页成品：课程名_内页成品_版本号',
                      '前端校验命名，不符合则阻断上传',
                      '后端校验数量，生成完整性报告供设计统筹确认',
                    ]}
                    renderItem={(item) => <List.Item>{item}</List.Item>}
                  />
                </Card>
              </div>
            ),
        }}
        rowClassName={(record) => (record.id === activeCourse?.id ? 'selected-table-row' : '')}
      />
    </Card>
  )
}
