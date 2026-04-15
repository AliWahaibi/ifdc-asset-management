import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoginPage } from '@/pages/LoginPage';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';
import { UserDashboard } from '@/pages/UserDashboard';
import { OperationsDashboard } from '@/pages/OperationsDashboard';
import { OfficeDashboard } from '@/pages/OfficeDashboard';
import { RndDashboard } from '@/pages/RndDashboard';
import { UsersDashboard } from '@/pages/UsersDashboard';
import { TimelineCalendar } from '@/pages/TimelineCalendar';
import { UserProfile } from '@/pages/UserProfile';
import { SystemSettings } from '@/pages/SystemSettings';
import { SystemLogs } from '@/pages/SystemLogs';
import { StatisticsDashboard } from '@/pages/StatisticsDashboard';
import { AIAssistant } from '@/pages/AIAssistant';
import { ProjectAdmission } from '@/pages/ProjectAdmission';
import { ProjectAdmissionsList } from '@/pages/ProjectAdmissionsList';
import { VehiclesManagement } from '@/pages/VehiclesManagement';
import { Toaster } from 'react-hot-toast';

export function App() {
    return (
        <BrowserRouter>
            <Toaster position="top-right" toastOptions={{
                className: '!bg-slate-800 !text-white !border !border-slate-700',
            }} />
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />

                {/* Protected Routes — wrapped in DashboardLayout */}
                <Route
                    element={
                        <ProtectedRoute>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >
                    {/* All authenticated users */}
                    <Route path="/dashboard" element={<UserDashboard />} />
                    <Route path="/calendar" element={<TimelineCalendar />} />
                    <Route path="/ai-assistant" element={<AIAssistant />} />
                    <Route path="/profile" element={<UserProfile />} />
                    <Route path="/users/:id" element={<UserProfile />} />
                    <Route path="/admission" element={<ProjectAdmission />} />
                    <Route path="/admissions-list" element={<ProjectAdmissionsList />} />

                    {/* Operations — Super Admin, Manager, Team Leader */}
                    <Route
                        path="/operations"
                        element={
                            <ProtectedRoute>
                                <OperationsDashboard />
                            </ProtectedRoute>
                        }
                    />

                    {/* Office — Super Admin, Manager, Team Leader */}
                    <Route
                        path="/office"
                        element={
                            <ProtectedRoute>
                                <OfficeDashboard />
                            </ProtectedRoute>
                        }
                    />

                    {/* Vehicles — Super Admin, Manager, Team Leader */}
                    <Route
                        path="/vehicles"
                        element={
                            <ProtectedRoute>
                                <VehiclesManagement />
                            </ProtectedRoute>
                        }
                    />

                    {/* R&D — Super Admin, Manager, Team Leader */}
                    <Route
                        path="/rnd"
                        element={
                            <ProtectedRoute>
                                <RndDashboard />
                            </ProtectedRoute>
                        }
                    />


                    {/* User Management — Super Admin, Admin */}
                    <Route
                        path="/users"
                        element={
                            <ProtectedRoute allowedRoles={['manager', 'super_admin']}>
                                <UsersDashboard />
                            </ProtectedRoute>
                        }
                    />

                    {/* System Settings — Super Admin, Admin */}
                    <Route
                        path="/settings"
                        element={
                            <ProtectedRoute allowedRoles={['manager', 'super_admin']}>
                                <SystemSettings />
                            </ProtectedRoute>
                        }
                    />

                    {/* System Logs — Super Admin, Admin */}
                    <Route
                        path="/logs"
                        element={
                            <ProtectedRoute allowedRoles={['manager', 'super_admin']}>
                                <SystemLogs />
                            </ProtectedRoute>
                        }
                    />

                    {/* Statistics — Super Admin, Admin */}
                    <Route
                        path="/logs"
                        element={
                            <ProtectedRoute allowedRoles={['manager', 'super_admin']}>
                                <SystemLogs />
                            </ProtectedRoute>
                        }
                    />

                    {/* Analytics — Super Admin, Admin */}
                    <Route
                        path="/statistics"
                        element={
                            <ProtectedRoute allowedRoles={['manager', 'super_admin']}>
                                <StatisticsDashboard />
                            </ProtectedRoute>
                        }
                    />
                </Route>

                {/* Catch-all redirect */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
