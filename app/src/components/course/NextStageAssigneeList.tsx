import { Button, Col, Form, InputNumber, Row, Select, Tag } from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import type { ProjectMemberRecord } from '../../types'

type NextStageAssigneeListProps = {
  add: (defaultValue?: { assignedPageCount?: number; userId?: string }, insertIndex?: number) => void
  fields: Array<{
    key: number
    name: number
  }>
  loading: boolean
  memberHasMore: boolean
  members: ProjectMemberRecord[]
  remove: (index: number) => void
  searchValue: string
  showAssignedPageCount: boolean
  onClearSearch: () => void
  onLoadMore: () => void
  onSearch: (value: string) => void
}

export function NextStageAssigneeList({
  add,
  fields,
  loading,
  memberHasMore,
  members,
  remove,
  searchValue,
  showAssignedPageCount,
  onClearSearch,
  onLoadMore,
  onSearch,
}: NextStageAssigneeListProps) {
  return (
    <div className="task-process-modal__assignee-panel">
      <Row gutter={12} align="middle">
        <Col span={1} />
        <Col span={showAssignedPageCount ? 8 : 16}>下一阶段任务人员</Col>
        {showAssignedPageCount ? <Col span={8}>分配页数</Col> : null}
        <Col span={2}>操作</Col>
      </Row>

      {fields.map((field, index) => (
        <div key={field.key} className="task-process-modal__assignee-row">
          <Row gutter={12} align="middle">
            <Col span={1}>
              <div className="task-process-modal__assignee-identity">
                {index === 0 ? (
                  <Tag
                    bordered={false}
                    color="blue"
                    className="task-process-modal__assignee-role-tag"
                  >
                    主
                  </Tag>
                ) : null}
              </div>
            </Col>
            <Col span={showAssignedPageCount ? 8 : 16}>
              <Form.Item
                {...field}
                name={[field.name, 'userId']}
                rules={[{ required: true, message: '请选择任务人员' }]}
              >
                <Select
                  showSearch
                  allowClear
                  filterOption={false}
                  placeholder={index === 0 ? '请选择主执行人' : '请选择执行人'}
                  loading={loading}
                  searchValue={searchValue}
                  options={members.map((member) => ({
                    label: `${member.userName} · ${member.userEmail}`,
                    value: member.userId,
                  }))}
                  onSearch={onSearch}
                  onClear={onClearSearch}
                  onPopupScroll={(event) => {
                    const target = event.target as HTMLDivElement
                    const reachedBottom =
                      target.scrollTop + target.clientHeight >= target.scrollHeight - 8

                    if (!reachedBottom || loading || !memberHasMore) {
                      return
                    }

                    onLoadMore()
                  }}
                />
              </Form.Item>
            </Col>
            {showAssignedPageCount ? (
              <Col span={8}>
                <Form.Item
                  {...field}
                  name={[field.name, 'assignedPageCount']}
                  rules={[{ required: true, message: '请输入分配页数' }]}
                >
                  <InputNumber
                    min={1}
                    precision={0}
                    className="full-width-control"
                    placeholder="请输入分配页数"
                  />
                </Form.Item>
              </Col>
            ) : null}
            <Col span={2}>
              <div className="task-process-modal__assignee-actions">
                {index === 0 ? (
                  <Button
                    type="text"
                    className="task-process-modal__assignee-action-button"
                    icon={<PlusOutlined />}
                    onClick={() =>
                      add({
                        assignedPageCount: 0,
                        userId: undefined,
                      })
                    }
                  />
                ) : (
                  <Button
                    type="text"
                    className="task-process-modal__assignee-action-button task-process-modal__assignee-action-button--danger"
                    icon={<MinusCircleOutlined />}
                    onClick={() => remove(field.name)}
                  />
                )}
              </div>
            </Col>
          </Row>
        </div>
      ))}
    </div>
  )
}
