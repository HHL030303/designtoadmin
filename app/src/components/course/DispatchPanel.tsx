import { useEffect } from 'react'
import {
  Button,
  Card,
  Descriptions,
  Form,
  InputNumber,
  Input,
  Select,
  Typography,
} from 'antd'
import { formatDateLabel } from '../../constants/workflow'
import type { CourseRecord, DesignerPageAssignment, DispatchPayload } from '../../types'
import { canEditPageDispatch, canEditStyleDispatch } from '../../domain/permissions'
import { StatusBadge } from '../common/StatusBadge'
import { AttachmentList } from '../common/AttachmentList'
import { summarizePageAssignments } from '../../utils/pageAssignments'

const styleDesignerOptions = ['唐婧', '陆鸣', '南音', '黎夏']
const pageDesignerOptions = ['江栩', '余璟', '闻溪', '时砚']

interface PageDispatchFormValues {
  leadDesigner?: string
  leadPageCount?: number
  dueDate: string
  pageAssignments?: DesignerPageAssignment[]
}

const emptyPageAssignment = {
  designer: undefined,
  pageCount: undefined,
} as unknown as DesignerPageAssignment

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
  const [pageForm] = Form.useForm<PageDispatchFormValues>()
  const leadDesignerOptions = pageDesignerOptions.map((value) => ({ label: value, value }))
  const canEditStyle = canEditStyleDispatch('admin', course)
  const canEditPage = canEditPageDispatch('admin', course)

  useEffect(() => {
    styleForm.setFieldsValue({
      designers: course.styleDesigners[0],
      dueDate: course.styleDueDate || course.finalDueDate,
    })
    const normalizedAssignments =
      course.pageAssignments && course.pageAssignments.length > 0
        ? course.pageAssignments
        : course.pageDesigners.length > 0
          ? course.pageDesigners.map((designer) => ({
              designer,
              pageCount: 1,
            }))
          : [emptyPageAssignment]
    const currentLeadDesigner =
      course.pageLead !== '待派单' ? course.pageLead : normalizedAssignments[0]?.designer
    const leadAssignment = normalizedAssignments.find(
      (assignment) => assignment.designer === currentLeadDesigner,
    )
    const collaboratorAssignments = normalizedAssignments.filter(
      (assignment) => assignment.designer !== currentLeadDesigner,
    )

    pageForm.setFieldsValue({
      leadDesigner: currentLeadDesigner,
      leadPageCount: leadAssignment?.pageCount,
      pageAssignments:
        collaboratorAssignments.length > 0 ? collaboratorAssignments : [emptyPageAssignment],
      dueDate: course.pageDueDate || course.finalDueDate,
    })
  }, [course, styleForm, pageForm])

  if (canEditStyle) {
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
          className="dispatch-form"
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
          <div className="dispatch-form-actions">
            <Button type="primary" htmlType="submit" loading={busy} disabled={!editable}>
              保存风格稿派单
            </Button>
          </div>
        </Form>
      </Card>
    )
  }

  if (canEditPage) {
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
        <Form
          form={pageForm}
          layout="vertical"
          className="dispatch-form"
          onFinish={(values) => {
            const leadAssignment: DesignerPageAssignment | undefined =
              values.leadDesigner && values.leadPageCount
                ? {
                    designer: values.leadDesigner,
                    pageCount: values.leadPageCount,
                  }
                : undefined

            const collaboratorAssignments = (values.pageAssignments ?? []).filter(
              (item) => item?.designer || item?.pageCount,
            )
            const mergedAssignments = leadAssignment
              ? [leadAssignment, ...collaboratorAssignments]
              : collaboratorAssignments

            onSavePageDispatch({
              designers: mergedAssignments.map((item) => item.designer),
              leadDesigner: values.leadDesigner,
              dueDate: values.dueDate,
              pageAssignments: mergedAssignments,
            })
          }}
        >
          <div className="dispatch-form-section">
            {/* <div className="dispatch-form-section-header">
              <Typography.Text strong>内页主设计师分工</Typography.Text>
              <Typography.Text type="secondary">主设计师需单独指定负责页数</Typography.Text>
            </div> */}
            <div className="dispatch-grid dispatch-grid-lead">
              <Form.Item
                name="leadDesigner"
                label="主设计师"
                className="dispatch-form-item-compact"
                rules={[{ required: true, message: '请选择主设计师' }]}
              >
                <Select
                  disabled={!editable}
                  className="dispatch-control dispatch-select"
                  placeholder="选择主设计师"
                  options={leadDesignerOptions}
                />
              </Form.Item>
              <Form.Item
                name="leadPageCount"
                label="主设计师页数"
                className="dispatch-form-item-compact"
                rules={[
                  { required: true, message: '请输入主设计师页数' },
                  {
                    type: 'number',
                    min: 1,
                    message: '页数必须大于 0',
                  },
                ]}
              >
                <InputNumber
                  disabled={!editable}
                  className="dispatch-control"
                  min={1}
                  precision={0}
                  placeholder="页数"
                  addonAfter="页"
                />
              </Form.Item>
            </div>
          </div>
          <Form.List
            name="pageAssignments"
            // rules={[
            //   {
            //     validator: async (_, value: DesignerPageAssignment[] | undefined) => {
            //       if (!value || value.length === 0) {
            //         throw new Error('请至少添加一位内页设计师并填写页数')
            //       }
            //     },
            //   },
            // ]}
          >
            {(fields, { add, remove }, { errors }) => (
              <div className="panel-stack-full flex flex-col gap-3">
                <div className="dispatch-form-section">
                  {/* <div className="dispatch-form-section-header">
                    <Typography.Text strong>协作设计师分工</Typography.Text>
                    <Typography.Text type="secondary">按人拆分页数，避免重复分配</Typography.Text>
                  </div> */}
                  <div className="panel-stack-full flex flex-col gap-3">
                    <div className="dispatch-grid dispatch-grid-row dispatch-grid-head">
                      <Typography.Text type="secondary">协作设计师</Typography.Text>
                      <Typography.Text type="secondary">页数</Typography.Text>
                      <Typography.Text type="secondary">操作</Typography.Text>
                    </div>
                    {fields.map((field) => (
                      <div key={field.key} className="dispatch-grid dispatch-grid-row dispatch-grid-body">
                        <Form.Item
                          {...field}
                          name={[field.name, 'designer']}
                           className="dispatch-form-item-compact"
                          rules={[{ required: true, message: '请选择设计师' }]}
                        >
                          <Select
                            disabled={!editable}
                            className="dispatch-control dispatch-select"
                            placeholder="选择协作设计师"
                            options={pageDesignerOptions.map((value) => ({
                              label: value,
                              value,
                            }))}
                          />
                        </Form.Item>
                        <Form.Item
                          {...field}
                          name={[field.name, 'pageCount']}
                          className="dispatch-form-item-compact"
                          rules={[
                            { required: true, message: '请输入页数' },
                            {
                              type: 'number',
                              min: 1,
                              message: '页数必须大于 0',
                            },
                          ]}
                        >
                          <InputNumber
                            disabled={!editable}
                            className="dispatch-control"
                            min={1}
                            precision={0}
                            placeholder="页数"
                            addonAfter="页"
                          />
                        </Form.Item>
                        <Button
                          className="dispatch-row-action"
                          disabled={!editable || fields.length === 1}
                          onClick={() => remove(field.name)}
                        >
                          删除
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <Form.ErrorList errors={errors} />
                <Button
                  className="dispatch-add-button"
                  disabled={!editable}
                  onClick={() => add(emptyPageAssignment)}
                >
                  新增协作设计师
                </Button>
              </div>
            )}
          </Form.List>
          {/* <div className="dispatch-form-summary">
            <Typography.Text type="secondary">
              主设计师和协作设计师都需要配置页数；已填写总页数时，系统会校验分配合计是否一致。
            </Typography.Text>
            <Typography.Text className="dispatch-form-summary-count">
              当前分配：{(leadPageCount ?? 0) +
                (pageAssignments ?? []).reduce(
                  (sum, item) => sum + (item?.pageCount ?? 0),
                  0,
                )} 页
              {course.totalPageCount ? ` / 总页数 ${course.totalPageCount} 页` : ''}
            </Typography.Text>
          </div> */}
          <Form.Item
            name="dueDate"
            label="内页交付截止时间"
            rules={[{ required: true, message: '请选择截止时间' }]}
          >
            <Input className="dispatch-control" type="date" disabled={!editable} />
          </Form.Item>
          <div className="dispatch-form-actions">
            <Button type="primary" htmlType="submit" loading={busy} disabled={!editable}>
              保存内页派单
            </Button>
          </div>
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
        <Descriptions.Item label="内页分工">
          {course.pageAssignments && course.pageAssignments.length > 0
            ? summarizePageAssignments(course.pageAssignments, course.pageLead)
            : course.pageDesigners.length > 0
              ? course.pageDesigners.join('、')
              : '暂无'}
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
      <div className="panel-stack-full flex flex-col gap-3">
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
      </div>
    </Card>
  )
}
