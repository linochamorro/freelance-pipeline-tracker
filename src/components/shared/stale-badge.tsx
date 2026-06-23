import { Badge } from "@/components/ui/badge";

export function StaleBadge({ days }: { days: number }) {
  return (
    <Badge variant="warning" className="text-xs">
      {days}d stale
    </Badge>
  );
}
