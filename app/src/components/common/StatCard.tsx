import { Card, Typography } from 'antd'

export function StatCard({
  label,
  value,
  hint,
  danger = false,
}: {
  label: string
  value: number
  hint: string
  danger?: boolean
}) {
  return (
    <Card className="metric-card">
      <Typography.Text className="section-label">{label}</Typography.Text>
      <div className={danger ? 'metric-value metric-value-danger' : 'metric-value'}>
        {value}
      </div>
      <div className="stat-card-hint">{hint}</div>
    </Card>
  )
}
