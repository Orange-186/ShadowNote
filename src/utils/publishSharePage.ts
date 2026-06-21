import { supabase } from '../lib/supabase'
import type { Note } from '../types/note'
import { encodeUtf8 } from './shareContent'

export interface SharedNoteView {
  title: string
  content: string
  cover_url: string | null
  updated_at: string
  note_media: Array<{
    media_type: 'image' | 'video'
    public_url: string
    sort_order: number
  }>
}

export function buildShareToken(userId: string, noteId: string): string {
  return `${userId}_${noteId}`
}

export function parseShareToken(token: string): { userId: string; noteId: string } | null {
  const match = token.match(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
  )
  if (!match) return null
  return { userId: match[1], noteId: match[2] }
}

function shareStorageBase(userId: string, noteId: string): string {
  return `${userId}/shares/${noteId}`
}

/** 游客打开的公开链接，指向 App 分享页（非 Storage HTML） */
export function buildPublicShareUrl(userId: string, noteId: string): string {
  return buildAppShareUrl(buildShareToken(userId, noteId))
}

export function buildAppShareUrl(token: string): string {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${window.location.origin}${basePath}/share/${token}`
}

function noteToSharedView(note: Note): SharedNoteView {
  return {
    title: note.title,
    content: note.content,
    cover_url: note.cover_url,
    updated_at: note.updated_at,
    note_media: (note.note_media ?? []).map((item) => ({
      media_type: item.media_type,
      public_url: item.public_url,
      sort_order: item.sort_order,
    })),
  }
}

export async function publishNoteShare(note: Note, userId: string): Promise<string> {
  const shared = noteToSharedView(note)
  const base = shareStorageBase(userId, note.id)
  const shareUrl = buildPublicShareUrl(userId, note.id)
  const jsonBytes = encodeUtf8(JSON.stringify(shared))

  const jsonUpload = await supabase.storage
    .from('note-media')
    .upload(`${base}.json`, jsonBytes, {
      upsert: true,
      contentType: 'application/json; charset=utf-8',
      cacheControl: '300',
    })

  if (jsonUpload.error) throw new Error(jsonUpload.error.message)

  return shareUrl
}

export async function fetchPublishedShare(userId: string, noteId: string): Promise<SharedNoteView | null> {
  const path = `${shareStorageBase(userId, noteId)}.json`
  const { data } = supabase.storage.from('note-media').getPublicUrl(path)
  const response = await fetch(`${data.publicUrl}?t=${Date.now()}`)
  if (!response.ok) return null
  const text = await response.text()
  return JSON.parse(text.replace(/^\uFEFF/, '')) as SharedNoteView
}
