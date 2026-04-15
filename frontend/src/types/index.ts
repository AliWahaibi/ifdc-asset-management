// ===== Enums =====

export type UserRole = 'super_admin' | 'manager' | 'team_leader' | 'employee';

export type AssetStatus = 'available' | 'in_use' | 'maintenance' | 'retired' | 'reserved';

export type MaintenanceStatus = 'pending' | 'in_progress' | 'completed';

export type ReservationStatus = 'pending' | 'approved' | 'rejected' | 'returned' | 'cancelled';

export type AssetType = 'drone' | 'office' | 'rnd';

// ===== Core Entities =====

export interface Department {
    id: string;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
}

export interface User {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    department_id: string | null;
    department?: Department;
    position: string;
    phone: string;
    vehicle_license_number: string;
    vehicle_license_expiry: string | null;
    cv_url: string;
    id_card_url: string;
    status: string;
    created_at: string;
    updated_at: string;
}

// ===== Operation Category =====

export interface DroneAsset {
    id: string;
    name: string;
    model: string;
    serial_number: string;
    status: AssetStatus;
    department_id: string | null;
    department?: Department;
    total_flight_hours: number;
    last_maintenance_date: string | null;
    next_maintenance_date: string | null;
    notes: string;
    created_at: string;
    updated_at: string;
}

export interface UnifiedAsset {
    id: string;
    name: string;
    model?: string;
    type: 'drone' | 'battery' | 'accessory';
    serial_number: string;
    status: AssetStatus;
    department_id: string | null;
    notes: string;
    total_flight_hours?: number;
    cycle_count?: number;
    accessory_type?: string;
    updated_at: string;
}

export interface DroneMaintenanceLog {
    id: string;
    drone_asset_id: string;
    drone_asset?: DroneAsset;
    performed_by: string | null;
    performer?: User;
    status: MaintenanceStatus;
    description: string;
    started_at: string;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
}

// ===== Office Category =====

// export type OfficeAssetCategory = 'furniture' | 'printer' | 'laptop' | 'desktop' | 'monitor' | 'phone' | 'networking' | 'other';

export interface OfficeAsset {
    id: string;
    name: string;
    category: string;
    serial_number: string;
    status: string;
    department_id: string | null;
    user_id?: string | null;
    department?: Department;
    assigned_to: string | null;
    assignee?: User;
    purchase_date: string | null;
    warranty_expiry: string | null;
    notes: string;
    created_at: string;
    updated_at: string;
}

// ===== R&D Category =====

export type RndAssetType = string;

export interface RndAsset {
    id: string;
    name: string;
    asset_type: RndAssetType;
    serial_number: string;
    status: AssetStatus;
    department_id: string | null;
    department?: Department;
    specifications: Record<string, unknown>;
    is_classified: boolean;
    notes: string;
    created_at: string;
    updated_at: string;
}

// ===== Reservations =====

export interface Reservation {
    id: string;
    user_id: string;
    user?: User;
    asset_type: AssetType;
    asset_id: string;
    asset_name?: string;
    status: ReservationStatus;
    requested_at: string;
    approved_by: string | null;
    approver?: User;
    approved_at: string | null;
    start_date: string;
    end_date: string;
    notes: string;
    rejection_reason?: string;
    project?: {
        name: string;
        status: string;
    };
    created_at: string;
    updated_at: string;
}

// ===== Auth =====

export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    access_token: string;
    refresh_token: string;
    user: User;
}

export interface RefreshResponse {
    access_token: string;
}

// ===== API =====

export interface ApiError {
    message: string;
    status: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}
