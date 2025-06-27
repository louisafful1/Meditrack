import { useEffect, useState } from "react";
import { Lock, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { login, RESET_AUTH } from "../redux/auth/authSlice";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import Loader from "../components/loader/loader";
import { validateEmail } from "../../utils";

const LoginPage = () => {
  
      const [email, setEmail] = useState("");
      const [password, setPassword] = useState(""); 
  
      const {isLoading, isLoggedIn, isSuccess} = useSelector((state) => state.auth)
      const dispatch = useDispatch();
      const navigate = useNavigate();
  
      const loginUser = async (e) => { 
          e.preventDefault();
  
          if(!email || !password) {
              return toast.error("Enter all required fields")
          }
  
          if (!validateEmail(email)) {
              return toast.error("Please enter a valid Email ")
          }
          const userData = {          
              email,
              password
          };
          await dispatch(login(userData));
  
      }; 
  
      useEffect(() => {
          if(isSuccess && isLoggedIn) {
          navigate('/')
          }
  
          dispatch(RESET_AUTH())
  
      }, [isSuccess, isLoggedIn, dispatch, navigate])
  

  return (
    <div>
    {isLoading && <Loader />}
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <motion.div
        className="bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Login</h2>

        <form onSubmit={loginUser} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-md"
          >
            Sign In
          </button>

          <p className="text-sm text-gray-400 text-center mt-2">
            Forgot your password?{" "}
            <a href="/forgot-password" className="text-indigo-400 hover:underline">
              Reset here
            </a>
          </p>
        </form>
      </motion.div>
    </div>
    </div>
  );
};

export default LoginPage;
