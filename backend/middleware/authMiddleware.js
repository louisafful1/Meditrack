import jwt from 'jsonwebtoken'
import asyncHandler from 'express-async-handler'
import User from '../models/userModels.js'

const protect = asyncHandler(async (req, res, next) => {
    let token;

    token = req.cookies.jwt;

    if (token) {
        try {

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.userId).select('-password');

            next();

        }catch (error) {
            res.status(401);
            throw new Error("Not authorized, Please login");
        }
    }else{
        res.status(401);
        throw new Error("Not authorized, Please login");
    }

});

// Admin only
const adminOnly = asyncHandler ( async(req, res, next) => {

if(req.user && req.user.role === "admin"){
next()
}else{
  res.status(403)
  throw new Error("Access Denied! - Admins Only")
}

})

// Supervisor Only access
const supervisorOnly = asyncHandler ( async(req, res, next) => {

  if(req.user && req.user.role === "supervisor"){
  next()
  }else{
    res.status(403)
    throw new Error("Access Denied! - Supervisor Only")
  }
  
  })

export { protect, adminOnly, supervisorOnly }