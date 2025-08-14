import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { collections } from '../db.js';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

// Debug environment variables
console.log('🔧 Passport Config - Environment Check:');
console.log('- GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...` : 'MISSING');
console.log('- GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING');

// Validate required environment variables
if (!process.env.GOOGLE_CLIENT_ID) {
  console.error('❌ GOOGLE_CLIENT_ID is not set in environment variables');
  console.error('Please check your .env file');
}
if (!process.env.GOOGLE_CLIENT_SECRET) {
  console.error('❌ GOOGLE_CLIENT_SECRET is not set in environment variables');
  console.error('Please check your .env file');
}

// Switch to MongoDB models

function normEmail(e) {
  return (e || '').trim().toLowerCase();
}

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, { id: user.id, role: user.role });
});

// Deserialize user from session
passport.deserializeUser(async (sessionUser, done) => {
  try {
    const cols = collections();
    let user = null;
    if (sessionUser.role === 'consumer') {
      user = await cols.consumers.findOne({ id: sessionUser.id });
    } else if (sessionUser.role === 'provider') {
      user = await cols.providers.findOne({ id: sessionUser.id });
    }
    done(null, user);
  } catch (e) {
    done(e);
  }
});

// Google OAuth Strategy
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!googleClientId || !googleClientSecret) {
  console.error('❌ Google OAuth credentials not found!');
  console.error('- GOOGLE_CLIENT_ID:', googleClientId ? 'SET' : 'MISSING');
  console.error('- GOOGLE_CLIENT_SECRET:', googleClientSecret ? 'SET' : 'MISSING');
  console.error('Please check your .env file in the backend directory');
  process.exit(1);
}

passport.use(new GoogleStrategy({
  clientID: googleClientId,
  clientSecret: googleClientSecret,
  callbackURL: "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  console.log('📧 Google Strategy callback triggered');
  console.log('Profile:', {
    id: profile.id,
    email: profile.emails?.[0]?.value,
    name: profile.displayName
  });
  
  try {
    const email = normEmail(profile.emails[0].value);
    const firstName = profile.name.givenName || '';
    const lastName = profile.name.familyName || '';
    const name = `${firstName} ${lastName}`.trim();
    const googleId = profile.id;

    // Check if user already exists (in either consumers or providers)
    const cols = collections();
  let existingUser = await cols.consumers.findOne({ $or: [ { email }, { emailOriginal: profile.emails[0].value }, { googleId } ] });
    if (existingUser) {
      // Update Google ID if not set
      if (!existingUser.googleId) {
        await cols.consumers.updateOne({ id: existingUser.id }, { $set: { googleId } });
        existingUser.googleId = googleId;
      }
      return done(null, existingUser);
    }
    
  existingUser = await cols.providers.findOne({ $or: [ { email }, { emailOriginal: profile.emails[0].value }, { googleId } ] });
    if (existingUser) {
      // Update Google ID if not set
      if (!existingUser.googleId) {
        await cols.providers.updateOne({ id: existingUser.id }, { $set: { googleId } });
        existingUser.googleId = googleId;
      }
      return done(null, existingUser);
    }

    // Create new consumer account with Google OAuth
    const newConsumer = {
      id: uuid(),
      role: 'consumer',
      active: true, // Google verified accounts are automatically active
      googleId: googleId,
      firstName,
      lastName,
      name,
      email,
      emailOriginal: profile.emails[0].value,
      emailVerified: true, // Google has verified the email
      authProvider: 'google',
      createdAt: Date.now(),
      // Generate a random password for potential future use
      password: await bcrypt.hash(uuid(), 10)
    };
    await cols.consumers.insertOne(newConsumer);

    return done(null, newConsumer);
  } catch (error) {
    return done(error, null);
  }
}));

export default passport;
