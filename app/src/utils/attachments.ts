import type { AttachmentFile } from '../types'

export function createAttachment(name: string, overrides?: Partial<AttachmentFile>): AttachmentFile {
  return {
    uid: overrides?.uid ?? `${name}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    size: overrides?.size,
    storageKey: overrides?.storageKey,
    type: overrides?.type,
    uploadedAt: overrides?.uploadedAt ?? '2026-04-20 10:30',
    url: overrides?.url,
  }
}

export function createAttachmentList(names: string[]): AttachmentFile[] {
  return names.map((name, index) =>
    createAttachment(name, {
      uid: `${name}-${index + 1}`,
    }),
  )
}

export function mergeAttachments(...groups: AttachmentFile[][]): AttachmentFile[] {
  const merged = groups.flat()
  const byName = new Map<string, AttachmentFile>()

  merged.forEach((file) => {
    byName.set(file.name, file)
  })

  return Array.from(byName.values())
}

export function makeDemoDownload(file: AttachmentFile) {
  if (file.url && /^https?:\/\//i.test(file.url)) {
    window.open(file.url, '_blank', 'noopener,noreferrer')
    return
  }

  const blob = new Blob(
    [
      `演示附件：${file.name}\n`,
      `上传时间：${file.uploadedAt ?? '未记录'}\n`,
      `文件类型：${file.type ?? 'unknown'}\n`,
      `文件大小：${file.size ?? 0} bytes\n`,
      '\n此文件为前端原型演示生成的下载内容。',
    ],
    { type: file.type || 'text/plain;charset=utf-8' },
  )
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  window.URL.revokeObjectURL(url)
}
