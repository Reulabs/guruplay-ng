import { lazy, Suspense } from "react";
import { Toaster } from "@guruplay/ui/toaster";
import { Toaster as Sonner } from "@guruplay/ui/sonner";
import { TooltipProvider } from "@guruplay/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PlayerProvider } from "@/context/PlayerContext";
import { AuthProvider } from "@/context/AuthContext";
import AppDocumentTitle from "@/components/app/AppDocumentTitle";
import AuthDialog from "@/components/auth/AuthDialog";
import NetworkStatus from "@guruplay/shared/network-status";
import MainLayout from "@/components/layout/MainLayout";
import LoadingState from "@guruplay/shared/fallbacks/LoadingState";

const Upload = lazy(() => import("./pages/Upload"));
const Home = lazy(() => import("./pages/Home"));
const Search = lazy(() => import("./pages/Search"));
const Library = lazy(() => import("./pages/Library"));
const PlaylistDetail = lazy(() => import("./pages/PlaylistDetail"));
const Artist = lazy(() => import("./pages/Artist"));
const ArtistDetail = lazy(() => import("./pages/ArtistDetail"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Settings = lazy(() => import("./pages/Settings"));
const Support = lazy(() => import("./pages/Support"));
const Stations = lazy(() => import("./pages/Stations"));
const Subscription = lazy(() => import("./pages/Subscription"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <PlayerProvider>
            <Toaster />
            <Sonner />
            <AppDocumentTitle />
            <AuthDialog />
            <NetworkStatus />
            <Suspense fallback={<div className="p-6"><LoadingState /></div>}>
            <Routes>
              <Route element={<MainLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/search" element={<Search />} />
                <Route path="/artist" element={<Artist />} />
                <Route path="/artist/:id" element={<ArtistDetail />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/support" element={<Support />} />
                <Route path="/stations" element={<Stations />} />
                <Route path="/library" element={<Library />} />
                <Route path="/playlist/:id" element={<PlaylistDetail />} />
              </Route>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/subscription" element={<Subscription />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </PlayerProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
