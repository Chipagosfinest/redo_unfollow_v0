# 🧹 Farcaster Cleanup Mini App

A comprehensive Mini App that helps users clean up their Farcaster following list by identifying and bulk unfollowing inactive or non-engaging accounts.

## 🚀 Features

### Core Functionality
- **Smart Analysis**: Analyzes your complete following list using Neynar API
- **Mutual Follow Detection**: Identifies users who don't follow you back
- **Interaction Analysis**: Detects users with no recent interactions (60+ days)
- **Bulk Unfollow**: Select and unfollow multiple users at once
- **Progress Tracking**: Real-time progress indicator during bulk operations

### Filter Categories
- **Non-mutual follows**: Users who don't follow you back
- **No interactions with you**: Haven't liked/replied/recast your content in 60+ days
- **You haven't interacted**: You haven't liked/replied/recast their content in 60+ days
- **Nuclear option**: All following (unfollow everyone)

### User Interface
- **Modern Design**: Clean, intuitive interface with gradient backgrounds
- **Responsive Layout**: Works on mobile and desktop
- **Real-time Updates**: Live filter counts and selection management
- **Confirmation Dialogs**: Safe bulk unfollow with user preview

## 🛠️ Technical Implementation

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Full type safety
- **Tailwind CSS**: Modern styling
- **Farcaster Mini App SDK**: Native Mini App integration
- **Sonner**: Toast notifications

### Backend APIs
- **Analysis Endpoint**: `/api/neynar/cleanup/analyze`
  - Fetches following list
  - Cross-references with followers
  - Calculates interaction patterns
  - Returns analyzed user data

- **Unfollow Endpoint**: `/api/neynar/unfollow`
  - Handles individual unfollow operations
  - Rate limiting and error handling
  - Progress tracking

### Data Flow
1. **Authentication**: Mini App context or web authentication
2. **Analysis**: Fetch and analyze following list
3. **Filtering**: Apply user-selected filters
4. **Selection**: User selects accounts to unfollow
5. **Bulk Operations**: Execute unfollow with progress tracking

## 📱 Mini App Integration

### Authentication
- **Mini App Context**: Automatic user detection in Farcaster clients
- **Web Fallback**: Manual authentication for browser usage
- **Session Management**: Persistent authentication state

### SDK Features
- **Ready() Call**: Proper SDK initialization
- **Context Access**: User data from Mini App environment
- **Error Handling**: Graceful fallbacks for different environments

## 🎯 User Experience

### Entry Point
- Clear "Analyze Following List" button
- Immediate feedback with loading states
- Error handling with retry options

### Analysis & Filtering
- Auto-populated filters with counts
- Toggle-based filter selection
- Real-time user list updates

### Selection Interface
- Individual user cards with profile info
- Reason tags for each user
- Bulk selection controls
- Selection counter

### Bulk Actions
- Confirmation dialog with user preview
- Progress bar during operations
- Success/failure notifications
- Automatic list refresh

## 🔧 Development

### Setup
```bash
npm install
npm run dev
```

### Environment Variables
```env
NEYNAR_API_KEY=your_neynar_api_key
NEXT_PUBLIC_APP_URL=your_app_url
```

### Key Files
- `src/app/farcaster-cleanup/page.tsx` - Main Mini App component
- `src/app/api/neynar/cleanup/analyze/route.ts` - Analysis API
- `src/app/api/neynar/unfollow/route.ts` - Unfollow API
- `src/components/Navigation.tsx` - App navigation

## 🚀 Deployment

### Vercel
- Automatic deployment from GitHub
- Environment variables configured
- Custom domain support

### Mini App Configuration
- Farcaster manifest configured
- Proper metadata for social sharing
- Mobile-optimized viewport settings

## 📊 Success Metrics

### User Engagement
- Users analyze their following list
- Average unfollows per session
- Retention (users return to clean up again)

### Performance
- Analysis completes <30 seconds
- Smooth bulk operations
- Responsive UI interactions

### Technical
- API rate limit management
- Error handling and recovery
- Cross-platform compatibility

## 🔮 Future Enhancements

### V2 Features
- **Whitelist**: Never unfollow certain users
- **Smart Suggestions**: ML-based recommendations
- **Scheduling**: Automated cleanup
- **Analytics**: Following health insights
- **Pay-to-Use**: Premium features
- **Notifications**: Reminders for cleanup

### Advanced Features
- **Interaction History**: Detailed engagement analysis
- **Custom Filters**: User-defined criteria
- **Export Data**: Download analysis results
- **Batch Operations**: Scheduled unfollows

## 🛡️ Security & Privacy

### Data Handling
- No persistent storage of user data
- API calls only when needed
- Secure authentication flow

### Rate Limiting
- Respectful API usage
- Graceful degradation
- User feedback on limits

## 📝 API Documentation

### Analysis Endpoint
```typescript
POST /api/neynar/cleanup/analyze
{
  userFid: number
}

Response:
{
  users: User[],
  total: number,
  mutual: number,
  nonMutual: number
}
```

### Unfollow Endpoint
```typescript
POST /api/neynar/unfollow
{
  targetFid: number,
  userFid: number
}

Response:
{
  success: boolean,
  message: string,
  targetFid: number,
  userFid: number
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

**Built with ❤️ for the Farcaster community** 