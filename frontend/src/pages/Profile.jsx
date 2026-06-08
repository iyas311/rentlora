import { useEffect, useState } from "react";
import { getMe, updateMe } from "../api/users";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

export default function Profile() {
  const [form, setForm] = useState({ name: "", phone: "", avatar_url: "", email: "", role: "" });
  useEffect(() => { getMe().then((u) => setForm({ ...u })); }, []);
  return (
    <div className="mx-auto max-w-xl rounded-lg bg-white p-6 shadow">
      <h1 className="text-2xl font-semibold text-primary">Profile</h1>
      <div className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
          <Input placeholder="Your Name" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address (Read-only)</label>
          <Input value={form.email || ""} readOnly className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none text-gray-500 bg-gray-100 cursor-not-allowed" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
          <Input placeholder="e.g. +1 555-0199" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Avatar Image URL</label>
          <Input placeholder="https://example.com/avatar.jpg" value={form.avatar_url || ""} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} />
        </div>
        <Button onClick={() => updateMe({ name: form.name, phone: form.phone, avatar_url: form.avatar_url })}>Save</Button>
      </div>
    </div>
  );
}
