import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";

type HealthMetricCardProps = {
  title: string;
  value: string;
  unit?: string;
  subtitle: string;
  icon: LucideIcon;
  tone: "blue" | "emerald" | "amber" | "rose";
};

const toneClasses: Record<HealthMetricCardProps["tone"], string> = {
  blue: "from-sky-500/20 to-blue-500/5 text-sky-300",
  emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-300",
  amber: "from-amber-500/20 to-amber-500/5 text-amber-300",
  rose: "from-rose-500/20 to-rose-500/5 text-rose-300",
};

export function HealthMetricCard({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  tone,
}: HealthMetricCardProps) {
  return (
    <motion.div className="h-full" whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}>
      <Card className={`flex h-full min-h-[196px] overflow-hidden border-white/10 bg-gradient-to-br ${toneClasses[tone]} p-6`}>
        <div className="flex w-full items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-4xl font-bold tracking-tight text-foreground">{value}</span>
              {unit ? <span className="pb-1 text-sm text-muted-foreground">{unit}</span> : null}
            </div>
            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="shrink-0 rounded-2xl border border-white/10 bg-black/10 p-3">
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
