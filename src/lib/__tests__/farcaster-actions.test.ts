import { getFarcasterSigner, unfollowUser, getFollowingList, batchUnfollow } from '../farcaster-actions'

// Mock fetch responses
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('Farcaster Actions - Core Functionality Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
  })

  describe('getFarcasterSigner', () => {
    it('should return signer when Farcaster native environment is available', async () => {
      const signer = await getFarcasterSigner()
      
      expect(signer).toBeTruthy()
      expect(signer?.getFid).toBeDefined()
      expect(signer?.signMessage).toBeDefined()
      expect(signer?.getPublicKey).toBeDefined()
    })

    it('should handle missing Farcaster environment gracefully', async () => {
      // Temporarily override farcaster to be undefined
      const originalFarcaster = (window as any).farcaster
      Object.defineProperty(window, 'farcaster', {
        value: undefined,
        writable: true,
        configurable: true,
      })
      
      const signer = await getFarcasterSigner()
      expect(signer).toBeNull()
      
      // Restore
      Object.defineProperty(window, 'farcaster', {
        value: originalFarcaster,
        writable: true,
        configurable: true,
      })
    })

    it('should prioritize native Farcaster over Privy wallet', async () => {
      const signer = await getFarcasterSigner()
      expect(signer).toBeTruthy()
      
      // Verify it's using native Farcaster (not Privy)
      const fid = await signer!.getFid()
      expect(fid).toBe(12345) // From our mock
    })
  })

  describe('unfollowUser', () => {
    it('should successfully unfollow a user', async () => {
      const signer = await getFarcasterSigner()
      expect(signer).toBeTruthy()

      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hash: 'test-hash-123' }),
      } as Response)

      const result = await unfollowUser(signer!, 67890)

      expect(result.success).toBe(true)
      expect(result.messageHash).toBe('test-hash-123')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.farcaster.xyz/v2/submit-message',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })

    it('should handle unfollow API errors gracefully', async () => {
      const signer = await getFarcasterSigner()
      
      // Mock failed API response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Hub submission failed',
      } as Response)

      const result = await unfollowUser(signer!, 67890)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Hub submission failed')
    })

    it('should handle network errors during unfollow', async () => {
      const signer = await getFarcasterSigner()
      
      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await unfollowUser(signer!, 67890)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error')
    })
  })

  describe('getFollowingList', () => {
    it('should fetch following list with pagination', async () => {
      const mockUsers = [
        { fid: 1, username: 'user1', displayName: 'User One', pfp: { url: 'avatar1.jpg' } },
        { fid: 2, username: 'user2', displayName: 'User Two', pfp: { url: 'avatar2.jpg' } },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            users: mockUsers,
            next: { cursor: 'next-cursor-123' }
          }
        }),
      } as Response)

      const result = await getFollowingList(12345)

      expect(result.users).toHaveLength(2)
      expect(result.users[0]).toEqual({
        fid: 1,
        username: 'user1',
        displayName: 'User One',
        pfp: 'avatar1.jpg'
      })
      expect(result.nextCursor).toBe('next-cursor-123')
    })

    it('should handle API errors when fetching following list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'API Error',
      } as Response)

      await expect(getFollowingList(12345)).rejects.toThrow('Failed to fetch following list')
    })
  })

  describe('batchUnfollow', () => {
    it('should successfully batch unfollow multiple users', async () => {
      const signer = await getFarcasterSigner()
      const targetFids = [1, 2, 3]
      const progressCallback = jest.fn()

      // Mock successful unfollows
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ hash: 'test-hash' }),
      } as Response)

      const result = await batchUnfollow(signer!, targetFids, progressCallback)

      expect(result.success).toBe(3)
      expect(result.failed).toBe(0)
      expect(result.errors).toHaveLength(0)
      expect(progressCallback).toHaveBeenCalledTimes(3)
    })

    it('should handle partial failures in batch unfollow', async () => {
      const signer = await getFarcasterSigner()
      const targetFids = [1, 2, 3]

      // Mock mixed results: success, failure, success
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ hash: 'test-hash-1' }),
        } as Response)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ hash: 'test-hash-3' }),
        } as Response)

      const result = await batchUnfollow(signer!, targetFids)

      expect(result.success).toBe(2)
      expect(result.failed).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].fid).toBe(2)
    })

    it('should respect rate limiting between unfollows', async () => {
      const signer = await getFarcasterSigner()
      const targetFids = [1, 2]

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ hash: 'test-hash' }),
      } as Response)

      const startTime = Date.now()
      await batchUnfollow(signer!, targetFids)
      const endTime = Date.now()
      const duration = endTime - startTime

      // Should take at least 1 second due to rate limiting
      expect(duration).toBeGreaterThanOrEqual(1000)
    })
  })
}) 