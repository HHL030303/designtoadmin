import { DownOutlined, UpOutlined } from '@ant-design/icons'
import { Button } from 'antd'

export function TableExpandTrigger({
  expanded,
  actionable = true,
  onClick,
}: {
  expanded: boolean
  actionable?: boolean
  onClick: () => void
}) {
  const icon = expanded ? <UpOutlined /> : <DownOutlined />
  const label = expanded ? '收起详情' : actionable ? '展开处理' : '查看详情'

  return (
    <Button
      type={expanded || actionable ? 'primary' : 'default'}
      size="small"
      icon={icon}
      className={expanded ? 'table-expand-trigger table-expand-trigger-open' : 'table-expand-trigger'}
      onClick={onClick}
    >
      {label}
    </Button>
  )
}
