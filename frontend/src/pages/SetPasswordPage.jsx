import { useState } from "react";
import { Lock } from "lucide-react";
import { motion } from "framer-motion";
import { resetPassword } from "../redux/auth/authSlice";
import Loader from "../components/loader/loader";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
const initialState = {
    password: "",
    confirmPassword: ""
}
const SetPasswordPage = () => {
    const [error, setError] = useState("");
    const [formData, setFormData ] = useState(initialState);
    const { password, confirmPassword } = formData;
    const { isLoading } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate()
    const { resetToken } = useParams(); // Retrieve the reset token from URL params
  
      const handleResetPassword = async (e) => {
          e.preventDefault();  
          if (!password || !confirmPassword) {
          setError("All fields are required");   
              return;
        }
      if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
          // Dispatch reset password action with password and token
          try {
              await dispatch(resetPassword({ password, resetToken }));
              navigate("/login")
          } catch (error) {
              toast.error(error.message || "Failed to reset password");
          }
      };

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData({ ...formData, [name]: value })
    
    };  


  return (
    <>
    {isLoading && <Loader />}
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <motion.div
        className="bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Set New Password</h2>

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="password"
              name="password"
              value={password}
              onChange={handleInputChange}
              placeholder="New Password"
              required
              className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="password"
              name="confirmPassword"
              value={confirmPassword}
              onChange={handleInputChange}
              placeholder="Confirm Password"
              required
              className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-md"
          >
            Set Password
          </button>
        </form>
      </motion.div>
    </div>
    </>
  );
};

export default SetPasswordPage;
