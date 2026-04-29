import { useEffect } from 'react'
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Typography,
} from 'antd'
import dayjs from 'dayjs'
import type { CourseRecord, UpdateResearchPayload } from '../../types'
import { AttachmentList } from '../common/AttachmentList'
import { AttachmentUploadField } from '../common/AttachmentUploadField'

export function ResearchTaskPanel({
  course,
  editable,
  busy,
  onSubmit,
}: {
  course: CourseRecord
  editable: boolean
  busy?: boolean
  onSubmit: (payload: UpdateResearchPayload) => void
}) {
  const [form] = Form.useForm<{
    researchOwner: string
    totalPageCount?: number
    researchSourceFiles: UpdateResearchPayload['researchSourceFiles']
    lessonPlanFiles: UpdateResearchPayload['lessonPlanFiles']
    scriptFiles: UpdateResearchPayload['scriptFiles']
    guideFiles: UpdateResearchPayload['guideFiles']
    otherResearchFiles: UpdateResearchPayload['otherResearchFiles']
    researchReviewStatus: UpdateResearchPayload['researchReviewStatus']
  }>()

  useEffect(() => {
    form.setFieldsValue({
      researchOwner: course.researchOwner,
      totalPageCount: course.totalPageCount,
      researchSourceFiles: course.researchSourceFiles,
      lessonPlanFiles: course.lessonPlanFiles,
      scriptFiles: course.scriptFiles,
      guideFiles: course.guideFiles,
      otherResearchFiles: course.otherResearchFiles,
      researchReviewStatus: course.researchReviewStatus,
    })
  }, [course, form])

  return (
    <Card
      title="教研任务"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) =>
          onSubmit({
            researchOwner: values.researchOwner,
            totalPageCount: values.totalPageCount ?? 0,
            actualResearchSubmissionDate: dayjs().format('YYYY-MM-DD'),
            researchSourceFiles: values.researchSourceFiles,
            lessonPlanFiles: values.lessonPlanFiles,
            scriptFiles: values.scriptFiles,
            guideFiles: values.guideFiles,
            otherResearchFiles: values.otherResearchFiles,
            researchAttachments: [
              ...values.researchSourceFiles,
              ...values.lessonPlanFiles,
              ...values.scriptFiles,
              ...values.guideFiles,
              ...values.otherResearchFiles,
            ],
            researchReviewStatus: values.researchReviewStatus,
          })
        }
      >
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item label="预期交稿日期">
              <Input value={course.researchDueDate} disabled />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="预计成品完成时间">
              <Input value={course.finalDueDate} disabled />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item
              name="researchOwner"
              label="制作老师"
              rules={[{ required: true, message: '请填写制作老师' }]}
            >
              <Input disabled={!editable} placeholder="请输入制作老师" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="totalPageCount"
              label="总页数"
              rules={[{ required: true, message: '请输入总页数' }]}
            >
              <InputNumber
                disabled={!editable}
                min={1}
                precision={0}
                className="control-full-width"
                placeholder="请输入总页数"
                controls={false}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item
              name="researchReviewStatus"
              label="教研审核状态"
              rules={[{ required: true, message: '请选择教研审核状态' }]}
            >
              <Select
                disabled={!editable}
                options={['免审', '待审核', '审核通过'].map((value) => ({
                  label: value,
                  value,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="researchSourceFiles"
          label="课件原稿（pptx）"
          rules={[{ required: true, message: '请上传课件原稿' }]}
        >
          <AttachmentUploadField
            disabled={!editable}
            accept=".ppt,.pptx"
            helperText="必传项，建议上传课件原稿 PPTX 文件。"
          />
        </Form.Item>

        <Form.Item name="lessonPlanFiles" label="教案（docx）">
          <AttachmentUploadField
            disabled={!editable}
            accept=".doc,.docx"
            helperText="选传项，没有可留空。"
          />
        </Form.Item>

        <Form.Item name="scriptFiles" label="逐字稿（docx）">
          <AttachmentUploadField
            disabled={!editable}
            accept=".doc,.docx"
            helperText="选传项，没有可留空。"
          />
        </Form.Item>

        <Form.Item name="guideFiles" label="导学案（docx）">
          <AttachmentUploadField
            disabled={!editable}
            accept=".doc,.docx"
            helperText="选传项，没有可留空。"
          />
        </Form.Item>

        <Form.Item name="otherResearchFiles" label="其他附件（MP3、MP4、docx...）">
          <AttachmentUploadField
            disabled={!editable}
            helperText="选传项，可上传音视频、文档、压缩包等补充资料。"
          />
        </Form.Item>

        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item label="已上传课件原稿">
              <AttachmentList files={course.researchSourceFiles} compact emptyText="暂无课件原稿" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="已上传教案">
              <AttachmentList files={course.lessonPlanFiles} compact emptyText="暂无教案" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="已上传逐字稿">
              <AttachmentList files={course.scriptFiles} compact emptyText="暂无逐字稿" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="已上传导学案">
              <AttachmentList files={course.guideFiles} compact emptyText="暂无导学案" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item label="已上传其他附件">
              <AttachmentList files={course.otherResearchFiles} compact emptyText="暂无其他附件" />
            </Form.Item>
          </Col>
        </Row>

        <Space>
          <Button type="primary" htmlType="submit" loading={busy} disabled={!editable}>
            上传教研资料并确认完成
          </Button>
          {!editable ? (
            <Typography.Text type="secondary">
              当前角色可查看教研信息，但不能编辑此任务。
            </Typography.Text>
          ) : (
            <Typography.Text type="secondary">
              提交后会自动保存教研资料，并流转到待风格稿派单。
            </Typography.Text>
          )}
        </Space>
      </Form>
    </Card>
  )
}
