import { useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Col,
  Form,
  Input,
  Row,
  Space,
  Tag,
  Typography,
} from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { roleLabelMap } from '../constants/roles'
import { useAppState } from '../context/AppStateContext'
import { mockUsers } from '../services/mockUsers'

type LoginFormValues = {
  username: string
  password: string
}

type DemoAccount = {
  name: string
  username: string
  password: string
  role: string
}

export function LoginPage() {
  const { login, authenticating } = useAppState()
  const [error, setError] = useState<string | null>(null)
  const [form] = Form.useForm<LoginFormValues>()

  const accounts = useMemo<DemoAccount[]>(
    () =>
      mockUsers.map((user) => ({
        name: user.name,
        username: user.username,
        password: user.password,
        role: roleLabelMap[user.role],
      })),
    [],
  )

  async function handleFinish(values: LoginFormValues) {
    setError(null)

    try {
      await login(values.username, values.password)
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : '登录失败，请稍后重试')
    }
  }

  return (
    <div className="login-shell">
      <div className="login-badge">AI辅助设计</div>
      <div className="login-panel">
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} xl={13}>
            <Space orientation="vertical" size={20} className="login-hero">
              <div className="login-visual-stage">
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
                <Typography.Text className="section-label">Design Delivery Admin</Typography.Text>
                <Typography.Title level={1} className="login-title">
                  设计交付管理系统
                </Typography.Title>
                <Typography.Paragraph className="login-copy">
                  使用 mock 账号模拟不同角色登录，直接进入各自权限页面，便于演示主流程、派单、上传与售后迭代场景。
                </Typography.Paragraph>
              </div>
            </Space>
          </Col>

          <Col xs={24} xl={11}>
            <div className="login-form-card">
              <Space orientation="vertical" size={20} className="login-form-stack">
                <div>
                  <Typography.Title level={3} className="login-form-title">
                    欢迎登录
                  </Typography.Title>
                  <Typography.Text className="login-form-subtitle">
                    输入演示账号后进入对应角色工作台
                  </Typography.Text>
                </div>

                {error ? <Alert type="error" showIcon message={error} /> : null}

                <Form
                  form={form}
                  layout="vertical"
                  initialValues={{ username: 'planner', password: '123456' }}
                  onFinish={(values) => void handleFinish(values)}
                >
                  <Form.Item
                    label="账号"
                    name="username"
                    rules={[{ required: true, message: '请输入账号' }]}
                  >
                    <Input
                      prefix={<UserOutlined className="login-input-icon" />}
                      placeholder="请输入用户名"
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

                <div className="login-demo-panel">
                  <div className="login-demo-head">
                    <Typography.Text strong>演示账号</Typography.Text>
                    <Typography.Text className="login-demo-helper">
                      默认：`planner / 123456`
                    </Typography.Text>
                  </div>
                  <div className="login-demo-list">
                    {accounts.map((account) => (
                      <div key={account.username} className="login-demo-item">
                        <div className="login-demo-main">
                          <Space size={8} wrap>
                            <Tag className="login-demo-tag">{account.role}</Tag>
                            <Typography.Text strong>{account.name}</Typography.Text>
                          </Space>
                          <Typography.Text className="login-demo-account">
                            {account.username} / {account.password}
                          </Typography.Text>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Space>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  )
}
