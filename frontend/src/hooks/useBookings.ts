import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { echo } from '../utils/echo';


export interface BookingItem {
  id: number;
  booking_number: string;
  doctor_id: number;
  patient_id?: number | null;
  patient_name: string;
  patient_phone: string;
  patient_type: 'New' | 'Follow-up' | 'Report Showing';
  booking_date: string;
  preferred_slot?: string | null;
  remarks?: string | null;
  status: 'Pending' | 'Confirmed' | 'CheckedIn' | 'Completed' | 'Cancelled' | 'Expired' | 'NoShow';
  serial_no?: number | null;
  queue_item_id?: number | null;
  converted_at?: string | null;
  confirmed_at?: string | null;
  checked_in_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  doctor?: { id: number; name: string };
}

export interface BookingStats {
  date: string;
  max_capacity: number;
  total_active: number;
  available_slots: number;
  converted_count: number;
  by_status: {
    Pending: number;
    Confirmed: number;
    CheckedIn: number;
    Completed: number;
    Cancelled: number;
    NoShow: number;
  };
}

export function useBookings(selectedDate?: string, selectedDoctorId?: number | null) {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const targetDate = selectedDate || new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = { date: targetDate };
      if (selectedDoctorId) params.doctor_id = selectedDoctorId;

      const [resBookings, resStats] = await Promise.all([
        api.get('/bookings', { params }),
        api.get('/bookings/stats', { params: { date: targetDate } }),
      ]);

      setBookings(resBookings.data.data || []);
      setStats(resStats.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch bookings.');
    } finally {
      setLoading(false);
    }
  }, [targetDate, selectedDoctorId]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Realtime Echo channel subscriptions
  useEffect(() => {
    const channel = echo.channel('bookings');

    const handleUpdate = () => fetchBookings();

    channel
      .listen('.BookingCreated', handleUpdate)
      .listen('.BookingConfirmed', handleUpdate)
      .listen('.BookingCancelled', handleUpdate)
      .listen('.BookingCheckedIn', handleUpdate)
      .listen('.BookingNoShow', handleUpdate)
      .listen('.BookingsConverted', handleUpdate);

    return () => {
      echo.leave('bookings');
    };
  }, [fetchBookings]);

  const createBooking = async (payload: any) => {
    const res = await api.post('/bookings', payload);
    await fetchBookings();
    return res.data.booking;
  };

  const confirmBooking = async (id: number) => {
    const res = await api.post(`/bookings/${id}/confirm`);
    await fetchBookings();
    return res.data.booking;
  };

  const cancelBooking = async (id: number, reason?: string) => {
    const res = await api.post(`/bookings/${id}/cancel`, { reason });
    await fetchBookings();
    return res.data.booking;
  };

  const checkInBooking = async (id: number) => {
    const res = await api.post(`/bookings/${id}/check-in`);
    await fetchBookings();
    return res.data.booking;
  };

  const noShowBooking = async (id: number) => {
    const res = await api.post(`/bookings/${id}/no-show`);
    await fetchBookings();
    return res.data.booking;
  };

  const deleteBooking = async (id: number) => {
    try {
      const res = await api.delete(`/bookings/${id}`);
      await fetchBookings();
      return res.data;
    } catch (err: any) {
      if (err.response?.status === 405) {
        const res = await api.post(`/bookings/${id}/delete`);
        await fetchBookings();
        return res.data;
      }
      throw err;
    }
  };

  return {
    bookings,
    stats,
    loading,
    error,
    refresh: fetchBookings,
    createBooking,
    confirmBooking,
    cancelBooking,
    checkInBooking,
    noShowBooking,
    deleteBooking,
  };
}
