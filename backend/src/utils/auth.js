import jwt from 'jsonwebtoken';

export function generateToken(payload){
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
}

export function verifyTokenMiddleware(req,res,next){
  const auth = req.headers.authorization;
  if(!auth) return res.status(401).json({error:'missing token'});
  const token = auth.replace('Bearer ','');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch(e){
    // Check if the error is due to token expiration
    if(e.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'token expired',
        redirect: '/login',
        message: 'Your session has expired. Please log in again.'
      });
    }
    // For other token errors (malformed, invalid signature, etc.)
    return res.status(401).json({
      error: 'invalid token',
      redirect: '/login',
      message: 'Invalid authentication token. Please log in again.'
    });
  }
}
