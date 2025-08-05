# Farcaster Feed Cleaner

A modern, optimized tool to clean up your Farcaster feed by identifying and unfollowing inactive accounts, non-mutual follows, and spam users.

## 🚀 Live App

**Live URL:** [https://redounfollowv0.vercel.app](https://redounfollowv0.vercel.app)

## ✨ Features

- **Smart Analysis** - Identifies inactive accounts, non-mutual follows, and spam
- **Batch Operations** - Select and unfollow multiple users at once
- **Modern UI** - Clean, responsive design with smooth animations
- **Real-time Data** - Uses actual Farcaster data via Neynar API
- **Secure & Private** - No data stored on servers

## 🛠️ Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript
- **Styling:** Tailwind CSS, Radix UI
- **Backend:** Next.js API Routes
- **Deployment:** Vercel
- **Data:** Neynar API (Farcaster)

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/Chipagosfinest/redo_unfollow_v0.git
   cd redo_unfollow_v0
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
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEYNAR_API_KEY` | Your Neynar API key | Yes |
| `NEXT_PUBLIC_APP_URL` | Your app's URL | Yes |

## 📦 Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── analyze/          # Analysis API endpoint
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Home page
├── components/
│   ├── ui/                   # UI components (Radix)
│   ├── FarcasterConnect.tsx  # Main app component
│   └── ThemeProvider.tsx     # Theme provider
└── lib/
    ├── env.ts                # Environment utilities
    └── utils.ts              # Utility functions
```

## 🎨 Design Features

- **Modern Gradient Backgrounds** - Beautiful purple to blue gradients
- **Smooth Animations** - Hover effects and transitions
- **Responsive Layout** - Works perfectly on all devices
- **Accessible Design** - Proper contrast and ARIA labels

## 🔄 Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 🚀 Deployment

The app is automatically deployed to Vercel. To deploy:

1. Push to the `main` branch
2. Vercel will automatically build and deploy
3. Add environment variables in Vercel dashboard

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

**Note:** This app is production-ready and uses real Farcaster data. Users can connect their wallets and start cleaning their feeds immediately.
