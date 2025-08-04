// Environment validation utility
export function validateEnvironment() {
  const requiredEnvVars = {
    NEYNAR_API_KEY: process.env.NEYNAR_API_KEY,
  };

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.warn('Missing required environment variables:', missingVars);
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
  }

  return {
    neynarApiKey: process.env.NEYNAR_API_KEY || '',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
  };
}

// Export validated environment
export const env = validateEnvironment(); 