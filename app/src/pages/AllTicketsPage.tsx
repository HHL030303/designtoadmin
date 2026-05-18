import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Empty,
  Input,
  Row,
  Col,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  SnippetsOutlined,
} from '@ant-design/icons'
import { taskService } from '../services/taskService'
import type { TaskListRecord, TaskSubTaskRecord } from '../types'
import './AllTicketsPage.css'

type TicketCompletionFilter = 'all' | 'completed' | 'processing'
type TicketBizLineFilter = 'all' | 'b_end' | 'c_end'
type TicketCopyrightFilter =
  | 'all'
  | 'registered_any'
  | 'registered_art'
  | 'registered_text'
  | 'registered_both'
  | 'unregistered'
type TicketServiceFilter =
  | 'all'
  | 'none'
  | 'aftersales'
  | 'iteration'
  | 'aftersales_or_iteration'

const TASK_PAGE_SIZE = 100

function normalizeBooleanLike(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    if (value === 1) {
      return true
    }

    if (value === 0) {
      return false
    }
  }

  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim().toLowerCase()

  if (['true', '1', 'yes', 'y', '是', '有'].includes(normalized)) {
    return true
  }

  if (['false', '0', 'no', 'n', '否', '无'].includes(normalized)) {
    return false
  }

  return undefined
}

function getTextFieldValue(record: TaskListRecord, fieldKey: string): string {
  const value = record.fieldValues[fieldKey]
  return typeof value === 'string' ? value.trim() : ''
}

function getBooleanFieldValue(record: TaskListRecord, fieldKey: string): boolean | undefined {
  return normalizeBooleanLike(record.fieldValues[fieldKey])
}

function hasSubTaskType(subTasks: TaskSubTaskRecord[], type: '售后' | '迭代'): boolean {
  return subTasks.some((subTask) => subTask.subTaskType === type && subTask.status !== 'completed')
}

function getServiceStateText(record: TaskListRecord): string {
  const hasAftersales = hasSubTaskType(record.activeSubTasks, '售后')
  const hasIteration = hasSubTaskType(record.activeSubTasks, '迭代')

  if (hasAftersales && hasIteration) {
    return '售后 / 迭代中'
  }

  if (hasAftersales) {
    return '售后中'
  }

  if (hasIteration) {
    return '迭代中'
  }

  return '无'
}

function getCompletionText(record: TaskListRecord): string {
  return record.status === 'completed' ? '已完成' : '进行中'
}

function getCopyrightText(record: TaskListRecord): string {
  const artRegistered = getBooleanFieldValue(record, 'artCopyright') === true
  const textRegistered = getBooleanFieldValue(record, 'textCopyright') === true

  if (artRegistered && textRegistered) {
    return '美术 / 文字已登记'
  }

  if (artRegistered) {
    return '仅美术已登记'
  }

  if (textRegistered) {
    return '仅文字已登记'
  }

  return '未登记'
}

function getTaskStageText(record: TaskListRecord): string {
  return record.currentStage?.stageName || (record.status === 'completed' ? '已完成' : '未开始')
}

function getStageTagTone(record: TaskListRecord): string {
  if (record.status === 'completed') {
    return 'success'
  }

  const stageName = getTaskStageText(record)

  if (stageName.includes('待') || stageName.includes('入库')) {
    return 'warning'
  }

  return 'info'
}

async function fetchAllTasks(): Promise<TaskListRecord[]> {
  const firstPage = await taskService.listTasks({ page: 1, pageSize: TASK_PAGE_SIZE })
  const totalPages = Math.max(1, Math.ceil(firstPage.total / firstPage.pageSize))

  if (totalPages === 1) {
    return firstPage.items
  }

  const restPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => (
      taskService.listTasks({
        page: index + 2,
        pageSize: firstPage.pageSize,
      })
    )),
  )

  return [firstPage, ...restPages].flatMap((page) => page.items)
}

function resetAllFilters(
  setKeyword: (value: string) => void,
  setStageFilter: (value: string) => void,
  setBizLineFilter: (value: TicketBizLineFilter) => void,
  setCopyrightFilter: (value: TicketCopyrightFilter) => void,
  setCompletionFilter: (value: TicketCompletionFilter) => void,
  setServiceFilter: (value: TicketServiceFilter) => void,
): void {
  setKeyword('')
  setStageFilter('all')
  setBizLineFilter('all')
  setCopyrightFilter('all')
  setCompletionFilter('all')
  setServiceFilter('all')
}

export function AllTicketsPage() {
  const [tickets, setTickets] = useState<TaskListRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [bizLineFilter, setBizLineFilter] = useState<TicketBizLineFilter>('all')
  const [copyrightFilter, setCopyrightFilter] = useState<TicketCopyrightFilter>('all')
  const [completionFilter, setCompletionFilter] = useState<TicketCompletionFilter>('all')
  const [serviceFilter, setServiceFilter] = useState<TicketServiceFilter>('all')
  const deferredKeyword = useDeferredValue(keyword)

  useEffect(() => {
    let mounted = true

    async function loadTickets(): Promise<void> {
      try {
        setLoading(true)
        const items = await fetchAllTasks()

        if (mounted) {
          setTickets(items)
        }
      } catch (error) {
        if (mounted) {
          message.error(error instanceof Error ? error.message : '全部工单加载失败')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void loadTickets()

    return () => {
      mounted = false
    }
  }, [])

  const stageOptions = useMemo(() => {
    const stageNames = Array.from(
      new Set(
        tickets
          .map((ticket) => getTaskStageText(ticket))
          .filter((stageName) => stageName !== ''),
      ),
    )

    return [
      { label: '全部阶段', value: 'all' },
      ...stageNames.map((stageName) => ({
        label: stageName,
        value: stageName,
      })),
    ]
  }, [tickets])

  const filteredTickets = useMemo(() => {
    const normalizedKeyword = deferredKeyword.trim().toLowerCase()

    return tickets.filter((ticket) => {
      const stageText = getTaskStageText(ticket)
      const serviceStateText = getServiceStateText(ticket)
      const completionText = getCompletionText(ticket)
      const isBEnd = getBooleanFieldValue(ticket, 'isBEnd') === true
      const artRegistered = getBooleanFieldValue(ticket, 'artCopyright') === true
      const textRegistered = getBooleanFieldValue(ticket, 'textCopyright') === true

      const matchesKeyword =
        normalizedKeyword.length === 0 ||
        [
          ticket.id,
          ticket.title,
          stageText,
          serviceStateText,
          getTextFieldValue(ticket, 'series'),
          getTextFieldValue(ticket, 'subject'),
          getTextFieldValue(ticket, 'grade'),
          getTextFieldValue(ticket, 'researchOwner'),
          ticket.currentVersion.versionNo,
          ticket.currentStage?.assignees.map((assignee) => assignee.userName).join(' '),
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedKeyword)

      const matchesStage = stageFilter === 'all' ? true : stageText === stageFilter

      const matchesBizLine =
        bizLineFilter === 'all'
          ? true
          : bizLineFilter === 'b_end'
            ? isBEnd
            : !isBEnd

      const matchesCopyright =
        copyrightFilter === 'all'
          ? true
          : copyrightFilter === 'registered_any'
            ? artRegistered || textRegistered
            : copyrightFilter === 'registered_art'
              ? artRegistered
              : copyrightFilter === 'registered_text'
                ? textRegistered
                : copyrightFilter === 'registered_both'
                  ? artRegistered && textRegistered
                  : !artRegistered && !textRegistered

      const matchesCompletion =
        completionFilter === 'all'
          ? true
          : completionFilter === 'completed'
            ? completionText === '已完成'
            : completionText === '进行中'

      const matchesService =
        serviceFilter === 'all'
          ? true
          : serviceFilter === 'none'
            ? serviceStateText === '无'
            : serviceFilter === 'aftersales'
              ? serviceStateText.includes('售后')
              : serviceFilter === 'iteration'
                ? serviceStateText.includes('迭代')
                : serviceStateText !== '无'

      return (
        matchesKeyword &&
        matchesStage &&
        matchesBizLine &&
        matchesCopyright &&
        matchesCompletion &&
        matchesService
      )
    })
  }, [
    bizLineFilter,
    completionFilter,
    copyrightFilter,
    deferredKeyword,
    serviceFilter,
    stageFilter,
    tickets,
  ])

  const summary = useMemo(() => ({
    total: filteredTickets.length,
    completed: filteredTickets.filter((ticket) => ticket.status === 'completed').length,
    bEnd: filteredTickets.filter((ticket) => getBooleanFieldValue(ticket, 'isBEnd') === true).length,
    inService: filteredTickets.filter((ticket) => getServiceStateText(ticket) !== '无').length,
  }), [filteredTickets])

  const summaryCards = useMemo(() => {
    const total = summary.total || 1
    const processing = Math.max(summary.total - summary.completed, 0)
    const pending = summary.inService
    const completedRate = summary.total > 0
      ? `${Math.round((summary.completed / total) * 100)}%`
      : '0%'
    const processingRate = summary.total > 0
      ? `${Math.round((processing / total) * 100)}%`
      : '0%'

    return [
      {
        accent: 'blue',
        caption: '较昨日 +3',
        icon: <SnippetsOutlined />,
        label: '工单总数',
        value: summary.total,
      },
      {
        accent: 'green',
        caption: `完成率 ${completedRate}`,
        icon: <CheckCircleOutlined />,
        label: '已完成',
        value: summary.completed,
      },
      {
        accent: 'cyan',
        caption: `占比 ${processingRate}`,
        icon: <ClockCircleOutlined />,
        label: '进行中',
        value: processing,
      },
      {
        accent: 'orange',
        caption: pending > 0 ? '需关注' : '状态稳定',
        icon: <ExclamationCircleOutlined />,
        label: '待处理',
        value: pending,
      },
    ]
  }, [summary.completed, summary.inService, summary.total])

  const columns: ColumnsType<TaskListRecord> = [
    {
      title: '工单信息',
      dataIndex: 'title',
      width: 280,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Typography.Text strong>{record.title}</Typography.Text>
          <Typography.Text type="secondary">
            #{record.id} · {getTextFieldValue(record, 'series') || '未配置系列'} · {record.currentVersion.versionNo}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '工作流程阶段',
      width: 150,
      render: (_, record) => (
        <Tag className={`all-tickets-page__tag all-tickets-page__tag--${getStageTagTone(record)}`}>
          {getTaskStageText(record)}
        </Tag>
      ),
    },
    {
      title: '当前负责人',
      width: 180,
      render: (_, record) => {
        const assigneeNames = record.currentStage?.assignees.map((assignee) => assignee.userName) ?? []
        return assigneeNames.length > 0 ? assigneeNames.join(' / ') : '-'
      },
    },
    {
      title: 'B端 / C端',
      width: 110,
      render: (_, record) => (
        getBooleanFieldValue(record, 'isBEnd') === true
          ? <Tag className="all-tickets-page__tag all-tickets-page__tag--brand">B端</Tag>
          : <Tag className="all-tickets-page__tag all-tickets-page__tag--muted">C端</Tag>
      ),
    },
    {
      title: '版权登记状态',
      width: 160,
      render: (_, record) => getCopyrightText(record),
    },
    {
      title: '完成状态',
      width: 110,
      render: (_, record) => (
        <Tag
          className={`all-tickets-page__tag ${
            record.status === 'completed'
              ? 'all-tickets-page__tag--success'
              : 'all-tickets-page__tag--info'
          }`}
        >
          {getCompletionText(record)}
        </Tag>
      ),
    },
    {
      title: '售后 / 迭代状态',
      width: 150,
      render: (_, record) => {
        const serviceStateText = getServiceStateText(record)
        const color = serviceStateText === '无'
          ? 'muted'
          : serviceStateText.includes('售后')
            ? 'danger'
            : 'warning'

        return <Tag className={`all-tickets-page__tag all-tickets-page__tag--${color}`}>{serviceStateText}</Tag>
      },
    },
    {
      title: '学科',
      width: 100,
      render: (_, record) => getTextFieldValue(record, 'subject') || '-',
    },
    {
      title: '年级',
      width: 100,
      render: (_, record) => getTextFieldValue(record, 'grade') || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 140,
    },
  ]

  return (
    <Card className="panel-card all-tickets-page-card" bordered={false}>
      <Row gutter={[18, 18]} className="all-tickets-page__stats">
        {summaryCards.map((item) => (
          <Col key={item.label} xs={24} sm={12} xl={6}>
            <div className={`all-tickets-page__stat-card all-tickets-page__stat-card--${item.accent}`}>
              <div className={`all-tickets-page__stat-icon all-tickets-page__stat-icon--${item.accent}`}>
                {item.icon}
              </div>
              <div className="all-tickets-page__stat-content">
                <span className="all-tickets-page__stat-label">{item.label}</span>
                <strong className="all-tickets-page__stat-value">{item.value}</strong>
                <span className={`all-tickets-page__stat-caption all-tickets-page__stat-caption--${item.accent}`}>
                  {item.caption}
                </span>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      <div className="all-tickets-page__filters-card">
        <div className="workspace-filter-bar all-tickets-page__filters">
        <Input
          value={keyword}
          allowClear
          prefix={<SearchOutlined />}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="搜索工单名称 / 编号 / 系列 / 学科 / 负责人"
          className="workspace-filter-input"
        />
        <Select
          value={stageFilter}
          allowClear
          className="workspace-filter-select"
          onClear={() => setStageFilter('all')}
          onChange={setStageFilter}
          options={stageOptions}
        />
        <Select
          value={bizLineFilter}
          allowClear
          className="workspace-filter-select"
          onClear={() => setBizLineFilter('all')}
          onChange={setBizLineFilter}
          options={[
            { label: '全部端口', value: 'all' },
            { label: 'B端', value: 'b_end' },
            { label: 'C端', value: 'c_end' },
          ]}
        />
        <Select
          value={copyrightFilter}
          allowClear
          className="workspace-filter-select"
          onClear={() => setCopyrightFilter('all')}
          onChange={setCopyrightFilter}
          options={[
            { label: '全部版权状态', value: 'all' },
            { label: '有任一版权登记', value: 'registered_any' },
            { label: '仅美术已登记', value: 'registered_art' },
            { label: '仅文字已登记', value: 'registered_text' },
            { label: '双版权已登记', value: 'registered_both' },
            { label: '未登记', value: 'unregistered' },
          ]}
        />
        <Select
          value={completionFilter}
          allowClear
          className="workspace-filter-select"
          onClear={() => setCompletionFilter('all')}
          onChange={setCompletionFilter}
          options={[
            { label: '全部完成状态', value: 'all' },
            { label: '已完成', value: 'completed' },
            { label: '进行中', value: 'processing' },
          ]}
        />
        <Select
          value={serviceFilter}
          allowClear
          className="workspace-filter-select"
          onClear={() => setServiceFilter('all')}
          onChange={setServiceFilter}
          options={[
            { label: '全部售后迭代状态', value: 'all' },
            { label: '无售后 / 迭代', value: 'none' },
            { label: '售后中', value: 'aftersales' },
            { label: '迭代中', value: 'iteration' },
            { label: '售后或迭代中', value: 'aftersales_or_iteration' },
          ]}
        />
        <Button
          className="all-tickets-page__reset-button"
          onClick={() => resetAllFilters(
            setKeyword,
            setStageFilter,
            setBizLineFilter,
            setCopyrightFilter,
            setCompletionFilter,
            setServiceFilter,
          )}
        >
          重置
        </Button>
        </div>
      </div>

      <div className="all-tickets-page__table-shell">
        <Spin spinning={loading}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredTickets}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 1480 }}
          className="all-tickets-page__table"
          locale={{
            emptyText: (
              <div className="all-tickets-page__empty">
                <Empty description="暂无工单数据" />
              </div>
            ),
          }}
        />
        </Spin>
      </div>
    </Card>
  )
}
