type FetchJsonOptions = RequestInit & {
  errorPrefix?: string
}

export async function fetchJson<T>(input: RequestInfo | URL, options: FetchJsonOptions = {}): Promise<T> {
  const { errorPrefix, ...init } = options
  const response = await fetch(input, init)
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    const payload = await response.json()
    if (!response.ok) {
      const message = payload?.error || payload?.message || `${errorPrefix || 'Request failed'} (${response.status})`
      throw new Error(message)
    }

    return payload as T
  }

  const text = await response.text()
  const fallbackMessage = text.trim().startsWith('<!DOCTYPE')
    ? `${errorPrefix || 'Request failed'}: received HTML instead of JSON (${response.status})`
    : `${errorPrefix || 'Request failed'}: ${text || response.statusText}`

  throw new Error(fallbackMessage)
}
