# 🧹 Farcaster Cleanup

A Mini App that helps users clean up their Farcaster following list by identifying and bulk unfollowing inactive or non-engaging accounts.

## Features

- **Smart Analysis**: Automatically identifies accounts that don't follow you back, haven't interacted in 60+ days, or are inactive
- **Bulk Actions**: Select and unfollow multiple users at once with confirmation dialogs
- **Filter Options**: Choose from different criteria (non-mutual, no interactions, nuclear option)
- **Notifications**: Get reminded every 5 days to review your following list
- **Mini App Integration**: Works seamlessly in Warpcast and other Farcaster clients

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/farcaster-cleanup.git
   cd farcaster-cleanup
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   Edit `.env.local` and add your Neynar API key:
   ```
   NEYNAR_API_KEY=your_neynar_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open in Warpcast**
   - Deploy to Vercel or your preferred hosting platform
   - Open the app in Warpcast to test the Mini App functionality

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEYNAR_API_KEY` | Your Neynar API key for fetching user data | Yes |
| `NEXT_PUBLIC_APP_URL` | Your app's public URL | Yes |
| `WEBHOOK_URL` | Webhook URL for notifications | Optional |
| `REDIS_URL` | Redis URL for storing notification tokens | Optional |

## API Endpoints

### `/api/neynar/cleanup`
Analyzes a user's following list and returns users that match the specified filters.

**POST** `/api/neynar/cleanup`
```json
{
  "fid": 12345,
  "filters": {
    "nonMutual": true,
    "noInteractionWithYou": true,
    "youNoInteraction": true,
    "nuclear": false
  },
  "limit": 100,
  "threshold": 60
}
```

### `/api/neynar/unfollow`
Unfollows specified users.

**POST** `/api/neynar/unfollow`
```json
{
  "targetFids": [12345, 67890],
  "mode": "selected"
}
```

### `/api/webhook`
Receives notification events from Farcaster clients.

### `/api/notifications/send`
Sends notifications to users.

**POST** `/api/notifications/send`
```json
{
  "notificationId": "cleanup-reminder-2024-01-15",
  "title": "🧹 Farcaster Cleanup Reminder",
  "body": "You have 23 accounts ready for review. Time to clean up your feed!",
  "targetUrl": "/farcaster-cleanup",
  "fids": [12345]
}
```

## Mini App Features

### Authentication
- Automatic authentication in Farcaster clients
- Fallback to web authentication for development

### Analysis
- Fetches complete following list via Neynar API
- Cross-references with followers list for mutual analysis
- Checks interaction history and activity status
- Applies configurable filters

### User Interface
- Clean, mobile-optimized design
- Filter toggles with counts
- Bulk selection and actions
- Progress indicators for long operations
- Confirmation dialogs for destructive actions

### Notifications
- Opt-in notification system
- 5-day reminder cycle
- In-app notification prompts
- Webhook handling for token management

## Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment
1. Build the project: `npm run build`
2. Start the production server: `npm start`
3. Set up your domain and SSL certificates

## Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Neynar API key

### Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── neynar/          # Neynar API endpoints
│   │   ├── notifications/   # Notification endpoints
│   │   └── webhook/        # Webhook handling
│   ├── farcaster-cleanup/  # Main Mini App
│   └── page.tsx            # Landing page
├── components/              # Reusable UI components
├── lib/                    # Utility functions
└── types/                  # TypeScript type definitions
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- Create an issue on GitHub for bugs or feature requests
- Join our Discord for community support
- Check the [Farcaster Mini App documentation](https://docs.farcaster.xyz/miniapps) for more information

## Roadmap

- [ ] Whitelist functionality
- [ ] Advanced analytics dashboard
- [ ] Scheduled cleanup automation
- [ ] Integration with other Farcaster tools
- [ ] Mobile app version
