import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PlayerProvider } from "@/context/PlayerContext";
import { AuthProvider } from "@/context/AuthContext";
import AppDocumentTitle from "@/components/app/AppDocumentTitle";
import AuthDialog from "@/components/auth/AuthDialog";
import NetworkStatus from "@/components/system/NetworkStatus";
import MainLayout from "@/components/layout/MainLayout";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Library from "./pages/Library";
import PlaylistDetail from "./pages/PlaylistDetail";
import Artist from "./pages/Artist";
import ArtistDetail from "./pages/ArtistDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

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
            <Routes>
              <Route element={<MainLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/search" element={<Search />} />
                <Route path="/artist" element={<Artist />} />
                <Route path="/artist/:id" element={<ArtistDetail />} />
                <Route path="/library" element={<Library />} />
                <Route path="/playlist/:id" element={<PlaylistDetail />} />
              </Route>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </PlayerProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
