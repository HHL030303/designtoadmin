import { Card, Col, DatePicker, Empty, Row, Space, Tag, Typography, message } from 'antd'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import datePickerZhCN from 'antd/es/date-picker/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
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

dayjs.locale('zh-cn')

type DashboardStaticTableCellTone = 'accent' | 'success'

interface DashboardStaticTableCell {
  tone?: DashboardStaticTableCellTone
  value: number | string
}

interface DashboardStaticTableColumn {
  key: string
  label: string
}

interface DashboardStaticTableData {
  columns: DashboardStaticTableColumn[]
  rows: DashboardStaticTableCell[][]
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

function extractUnknownItems(data: unknown): unknown[] {
  if (!isRecord(data) || !Array.isArray(data.items)) {
    return []
  }

  return data.items
}

function getLabelText(label: unknown): string {
  if (typeof label === 'string') {
    return label.trim()
  }

  if (isRecord(label)) {
    return getStringField(label, ['label', 'name', 'title', 'value'])
  }

  return ''
}

function extractLabelColumns(data: unknown): DashboardStaticTableColumn[] {
  if (!isRecord(data) || !('labels' in data)) {
    return []
  }

  if (Array.isArray(data.labels)) {
    return data.labels
      .map((label) => getLabelText(label))
      .filter((label) => label !== '')
      .map((label) => ({
        key: label,
        label,
      }))
  }

  if (!isRecord(data.labels)) {
    return []
  }

  return Object.entries(data.labels).reduce<DashboardStaticTableColumn[]>((result, [key, value]) => {
    const label = getLabelText(value)

    if (!label) {
      return result
    }

    result.push({
      key,
      label,
    })
    return result
  }, [])
}

function normalizeLabel(label: string): string {
  return label.replace(/\s+/g, '').toLowerCase()
}

function toDisplayValue(value: unknown): number | string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    return value.trim()
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }

  return '-'
}

function getCellTone(label: string): DashboardStaticTableCellTone | undefined {
  const normalizedLabel = normalizeLabel(label)

  if (['已完成', '完成数', '完成量'].includes(normalizedLabel)) {
    return 'success'
  }

  if (['待完成', '未完成', '处理中', '进行中', '未开始'].includes(normalizedLabel)) {
    return 'accent'
  }

  return undefined
}

function getDesignerValueByLabel(item: Record<string, unknown>, label: string): number | string {
  const normalizedLabel = normalizeLabel(label)

  if (
    normalizedLabel.includes('姓名') ||
    normalizedLabel.includes('设计师') ||
    normalizedLabel.includes('成员')
  ) {
    return getStringField(item, ['user_name', 'name', 'nickname', 'real_name']) || '-'
  }

  if (normalizedLabel.includes('应完成') || normalizedLabel.includes('分配')) {
    return getNumberField(item, ['assigned_count'])
  }

  if (normalizedLabel === '已完成' || normalizedLabel.includes('完成数')) {
    return getNumberField(item, ['completed_count'])
  }

  if (
    normalizedLabel === '待完成' ||
    normalizedLabel === '未完成' ||
    normalizedLabel.includes('处理中') ||
    normalizedLabel.includes('进行中')
  ) {
    return getNumberField(item, ['pending_count'])
  }

  return '-'
}

function buildStaticTableData(
  data: unknown,
  fallbackHeaders: string[],
  resolveFallbackValue: (item: Record<string, unknown>, label: string) => number | string,
): DashboardStaticTableData {
  const columnsFromApi = extractLabelColumns(data)
  const effectiveColumns =
    columnsFromApi.length > 0
      ? columnsFromApi
      : fallbackHeaders.map((label) => ({
          key: label,
          label,
        }))

  const rows = extractUnknownItems(data).reduce<DashboardStaticTableCell[][]>((result, item) => {
    let row: DashboardStaticTableCell[] | null = null

    if (Array.isArray(item)) {
      row = effectiveColumns.map((column, index) => ({
        tone: getCellTone(column.label),
        value: toDisplayValue(item[index]),
      }))
    } else if (isRecord(item)) {
      row = effectiveColumns.map((column) => ({
        tone: getCellTone(column.label),
        value:
          column.key in item
            ? toDisplayValue(item[column.key])
            : resolveFallbackValue(item, column.label),
      }))
    }

    if (row !== null) {
      result.push(row)
    }

    return result
  }, [])

  return {
    columns: effectiveColumns,
    rows,
  }
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

function getTotalValueByHeader(label: string, value: number | string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0
  }

  const normalizedLabel = normalizeLabel(label)

  if (
    normalizedLabel.includes('总数') ||
    normalizedLabel.includes('总量') ||
    normalizedLabel.includes('应完成') ||
    normalizedLabel.includes('分配')
  ) {
    return value
  }

  return 0
}

function getCompletedValueByHeader(label: string, value: number | string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0
  }

  const normalizedLabel = normalizeLabel(label)
  if (normalizedLabel === '已完成' || normalizedLabel.includes('完成数')) {
    return value
  }

  return 0
}

function summarizeStaticTableData(tableData: DashboardStaticTableData): DashboardProgressTotals {
  return tableData.rows.reduce<DashboardProgressTotals>((result, row) => {
    row.forEach((cell, index) => {
      const header = tableData.columns[index]?.label ?? ''
      result.completed += getCompletedValueByHeader(header, cell.value)
      result.total += getTotalValueByHeader(header, cell.value)
    })

    return result
  }, { completed: 0, total: 0 })
}

function buildStaticTableGridStyle(columnCount: number): CSSProperties {
  if (columnCount <= 1) {
    return {
      gridTemplateColumns: 'minmax(0, 1fr)',
    }
  }

  const columnWidths = Array.from({ length: columnCount }, (_, index) => (
    index === 0 ? 'minmax(60px, 1.2fr)' : 'minmax(52px, 0.8fr)'
  ))

  return {
    gridTemplateColumns: columnWidths.join(' '),
  }
}

function DashboardCardTitle({
  title,
  totals,
}: {
  title: string
  totals: DashboardProgressTotals
}) {
  const percent = getProgressPercent(totals.completed, totals.total)

  return (
    <div className="dashboard-card-title">
      <span className="dashboard-card-title__text">{title}</span>
      <Tag className="dashboard-card-title__tag dashboard-card-title__tag--value" bordered={false}>
        <span className="dashboard-card-title__metric-value">
          {totals.completed}/{totals.total}
        </span>
      </Tag>
      <Tag className="dashboard-card-title__tag dashboard-card-title__tag--percent" bordered={false}>
        <span className="dashboard-card-title__metric-percent">{percent}%</span>
      </Tag>
    </div>
  )
}

function getDatasetKey(dataset: Pick<DashboardResolvedDataset, 'apiPath' | 'datasetName'>): string {
  return `${dataset.datasetName}::${dataset.apiPath}`
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
    dateFilter.dateFrom ? dayjs(dateFilter.dateFrom, 'YYYY-MM-DD').locale('zh-cn') : null,
    dateFilter.dateTo ? dayjs(dateFilter.dateTo, 'YYYY-MM-DD').locale('zh-cn') : null,
  ]

  return (
    <div className="dashboard-table-filter">
      <DatePicker.RangePicker
        value={value}
        locale={datePickerZhCN}
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

// function DashboardOverviewProgress({
//   items,
// }: {
//   items: Array<{
//     accent: 'green' | 'blue' | 'violet'
//     completed: number
//     label: string
//     percent: number
//     total: number
//   }>
// }) {
//   // const totalWeight = items.reduce((sum, item) => sum + item.total, 0)

//   return (
//     <Card className="dashboard-overview-progress-card" bordered={false}>
//       {/* <div className="dashboard-overview-progress__header">
//         <Typography.Title level={4} className="dashboard-overview-progress__title">
//           本月综合进度
//         </Typography.Title>
//         <Typography.Text className="dashboard-overview-progress__helper">
//           基于教研、设计、成品三块任务的完成度前端汇总计算
//         </Typography.Text>
//       </div> */}
//       {/* <div className="dashboard-overview-progress__bar">
//         {items.map((item) => {
//           const width = totalWeight > 0 ? `${(item.total / totalWeight) * 100}%` : `${100 / items.length}%`
//           const fillWidth = `${item.percent}%`

//           return (
//             <div key={item.label} className="dashboard-overview-progress__segment" style={{ width }}>
//               <div
//                 className={`dashboard-overview-progress__segment-fill dashboard-overview-progress__segment-fill--${item.accent}`}
//                 style={{ width: fillWidth }}
//               />
//             </div>
//           )
//         })}
//       </div> */}
//       <div className="dashboard-overview-progress__legend">
//         {items.map((item) => (
//           <div key={item.label} className="dashboard-overview-progress__legend-item">
//             <span
//               className={`dashboard-overview-progress__legend-dot dashboard-overview-progress__legend-dot--${item.accent}`}
//             />
//             <span className="dashboard-overview-progress__legend-label">{item.label}</span>
//             <span className="dashboard-overview-progress__legend-value">
//               {item.completed}/{item.total}
//             </span>
//             <span className="dashboard-overview-progress__legend-percent">{item.percent}%</span>
//           </div>
//         ))}
//       </div>
//     </Card>
//   )
// }

function DesignerWorkloadCard({
  data,
  dateFilter,
  title,
  onDateRangeChange,
}: {
  data: unknown
  dateFilter: DashboardDateFilter
  title: string
  onDateRangeChange: (dateFrom: string, dateTo: string) => void
}) {
  const tableData = buildStaticTableData(
    data,
    ['姓名', '应完成', '已完成', '待完成'],
    getDesignerValueByLabel,
  )
  const totals = summarizeStaticTableData(tableData)
  const tableGridStyle = buildStaticTableGridStyle(tableData.columns.length)

  return (
    <Card
      title={<DashboardCardTitle title={title} totals={totals} />}
      extra={(
        <TableDateFilter dateFilter={dateFilter} onDateRangeChange={onDateRangeChange} />
      )}
      className="dashboard-static-card"
    >
      <Space orientation="vertical" size={16} className="dashboard-stack">
        {tableData.rows.length === 0 ? (
          <div className="dashboard-empty-state">
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />
          </div>
        ) : (
          <div className="dashboard-static-table-scroll">
            <div className="dashboard-static-table">
              <div className="dashboard-static-table-head" style={tableGridStyle}>
                {tableData.columns.map((column) => (
                  <span key={`${title}-${column.key}`}>{column.label}</span>
                ))}
              </div>
              {tableData.rows.map((row, rowIndex) => (
                <div
                  key={`${title}-${rowIndex}`}
                  className="dashboard-static-table-row"
                  style={tableGridStyle}
                >
                  {row.map((cell, cellIndex) => (
                    <span
                      key={`${title}-${rowIndex}-${cellIndex}`}
                      className={
                        cell.tone === 'success'
                          ? 'dashboard-static-text-success'
                          : cell.tone === 'accent'
                            ? 'dashboard-static-text-accent'
                            : undefined
                      }
                    >
                      {cell.value}
                    </span>
                  ))}
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
      // if (dataset.apiPath.includes('/current_stage')) {
      //   return (
      //     <ProgressSummaryCard
      //       key={`${dataset.datasetName}-${dataset.apiPath}`}
      //       data={dataset.data}
      //       dateFilter={dateFilter}
      //       title={dataset.datasetName}
      //       onDateRangeChange={(dateFrom, dateTo) => (
      //         handleDateRangeChange(datasetKey, dateFrom, dateTo)
      //       )}
      //     />
      //   )
      // }

      // if (dataset.datasetName.includes('B端交付进度')) {
      //   return (
      //     <ProgressSummaryCard
      //       key={`${dataset.datasetName}-${dataset.apiPath}`}
      //       data={dataset.data}
      //       dateFilter={dateFilter}
      //       title={dataset.datasetName}
      //       onDateRangeChange={(dateFrom, dateTo) => (
      //         handleDateRangeChange(datasetKey, dateFrom, dateTo)
      //       )}
      //     />
      //   )
      // }

      // if (dataset.apiPath.includes('/user_workload')) {
      //   return (
      //     <DesignerWorkloadCard
      //       key={`${dataset.datasetName}-${dataset.apiPath}`}
      //       data={dataset.data}
      //       dateFilter={dateFilter}
      //       title={dataset.datasetName}
      //       onDateRangeChange={(dateFrom, dateTo) => (
      //         handleDateRangeChange(datasetKey, dateFrom, dateTo)
      //       )}
      //     />
      //   )
      // }

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
              {/* <Typography.Text type="secondary" className="dashboard-subject-helper">
                基于当月 B 端任务按学科聚合，展示总量占比与状态明细。
              </Typography.Text> */}
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
              {/* <Typography.Text type="secondary">
                基于统计配置实时拉取，展示流程阶段在制量趋势。
              </Typography.Text> */}
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
      } else{
        return (
          <DesignerWorkloadCard
            key={`${dataset.datasetName}-${dataset.apiPath}`}
            data={dataset.data}
            dateFilter={dateFilter}
            title={dataset.datasetName}
            onDateRangeChange={(dateFrom, dateTo) => (
              handleDateRangeChange(datasetKey, dateFrom, dateTo)
            )}
          />
        )
      }


      return null
    })
  ), [dateFilters, datasets])

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
      <div className="dashboard-static-grid">{datasetCards}</div>
    </Space>
  )
}
