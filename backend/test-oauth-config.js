// Test script to verify Google OAuth configuration
import dotenv from 'dotenv';

dotenv.config();

console.log('🔧 Google OAuth Configuration Check');
console.log('=====================================');

const requiredEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'SESSION_SECRET',
  'JWT_SECRET'
];

let allConfigured = true;

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${varName.includes('SECRET') ? '[HIDDEN]' : value.substring(0, 20) + '...'}`);
  } else {
    console.log(`❌ ${varName}: Not configured`);
    allConfigured = false;
  }
});

console.log('\n📝 OAuth URLs:');
console.log(`   Initiate: http://localhost:${process.env.PORT || 4000}/auth/google`);
console.log(`   Callback: http://localhost:${process.env.PORT || 4000}/auth/google/callback`);

if (allConfigured) {
  console.log('\n🎉 All Google OAuth environment variables are configured!');
  console.log('💡 Make sure to configure your Google Cloud Console with the URLs above.');
} else {
  console.log('\n⚠️  Some environment variables are missing.');
  console.log('📖 See GOOGLE_OAUTH_SETUP.md for configuration instructions.');
}

console.log('\n🚀 To test Google OAuth:');
console.log('1. Start the backend: npm run dev');
console.log('2. Start the frontend: npm run dev');
console.log('3. Navigate to login page and click "Sign in with Google"');
