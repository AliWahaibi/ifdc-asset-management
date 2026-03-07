import { apiClient } from '@/lib/api';
import type { Reservation, PaginatedResponse, AssetType, ReservationStatus } from '@/types';

export interface CreateReservationData {
    asset_type: AssetType;
    asset_id: string;
    start_date: string;
    end_date: string;
    notes: string;
}

export interface UpdateReservationStatusData {
    status: ReservationStatus;
}

export const reservationService = {
    getReservations: async (page = 1, limit = 10, status?: string): Promise<PaginatedResponse<Reservation>> => {
        const response = await apiClient.get<PaginatedResponse<Reservation>>('/reservations', {
            params: { page, limit, status }
        });
        return response.data;
    },

    getReservation: async (id: string): Promise<Reservation> => {
        const response = await apiClient.get<Reservation>(`/reservations/${id}`);
        return response.data;
    },

    createReservation: async (data: CreateReservationData): Promise<Reservation> => {
        const response = await apiClient.post<Reservation>('/reservations', data);
        return response.data;
    },

    updateReservationStatus: async (id: string, data: UpdateReservationStatusData): Promise<Reservation> => {
        const response = await apiClient.patch<Reservation>(`/reservations/${id}/status`, data);
        return response.data;
    },

    deleteReservation: async (id: string): Promise<void> => {
        await apiClient.delete(`/reservations/${id}`);
    },
};
