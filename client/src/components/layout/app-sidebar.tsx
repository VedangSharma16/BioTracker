import { Link, useLocation } from "wouter";
import { Activity, Bell, FileText, LayoutDashboard, LogOut, Pill, Shield } from "lucide-react";
import { useUser, useLogout } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const [location] = useLocation();
  const { data: user } = useUser();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const isAdmin = user?.role === "admin";

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: isAdmin ? "Health Records" : "My Records", href: "/records", icon: FileText },
    { name: isAdmin ? "Prescriptions" : "My Prescriptions", href: "/prescriptions", icon: Pill },
    { name: "Alerts", href: "/alerts", icon: Bell },
  ];

  return (
    <div className="hidden md:flex flex-col w-72 bg-card border-r border-white/5 h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-primary/20 p-2 rounded-xl text-primary">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight tracking-tight">HealthTracker</h1>
          <p className="text-xs text-muted-foreground font-medium">Medical System</p>
        </div>
      </div>

      <div className="px-6 py-2 mb-4">
        <div className="glass-panel rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold border border-white/10">
            {user?.username.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-foreground">{user?.username}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Shield className="w-3 h-3 text-primary" />
              <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                {isAdmin ? "Administrator" : "Patient"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.name} href={item.href} className="block">
              <div
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary font-semibold shadow-inner"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5 font-medium"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-white/5">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          onClick={() => logout()}
          disabled={isLoggingOut}
        >
          <LogOut className="w-5 h-5 mr-3" />
          {isLoggingOut ? "Signing out..." : "Sign Out"}
        </Button>
      </div>
    </div>
  );
}
