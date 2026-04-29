import { AppstoreOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { Button, Card, Col, Row, Space, Typography } from 'antd'
import { useAppState } from '../context/AppStateContext'

export function ProjectSelectPage() {
  const { currentUser, projects, selectProject } = useAppState()

  return (
    <div className="project-select-shell">
      <div className="project-select-panel">
        <Space direction="vertical" size={10} className="project-select-head">
          <Typography.Text className="section-label">Project Gateway</Typography.Text>
          <Typography.Title level={2} className="project-select-title">
            选择项目
          </Typography.Title>
          <Typography.Text className="project-select-copy">
            当前登录账号：{currentUser?.name ?? '未登录'}。选择项目后进入对应的管理后台。
          </Typography.Text>
        </Space>

        <Row gutter={[16, 16]}>
          {projects.map((project) => (
            <Col xs={24} md={8} key={project.key}>
              <Card className="project-select-card">
                <Space direction="vertical" size={14} className="project-select-card-stack">
                  <div className="project-select-icon">
                    <AppstoreOutlined />
                  </div>
                  <div>
                    <Typography.Title level={4} className="card-title-reset">
                      {project.name}
                    </Typography.Title>
                    <Typography.Paragraph className="project-select-card-copy">
                      {project.description}
                    </Typography.Paragraph>
                  </div>
                  <Button
                    type="primary"
                    block
                    icon={<ArrowRightOutlined />}
                    onClick={() => selectProject(project.key)}
                  >
                    进入项目
                  </Button>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  )
}
