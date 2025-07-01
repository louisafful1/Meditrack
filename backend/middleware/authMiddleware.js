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

    if (!user.active) {
      res.status(403);
      throw new Error("Account is inactive. Contact admin.");
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401);
    throw new Error("Not authorized, token failed");
  }
});


const adminOnly = asyncHandler(async (req, res, next) => {
  if (req.user?.role === "admin" && req.user?.active) {
    next();
  } else {
    res.status(403);
    throw new Error("Access Denied - Admins only");
  }
});

const supervisorOnly = asyncHandler(async (req, res, next) => {
  if (req.user?.role === "supervisor" && req.user?.active) {
    next();
  } else {
    res.status(403);
    throw new Error("Access Denied - Supervisors only");
  }
});

export { protect, adminOnly, supervisorOnly }