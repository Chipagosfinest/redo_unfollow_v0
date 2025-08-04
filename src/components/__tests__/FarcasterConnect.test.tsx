import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FarcasterConnect from '../FarcasterConnect'

describe('FarcasterConnect Component', () => {
  const mockOnAuth = jest.fn()
  const mockOnDisconnect = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock window.farcaster
    Object.defineProperty(window, 'farcaster', {
      value: {
        user: {
          fid: 12345,
          username: 'testuser',
          displayName: 'Test User',
          pfp: { url: 'https://example.com/pfp.jpg' }
        },
        signMessage: jest.fn().mockResolvedValue(new Uint8Array(32)),
        getPublicKey: jest.fn().mockResolvedValue(new Uint8Array(64)),
        privy: {
          user: {
            fid: 12345,
            username: 'testuser',
            displayName: 'Test User',
            pfp: { url: 'https://example.com/pfp.jpg' }
          },
          signMessage: jest.fn().mockResolvedValue(new Uint8Array(32)),
          getPublicKey: jest.fn().mockResolvedValue(new Uint8Array(64)),
        },
      },
      writable: true,
    })
  })

  it('should render connect button when not authenticated', () => {
    render(
      <FarcasterConnect 
        onAuth={mockOnAuth}
        onDisconnect={mockOnDisconnect}
        isAuthenticated={false}
        userFid={null}
      />
    )
    
    expect(screen.getByText(/connect farcaster wallet|open in farcaster app/i)).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('should call onAuth when authentication succeeds', async () => {
    const user = userEvent.setup()

    render(
      <FarcasterConnect 
        onAuth={mockOnAuth}
        onDisconnect={mockOnDisconnect}
        isAuthenticated={false}
        userFid={null}
      />
    )
    
    const connectButton = screen.getByRole('button')
    await user.click(connectButton)

    await waitFor(() => {
      expect(mockOnAuth).toHaveBeenCalledWith(12345)
    })
  })

  it('should show connected state when authenticated', () => {
    render(
      <FarcasterConnect 
        onAuth={mockOnAuth}
        onDisconnect={mockOnDisconnect}
        isAuthenticated={true}
        userFid={12345}
      />
    )
    
    // The component should show fallback values when userProfile is not set
    expect(screen.getByText('Farcaster User')).toBeInTheDocument()
    expect(screen.getByText('@user')).toBeInTheDocument()
    expect(screen.getByText('Disconnect')).toBeInTheDocument()
  })

  it('should call onDisconnect when disconnect button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <FarcasterConnect 
        onAuth={mockOnAuth}
        onDisconnect={mockOnDisconnect}
        isAuthenticated={true}
        userFid={12345}
      />
    )
    
    const disconnectButton = screen.getByText('Disconnect')
    await user.click(disconnectButton)

    expect(mockOnDisconnect).toHaveBeenCalled()
  })

  it('should show different button text when not in iframe', () => {
    // Mock not in iframe
    Object.defineProperty(window, 'self', {
      value: window,
      writable: true,
    })
    Object.defineProperty(window, 'top', {
      value: window,
      writable: true,
    })

    render(
      <FarcasterConnect 
        onAuth={mockOnAuth}
        onDisconnect={mockOnDisconnect}
        isAuthenticated={false}
        userFid={null}
      />
    )
    
    expect(screen.getByText(/open in farcaster app/i)).toBeInTheDocument()
  })
}) 