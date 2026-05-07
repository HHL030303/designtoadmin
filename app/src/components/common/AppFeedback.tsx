import { Alert, Space } from 'antd'

export function AppFeedback({
  loading,
  error,
}: {
  loading: boolean
  error: string | null
}) {
  if (!loading && !error) {
    return null
  }

  return (
    <Space orientation="vertical" size={12} className="app-feedback-stack">
      {loading ? <Alert title="正在加载课件数据..." type="info" showIcon /> : null}
      {error ? <Alert title={error} type="error" showIcon /> : null}
    </Space>
  )
}
