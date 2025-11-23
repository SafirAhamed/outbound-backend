const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const config = require('./config');
const { tokenTypes } = require('./tokens');
const { User } = require('../models');

// Allow token from either the Authorization header or from a cookie named in config
const cookieName = (config.cookie && config.cookie.name) || 'accessToken';
const cookieExtractor = (req) => {
  if (!req || !req.headers) return null;
  const raw = req.headers.cookie;
  if (!raw) return null;
  try {
    const parts = raw.split(';').map((c) => c.trim());
    for (const part of parts) {
      const [key, ...vals] = part.split('=');
      if (key === cookieName) return decodeURIComponent(vals.join('='));
    }
  } catch (e) {
    return null;
  }
  return null;
};

const jwtOptions = {
  secretOrKey: config.jwt.secret,
  jwtFromRequest: ExtractJwt.fromExtractors([
    ExtractJwt.fromAuthHeaderAsBearerToken(),
    cookieExtractor,
  ]),
};

const jwtVerify = async (payload, done) => {
  try {
    if (payload.type !== tokenTypes.ACCESS) {
      throw new Error('Invalid token type');
    }
    const user = await User.findById(payload.sub);
    if (!user) {
      return done(null, false);
    }
    done(null, user);
  } catch (error) {
    done(error, false);
  }
};

const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);

module.exports = {
  jwtStrategy,
};
