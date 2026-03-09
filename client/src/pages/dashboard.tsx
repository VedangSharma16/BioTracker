import { useDashboardStats } from "@/hooks/use-dashboard";
import { useHealthRecords } from "@/hooks/use-records";
import { useAlerts } from "@/hooks/use-alerts";
import { useUser } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { Activity, Droplet, HeartPulse, BellRing, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: user } = useUser();
  const { data: records, isLoading: recordsLoading } = useHealthRecords();
  const { data: alerts, isLoading: alertsLoading } = useAlerts();
  
  const isAdmin = user?.role === "admin";
  const isLoading = statsLoading || recordsLoading || alertsLoading;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  // Patient Dashboard
  if (!isAdmin) {
    const latestRecord = records?.[0];
    const activeAlerts = alerts?.filter(a => a.status === 'pending') || [];
    
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Your Health Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-lg">Monitor your vital signs and health metrics.</p>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl bg-card border border-white/5" />
            ))}
          </div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {/* Latest Blood Pressure */}
            <motion.div variants={item} className="glass-panel rounded-2xl p-6 hover-card-effect relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <HeartPulse className="w-24 h-24 text-rose-500" />
              </div>
              <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className="bg-rose-500/20 p-3 rounded-xl text-rose-500">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg text-foreground">Blood Pressure</h3>
              </div>
              <div className="relative z-10 flex items-end gap-2">
                <span className="text-5xl font-bold tracking-tighter text-white">
                  {latestRecord?.bpSystolic || "—"}
                  <span className="text-3xl text-muted-foreground font-medium">/</span>
                  {latestRecord?.bpDiastolic || "—"}
                </span>
                <span className="text-sm font-medium text-muted-foreground mb-1">mmHg</span>
              </div>
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-xs text-muted-foreground">
                  {latestRecord ? format(new Date(latestRecord.recordDate), "MMM d, yyyy") : "No recent data"}
                </p>
              </div>
            </motion.div>

            {/* Latest Blood Sugar */}
            <motion.div variants={item} className="glass-panel rounded-2xl p-6 hover-card-effect relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Droplet className="w-24 h-24 text-blue-500" />
              </div>
              <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className="bg-blue-500/20 p-3 rounded-xl text-blue-400">
                  <Droplet className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg text-foreground">Blood Sugar</h3>
              </div>
              <div className="relative z-10 flex items-end gap-2">
                <span className="text-5xl font-bold tracking-tighter text-white">
                  {latestRecord?.bloodSugar || "—"}
                </span>
                <span className="text-sm font-medium text-muted-foreground mb-1">mg/dL</span>
              </div>
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-xs text-muted-foreground">Latest measurement</p>
              </div>
            </motion.div>

            {/* Active Alerts */}
            <motion.div variants={item} className="glass-panel rounded-2xl p-6 hover-card-effect relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <BellRing className="w-24 h-24 text-amber-500" />
              </div>
              <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className="bg-amber-500/20 p-3 rounded-xl text-amber-500">
                  <BellRing className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg text-foreground">Health Alerts</h3>
              </div>
              <div className="relative z-10 flex items-end gap-2">
                <span className="text-5xl font-bold tracking-tighter text-white">
                  {activeAlerts.length}
                </span>
                <span className="text-sm font-medium text-muted-foreground mb-1">pending</span>
              </div>
              <div className="mt-4 pt-4 border-t border-white/5 flex items-center">
                {activeAlerts.length > 0 && <div className="w-2 h-2 rounded-full bg-amber-500 mr-2 animate-pulse" />}
                <p className={`text-xs font-medium ${activeAlerts.length > 0 ? 'text-amber-500/80' : 'text-muted-foreground'}`}>
                  {activeAlerts.length > 0 ? 'Review needed' : 'All clear'}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Recent Alerts */}
        {activeAlerts.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-bold tracking-tight text-foreground mb-4">Recent Alerts</h2>
            <div className="space-y-3">
              {activeAlerts.slice(0, 3).map((alert) => (
                <Card key={alert.alertId} className="bg-amber-500/10 border-amber-500/30 p-4">
                  <p className="text-sm font-semibold text-amber-400">{alert.alertType}</p>
                  <p className="text-sm text-muted-foreground mt-1">{alert.alertMessage}</p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-lg">Real-time health statistics and alerts across all patients.</p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl bg-card border border-white/5" />
          ))}
        </div>
      ) : (
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {/* Blood Pressure Card */}
          <motion.div variants={item} className="glass-panel rounded-2xl p-6 hover-card-effect relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <HeartPulse className="w-24 h-24 text-rose-500" />
            </div>
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="bg-rose-500/20 p-3 rounded-xl text-rose-500">
                <HeartPulse className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-lg text-foreground">Avg Blood Pressure</h3>
            </div>
            <div className="relative z-10 flex items-end gap-2">
              <span className="text-5xl font-bold tracking-tighter text-white">
                {stats?.avgSystolic || 0}
                <span className="text-3xl text-muted-foreground font-medium">/</span>
                {stats?.avgDiastolic || 0}
              </span>
              <span className="text-sm font-medium text-muted-foreground mb-1">mmHg</span>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-xs text-muted-foreground">Based on latest patient readings</p>
            </div>
          </motion.div>

          {/* Blood Sugar Card */}
          <motion.div variants={item} className="glass-panel rounded-2xl p-6 hover-card-effect relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Droplet className="w-24 h-24 text-blue-500" />
            </div>
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="bg-blue-500/20 p-3 rounded-xl text-blue-400">
                <Droplet className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-lg text-foreground">Avg Blood Sugar</h3>
            </div>
            <div className="relative z-10 flex items-end gap-2">
              <span className="text-5xl font-bold tracking-tighter text-white">
                {stats?.avgBloodSugar || 0}
              </span>
              <span className="text-sm font-medium text-muted-foreground mb-1">mg/dL</span>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-xs text-muted-foreground">Fasting and random averages</p>
            </div>
          </motion.div>

          {/* Active Alerts Card */}
          <motion.div variants={item} className="glass-panel rounded-2xl p-6 hover-card-effect relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <BellRing className="w-24 h-24 text-amber-500" />
            </div>
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="bg-amber-500/20 p-3 rounded-xl text-amber-500">
                <BellRing className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-lg text-foreground">Active Alerts</h3>
            </div>
            <div className="relative z-10 flex items-end gap-2">
              <span className="text-5xl font-bold tracking-tighter text-white">
                {stats?.activeAlerts || 0}
              </span>
              <span className="text-sm font-medium text-muted-foreground mb-1">pending</span>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center">
              <div className="w-2 h-2 rounded-full bg-amber-500 mr-2 animate-pulse" />
              <p className="text-xs text-amber-500/80 font-medium">Requires attention</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
