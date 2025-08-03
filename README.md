# Farcaster UnfollowX

Automated unfollow tool for Farcaster - like UnfollowX but for FC. Clean up your following list by identifying and unfollowing inactive users.

## 🚀 Production Deployment

**Live App**: https://redounfollowv0-qybv2kphz-chipagosfinests-projects.vercel.app

### Farcaster Integration

- **Feed**: https://redounfollowv0-qybv2kphz-chipagosfinests-projects.vercel.app/feed
- **Tool**: https://redounfollowv0-qybv2kphz-chipagosfinests-projects.vercel.app/tool
- **Cast Embed**: https://redounfollowv0-qybv2kphz-chipagosfinests-projects.vercel.app/embed/cast
- **Profile Embed**: https://redounfollowv0-qybv2kphz-chipagosfinests-projects.vercel.app/embed/profile

## ✨ Features

### 🔐 Native Wallet Integration
- **Automatic Detection**: Detects Farcaster native environment
- **Native Wallet Auth**: Uses `window.farcaster` for seamless authentication
- **Real Message Signing**: Uses native wallet for signing unfollow messages
- **Fallback Support**: Manual connect option for testing/development

### 🎨 Beautiful UI
- **Farcaster Purple Theme**: Native purple gradient colors
- **Dark/Light Mode**: Toggle between themes with beautiful theme switcher
- **Gradient Text**: Farcaster purple gradient on main title
- **Enhanced Cards**: Rounded corners, shadows, and better spacing
- **Purple Accents**: Purple dots on card headers and purple rings on profile pictures

### 🔄 Following Management
- **Pagination**: Browse through your following list 10 users at a time
- **Selection Tracking**: Remember selected users as you navigate pages
- **Smart Analysis**: Automatically identifies inactive users (60+ days no cast or no mutual follow)
- **Batch Operations**: Select all inactive users or individual users
- **Progress Tracking**: Real-time progress bar showing unfollow status

### 🚀 Automation Features
- **Batch Unfollow**: Process multiple unfollows with progress tracking
- **Rate Limiting**: Built-in delays to avoid API rate limits
- **Error Handling**: Detailed error reporting for failed unfollows
- **Real-time Updates**: Live progress and completion tracking

## 🛠️ Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom Farcaster theme
- **UI Components**: shadcn/ui
- **Authentication**: Farcaster native wallet integration
- **API**: Official Farcaster API (api.farcaster.xyz/v2)
- **Deployment**: Vercel

## 📱 Farcaster Integration

### Feed Integration
The `/feed` page provides a lightweight interface for Farcaster feeds:
- Shows top 5 inactive users from your following list
- Quick selection and unfollow functionality
- Optimized for feed embedding

### Tool Integration
The `/tool` page provides the full unfollow experience:
- Complete following list management
- Pagination and advanced filtering
- Batch operations and progress tracking
- Full feature set for tools integration

### Embed Integration
Cast and profile embeds provide contextual information:
- **Cast Embed**: Shows cast context and quick actions
- **Profile Embed**: Shows profile stats and quick access to tool

## 🔧 API Endpoints

### Core APIs
- `GET /api/following` - Get user's following list with pagination
- `GET /api/check-mutual` - Check if two users mutually follow each other
- `GET /api/user-casts` - Get user's recent casts
- `POST /api/unfollow` - Unfollow a user (mock implementation)

### Embed APIs
- `GET /embed/cast` - Cast embed page
- `GET /embed/profile` - Profile embed page

## 🎯 How It Works

1. **Connect** your Farcaster account via native wallet
2. **Load Following List** - fetches your following with pagination
3. **Analyze Activity** - automatically checks mutual follows and last cast dates
4. **Select Users** - choose individual users or use bulk selection options
5. **Batch Unfollow** - process multiple unfollows with progress tracking
6. **View Results** - see detailed success/failure statistics

## 🚀 Deployment

### Vercel Deployment
```bash
# Deploy to production
npx vercel --prod --yes
```

### Environment Variables
```env
# Farcaster API (optional - uses official API by default)
FARCASTER_API_KEY=your_api_key

# App URLs
NEXT_PUBLIC_APP_URL=https://redounfollowv0-qybv2kphz-chipagosfinests-projects.vercel.app
```

## 📋 Farcaster Manifest

The app includes a complete Farcaster manifest (`public/farcaster-manifest.json`) with:
- Feed and tool integration
- Cast and profile embeds
- Proper permissions for user data access
- Production-ready configuration

## 🔮 Future Enhancements

- [ ] Real message signing with Farcaster Hub submission
- [ ] Advanced filtering options (by activity, mutual status, etc.)
- [ ] Analytics dashboard for unfollow statistics
- [ ] Scheduled unfollow operations
- [ ] Integration with Farcaster frames

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

**Built with ❤️ for the Farcaster community**
