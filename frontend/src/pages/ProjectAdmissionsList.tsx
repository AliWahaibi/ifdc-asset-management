import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Check, X, Calendar, User, Eye, Box, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { admissionService } from '@/services/admissionService';
import { DataTable } from '@/components/ui/DataTable';
import type { Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { AssetStatus, MaintenanceStatus, ReservationStatus } from '@/types';

type BadgeStatus = AssetStatus | MaintenanceStatus | ReservationStatus;

interface AdmissionAsset {
    id: string;
    asset_type: string;
    asset_id: string;
    asset_name: string;
    status: string;
}

interface Admission {
    id: string;
    project_name: string;
    purpose?: string;
    start_date: string;
    end_date: string;
    status: string;
    user: {
        full_name: string;
        email: string;
    };
    requested_assets: AdmissionAsset[];
    rejection_reason?: string;
}

export function ProjectAdmissionsList() {
    const [admissions, setAdmissions] = useState<Admission[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    const fetchAdmissions = async (search?: string) => {
        setLoading(true);
        try {
            const data = await admissionService.getAdmissions(undefined, search);
            setAdmissions(data);
        } catch (error) {
            toast.error('Failed to fetch project admissions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchAdmissions(searchTerm);
        }, 300);
        return () => clearTimeout(timeout);
    }, [searchTerm]);

    const handleStatusUpdate = async (id: string, status: 'approved' | 'rejected') => {
        let reason = '';
        if (status === 'rejected') {
            reason = window.prompt('Please enter a reason for rejection (optional):') || '';
        }
        try {
            await admissionService.updateAdmissionStatus(id, status, reason);
            toast.success(`Admission ${status} successfully`);
            fetchAdmissions();
        } catch (error) {
            toast.error(`Failed to ${status} admission`);
        }
    };

    const openDetailsModal = (admission: Admission) => {
        setSelectedAdmission(admission);
        setIsDetailsModalOpen(true);
    };

    const columns: Column<Admission>[] = [
        {
            key: 'project_name',
            header: 'Project Name',
            render: (row: Admission) => (
                <div>
                   <div className="font-medium text-white">{row.project_name}</div>
                   {row.purpose && <div className="text-xs text-slate-500 italic mt-0.5 line-clamp-1">{row.purpose}</div>}
                </div>
            ),
        },
        {
            key: 'user',
            header: 'Requester',
            render: (row: Admission) => (
                <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-300">{row.user?.full_name || 'Unknown'}</span>
                </div>
            ),
        },
        {
            key: 'dates',
            header: 'Duration',
            render: (row: Admission) => (
                <div className="flex flex-col text-sm text-slate-400">
                    <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(row.start_date), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="ml-4 text-xs">to {format(new Date(row.end_date), 'MMM d, yyyy')}</div>
                </div>
            ),
        },
        {
            key: 'assets',
            header: 'Assets',
            render: (row: Admission) => (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">{row.requested_assets?.length || 0} requested</span>
                    <button
                        onClick={() => openDetailsModal(row)}
                        className="p-1 hover:bg-slate-700 rounded-full transition-colors"
                        title="View Assets"
                    >
                        <Eye className="h-4 w-4 text-blue-400" />
                    </button>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (row: Admission) => (
                <StatusBadge status={row.status as BadgeStatus} />
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (row: Admission) => (
                <div className="flex items-center gap-2">
                    {row.status === 'pending' && (
                        <>
                            <button
                                onClick={() => handleStatusUpdate(row.id, 'approved')}
                                className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-lg transition-colors"
                                title="Approve"
                            >
                                <Check className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(row.id, 'rejected')}
                                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                                title="Reject"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </>
                    )}
                    {row.status === 'rejected' && row.rejection_reason && (
                        <div className="text-[10px] text-red-400 bg-red-500/10 px-2 py-1 rounded" title={row.rejection_reason}>
                            Rejected: {row.rejection_reason.length > 20 ? row.rejection_reason.substring(0, 20) + '...' : row.rejection_reason}
                        </div>
                    )}
                </div>
            ),
        },
    ];


    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Project Admissions</h1>
                    <p className="text-slate-400">Manage and review project requests</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search projects by name or purpose..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-10 w-64 rounded-lg bg-slate-800 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            <DataTable
                columns={columns as any}
                data={admissions}
                emptyMessage="No project admissions found" 
                keyExtractor={(row) => row.id}
            />

            <Modal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                title="Requested Assets"
            >
                <div className="space-y-4">
                    {selectedAdmission?.requested_assets?.map((asset, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Box className="h-4 w-4 text-blue-400" />
                                </div>
                                <div>
                                    <div className="font-medium text-white">{asset.asset_name || 'Unknown Asset'}</div>
                                    <div className="text-xs text-slate-400 capitalize">{asset.asset_type}</div>
                                </div>
                            </div>
                            <StatusBadge status={asset.status as BadgeStatus} />
                        </div>
                    ))}
                    {selectedAdmission?.rejection_reason && (
                        <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                            <div className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">Rejection Reason</div>
                            <div className="text-sm text-slate-300 italic">"{selectedAdmission.rejection_reason}"</div>
                        </div>
                    )}
                    {(!selectedAdmission?.requested_assets || selectedAdmission.requested_assets.length === 0) && (
                        <div className="text-center text-slate-400 py-4">No assets requested for this project.</div>
                    )}
                </div>
            </Modal>
        </div>
    );
}

