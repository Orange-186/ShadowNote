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
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
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
