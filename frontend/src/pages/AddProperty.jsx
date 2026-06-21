import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProperty, generatePropertyDescription, uploadPropertyImages } from "../api/properties";
import { notifyError, notifySuccess } from "../components/ui/Toast";
import { FiHome, FiMapPin, FiGlobe, FiFileText, FiDollarSign, FiUsers, FiEdit3, FiArrowRight, FiArrowLeft, FiImage, FiList } from "react-icons/fi";

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
      const detail = error.response?.data?.detail || error.message || "Unknown error";
      notifyError(`AI description generation failed: ${detail}. You can still write a description manually.`);
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

  return (
    <div className="min-h-[85vh] px-4 py-8 max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden border-t-4 border-indigo-600 transition-all">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Add New Property</h2>
            <p className="text-slate-500 mt-2 text-sm font-medium">Step {step} of 3 - Provide property details.</p>
          </div>
          {step === 1 && (
            <button 
              type="button" 
              onClick={generateDescription} 
              disabled={isGenerating}
              className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold py-2.5 px-5 rounded-xl transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              <FiEdit3 size={18} />
              {isGenerating ? "Generating..." : "Generate with AI"}
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Property Title</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <FiHome size={18} />
                  </span>
                  <input 
                    placeholder="Enter a descriptive title for your property" 
                    value={form.title} 
                    onChange={(e) => setField("title", e.target.value)} 
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium transition"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">City</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <FiMapPin size={18} />
                    </span>
                    <input 
                      placeholder="e.g. Paris" 
                      value={form.city} 
                      onChange={(e) => setField("city", e.target.value)} 
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Country</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <FiGlobe size={18} />
                    </span>
                    <input 
                      placeholder="e.g. France" 
                      value={form.country} 
                      onChange={(e) => setField("country", e.target.value)} 
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium transition"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Location Details</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <FiMapPin size={18} />
                  </span>
                  <input 
                    placeholder="e.g. 14 Avenue Montaigne" 
                    value={form.location} 
                    onChange={(e) => setField("location", e.target.value)} 
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Property Type</label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium transition bg-white"
                  value={form.property_type}
                  onChange={(e) => setField("property_type", e.target.value)}
                >
                  <option value="apartment">Apartment</option>
                  <option value="house">House</option>
                  <option value="villa">Villa</option>
                  <option value="studio">Studio</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Property Description</label>
                <div className="relative">
                  <span className="absolute top-3 left-0 pl-3.5 flex items-start pointer-events-none text-slate-400">
                    <FiFileText size={18} />
                  </span>
                  <textarea
                    className="min-h-40 w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium transition placeholder-slate-400 resize-y"
                    placeholder="Describe your property details, views, space, etc."
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Price per Night (USD)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <FiDollarSign size={18} />
                  </span>
                  <input 
                    type="number" 
                    min={1} 
                    placeholder="e.g. 150" 
                    value={form.price_per_night} 
                    onChange={(e) => setField("price_per_night", Number(e.target.value))} 
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Max Guests</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <FiUsers size={18} />
                  </span>
                  <input 
                    type="number" 
                    min={1} 
                    placeholder="e.g. 4" 
                    value={form.max_guests} 
                    onChange={(e) => setField("max_guests", Number(e.target.value))} 
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Bedrooms</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <FiHome size={18} />
                  </span>
                  <input 
                    type="number" 
                    min={1} 
                    placeholder="e.g. 2" 
                    value={form.bedrooms} 
                    onChange={(e) => setField("bedrooms", Number(e.target.value))} 
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Bathrooms</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <FiHome size={18} />
                  </span>
                  <input 
                    type="number" 
                    min={1} 
                    placeholder="e.g. 1" 
                    value={form.bathrooms} 
                    onChange={(e) => setField("bathrooms", Number(e.target.value))} 
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium transition"
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Amenities</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <FiList size={18} />
                  </span>
                  <input 
                    placeholder="Wifi, Pool, Kitchen, Hot Tub, etc. (comma separated)" 
                    value={amenitiesText} 
                    onChange={(e) => setAmenitiesText(e.target.value)} 
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium transition"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Upload Property Images</label>
                <div className="mt-2 flex justify-center rounded-2xl border border-dashed border-slate-300 px-6 py-10 hover:border-indigo-500 transition-colors bg-slate-50/50">
                  <div className="text-center">
                    <FiImage className="mx-auto h-12 w-12 text-slate-300" aria-hidden="true" />
                    <div className="mt-4 flex text-sm leading-6 text-slate-600 justify-center">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer rounded-md bg-transparent font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
                      >
                        <span>Upload files</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept="image/*" onChange={(e) => setImages(Array.from(e.target.files || []))} />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs leading-5 text-slate-500 mt-2">PNG, JPG, GIF up to 10MB</p>
                  </div>
                </div>
                {images.length > 0 && (
                  <div className="mt-4 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                    <p className="text-sm font-semibold text-indigo-700">
                      {images.length} image(s) selected
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-8 border-t border-slate-50 bg-slate-50/30 flex justify-between items-center">
          {step > 1 ? (
            <button 
              type="button" 
              onClick={() => setStep(step - 1)}
              className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition flex items-center gap-2"
            >
              <FiArrowLeft size={18} />
              Back
            </button>
          ) : (
            <div />
          )}
          {step < 3 ? (
            <button 
              type="button" 
              onClick={() => setStep(step + 1)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-indigo-100 transition-all flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
            >
              Next Step
              <FiArrowRight size={18} />
            </button>
          ) : (
            <button 
              type="button" 
              onClick={submit}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-indigo-100 transition-all flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
            >
              Submit Property
              <FiArrowRight size={18} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
