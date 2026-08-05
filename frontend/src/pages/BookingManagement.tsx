import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  UserCheck,
  UserX,
  Clock,
  Phone,
  User,
  RefreshCw,
  Tag,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { useBookings, type BookingItem } from '../hooks/useBookings';

import { BookingFormModal } from '../components/BookingFormModal';

export const BookingManagement: React.FC = () => {
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(tomorrowStr);
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    bookings,
    stats,
    loading,
    error,
    refresh,
    createBooking,
    confirmBooking,
    cancelBooking,
    checkInBooking,
    noShowBooking,
    deleteBooking,
  } = useBookings(selectedDate);

  const filteredBookings = bookings.filter((b) => {
    const matchesStatus = selectedStatus === 'All' || b.status === selectedStatus;
    const matchesSearch =
      !searchQuery ||
      (b.patient_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.patient_phone || '').includes(searchQuery) ||
      (b.booking_number || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: BookingItem['status']) => {
    switch (status) {
      case 'Confirmed':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'Pending':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'CheckedIn':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      case 'Completed':
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
      case 'Cancelled':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'NoShow':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
    }
  };

  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-surface-card p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-premium">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white">Next-Day Bookings</h1>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Managing serial reservations for {selectedDate}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => refresh()}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> New Booking
          </button>
        </div>
      </div>

      {/* Capacity & Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-white dark:bg-surface-card p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Capacity</p>
            <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
              {stats.total_active} / {stats.max_capacity}
            </p>
            <p className="text-[10px] text-slate-400">{stats.available_slots} slots left</p>
          </div>
          <div className="bg-white dark:bg-surface-card p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Pending</p>
            <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-1">
              {stats.by_status.Pending}
            </p>
          </div>
          <div className="bg-white dark:bg-surface-card p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Confirmed</p>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.by_status.Confirmed}
            </p>
          </div>
          <div className="bg-white dark:bg-surface-card p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Checked In</p>
            <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {stats.by_status.CheckedIn}
            </p>
          </div>
          <div className="bg-white dark:bg-surface-card p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Cancelled</p>
            <p className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">
              {stats.by_status.Cancelled}
            </p>
          </div>
          <div className="bg-white dark:bg-surface-card p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Converted</p>
            <p className="text-lg font-black text-slate-800 dark:text-slate-200 mt-1">
              {stats.converted_count}
            </p>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {['All', 'Pending', 'Confirmed', 'CheckedIn', 'Cancelled', 'NoShow'].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedStatus === status
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-white dark:bg-surface-card text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone or BK..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-surface-card border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 shadow-sm"
          />
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Bookings Grid / Table */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Bookings Found</h3>
          <p className="text-xs text-slate-400 mt-1">There are no bookings matching your criteria for {selectedDate}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookings.map((b) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-surface-card border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-5 shadow-premium flex flex-col justify-between space-y-4"
            >
              <div>
                {/* Card Top: Number & Status Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    {b.booking_number}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                      b.status
                    )}`}
                  >
                    {b.status}
                  </span>
                </div>

                {/* Patient Info */}
                <div className="mt-3 space-y-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <User className="w-4 h-4 text-indigo-500 shrink-0" />
                    {b.patient_name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {b.patient_phone}
                  </p>
                </div>

                {/* Badges: Type & Slot */}
                <div className="flex flex-wrap items-center gap-2 mt-3 text-[10px]">
                  <span className="px-2 py-0.5 rounded-md font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    <Tag className="w-3 h-3 inline mr-1" />
                    {b.patient_type}
                  </span>
                  {b.preferred_slot && (
                    <span className="px-2 py-0.5 rounded-md font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {b.preferred_slot}
                    </span>
                  )}
                </div>

                {b.remarks && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-2.5 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                    "{b.remarks}"
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                {b.status === 'Pending' && (
                  <button
                    onClick={() => confirmBooking(b.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer transition-all shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
                  </button>
                )}

                {b.status === 'Confirmed' && (
                  <button
                    onClick={() => checkInBooking(b.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold cursor-pointer transition-all shadow-sm"
                  >
                    <UserCheck className="w-3.5 h-3.5" /> Check In
                  </button>
                )}

                {(b.status === 'Pending' || b.status === 'Confirmed') && (
                  <>
                    <button
                      onClick={() => noShowBooking(b.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                      title="Mark as No Show"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => cancelBooking(b.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                      title="Cancel Booking"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </>
                )}

                <button
                  onClick={() => {
                    setConfirmModal({
                      message: `Are you sure you want to delete booking ${b.booking_number}?`,
                      onConfirm: () => deleteBooking(b.id),
                    });
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
                  title="Delete Booking"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-surface-card border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2.5 rounded-full bg-rose-50 dark:bg-rose-950/30">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirm Action</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{confirmModal.message}</p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Form Modal */}
      <BookingFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (data) => {
          await createBooking(data);
        }}
        doctorId={1}
        tomorrowDate={selectedDate}
      />
    </div>
  );
};
