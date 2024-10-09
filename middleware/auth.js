const jwt = require('jsonwebtoken');

// Authentication middleware
const authMiddleware = (req, res, next) => {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user from payload
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// Admin authorization middleware
const adminMiddleware = (req, res, next) => {
  if (!req.user.is_admin) {
    return res.status(403).json({ msg: 'Access denied. Admin only.' });
  }
  next();
};

// Staff authorization middleware
const staffMiddleware = (req, res, next) => {
  if (!req.user.is_staff && !req.user.is_admin) {
    return res.status(403).json({ msg: 'Access denied. Staff or Admin only.' });
  }
  next();
};

module.exports = { authMiddleware, adminMiddleware, staffMiddleware };