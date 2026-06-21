import { useEffect } from 'react'
import { getContentSummary } from '../utils/formatDate'
import { canNativeShare, copyShareLink, isWechatBrowser, nativeShare, type ShareLinkPayload } from '../utils/shareNote'

interface WechatSharePanelProps {
  open: boolean
  payload: ShareLinkPayload | null
  onClose: () => void
  onNotify: (message: string) => void
}

export function WechatSharePanel({ open, payload, onClose, onNotify }: WechatSharePanelProps) {
  if (!open || !payload) return null

  const title = payload.title.trim() || '无标题'
  const summary = getContentSummary(payload.content, 120)
  const cover = payload.coverUrl || `${window.location.origin}${import.meta.env.BASE_URL}og-default.png`
  const inWechat = isWechatBrowser()

  useEffect(() => {
    if (!open || !payload) return
    copyShareLink(payload.url).catch(() => {})
  }, [open, payload])

  const handleCopy = async () => {
    try {
      await copyShareLink(payload.url)
      onNotify(inWechat ? '链接已复制，请点右上角 ··· 分享到朋友圈' : '链接已复制，打开微信粘贴分享')
    } catch {
      onNotify('复制失败，请长按下方链接手动复制')
    }
  }

  const handleNativeShare = async () => {
    try {
      await nativeShare(payload)
      onClose()
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      onNotify(err instanceof Error ? err.message : '分享失败')
    }
  }

  return (
    <div className="wechat-share-overlay" role="presentation" onClick={onClose}>
      <div
        className="wechat-share-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wechat-share-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="wechat-share-title" className="wechat-share-panel__title">
          分享到朋友圈
        </h2>

        <article className="wechat-share-card">
          <img className="wechat-share-card__cover" src={cover} alt="" />
          <div className="wechat-share-card__body">
            <h3 className="wechat-share-card__title">{title}</h3>
            <p className="wechat-share-card__summary">{summary}</p>
          </div>
        </article>

        <p className="wechat-share-panel__url">{payload.url}</p>

        {inWechat ? (
          <p className="wechat-share-panel__tip">
            链接已就绪。点击右上角 <strong>···</strong>，选择「分享到朋友圈」即可发布链接卡片。
          </p>
        ) : (
          <p className="wechat-share-panel__tip">
            先复制链接，再打开微信 → 朋友圈 → 长按粘贴发布。
          </p>
        )}

        <div className="wechat-share-panel__actions">
          <button type="button" className="btn btn--primary btn--block" onClick={handleCopy}>
            复制链接
          </button>
          {canNativeShare() && (
            <button type="button" className="btn btn--ghost btn--block" onClick={handleNativeShare}>
              系统分享
            </button>
          )}
          <button type="button" className="btn btn--ghost btn--block" onClick={onClose}>
            完成
          </button>
        </div>
      </div>
    </div>
  )
}
