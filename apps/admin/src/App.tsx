import { lazy, Suspense } from "react";
import { Toaster } from "@guruplay/ui/toaster";
import { Toaster as Sonner } from "@guruplay/ui/sonner";
import { TooltipProvider } from "@guruplay/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { UserType } from "@/lib/artist";
import AppDocumentTitle from "@/components/app/AppDocumentTitle";
import AuthDialog from "@/components/auth/AuthDialog";
import NetworkStatus from "@guruplay/shared/network-status";
import LoadingState from "@guruplay/shared/fallbacks/LoadingState";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));

const AdminDashboard = () => {
  const { user, isAuthLoading } = useAuth();
  if (isAuthLoading)
    return (
      <div className="p-6">
        <LoadingState />
      </div>
    );
  if (user?.userType !== UserType.Admin) return <Navigate to="/" replace />;
  return <Dashboard />;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <AppDocumentTitle />
          <AuthDialog />
          <NetworkStatus />
          <Suspense
            fallback={
              <div className="p-6">
                <LoadingState />
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Admin />} />
              <Route path="/dashboard" element={<AdminDashboard />} />
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
