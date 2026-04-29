import type { AuthUser } from '../types'
import { mockUsers } from './mockUsers'

const LATENCY = 240

function delay<T>(value: T, duration = LATENCY): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), duration)
  })
}

export const authService = {
  async login(username: string, password: string) {
    const matched = mockUsers.find(
      (user) => user.username === username.trim() && user.password === password,
    )

    if (!matched) {
      await delay(null)
      throw new Error('账号或密码错误，请使用演示账号登录')
    }

    const { password: _password, ...safeUser } = matched
    return delay<AuthUser>(safeUser)
  },

  async listAccounts() {
    return delay(
      mockUsers.map(({ password, ...user }) => ({
        ...user,
        passwordHint: password,
      })),
    )
  },
}
