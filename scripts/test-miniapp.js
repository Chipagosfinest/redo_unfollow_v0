#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧹 Testing Farcaster Mini App Configuration...\n');

// Test 1: Check if farcaster-manifest.json exists and is valid
console.log('1. Testing Farcaster Manifest...');
try {
  const farcasterManifest = JSON.parse(fs.readFileSync('public/farcaster-manifest.json', 'utf8'));
  
  const requiredFields = ['app', 'permissions', 'features', 'sdk', 'metadata'];
  const missingFields = requiredFields.filter(field => !farcasterManifest[field]);
  
  if (missingFields.length === 0) {
    console.log('✅ Farcaster manifest is valid');
    console.log(`   - App name: ${farcasterManifest.app.name}`);
    console.log(`   - Version: ${farcasterManifest.metadata.version}`);
    console.log(`   - Features: ${farcasterManifest.features.length} features`);
    console.log(`   - Pages: ${farcasterManifest.pages?.length || 0} pages`);
  } else {
    console.log('❌ Missing required fields:', missingFields);
  }
} catch (error) {
  console.log('❌ Error reading farcaster-manifest.json:', error.message);
}

// Test 2: Check if manifest.json exists and is valid
console.log('\n2. Testing Web App Manifest...');
try {
  const webManifest = JSON.parse(fs.readFileSync('public/manifest.json', 'utf8'));
  
  const requiredFields = ['name', 'short_name', 'description', 'start_url', 'display'];
  const missingFields = requiredFields.filter(field => !webManifest[field]);
  
  if (missingFields.length === 0) {
    console.log('✅ Web app manifest is valid');
    console.log(`   - Name: ${webManifest.name}`);
    console.log(`   - Start URL: ${webManifest.start_url}`);
    console.log(`   - Shortcuts: ${webManifest.shortcuts?.length || 0} shortcuts`);
  } else {
    console.log('❌ Missing required fields:', missingFields);
  }
} catch (error) {
  console.log('❌ Error reading manifest.json:', error.message);
}

// Test 3: Check if robots.txt exists
console.log('\n3. Testing SEO Files...');
const seoFiles = ['robots.txt', 'sitemap.xml', 'browserconfig.xml'];
seoFiles.forEach(file => {
  const filePath = path.join('public', file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
  }
});

// Test 4: Check if vercel.json is configured
console.log('\n4. Testing Vercel Configuration...');
try {
  const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  
  if (vercelConfig.headers && vercelConfig.rewrites) {
    console.log('✅ Vercel configuration is valid');
    console.log(`   - Headers: ${vercelConfig.headers.length} header rules`);
    console.log(`   - Rewrites: ${vercelConfig.rewrites.length} rewrite rules`);
    
    // Check for Farcaster-specific headers
    const farcasterHeaders = vercelConfig.headers.some(header => 
      header.headers.some(h => h.key === 'X-Farcaster-App')
    );
    
    if (farcasterHeaders) {
      console.log('✅ Farcaster-specific headers configured');
    } else {
      console.log('⚠️  Farcaster headers not found');
    }
  } else {
    console.log('❌ Missing required Vercel configuration');
  }
} catch (error) {
  console.log('❌ Error reading vercel.json:', error.message);
}

// Test 5: Check if all required pages exist
console.log('\n5. Testing App Pages...');
const requiredPages = [
  'src/app/farcaster-cleanup/page.tsx',
  'src/app/analytics/page.tsx',
  'src/app/whitelist/page.tsx',
  'src/app/settings/page.tsx'
];

requiredPages.forEach(page => {
  if (fs.existsSync(page)) {
    console.log(`✅ ${page.split('/').pop()} exists`);
  } else {
    console.log(`❌ ${page.split('/').pop()} missing`);
  }
});

// Test 6: Check if API endpoints exist
console.log('\n6. Testing API Endpoints...');
const requiredApis = [
  'src/app/api/neynar/cleanup/analyze/route.ts',
  'src/app/api/neynar/unfollow/route.ts',
  'src/app/api/neynar/analytics/dashboard/route.ts',
  'src/app/api/neynar/whitelist/get/route.ts',
  'src/app/api/neynar/whitelist/add/route.ts',
  'src/app/api/neynar/whitelist/remove/route.ts'
];

requiredApis.forEach(api => {
  if (fs.existsSync(api)) {
    console.log(`✅ ${api.split('/').slice(-2).join('/')} exists`);
  } else {
    console.log(`❌ ${api.split('/').slice(-2).join('/')} missing`);
  }
});

console.log('\n🎉 Mini App Configuration Test Complete!');
console.log('\nNext steps:');
console.log('1. Deploy to Vercel: git push origin main');
console.log('2. Test in Warpcast: Open the deployed URL');
console.log('3. Verify Mini App functionality');
console.log('4. Check analytics and error monitoring'); 