# Farcaster Unfollow App

A Next.js application for managing Farcaster follows efficiently. Built with TypeScript, Tailwind CSS, and shadcn/ui components using official Farcaster APIs.

## Features

- 🔐 Farcaster authentication using @farcaster/quick-auth
- 🔍 Search for users using official Farcaster API
- 🚫 Create unfollow messages (requires wallet signing)
- 📊 Unfollow statistics and tracking
- 🎨 Modern, responsive UI with shadcn/ui components

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Farcaster wallet (for message signing)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd redo_unfollow_v0
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Architecture

### Official Farcaster API

This app uses the official Farcaster API:

- **API Endpoint**: `https://api.farcaster.xyz/v2`
- **Authentication**: @farcaster/quick-auth for message verification
- **User Search**: `/user-by-username` endpoint
- **User Data**: `/user` endpoint
- **Following Data**: `/following` endpoint

### API Routes

- `POST /api/auth` - Farcaster authentication (requires message signing)
- `GET /api/search?q=<query>` - Search for users using official API
- `POST /api/unfollow` - Create unfollow messages (requires signing)

## Development

### Current State

The app is currently in development mode with the following implemented:

✅ **Completed:**
- Real user search using official Farcaster API
- User data retrieval from official API
- Follower/following count from API
- Unfollow message creation (structure only)
- Modern UI with shadcn/ui components

🔄 **In Progress:**
- Wallet integration for message signing
- Message submission to Hub
- Real-time authentication flow

### Key Files

- `src/app/page.tsx` - Main application component
- `src/lib/farcaster.ts` - Farcaster service utilities
- `src/app/api/auth/route.ts` - Authentication API
- `src/app/api/search/route.ts` - Search API using official API
- `src/app/api/unfollow/route.ts` - Unfollow message creation

## TODO

The following features need to be implemented for production:

1. **Wallet Integration** - Connect to user's Farcaster wallet
2. **Message Signing** - Sign unfollow messages with private key
3. **Message Submission** - Submit signed messages to Hub
4. **Real Authentication** - Complete Farcaster Connect flow
5. **Error Handling** - Production-ready error responses
6. **Rate Limiting** - Proper API rate limiting implementation

## Farcaster API Endpoints Used

```typescript
// Search users by username
GET /v2/user-by-username?username={username}

// Get user data by FID
GET /v2/user?fid={fid}

// Get following list
GET /v2/following?fid={fid}&limit=100
```

## Message Types

The app creates the following Farcaster message types:

- `FollowRemoveMessage` - For unfollowing users

## Example API Response

```json
{
  "success": true,
  "users": [{
    "fid": 3,
    "username": "dwr.eth",
    "displayName": "Dan Romero",
    "pfp": "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/bc698287-5adc-4cc5-a503-de16963ed900/original",
    "followerCount": 347955,
    "followingCount": 4297
  }],
  "count": 1
}
```

## Deployment

1. Build the application:
```bash
npm run build
```

2. Deploy to your preferred platform (Vercel, Netlify, etc.)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details.
