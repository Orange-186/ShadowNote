export interface SharePayload {
  title: string
  content: string
}

export function buildShareText({ title, content }: SharePayload): string {
  const heading = title.trim() || '无标题'
  const body = content.trim()
  return body ? `${heading}\n\n${body}` : heading
}

export async function copyShareText(payload: SharePayload): Promise<void> {
  const text = buildShareText(payload)

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return
    }
  } catch {
    // iOS / 部分浏览器 clipboard API 可能失败，回退到 execCommand
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '0'
  textarea.style.top = '0'
  textarea.style.opacity = '0'
  textarea.style.pointerEvents = 'none'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  textarea.setSelectionRange(0, text.length)

  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)

  if (!copied) {
    throw new Error('复制失败，请使用「复制」按钮或手动选择内容')
  }
}

/** 微信无 Web 分享接口：移动端优先调系统分享（可选微信），否则复制并提示 */
export async function shareViaWeChat(payload: SharePayload): Promise<'shared' | 'copied'> {
  if (canNativeShare()) {
    await nativeShare(payload)
    return 'shared'
  }

  await copyShareText(payload)
  return 'copied'
}

export function openWeiboShare(payload: SharePayload): void {
  const text = buildShareText(payload)
  const shareUrl = new URL('https://service.weibo.com/share/share.php')
  shareUrl.searchParams.set('title', text)
  shareUrl.searchParams.set('url', window.location.href)
  window.open(shareUrl.toString(), '_blank', 'noopener,noreferrer')
}

export function openQQShare(payload: SharePayload): void {
  const title = payload.title.trim() || '无标题'
  const summary = payload.content.trim() || title
  const shareUrl = new URL('https://connect.qq.com/widget/shareqq/index.html')
  shareUrl.searchParams.set('url', window.location.href)
  shareUrl.searchParams.set('title', title)
  shareUrl.searchParams.set('summary', summary)
  window.open(shareUrl.toString(), '_blank', 'noopener,noreferrer')
}

export function openTwitterShare(payload: SharePayload): void {
  const text = buildShareText(payload)
  const shareUrl = new URL('https://twitter.com/intent/tweet')
  shareUrl.searchParams.set('text', text)
  window.open(shareUrl.toString(), '_blank', 'noopener,noreferrer')
}

export function canNativeShare(): boolean {
  return typeof navigator.share === 'function'
}

export async function nativeShare(payload: SharePayload, file?: File): Promise<void> {
  if (!canNativeShare()) {
    throw new Error('当前设备不支持系统分享')
  }

  const shareData: ShareData = {
    title: payload.title.trim() || 'XS Note',
    text: buildShareText(payload),
    url: window.location.href,
  }

  if (file && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ ...shareData, files: [file] })
    return
  }

  await navigator.share(shareData)
}

export function canShareFiles(): boolean {
  if (typeof navigator.canShare !== 'function') return false
  try {
    return navigator.canShare({ files: [new File([''], 'test.png', { type: 'image/png' })] })
  } catch {
    return false
  }
}
