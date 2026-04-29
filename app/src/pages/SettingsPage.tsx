import { Card, Col, List, Row, Typography } from 'antd'

function TemplateCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card title={title}>
      <List size="small" dataSource={items} renderItem={(item) => <List.Item>{item}</List.Item>} />
    </Card>
  )
}

export function SettingsPage() {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={10}>
        <Card title="流程边界" extra={<Typography.Text type="secondary">系统边界</Typography.Text>}>
          <List
            size="small"
            dataSource={[
              '纳入系统：计划员、教研老师、设计统筹、风格稿设计师、内页设计师、售前、管理员',
              '系统外角色：教研审核员、风格稿审核员、内页审核员、最终质检员',
              '平台不设置审批流，只记录上传、派单、确认入库、自动归档等动作',
            ]}
            renderItem={(item) => <List.Item>{item}</List.Item>}
          />
        </Card>
      </Col>
      <Col xs={24} xl={14}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <TemplateCard
              title="基础交付清单"
              items={['封面页', '目录页', '知识讲解页', '练习页', '结尾页']}
            />
          </Col>
          <Col xs={24} md={8}>
            <TemplateCard
              title="命名规范"
              items={['课程名_风格稿_vx.x', '课程名_内页成品_vx.x', '课程名_归档压缩包_vx.x']}
            />
          </Col>
          <Col xs={24} md={8}>
            <TemplateCard
              title="自动触发规则"
              items={[
                '教研完成 → 待风格稿派单',
                '内页上传 → 待入库确认',
                '确认入库 → 自动打包归档',
              ]}
            />
          </Col>
        </Row>
      </Col>
    </Row>
  )
}
