import { useState } from 'react'
import {
  Alert,
  Button,
  Col,
  Form,
  Input,
  Row,
  Space,
  Typography,
} from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { useLocation } from 'react-router-dom'
import { useAppState } from '../context/AppStateContext'

type LoginFormValues = {
  email: string
  password: string
}

export function LoginPage() {
  const location = useLocation()
  const { login, authenticating } = useAppState()
  const [error, setError] = useState<string | null>(null)
  const [form] = Form.useForm<LoginFormValues>()

  async function handleFinish(values: LoginFormValues) {
    setError(null)

    try {
      const redirectPath =
        typeof location.state === 'object' &&
        location.state !== null &&
        'from' in location.state &&
        typeof location.state.from === 'string'
          ? location.state.from
          : null

      await login(values.email, values.password, redirectPath)
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : '登录失败，请稍后重试')
    }
  }

  return (
    <div className="login-shell">
      <div className="login-panel">
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} xl={13}>
            <Space orientation="vertical" size={20} className="login-hero">
              <div className="login-visual-stage">
                <div className="login-visual-orb login-visual-orb--top" />
                <div className="login-visual-orb login-visual-orb--right" />
                <div className="login-visual-cube" />
                <div className="login-orbit-ring login-orbit-ring-lg" />
                <div className="login-orbit-ring login-orbit-ring-sm" />
                <div className="login-visual-bars login-visual-bars-left">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className="login-visual-bars login-visual-bars-right">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className="login-bot-core">
                  <div className="login-bot-shell">
                    <div className="login-bot-face">
                      <span className="login-bot-eye" />
                      <span className="login-bot-eye" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="login-hero-copy">
                <Typography.Title level={1} className="login-title">
                  欢迎回来
                </Typography.Title>
                <Typography.Paragraph className="login-copy">
                  登录您的账户，继续进入设计交付系统，查看任务工单与项目协作流程。
                </Typography.Paragraph>
                <div className="login-hero-indicators" aria-hidden="true">
                  <span className="login-hero-indicator login-hero-indicator--active" />
                  <span className="login-hero-indicator" />
                  <span className="login-hero-indicator" />
                </div>
              </div>
            </Space>
          </Col>

          <Col xs={24} xl={11}>
            <div className="login-form-card">
              <Space orientation="vertical" size={20} className="login-form-stack">
                <div>
                  <Typography.Title level={2} className="login-form-title">
                    登录
                  </Typography.Title>
                  <Typography.Text className="login-form-subtitle">
                    使用您的账户登录
                  </Typography.Text>
                </div>

                {error ? <Alert type="error" showIcon message={error} /> : null}

                <Form
                  form={form}
                  layout="vertical"
                  // initialValues={{ email: 'admin@example.com', password: '123456' }}
                  onFinish={(values) => void handleFinish(values)}
                >
                  <Form.Item
                    label="邮箱"
                    name="email"
                    rules={[{ required: true, message: '请输入邮箱' }]}
                  >
                    <Input
                      prefix={<UserOutlined className="login-input-icon" />}
                      placeholder="请输入登录邮箱"
                      className="login-input"
                    />
                  </Form.Item>

                  <Form.Item
                    label="密码"
                    name="password"
                    rules={[{ required: true, message: '请输入密码' }]}
                  >
                    <Input.Password
                      prefix={<LockOutlined className="login-input-icon" />}
                      placeholder="请输入密码"
                      className="login-input"
                    />
                  </Form.Item>

                  <Button
                    type="primary"
                    htmlType="submit"
                    block
                    size="large"
                    loading={authenticating}
                    className="login-submit-button"
                  >
                    登录
                  </Button>
                </Form>

                {/* <div className="login-demo-panel">
                  <div className="login-demo-head">
                    <Typography.Text strong>登录说明</Typography.Text>
                    <Typography.Text className="login-demo-helper">
                      默认：`admin@example.com / 123456`
                    </Typography.Text>
                  </div>
                  <div className="login-demo-list">
                    <div className="login-demo-item">
                      <div className="login-demo-main">
                        <Space size={8} wrap>
                          <Tag className="login-demo-tag">API</Tag>
                          <Typography.Text strong>真实认证</Typography.Text>
                        </Space>
                        <Typography.Text className="login-demo-account">
                          {helperText}
                        </Typography.Text>
                      </div>
                    </div>
                  </div>
                </div> */}
              </Space>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  )
}
