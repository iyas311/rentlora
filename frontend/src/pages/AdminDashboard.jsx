import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiUsers, FiHome, FiCalendar, FiCheck, FiX, FiTrash2, FiActivity, FiShield, FiTrendingUp } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency } from '../utils/priceUtils';
import { TableSkeleton } from '../components/ui/Skeleton';

// API Functions
const fetchStats = async (token) => {
  const res = await fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
};

const fetchUsers = async (token) => {
  const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
};

const fetchProperties = async (token) => {
  const res = await fetch('/api/admin/properties/all', { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Failed to fetch properties');
  return res.json();
};

const updateUserRole = async ({ userId, role, token }) => {
  const res = await fetch(`/api/admin/users/${userId}/role`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ role })
  });
  if (!res.ok) throw new Error('Failed to update role');
  return res.json();
};

const deleteProperty = async ({ propertyId, token }) => {
  const res = await fetch(`/api/properties/${propertyId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to delete property');
  return res.json();
};

const StatCard = ({ title, value, icon: Icon, colorClass, subtitle }) => (
  <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition-all">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">{title}</p>
        <h3 className="text-3xl font-black text-slate-900 mt-1">{value}</h3>
      </div>
      <div className={`rounded-xl p-3.5 ${colorClass}`}>
        <Icon size={24} />
      </div>
    </div>
    <div className="mt-4 flex items-center text-xs font-semibold text-slate-500">
      {subtitle}
    </div>
  </div>
);

export default function AdminDashboard() {
  const token = localStorage.getItem("access_token");
  const [activeTab, setActiveTab] = useState('overview');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => fetchStats(token),
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => fetchUsers(token),
    enabled: activeTab === 'users'
  });

  const { data: propertiesData, isLoading: propsLoading } = useQuery({
    queryKey: ['adminProperties'],
    queryFn: () => fetchProperties(token),
    enabled: activeTab === 'properties'
  });

  const roleMutation = useMutation({
    mutationFn: updateUserRole,
    onSuccess: () => {
      toast.success('User role updated');
      queryClient.invalidateQueries(['adminUsers']);
    },
    onError: () => toast.error('Failed to update role')
  });

  const deletePropMutation = useMutation({
    mutationFn: deleteProperty,
    onSuccess: () => {
      toast.success('Property deleted');
      setDeleteConfirmId(null);
      queryClient.invalidateQueries(['adminProperties']);
    },
    onError: () => toast.error('Failed to delete property')
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Admin Control Panel</h1>
          <p className="text-slate-500 mt-2 font-medium">Platform overview, user roles, and moderation tools.</p>
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          {['overview', 'users', 'properties'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap capitalize ${
                activeTab === tab
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-300">
          <StatCard 
            title="Total Revenue" 
            value={statsLoading ? "..." : formatCurrency(stats?.total_platform_revenue)} 
            icon={FiTrendingUp} 
            colorClass="bg-emerald-50 text-emerald-600"
            subtitle="Platform gross volume"
          />
          <StatCard 
            title="Total Users" 
            value={statsLoading ? "..." : stats?.total_users || 0} 
            icon={FiUsers} 
            colorClass="bg-indigo-50 text-indigo-600"
            subtitle="Registered accounts"
          />
          <StatCard 
            title="Listed Properties" 
            value={statsLoading ? "..." : stats?.total_properties || 0} 
            icon={FiHome} 
            colorClass="bg-purple-50 text-purple-600"
            subtitle="Active on platform"
          />
          <StatCard 
            title="Total Bookings" 
            value={statsLoading ? "..." : stats?.total_bookings || 0} 
            icon={FiCalendar} 
            colorClass="bg-amber-50 text-amber-600"
            subtitle="All-time reservations"
          />
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden animate-in fade-in duration-300">
          <div className="border-b border-slate-100 px-6 py-5 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FiUsers className="text-indigo-600" /> User Directory
            </h2>
          </div>
          <div className="p-6">
            {usersLoading ? (
              <TableSkeleton rows={5} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                      <th className="pb-3">User</th>
                      <th className="pb-3">Role</th>
                      <th className="pb-3">Joined</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {users?.map((u) => (
                      <tr key={u.id} className="group hover:bg-slate-50/40 transition-colors">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <img className="h-10 w-10 rounded-full object-cover border border-slate-200" src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.name}&background=6366f1&color=fff`} alt={u.name} />
                            <div>
                              <div className="text-sm font-bold text-slate-900">{u.name}</div>
                              <div className="text-xs font-medium text-slate-400">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                            u.role === 'admin' ? 'border-rose-200 bg-rose-50 text-rose-700' :
                            u.role === 'host' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 
                            'border-slate-200 bg-slate-50 text-slate-700'
                          }`}>
                            {u.role === 'admin' && <FiShield size={10} />}
                            {u.role === 'host' && <FiHome size={10} />}
                            {u.role === 'guest' && <FiUsers size={10} />}
                            {u.role}
                          </span>
                        </td>
                        <td className="py-4 text-xs font-semibold text-slate-500">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-4 text-right">
                          <select
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-32 p-2 ml-auto outline-none cursor-pointer"
                            value={u.role}
                            onChange={(e) => roleMutation.mutate({ userId: u.id, role: e.target.value, token })}
                            disabled={roleMutation.isPending}
                          >
                            <option value="guest">Guest</option>
                            <option value="host">Host</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Properties Tab */}
      {activeTab === 'properties' && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden animate-in fade-in duration-300">
          <div className="border-b border-slate-100 px-6 py-5 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FiActivity className="text-indigo-600" /> Platform Properties
            </h2>
          </div>
          <div className="p-6">
            {propsLoading ? (
              <TableSkeleton rows={5} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                      <th className="pb-3">Property</th>
                      <th className="pb-3">Host</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {propertiesData?.items?.map((p) => (
                      <tr key={p.id} className="group hover:bg-slate-50/40 transition-colors">
                        <td className="py-4">
                          <div className="text-sm font-bold text-slate-900">{p.title}</div>
                          <div className="text-xs font-medium text-slate-500">{p.city} • {formatCurrency(p.price_per_night)}/night</div>
                        </td>
                        <td className="py-4">
                          <div className="text-sm font-bold text-slate-700">{p.host?.name}</div>
                          <div className="text-xs font-medium text-slate-400">{p.host?.email}</div>
                        </td>
                        <td className="py-4">
                          {p.is_available ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                              Hidden
                            </span>
                          )}
                        </td>
                        <td className="py-4 text-right">
                          {deleteConfirmId === p.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => deletePropMutation.mutate({ propertyId: p.id, token })}
                                disabled={deletePropMutation.isPending}
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
                              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-600 font-bold border border-transparent hover:border-rose-100 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition"
                            >
                              <FiTrash2 /> Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
