import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Users, Plus, UploadCloud, FileText, Eye, Download } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import type { Column } from '@/components/ui/DataTable';
import type { User, UserRole } from '@/types';
import { userService } from '@/services/userService';
import { ROLE_LABELS } from '@/lib/roles';
import toast from 'react-hot-toast';

export function UsersDashboard() {
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'account'|'personal'|'documents'>('account');

    // Form State
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
        role: 'employee' as UserRole,
        position: '',
        manager_id: '',
        department: 'Operation',
        marital_status: 'Single',
        address: '',
        phone: '',
        whatsapp_number: '',
        cv_file: null as File | null,
        id_card_file: null as File | null,
    });

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await userService.getUsers();
            setUsers(data.data);
        } catch (error) {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const columns: Column<User>[] = [
        {
            key: 'full_name',
            header: 'Name',
            render: (row) => (
                <div 
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => navigate(`/users/${row.id}`)}
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-xs font-bold text-white shadow-sm group-hover:scale-110 transition-transform">
                        {row.full_name?.charAt(0).toUpperCase() ?? 'U'}
                    </div>
                    <span className="font-medium text-white group-hover:text-cyan-400 transition-colors border-b border-transparent group-hover:border-cyan-400/30">{row.full_name}</span>
                </div>
            ),
        },
        { key: 'email', header: 'Email' },
        {
            key: 'role',
            header: 'Role',
            render: (row) => {
                const label = ROLE_LABELS[row.role as UserRole];
                if (label) return <span className="text-cyan-400">{label}</span>;
                const formatted = row.role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                return <span className="text-cyan-400">{formatted}</span>;
            },
        },
        {
            key: 'position',
            header: 'Position',
            render: (row) => <span className="text-slate-300">{row.position || '—'}</span>,
        },
        {
            key: 'status',
            header: 'Status',
            render: (row) => <StatusBadge status={row.status === 'active' ? 'available' : 'retired'} />,
        },
        {
            key: 'documents',
            header: 'Documents',
            sortable: false,
            render: (row) => (
                <div className="flex flex-col gap-2">
                    {row.cv_url ? (
                        <div className="flex items-center gap-1.5">
                            <span className="flex items-center gap-1 rounded-lg bg-cyan-500/10 px-2 py-1 text-[11px] font-semibold text-cyan-400">
                                <FileText className="h-3 w-3" /> CV
                            </span>
                            <a href={`http://localhost:8080${row.cv_url}`} target="_blank" rel="noopener noreferrer" className="p-1 rounded bg-slate-700 text-slate-300 hover:bg-cyan-500 hover:text-white transition-all" title="View CV">
                                <Eye className="h-3 w-3" />
                            </a>
                            <a href={`http://localhost:8080${row.cv_url}`} download className="p-1 rounded bg-slate-700 text-slate-300 hover:bg-violet-500 hover:text-white transition-all" title="Download CV">
                                <Download className="h-3 w-3" />
                            </a>
                        </div>
                    ) : (
                        <span className="flex items-center gap-1.5 rounded-lg bg-slate-800/50 px-2 py-1 text-[11px] font-medium text-slate-500">
                            No CV
                        </span>
                    )}
                    {row.id_card_url ? (
                        <div className="flex items-center gap-1.5">
                            <span className="flex items-center gap-1 rounded-lg bg-violet-500/10 px-2 py-1 text-[11px] font-semibold text-violet-400">
                                <FileText className="h-3 w-3" /> ID
                            </span>
                            <a href={`http://localhost:8080${row.id_card_url}`} target="_blank" rel="noopener noreferrer" className="p-1 rounded bg-slate-700 text-slate-300 hover:bg-cyan-500 hover:text-white transition-all" title="View National ID">
                                <Eye className="h-3 w-3" />
                            </a>
                            <a href={`http://localhost:8080${row.id_card_url}`} download className="p-1 rounded bg-slate-700 text-slate-300 hover:bg-violet-500 hover:text-white transition-all" title="Download National ID">
                                <Download className="h-3 w-3" />
                            </a>
                        </div>
                    ) : (
                        <span className="flex items-center gap-1.5 rounded-lg bg-slate-800/50 px-2 py-1 text-[11px] font-medium text-slate-500">
                            No ID
                        </span>
                    )}
                </div>
            )
        },
        {
            key: 'id',
            header: 'Actions',
            sortable: false,
            render: (row) => (
                <div className="flex items-center gap-3">
                    {(() => {
                        const { user } = useAuthStore.getState();
                        const canEdit = user ? ['super_admin', 'admin'].includes(user.role) : false;
                        if (!canEdit) return <span className="text-xs text-slate-500">View Only</span>;
                        return (
                            <>
                                <button
                                    onClick={async () => {
                                        const newStatus = row.status === 'active' ? 'suspended' : 'active';
                                        const action = newStatus === 'active' ? 'activate' : 'suspend';
                                        if (window.confirm(`Are you sure you want to ${action} this user?`)) {
                                            try {
                                                await userService.updateUserStatus(row.id, newStatus);
                                                toast.success(`User ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`);
                                                fetchUsers();
                                            } catch (e) {
                                                toast.error(`Failed to ${action} user`);
                                            }
                                        }
                                    }}
                                    className={`text-xs font-medium transition-colors ${row.status === 'active' ? 'text-amber-400 hover:text-amber-500' : 'text-emerald-400 hover:text-emerald-500'}`}
                                >
                                    {row.status === 'active' ? 'Suspend' : 'Activate'}
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingId(row.id);
                                        const validRoles = ['super_admin', 'manager', 'team_leader', 'employee', 'hr', 'ceo'];
                                        setFormData({
                                            full_name: row.full_name,
                                            email: row.email,
                                            password: '', // Leave blank for edit unless changing
                                            role: validRoles.includes(row.role) ? row.role as UserRole : 'employee',
                                            position: row.position || '',
                                            manager_id: row.manager_id || '',
                                            department: row.department || 'Operation',
                                            marital_status: row.marital_status || 'Single',
                                            address: row.address || '',
                                            phone: row.phone || '',
                                            whatsapp_number: row.whatsapp_number || '',
                                            cv_file: null,
                                            id_card_file: null,
                                        });
                                        setModalOpen(true);
                                    }}
                                    className="text-xs font-medium text-slate-400 hover:text-cyan-400 transition-colors"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={async () => {
                                        if (window.confirm('Are you sure you want to delete this user?')) {
                                            try {
                                                await userService.deleteUser(row.id);
                                                toast.success('User deleted successfully');
                                                fetchUsers();
                                            } catch (e) {
                                                toast.error('Failed to delete user');
                                            }
                                        }
                                    }}
                                    className="text-xs font-medium text-slate-400 hover:text-rose-400 transition-colors"
                                >
                                    Delete
                                </button>
                            </>
                        );
                    })()}
                </div>
            )
        }
    ];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'cv_file' | 'id_card_file') => {
        if (e.target.files && e.target.files.length > 0) {
            setFormData({ ...formData, [field]: e.target.files[0] });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const uploadData = new FormData();
        uploadData.append('full_name', formData.full_name);
        uploadData.append('email', formData.email);
        uploadData.append('password', formData.password);
        uploadData.append('role', formData.role);
        uploadData.append('position', formData.position);
        uploadData.append('manager_id', formData.manager_id);
        uploadData.append('department', formData.department);
        uploadData.append('marital_status', formData.marital_status);
        uploadData.append('address', formData.address);
        uploadData.append('phone', formData.phone);
        uploadData.append('whatsapp_number', formData.whatsapp_number);

        if (formData.cv_file) {
            uploadData.append('cv_file', formData.cv_file);
        }
        if (formData.id_card_file) {
            uploadData.append('id_card_file', formData.id_card_file);
        }

        try {
            if (editingId) {
                // If password is blank on edit, don't send it to backend to avoid override
                if (formData.password === '') {
                    uploadData.delete('password');
                }
                await userService.updateUser(editingId, uploadData);
                toast.success('User updated successfully');
            } else {
                await userService.createUser(uploadData);
                toast.success('User created successfully');
            }
            setModalOpen(false);
            setEditingId(null);
            setFormData({
                full_name: '', email: '', password: '', role: 'employee', position: '', manager_id: '', department: 'Operation', marital_status: 'Single', address: '', phone: '', whatsapp_number: '', cv_file: null, id_card_file: null
            });
            fetchUsers();
        } catch (error) {
            toast.error(editingId ? 'Failed to update user' : 'Failed to create user');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mt-2 mb-10">
                <div>
                    <h1 className="font-heading flex items-center gap-3 text-4xl font-bold tracking-tight text-white">
                        <div className="rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 p-2.5 shadow-lg shadow-cyan-500/20">
                            <Users className="h-7 w-7 text-white" />
                        </div>
                        User Management
                    </h1>
                    <p className="mt-3 text-lg text-slate-400">
                        Manage personnel, roles, and securely upload identity documents.
                    </p>
                </div>
                {(() => {
                    const { user } = useAuthStore.getState();
                    const canEdit = user ? ['super_admin', 'admin'].includes(user.role) : false;
                    if (!canEdit) return null;
                    return (
                        <button
                            onClick={() => setModalOpen(true)}
                            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-500/40 active:scale-[0.97]"
                        >
                            <Plus className="h-4 w-4" />
                            Add User
                        </button>
                    );
                })()}
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
                </div>
            ) : (
                <DataTable
                    columns={columns}
                    data={users}
                    keyExtractor={(row) => row.id}
                    searchPlaceholder="Search personnel by name or email..."
                />
            )}

            {/* Modal */}
            <Modal isOpen={modalOpen} onClose={() => {
                setModalOpen(false);
                setEditingId(null);
                setActiveTab('account');
                setFormData({
                    full_name: '', email: '', password: '', role: 'employee', position: '', manager_id: '', department: 'Operation', marital_status: 'Single', address: '', phone: '', whatsapp_number: '', cv_file: null, id_card_file: null
                });
            }} title={editingId ? "Edit User" : "Add New User"} size="lg">
                <form className="space-y-6" onSubmit={handleSubmit}>
                    {/* Tabs */}
                    <div className="flex border-b border-slate-800">
                        <button
                            type="button"
                            onClick={() => setActiveTab('account')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'account' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
                        >
                            Account Info
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('personal')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'personal' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
                        >
                            Personal Details
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('documents')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'documents' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
                        >
                            Documents
                        </button>
                    </div>

                    {/* Tab 1: Account Info */}
                    {activeTab === 'account' && (
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 animate-fade-in">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-200">Full Name</label>
                                <input required type="text" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30" />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-200">Email Address</label>
                                <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30" />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-200">
                                    {editingId ? "New Password (Optional)" : "Temporary Password"}
                                </label>
                                <input required={!editingId} type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30" />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-200">System Role</label>
                                <select value={formData.role} onChange={e => {
                                const newRole = e.target.value as UserRole;
                                setFormData({ 
                                    ...formData, 
                                    role: newRole, 
                                    manager_id: newRole === 'employee' ? formData.manager_id : '',
                                    department: newRole === 'manager' ? 'N/A' : formData.department === 'N/A' ? 'Operation' : formData.department 
                                });
                                }} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30">
                                    <option value="super_admin">Super Admin</option>
                                    <option value="manager">Manager</option>
                                    <option value="team_leader">Team Leader</option>
                                    <option value="employee">Employee</option>
                                    <option value="hr">HR</option>
                                    <option value="ceo">CEO</option>
                                </select>
                            </div>
                            <div className="sm:col-span-1">
                                <label className="mb-2 block text-sm font-medium text-slate-200">Position / Job Title</label>
                                <input type="text" value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30" />
                            </div>
                            {formData.role === 'employee' ? (
                                <div className="sm:col-span-1">
                                    <label className="mb-2 block text-sm font-medium text-slate-200">Team Leader</label>
                                    <select 
                                        value={formData.manager_id} 
                                        onChange={e => setFormData({ ...formData, manager_id: e.target.value })} 
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                                    >
                                        <option value="">None (Reports to CEO directly)</option>
                                        {users.filter(u => ['manager', 'super_admin', 'team_leader'].includes(u.role) && u.id !== editingId).map(m => (
                                            <option key={m.id} value={m.id}>{m.full_name} ({m.role})</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div className="sm:col-span-1">
                                    <label className="mb-2 block text-sm font-medium text-slate-200">Team Leader</label>
                                    <input readOnly value="N/A (Direct Report)" className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm text-slate-400 outline-none cursor-not-allowed" />
                                </div>
                            )}

                            {/* Phase 4 Synchronized Fields */}
                            {formData.role !== 'manager' ? (
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-200">Department</label>
                                <select value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30">
                                    <option value="Operation">Operation</option>
                                    <option value="Sales">Sales</option>
                                    <option value="Academy">Academy</option>
                                    <option value="R&D">R&D</option>
                                    <option value="Business Development">Business Development</option>
                                </select>
                            </div>
                            ) : (
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-200">Department</label>
                                <input readOnly value="N/A — Managers oversee all departments" className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm text-slate-400 outline-none cursor-not-allowed" />
                            </div>
                            )}
                        </div>
                    )}

                    {/* Tab 2: Personal Details */}
                    {activeTab === 'personal' && (
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 animate-fade-in">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-200">Marital Status</label>
                                <select value={formData.marital_status} onChange={e => setFormData({ ...formData, marital_status: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30">
                                    <option value="Single">Single</option>
                                    <option value="Married">Married</option>
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="mb-2 block text-sm font-medium text-slate-200">Physical Address (Oman)</label>
                                <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Street, City, Postal Code" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30" />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-200">GSM Number (+968)</label>
                                <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+968 9..." className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30" />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-200">WhatsApp Number (+968)</label>
                                <input type="text" value={formData.whatsapp_number} onChange={e => setFormData({ ...formData, whatsapp_number: e.target.value })} placeholder="+968 9..." className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30" />
                            </div>
                        </div>
                    )}

                    {/* Tab 3: File Uploads */}
                    {activeTab === 'documents' && (
                        <div className="grid grid-cols-1 gap-5 animate-fade-in">
                            <div className="rounded-xl border border-dashed border-slate-600 bg-slate-800/50 p-4">
                                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-200">
                                    <UploadCloud className="h-4 w-4 text-cyan-400" />
                                    Resume / CV (PDF, PNG, JPG)
                                </label>
                                <input type="file" accept=".pdf,image/*" onChange={e => handleFileChange(e, 'cv_file')} className="text-sm text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-cyan-500/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-cyan-400 hover:file:bg-cyan-500/20" />
                            </div>
                            <div className="rounded-xl border border-dashed border-slate-600 bg-slate-800/50 p-4">
                                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-200">
                                    <UploadCloud className="h-4 w-4 text-violet-400" />
                                    National ID (Oman) (PDF, PNG, JPG)
                                </label>
                                <input type="file" accept=".pdf,image/*" onChange={e => handleFileChange(e, 'id_card_file')} className="text-sm text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-violet-500/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-violet-400 hover:file:bg-violet-500/20" />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-5 border-t border-slate-800/60 mt-4">
                        <button type="button" onClick={() => {
                            setModalOpen(false);
                            setEditingId(null);
                            setActiveTab('account');
                            setFormData({
                                full_name: '', email: '', password: '', role: 'employee', position: '', manager_id: '', department: 'Operation', marital_status: 'Single', address: '', phone: '', whatsapp_number: '', cv_file: null, id_card_file: null
                            });
                        }} className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-800 transition-colors">Cancel</button>
                        <button type="submit" disabled={submitting} className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                            {submitting ? 'Saving...' : (editingId ? 'Update User' : 'Create User')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
