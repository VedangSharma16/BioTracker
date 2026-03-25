import { Link, useLocation } from "wouter";
import { Bell, CreditCard, FileText, LayoutDashboard, Menu, Pill, Stethoscope, Users } from "lucide-react";
import { useUser } from "@/hooks/use-auth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import bioTrackerLogo from "@frontend-assets/logo.png";

export function MobileNav() {
  const [location] = useLocation();
  const { data: user } = useUser();
  const isAdmin = user?.role?.toLowerCase() === "admin";

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ...(isAdmin
      ? [
          { name: "Patients", href: "/patients", icon: Users },
          { name: "Doctors", href: "/doctors", icon: Stethoscope },
        ]
      : []),
    { name: "Records", href: "/records", icon: FileText },
    { name: "Prescriptions", href: "/prescriptions", icon: Pill },
    { name: isAdmin ? "Billing" : "My Billing", href: "/billing", icon: CreditCard },
    { name: "Alerts", href: "/alerts", icon: Bell },
  ];

  return (
    <div className="md:hidden flex items-center justify-between p-4 bg-card border-b border-white/5 sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <img
          src={bioTrackerLogo}
          alt="BioTracker logo"
          className="h-10 w-10 rounded-lg object-cover ring-1 ring-white/10"
        />
        <h1 className="font-bold text-lg tracking-tight">BioTracker</h1>
      </div>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-foreground">
            <Menu className="w-6 h-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="bg-card border-l border-white/5 p-0 flex flex-col">
          <div className="p-6 border-b border-white/5">
            <p className="text-sm text-muted-foreground">Signed in as</p>
            <p className="font-semibold text-lg">{user?.username}</p>
            <p className="text-xs text-primary font-medium uppercase tracking-wider mt-1">{user?.role}</p>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.name} href={item.href} className="block">
                  <div
                    className={`flex items-center gap-3 px-4 py-4 rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </div>
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
