import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { notifyError } from "../components/ui/Toast";
import { useAuth } from "../hooks/useAuth";
import { FiMail, FiLock, FiArrowRight } from "react-icons/fi";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      notifyError("Please fill in all credentials.");
      return;
    }
    setIsLoading(true);
    try {
      await login(form);
      navigate("/");
    } catch (err) {
      notifyError(err.response?.data?.detail || "Invalid email address or password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden border-t-4 border-indigo-600 transition-all hover:shadow-2xl">
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Welcome Back</h2>
            <p className="text-slate-400 mt-2 text-sm">Sign in to manage bookings and properties.</p>
          </div>

          <form onSubmit={submit} className="space-y-6">
            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FiMail size={18} />
                </span>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium transition"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Password</label>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FiLock size={18} />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium transition"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-indigo-50 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              {isLoading ? "Signing In..." : "Sign In"}
              <FiArrowRight />
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="border-t border-slate-50 mt-8 pt-6 text-center text-sm text-slate-500">
            <span>New to Rentlora? </span>
            <Link className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline transition" to="/register">
              Create a free account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
