# Farcaster UnfollowX 🚀

**Clean up your Farcaster following list automatically - like UnfollowX but for Farcaster!**

## 🎯 **LIVE & READY FOR USERS**

**Production App**: https://redounfollowv0-pvzthsa1t-chipagosfinests-projects.vercel.app

**Farcaster App Registration**: https://redounfollowv0-pvzthsa1t-chipagosfinests-projects.vercel.app/embed

---

## ✨ **Features**

### 🔐 **Zero Manual Input**
- **Automatic Detection**: Instantly detects your Farcaster account
- **No Setup Required**: Just open and start using
- **Native Integration**: Works seamlessly in Farcaster feeds and tools

### 🧠 **Smart Analysis**
- **Inactive User Detection**: Finds users who haven't casted in 60+ days
- **Mutual Follow Check**: Identifies users who don't follow you back
- **Spam Detection**: Highlights potential spam accounts
- **Real-time Stats**: Live dashboard of your following health

### ⚡ **Batch Operations**
- **One-Click Selection**: Select multiple users instantly
- **Batch Unfollow**: Remove multiple users with one click
- **Progress Tracking**: Real-time progress for batch operations
- **Smart Recommendations**: AI suggests users to unfollow

### 🎨 **Beautiful UI**
- **Farcaster Native**: Purple and white theme with dark/light mode
- **Responsive Design**: Works perfectly on all devices
- **Professional Polish**: Production-ready interface

---

## 🚀 **Quick Start**

1. **Open in Farcaster**: Visit the app in Farcaster
2. **Auto-Connect**: Your account is automatically detected
3. **Scan Following**: App analyzes your following list
4. **Select & Unfollow**: Choose users and batch unfollow

**That's it! No setup, no manual input, just results.**

---

## 🔗 **Farcaster Integration**

### Feed Integration
- **URL**: `/feed` - Lightweight interface for Farcaster feeds
- **Auto-Load**: Shows top 5 inactive users automatically
- **Quick Actions**: Select and unfollow directly from feed

### Tool Integration  
- **URL**: `/tool` - Full unfollow experience
- **Complete Analysis**: Full following list with pagination
- **Batch Operations**: Select multiple users and unfollow

### Embed Integration
- **Cast Embeds**: `/embed/cast` - Cast context and actions
- **Profile Embeds**: `/embed/profile` - Profile stats and quick access

---

## 🛠 **Technology Stack**

- **Framework**: Next.js 15.4.5
- **Language**: TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Authentication**: Farcaster Native Wallet
- **APIs**: Official Farcaster API
- **Deployment**: Vercel

---

## 📊 **How It Works**

1. **Auto-Detection**: App detects your Farcaster account automatically
2. **Following Scan**: Fetches your complete following list
3. **Analysis Engine**: 
   - Checks mutual follow status
   - Analyzes last cast timestamps
   - Identifies inactive users (60+ days)
   - Calculates spam probability
4. **Smart Recommendations**: Suggests users to unfollow
5. **Batch Operations**: Execute multiple unfollows with progress tracking

---

## 🎯 **Production URLs**

### Main App
- **Production**: https://redounfollowv0-pvzthsa1t-chipagosfinests-projects.vercel.app
- **App Registration**: https://redounfollowv0-pvzthsa1t-chipagosfinests-projects.vercel.app/embed

### Farcaster Integration
- **Feed**: `/feed` - Quick unfollow interface
- **Tool**: `/tool` - Full management experience
- **Cast Embed**: `/embed/cast` - Cast context
- **Profile Embed**: `/embed/profile` - Profile stats

### App Assets
- **Manifest**: https://redounfollowv0-pvzthsa1t-chipagosfinests-projects.vercel.app/farcaster-manifest.json
- **Icon**: https://redounfollowv0-pvzthsa1t-chipagosfinests-projects.vercel.app/icon.svg
- **Thumbnail**: https://redounfollowv0-pvzthsa1t-chipagosfinests-projects.vercel.app/thumbnail.png
- **Splash**: https://redounfollowv0-pvzthsa1t-chipagosfinests-projects.vercel.app/splash.png

---

## 🔧 **API Endpoints**

All endpoints use official Farcaster API:

- `GET /api/following` - Get user's following list
- `GET /api/check-mutual` - Check mutual follow status
- `GET /api/user-casts` - Get user's recent casts
- `POST /api/unfollow` - Execute unfollow action

---

## 🚀 **Deployment**

```bash
# Deploy to Vercel
npx vercel --prod --yes

# Local development
npm run dev
```

---

## 🎉 **Ready for Users!**

This app is **production-ready** and designed for immediate deployment to your excited users. The advantage of open social graphs like Farcaster is that we can build tools that work seamlessly with the platform.

**No manual input required** - just open and start cleaning up your following list! 🎯

---

## 📝 **License**

MIT License - Feel free to use and modify!

---

## 🤝 **Contributing**

Open to contributions! This is built for the Farcaster community.

---

*Built with ❤️ for the Farcaster ecosystem*
