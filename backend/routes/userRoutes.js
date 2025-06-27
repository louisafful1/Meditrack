import express from 'express';
import { adminOnly, protect } from '../middleware/authMiddleware.js';
import { authUser, adminRegisterUser,
    logoutUser,
    getUserProfile,
    getUsers,
    updateUser,
    getLoginStatus,
    resetPassword,
    sendPasswordSetupLink,
    toggleUserStatus,
    deleteUser,

} from '../controllers/userController.js';
const userRoutes = express.Router();
userRoutes.post('/register', adminRegisterUser);
userRoutes.post('/login', authUser);
userRoutes.post('/logout', logoutUser);
userRoutes.get('/getLoginStatus', getLoginStatus);
userRoutes.route('/profile').get(protect, getUserProfile).put(protect, updateUser); 
userRoutes.get("/", getUsers);
userRoutes.put("/resetPassword/:resetToken", resetPassword)
userRoutes.post("/send-setup-link", sendPasswordSetupLink);
userRoutes.patch("/:userId/toggle-status", toggleUserStatus);
userRoutes.delete("/:id", deleteUser)


export default userRoutes;