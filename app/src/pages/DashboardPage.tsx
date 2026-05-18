import { Card, Col, DatePicker, Empty, Row, Space, Typography, message } from 'antd'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import {
  AlertOutlined,
  CheckCircleOutlined,
  CustomerServiceOutlined,
  FundProjectionScreenOutlined,
} from '@ant-design/icons'
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAppState } from '../context/AppStateContext'
import type { DashboardStats } from '../types'
import {
  dashboardService,
  type DashboardDatasetQueryOverrides,
  type DashboardResolvedDataset,
} from '../services/dashboardService'
import './DashboardPage.css'

interface DashboardMetricRow {
  label: string
  subject: string
  total: number
  completed: number
  pending: number
}

interface DashboardDesignerRow {
  name: string
  shouldComplete: number
  completed: number
  pending: number
}

interface DashboardSubjectRow {
  name: string
  total: number
  completed: number
  pending: number
  processing: number
}

interface DashboardTrendRow {
  name: string
  value: number
}

interface DashboardProgressTotals {
  completed: number
  total: number
}

interface DashboardDateFilter {
  dateFrom: string
  dateTo: string
}

function getCurrentMonthDateFilter(): DashboardDateFilter {
  return {
    dateFrom: dayjs().startOf('month').format('YYYY-MM-DD'),
    dateTo: dayjs().endOf('month').format('YYYY-MM-DD'),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function extractItems(data: unknown): Record<string, unknown>[] {
  if (!isRecord(data) || !Array.isArray(data.items)) {
    return []
  }

  return data.items.filter((item): item is Record<string, unknown> => isRecord(item))
}

function getGroupValue(item: Record<string, unknown>, fieldKey: string): string {
  if (!Array.isArray(item.groups)) {
    return ''
  }

  const match = item.groups.find((group) => (
    isRecord(group) &&
    group.field_key === fieldKey &&
    typeof group.value === 'string'
  ))

  return isRecord(match) && typeof match.value === 'string' ? match.value : ''
}

function getStringField(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = item[key]
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim()
    }
  }

  return ''
}

function getNumberField(item: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = item[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
  }

  return 0
}

function parseMetricRows(data: unknown): DashboardMetricRow[] {
  return extractItems(data)
    .map((item) => {
      const label = getStringField(item, ['grade', 'grade_name']) || getGroupValue(item, 'grade')
      const subject = getStringField(item, ['subject', 'subject_name']) ||
        getGroupValue(item, 'subject')
      const total = getNumberField(item, ['task_total', 'total'])
      const completed = getNumberField(item, ['task_completed', 'completed'])
      const pending = getNumberField(item, ['task_processing', 'processing', 'pending'])

      if (!label && !subject) {
        return null
      }

      return {
        label: label || '-',
        subject: subject || '-',
        total,
        completed,
        pending,
      }
    })
    .filter((item): item is DashboardMetricRow => item !== null)
}

function parseDesignerRows(data: unknown): DashboardDesignerRow[] {
  return extractItems(data)
    .map((item) => {
      const name = getStringField(item, ['user_name', 'name', 'nickname', 'real_name'])
      const shouldComplete = getNumberField(item, ['assigned_count'])
      const completed = getNumberField(item, ['completed_count'])
      const pending = getNumberField(item, ['pending_count'])

      if (!name) {
        return null
      }

      return {
        name,
        shouldComplete,
        completed,
        pending,
      }
    })
    .filter((item): item is DashboardDesignerRow => item !== null)
}

function parseSubjectRows(data: unknown): DashboardSubjectRow[] {
  return extractItems(data)
    .map((item) => {
      const name = getStringField(item, ['subject', 'subject_name']) ||
        getGroupValue(item, 'subject')

      if (!name) {
        return null
      }

      return {
        name,
        total: getNumberField(item, ['total']),
        completed: getNumberField(item, ['completed']),
        pending: getNumberField(item, ['pending']),
        processing: getNumberField(item, ['processing']),
      }
    })
    .filter((item): item is DashboardSubjectRow => item !== null)
    .sort((left, right) => right.total - left.total)
}

function parseTrendRows(data: unknown): DashboardTrendRow[] {
  return extractItems(data)
    .map((item) => {
      const name = getStringField(item, ['stage_name', 'current_stage', 'label', 'name'])
      const value = getNumberField(item, ['processing', 'total', 'count', 'value'])

      if (!name) {
        return null
      }

      return { name, value }
    })
    .filter((item): item is DashboardTrendRow => item !== null)
}

function formatPercent(value: number, total: number): string {
  if (total <= 0) {
    return '0.0%'
  }

  return `${((value / total) * 100).toFixed(1)}%`
}

function getDatasetKey(dataset: Pick<DashboardResolvedDataset, 'apiPath' | 'datasetName'>): string {
  return `${dataset.datasetName}::${dataset.apiPath}`
}

function sumMetricRows(rows: DashboardMetricRow[]): DashboardProgressTotals {
  return rows.reduce<DashboardProgressTotals>((result, row) => ({
    completed: result.completed + row.completed,
    total: result.total + row.total,
  }), { completed: 0, total: 0 })
}

function getProgressPercent(completed: number, total: number): number {
  if (total <= 0) {
    return 0
  }

  return Math.round((completed / total) * 100)
}

function isFilterableDataset(dataset: DashboardResolvedDataset): boolean {
  return (
    dataset.apiPath.includes('/current_stage') ||
    dataset.apiPath.includes('/user_workload') ||
    dataset.datasetName.includes('B端交付进度') ||
    dataset.datasetName === '学科分布' ||
    dataset.datasetName.includes('趋势') ||
    dataset.datasetName.includes('在制量') ||
    dataset.apiPath.includes('/stage_trend') ||
    dataset.apiPath.includes('/stage/stat')
  )
}

function buildDateQueryOverrides(
  datasets: DashboardResolvedDataset[],
  dateFilters: Record<string, DashboardDateFilter>,
): DashboardDatasetQueryOverrides {
  return datasets.reduce<DashboardDatasetQueryOverrides>((result, dataset) => {
    if (!isFilterableDataset(dataset)) {
      return result
    }

    const datasetKey = getDatasetKey(dataset)
    const filter = dateFilters[datasetKey]
    if (!filter?.dateFrom && !filter?.dateTo) {
      return result
    }

    result[datasetKey] = {
      ...(filter.dateFrom ? { date_from: filter.dateFrom } : {}),
      ...(filter.dateTo ? { date_to: filter.dateTo } : {}),
    }

    return result
  }, {})
}

function TableDateFilter({
  dateFilter,
  onDateRangeChange,
}: {
  dateFilter: DashboardDateFilter
  onDateRangeChange: (dateFrom: string, dateTo: string) => void
}) {
  const value: [Dayjs | null, Dayjs | null] = [
    dateFilter.dateFrom ? dayjs(dateFilter.dateFrom, 'YYYY-MM-DD') : null,
    dateFilter.dateTo ? dayjs(dateFilter.dateTo, 'YYYY-MM-DD') : null,
  ]

  return (
    <div className="dashboard-table-filter">
      <DatePicker.RangePicker
        value={value}
        format="YYYY-MM-DD"
        allowEmpty={[true, true]}
        className="dashboard-table-range-picker"
        placeholder={['开始时间', '截止时间']}
        onChange={(_, dateStrings) => {
          let [dateFrom, dateTo] = dateStrings

          if (dateFrom === '' && dateTo === '') {
            const currentMonth = getCurrentMonthDateFilter()
            dateFrom = currentMonth.dateFrom
            dateTo = currentMonth.dateTo
          }

          onDateRangeChange(dateFrom, dateTo)
        }}
      />
    </div>
  )
}

function DashboardChartFrame({
  children,
}: {
  children: (size: { width: number; height: number }) => ReactNode
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ width: 0, height: 280 })

  useEffect(() => {
    const node = containerRef.current
    if (!node) {
      return
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) {
        return
      }

      const nextWidth = Math.floor(entry.contentRect.width)
      const nextHeight = Math.floor(entry.contentRect.height)
      if (nextWidth > 0 && nextHeight > 0) {
        setSize({ width: nextWidth, height: nextHeight })
      }
    })

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} className="dashboard-chart-box">
      {size.width > 0 && size.height > 0 ? children(size) : null}
    </div>
  )
}

function DashboardSummaryCard({
  accent,
  caption,
  hint,
  icon,
  label,
  value,
}: {
  accent: 'blue' | 'green' | 'orange' | 'violet'
  caption: string
  hint: string
  icon: ReactNode
  label: string
  value: number
}) {
  return (
    <div className={`dashboard-summary-card dashboard-summary-card--${accent}`}>
      <div className={`dashboard-summary-card__icon dashboard-summary-card__icon--${accent}`}>
        {icon}
      </div>
      <div className="dashboard-summary-card__content">
        <span className="dashboard-summary-card__label">{label}</span>
        <strong className="dashboard-summary-card__value">{value}</strong>
        <span className="dashboard-summary-card__hint">{hint}</span>
      </div>
      <div className={`dashboard-summary-card__footer dashboard-summary-card__footer--${accent}`}>
        {caption}
      </div>
    </div>
  )
}

function DashboardOverviewProgress({
  items,
}: {
  items: Array<{
    accent: 'green' | 'blue' | 'violet'
    completed: number
    label: string
    percent: number
    total: number
  }>
}) {
  // const totalWeight = items.reduce((sum, item) => sum + item.total, 0)

  return (
    <Card className="dashboard-overview-progress-card" bordered={false}>
      {/* <div className="dashboard-overview-progress__header">
        <Typography.Title level={4} className="dashboard-overview-progress__title">
          本月综合进度
        </Typography.Title>
        <Typography.Text className="dashboard-overview-progress__helper">
          基于教研、设计、成品三块任务的完成度前端汇总计算
        </Typography.Text>
      </div> */}
      {/* <div className="dashboard-overview-progress__bar">
        {items.map((item) => {
          const width = totalWeight > 0 ? `${(item.total / totalWeight) * 100}%` : `${100 / items.length}%`
          const fillWidth = `${item.percent}%`

          return (
            <div key={item.label} className="dashboard-overview-progress__segment" style={{ width }}>
              <div
                className={`dashboard-overview-progress__segment-fill dashboard-overview-progress__segment-fill--${item.accent}`}
                style={{ width: fillWidth }}
              />
            </div>
          )
        })}
      </div> */}
      <div className="dashboard-overview-progress__legend">
        {items.map((item) => (
          <div key={item.label} className="dashboard-overview-progress__legend-item">
            <span
              className={`dashboard-overview-progress__legend-dot dashboard-overview-progress__legend-dot--${item.accent}`}
            />
            <span className="dashboard-overview-progress__legend-label">{item.label}</span>
            <span className="dashboard-overview-progress__legend-value">
              {item.completed}/{item.total}
            </span>
            <span className="dashboard-overview-progress__legend-percent">{item.percent}%</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function ProgressSummaryCard({
  dateFilter,
  title,
  helper,
  onDateRangeChange,
  rows,
}: {
  dateFilter: DashboardDateFilter
  title: string
  helper: string
  onDateRangeChange: (dateFrom: string, dateTo: string) => void
  rows: DashboardMetricRow[]
}) {
  return (
    <Card
      title={title}
      extra={(
        <TableDateFilter dateFilter={dateFilter} onDateRangeChange={onDateRangeChange} />
      )}
      className="dashboard-static-card dashboard-static-card-lg"
    >
      <Space orientation="vertical" size={16} className="dashboard-stack">
        <Typography.Text type="secondary">{helper}</Typography.Text>
        {rows.length === 0 ? (
          <div className="dashboard-empty-state">
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />
          </div>
        ) : (
          <div className="dashboard-static-table-scroll">
            <div className="dashboard-static-table">
              <div className="dashboard-static-table-head dashboard-static-table-metric">
                <span>年级</span>
                <span>学科</span>
                <span>总数</span>
                <span>已完成</span>
                <span>待完成</span>
              </div>
              {rows.map((row) => (
                <div
                  key={`${title}-${row.label}-${row.subject}`}
                  className="dashboard-static-table-row dashboard-static-table-metric"
                >
                  <span>{row.label}</span>
                  <span>{row.subject}</span>
                  <span>{row.total}</span>
                  <span className="dashboard-static-text-success">{row.completed}</span>
                  <span className="dashboard-static-text-accent">{row.pending}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Space>
    </Card>
  )
}

function DesignerWorkloadCard({
  dateFilter,
  title,
  helper,
  onDateRangeChange,
  rows,
}: {
  dateFilter: DashboardDateFilter
  title: string
  helper: string
  onDateRangeChange: (dateFrom: string, dateTo: string) => void
  rows: DashboardDesignerRow[]
}) {
  return (
    <Card
      title={title}
      extra={(
        <TableDateFilter dateFilter={dateFilter} onDateRangeChange={onDateRangeChange} />
      )}
      className="dashboard-static-card"
    >
      <Space orientation="vertical" size={16} className="dashboard-stack">
        <Typography.Text type="secondary">{helper}</Typography.Text>
        {rows.length === 0 ? (
          <div className="dashboard-empty-state">
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />
          </div>
        ) : (
          <div className="dashboard-static-table-scroll">
            <div className="dashboard-static-table">
              <div className="dashboard-static-table-head dashboard-static-table-designer">
                <span>姓名</span>
                <span>应完成</span>
                <span>已完成</span>
                <span>待完成</span>
              </div>
              {rows.map((row) => (
                <div
                  key={`${title}-${row.name}`}
                  className="dashboard-static-table-row dashboard-static-table-designer"
                >
                  <span>{row.name}</span>
                  <span>{row.shouldComplete}</span>
                  <span className="dashboard-static-text-success">{row.completed}</span>
                  <span className="dashboard-static-text-accent">{row.pending}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Space>
    </Card>
  )
}

export function DashboardPage() {
  const { stats } = useAppState()
  const [summaryStats, setSummaryStats] = useState<DashboardStats>(stats)
  const [datasets, setDatasets] = useState<DashboardResolvedDataset[]>([])
  const [dateFilters, setDateFilters] = useState<Record<string, DashboardDateFilter>>({})

  useEffect(() => {
    let mounted = true

    async function loadDashboardData() {
      try {
        const [summary, resolvedDatasets] = await Promise.all([
          dashboardService.getSummary(),
          dashboardService.getResolvedDatasets(),
        ])

        if (mounted) {
          setSummaryStats(summary)
          setDatasets(resolvedDatasets)
        }
      } catch (error) {
        if (mounted) {
          message.error(error instanceof Error ? error.message : '总览统计加载失败')
        }
      }
    }

    void loadDashboardData()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (datasets.length === 0) {
      return
    }

    let mounted = true

    async function reloadDatasets(): Promise<void> {
      try {
        const queryOverrides = buildDateQueryOverrides(datasets, dateFilters)
        const resolvedDatasets = await dashboardService.getResolvedDatasets(queryOverrides)

        if (mounted) {
          setDatasets(resolvedDatasets)
        }
      } catch (error) {
        if (mounted) {
          message.error(error instanceof Error ? error.message : '总览统计加载失败')
        }
      }
    }

    void reloadDatasets()

    return () => {
      mounted = false
    }
  }, [dateFilters])

  function handleDateRangeChange(
    datasetKey: string,
    dateFrom: string,
    dateTo: string,
  ): void {
    setDateFilters((current) => ({
      ...current,
      [datasetKey]: {
        dateFrom,
        dateTo,
      },
    }))
  }

  const datasetCards = useMemo(() => (
    datasets.map((dataset) => {
      const datasetKey = getDatasetKey(dataset)
      const dateFilter = dateFilters[datasetKey] ?? { dateFrom: '', dateTo: '' }

      if (dataset.apiPath.includes('/current_stage')) {
        return (
          <ProgressSummaryCard
            key={`${dataset.datasetName}-${dataset.apiPath}`}
            dateFilter={dateFilter}
            title={dataset.datasetName}
            helper="基于统计配置实时拉取，展示当前分组任务进度。"
            onDateRangeChange={(dateFrom, dateTo) => (
              handleDateRangeChange(datasetKey, dateFrom, dateTo)
            )}
            rows={parseMetricRows(dataset.data)}
          />
        )
      }

      if (dataset.datasetName.includes('B端交付进度')) {
        return (
          <ProgressSummaryCard
            key={`${dataset.datasetName}-${dataset.apiPath}`}
            dateFilter={dateFilter}
            title={dataset.datasetName}
            helper="基于统计配置实时拉取，展示 B 端任务当前分组进度。"
            onDateRangeChange={(dateFrom, dateTo) => (
              handleDateRangeChange(datasetKey, dateFrom, dateTo)
            )}
            rows={parseMetricRows(dataset.data)}
          />
        )
      }

      if (dataset.apiPath.includes('/user_workload')) {
        return (
          <DesignerWorkloadCard
            key={`${dataset.datasetName}-${dataset.apiPath}`}
            dateFilter={dateFilter}
            title={dataset.datasetName}
            helper="基于统计配置实时拉取，展示设计师任务承接与完成情况。"
            onDateRangeChange={(dateFrom, dateTo) => (
              handleDateRangeChange(datasetKey, dateFrom, dateTo)
            )}
            rows={parseDesignerRows(dataset.data)}
          />
        )
      }

      if (dataset.datasetName === '学科分布') {
        const subjectRows = parseSubjectRows(dataset.data)

        return (
          <Card
            key={`${dataset.datasetName}-${dataset.apiPath}`}
            className="dashboard-static-card dashboard-static-card-tall"
            title="学科任务分布"
            extra={(
              <TableDateFilter
                dateFilter={dateFilter}
                onDateRangeChange={(dateFrom, dateTo) => (
                  handleDateRangeChange(datasetKey, dateFrom, dateTo)
                )}
              />
            )}
          >
            <Space orientation="vertical" size={16} className="dashboard-stack">
              <Typography.Text type="secondary" className="dashboard-subject-helper">
                基于当月 B 端任务按学科聚合，展示总量占比与状态明细。
              </Typography.Text>
              <div className="dashboard-subject-list dashboard-subject-list-scroll">
                {subjectRows.length === 0 ? (
                  <div className="dashboard-empty-state">
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />
                  </div>
                ) : null}
                {subjectRows.map((item) => {
                  const completedPercent = formatPercent(item.completed, item.total)
                  const processingPercent = formatPercent(item.processing, item.total)
                  const pendingPercent = formatPercent(item.pending, item.total)

                  return (
                    <div key={item.name} className="dashboard-subject-panel">
                      <div className="dashboard-subject-head">
                        <Typography.Title level={3} className="dashboard-subject-name">
                          {item.name}
                        </Typography.Title>
                        <div className="dashboard-subject-total">
                          <span className="dashboard-subject-total-label">总数</span>
                          <span className="dashboard-subject-total-value">{item.total}</span>
                        </div>
                      </div>
                      <div className="dashboard-subject-bar">
                        <div
                          className="dashboard-subject-bar-segment dashboard-subject-bar-completed"
                          style={{ width: completedPercent }}
                        />
                        <div
                          className="dashboard-subject-bar-segment dashboard-subject-bar-processing"
                          style={{ width: processingPercent }}
                        />
                        <div
                          className="dashboard-subject-bar-segment dashboard-subject-bar-pending"
                          style={{ width: pendingPercent }}
                        />
                      </div>
                      <div className="dashboard-subject-percent-row">
                        <span className="dashboard-subject-percent dashboard-subject-percent-completed">
                          {completedPercent}
                        </span>
                        <span className="dashboard-subject-percent dashboard-subject-percent-processing">
                          {processingPercent}
                        </span>
                        <span className="dashboard-subject-percent dashboard-subject-percent-pending">
                          {pendingPercent}
                        </span>
                      </div>
                      <div className="dashboard-subject-stats">
                        <div className="dashboard-subject-stat">
                          <span className="dashboard-subject-stat-dot dashboard-subject-dot-completed" />
                          <span className="dashboard-subject-stat-label">已完成</span>
                          <span className="dashboard-subject-stat-value dashboard-subject-stat-value-completed">
                            {item.completed}
                          </span>
                        </div>
                        <div className="dashboard-subject-stat">
                          <span className="dashboard-subject-stat-dot dashboard-subject-dot-processing" />
                          <span className="dashboard-subject-stat-label">处理中</span>
                          <span className="dashboard-subject-stat-value dashboard-subject-stat-value-processing">
                            {item.processing}
                          </span>
                        </div>
                        <div className="dashboard-subject-stat">
                          <span className="dashboard-subject-stat-dot dashboard-subject-dot-pending" />
                          <span className="dashboard-subject-stat-label">未开始</span>
                          <span className="dashboard-subject-stat-value dashboard-subject-stat-value-pending">
                            {item.pending}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Space>
          </Card>
        )
      }

      if (
        dataset.datasetName.includes('趋势') ||
        dataset.datasetName.includes('在制量') ||
        dataset.apiPath.includes('/stage_trend') ||
        dataset.apiPath.includes('/stage/stat')
      ) {
        const trendRows = parseTrendRows(dataset.data)

        return (
          <Card
            key={`${dataset.datasetName}-${dataset.apiPath}`}
            title={dataset.datasetName}
            extra={(
              <TableDateFilter
                dateFilter={dateFilter}
                onDateRangeChange={(dateFrom, dateTo) => (
                  handleDateRangeChange(datasetKey, dateFrom, dateTo)
                )}
              />
            )}
            className="dashboard-static-card"
          >
            <Space orientation="vertical" size={16} className="dashboard-stack">
              <Typography.Text type="secondary">
                基于统计配置实时拉取，展示流程阶段在制量趋势。
              </Typography.Text>
              {trendRows.length === 0 ? (
                <div className="dashboard-empty-state">
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />
                </div>
              ) : (
                <DashboardChartFrame>
                  {({ width, height }) => (
                    <LineChart width={width} height={height} data={trendRows}>
                      <CartesianGrid stroke="#e5e7eb" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#2563eb"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#2563eb' }}
                      />
                    </LineChart>
                  )}
                </DashboardChartFrame>
              )}
            </Space>
          </Card>
        )
      }

      return null
    })
  ), [dateFilters, datasets])

  const progressOverview = useMemo(() => {
    const researchDataset = datasets.find((dataset) => dataset.datasetName.includes('本月教研进度'))
    const designDataset = datasets.find((dataset) => dataset.datasetName.includes('本月设计进度'))
    const finalDataset = datasets.find((dataset) => dataset.datasetName.includes('本月成品进度'))

    const researchTotals = sumMetricRows(parseMetricRows(researchDataset?.data))
    const designTotals = sumMetricRows(parseMetricRows(designDataset?.data))
    const finalTotals = sumMetricRows(parseMetricRows(finalDataset?.data))

    return [
      {
        accent: 'green' as const,
        completed: researchTotals.completed,
        label: '教研进度',
        percent: getProgressPercent(researchTotals.completed, researchTotals.total),
        total: researchTotals.total,
      },
      {
        accent: 'blue' as const,
        completed: designTotals.completed,
        label: '设计进度',
        percent: getProgressPercent(designTotals.completed, designTotals.total),
        total: designTotals.total,
      },
      {
        accent: 'violet' as const,
        completed: finalTotals.completed,
        label: '成品进度',
        percent: getProgressPercent(finalTotals.completed, finalTotals.total),
        total: finalTotals.total,
      },
    ]
  }, [datasets])

  return (
    <Space orientation="vertical" size={18} className="dashboard-stack dashboard-page-shell">
      <Row gutter={[18, 18]}>
        <Col xs={24} md={12} xl={6}>
          <DashboardSummaryCard
            accent="blue"
            caption="实时汇总统计"
            hint="课件总量"
            icon={<FundProjectionScreenOutlined />}
            label="课件总量"
            value={summaryStats.total}
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <DashboardSummaryCard
            accent="green"
            caption="实时在制统计"
            hint="处理中"
            icon={<CheckCircleOutlined />}
            label="处理中"
            value={summaryStats.active}
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <DashboardSummaryCard
            accent="orange"
            caption="实时风险统计"
            hint="逾期预警"
            icon={<AlertOutlined />}
            label="逾期预警"
            value={summaryStats.overdue}
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <DashboardSummaryCard
            accent="violet"
            caption="实时服务统计"
            hint="售后/迭代"
            icon={<CustomerServiceOutlined />}
            label="售后/迭代"
            value={summaryStats.archived}
          />
        </Col>
      </Row>

      <DashboardOverviewProgress items={progressOverview} />

      <div className="dashboard-static-grid">{datasetCards}</div>
    </Space>
  )
}
