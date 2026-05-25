import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getHostBookings } from "../api/bookings";
import { getProperties, removeProperty } from "../api/properties";
import Button from "../components/ui/Button";

export default function HostDashboard() {
  const qc = useQueryClient();
  const { data: properties } = useQuery({ queryKey: ["host-properties"], queryFn: () => getProperties({ page: 1, limit: 200 }) });
  const { data: bookings } = useQuery({ queryKey: ["host-bookings"], queryFn: getHostBookings });
  const removeMutation = useMutation({ mutationFn: removeProperty, onSuccess: () => qc.invalidateQueries({ queryKey: ["host-properties"] }) });
  return <div className="space-y-6"><div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Host Dashboard</h1><Link to="/host/add-property"><Button>Add New Property</Button></Link></div><div className="rounded-lg bg-white p-4 shadow"><h2 className="mb-2 font-semibold">My Properties</h2><div className="space-y-2">{properties?.items?.map((p) => <div key={p.id} className="flex items-center justify-between border-b py-2"><div>{p.title} - {p.city}</div><Button variant="secondary" onClick={() => removeMutation.mutate(p.id)}>Remove</Button></div>)}</div></div><div className="rounded-lg bg-white p-4 shadow"><h2 className="mb-2 font-semibold">Bookings on my Properties</h2><div className="space-y-2">{bookings?.map((b) => <div key={b.id} className="border-b py-2">{b.property.title} | {b.guest.name} ({b.guest.email}) | {b.status}</div>)}</div></div></div>;
}
