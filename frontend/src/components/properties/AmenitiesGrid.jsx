import { FiWifi, FiCoffee, FiMonitor, FiWind, FiCheckCircle, FiThermometer, FiSun, FiHome, FiImage, FiFlame, FiGrid } from "react-icons/fi";

const getAmenityIcon = (name) => {
  const lower = name.toLowerCase();
  if (lower.includes("wifi")) return <FiWifi />;
  if (lower.includes("kitchen") || lower.includes("coffee")) return <FiCoffee />;
  if (lower.includes("tv") || lower.includes("monitor")) return <FiMonitor />;
  if (lower.includes("air") || lower.includes("ac") || lower.includes("wind")) return <FiWind />;
  if (lower.includes("heat")) return <FiThermometer />;
  if (lower.includes("pool") || lower.includes("sun")) return <FiSun />;
  if (lower.includes("window") || lower.includes("view")) return <FiImage />;
  if (lower.includes("fire")) return <FiFlame />;
  if (lower.includes("design") || lower.includes("minimalist")) return <FiGrid />;
  return <FiCheckCircle />;
};

export default function AmenitiesGrid({ amenities = [] }) {
  if (!amenities.length) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {amenities.map((a) => (
        <div 
          key={a} 
          className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md hover:border-slate-200 transition-all"
        >
          <div className="flex-shrink-0 text-indigo-600">
            {getAmenityIcon(a)}
          </div>
          <span className="text-sm font-semibold text-slate-700">{a}</span>
        </div>
      ))}
    </div>
  );
}
