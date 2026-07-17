import { create } from 'zustand';
import api from '../utils/api';
import { echo } from '../utils/echo';

export interface Patient {
  id: number;
  name: string;
  phone: string;
}

export interface QueueItem {
  id: number;
  serial_no: number;
  appointment_type: string;
  status: 'Waiting' | 'Called' | 'Completed' | 'Skipped';
  priority: 'Normal' | 'Emergency';
  estimated_wait: number;
  called_at: string | null;
  patient: Patient;
}

export interface QueueDay {
  id: number;
  status: 'opened' | 'paused';
  date: string;
  opened_at: string;
}

interface QueueState {
  queueDay: QueueDay | null;
  items: QueueItem[];
  loading: boolean;
  activeDoctorId: number | null;
  setActiveDoctor: (id: number | null) => void;
  fetchTodayQueue: (doctorId: number) => Promise<void>;
  openQueue: (doctorId: number) => Promise<void>;
  resetQueue: () => void;
  registerWalkIn: (patientId: number, serialNo?: number) => Promise<void>;
  deleteItem: (itemId: number) => Promise<void>;
  callNext: () => Promise<void>;
  completeItem: (itemId: number) => Promise<void>;
  skipItem: (itemId: number) => Promise<void>;
  reinsertItem: (itemId: number, position: number) => Promise<void>;
  insertEmergency: (patientId: number) => Promise<void>;
  toggleQueuePause: () => Promise<void>;
  subscribeToQueue: (queueDayId: number) => void;
  unsubscribeFromQueue: (queueDayId: number) => void;
  subscribeToDoctor: (doctorId: number) => void;
  unsubscribeFromDoctor: (doctorId: number) => void;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  queueDay: null,
  items: [],
  loading: false,
  activeDoctorId: null,

  // Internal tracking (not part of state)
  setActiveDoctor: (id) => set({ activeDoctorId: id }),

  fetchTodayQueue: async (doctorId) => {
    const prevDoctorId = get().activeDoctorId;
    const prevQueueDay = get().queueDay;
    if (prevDoctorId && prevDoctorId !== doctorId) {
      get().unsubscribeFromDoctor(prevDoctorId);
    }
    if (prevQueueDay) {
      get().unsubscribeFromQueue(prevQueueDay.id);
    }

    set({ loading: true, activeDoctorId: doctorId });
    try {
      const response = await api.get(`/queue/today?doctor_id=${doctorId}`);
      const { queue_day, items } = response.data;
      set({
        queueDay: queue_day,
        items: (items && items.data) ? items.data : (items || []),
        loading: false,
      });

      // Subscribe to doctor channel (guarded against duplicates inside)
      get().subscribeToDoctor(doctorId);

      if (queue_day) {
        get().subscribeToQueue(queue_day.id);
      }
    } catch (error) {
      set({ loading: false });
    }
  },

  openQueue: async (doctorId) => {
    set({ loading: true });
    try {
      await api.post('/queue/open', { doctor_id: doctorId });
      await get().fetchTodayQueue(doctorId);
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  resetQueue: () => {
    const { activeDoctorId, queueDay } = get();
    if (activeDoctorId) {
      get().unsubscribeFromDoctor(activeDoctorId);
    }
    if (queueDay) {
      get().unsubscribeFromQueue(queueDay.id);
    }
    set({ queueDay: null, items: [], loading: false, activeDoctorId: null });
  },

  registerWalkIn: async (patientId, serialNo) => {
    const { queueDay } = get();
    if (!queueDay) return;
    const body: Record<string, unknown> = { queue_day_id: queueDay.id, patient_id: patientId };
    if (serialNo !== undefined) body.serial_no = serialNo;
    await api.post('/queue/create', body);
  },

  deleteItem: async (itemId) => {
    await api.delete(`/queue/${itemId}`);
    // Optimistically remove from local state
    set((state) => ({ items: state.items.filter((i) => i.id !== itemId) }));
  },

  callNext: async () => {
    const { queueDay } = get();
    if (!queueDay) return;
    await api.post('/queue/call-next', { queue_day_id: queueDay.id });
  },

  completeItem: async (itemId) => {
    await api.post('/queue/complete', { queue_item_id: itemId });
  },

  skipItem: async (itemId) => {
    await api.post('/queue/skip', { queue_item_id: itemId });
  },

  reinsertItem: async (itemId, position) => {
    await api.post('/queue/reinsert', { queue_item_id: itemId, position });
    // Re-fetch to guarantee local state matches server after serial renumbering
    const { activeDoctorId, fetchTodayQueue } = get();
    if (activeDoctorId) await fetchTodayQueue(activeDoctorId);
  },


  insertEmergency: async (patientId) => {
    const { queueDay } = get();
    if (!queueDay) return;
    await api.post('/queue/emergency', { queue_day_id: queueDay.id, patient_id: patientId });
  },

  toggleQueuePause: async () => {
    const { queueDay } = get();
    if (!queueDay) return;
    const endpoint = queueDay.status === 'opened' ? '/queue/freeze' : '/queue/resume';
    const response = await api.post(endpoint, { queue_day_id: queueDay.id });
    set({
      queueDay: {
        ...queueDay,
        status: response.data.status,
      },
    });
  },

  subscribeToQueue: (queueDayId) => {
    const channelName = `queue.${queueDayId}`;
    // Leave existing to avoid duplicate listeners
    echo.leave(channelName);
    echo.channel(channelName)
      .listen('QueueCreated', (e: { queue_item: QueueItem }) => {
        set((state) => ({ items: [...state.items, e.queue_item] }));
      })
      .listen('QueueUpdated', (e: { queue_item: QueueItem }) => {
        set((state) => ({
          items: state.items.map((item) => (item.id === e.queue_item.id ? { ...item, ...e.queue_item } : item)),
        }));
      })
      .listen('QueueCompleted', (e: { queue_item_id: number }) => {
        set((state) => ({
          items: state.items.map((item) => (item.id === e.queue_item_id ? { ...item, status: 'Completed' } : item)),
        }));
      })
      .listen('QueueFrozen', () => {
        set((state) => state.queueDay ? { queueDay: { ...state.queueDay, status: 'paused' } } : {});
      })
      .listen('QueueResumed', () => {
        set((state) => state.queueDay ? { queueDay: { ...state.queueDay, status: 'opened' } } : {});
      })
      .listen('EmergencyInserted', (e: { queue_item: QueueItem }) => {
        set((state) => ({
          items: [
            e.queue_item,
            ...state.items.map((item) => (item.status === 'Waiting' ? { ...item, serial_no: item.serial_no + 1 } : item)),
          ],
        }));
      })
      .listen('EstimatedTimeUpdated', (e: { wait_times: Record<number, number> }) => {
        set((state) => ({
          items: state.items.map((item) =>
            e.wait_times[item.id] !== undefined ? { ...item, estimated_wait: e.wait_times[item.id] } : item
          ),
        }));
      })
      .listen('QueueDeleted', (e: { queue_item_id: number }) => {
        set((state) => ({ items: state.items.filter((item) => item.id !== e.queue_item_id) }));
      });
  },

  unsubscribeFromQueue: (queueDayId) => {
    echo.leave(`queue.${queueDayId}`);
  },

  subscribeToDoctor: (doctorId) => {
    const channelName = `doctor-queue.${doctorId}`;
    // Leave first to prevent stacking listeners on re-subscriptions
    echo.leave(channelName);
    echo.channel(channelName)
      .listen('QueueOpened', (e: { queue_day: QueueDay }) => {
        set({ queueDay: e.queue_day });
        // Subscribe to the new queue day channel
        get().subscribeToQueue(e.queue_day.id);
      });
  },

  unsubscribeFromDoctor: (doctorId) => {
    echo.leave(`doctor-queue.${doctorId}`);
  },
}));
