import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { notifyError } from "../components/ui/Toast";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const submit = async (e) => {
    e.preventDefault();
    try { await login(form); navigate("/"); } catch (err) { notifyError(err.response?.data?.detail || "Login failed"); }
  };
  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-4 rounded-lg bg-white p-6 shadow">
      <h1 className="text-2xl font-semibold text-primary">Login</h1>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
        <Input type="email" placeholder="email@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
        <Input type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </div>
      <Button className="w-full">Login</Button>
      <p className="text-sm">Don't have an account? <Link className="text-primary hover:underline" to="/register">Register</Link></p>
    </form>
  );
}
