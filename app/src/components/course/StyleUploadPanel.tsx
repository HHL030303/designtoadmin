import { useEffect } from 'react'
import {
  Button,
  Card,
  Descriptions,
  Form,
  Space,
  Typography,
} from 'antd'
import { formatDateLabel } from '../../constants/workflow'
import type { CourseRecord, UploadStylePayload } from '../../types'
import { StatusBadge } from '../common/StatusBadge'
import { AttachmentList } from '../common/AttachmentList'
import { AttachmentUploadField } from '../common/AttachmentUploadField'

export function StyleUploadPanel({
  course,
  editable,
  busy,
  onSubmit,
}: {
  course: CourseRecord
  editable: boolean
  busy?: boolean
  onSubmit: (payload: UploadStylePayload) => void
}) {
  const [form] = Form.useForm<UploadStylePayload>()

  useEffect(() => {
    form.setFieldsValue({
      files: course.styleAttachments,
    })
  }, [course, form])

  return (
    <Card title="风格稿上传" extra={<StatusBadge status={course.status} />}>
      <Descriptions column={1} size="small" className="panel-descriptions">
        <Descriptions.Item label="课件">{course.title}</Descriptions.Item>
        <Descriptions.Item label="风格稿设计师">{course.styleDesigners[0] || '未分配'}</Descriptions.Item>
        <Descriptions.Item label="交付截止时间">
          {course.styleDueDate ? formatDateLabel(course.styleDueDate) : '未设置'}
        </Descriptions.Item>
        <Descriptions.Item label="教研附件下载">
          <AttachmentList files={course.researchAttachments} compact emptyText="暂无附件" />
        </Descriptions.Item>
        <Descriptions.Item label="命名规范">
          {`${course.title}_风格稿_版本号`}
        </Descriptions.Item>
      </Descriptions>

      <Form form={form} layout="vertical" onFinish={(values) => onSubmit(values)}>
        <Form.Item
          name="files"
          label="上传风格稿成品"
          rules={[{ required: true, message: '请至少上传一个风格稿文件' }]}
        >
          <AttachmentUploadField
            disabled={!editable}
            helperText={`提交时会校验文件名是否满足“${course.title}_风格稿_版本号”前缀。`}
          />
        </Form.Item>

        <Space direction="vertical" size={12} className="panel-stack-full">
          <Typography.Text type="secondary">
            上传成功即视为线下审核通过，系统自动流转到“待内页派单”。
          </Typography.Text>
          <Button type="primary" htmlType="submit" loading={busy} disabled={!editable}>
            提交风格稿
          </Button>
        </Space>
      </Form>
    </Card>
  )
}
