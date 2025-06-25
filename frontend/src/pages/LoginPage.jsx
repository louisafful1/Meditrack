import { useState } from "react";
import { Lock, Mail } from "lucide-react";
import { motion } from "framer-motion";

const LoginPage = () => {
  const [form, setForm] = useState({ email: "", password: "" });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    alert("Logging in...");
    // TODO: send to backend
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <motion.div
        className="bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Login</h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email"
              required
              className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
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
  );
};

export default LoginPage;
