import html2canvas from 'html2canvas'

export async function captureNoteElement(element: HTMLElement): Promise<HTMLCanvasElement> {
  return html2canvas(element, {
    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim() || '#F1F3F2',
    scale: Math.min(window.devicePixelRatio, 2),
    useCORS: true,
    logging: false,
  })
}

export async function canvasToPngFile(canvas: HTMLCanvasElement, filename: string): Promise<File> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result)
      else reject(new Error('生成图片失败'))
    }, 'image/png')
  })
  return new File([blob], `${filename || 'note'}.png`, { type: 'image/png' })
}

export async function exportNoteAsImage(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await captureNoteElement(element)
  const link = document.createElement('a')
  link.download = `${filename || 'note'}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}
