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
    <Space direction="vertical" size={12} className="app-feedback-stack">
      {loading ? <Alert message="正在加载课件数据..." type="info" showIcon /> : null}
      {error ? <Alert message={error} type="error" showIcon /> : null}
    </Space>
  )
}
