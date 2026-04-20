import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Toaster } from 'react-hot-toast';

// Lazy loaded pages
const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const UnauthorizedPage = lazy(() => import('@/pages/UnauthorizedPage').then(m => ({ default: m.UnauthorizedPage })));
const UserDashboard = lazy(() => import('@/pages/UserDashboard').then(m => ({ default: m.UserDashboard })));
const OperationsDashboard = lazy(() => import('@/pages/OperationsDashboard').then(m => ({ default: m.OperationsDashboard })));
const OfficeDashboard = lazy(() => import('@/pages/OfficeDashboard').then(m => ({ default: m.OfficeDashboard })));
const RndDashboard = lazy(() => import('@/pages/RndDashboard').then(m => ({ default: m.RndDashboard })));
const UsersDashboard = lazy(() => import('@/pages/UsersDashboard').then(m => ({ default: m.UsersDashboard })));
const TimelineCalendar = lazy(() => import('@/pages/TimelineCalendar').then(m => ({ default: m.TimelineCalendar })));
const UserProfile = lazy(() => import('@/pages/UserProfile').then(m => ({ default: m.UserProfile })));
const SystemSettings = lazy(() => import('@/pages/SystemSettings').then(m => ({ default: m.SystemSettings })));
const SystemLogs = lazy(() => import('@/pages/SystemLogs').then(m => ({ default: m.SystemLogs })));
const StatisticsDashboard = lazy(() => import('@/pages/StatisticsDashboard').then(m => ({ default: m.StatisticsDashboard })));
const AIAssistant = lazy(() => import('@/pages/AIAssistant').then(m => ({ default: m.AIAssistant })));
const ProjectAdmission = lazy(() => import('@/pages/ProjectAdmission').then(m => ({ default: m.ProjectAdmission })));
const ProjectAdmissionsList = lazy(() => import('@/pages/ProjectAdmissionsList').then(m => ({ default: m.ProjectAdmissionsList })));
const VehiclesManagement = lazy(() => import('@/pages/VehiclesManagement').then(m => ({ default: m.VehiclesManagement })));
const LeaveManagement = lazy(() => import('@/pages/LeaveManagement').then(m => ({ default: m.LeaveManagement })));

export function App() {
    return (
        <BrowserRouter>
            <Toaster position="top-right" toastOptions={{
                className: '!bg-slate-800 !text-white !border !border-slate-700',
            }} />
            <Suspense fallback={
                <div className="flex h-screen w-screen items-center justify-center bg-slate-950">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-800 border-t-cyan-500"></div>
                </div>
            }>
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
                        <Route path="/leaves" element={<LeaveManagement />} />
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


                        {/* User Management — Super Admin, Manager, CEO, HR */}
                        <Route
                            path="/users"
                            element={
                                <ProtectedRoute allowedRoles={['manager', 'super_admin', 'ceo', 'hr']}>
                                    <UsersDashboard />
                                </ProtectedRoute>
                            }
                        />

                        {/* System Settings — Super Admin, Manager, CEO */}
                        <Route
                            path="/settings"
                            element={
                                <ProtectedRoute allowedRoles={['manager', 'super_admin', 'ceo']}>
                                    <SystemSettings />
                                </ProtectedRoute>
                            }
                        />

                        {/* System Logs — Super Admin, Manager, CEO */}
                        <Route
                            path="/logs"
                            element={
                                <ProtectedRoute allowedRoles={['manager', 'super_admin', 'ceo']}>
                                    <SystemLogs />
                                </ProtectedRoute>
                            }
                        />

                        {/* Statistics — Super Admin, Manager, CEO */}
                        <Route
                            path="/statistics"
                            element={
                                <ProtectedRoute allowedRoles={['manager', 'super_admin', 'ceo']}>
                                    <StatisticsDashboard />
                                </ProtectedRoute>
                            }
                        />
                    </Route>

                    {/* Catch-all redirect */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}
