import '@testing-library/jest-dom'

// Mock TextEncoder for Node.js environment
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = class TextEncoder {
    encode(str) {
      return new Uint8Array(Buffer.from(str, 'utf8'))
    }
  }
}

// Mock Farcaster SDK
jest.mock('@farcaster/miniapp-sdk', () => ({
  sdk: {
    actions: {
      ready: jest.fn().mockResolvedValue(undefined),
    },
  },
}))

// Mock global Farcaster object
Object.defineProperty(window, 'farcaster', {
  value: {
    user: {
      fid: 12345,
      username: 'testuser',
    },
    signMessage: jest.fn().mockResolvedValue(new Uint8Array(32)),
    getPublicKey: jest.fn().mockResolvedValue(new Uint8Array(64)),
    privy: {
      user: {
        fid: 12345,
      },
      signMessage: jest.fn().mockResolvedValue(new Uint8Array(32)),
      getPublicKey: jest.fn().mockResolvedValue(new Uint8Array(64)),
    },
  },
  writable: true,
})

// Mock fetch globally
global.fetch = jest.fn()

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock performance API
global.performance = {
  ...performance,
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 3000000,
  },
} 