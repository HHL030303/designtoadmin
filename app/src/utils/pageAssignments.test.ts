import { describe, expect, it } from 'vitest'
import {
  summarizePageAssignments,
  validatePageDispatchPayload,
} from './pageAssignments'

describe('pageAssignments', () => {
  it('marks the lead designer in the summary', () => {
    expect(
      summarizePageAssignments(
        [
          { designer: '江栩', pageCount: 12 },
          { designer: '余璟', pageCount: 8 },
        ],
        '江栩',
      ),
    ).toBe('江栩（主设计师 · 12 页）、余璟（8 页）')
  })

  it('rejects a lead designer outside the assignment list', () => {
    expect(
      validatePageDispatchPayload(
        {
          designers: ['江栩', '余璟'],
          leadDesigner: '闻溪',
          dueDate: '2026-04-30',
          pageAssignments: [
            { designer: '江栩', pageCount: 12 },
            { designer: '余璟', pageCount: 8 },
          ],
        },
        20,
      ),
    ).toBe('主设计师必须包含在内页分工中')
  })

  it('rejects page totals that do not match the course total', () => {
    expect(
      validatePageDispatchPayload(
        {
          designers: ['江栩', '余璟'],
          leadDesigner: '江栩',
          dueDate: '2026-04-30',
          pageAssignments: [
            { designer: '江栩', pageCount: 10 },
            { designer: '余璟', pageCount: 8 },
          ],
        },
        20,
      ),
    ).toBe('分配页数合计需等于总页数 20 页')
  })
})
