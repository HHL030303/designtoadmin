import { Alert, Card, Col, List, Progress, Row, Space, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { StatCard } from '../components/common/StatCard'
import { StatusBadge } from '../components/common/StatusBadge'
import { roleLabelMap } from '../constants/roles'
import { formatDateLabel, statusMeta } from '../constants/workflow'
import { useAppState } from '../context/AppStateContext'
import type { CourseRecord } from '../types'

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

export function DashboardPage() {
  const { courses, stats, role, currentUser } = useAppState()

  const statusChartData = Object.entries(statusMeta).map(([key, meta]) => ({
    name: meta.label,
    value: courses.filter((course) => course.status === key).length,
  }))

  const orderTypeData = ['全新订单', '售后订单', '迭代订单'].map((type) => ({
    name: type,
    value: courses.filter((course) => course.orderType === type).length,
  }))

  const trendData = [
    { name: '教研', value: courses.filter((course) => course.status === 'research').length },
    {
      name: '风格稿',
      value: courses.filter((course) => ['pendingStyleDispatch', 'styleInProgress'].includes(course.status)).length,
    },
    {
      name: '内页',
      value: courses.filter((course) => ['pendingPageDispatch', 'pageInProgress'].includes(course.status)).length,
    },
    {
      name: '入库',
      value: courses.filter((course) => ['pendingArchive', 'packing'].includes(course.status)).length,
    },
    { name: '归档', value: courses.filter((course) => course.status === 'archived').length },
  ]

  const subjectDistribution = Object.entries(
    courses.reduce<Record<string, number>>((acc, course) => {
      acc[course.subject] = (acc[course.subject] ?? 0) + 1
      return acc
    }, {}),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  const overdueCourses = courses
    .filter((course) => course.overdue)
    .sort((a, b) => a.overallDueDate.localeCompare(b.overallDueDate))
    .slice(0, 5)

  const upcomingCourses = courses
    .filter((course) => course.status !== 'archived' && !course.overdue)
    .sort((a, b) => a.overallDueDate.localeCompare(b.overallDueDate))
    .slice(0, 6)

  const serviceCourses = courses.filter((course) => course.orderType !== '全新订单')
  const archivedRate = stats.total === 0 ? 0 : Math.round((stats.archived / stats.total) * 100)
  const onTimeRate = stats.total === 0 ? 0 : Math.round(((stats.total - stats.overdue) / stats.total) * 100)
  const pieColors = ['#3b82f6', '#93c5fd', '#cbd5e1']

  const riskColumns: ColumnsType<CourseRecord> = [
    {
      title: '课件',
      dataIndex: 'title',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.title}</Typography.Text>
          <Typography.Text type="secondary">{record.id}</Typography.Text>
        </Space>
      ),
    },
    {
      title: '当前状态',
      dataIndex: 'status',
      render: (_, record) => <StatusBadge status={record.status} />,
    },
    {
      title: '责任人',
      dataIndex: 'currentOwner',
      ellipsis: true,
    },
    {
      title: '截止时间',
      dataIndex: 'overallDueDate',
      render: (value: string) => (
        <Typography.Text type="danger">{formatDateLabel(value)}</Typography.Text>
      ),
    },
  ]

  return (
    <Space direction="vertical" size={16} className="dashboard-stack">
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}>
          <StatCard label="课件总量" value={stats.total} hint="当前主单规模" />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <StatCard label="处理中" value={stats.active} hint="未归档课件" />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <StatCard label="逾期预警" value={stats.overdue} hint="需优先跟进" danger />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <StatCard label="售后/迭代" value={serviceCourses.length} hint="版本衍生任务" />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={8}>
          <Card title="管理概览">
            <Space direction="vertical" size={16} className="dashboard-stack">
              <Alert
                type="info"
                showIcon
                message={`${roleLabelMap[role]} · ${currentUser?.name ?? '当前用户'}`}
                description="当前看板聚合了主流程在制、售后迭代、逾期预警和交付分布，可作为日常管理入口。"
              />
              <div className="dashboard-progress-block">
                <div className="dashboard-progress-head">
                  <Typography.Text strong>归档完成率</Typography.Text>
                  <Typography.Text type="secondary">{archivedRate}%</Typography.Text>
                </div>
                <Progress percent={archivedRate} strokeColor="#3b82f6" showInfo={false} />
              </div>
              <div className="dashboard-progress-block">
                <div className="dashboard-progress-head">
                  <Typography.Text strong>按期完成率</Typography.Text>
                  <Typography.Text type="secondary">{onTimeRate}%</Typography.Text>
                </div>
                <Progress percent={onTimeRate} strokeColor="#10b981" showInfo={false} />
              </div>
              <div className="dashboard-highlight-grid">
                <div className="dashboard-highlight-card">
                  <span className="dashboard-highlight-label">当前设计阶段在制</span>
                  <strong className="dashboard-highlight-value">
                    {
                      courses.filter((course) =>
                        ['pendingStyleDispatch', 'styleInProgress', 'pendingPageDispatch', 'pageInProgress'].includes(course.status),
                      ).length
                    }
                  </strong>
                </div>
                <div className="dashboard-highlight-card">
                  <span className="dashboard-highlight-label">待入库确认</span>
                  <strong className="dashboard-highlight-value">
                    {courses.filter((course) => course.status === 'pendingArchive').length}
                  </strong>
                </div>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="状态分布">
            <DashboardChartFrame>
              {({ width, height }) => (
                <BarChart width={width} height={height} data={statusChartData}>
                  <CartesianGrid stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    height={64}
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
                  <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={30} />
                </BarChart>
              )}
            </DashboardChartFrame>
          </Card>
        </Col>
        <Col xs={24} xl={6}>
          <Card title="订单类型占比">
            <DashboardChartFrame>
              {({ width, height }) => (
                <PieChart width={width} height={height}>
                  <Pie data={orderTypeData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={82}>
                    {orderTypeData.map((entry, index) => (
                      <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              )}
            </DashboardChartFrame>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={8}>
          <Card title="学科分布">
            <Space direction="vertical" size={14} className="dashboard-stack">
              {subjectDistribution.map((item) => {
                const percent = stats.total === 0 ? 0 : Math.round((item.value / stats.total) * 100)

                return (
                  <div key={item.name} className="dashboard-subject-row">
                    <div className="dashboard-subject-head">
                      <Typography.Text>{item.name}</Typography.Text>
                      <Typography.Text type="secondary">
                        {item.value} 个 / {percent}%
                      </Typography.Text>
                    </div>
                    <Progress percent={percent} showInfo={false} strokeColor="#3b82f6" />
                  </div>
                )
              })}
            </Space>
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="流程阶段在制量">
            <DashboardChartFrame>
              {({ width, height }) => (
                <LineChart width={width} height={height} data={trendData}>
                  <CartesianGrid stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} />
                </LineChart>
              )}
            </DashboardChartFrame>
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="即将到期">
            <List
              dataSource={upcomingCourses}
              locale={{ emptyText: '暂无即将到期任务' }}
              renderItem={(course) => (
                <List.Item>
                  <div className="dashboard-list-item">
                    <div>
                      <Typography.Text strong>{course.title}</Typography.Text>
                      <Typography.Text type="secondary" className="dashboard-list-note">
                        {course.currentOwner}
                      </Typography.Text>
                    </div>
                    <Space direction="vertical" size={4} align="end">
                      <StatusBadge status={course.status} />
                      <Typography.Text type="secondary">
                        {formatDateLabel(course.overallDueDate)}
                      </Typography.Text>
                    </Space>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="逾期与风险清单">
            <Table
              rowKey="id"
              size="small"
              columns={riskColumns}
              dataSource={overdueCourses}
              pagination={false}
              locale={{ emptyText: '当前没有逾期风险课件' }}
            />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="近期待关注">
            <List
              dataSource={[
                `教研中课件 ${courses.filter((course) => course.status === 'research').length} 个，需关注资料提交完整性`,
                `待风格稿派单 ${courses.filter((course) => course.status === 'pendingStyleDispatch').length} 个，注意设计资源分配`,
                `待内页派单 ${courses.filter((course) => course.status === 'pendingPageDispatch').length} 个，建议复核风格稿交付质量`,
                `待入库确认 ${courses.filter((course) => course.status === 'pendingArchive').length} 个，注意校验报告与自动打包衔接`,
                `售后/迭代 ${serviceCourses.length} 个，建议同步评估版本变更影响范围`,
              ]}
              renderItem={(item) => <List.Item>{item}</List.Item>}
            />
          </Card>
        </Col>
      </Row>
    </Space>
  )
}
