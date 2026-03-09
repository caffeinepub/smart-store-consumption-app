import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  ShieldCheck,
  Store,
  Upload,
  User,
  Users,
} from "lucide-react";
import { useState } from "react";
import ConsumptionEntryTab from "./components/ConsumptionEntryTab";
import DashboardTab from "./components/DashboardTab";
import ImportTab from "./components/ImportTab";
import ItemsTab from "./components/ItemsTab";
import LoginScreen from "./components/LoginScreen";
import ReportsTab from "./components/ReportsTab";
import WorkerEntriesTab from "./components/WorkerEntriesTab";
import { AuthProvider, useAuth } from "./context/AuthContext";

function AppContent() {
  const { role, logout, isAuthenticated } = useAuth();
  const isAdmin = role === "admin";
  const defaultTab = isAdmin ? "dashboard" : "entry";
  const [activeTab, setActiveTab] = useState(defaultTab);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-sidebar border-b border-sidebar-border sticky top-0 z-50">
        <div className="max-w-screen-xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="bg-primary rounded-lg p-1.5">
              <Store className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-sidebar-foreground font-bold text-lg leading-none">
                StoreTrack
              </h1>
              <p className="text-sidebar-accent-foreground text-xs leading-none mt-0.5 opacity-70">
                Consumption Manager
              </p>
            </div>
          </div>

          {/* Right: Role badge + Logout */}
          <div className="flex items-center gap-2.5">
            {isAdmin ? (
              <Badge
                variant="outline"
                className="hidden sm:flex items-center gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-2.5 py-1"
                data-ocid="header.admin_badge"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="hidden sm:flex items-center gap-1.5 border-blue-500/40 bg-blue-500/10 text-blue-400 text-xs font-semibold px-2.5 py-1"
                data-ocid="header.worker_badge"
              >
                <User className="h-3.5 w-3.5" />
                Worker
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent text-xs h-8 px-2.5 gap-1.5"
              data-ocid="header.logout_button"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 md:px-6 py-6">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          {isAdmin ? (
            /* Admin: all 6 tabs */
            <TabsList className="bg-card border border-border rounded-lg h-11 p-1 w-full sm:w-auto grid grid-cols-6 sm:inline-flex gap-0">
              <TabsTrigger
                value="dashboard"
                className="flex items-center gap-1.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
                data-ocid="nav.dashboard.tab"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger
                value="items"
                className="flex items-center gap-1.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
                data-ocid="nav.items.tab"
              >
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Items</span>
              </TabsTrigger>
              <TabsTrigger
                value="import"
                className="flex items-center gap-1.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
                data-ocid="nav.import.tab"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Import</span>
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="flex items-center gap-1.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
                data-ocid="nav.reports.tab"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Reports</span>
              </TabsTrigger>
              <TabsTrigger
                value="entry"
                className="flex items-center gap-1.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
                data-ocid="nav.entry.tab"
              >
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Entry</span>
              </TabsTrigger>
              <TabsTrigger
                value="worker-entries"
                className="flex items-center gap-1.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
                data-ocid="nav.worker_entries.tab"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Worker Entries</span>
              </TabsTrigger>
            </TabsList>
          ) : (
            /* Worker: only Entry tab */
            <TabsList className="bg-card border border-border rounded-lg h-11 p-1 w-full sm:w-auto inline-flex">
              <TabsTrigger
                value="entry"
                className="flex items-center gap-1.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md px-4"
                data-ocid="nav.entry.tab"
              >
                <ClipboardList className="h-4 w-4" />
                <span>Entry</span>
              </TabsTrigger>
            </TabsList>
          )}

          {isAdmin && (
            <>
              <TabsContent value="dashboard" className="mt-0">
                <DashboardTab />
              </TabsContent>

              <TabsContent value="items" className="mt-0">
                <ItemsTab />
              </TabsContent>

              <TabsContent value="import" className="mt-0">
                <ImportTab />
              </TabsContent>

              <TabsContent value="reports" className="mt-0">
                <ReportsTab />
              </TabsContent>

              <TabsContent value="worker-entries" className="mt-0">
                <WorkerEntriesTab />
              </TabsContent>
            </>
          )}

          <TabsContent value="entry" className="mt-0">
            <ConsumptionEntryTab />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 px-4 md:px-6">
        <div className="max-w-screen-xl mx-auto text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            caffeine.ai
          </a>
        </div>
      </footer>

      <Toaster position="top-right" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
