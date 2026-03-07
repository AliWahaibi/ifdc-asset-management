import { apiClient } from '@/lib/api';

export interface TopUser {
    user_id: string;
    full_name: string;
    total_reservations: number;
}

export interface PopularAsset {
    asset_id: string;
    asset_type: string;
    name: string;
    total_reservations: number;
}

export interface StatusBreakdown {
    status: string;
    count: number;
}

export interface StatisticsResponse {
    top_users: TopUser[];
    most_reserved_assets: PopularAsset[];
    status_breakdown: StatusBreakdown[];
    total_flight_hours: number;
}

export const statisticsService = {
    getStatistics: async (): Promise<StatisticsResponse> => {
        const response = await apiClient.get<StatisticsResponse>('/statistics');
        return response.data;
    },
};
