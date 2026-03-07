import { useState, useEffect } from 'react';
import { Users, Plus, UploadCloud, FileText } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import type { Column } from '@/components/ui/DataTable';
import type { User, UserRole } from '@/types';
import { userService } from '@/services/userService';
import { ROLE_LABELS } from '@/lib/roles';
import toast from 'react-hot-toast';

export function UsersDashboard() {

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
        role: 'user_employee' as UserRole,
        position: '',
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
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-xs font-bold text-white shadow-sm">
                        {row.full_name?.charAt(0).toUpperCase() ?? 'U'}
                    </div>
                    <span className="font-medium text-white">{row.full_name}</span>
                </div>
            ),
        },
        { key: 'email', header: 'Email' },
        {
            key: 'role',
            header: 'Role',
            render: (row) => <span className="text-cyan-400">{ROLE_LABELS[row.role] ?? row.role}</span>,
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
                <div className="flex gap-2">
                    {row.cv_url ? (
                        <a href={row.cv_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg bg-cyan-500/10 px-2 py-1 text-[11px] font-semibold text-cyan-400 hover:bg-cyan-500/20 transition-colors">
                            <FileText className="h-3 w-3" /> CV
                        </a>
                    ) : (
                        <span className="flex items-center gap-1.5 rounded-lg bg-slate-800/50 px-2 py-1 text-[11px] font-medium text-slate-500">
                            No CV
                        </span>
                    )}
                    {row.id_card_url ? (
                        <a href={row.id_card_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg bg-violet-500/10 px-2 py-1 text-[11px] font-semibold text-violet-400 hover:bg-violet-500/20 transition-colors">
                            <FileText className="h-3 w-3" /> ID
                        </a>
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
                    <button
                        onClick={() => {
                            setEditingId(row.id);
                            setFormData({
                                full_name: row.full_name,
                                email: row.email,
                                password: '', // Leave blank for edit unless changing
                                role: row.role,
                                position: row.position || '',
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
                full_name: '', email: '', password: '', role: 'user_employee', position: '', cv_file: null, id_card_file: null
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
                <button
                    onClick={() => setModalOpen(true)}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-500/40 active:scale-[0.97]"
                >
                    <Plus className="h-4 w-4" />
                    Add User
                </button>
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
                setFormData({
                    full_name: '', email: '', password: '', role: 'user_employee', position: '', cv_file: null, id_card_file: null
                });
            }} title={editingId ? "Edit User" : "Add New User"} size="lg">
                <form className="space-y-5" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                            <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30">
                                <option value="super_admin">Super Admin</option>
                                <option value="admin_manager">Admin / Manager</option>
                                <option value="editor_team_leader">Editor / Team Leader</option>
                                <option value="user_employee">User / Employee</option>
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="mb-2 block text-sm font-medium text-slate-200">Position / Job Title</label>
                            <input type="text" value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30" />
                        </div>

                        {/* File Uploads */}
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
                                Emirates ID / Government ID (PDF, PNG, JPG)
                            </label>
                            <input type="file" accept=".pdf,image/*" onChange={e => handleFileChange(e, 'id_card_file')} className="text-sm text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-violet-500/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-violet-400 hover:file:bg-violet-500/20" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => {
                            setModalOpen(false);
                            setEditingId(null);
                            setFormData({
                                full_name: '', email: '', password: '', role: 'user_employee', position: '', cv_file: null, id_card_file: null
                            });
                        }} className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm text-slate-400 hover:bg-slate-800">Cancel</button>
                        <button type="submit" disabled={submitting} className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                            {submitting ? 'Saving...' : (editingId ? 'Update User' : 'Create User')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
