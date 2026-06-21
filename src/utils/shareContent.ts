export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/** 与编辑器 textarea 一致的纯文本展示（保留换行与空格） */
export function plainTextToHtml(text: string): string {
  return escapeHtml(text)
}

export function encodeUtf8(content: string): Uint8Array {
  return new TextEncoder().encode(content)
}
