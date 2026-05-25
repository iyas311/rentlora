import { useEffect, useState } from "react";
import { getMe, updateMe } from "../api/users";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

export default function Profile() {
  const [form, setForm] = useState({ name: "", phone: "", avatar_url: "", email: "", role: "" });
  useEffect(() => { getMe().then((u) => setForm({ ...u })); }, []);
  return <div className="mx-auto max-w-xl rounded-lg bg-white p-6 shadow"><h1 className="text-2xl font-semibold">Profile</h1><div className="mt-3 space-y-2"><Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /><Input value={form.email || ""} readOnly /><Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /><Input value={form.avatar_url || ""} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} /><Button onClick={() => updateMe({ name: form.name, phone: form.phone, avatar_url: form.avatar_url })}>Save</Button></div></div>;
}
