import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { notifyError } from "../components/ui/Toast";
import { useAuth } from "../hooks/useAuth";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm_password: "", role: "guest" });
  const submit = async (e) => {
    e.preventDefault();
    try { await register(form); navigate("/"); } catch (err) { notifyError(err.response?.data?.detail || "Register failed"); }
  };
  return <form onSubmit={submit} className="mx-auto max-w-md space-y-3 rounded-lg bg-white p-6 shadow"><h1 className="text-2xl font-semibold">Register</h1><Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /><Input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><Input type="password" placeholder="Confirm password" value={form.confirm_password} onChange={(e) => setForm({ ...form, confirm_password: e.target.value })} /><div className="flex gap-2"><Button type="button" variant={form.role === "guest" ? "primary" : "secondary"} onClick={() => setForm({ ...form, role: "guest" })}>Guest</Button><Button type="button" variant={form.role === "host" ? "primary" : "secondary"} onClick={() => setForm({ ...form, role: "host" })}>Host</Button></div><Button className="w-full">Create Account</Button><p className="text-sm">Already registered? <Link className="text-primary" to="/login">Login</Link></p></form>;
}
