# Farcaster Unfollow Tool

A beautiful, modern tool to sweep who doesn't follow you back or is inactive. Clean up your Farcaster feed by identifying and unfollowing inactive accounts, non-mutual follows, and spam users.

## 🚀 Live Demo

**Current Status:** Demo Mode (using sample data for testing)

**Live URL:** https://redounfollowv0-o0n6r5rck-chipagosfinests-projects.vercel.app

## ✨ Features

- **Beautiful Modern UI** - Clean, responsive design with smooth animations
- **Smart Analysis** - Identifies inactive accounts, non-mutual follows, and spam
- **Batch Operations** - Select and unfollow multiple users at once
- **Real-time Data** - Uses actual Farcaster data via Neynar API
- **Demo Mode** - Works immediately with sample data for testing

## 🔧 Setup for Real Data

To use with your real Farcaster data instead of demo data:

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

### 3. Test Real Data
- The app will automatically switch from demo mode to real data
- You'll see your actual Farcaster following list
- All analysis will be based on real user data

## 🎨 Design Features

- **Modern Gradient Backgrounds** - Beautiful purple to blue gradients
- **Smooth Animations** - Hover effects and transitions
- **Responsive Layout** - Works perfectly on all devices
- **Clear Visual Hierarchy** - Easy to scan and understand
- **Accessible Design** - Proper contrast and ARIA labels

## 📊 Current Demo Data

The app currently shows sample data including:
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

## 🎯 Next Steps

- [ ] Configure Neynar API key in Vercel
- [ ] Test with real Farcaster data
- [ ] Add more analysis features
- [ ] Implement real unfollow operations

---

**Note:** This app is currently in demo mode. To see your real Farcaster data, follow the setup instructions above to configure the Neynar API key.
