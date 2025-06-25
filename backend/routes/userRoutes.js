import express from 'express';
import { adminOnly, protect } from '../middleware/authMiddleware.js';
import { authUser, adminCreateUser,
    logoutUser,
    getUserProfile,
    updateUser,
    getLoginStatus,
    resetPassword,
    sendPasswordSetupLink,

} from '../controllers/userController.js';
const userRoutes = express.Router();
userRoutes.post('/create-user', adminOnly, adminCreateUser);
userRoutes.post('/login', authUser);
userRoutes.post('/logout', logoutUser);
userRoutes.get('/getLoginStatus', getLoginStatus);
userRoutes.route('/profile').get(protect, getUserProfile).put(protect, updateUser); 
userRoutes.put("/resetPassword/:resetToken", resetPassword)
userRoutes.post("/send-setup-link", sendPasswordSetupLink);

export default userRoutes;