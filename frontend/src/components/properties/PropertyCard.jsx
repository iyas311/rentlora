import { Link } from "react-router-dom";
import { formatCurrency } from "../../utils/priceUtils";

export default function PropertyCard({ property }) {
  return <Link to={`/property/${property.id}`} className="overflow-hidden rounded-xl bg-white shadow-md transition duration-200 hover:scale-[1.02] hover:shadow-xl"><img src={property.first_image || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800"} className="h-48 w-full object-cover" /><div className="p-4"><h3 className="font-semibold">{property.title}</h3><p className="text-sm text-muted">{property.city}, {property.country}</p><p className="mt-2 font-semibold text-primary">{formatCurrency(property.price_per_night)}/night</p></div></Link>;
}
