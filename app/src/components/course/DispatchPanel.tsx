import { useEffect } from 'react'
import {
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Select,
  Space,
  Typography,
} from 'antd'
import { formatDateLabel } from '../../constants/workflow'
import type { CourseRecord, DispatchPayload } from '../../types'
import { StatusBadge } from '../common/StatusBadge'
import { AttachmentList } from '../common/AttachmentList'

const styleDesignerOptions = ['唐婧', '陆鸣', '南音', '黎夏']
const pageDesignerOptions = ['江栩', '余璟', '闻溪', '时砚']

export function DispatchPanel({
  course,
  editable,
  busy,
  onSaveStyleDispatch,
  onSavePageDispatch,
  onConfirmArchive,
}: {
  course: CourseRecord
  editable: boolean
  busy?: boolean
  onSaveStyleDispatch: (payload: DispatchPayload) => void
  onSavePageDispatch: (payload: DispatchPayload) => void
  onConfirmArchive: () => void
}) {
  const [styleForm] = Form.useForm<{ designers?: string; dueDate: string }>()
  const [pageForm] = Form.useForm<DispatchPayload>()

  useEffect(() => {
    styleForm.setFieldsValue({
      designers: course.styleDesigners[0],
      dueDate: course.styleDueDate || course.finalDueDate,
    })
    pageForm.setFieldsValue({
      designers: course.pageDesigners,
      leadDesigner: course.pageLead !== '待派单' ? course.pageLead : undefined,
      dueDate: course.pageDueDate || course.finalDueDate,
    })
  }, [course, styleForm, pageForm])

  if (course.status === 'pendingStyleDispatch') {
    return (
      <Card
        title="风格稿派单"
        extra={<StatusBadge status={course.status} />}
      >
        <Descriptions column={1} size="small" className="panel-descriptions">
          <Descriptions.Item label="课件">{course.title}</Descriptions.Item>
          <Descriptions.Item label="教研附件">
            <AttachmentList files={course.researchAttachments} compact emptyText="暂无附件" />
          </Descriptions.Item>
          <Descriptions.Item label="教研完成时间">
            {formatDateLabel(course.researchDueDate)}
          </Descriptions.Item>
        </Descriptions>
        <Form
          form={styleForm}
          layout="vertical"
          onFinish={(values) =>
            onSaveStyleDispatch({
              designers: values.designers ? [values.designers] : [],
              dueDate: values.dueDate,
            })
          }
        >
          <Form.Item
            name="designers"
            label="风格稿设计师"
            rules={[{ required: true, message: '请选择风格稿设计师' }]}
          >
            <Select
              disabled={!editable}
              options={styleDesignerOptions.map((value) => ({ label: value, value }))}
            />
          </Form.Item>
          <Form.Item
            name="dueDate"
            label="风格稿交付截止时间"
            rules={[{ required: true, message: '请选择截止时间' }]}
          >
            <Input type="date" disabled={!editable} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={busy} disabled={!editable}>
            保存风格稿派单
          </Button>
        </Form>
      </Card>
    )
  }

  if (course.status === 'pendingPageDispatch') {
    return (
      <Card
        title="内页派单"
        extra={<StatusBadge status={course.status} />}
      >
        <Descriptions column={1} size="small" className="panel-descriptions">
          <Descriptions.Item label="课件">{course.title}</Descriptions.Item>
          <Descriptions.Item label="风格稿设计师">
            {course.styleDesigners[0] || '暂无'}
          </Descriptions.Item>
          <Descriptions.Item label="风格稿交付截止时间">
            {course.styleDueDate ? formatDateLabel(course.styleDueDate) : '未设置'}
          </Descriptions.Item>
        </Descriptions>
        <Form form={pageForm} layout="vertical" onFinish={(values) => onSavePageDispatch(values)}>
          <Form.Item
            name="designers"
            label="内页设计师"
            rules={[{ required: true, message: '请选择至少一位设计师' }]}
          >
            <Select
              mode="multiple"
              disabled={!editable}
              options={pageDesignerOptions.map((value) => ({ label: value, value }))}
            />
          </Form.Item>
          <Form.Item
            name="leadDesigner"
            label="内页主设计师"
            rules={[{ required: true, message: '请选择主设计师' }]}
          >
            <Select
              disabled={!editable}
              options={pageDesignerOptions.map((value) => ({ label: value, value }))}
            />
          </Form.Item>
          <Form.Item
            name="dueDate"
            label="内页交付截止时间"
            rules={[{ required: true, message: '请选择截止时间' }]}
          >
            <Input type="date" disabled={!editable} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={busy} disabled={!editable}>
            保存内页派单
          </Button>
        </Form>
      </Card>
    )
  }

  return (
    <Card
      title="确认入库"
      extra={<StatusBadge status={course.status} />}
    >
      <Descriptions column={1} size="small" className="panel-descriptions">
        <Descriptions.Item label="课件">{course.title}</Descriptions.Item>
        <Descriptions.Item label="内页主设计师">{course.pageLead}</Descriptions.Item>
        <Descriptions.Item label="内页设计师">
          {course.pageDesigners.length > 0 ? course.pageDesigners.join('、') : '暂无'}
        </Descriptions.Item>
        <Descriptions.Item label="内页提交附件">
          <AttachmentList files={course.pageAttachments} compact emptyText="暂无内页成品" />
        </Descriptions.Item>
        <Descriptions.Item label="风格稿参考">
          <AttachmentList files={course.styleAttachments} compact emptyText="暂无风格稿" />
        </Descriptions.Item>
        <Descriptions.Item label="教研附件">
          <AttachmentList files={course.researchAttachments} compact emptyText="暂无教研附件" />
        </Descriptions.Item>
        <Descriptions.Item label="文件数量校验">
          {course.fileCountCheckPassed ? '已完整' : '未通过'}
        </Descriptions.Item>
        <Descriptions.Item label="命名规范校验">
          {course.namingCheckPassed ? '已通过' : '未通过'}
        </Descriptions.Item>
        <Descriptions.Item label="系统校验结果">
          {course.fileCountCheckPassed && course.namingCheckPassed
            ? '文件数量完整，命名已通过'
            : '仍有异常，请先修正'}
        </Descriptions.Item>
      </Descriptions>
      <Space direction="vertical" size={12} className="panel-stack-full">
        <Typography.Text type="secondary">
          内页设计师上传成品后，设计统筹可在这里查看提交数据和系统校验结果。点击确认入库后，系统会自动完成打包并直接归档，无需其他角色再手动确认。
        </Typography.Text>
        <Button
          type="primary"
          onClick={onConfirmArchive}
          loading={busy}
          disabled={!editable || !course.fileCountCheckPassed || !course.namingCheckPassed}
        >
          确认入库并自动归档
        </Button>
      </Space>
    </Card>
  )
}
