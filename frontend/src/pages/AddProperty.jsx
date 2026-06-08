import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProperty, generatePropertyDescription, uploadPropertyImages } from "../api/properties";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { notifyError, notifySuccess } from "../components/ui/Toast";

export default function AddProperty() {
  const [step, setStep] = useState(1);
  const [images, setImages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [amenitiesText, setAmenitiesText] = useState("");
  const [form, setForm] = useState({ title: "", description: "", property_type: "apartment", city: "", country: "India", location: "", price_per_night: 1000, max_guests: 1, bedrooms: 1, bathrooms: 1, amenities: [] });
  const navigate = useNavigate();

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const generateDescription = async () => {
    if (!form.title.trim() || !form.city.trim()) {
      notifyError("Title and city are required before generating a description");
      return;
    }
    setIsGenerating(true);
    try {
      const payload = {
        ...form,
        amenities: amenitiesText.split(",").map((item) => item.trim()).filter(Boolean),
      };
      const result = await generatePropertyDescription(payload);
      setField("description", result.description);
      notifySuccess("AI description generated");
    } catch (error) {
      notifyError(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const submit = async () => {
    try {
      const payload = {
        ...form,
        amenities: amenitiesText.split(",").map((item) => item.trim()).filter(Boolean),
      };
      const property = await createProperty(payload);
      if (images.length) await uploadPropertyImages(property.id, images);
      notifySuccess("Property created");
      navigate("/host/dashboard");
    } catch (error) {
      notifyError(error);
    }
  };
  return <div className="mx-auto max-w-3xl rounded-lg bg-white p-6 shadow"><div className="mb-6 flex items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">Add Property</h1><p className="text-sm text-muted">Step {step} of 3</p></div>{step === 1 && <Button type="button" variant="secondary" onClick={generateDescription} disabled={isGenerating}>{isGenerating ? "Generating..." : "Generate with AI"}</Button>}</div>{step === 1 && <div className="space-y-3"><Input placeholder="Title" value={form.title} onChange={(e) => setField("title", e.target.value)} /><div className="grid grid-cols-1 gap-3 md:grid-cols-2"><Input placeholder="City" value={form.city} onChange={(e) => setField("city", e.target.value)} /><Input placeholder="Country" value={form.country} onChange={(e) => setField("country", e.target.value)} /></div><Input placeholder="Location details" value={form.location} onChange={(e) => setField("location", e.target.value)} /><select className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-accent" value={form.property_type} onChange={(e) => setField("property_type", e.target.value)}><option value="apartment">Apartment</option><option value="house">House</option><option value="villa">Villa</option><option value="studio">Studio</option></select><textarea className="min-h-40 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-accent" placeholder="Property description" value={form.description} onChange={(e) => setField("description", e.target.value)} /></div>}{step === 2 && <div className="grid grid-cols-1 gap-3 md:grid-cols-2"><Input type="number" min={1} placeholder="Price per night" value={form.price_per_night} onChange={(e) => setField("price_per_night", Number(e.target.value))} /><Input type="number" min={1} placeholder="Max guests" value={form.max_guests} onChange={(e) => setField("max_guests", Number(e.target.value))} /><Input type="number" min={1} placeholder="Bedrooms" value={form.bedrooms} onChange={(e) => setField("bedrooms", Number(e.target.value))} /><Input type="number" min={1} placeholder="Bathrooms" value={form.bathrooms} onChange={(e) => setField("bathrooms", Number(e.target.value))} /><div className="md:col-span-2"><Input placeholder="Amenities, comma separated" value={amenitiesText} onChange={(e) => setAmenitiesText(e.target.value)} /></div></div>}{step === 3 && <div className="space-y-3"><input type="file" multiple accept="image/*" onChange={(e) => setImages(Array.from(e.target.files || []))} /><p className="text-sm text-muted">{images.length ? `${images.length} image(s) selected` : "Upload up to 5 images"}</p></div>}<div className="mt-6 flex justify-between">{step > 1 ? <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>Back</Button> : <span />}{step < 3 ? <Button type="button" onClick={() => setStep(step + 1)}>Next</Button> : <Button type="button" onClick={submit}>Submit</Button>}</div></div>;
}
