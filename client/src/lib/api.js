export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || (status ? `Request failed (${status})` : 'Network error — is the server running?'))
    this.status = status
    this.body = body
  }
}

let unauthorizedHandler = () => {}

// Called whenever the server rejects our token, so the app can fall back to the PIN pad.
export function onUnauthorized(handler) {
  unauthorizedHandler = handler
}

export function notifyUnauthorized() {
  unauthorizedHandler()
}

async function request(method, url, body) {
  let res
  try {
    res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0)
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401 && !url.startsWith('/api/auth/')) notifyUnauthorized()
    throw new ApiError(res.status, data)
  }
  return data
}

export const api = {
  me: () => request('GET', '/api/auth/me'),
  login: (pin) => request('POST', '/api/auth/login', { pin }),
  logout: () => request('POST', '/api/auth/logout'),

  listItems: () => request('GET', '/api/items'),
  createText: (content) => request('POST', '/api/items/text', { content }),
  updateItem: (id, patch) => request('PATCH', `/api/items/${id}`, patch),
  deleteItem: (id) => request('DELETE', `/api/items/${id}`),

  // No slug = generate a random one.
  share: (id, slug = null) => request('PUT', `/api/items/${id}/share`, { slug }),
  unshare: (id) => request('DELETE', `/api/items/${id}/share`),

  getShared: (slug) => request('GET', `/api/share/${encodeURIComponent(slug)}`),
}

// XHR rather than fetch so we get upload progress.
export function uploadFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/items/files')
    xhr.responseType = 'json'
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve(xhr.response[0])
      if (xhr.status === 401) notifyUnauthorized()
      reject(new ApiError(xhr.status, xhr.response))
    }
    xhr.onerror = () => reject(new ApiError(0))

    const form = new FormData()
    form.append('files', file, file.name)
    xhr.send(form)
  })
}

export function fileUrl(item, { download = false } = {}) {
  return `/api/items/${item.id}/file${download ? '?download=1' : ''}`
}

export function sharedFileUrl(slug, { download = false } = {}) {
  return `/api/share/${encodeURIComponent(slug)}/file${download ? '?download=1' : ''}`
}

export function shareUrl(slug) {
  return `${window.location.origin}/s/${slug}`
}
