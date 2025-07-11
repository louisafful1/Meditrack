import jwt from 'jsonwebtoken'
import asyncHandler from 'express-async-handler'
import User from '../models/userModels.js'
const protect = asyncHandler(async (req, res, next) => {
  let token = req.cookies.jwt;

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, please login");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password').populate("facility");

    if (!user) {
      res.status(401);
      throw new Error("User not found");
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401);
    throw new Error("Not authorized, token failed");
  }
});


const adminOnly = asyncHandler(async (req, res, next) => {
  if (req.user?.role === "admin") {
    next();
  } else {
    res.status(403);
    throw new Error("Access Denied - Admins only");
  }
});


const authorizeRoles = (allowedRoles) => asyncHandler(async (req, res, next) => {
  if (!req.user) {
    res.status(401); 
    throw new Error("Not authorized, user information missing.");
  }

  // Check if the authenticated user's role is included in the allowedRoles array
  if (allowedRoles.includes(req.user.role)) {
    next(); 
  } else {
    res.status(403); // Forbidden
    throw new Error(`Access Denied - Role (${req.user.role}) is not authorized to access this resource.`);
  }
});

export {
  protect,
  adminOnly,
  authorizeRoles, 
};
