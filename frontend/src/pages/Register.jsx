import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { notifyError, notifySuccess } from "../components/ui/Toast";
import { useAuth } from "../hooks/useAuth";
import { FiUser, FiMail, FiLock, FiCompass, FiHome, FiArrowRight } from "react-icons/fi";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm_password: "", role: "guest" });
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.confirm_password) {
      notifyError("Please fill in all details.");
      return;
    }
    if (form.password !== form.confirm_password) {
      notifyError("Passwords do not match.");
      return;
    }
    setIsLoading(true);
    try {
      await register(form);
      notifySuccess("Registration successful!");
      navigate("/");
    } catch (err) {
      notifyError(err.response?.data?.detail || "Registration failed. Try a different email.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden border-t-4 border-indigo-600 transition-all hover:shadow-2xl">
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Create an Account</h2>
            <p className="text-slate-400 mt-2 text-sm">Join standard-setting hospitality spaces around the world.</p>
          </div>

          <form onSubmit={submit} className="space-y-6">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Full Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FiUser size={18} />
                </span>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium transition"
                  required
                />
              </div>
            </div>

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

            {/* Password Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Password</label>
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
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Confirm Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <FiLock size={18} />
                  </span>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={form.confirm_password}
                    onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium transition"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Custom Card-based Role Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Choose Account Type</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Guest Selector Card */}
                <div
                  onClick={() => setForm({ ...form, role: "guest" })}
                  className={`rounded-2xl border-2 p-4 cursor-pointer transition-all duration-200 flex items-start gap-3 select-none ${
                    form.role === "guest"
                      ? "border-indigo-600 bg-indigo-50/20 shadow-md shadow-indigo-50"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className={`p-2 rounded-xl mt-0.5 ${form.role === "guest" ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"}`}>
                    <FiCompass size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">Traveler / Guest</h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Book premium stays and explore destinations.</p>
                  </div>
                </div>

                {/* Host Selector Card */}
                <div
                  onClick={() => setForm({ ...form, role: "host" })}
                  className={`rounded-2xl border-2 p-4 cursor-pointer transition-all duration-200 flex items-start gap-3 select-none ${
                    form.role === "host"
                      ? "border-indigo-600 bg-indigo-50/20 shadow-md shadow-indigo-50"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className={`p-2 rounded-xl mt-0.5 ${form.role === "host" ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"}`}>
                    <FiHome size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">Owner / Host</h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Publish listings and manage reservations.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-indigo-50 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              {isLoading ? "Creating Account..." : "Create Account"}
              <FiArrowRight />
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="border-t border-slate-50 mt-8 pt-6 text-center text-sm text-slate-500">
            <span>Already have an account? </span>
            <Link className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline transition" to="/login">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
