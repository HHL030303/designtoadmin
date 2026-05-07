import { Card, Col, Progress, Row, Space, Typography } from 'antd'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { StatCard } from '../components/common/StatCard'
import { useAppState } from '../context/AppStateContext'

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

function ProgressSummaryCard({
  title,
  helper,
  rows,
}: {
  title: string
  helper: string
  rows: DashboardMetricRow[]
}) {
  return (
    <Card title={title} className="dashboard-static-card dashboard-static-card-lg">
      <Space orientation="vertical" size={16} className="dashboard-stack">
        <Typography.Text type="secondary">{helper}</Typography.Text>
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
      </Space>
    </Card>
  )
}

function DesignerWorkloadCard({
  title,
  helper,
  rows,
}: {
  title: string
  helper: string
  rows: DashboardDesignerRow[]
}) {
  return (
    <Card title={title} className="dashboard-static-card">
      <Space orientation="vertical" size={16} className="dashboard-stack">
        <Typography.Text type="secondary">{helper}</Typography.Text>
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
      </Space>
    </Card>
  )
}

const researchRows: DashboardMetricRow[] = [
  { label: '一年级', subject: '语文', total: 12, completed: 8, pending: 4 },
  { label: '三年级', subject: '数学', total: 10, completed: 7, pending: 3 },
  { label: '五年级', subject: '英语', total: 8, completed: 5, pending: 3 },
]

const designRows: DashboardMetricRow[] = [
  { label: '一年级', subject: '语文', total: 9, completed: 6, pending: 3 },
  { label: '三年级', subject: '数学', total: 11, completed: 8, pending: 3 },
  { label: '初一', subject: '物理', total: 7, completed: 4, pending: 3 },
]

const productRows: DashboardMetricRow[] = [
  { label: '一年级', subject: '语文', total: 6, completed: 4, pending: 2 },
  { label: '三年级', subject: '数学', total: 8, completed: 6, pending: 2 },
  { label: '初一', subject: '化学', total: 5, completed: 3, pending: 2 },
]

const styleDesignerRows: DashboardDesignerRow[] = [
  { name: '唐婧', shouldComplete: 18, completed: 13, pending: 5 },
  { name: '陆鸣', shouldComplete: 14, completed: 10, pending: 4 },
  { name: '南音', shouldComplete: 11, completed: 9, pending: 2 },
]

const pageDesignerRows: DashboardDesignerRow[] = [
  { name: '江栩', shouldComplete: 36, completed: 24, pending: 12 },
  { name: '余璟', shouldComplete: 28, completed: 19, pending: 9 },
  { name: '闻溪', shouldComplete: 21, completed: 15, pending: 6 },
]

const bEndRows: DashboardMetricRow[] = [
  { label: '一年级', subject: '语文', total: 5, completed: 3, pending: 2 },
  { label: '四年级', subject: '数学', total: 7, completed: 5, pending: 2 },
  { label: '初二', subject: '英语', total: 4, completed: 2, pending: 2 },
]

const subjectRows = [
  { name: '语文', value: 12, total: 35 },
  { name: '数学', value: 10, total: 28 },
  { name: '英语', value: 8, total: 22 },
  { name: '物理', value: 7, total: 18 },
  { name: '化学', value: 6, total: 16 },
  { name: '科学', value: 5, total: 14 },
  { name: '历史', value: 4, total: 11 },
  { name: '地理', value: 3, total: 9 },
]

const trendRows = [
  { name: '教研', value: 1.2 },
  { name: '风格稿', value: 2.1 },
  { name: '内页', value: 1.4 },
  { name: '入库', value: 2.0 },
  { name: '归档', value: 1.1 },
]

export function DashboardPage() {
  const { stats } = useAppState()

  return (
    <Space orientation="vertical" size={16} className="dashboard-stack">
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}>
          <StatCard label="课件总量" value={stats.total} hint="保留现有统计口径" />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <StatCard label="处理中" value={stats.active} hint="保留现有在制统计" />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <StatCard label="逾期预警" value={stats.overdue} hint="保留现有风险统计" danger />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <StatCard label="售后/迭代" value={stats.archived} hint="保留现有卡片位置" />
        </Col>
      </Row>

      <div className="dashboard-static-grid">
        <ProgressSummaryCard
          title="本月教研进度"
          helper="静态展示示例，后续可替换为本月教研任务聚合数据。"
          rows={researchRows}
        />
        <ProgressSummaryCard
          title="本月设计进度"
          helper="静态展示示例，后续可替换为设计统筹视角的月度进度统计。"
          rows={designRows}
        />
        <ProgressSummaryCard
          title="本月成品进度"
          helper="静态展示示例，后续可替换为内页与归档成品汇总。"
          rows={productRows}
        />

        <DesignerWorkloadCard
          title="风格稿设计师本月任务量"
          helper="按设计师展示本月应完成、已完成、待完成任务量。"
          rows={styleDesignerRows}
        />
        <DesignerWorkloadCard
          title="内页设计师本月任务量"
          helper="按设计师展示本月页量承接与交付状态。"
          rows={pageDesignerRows}
        />

        <Card title="学科分布" className="dashboard-static-card dashboard-static-card-tall">
          <Space orientation="vertical" size={16} className="dashboard-stack">
            <Typography.Text type="secondary">
              静态展示当前看板中的学科分布样式，后续替换成真实汇总口径。
            </Typography.Text>
            <div className="dashboard-subject-list">
              {subjectRows.map((item) => {
                const percent = Math.round((item.value / item.total) * 100)

                return (
                  <div key={item.name} className="dashboard-subject-row">
                    <div className="dashboard-subject-head">
                      <Typography.Text>{item.name}</Typography.Text>
                      <Typography.Text type="secondary">
                        {item.value} / {item.total}
                      </Typography.Text>
                    </div>
                    <Progress percent={percent} showInfo={false} strokeColor="#2563eb" />
                  </div>
                )
              })}
            </div>
          </Space>
        </Card>

        <ProgressSummaryCard
          title="B端交付进度"
          helper="静态展示 B 端交付统计区块，后续接入 B 端课程口径。"
          rows={bEndRows}
        />

        <Card title="流程阶段在制量" className="dashboard-static-card">
          <Space orientation="vertical" size={16} className="dashboard-stack">
            <Typography.Text type="secondary">
              静态折线图占位，后续可替换为流程风险趋势或阶段在制量趋势。
            </Typography.Text>
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
          </Space>
        </Card>
      </div>
    </Space>
  )
}
