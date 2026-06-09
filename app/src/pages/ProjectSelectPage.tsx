import { useEffect, useRef } from 'react'
import { AppstoreOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { Button, Card, Col, Modal, Row, Space, Typography } from 'antd'
import { useAppState } from '../context/AppStateContext'

export function ProjectSelectPage() {
  const { currentUser, logout, projects, selectProject } = useAppState()
  const hasShownEmptyProjectModalRef = useRef(false)

  useEffect(() => {
    if (!currentUser || projects.length > 0 || hasShownEmptyProjectModalRef.current) {
      return
    }

    hasShownEmptyProjectModalRef.current = true

    Modal.warning({
      content: '当前账号没有配置项目，请联系管理员绑定项目成员后再试。',
      maskClosable: false,
      okText: '知道了',
      onOk: () => logout(),
      title: '暂无可选项目',
    })
  }, [currentUser, logout, projects])

  return (
    <div className="project-select-shell">
      <div className="project-select-panel">
        <Space orientation="vertical" size={10} className="project-select-head">
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
                <Space orientation="vertical" size={14} className="project-select-card-stack">
                  <div className='flex'>
                    <div className="project-select-icon">
                      <AppstoreOutlined />
                    </div>
                    <Typography.Title level={4} className="card-title-reset">
                        {project.name}
                      </Typography.Title>
                   
                  </div>
                       <Typography.Paragraph className="project-select-card-copy">
                      {project.description}
                    </Typography.Paragraph>
               
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
