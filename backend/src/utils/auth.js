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
    return res.status(401).json({error:'invalid token'});
  }
}
