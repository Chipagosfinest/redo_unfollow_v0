#!/usr/bin/env node

/**
 * Security Verification Script
 * Checks that API keys are properly protected
 */

const fs = require('fs');
const path = require('path');

console.log('🔒 Security Verification...\n');

// Check 1: .gitignore contains .env files
const gitignore = fs.readFileSync('.gitignore', 'utf8');
const envIgnored = gitignore.includes('.env*') || gitignore.includes('.env.local');
console.log(`✅ .env files in .gitignore: ${envIgnored}`);

// Check 2: No API keys in client-side code
const clientFiles = [
  'src/components/FarcasterConnect.tsx',
  'src/components/NeynarAuth.tsx',
  'src/app/page.tsx'
];

let clientSideSecure = true;
clientFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('NEYNAR_API_KEY') || content.includes('process.env.NEYNAR')) {
      console.log(`❌ API key found in client file: ${file}`);
      clientSideSecure = false;
    }
  }
});

console.log(`✅ API keys not in client-side code: ${clientSideSecure}`);

// Check 3: API keys only in server-side code
const serverFiles = [
  'src/app/api/analyze/route.ts',
  'src/app/api/auth/signer/route.ts',
  'src/app/api/auth/user/route.ts',
  'src/app/api/unfollow/route.ts'
];

let serverSideSecure = true;
serverFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    if (!content.includes('process.env.NEYNAR_API_KEY')) {
      console.log(`❌ API key not found in server file: ${file}`);
      serverSideSecure = false;
    }
  }
});

console.log(`✅ API keys properly used in server-side code: ${serverSideSecure}`);

// Check 4: No hardcoded keys
const allFiles = fs.readdirSync('src', { recursive: true });
let noHardcodedKeys = true;

allFiles.forEach(file => {
  if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
    const filePath = path.join('src', file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('BD9B92A0-6451-4284-B376-8CC521C01754') || 
          content.includes('8c23047d-185d-462e-96a7-c70826ad8340')) {
        console.log(`❌ Hardcoded API key found in: ${filePath}`);
        noHardcodedKeys = false;
      }
    }
  }
});

console.log(`✅ No hardcoded API keys in source code: ${noHardcodedKeys}`);

// Summary
console.log('\n🔒 Security Summary:');
console.log(`- Environment files protected: ${envIgnored}`);
console.log(`- Client-side secure: ${clientSideSecure}`);
console.log(`- Server-side properly configured: ${serverSideSecure}`);
console.log(`- No hardcoded keys: ${noHardcodedKeys}`);

if (envIgnored && clientSideSecure && serverSideSecure && noHardcodedKeys) {
  console.log('\n✅ ALL SECURITY CHECKS PASSED!');
  console.log('Your API keys are properly protected.');
} else {
  console.log('\n❌ SECURITY ISSUES FOUND!');
  console.log('Please fix the issues above before deploying.');
} 