import type { Metadata } from "next";
import { LiveIndicator } from "@/components/ui/live-indicator";
import { PageHeader } from "@/components/ui/page-header";
import { QUEUE_VIEWER_ROLES } from "@/features/queue/queue.lib";
import { QueueBoard } from "@/features/queue/queue-board";
import { requireRole } from "@/lib/auth";
import { formatDate, todayInJakarta } from "@/lib/dates";

export const metadata: Metadata = { title: "Antrean" };

export default async function QueuePage() {
  const session = await requireRole(...QUEUE_VIEWER_ROLES);
  const today = todayInJakarta();

  return (
    <>
      <PageHeader
        title="Antrean"
        description={
          <span className="inline-flex items-center gap-2">
            {formatDate(today)}
            <LiveIndicator />
          </span>
        }
      />
      <QueueBoard actor={{ role: session.role, userId: session.userId }} visitDate={today} />
    </>
  );
}
