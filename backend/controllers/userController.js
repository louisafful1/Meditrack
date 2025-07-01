import asyncHandler from "express-async-handler";
import User from '../models/userModels.js'
import generateToken from '../utils/generateToken.js'
import jwt from 'jsonwebtoken' 
import crypto from "crypto"
import { sendEmail } from "../utils/sendEmail.js";
import ActivityLog from "../models/activityLogModel.js"

//@desc  Register a new user
//route  POST/api/users/register
//@access public
// Admin registers a user without password

const adminRegisterUser = asyncHandler(async (req, res) => {
    const {name, email, phone, role, facility} = req.body; 

    //Validation
    if (!name || !email || !phone || !role || !facility ) {
        res.status(400);
        throw new Error('Please fill in all required fields');

    }

    //check if user exists
    const userExists = await User.findOne({email}); 

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    //Register the user 
    const user = await User.create({
        name,
        email,
        phone,
        role, 
        facility     

    });

      
    const resetToken = user.createPasswordResetToken();
    await user.save();
    console.log("Unhashed token to send:", resetToken);
console.log("Hashed token stored:", user.passwordResetToken);
  
    const resetUrl = `${process.env.FRONTEND_URL}/set-password/${resetToken}`;
  
    const message = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; background-color: #f9f9f9; padding: 30px; border-radius: 8px; border: 1px solid #e0e0e0;">
      <div style="text-align: center;">
        <h2 style="color: #4F46E5;">MediTrack</h2>
        <p style="font-size: 15px; color: #555;">Your Smart Drug Inventory System</p>
        <hr style="margin: 20px 0;" />
      </div>
  
      <div>
        <p style="font-size: 16px; color: #333;">Hi <strong>${user.name}</strong>,</p>
  
        <p style="font-size: 15px; color: #555;">
          You have been added to the <strong>MediTrack</strong> system. To activate your account, please click the button below to set your password and gain access.
        </p>
  
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" target="_blank" style="background-color: #4F46E5; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
            Set Password
          </a>
        </div>
  
        <p style="font-size: 14px; color: #999;">
          If you did not expect this email, you can safely ignore it.
        </p>
      </div>
  
      <hr style="margin: 20px 0;" />
  
      <footer style="text-align: center; font-size: 12px; color: #aaa;">
        &copy; ${new Date().getFullYear()} MediTrack. All rights reserved.
      </footer>
    </div>
  `;
  
    await sendEmail({
      send_to: user.email,
      subject: "Welcome to MediTrack – Set Up Your Account Access",
      message,
    });

    await ActivityLog({
      userId: req.user._id,
      action: "Registered User",
      module: "User",
      targetId: user._id,
      message: `${req.user.name} Created a new account for ${user.name} (${user.role})`,
    });
    

    res.status(201).json({ message: "User registered. Link has been sent to the email." });

});


// login
//@desc  Auth user/set token
//route  POST/api/users/auth
//@access public

const authUser = asyncHandler(async (req, res) => {
    const {email, password } = req.body;

        //Validation
        if (!email || !password) {
            res.status(400);
            throw new Error('Please fill in all required fields');
    
        }
        const user = await User.findOne({ email }).populate("facility");
  
        if (user && (await user.matchPassword(password))) {
            generateToken(res, user._id);
            const newUser = await User.findOne({ email }).select("-password"); 
            res.status(200).json(newUser);
        } else {
          res.status(401);
          throw new Error("Invalid email or password");
        }

});


//@desc  Logout user
//route  POST/api/users/logout
//@access public

const logoutUser = asyncHandler(async (req, res) => {
    res.cookie('jwt', '', {
        httpOnly:true,
        expires: new Date(0)
    })
    res.status(200).json({ message: 'Successfully logged out'});

});


//@desc  Get user profile
//route  GET/api/users/auth
//@access private

const getUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).populate("facility", "name address contactEmail").select("-password");
         
  if (user) {
    res.status(200).json(user);
} else {   
        res.status(404);
        throw new Error('User not Found');    
}

});

//@desc  Get user profile
//route  GET/api/users/auth
//@access private

const getUsers = asyncHandler(async (req, res) => {
  const facilityId = req.user.facility;

  const users = await User.find({ facility: facilityId })
    .sort({ createdAt: -1 })
    .select("-password");

  if (users && users.length > 0) {
    res.status(200).json(users);
  } else {
    res.status(404);
    throw new Error('No users found for this facility');
  }
});



// Get login status
const getLoginStatus = asyncHandler(async (req, res) => {
    let token;
    token = req.cookies.jwt;
    if (!token) {
        res.json(false);
    }
    // verify token
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json(true);
      } catch (err) {
        res.json(false);
      }
      

});



//@desc  Update user profile
//route  PUT/api/users/auth
//@access private

const updateUser = asyncHandler(async (req, res) => {
   const user = await User.findById(req.user._id);

   if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;
    user.role = req.body.role || user.role;
    user.facility = req.body.facility || user.facility;

    const updateUser = await user.save();
    
    res.status(200).json({
        _id: updateUser._id,
        name: updateUser.name,
        email: updateUser.email,
        phone: updateUser.phone,
        role: updateUser.role,
        facility: updateUser.facility

    });
   } else{
    res.status(404);
    throw new Error('User not Found');
   }
});


// @desc    Send password setup link
// @route   POST /api/auth/send-setup-link
const sendPasswordSetupLink = asyncHandler(async (req, res) => {
    const { email } = req.body;
  
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }
  
    const resetToken = user.createPasswordResetToken();
    await user.save();
  
    const resetUrl = `${process.env.CLIENT_URL}/set-password/${resetToken}`;
  
    const message = `
      <h2>Hello ${user.name}</h2>
      <p>You have been added to the system. Please set your password:</p>
      <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
    `;
  
    await sendEmail({
      to: user.email,
      subject: "Set your password",
      html: message,
    });
  
    res.json({ message: "Setup link sent to email" });
  });

//Reset Password
const resetPassword = asyncHandler (async (req, res) => {

    const {resetToken} =req.params 

    //    Hash token, then compare to token in the db
const hashedToken = crypto
.createHash("sha256")
.update(resetToken)
.digest("hex");

    console.log("Incoming resetToken param:", resetToken);
console.log("Hashed version:", hashedToken);
const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

if(!user){
 res.status(404)
    throw new Error("Invalid or expired Token")
    
  }

    const { password } = req.body;
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.status(200).json({
        status: "Success",
        message: "Password Reset Successful"
    });


})

// @desc    Toggle user active status
// @route   PATCH /api/users/:id/toggle-status
// @access  Admin only
const toggleUserStatus = asyncHandler(async (req, res) => {
  const userId = req.params.userId;
  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Toggle the active status
  user.active = !user.active;
  await user.save();

  res.status(200).json({
message: `${user.name} is now ${user.active ? "Active" : "Inactive"}.`,
            _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        active: user.active,
  
  });
});

const deleteUser = asyncHandler(async(req, res) => {

   const user = await User.findById(req.params.id)
   
   if(!user){
      res.status(404)
      throw new Error("user not found")
     }
    
// delete user from mongodb
   await User.findByIdAndDelete(req.params.id)
res.status(200).json({_id: req.params.id, message: "User deleted successfully"})
   })


export {
  authUser,
  adminRegisterUser,
  logoutUser,
  getUserProfile,
  getUsers,
  updateUser,
  getLoginStatus,
  sendPasswordSetupLink,
  resetPassword,
  toggleUserStatus,
  deleteUser
};