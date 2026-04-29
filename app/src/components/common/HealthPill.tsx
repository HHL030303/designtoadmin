import { Badge, Card, Space, Typography } from 'antd'

const colorMap: Record<string, string> = {
  amber: '#faad14',
  violet: '#722ed1',
  coral: '#fa541c',
  rose: '#eb2f96',
}

export function HealthPill({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: string
}) {
  return (
    <Card size="small">
      <Space align="center" className="health-pill-row">
        <Space align="center">
          <Badge color={colorMap[tone] ?? '#1677ff'} />
          <Typography.Text>{label}</Typography.Text>
        </Space>
        <Typography.Title level={4} className="health-pill-value">
          {value}
        </Typography.Title>
      </Space>
    </Card>
  )
}
