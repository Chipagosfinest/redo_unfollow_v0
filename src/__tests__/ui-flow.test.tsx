import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from '@/app/page'

// Mock the Farcaster actions
jest.mock('@/lib/farcaster-actions', () => ({
  getFarcasterSigner: jest.fn(),
  batchUnfollow: jest.fn(),
}))

// Mock the Farcaster SDK
jest.mock('@farcaster/miniapp-sdk', () => ({
  sdk: {
    actions: {
      ready: jest.fn().mockResolvedValue(undefined),
    },
  },
}))

const mockGetFarcasterSigner = require('@/lib/farcaster-actions').getFarcasterSigner
const mockBatchUnfollow = require('@/lib/farcaster-actions').batchUnfollow

describe('UI Flow Tests - Farcaster Mini App', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock fetch for API calls
    global.fetch = jest.fn()
  })

  describe('Authentication Flow', () => {
    it('should show authentication screen initially', () => {
      render(<Home />)
      
      // Should show Farcaster Mini App header
      expect(screen.getByText('Unfollow App')).toBeInTheDocument()
      expect(screen.getByText('by alec.eth ✓')).toBeInTheDocument()
      
      // Should show app title and description
      expect(screen.getByText('Unfollow Tool')).toBeInTheDocument()
      expect(screen.getByText('Sign in with Farcaster to analyze your follows')).toBeInTheDocument()
      
      // Should show Farcaster Mini App banner
      expect(screen.getByText('Running in Farcaster Mini App')).toBeInTheDocument()
      expect(screen.getByText('Launched from: launcher')).toBeInTheDocument()
      expect(screen.getByText('Haptic feedback available')).toBeInTheDocument()
      
      // Should show sign in section
      expect(screen.getByText('Sign In')).toBeInTheDocument()
      expect(screen.getByText('Connect your Farcaster wallet to get started')).toBeInTheDocument()
      
      // Should show welcome section
      expect(screen.getByText('Welcome to Unfollow Tool')).toBeInTheDocument()
      expect(screen.getByText('Sign in with your Farcaster wallet to analyze your follows and identify who to unfollow')).toBeInTheDocument()
      
      // Should show continue button
      expect(screen.getByText('Continue with Farcaster')).toBeInTheDocument()
    })

    it('should transition to profile screen after authentication', async () => {
      const user = userEvent.setup()
      render(<Home />)
      
      // Click continue button
      const continueButton = screen.getByText('Continue with Farcaster')
      await user.click(continueButton)
      
      // Should show profile screen
      await waitFor(() => {
        expect(screen.getByText('Your Profile')).toBeInTheDocument()
      })
      
      // Should show user profile information
      expect(screen.getByText('alec.eth')).toBeInTheDocument()
      expect(screen.getByText('@alec.eth')).toBeInTheDocument()
      expect(screen.getByText('7,219')).toBeInTheDocument()
      expect(screen.getByText('897')).toBeInTheDocument()
      expect(screen.getByText('Followers')).toBeInTheDocument()
      expect(screen.getByText('Following')).toBeInTheDocument()
      
      // Should show scan section
      expect(screen.getByText('Scan Your Follows')).toBeInTheDocument()
      expect(screen.getByText('Analyze your follows to find inactive and spam accounts')).toBeInTheDocument()
      expect(screen.getByText('Start Scan')).toBeInTheDocument()
    })
  })

  describe('Profile Screen', () => {
    beforeEach(async () => {
      render(<Home />)
      const user = userEvent.setup()
      
      // Navigate to profile screen
      const continueButton = screen.getByText('Continue with Farcaster')
      await user.click(continueButton)
      
      await waitFor(() => {
        expect(screen.getByText('Your Profile')).toBeInTheDocument()
      })
    })

    it('should display user profile correctly', () => {
      // Should show profile card
      expect(screen.getByText('alec.eth')).toBeInTheDocument()
      expect(screen.getByText('@alec.eth')).toBeInTheDocument()
      expect(screen.getByText('loading...built interested.fyi + peeple.work || ex mesh.xyz')).toBeInTheDocument()
      
      // Should show follower/following counts
      expect(screen.getByText('7,219')).toBeInTheDocument()
      expect(screen.getByText('897')).toBeInTheDocument()
      
      // Should show sign out button
      expect(screen.getByText('Sign Out')).toBeInTheDocument()
    })

    it('should start scan when Start Scan button is clicked', async () => {
      const user = userEvent.setup()
      
      // Mock API responses
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            users: [
              {
                fid: 1,
                username: 'user1',
                displayName: 'User One',
                pfp: 'avatar1.jpg',
                followerCount: 100,
                followingCount: 50,
              }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ isMutualFollow: false })
        })

      // Click start scan button
      const startScanButton = screen.getByText('Start Scan')
      await user.click(startScanButton)
      
      // Should show scanning screen
      await waitFor(() => {
        expect(screen.getByText('Scanning Your Follows...')).toBeInTheDocument()
      })
      
      expect(screen.getByText('Analyzing 897 accounts')).toBeInTheDocument()
    })
  })

  describe('Scan Results Screen', () => {
    beforeEach(async () => {
      render(<Home />)
      const user = userEvent.setup()
      
      // Navigate to profile screen
      const continueButton = screen.getByText('Continue with Farcaster')
      await user.click(continueButton)
      
      await waitFor(() => {
        expect(screen.getByText('Your Profile')).toBeInTheDocument()
      })
      
      // Mock API responses for scan
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            users: [
              {
                fid: 1,
                username: 'user1',
                displayName: 'User One',
                pfp: 'avatar1.jpg',
                followerCount: 100,
                followingCount: 50,
              },
              {
                fid: 2,
                username: 'user2',
                displayName: 'User Two',
                pfp: 'avatar2.jpg',
                followerCount: 5,
                followingCount: 200,
              }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ isMutualFollow: false })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ isMutualFollow: true })
        })

      // Start scan
      const startScanButton = screen.getByText('Start Scan')
      await user.click(startScanButton)
      
      // Wait for results screen
      await waitFor(() => {
        expect(screen.getByText('Scan Results')).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('should display scan results correctly', () => {
      // Should show scan results section
      expect(screen.getByText('Scan Results')).toBeInTheDocument()
      expect(screen.getByText('View your follow analysis and recommendations')).toBeInTheDocument()
      
      // Should show metrics cards
      expect(screen.getByText('Total Follows')).toBeInTheDocument()
      expect(screen.getByText('60+ Days Inactive')).toBeInTheDocument()
      expect(screen.getByText('Not Following Back')).toBeInTheDocument()
      expect(screen.getByText('Spam Accounts')).toBeInTheDocument()
    })

    it('should show action buttons for different unfollow types', () => {
      // Should show action buttons
      expect(screen.getByText('Select Inactive (60+ days)')).toBeInTheDocument()
      expect(screen.getByText('Select Not Following Back')).toBeInTheDocument()
      expect(screen.getByText('Select All')).toBeInTheDocument()
    })

    it('should show viral share button', () => {
      // Should show viral share button
      expect(screen.getByText('Share & Go Viral! 🚀')).toBeInTheDocument()
    })

    it('should show detailed recommendations section', () => {
      // Should show detailed recommendations
      expect(screen.getByText('Detailed Recommendations')).toBeInTheDocument()
      expect(screen.getByText('Review each user with profile details and take action')).toBeInTheDocument()
    })
  })

  describe('Viral Sharing Functionality', () => {
    beforeEach(async () => {
      render(<Home />)
      const user = userEvent.setup()
      
      // Navigate through the flow to get to results
      const continueButton = screen.getByText('Continue with Farcaster')
      await user.click(continueButton)
      
      await waitFor(() => {
        expect(screen.getByText('Your Profile')).toBeInTheDocument()
      })
      
      // Mock API responses
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            users: [
              {
                fid: 1,
                username: 'user1',
                displayName: 'User One',
                pfp: 'avatar1.jpg',
                followerCount: 100,
                followingCount: 50,
              }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ isMutualFollow: false })
        })

      // Start scan
      const startScanButton = screen.getByText('Start Scan')
      await user.click(startScanButton)
      
      // Wait for results screen
      await waitFor(() => {
        expect(screen.getByText('Scan Results')).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('should copy share text to clipboard when share button is clicked', async () => {
      const user = userEvent.setup()
      
      // Mock clipboard API
      const mockClipboard = {
        writeText: jest.fn().mockResolvedValue(undefined),
      }
      Object.assign(navigator, { clipboard: mockClipboard })
      
      // Click share button
      const shareButton = screen.getByText('Share & Go Viral! 🚀')
      await user.click(shareButton)
      
      // Should copy share text to clipboard
      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining('Just cleaned up my Farcaster following list')
        )
      })
    })

    it('should show success toast when share is successful', async () => {
      const user = userEvent.setup()
      
      // Mock clipboard API
      const mockClipboard = {
        writeText: jest.fn().mockResolvedValue(undefined),
      }
      Object.assign(navigator, { clipboard: mockClipboard })
      
      // Click share button
      const shareButton = screen.getByText('Share & Go Viral! 🚀')
      await user.click(shareButton)
      
      // Should show success message
      await waitFor(() => {
        expect(screen.getByText('Share text copied to clipboard! Post it on Farcaster to go viral! 🚀')).toBeInTheDocument()
      })
    })
  })

  describe('Unfollow Functionality', () => {
    beforeEach(async () => {
      render(<Home />)
      const user = userEvent.setup()
      
      // Navigate through the flow
      const continueButton = screen.getByText('Continue with Farcaster')
      await user.click(continueButton)
      
      await waitFor(() => {
        expect(screen.getByText('Your Profile')).toBeInTheDocument()
      })
      
      // Mock API responses
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            users: [
              {
                fid: 1,
                username: 'user1',
                displayName: 'User One',
                pfp: 'avatar1.jpg',
                followerCount: 100,
                followingCount: 50,
              }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ isMutualFollow: false })
        })

      // Start scan
      const startScanButton = screen.getByText('Start Scan')
      await user.click(startScanButton)
      
      // Wait for results screen
      await waitFor(() => {
        expect(screen.getByText('Scan Results')).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('should select users when action buttons are clicked', async () => {
      const user = userEvent.setup()
      
      // Click select inactive button
      const selectInactiveButton = screen.getByText('Select Inactive (60+ days)')
      await user.click(selectInactiveButton)
      
      // Should show unfollow button with count
      await waitFor(() => {
        expect(screen.getByText(/Unfollow \d+ Users/)).toBeInTheDocument()
      })
    })

    it('should handle batch unfollow when unfollow button is clicked', async () => {
      const user = userEvent.setup()
      
      // Mock batch unfollow
      mockBatchUnfollow.mockResolvedValue({
        success: 1,
        failed: 0,
        errors: [],
      })
      
      // Select users first
      const selectAllButton = screen.getByText('Select All')
      await user.click(selectAllButton)
      
      // Click unfollow button
      const unfollowButton = screen.getByText(/Unfollow \d+ Users/)
      await user.click(unfollowButton)
      
      // Should call batch unfollow
      await waitFor(() => {
        expect(mockBatchUnfollow).toHaveBeenCalled()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<Home />)
      
      // Should have proper button roles
      const continueButton = screen.getByText('Continue with Farcaster')
      expect(continueButton).toHaveAttribute('role', 'button')
      
      // Should have proper heading structure
      const mainHeading = screen.getByText('Unfollow Tool')
      expect(mainHeading).toBeInTheDocument()
    })

    it('should be keyboard navigable', async () => {
      render(<Home />)
      
      // Should be able to tab through interactive elements
      const continueButton = screen.getByText('Continue with Farcaster')
      continueButton.focus()
      expect(continueButton).toHaveFocus()
    })
  })
}) 