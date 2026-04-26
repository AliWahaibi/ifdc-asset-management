import { apiClient as api } from '@/lib/api';
import type { LeaveRequest, LeaveBalance } from '@/types';

export const leaveService = {
    getLeaves: async () => {
        const response = await api.get<LeaveRequest[]>('/leaves');
        return response.data;
    },

    getAllLeaves: async (filters?: { user_id?: string; department?: string; start_date?: string; end_date?: string }) => {
        const response = await api.get<LeaveRequest[]>('/leaves/all', { params: filters });
        return response.data;
    },

    createLeave: async (data: { start_date: string, end_date: string, reason: string }) => {
        const response = await api.post<LeaveRequest>('/leaves', data);
        return response.data;
    },

    updateLeaveStatus: async (id: string, status: string, comment?: string) => {
        const response = await api.patch<LeaveRequest>(`/leaves/${id}/status`, { status, comment });
        return response.data;
    },

    getBalance: async (userId?: string) => {
        const response = await api.get<LeaveBalance>('/leaves/balance', {
            params: userId ? { user_id: userId } : {}
        });
        return response.data;
    }
};
