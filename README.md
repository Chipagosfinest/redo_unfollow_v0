# Farcaster Cleanup App

A comprehensive tool for cleaning up your Farcaster following list with smart analytics and bulk unfollow operations.

## 🚀 Features

### ✨ Core Functionality
- **Smart Analysis**: Identifies inactive users (75+ days) and non-mutual followers
- **Bulk Operations**: Batch unfollow with progress tracking
- **Analytics Dashboard**: Detailed insights about your following patterns
- **Export Capability**: Save results to CSV for later reference

### 🔐 Dual-Context Authentication
- **Mini App Support**: Native integration with Farcaster Mini App SDK
- **Web App Ready**: Framework for regular web authentication (Privy, WalletConnect, etc.)
- **Automatic Detection**: Seamlessly switches between contexts
- **Visual Indicators**: Shows current auth method (📱 Mini App / 🌐 Web App)

### 📊 Enhanced Analytics
- **Real-time Statistics**: Total following, inactive users, mutual followers
- **Smart Filtering**: Filter by reason (inactive, not following back)
- **Advanced Sorting**: Sort by name, followers, following, or reason
- **Progress Tracking**: Real-time progress during bulk operations

## 🛠️ Technical Architecture

### Auth System
```typescript
// Dual-context authentication
const authManager = AuthManager.getInstance()
const authContext = await authManager.initialize()

// Automatically detects environment
if (authContext.isMiniApp) {
  // Use Mini App SDK
} else {
  // Use web auth (Privy, WalletConnect, etc.)
}
```

### API Integration
- **Neynar API**: For user analysis and unfollow operations
- **Rate Limiting**: Batch processing to avoid API limits
- **Error Handling**: Comprehensive error reporting and debugging

## 🚀 Production Deployment

### 1. Environment Variables
Set these in your Vercel dashboard:

```bash
# Required
NEYNAR_API_KEY=your_neynar_api_key_here

# Optional
NEXT_PUBLIC_APP_URL=https://your-app-domain.vercel.app
```

### 2. Get Neynar API Key
1. Visit https://neynar.com
2. Create an account and get your API key
3. Add it to Vercel environment variables

### 3. Deploy to Vercel
```bash
# Connect your GitHub repo to Vercel
# Vercel will automatically deploy on push
git push origin main
```

## 🔧 Development

### Local Setup
```bash
npm install
npm run dev
```

### Environment Setup
```bash
# Copy example environment
cp env.example .env.local

# Add your Neynar API key
NEYNAR_API_KEY=your_key_here
```

### Debug Tools
- **Environment Check**: `/api/debug-env` (development only)
- **Enhanced Logging**: Detailed API and auth method logging
- **Visual Indicators**: Development mode and auth method badges

## 📱 Mini App Integration

### Automatic Detection
The app automatically detects if it's running in a Farcaster Mini App environment and uses the appropriate authentication method.

### Mini App Features
- **Native SDK**: Uses `@farcaster/miniapp-sdk`
- **User Context**: Automatically gets user FID and profile
- **Ready State**: Properly handles Mini App lifecycle

## 🌐 Web App Support

### Framework Ready
The auth system is designed to support web-based authentication:

```typescript
// Example: Add Privy support
private async initializeWebApp(): Promise<AuthContext> {
  // Implement Privy, WalletConnect, or other web auth
  const privyUser = await privy.authenticate()
  return {
    fid: privyUser.fid,
    username: privyUser.username,
    // ... other user data
    authMethod: 'web',
    isMiniApp: false
  }
}
```

## 🐛 Troubleshooting

### Common Issues

1. **API Key Not Configured**
   ```
   Error: API key not configured
   ```
   - Add `NEYNAR_API_KEY` to Vercel environment variables

2. **Mini App Not Detected**
   - Ensure you're opening the app within a Farcaster client
   - Check browser console for auth method indicators

3. **Rate Limiting**
   - The app automatically batches requests (5 users per batch)
   - Progress indicator shows current status

### Debug Information
- Check browser console for detailed logs
- Use `/api/debug-env` endpoint in development
- Look for auth method badges in the UI

## 📈 Analytics Features

### Key Metrics
- **Total Following**: Number of users you're following
- **Inactive Users**: Users who haven't posted in 75+ days
- **Non-Mutual Followers**: Users who don't follow you back
- **Mutual Followers**: Users who follow you back

### Smart Filtering
- Filter by reason (inactive, not following back)
- Sort by various criteria (name, followers, following)
- Real-time counts and statistics

## 🔄 Bulk Operations

### Progress Tracking
- Real-time progress bar during unfollow operations
- Batch processing to avoid rate limits
- Success/failure reporting

### Confirmation Flow
- Immediate confirmation modal when unfollow is clicked
- Clear visual feedback
- Cancel option available

## 📤 Export Features

### CSV Export
- Export filtered results to CSV
- Includes username, display name, followers, following, reason, and FID
- Automatic filename with date stamp

### Share Results
- Share cleanup results via native sharing
- Fallback to clipboard if sharing fails

## 🎯 Production Checklist

- [ ] Neynar API key configured in Vercel
- [ ] Environment variables set
- [ ] GitHub repository connected to Vercel
- [ ] App deployed and accessible
- [ ] Test authentication flow
- [ ] Verify API calls work
- [ ] Check error handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details
