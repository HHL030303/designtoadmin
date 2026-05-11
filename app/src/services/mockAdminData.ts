import { roleLabelMap, roleViewAccess } from '../constants/roles'
import type { AdminAccountRecord, SystemRoleRecord } from '../types'
import { mockUsers } from './mockUsers'

export const initialAdminAccounts: AdminAccountRecord[] = [
  {
    id: 'U-001',
    username: 'planner',
    name: '赵敏',
    status: '启用',
    email: 'planner@example.com',
    createdAt: '2026-03-18 10:00',
    updatedAt: '2026-04-27 09:16',
  },
  {
    id: 'U-002',
    username: 'researcher',
    name: '陈老师',
    status: '启用',
    email: 'researcher@example.com',
    createdAt: '2026-03-18 10:08',
    updatedAt: '2026-04-27 08:40',
  },
  {
    id: 'U-003',
    username: 'coordinator',
    name: '林薇',
    status: '启用',
    email: 'coordinator@example.com',
    createdAt: '2026-03-18 10:15',
    updatedAt: '2026-04-27 08:58',
  },
  {
    id: 'U-004',
    username: 'style',
    name: '唐婧',
    status: '启用',
    email: 'style@example.com',
    createdAt: '2026-03-18 10:24',
    updatedAt: '2026-04-26 19:22',
  },
  {
    id: 'U-005',
    username: 'page',
    name: '江栩',
    status: '启用',
    email: 'page@example.com',
    createdAt: '2026-03-18 10:28',
    updatedAt: '2026-04-26 20:13',
  },
  {
    id: 'U-006',
    username: 'sales',
    name: '高岚',
    status: '停用',
    email: 'sales@example.com',
    createdAt: '2026-03-18 10:36',
    updatedAt: '2026-04-22 14:03',
  },
  {
    id: 'U-007',
    username: 'admin',
    name: '系统管理员',
    status: '启用',
    email: 'admin@example.com',
    createdAt: '2026-03-18 10:46',
    updatedAt: '2026-04-27 09:22',
  },
]

export const initialSystemRoles: SystemRoleRecord[] = mockUsers.map((user) => user.role)
  .filter((value, index, list) => list.indexOf(value) === index)
  .map((role, index) => ({
    id: `R-${String(index + 1).padStart(3, '0')}`,
    code: role,
    name: roleLabelMap[role],
    description: `${roleLabelMap[role]}默认角色`,
    memberCount: mockUsers.filter((account) => account.role === role).length,
    scope: '系统内置角色',
    viewAccess: roleViewAccess[role],
  }))
