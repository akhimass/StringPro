import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { supabaseConfigError } from "@/lib/supabase";
import DropOff from "./pages/DropOff";
import Admin from "./pages/Admin";
import StringerDashboard from "./pages/StringerDashboard";
import FrontDeskDashboard from "./pages/FrontDeskDashboard";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {supabaseConfigError && (
          <div
            className="sticky top-0 z-[100] bg-destructive text-destructive-foreground px-4 py-2 text-center text-sm font-medium"
            role="alert"
          >
            {supabaseConfigError}
          </div>
        )}
        <BrowserRouter>
          <ErrorBoundary>
            <AuthProvider>
              <Routes>
              <Route path="/" element={<DropOff />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Admin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/frontdesk"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'frontdesk', 'frontdesk_stringer']}>
                    <FrontDeskDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stringer"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'stringer', 'frontdesk_stringer']}>
                    <StringerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
