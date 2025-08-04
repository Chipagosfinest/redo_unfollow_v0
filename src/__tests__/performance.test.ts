import { getFarcasterSigner, getFollowingList, batchUnfollow, unfollowUser } from '@/lib/farcaster-actions'

// Mock fetch for performance testing
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('Performance Tests - Farcaster Mini App', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
  })

  describe('Authentication Performance', () => {
    it('should authenticate within 500ms', async () => {
      const startTime = performance.now()
      
      const signer = await getFarcasterSigner()
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(500)
      expect(signer).toBeTruthy()
    })

    it('should handle authentication failures quickly', async () => {
      // Temporarily remove farcaster from window
      const originalFarcaster = (window as any).farcaster
      delete (window as any).farcaster
      
      const startTime = performance.now()
      
      const signer = await getFarcasterSigner()
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(200)
      expect(signer).toBeNull()
      
      // Restore
      ;(window as any).farcaster = originalFarcaster
    })
  })

  describe('API Response Performance', () => {
    it('should fetch following list within 2 seconds', async () => {
      const mockUsers = Array.from({ length: 20 }, (_, i) => ({
        fid: i + 1,
        username: `user${i + 1}`,
        displayName: `User ${i + 1}`,
        pfp: { url: `avatar${i + 1}.jpg` }
      }))

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            users: mockUsers,
            next: { cursor: 'next-cursor' }
          }
        }),
      } as Response)

      const startTime = performance.now()
      
      const result = await getFollowingList(12345)
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(2000)
      expect(result.users).toHaveLength(20)
    })

    it('should handle large following lists efficiently', async () => {
      const mockUsers = Array.from({ length: 100 }, (_, i) => ({
        fid: i + 1,
        username: `user${i + 1}`,
        displayName: `User ${i + 1}`,
        pfp: { url: `avatar${i + 1}.jpg` }
      }))

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            users: mockUsers,
            next: { cursor: 'next-cursor' }
          }
        }),
      } as Response)

      const startTime = performance.now()
      
      const result = await getFollowingList(12345)
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(3000)
      expect(result.users).toHaveLength(100)
    })
  })

  describe('Batch Operations Performance', () => {
    it('should process batch unfollows with rate limiting', async () => {
      const signer = await getFarcasterSigner()
      const targetFids = Array.from({ length: 10 }, (_, i) => i + 1)
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ hash: 'test-hash' }),
      } as Response)

      const startTime = performance.now()
      
      const result = await batchUnfollow(signer!, targetFids)
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Should take at least 9 seconds due to rate limiting (1 second between each)
      expect(duration).toBeGreaterThanOrEqual(9000)
      expect(result.success).toBe(10)
    }, 15000) // Increase timeout for this test

    it('should handle partial failures efficiently', async () => {
      const signer = await getFarcasterSigner()
      const targetFids = [1, 2, 3, 4, 5]
      
      // Mock mixed results
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
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ hash: 'test-hash-4' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ hash: 'test-hash-5' }),
        } as Response)

      const startTime = performance.now()
      
      const result = await batchUnfollow(signer!, targetFids)
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(duration).toBeGreaterThanOrEqual(4000) // At least 4 seconds
      expect(result.success).toBe(4)
      expect(result.failed).toBe(1)
    })
  })

  describe('Memory Usage Performance', () => {
    it('should not leak memory during batch operations', async () => {
      const signer = await getFarcasterSigner()
      const targetFids = Array.from({ length: 50 }, (_, i) => i + 1)
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ hash: 'test-hash' }),
      } as Response)

      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0
      
      await batchUnfollow(signer!, targetFids)
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
      const memoryIncrease = finalMemory - initialMemory
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
    }, 15000) // Increase timeout for this test
  })

  describe('Network Performance', () => {
    it('should handle slow network connections gracefully', async () => {
      const signer = await getFarcasterSigner()
      
      // Mock slow network response
      mockFetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ hash: 'test-hash' }),
          } as Response), 2000)
        )
      )

      const startTime = performance.now()
      
      const result = await unfollowUser(signer!, 67890)
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(duration).toBeGreaterThanOrEqual(2000)
      expect(result.success).toBe(true)
    })

    it('should timeout long-running requests', async () => {
      const signer = await getFarcasterSigner()
      
      // Mock hanging request
      mockFetch.mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      )

      const startTime = performance.now()
      
      // This should timeout or be handled gracefully
      const result = await unfollowUser(signer!, 67890)
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Should not hang indefinitely
      expect(duration).toBeLessThan(10000)
    })
  })
}) 