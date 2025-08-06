# Simple Farcaster Unfollow Tool

A straightforward tool to find and unfollow people who don't follow you back or haven't interacted in 60+ days.

## What it does

1. **Analyzes your relationships** - Checks who you follow
2. **Identifies non-mutual follows** - People who don't follow you back
3. **Checks interaction history** - People you haven't interacted with in 60+ days
4. **Lets you unfollow** - Selectively or all at once

## Usage

1. **Navigate to the tool**: Go to `/simple-unfollow`
2. **Click "Analyze Relationships"** - This will check your following list
3. **Review the results** - See who should be unfollowed and why
4. **Select users** - Check the boxes for users you want to unfollow
5. **Unfollow** - Click "Unfollow Selected" or "Unfollow ALL"

## Criteria for unfollowing

- **Doesn't follow you back** - They follow you but you don't follow them
- **No interaction for 60+ days** - No recent engagement between you

## Features

- **Simple interface** - No complex database or scoring
- **Clear reasons** - See exactly why someone should be unfollowed
- **Selective unfollow** - Choose specific users
- **Bulk unfollow** - Unfollow everyone at once
- **Rate limiting** - Built-in delays to avoid API limits

## API Endpoints

### Analyze Relationships
```
POST /api/simple/analyze-relationships
{
  "userFid": 4044
}
```

### Unfollow Users
```
POST /api/simple/unfollow
{
  "fids": [123, 456, 789]
}
```

## Setup

1. **Environment variables**:
   ```env
   NEYNAR_API_KEY=your-neynar-api-key
   ```

2. **Run the app**:
   ```bash
   npm run dev
   ```

3. **Access the tool**:
   ```
   http://localhost:3000/simple-unfollow
   ```

## Demo Mode

The current implementation includes demo data for testing:
- Random interaction days (1-120 days)
- Simulated unfollow success/failure
- No actual API calls for unfollowing

To make it production-ready, uncomment the real implementation in `/api/simple/unfollow/route.ts`.

## That's it!

No database, no complex scoring, no overengineering. Just a simple tool that does exactly what you need. 