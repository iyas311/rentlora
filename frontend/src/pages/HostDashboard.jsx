import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getHostBookings } from "../api/bookings";
import { getProperties, removeProperty } from "../api/properties";
import Button from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";

export default function HostDashboard() {
  const qc = useQueryClient();
  const { user } = useAuth();
  
  const { data: properties } = useQuery({
    queryKey: ["host-properties", user?.id],
    queryFn: () => getProperties({ host_id: user?.id, page: 1, limit: 200 }),
    enabled: !!user?.id
  });
  
  const { data: bookings } = useQuery({ queryKey: ["host-bookings"], queryFn: getHostBookings });
  const removeMutation = useMutation({ mutationFn: removeProperty, onSuccess: () => qc.invalidateQueries({ queryKey: ["host-properties"] }) });
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Host Dashboard</h1>
        <Link to="/host/add-property">
          <Button>Add New Property</Button>
        </Link>
      </div>
      
      <div className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-2 font-semibold">My Properties</h2>
        <div className="space-y-2">
          {properties?.items?.map((p) => (
            <div key={p.id} className="flex items-center justify-between border-b py-2">
              <div>{p.title} - {p.city}</div>
              <Button variant="secondary" onClick={() => removeMutation.mutate(p.id)}>
                Remove
              </Button>
            </div>
          ))}
          {(!properties?.items || properties.items.length === 0) && (
            <div className="text-gray-500 text-sm py-2">You haven't listed any properties yet.</div>
          )}
        </div>
      </div>
      
      <div className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-2 font-semibold">Bookings on my Properties</h2>
        <div className="space-y-2">
          {bookings?.map((b) => (
            <div key={b.id} className="border-b py-2">
              {b.property.title} | {b.guest.name} ({b.guest.email}) | {b.status}
            </div>
          ))}
          {(!bookings || bookings.length === 0) && (
            <div className="text-gray-500 text-sm py-2">No bookings on your properties yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
