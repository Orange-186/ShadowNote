import { useCallback, useEffect, useRef, useState } from 'react'
import type { LocalMedia } from '../types/note'
import {
  blocksToContent,
  contentToBlocks,
  insertImageBlock,
  removeImageBlock,
  resolveEndInsertPoint,
  resolveMediaUrl,
  type ContentBlock,
  type InsertImagePosition,
} from '../utils/noteContent'

interface AddImagePrompt {
  x: number
  y: number
  blockIndex: number
  cursor: number
}

interface NoteContentEditorProps {
  content: string
  media: LocalMedia[]
  canAddImage?: boolean
  onChange: (content: string) => void
  insertImageRef?: React.MutableRefObject<(mediaId: string, position?: InsertImagePosition) => void>
  onAddImageRequest?: (position: InsertImagePosition) => void
  onAddImageBlocked?: () => void
  onRemoveMedia?: (mediaId: string) => void
}

export function NoteContentEditor({
  content,
  media,
  canAddImage = true,
  onChange,
  insertImageRef,
  onAddImageRequest,
  onAddImageBlocked,
  onRemoveMedia,
}: NoteContentEditorProps) {
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => contentToBlocks(content))
  const [addImagePrompt, setAddImagePrompt] = useState<AddImagePrompt | null>(null)
  const activeTextRef = useRef<{ index: number; cursor: number }>({ index: 0, cursor: 0 })
  const syncingRef = useRef(false)
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (syncingRef.current) return
    setBlocks(contentToBlocks(content))
  }, [content])

  const emitChange = useCallback(
    (nextBlocks: ContentBlock[]) => {
      syncingRef.current = true
      setBlocks(nextBlocks)
      onChange(blocksToContent(nextBlocks))
      window.requestAnimationFrame(() => {
        syncingRef.current = false
      })
    },
    [onChange],
  )

  const handleInsertImage = useCallback(
    (mediaId: string, position?: InsertImagePosition) => {
      const point = position ?? (() => {
        const { index, cursor } = activeTextRef.current
        const textIndex = blocks[index]?.type === 'text' ? index : blocks.findIndex((b) => b.type === 'text')
        const targetIndex = textIndex >= 0 ? textIndex : 0
        const cursorPos =
          blocks[targetIndex]?.type === 'text' && targetIndex === index
            ? cursor
            : blocks[targetIndex]?.type === 'text'
              ? blocks[targetIndex].text.length
              : 0
        return { blockIndex: targetIndex, cursor: cursorPos }
      })()

      emitChange(insertImageBlock(blocks, point.blockIndex, point.cursor, mediaId))
    },
    [blocks, emitChange],
  )

  useEffect(() => {
    if (insertImageRef) {
      insertImageRef.current = handleInsertImage
    }
  }, [handleInsertImage, insertImageRef])

  const showAddImagePrompt = useCallback(
    (clientX: number, clientY: number, point?: InsertImagePosition) => {
      if (!canAddImage || !editorRef.current) return

      const insertPoint = point ?? resolveEndInsertPoint(blocks)
      activeTextRef.current = { index: insertPoint.blockIndex, cursor: insertPoint.cursor }

      const rect = editorRef.current.getBoundingClientRect()
      const x = Math.min(Math.max(clientX - rect.left, 48), rect.width - 48)
      const y = Math.min(Math.max(clientY - rect.top, 48), rect.height - 16)

      setAddImagePrompt({ x, y, ...insertPoint })
    },
    [blocks, canAddImage],
  )

  useEffect(() => {
    if (!addImagePrompt) return

    const dismiss = () => setAddImagePrompt(null)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss()
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (editorRef.current?.querySelector('.add-image-prompt')?.contains(target)) return
      if ((target as HTMLElement).closest?.('.note-content-editor__tap-area')) return
      dismiss()
    }

    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('scroll', dismiss, true)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('scroll', dismiss, true)
    }
  }, [addImagePrompt])

  const updateTextBlock = (index: number, text: string) => {
    setAddImagePrompt(null)
    const next = blocks.map((block, i) => (i === index && block.type === 'text' ? { ...block, text } : block))
    emitChange(next)
  }

  const trackCursor = (index: number, target: HTMLTextAreaElement) => {
    activeTextRef.current = { index, cursor: target.selectionStart ?? target.value.length }
  }

  const handleRemoveImage = (index: number) => {
    const block = blocks[index]
    if (block?.type === 'image') {
      onRemoveMedia?.(block.mediaId)
    }
    emitChange(removeImageBlock(blocks, index))
  }

  const handleTapAreaClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
    if (!canAddImage) {
      onAddImageBlocked?.()
      return
    }
    showAddImagePrompt(event.clientX, event.clientY)
  }

  const handlePromptConfirm = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (!addImagePrompt) return
    onAddImageRequest?.({ blockIndex: addImagePrompt.blockIndex, cursor: addImagePrompt.cursor })
    setAddImagePrompt(null)
  }

  return (
    <div ref={editorRef} className="note-content-editor">
      {blocks.map((block, index) => {
        if (block.type === 'text') {
          return (
            <textarea
              key={block.id}
              className="editor-content note-body-text note-content-editor__text"
              placeholder={index === 0 ? '开始书写…' : ''}
              value={block.text}
              rows={Math.max(1, block.text.split('\n').length)}
              onChange={(e) => updateTextBlock(index, e.target.value)}
              onSelect={(e) => trackCursor(index, e.currentTarget)}
              onFocus={(e) => {
                setAddImagePrompt(null)
                trackCursor(index, e.currentTarget)
              }}
              onClick={(e) => trackCursor(index, e.currentTarget)}
              onKeyUp={(e) => trackCursor(index, e.currentTarget)}
            />
          )
        }

        const url = resolveMediaUrl(block.mediaId, media)

        return (
          <figure key={block.id} className="inline-image">
            {url ? (
              <img src={url} alt="" />
            ) : (
              <div className="inline-image__placeholder" aria-hidden="true" />
            )}
            <button
              type="button"
              className="inline-image__remove"
              onClick={() => handleRemoveImage(index)}
              aria-label="移除图片"
            >
              ×
            </button>
          </figure>
        )
      })}

      <div
        className="note-content-editor__tap-area"
        role="button"
        tabIndex={0}
        aria-label="点击添加图片"
        onClick={handleTapAreaClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            const rect = event.currentTarget.getBoundingClientRect()
            showAddImagePrompt(rect.left + rect.width / 2, rect.top + 32)
          }
        }}
      />

      {addImagePrompt && (
        <button
          type="button"
          className="add-image-prompt"
          style={{ left: addImagePrompt.x, top: addImagePrompt.y }}
          onClick={handlePromptConfirm}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
            <path d="M8.5 11.5h7M12 8v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          添加图片
        </button>
      )}
    </div>
  )
}
