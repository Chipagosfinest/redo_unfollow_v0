# Farcaster Unfollow Tool

A beautiful, modern tool to sweep who doesn't follow you back or is inactive. Clean up your Farcaster feed by identifying and unfollowing inactive accounts, non-mutual follows, and spam users.

## 🚀 Live App

**Current Status:** Production Ready (using real Farcaster data)

**Live URL:** https://redounfollowv0.vercel.app

## ✨ Features

- **Beautiful Modern UI** - Clean, responsive design with smooth animations
- **Smart Analysis** - Identifies inactive accounts, non-mutual follows, and spam
- **Batch Operations** - Select and unfollow multiple users at once
- **Real-time Data** - Uses actual Farcaster data via Neynar API
- **Real Data Analysis** - Uses actual Farcaster API data

## 🔧 Production Setup

The app is configured for production use:

### 1. Get Neynar API Key
1. Go to [Neynar Dashboard](https://neynar.com)
2. Sign up and get your API key
3. Copy the API key

### 2. Configure Vercel Environment Variables
1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add the following variable:
   ```
   Name: NEYNAR_API_KEY
   Value: your_neynar_api_key_here
   Environment: Production
   ```
4. Redeploy the app

### 3. Production Features
- The app uses real Farcaster API data
- You'll see your actual Farcaster following list
- All analysis is based on real user data

## 🎨 Design Features

- **Modern Gradient Backgrounds** - Beautiful purple to blue gradients
- **Smooth Animations** - Hover effects and transitions
- **Responsive Layout** - Works perfectly on all devices
- **Clear Visual Hierarchy** - Easy to scan and understand
- **Accessible Design** - Proper contrast and ARIA labels

## 📊 Real Data Analysis

The app analyzes your actual Farcaster data including:
- **Inactive Users** - Accounts that haven't posted in 60+ days
- **Non-Mutual Follows** - Users who don't follow you back
- **Spam Detection** - Potential spam accounts

## 🔄 Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 📝 Environment Variables

Create a `.env.local` file for local development:

```env
NEYNAR_API_KEY=your_neynar_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🚀 Deployment

The app is automatically deployed to Vercel. To deploy with real data:

1. Add `NEYNAR_API_KEY` to Vercel environment variables
2. Redeploy the app
3. The demo mode banner will disappear and show real data

## 🎯 Production Status

- [x] Configure Neynar API key in Vercel
- [x] Test with real Farcaster data
- [x] Add analysis features
- [x] Implement real unfollow operations
- [x] Deploy to production

---

**Note:** This app is production ready and uses real Farcaster data. Users can connect their wallets and start cleaning their feeds immediately.
