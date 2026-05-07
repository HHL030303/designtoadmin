import { useDeferredValue, useMemo, useRef, useState } from 'react'
import {
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
  Form,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { TableExpandTrigger } from '../components/common/TableExpandTrigger'
import { CourseDetail } from '../components/course/CourseDetail'
import { StatusBadge } from '../components/common/StatusBadge'
import {
  courseFormOptions,
  createCourseFormInitialValues,
  type CourseFormValues,
} from '../constants/courseForm'
import { roleLabelMap } from '../constants/roles'
import { formatDateLabel, statusMeta } from '../constants/workflow'
import { useAppState } from '../context/AppStateContext'
import { canAdvanceCourse, canCreateTicket } from '../domain/permissions'
import {
  downloadCourseImportTemplate,
  parseCourseImportFile,
} from '../utils/courseImport'
import type { CourseRecord, CourseStatus, CreateCoursePayload } from '../types'
import {  EditOutlined } from '@ant-design/icons'
export function CoursesPage() {
  const {
    role,
    currentUser,
    courses,
    selectedCourse,
    search,
    statusFilter,
    setSearch,
    setStatusFilter,
    selectCourse,
    createCourse,
    bulkCreateCourses,
    updateCourse,
    advanceCourse,
    createTicket,
    mutating,
    canCreateCourse,
  } = useAppState()

  const [tabKey, setTabKey] = useState<'todo' | 'done' | 'overdue'>('todo')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null)
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const deferredSearch = useDeferredValue(search)
  const [form] = Form.useForm<CourseFormValues>()

  const baseFilteredCourses = useMemo(
    () =>
      courses.filter((course) => {
        const matchesSearch =
          deferredSearch.trim().length === 0 ||
          [course.title, course.id, course.subject, course.series]
            .join(' ')
            .toLowerCase()
            .includes(deferredSearch.toLowerCase())

        const matchesStatus = statusFilter === 'all' ? true : course.status === statusFilter
        return matchesSearch && matchesStatus
      }),
    [courses, deferredSearch, statusFilter],
  )

  const filteredCourses = useMemo(() => {
    if (tabKey === 'done') {
      return baseFilteredCourses.filter((course) => course.status === 'archived')
    }

    if (tabKey === 'overdue') {
      return baseFilteredCourses.filter((course) => course.overdue)
    }

    return baseFilteredCourses.filter((course) => course.status !== 'archived')
  }, [baseFilteredCourses, tabKey])

  const activeCourse = filteredCourses.find((course) => course.id === selectedCourse?.id) ?? filteredCourses[0]

  function openCreateDrawer() {
    setEditingCourseId(null)
    form.resetFields()
    form.setFieldsValue(createCourseFormInitialValues)
    setDrawerOpen(true)
  }

  function openEditDrawer(course: CourseRecord) {
    setEditingCourseId(course.id)
    form.setFieldsValue({
      series: course.series,
      subject: course.subject,
      educationStage: course.educationStage,
      grade: course.grade,
      volume: course.volume,
      textbook: course.textbook,
      chapterName: course.chapterName,
      title: course.title,
      researchOwner: course.researchOwner,
      orderType: course.orderType,
      isBEnd: course.isBEnd,
      hasLessonPlan: course.hasLessonPlan,
      hasScript: course.hasScript,
      artCopyright: course.artCopyright,
      textCopyright: course.textCopyright,
      researchDueDate: dayjs(course.researchDueDate),
      finalDueDate: dayjs(course.finalDueDate),
    })
    setDrawerOpen(true)
  }

  function handleCloseDrawer() {
    setDrawerOpen(false)
    setEditingCourseId(null)
    form.resetFields()
    form.setFieldsValue(createCourseFormInitialValues)
  }

  const editIcon = <EditOutlined />

  const columns: ColumnsType<CourseRecord> = [
    {
      title: '课件',
      dataIndex: 'title',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text strong>{record.title}</Typography.Text>
          <Typography.Text type="secondary">
            {record.id} · {record.series}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: CourseStatus) => <StatusBadge status={status} />,
      // width:'100',
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
          <Space orientation="vertical" size={0}>
            <Typography.Text strong>{linkedTicket.linkedCourseId}</Typography.Text>
            <Typography.Text type="secondary">
              {linkedTicket.linkedVersion} → {linkedTicket.targetVersion}
            </Typography.Text>
          </Space>
        )
      },
    },
    { title: '学科', dataIndex: 'subject' },
    { title: '版本', dataIndex: 'version' },
    { title: '当前责任人', dataIndex: 'currentOwner' },
    {
      title: '教研负责人',
      dataIndex: 'researchOwner',
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
        <Typography.Text type={record.overdue ? 'danger' : undefined}>
          {record.overdue ? '已逾期' : formatDateLabel(value)}
        </Typography.Text>
      ),
    },
    {
      title: '完成时间',
      render: (_, record) => (record.archivedAt ? formatDateLabel(record.archivedAt) : '未完成'),
    },
    {
      title: '操作',
      render: (_, record) => {
        const expanded = expandedRowKeys.includes(record.id)

        return (
          <Space size="small">
            {record.status === 'research' ? (
              <Button
                type="primary"
                className='table-expand-trigger'
                icon={editIcon}
                size="small"
                onClick={() => openEditDrawer(record)}
                
              >
                编辑
              </Button>
            ) : null}
            <TableExpandTrigger
              expanded={expanded}
              actionable={record.status !== 'archived'}
              onClick={() => {
                selectCourse(record.id)
                setExpandedRowKeys(expanded ? [] : [record.id])
              }}
            />
          </Space>
        )
      },
    },
  ]

  async function handleFinish(values: CourseFormValues) {
    const payload: CreateCoursePayload = {
      series: values.series,
      subject: values.subject,
      educationStage: values.educationStage as CreateCoursePayload['educationStage'],
      grade: values.grade,
      volume: values.volume as CreateCoursePayload['volume'],
      textbook: values.textbook,
      chapterName: values.chapterName,
      title: values.title,
      researchOwner: values.researchOwner,
      orderType: values.orderType as CreateCoursePayload['orderType'],
      isBEnd: values.isBEnd as CreateCoursePayload['isBEnd'],
      hasLessonPlan: values.hasLessonPlan as CreateCoursePayload['hasLessonPlan'],
      hasScript: values.hasScript as CreateCoursePayload['hasScript'],
      artCopyright: values.artCopyright as CreateCoursePayload['artCopyright'],
      textCopyright: values.textCopyright as CreateCoursePayload['textCopyright'],
      researchDueDate: values.researchDueDate.format('YYYY-MM-DD'),
      finalDueDate: values.finalDueDate.format('YYYY-MM-DD'),
    }

    if (editingCourseId) {
      await updateCourse(editingCourseId, payload)
      message.success('课件信息已更新')
    } else {
      await createCourse(payload)
    }

    handleCloseDrawer()
  }

  async function handleImportChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    try {
      const payloads = await parseCourseImportFile(file)
      console.log(
        '批量导入课件 JSON 数组:\n' + JSON.stringify(payloads, null, 2),
      )
      await bulkCreateCourses(payloads)
      message.success(`成功导入 ${payloads.length} 条课件`)
    } catch (importError) {
      message.error(importError instanceof Error ? importError.message : '批量导入失败')
    }
  }

  return (
    <Card className="panel-card">
      <div className="workspace-header">
        <div className="workspace-header-main">
          <Typography.Title level={4} className="workspace-header-title">
            任务工单
          </Typography.Title>
        </div>
        <div className="workspace-header-side">
          <div className="workspace-kpi">
            <span className="workspace-kpi-value">{filteredCourses.length}</span>
            <span className="workspace-kpi-label">主单结果</span>
          </div>
          {canCreateCourse ? (
            <Space>
              <Button onClick={() => void downloadCourseImportTemplate()}>
                下载模版
              </Button>
              <Button onClick={() => importInputRef.current?.click()}>
                批量导入
              </Button>
              <Button type="primary" onClick={openCreateDrawer}>
                新建课件
              </Button>
            </Space>
          ) : null}
        </div>
      </div>
      <input
        ref={importInputRef}
        type="file"
        accept=".xlsx"
        style={{ display: 'none' }}
        onChange={(event) => void handleImportChange(event)}
      />
      <div className="workspace-filter-bar">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="搜索课件名称 / 编号 / 学科"
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
      <Tabs
        activeKey={tabKey}
        onChange={(key) => setTabKey(key as 'todo' | 'done' | 'overdue')}
        items={[
          {
            key: 'todo',
            label: `我的待办 (${baseFilteredCourses.filter((course) => course.status !== 'archived').length})`,
          },
          {
            key: 'done',
            label: `已完成 (${baseFilteredCourses.filter((course) => course.status === 'archived').length})`,
          },
          {
            key: 'overdue',
            label: `已逾期 (${baseFilteredCourses.filter((course) => course.overdue).length})`,
          },
        ]}
        className="workspace-tabs"
      />

      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={filteredCourses}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 1360 }}
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
        rowClassName={(record) => (record.id === activeCourse?.id ? 'selected-table-row' : '')}
      />

      <Drawer
        title={editingCourseId ? '编辑课件' : '新建课件'}
        placement="right"
        size={560}
        open={drawerOpen}
        onClose={handleCloseDrawer}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={createCourseFormInitialValues}
          onFinish={(values) => void handleFinish(values)}
        >
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="品牌" name="series" rules={[{ required: true, message: '请选择品牌' }]}>
                <Select
                  options={courseFormOptions.series.map((item) => ({ label: item, value: item }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="学科" name="subject" rules={[{ required: true, message: '请选择学科' }]}>
                <Select
                  options={courseFormOptions.subject.map((item) => ({
                    label: item,
                    value: item,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="学段" name="educationStage" rules={[{ required: true, message: '请选择学段' }]}>
                <Select
                  options={courseFormOptions.educationStage.map((item) => ({
                    label: item,
                    value: item,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="年级" name="grade" rules={[{ required: true, message: '请选择年级' }]}>
                <Select
                  options={courseFormOptions.grade.map((item) => ({
                    label: item,
                    value: item,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="分册" name="volume" rules={[{ required: true, message: '请选择册别' }]}>
                <Select
                  options={courseFormOptions.volume.map((item) => ({
                    label: item,
                    value: item,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="教材版本" name="textbook" rules={[{ required: true, message: '请选择教材版本' }]}>
                <Select
                  options={courseFormOptions.textbook.map((item) => ({
                    label: item,
                    value: item,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="制作老师" name="researchOwner" rules={[{ required: true, message: '请选择制作老师' }]}>
                <Select options={courseFormOptions.researchOwner.map((item) => ({ label: item, value: item }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="单元/章节" name="chapterName">
                <Input placeholder="请输入单元或章节" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="课件名称" name="title" rules={[{ required: true, message: '请输入课件名称' }]}>
                <Input placeholder="请输入课件名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="订单类型" name="orderType" rules={[{ required: true, message: '请选择订单类型' }]}>
                <Select options={courseFormOptions.orderType.map((item) => ({ label: item, value: item }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="是否B端" name="isBEnd" rules={[{ required: true, message: '请选择是否B端' }]}>
                <Select options={courseFormOptions.isBEnd.map((item) => ({ label: item, value: item }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="教案" name="hasLessonPlan" rules={[{ required: true, message: '请选择教案状态' }]}>
                <Select
                  options={courseFormOptions.hasLessonPlan.map((item) => ({
                    label: item,
                    value: item,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="逐字稿" name="hasScript">
                <Select options={courseFormOptions.hasScript.map((item) => ({ label: item, value: item }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="版权登记（美术）" name="artCopyright" rules={[{ required: true, message: '请选择版权登记状态' }]}>
                <Select
                  options={courseFormOptions.artCopyright.map((item) => ({
                    label: item,
                    value: item,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="版权登记（文字）" name="textCopyright" rules={[{ required: true, message: '请选择版权登记状态' }]}>
                <Select
                  options={courseFormOptions.textCopyright.map((item) => ({
                    label: item,
                    value: item,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="老师预期交稿时间" name="researchDueDate" rules={[{ required: true, message: '请选择老师预期交稿时间' }]}>
                <DatePicker className="control-full-width" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="课件预期交付日期" name="finalDueDate" rules={[{ required: true, message: '请选择课件预期交付日期' }]}>
                <DatePicker className="control-full-width" />
              </Form.Item>
            </Col>
          </Row>

          <Space className="form-footer-actions">
            <Button onClick={handleCloseDrawer}>取消</Button>
            <Button type="primary" htmlType="submit" loading={mutating}>
              {editingCourseId ? '保存' : '创建课件'}
            </Button>
          </Space>
        </Form>
      </Drawer>
    </Card>
  )
}
