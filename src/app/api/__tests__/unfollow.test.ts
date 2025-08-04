import { NextRequest } from 'next/server'
import { POST } from '../unfollow/route'

// Mock fetch globally
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('Unfollow API Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
  })

  it('should successfully process unfollow request', async () => {
    const requestBody = {
      userFid: 12345,
      targetFid: 67890
    }

    const request = new NextRequest('http://localhost:3000/api/unfollow', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    // Mock successful user validation
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { user: { fid: 12345 } } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { user: { fid: 67890 } } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { users: [{ fid: 67890 }] } }),
      } as Response)

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.userFid).toBe(12345)
    expect(data.targetFid).toBe(67890)
  })

  it('should return 400 when missing required parameters', async () => {
    const requestBody = {
      userFid: 12345,
      // Missing targetFid
    }

    const request = new NextRequest('http://localhost:3000/api/unfollow', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Missing userFid or targetFid')
  })

  it('should return 404 when user not found', async () => {
    const requestBody = {
      userFid: 12345,
      targetFid: 67890
    }

    const request = new NextRequest('http://localhost:3000/api/unfollow', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    // Mock user not found
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response)

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toContain('One or both users not found')
  })

  it('should return 400 when not following target user', async () => {
    const requestBody = {
      userFid: 12345,
      targetFid: 67890
    }

    const request = new NextRequest('http://localhost:3000/api/unfollow', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    // Mock successful user validation
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { user: { fid: 12345 } } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { user: { fid: 67890 } } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { users: [] } }), // Not following
      } as Response)

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Not following this user')
  })

  it('should handle API errors gracefully', async () => {
    const requestBody = {
      userFid: 12345,
      targetFid: 67890
    }

    const request = new NextRequest('http://localhost:3000/api/unfollow', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    // Mock network error
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain('Unfollow failed')
  })
}) 