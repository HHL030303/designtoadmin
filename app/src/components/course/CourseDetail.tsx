import {
  Button,
  Card,
  Col,
  Descriptions,
  List,
  Row,
  Space,
  Steps,
  Typography,
} from 'antd'
import { useState } from 'react'
import {
  formatDateLabel,
  getCourseFlowItems,
  nextActionMap,
  stageIndexMap,
  today,
} from '../../constants/workflow'
import type { CourseRecord, CreateServiceTicketPayload, ServiceType } from '../../types'
import { mergeAttachments } from '../../utils/attachments'
import { StatusBadge } from '../common/StatusBadge'
import { AttachmentList } from '../common/AttachmentList'
import { ServiceTicketDrawer } from './ServiceTicketDrawer'

export function CourseDetail({
  course,
  onAdvance,
  onCreateTicket,
  ticketRequester,
  busy,
  canAdvance,
  canCreateAftersales,
  canCreateIteration,
}: {
  course: CourseRecord
  onAdvance?: (courseId: string) => void
  onCreateTicket: (payload: CreateServiceTicketPayload) => Promise<void>
  ticketRequester: string
  busy?: boolean
  canAdvance?: boolean
  canCreateAftersales: boolean
  canCreateIteration: boolean
}) {
  const [ticketDrawerType, setTicketDrawerType] = useState<ServiceType>('售后')
  const [ticketDrawerOpen, setTicketDrawerOpen] = useState(false)
  const flowItems = getCourseFlowItems(course)
  const currentFlowIndex = stageIndexMap[course.status]
  const isArchived = course.status === 'archived'
  const isAftersales = course.status === 'aftersales'
  const canShowServiceActions = isArchived && (canCreateAftersales || canCreateIteration)
  const detailFiles =
    course.status === 'research'
      ? []
      : course.status === 'pendingStyleDispatch' || course.status === 'styleInProgress'
        ? course.researchAttachments
        : course.status === 'pendingPageDispatch' || course.status === 'pageInProgress'
          ? mergeAttachments(course.researchAttachments, course.styleAttachments)
          : course.status === 'pendingArchive'
            ? mergeAttachments(
                course.researchAttachments,
                course.styleAttachments,
                course.pageAttachments,
              )
            : course.status === 'archived'
              ? course.attachments
              : mergeAttachments(
                  course.researchAttachments,
                  course.styleAttachments,
                  course.pageAttachments,
                  course.attachments,
                )

  return (
    <div>
      {/* <Space> */}
      <Card
        title={
          <Space direction="vertical" size={0}>
            <Typography.Title level={4} className="card-title-reset">
              {course.title}
            </Typography.Title>
            <Typography.Text type="secondary">
              {course.id} · {course.subject} · {course.grade} · {course.version}
            </Typography.Text>
          </Space>
        }
        extra={<StatusBadge status={course.status} />}
      >
        <Descriptions column={{ xs: 1, md: 2, xl: 4 }} size="small">
          <Descriptions.Item label="当前责任人">{course.currentOwner}</Descriptions.Item>
          <Descriptions.Item label="制作老师">{course.researchOwner}</Descriptions.Item>
          <Descriptions.Item label="老师预期交稿时间">
            {formatDateLabel(course.researchDueDate)}
          </Descriptions.Item>
          <Descriptions.Item label="课件预期交付日期">
            {formatDateLabel(course.overallDueDate)}
          </Descriptions.Item>
          <Descriptions.Item label="是否B端">{course.isBEnd}</Descriptions.Item>
          <Descriptions.Item label="版权登记（美术）">{course.artCopyright}</Descriptions.Item>
          <Descriptions.Item label="版权登记（文字）">{course.textCopyright}</Descriptions.Item>
          <Descriptions.Item label="单元/章节">{course.chapterName || '未填写'}</Descriptions.Item>
          <Descriptions.Item label="总页数">{course.totalPageCount ?? '未填写'}</Descriptions.Item>
          <Descriptions.Item label="实际交稿日期">
            {course.actualResearchSubmissionDate
              ? formatDateLabel(course.actualResearchSubmissionDate)
              : '未填写'}
          </Descriptions.Item>
          <Descriptions.Item label="教研审核状态">{course.researchReviewStatus}</Descriptions.Item>
          <Descriptions.Item label="文件校验">{course.qualityCheck}</Descriptions.Item>
          <Descriptions.Item label="已归档时间">{course.archivedAt ?? '未归档'}</Descriptions.Item>
        </Descriptions>

        {isAftersales ? (
          <Space className="detail-action-row detail-action-row-top" wrap>
            <Button
              type="primary"
              onClick={() => onAdvance?.(course.id)}
              loading={busy}
              disabled={!canAdvance}
            >
              完成售后工单
            </Button>
          </Space>
        ) : null}

        {canShowServiceActions ? (
          <Space className="detail-action-row detail-action-row-top" wrap>
            <Button
              onClick={() => {
                setTicketDrawerType('售后')
                setTicketDrawerOpen(true)
              }}
              disabled={!canCreateAftersales || busy}
            >
              发起售后
            </Button>
            <Button
              onClick={() => {
                setTicketDrawerType('迭代')
                setTicketDrawerOpen(true)
              }}
              disabled={!canCreateIteration || busy}
            >
              发起迭代
            </Button>
          </Space>
        ) : null}
      </Card>
      {/* </Space> */}

      <Space direction="vertical" size={16} className="panel-stack-full">
        {!isAftersales ? (
          <Card title="流程节点详情">
            <Steps
              className="dashboard-steps dashboard-steps-horizontal detail-flow-steps"
              current={currentFlowIndex}
              items={flowItems.map((item, index) => ({
                title: item.title,
                description: (
                  <Space direction="vertical" size={2} className="flow-step-meta">
                    <Typography.Text className="flow-step-line">
                      当前责任人：{item.owner}
                    </Typography.Text>
                    <Typography.Text className="flow-step-line">
                      截止时间：{formatDateLabel(item.dueDate)}
                    </Typography.Text>
                    <Typography.Text className="flow-step-line">
                      当前状态：
                      {item.stateText
                        ? item.stateText
                        : index < currentFlowIndex || (isArchived && index === currentFlowIndex)
                        ? '已完成'
                        : index === currentFlowIndex
                          ? nextActionMap[course.status]?.label ?? '进行中'
                          : '待开始'}
                    </Typography.Text>
                  </Space>
                ),
                status:
                  index < currentFlowIndex || (isArchived && index === currentFlowIndex)
                    ? 'finish'
                    : index === currentFlowIndex
                      ? 'process'
                      : 'wait',
              }))}
            />
          </Card>
        ) : null}

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={12}>
            <Card title={isArchived ? '最终成品' : '下载资料'}>
              <AttachmentList files={detailFiles} />
            </Card>
          </Col>

          <Col xs={24} xl={12}>
            <Card title="流转日志">
              <List
                size="small"
                dataSource={course.logs}
                renderItem={(log) => (
                  <List.Item>
                    <Space direction="vertical" size={2}>
                      <Typography.Text strong>{log.action}</Typography.Text>
                      <Typography.Text type="secondary">
                        {log.actor} · {log.time}
                      </Typography.Text>
                      <Typography.Text type="secondary">{log.detail}</Typography.Text>
                    </Space>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
      </Space>

      <ServiceTicketDrawer
        open={ticketDrawerOpen}
        defaultType={ticketDrawerType}
        courseId={course.id}
        requester={ticketRequester}
        createdAt={today}
        loading={busy}
        onClose={() => setTicketDrawerOpen(false)}
        onSubmit={onCreateTicket}
      />
    </div>
  )
}
