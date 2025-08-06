// In-memory storage for notification tokens (replace with Redis in production)
export const notificationTokens = new Map<string, { token: string; url: string; fid: number }>()

export function addNotificationToken(fid: number, token: string, url: string) {
  const key = `${fid}-${token}`
  notificationTokens.set(key, { token, url, fid })
}

export function removeNotificationTokensForFid(fid: number) {
  for (const [key, value] of notificationTokens.entries()) {
    if (value.fid === fid) {
      notificationTokens.delete(key)
    }
  }
}

export function getNotificationTokensForFids(fids: number[]) {
  const tokens: string[] = []
  const urls: string[] = []

  for (const [key, value] of notificationTokens.entries()) {
    if (fids.includes(value.fid)) {
      tokens.push(value.token)
      urls.push(value.url)
    }
  }

  return { tokens, urls }
}

export function removeInvalidToken(invalidToken: string) {
  for (const [key, value] of notificationTokens.entries()) {
    if (value.token === invalidToken) {
      notificationTokens.delete(key)
    }
  }
} 