const GoogleStrategy = require('passport-google-oauth20').Strategy;
const config = require('./config');
const userService = require('../services/user.service');

const setupGoogleStrategy = () => {
  if (!config.oauth.google.clientId || !config.oauth.google.clientSecret || !config.oauth.google.callbackUrl) {
    // Not configured
    return null;
  }

  const strategy = new GoogleStrategy(
    {
      clientID: config.oauth.google.clientId,
      clientSecret: config.oauth.google.clientSecret,
      callbackURL: config.oauth.google.callbackUrl,
    },
    // verify callback
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails[0] && profile.emails[0].value;
        const name = profile.displayName || (profile.name && `${profile.name.givenName} ${profile.name.familyName}`) || 'Google User';
        if (!email) {
          return done(new Error('No email available from Google'), null);
        }
        const user = await userService.getOrCreateOAuthUser({ email, name, provider: 'google' });
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  );

  return strategy;
};

module.exports = setupGoogleStrategy;
