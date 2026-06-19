import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getHostBookings, cancelBooking, completeBooking } from "../api/bookings";
import { getProperties, removeProperty } from "../api/properties";
import Button from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import { formatCurrency } from "../utils/priceUtils";
import { FiHome, FiCalendar, FiDollarSign, FiPlus, FiTrash2, FiMapPin, FiUser, FiActivity, FiArrowRight } from "react-icons/fi";
import { useState } from "react";

export default function HostDashboard() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  
  const { data: properties, isLoading: isPropertiesLoading } = useQuery({
    queryKey: ["host-properties", user?.id],
    queryFn: () => getProperties({ host_id: user?.id, page: 1, limit: 200 }),
    enabled: !!user?.id
  });
  
  const { data: bookings, isLoading: isBookingsLoading } = useQuery({ 
    queryKey: ["host-bookings"], 
    queryFn: getHostBookings 
  });
  
  const removeMutation = useMutation({ 
    mutationFn: removeProperty, 
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["host-properties"] });
      setDeleteConfirmId(null);
    } 
  });

  const cancelMutation = useMutation({
    mutationFn: cancelBooking,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["host-bookings"] });
    }
  });

  const completeMutation = useMutation({
    mutationFn: completeBooking,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["host-bookings"] });
    }
  });

  // Calculate stats
  const activeListingsCount = properties?.items?.length || 0;
  const totalBookingsCount = bookings?.length || 0;
  const estimatedRevenue = bookings?.reduce((sum, b) => {
    if (b.status === "confirmed") {
      return sum + Number(b.total_price || 0);
    }
    return sum;
  }, 0) || 0;

  const getStatusBadge = (status) => {
    const s = status?.toLowerCase();
    if (s === "confirmed") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          Confirmed
        </span>
      );
    } else if (s === "pending") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
          Pending
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
          Cancelled
        </span>
      );
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Host Control Panel</h1>
          <p className="text-slate-500 mt-1">Manage your premium property portfolio and guest reservations.</p>
        </div>
        <Link to="/host/add-property">
          <button className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 shadow-lg shadow-indigo-100 transition-all hover:-translate-y-0.5 active:translate-y-0">
            <FiPlus size={20} />
            Add New Property
          </button>
        </Link>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Listings Card */}
        <div className="relative overflow-hidden rounded-2xl border border-indigo-50 bg-white p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Active Properties</p>
              <h3 className="text-3xl font-black text-slate-900 mt-2">
                {isPropertiesLoading ? "..." : activeListingsCount}
              </h3>
            </div>
            <div className="rounded-xl bg-indigo-50 p-3.5 text-indigo-600">
              <FiHome size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-indigo-600 font-medium">
            <FiActivity className="mr-1.5" />
            <span>Operational portfolio</span>
          </div>
        </div>

        {/* Total Reservations Card */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-50 bg-white p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Total Reservations</p>
              <h3 className="text-3xl font-black text-slate-900 mt-2">
                {isBookingsLoading ? "..." : totalBookingsCount}
              </h3>
            </div>
            <div className="rounded-xl bg-amber-50 p-3.5 text-amber-600">
              <FiCalendar size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-amber-600 font-medium">
            <FiArrowRight className="mr-1.5" />
            <span>All-time booked stays</span>
          </div>
        </div>

        {/* Estimated Gross Revenue Card */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-50 bg-white p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Gross Earnings</p>
              <h3 className="text-3xl font-black text-slate-900 mt-2">
                {isBookingsLoading ? "..." : formatCurrency(estimatedRevenue)}
              </h3>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3.5 text-emerald-600">
              <FiDollarSign size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-emerald-600 font-medium">
            <span>From confirmed reservations</span>
          </div>
        </div>
      </div>

      {/* Two Columns / Single wide lists */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
        
        {/* Properties Management Section */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-5 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FiHome className="text-indigo-600" />
              Manage Properties
            </h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {activeListingsCount} Listed
            </span>
          </div>

          <div className="p-6">
            {isPropertiesLoading ? (
              <div className="text-center py-8 text-slate-400">Loading portfolio properties...</div>
            ) : properties?.items && properties.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                      <th className="pb-3 font-semibold">Property Description</th>
                      <th className="pb-3 font-semibold">Location</th>
                      <th className="pb-3 font-semibold text-right">Nightly Rate</th>
                      <th className="pb-3 font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {properties.items.map((p) => (
                      <tr key={p.id} className="group hover:bg-slate-50/40 transition-colors">
                        <td className="py-4">
                          <Link to={`/property/${p.id}`} className="font-bold text-slate-800 hover:text-indigo-600 transition-colors block">
                            {p.title}
                          </Link>
                          <span className="text-xs text-slate-400 block mt-0.5">ID: #{p.id} • Max Guests: {p.max_guests}</span>
                        </td>
                        <td className="py-4 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <FiMapPin className="text-slate-400" />
                            {p.city}, {p.country}
                          </span>
                        </td>
                        <td className="py-4 text-right font-black text-slate-900 text-sm">
                          {formatCurrency(p.price_per_night)}
                        </td>
                        <td className="py-4 text-center">
                          {deleteConfirmId === p.id ? (
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => removeMutation.mutate(p.id)}
                                disabled={removeMutation.isPending}
                                className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 shadow-sm transition"
                              >
                                Confirm
                              </button>
                              <button 
                                onClick={() => setDeleteConfirmId(null)}
                                className="rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-bold px-3 py-1.5 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setDeleteConfirmId(p.id)}
                              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600 font-semibold border border-transparent hover:border-rose-100 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition"
                            >
                              <FiTrash2 />
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <FiHome size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">You haven't listed any properties yet.</p>
                <Link to="/host/add-property" className="mt-3 inline-block text-sm font-bold text-indigo-600 hover:text-indigo-700">
                  Create your first listing &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Reservations / Bookings Section */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-5 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FiCalendar className="text-amber-600" />
              Guest Reservations
            </h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {totalBookingsCount} Total
            </span>
          </div>

          <div className="p-6">
            {isBookingsLoading ? (
              <div className="text-center py-8 text-slate-400">Loading reservations...</div>
            ) : bookings && bookings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                      <th className="pb-3 font-semibold">Property</th>
                      <th className="pb-3 font-semibold">Guest Contact</th>
                      <th className="pb-3 font-semibold">Booking Dates</th>
                      <th className="pb-3 font-semibold text-right">Total Payout</th>
                      <th className="pb-3 font-semibold text-center">Status</th>
                      <th className="pb-3 font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {bookings.map((b) => (
                      <tr key={b.id} className="group hover:bg-slate-50/40 transition-colors">
                        <td className="py-4">
                          <span className="font-bold text-slate-800 block">{b.property.title}</span>
                          <span className="text-xs text-slate-400 block mt-0.5">{b.property.city}</span>
                        </td>
                        <td className="py-4 text-sm text-slate-600">
                          <span className="flex items-center gap-1 font-semibold text-slate-700">
                            <FiUser className="text-slate-400" />
                            {b.guest.name}
                          </span>
                          <span className="text-xs text-slate-400 block mt-0.5">{b.guest.email}</span>
                        </td>
                        <td className="py-4 text-sm text-slate-600">
                          <span className="block font-medium text-slate-700">{b.check_in}</span>
                          <span className="text-xs text-slate-400">to {b.check_out} ({b.guests_count} Guests)</span>
                        </td>
                        <td className="py-4 text-right font-black text-slate-900 text-sm">
                          {formatCurrency(b.total_price)}
                        </td>
                        <td className="py-4 text-center">
                          {getStatusBadge(b.status)}
                        </td>
                        <td className="py-4 text-center">
                          {b.status === "confirmed" && (
                            <div className="flex flex-col items-center gap-2">
                              <button
                                onClick={() => {
                                  if (window.confirm("Mark this stay as completed (checked-out)?")) {
                                    completeMutation.mutate(b.id);
                                  }
                                }}
                                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 hover:border-emerald-200 px-2.5 py-1.5 rounded-lg w-full transition"
                              >
                                Complete Stay
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm("Are you sure you want to cancel this booking?")) {
                                    cancelMutation.mutate(b.id);
                                  }
                                }}
                                className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-100 hover:border-rose-200 px-2.5 py-1.5 rounded-lg w-full transition"
                              >
                                Cancel Stay
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <FiCalendar size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No reservations have been placed yet.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
