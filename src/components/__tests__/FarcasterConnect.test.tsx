import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FarcasterConnect from '../FarcasterConnect'

// Mock the Farcaster actions
jest.mock('@/lib/farcaster-actions', () => ({
  getFarcasterSigner: jest.fn(),
}))

const mockGetFarcasterSigner = require('@/lib/farcaster-actions').getFarcasterSigner

describe('FarcasterConnect Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render connect button when not authenticated', () => {
    render(<FarcasterConnect onConnect={jest.fn()} />)
    
    expect(screen.getByText(/connect/i)).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('should show loading state during authentication', async () => {
    const user = userEvent.setup()
    const mockOnConnect = jest.fn()
    
    // Mock delayed signer response
    mockGetFarcasterSigner.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ getFid: () => 12345 }), 100))
    )

    render(<FarcasterConnect onConnect={mockOnConnect} />)
    
    const connectButton = screen.getByRole('button')
    await user.click(connectButton)

    // Should show loading state
    expect(screen.getByText(/connecting/i)).toBeInTheDocument()
    expect(connectButton).toBeDisabled()
  })

  it('should call onConnect when authentication succeeds', async () => {
    const user = userEvent.setup()
    const mockOnConnect = jest.fn()
    const mockSigner = {
      getFid: jest.fn().mockResolvedValue(12345),
      signMessage: jest.fn(),
      getPublicKey: jest.fn(),
    }

    mockGetFarcasterSigner.mockResolvedValue(mockSigner)

    render(<FarcasterConnect onConnect={mockOnConnect} />)
    
    const connectButton = screen.getByRole('button')
    await user.click(connectButton)

    await waitFor(() => {
      expect(mockOnConnect).toHaveBeenCalledWith(12345, mockSigner)
    })
  })

  it('should show error when authentication fails', async () => {
    const user = userEvent.setup()
    const mockOnConnect = jest.fn()

    mockGetFarcasterSigner.mockResolvedValue(null)

    render(<FarcasterConnect onConnect={mockOnConnect} />)
    
    const connectButton = screen.getByRole('button')
    await user.click(connectButton)

    await waitFor(() => {
      expect(screen.getByText(/failed to connect/i)).toBeInTheDocument()
    })

    expect(mockOnConnect).not.toHaveBeenCalled()
  })

  it('should handle authentication errors gracefully', async () => {
    const user = userEvent.setup()
    const mockOnConnect = jest.fn()

    mockGetFarcasterSigner.mockRejectedValue(new Error('Authentication failed'))

    render(<FarcasterConnect onConnect={mockOnConnect} />)
    
    const connectButton = screen.getByRole('button')
    await user.click(connectButton)

    await waitFor(() => {
      expect(screen.getByText(/failed to connect/i)).toBeInTheDocument()
    })
  })

  it('should be accessible with proper ARIA labels', () => {
    render(<FarcasterConnect onConnect={jest.fn()} />)
    
    const connectButton = screen.getByRole('button')
    expect(connectButton).toHaveAttribute('aria-label')
  })

  it('should prevent multiple simultaneous connection attempts', async () => {
    const user = userEvent.setup()
    const mockOnConnect = jest.fn()
    
    // Mock delayed response
    mockGetFarcasterSigner.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ getFid: () => 12345 }), 100))
    )

    render(<FarcasterConnect onConnect={mockOnConnect} />)
    
    const connectButton = screen.getByRole('button')
    
    // Click multiple times rapidly
    await user.click(connectButton)
    await user.click(connectButton)
    await user.click(connectButton)

    // Should only call getFarcasterSigner once
    expect(mockGetFarcasterSigner).toHaveBeenCalledTimes(1)
  })
}) 