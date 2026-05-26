import { useEffect, useMemo, useState } from 'react'
import { Button, Card, DatePicker, Empty, Select, Table, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { TablePaginationConfig } from 'antd/es/table'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { useLocation, useSearchParams } from 'react-router-dom'
import { roleOptions } from '../constants/roles'
import { statisticsService } from '../services/statisticsService'
import { backendRoleMap } from '../constants/roles'
import './TaskStatisticsPage.css'

type TaskStatisticsRow = Record<string, unknown> & {
  __rowKey: string
}

interface TaskStatisticsFilters {
  dateFrom: string
  dateTo: string
  roleCode?: string
}

function getCurrentMonthFilters(): TaskStatisticsFilters {
  return {
    dateFrom: dayjs().startOf('month').format('YYYY-MM-DD'),
    dateTo: dayjs().endOf('month').format('YYYY-MM-DD'),
    roleCode: undefined,
  }
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    return value.length === 0 ? '-' : value.map((item) => formatCellValue(item)).join('、')
  }

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function buildRowKey(record: Record<string, unknown>, index: number): string {
  const candidateKeys = ['id', 'user_id', 'task_id', 'workload_id']

  for (const key of candidateKeys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim() !== '') {
      return value
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value)
    }
  }

  return `row-${index}`
}

function getBackendRoleCode(appRoleKey: string): string {
  const matchedEntry = Object.entries(backendRoleMap).find(([, value]) => value === appRoleKey)
  return matchedEntry?.[0] ?? appRoleKey
}

export function TaskStatisticsPage() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<TaskStatisticsRow[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<TaskStatisticsFilters>(getCurrentMonthFilters)
  const isCustomStatisticsPage = location.pathname.startsWith('/task-statistics/custom/')
  const pageTitle = searchParams.get('menu_name')?.trim() || '任务明细'

  async function loadStatistics(
    nextFilters: TaskStatisticsFilters,
    options?: {
      page?: number
      pageSize?: number
    },
  ): Promise<void> {
    try {
      setLoading(true)
      const response = await statisticsService.getUserWorkload({
        ...nextFilters,
        page: options?.page ?? currentPage,
        pageSize: options?.pageSize ?? pageSize,
      })
      setRows(
        response.items.map((item, index) => ({
          ...item,
          __rowKey: buildRowKey(item, index),
        })),
      )
      setCurrentPage(response.page)
      setPageSize(response.pageSize)
      setTotal(response.total)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '任务明细加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadStatistics(filters, { page: 1, pageSize })
  }, [])

  const roleSelectOptions = useMemo(() => (
    roleOptions.map((item) => ({
      label: item.label,
      value: getBackendRoleCode(item.key),
    }))
  ), [])

  const columns = useMemo<ColumnsType<TaskStatisticsRow>>(() => ([
    {
      dataIndex: 'user_name',
      key: 'user_name',
      title: '用户姓名',
      width: 180,
      render: (value: unknown) => formatCellValue(value),
    },
    {
      dataIndex: 'assigned_count',
      key: 'assigned_count',
      title: '分配任务',
      width: 140,
      render: (value: unknown) => formatCellValue(value),
    },
    {
      dataIndex: 'completed_count',
      key: 'completed_count',
      title: '完成任务',
      width: 140,
      render: (value: unknown) => formatCellValue(value),
    },
    {
      dataIndex: 'pending_count',
      key: 'pending_count',
      title: '进行中任务',
      width: 140,
      render: (value: unknown) => formatCellValue(value),
    },
    {
      dataIndex: 'user_id',
      key: 'user_id',
      title: '用户id',
      width: 120,
      render: (value: unknown) => formatCellValue(value),
    },
    {
      dataIndex: 'assigned_page_count',
      key: 'assigned_page_count',
      title: '分配页数',
      width: 140,
      render: (value: unknown) => formatCellValue(value),
    },
  ]), [])

  const dateRangeValue: [Dayjs | null, Dayjs | null] = [
    filters.dateFrom ? dayjs(filters.dateFrom, 'YYYY-MM-DD') : null,
    filters.dateTo ? dayjs(filters.dateTo, 'YYYY-MM-DD') : null,
  ]

  function handleQuery(): void {
    void loadStatistics(filters, { page: 1, pageSize })
  }

  function handleReset(): void {
    const nextFilters = getCurrentMonthFilters()
    setFilters(nextFilters)
    void loadStatistics(nextFilters, { page: 1, pageSize: 20 })
  }

  const pagination = useMemo<TablePaginationConfig>(() => ({
    current: currentPage,
    pageSize,
    showSizeChanger: true,
    total,
  }), [currentPage, pageSize, total])

  return (
    <div className="task-statistics-page">
      {!isCustomStatisticsPage ? (
        <Card bordered={false} className="task-statistics-page__filter">
          <div className="task-statistics-page__toolbar">
            <div className="task-statistics-page__filters">
              <Select
                allowClear
                placeholder="全部角色"
                value={filters.roleCode}
                options={roleSelectOptions}
                className="task-statistics-page__role-select"
                onChange={(value) => {
                  setFilters((current) => ({
                    ...current,
                    roleCode: value,
                  }))
                }}
              />
              <DatePicker.RangePicker
                value={dateRangeValue}
                format="YYYY-MM-DD"
                className="task-statistics-page__range-picker"
                placeholder={['开始日期', '截止日期']}
                onChange={(_, dateStrings) => {
                  const [dateFrom, dateTo] = dateStrings
                  setFilters((current) => ({
                    ...current,
                    dateFrom,
                    dateTo,
                  }))
                }}
              />
            </div>
            <div className="task-statistics-page__actions">
              <Button onClick={handleReset}>重置</Button>
              <Button type="primary" loading={loading} onClick={handleQuery}>
                查询
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <Card title={pageTitle} bordered={false} className="task-statistics-page__table">
        {rows.length === 0 ? (
          <div className="task-statistics-page__empty">
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />
          </div>
        ) : (
          <Table<TaskStatisticsRow>
            rowKey="__rowKey"
            loading={loading}
            columns={columns}
            dataSource={rows}
            pagination={pagination}
            onChange={(nextPagination) => {
              const nextPage = nextPagination.current ?? 1
              const nextPageSize = nextPagination.pageSize ?? pageSize
              void loadStatistics(filters, {
                page: nextPage,
                pageSize: nextPageSize,
              })
            }}
            scroll={{ x: Math.max(columns.length * 160, 960) }}
          />
        )}
      </Card>
    </div>
  )
}
