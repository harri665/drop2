export async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // Fall through to the legacy path (e.g. document not focused).
    }
  }

  // The async clipboard API only exists over HTTPS/localhost — this keeps copy working on a LAN IP.
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.cssText = 'position:fixed;top:0;left:0;opacity:0;'
  document.body.appendChild(textarea)
  textarea.select()
  textarea.setSelectionRange(0, text.length)
  const ok = document.execCommand('copy')
  textarea.remove()
  if (!ok) throw new Error('Copy failed')
}

export const canCopyImages =
  typeof window !== 'undefined' && window.isSecureContext && typeof window.ClipboardItem !== 'undefined'

function toPng(blob) {
  if (blob.type === 'image/png') return Promise.resolve(blob)
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d').drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      canvas.toBlob((png) => (png ? resolve(png) : reject(new Error('Could not convert image'))), 'image/png')
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not load image'))
    }
    img.src = url
  })
}

// Browsers only accept PNG on the clipboard. The blob is passed as a promise so
// Safari still treats the write as part of the original tap.
export async function copyImage(url) {
  const png = fetch(url)
    .then((res) => res.blob())
    .then(toPng)
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
}
