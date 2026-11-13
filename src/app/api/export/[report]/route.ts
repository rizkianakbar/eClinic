import { type NextRequest, NextResponse } from 'next/server';
import { exportFileName, isExportReport, parseRange } from '@/features/reports/reports.lib';
import { buildReportWorkbook } from '@/features/reports/reports.service';
import { getSession } from '@/lib/auth';
import { todayInJakarta } from '@/lib/dates';
import { createClient } from '@/lib/supabase/server';

/** GET /api/export/<report>?from=&to= -> .xlsx. Owner only (the report functions check it again). */
export async function GET(request: NextRequest, context: RouteContext<'/api/export/[report]'>) {
  const session = await getSession();

  if (!session) return NextResponse.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 });
  if (session.role !== 'owner') return NextResponse.json({ error: 'Hanya pemilik klinik.' }, { status: 403 });

  const { report } = await context.params;

  if (!isExportReport(report)) return NextResponse.json({ error: 'Laporan tidak dikenal.' }, { status: 404 });

  const range = parseRange(Object.fromEntries(request.nextUrl.searchParams), todayInJakarta());
  const buffer = await buildReportWorkbook(await createClient(), report, range);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${exportFileName(report, range)}"`,
      'Cache-Control': 'no-store',
    },
  });
}
