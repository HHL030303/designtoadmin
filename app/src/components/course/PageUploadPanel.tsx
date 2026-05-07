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
import type { CourseRecord, UploadPagePayload } from '../../types'
import { StatusBadge } from '../common/StatusBadge'
import { AttachmentList } from '../common/AttachmentList'
import { AttachmentUploadField } from '../common/AttachmentUploadField'
import { summarizePageAssignments } from '../../utils/pageAssignments'

export function PageUploadPanel({
  course,
  editable,
  busy,
  onSubmit,
}: {
  course: CourseRecord
  editable: boolean
  busy?: boolean
  onSubmit: (payload: UploadPagePayload) => void
}) {
  const [form] = Form.useForm<UploadPagePayload>()

  useEffect(() => {
    form.setFieldsValue({
      files: course.pageAttachments,
    })
  }, [course, form])

  return (
    <Card title="内页成品上传" extra={<StatusBadge status={course.status} />}>
      <Descriptions column={1} size="small" className="panel-descriptions">
        <Descriptions.Item label="课件">{course.title}</Descriptions.Item>
        <Descriptions.Item label="主设计师">{course.pageLead}</Descriptions.Item>
        <Descriptions.Item label="内页分工">
          {course.pageAssignments && course.pageAssignments.length > 0
            ? summarizePageAssignments(course.pageAssignments, course.pageLead)
            : course.pageDesigners.length > 0
              ? course.pageDesigners.join('、')
              : '暂无'}
        </Descriptions.Item>
        <Descriptions.Item label="交付截止时间">
          {course.pageDueDate ? formatDateLabel(course.pageDueDate) : '未设置'}
        </Descriptions.Item>
        <Descriptions.Item label="教研附件下载">
          <AttachmentList files={course.researchAttachments} compact emptyText="暂无附件" />
        </Descriptions.Item>
        <Descriptions.Item label="风格稿参考">
          <AttachmentList files={course.styleAttachments} compact emptyText="暂无风格稿" />
        </Descriptions.Item>
        <Descriptions.Item label="命名规范">
          {`${course.title}_内页成品_版本号`}
        </Descriptions.Item>
      </Descriptions>

      <Form form={form} layout="vertical" onFinish={(values) => onSubmit(values)}>
        <Form.Item
          name="files"
          label="上传内页成品"
          rules={[{ required: true, message: '请至少上传一个内页文件' }]}
        >
          <AttachmentUploadField
            disabled={!editable}
            helperText={`提交时会校验文件名是否满足“${course.title}_内页成品_版本号”前缀。`}
          />
        </Form.Item>

        <Space orientation="vertical" size={12} className="panel-stack-full">
          <Typography.Text type="secondary">
            上传成功后，系统自动校验文件数量与命名规范，并流转到“待入库确认”。
          </Typography.Text>
          <Button type="primary" htmlType="submit" loading={busy} disabled={!editable}>
            提交内页成品
          </Button>
        </Space>
      </Form>
    </Card>
  )
}
