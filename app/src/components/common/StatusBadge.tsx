import { Tag } from 'antd'
import { statusMeta } from '../../constants/workflow'
import type { CourseStatus } from '../../types'

export function StatusBadge({ status }: { status: CourseStatus }) {
  const meta = statusMeta[status]

  return (
    <Tag className={`status-badge status-badge-${meta.tone ?? 'slate'}`}>
      {meta.label}
    </Tag>
  )
}
