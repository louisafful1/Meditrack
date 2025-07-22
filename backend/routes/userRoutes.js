import express from 'express';
import { adminOnly, authorizeRoles, protect } from '../middleware/authMiddleware.js';
import { authUser, adminRegisterUser,
    logoutUser,
    getUserProfile,
    getUsers,
    getLoginStatus,
    resetPassword,
    sendPasswordSetupLink,
    toggleUserStatus,
    deleteUser,
    updateAnyUser,

} from '../controllers/userController.js';
const userRoutes = express.Router();
userRoutes.post('/register', protect, adminOnly, adminRegisterUser);
userRoutes.post('/login', authUser);
userRoutes.post('/logout', protect, logoutUser);
userRoutes.get('/getLoginStatus', getLoginStatus);
userRoutes.route('/profile').get(protect, getUserProfile);
userRoutes.route('/:id').put(protect, authorizeRoles(['admin', 'supervisor']), updateAnyUser); 
userRoutes.get("/", protect, authorizeRoles(['admin', 'supervisor']), getUsers);
userRoutes.put("/resetPassword/:resetToken", resetPassword)
userRoutes.post("/send-setup-link", sendPasswordSetupLink);
userRoutes.patch("/:userId/toggle-status", protect, adminOnly, toggleUserStatus);
userRoutes.delete("/:id", protect, adminOnly, deleteUser)


export default userRoutes;