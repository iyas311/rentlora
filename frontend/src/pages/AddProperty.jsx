import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProperty, uploadPropertyImages } from "../api/properties";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

export default function AddProperty() {
  const [step, setStep] = useState(1);
  const [images, setImages] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", property_type: "apartment", city: "", country: "India", location: "", price_per_night: 1000, max_guests: 1, bedrooms: 1, bathrooms: 1, amenities: [] });
  const navigate = useNavigate();
  const submit = async () => {
    const property = await createProperty(form);
    if (images.length) await uploadPropertyImages(property.id, images);
    navigate("/host/dashboard");
  };
  return <div className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow"><h1 className="text-2xl font-semibold">Add Property</h1><p className="mb-4 text-sm">Step {step} of 3</p>{step === 1 && <div className="space-y-2"><Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /><Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /><Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>}{step === 2 && <div className="space-y-2"><Input type="number" value={form.price_per_night} onChange={(e) => setForm({ ...form, price_per_night: Number(e.target.value) })} /><Input type="number" value={form.max_guests} onChange={(e) => setForm({ ...form, max_guests: Number(e.target.value) })} /></div>}{step === 3 && <input type="file" multiple accept="image/*" onChange={(e) => setImages(Array.from(e.target.files || []))} />}<div className="mt-4 flex justify-between">{step > 1 && <Button variant="secondary" onClick={() => setStep(step - 1)}>Back</Button>}{step < 3 ? <Button onClick={() => setStep(step + 1)}>Next</Button> : <Button onClick={submit}>Submit</Button>}</div></div>;
}
