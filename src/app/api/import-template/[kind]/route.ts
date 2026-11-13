import { NextResponse, type NextRequest } from "next/server";
import { IMPORT_CONFIG, isImportKind } from "@/features/data-import/data-import.lib";
import { buildImportTemplate } from "@/features/data-import/data-import.service";
import { getSession } from "@/lib/auth";
import { todayInJakarta } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

/** GET /api/import-template/<kind>[?filled=1] -> .xlsx template, optionally with the clinic's current rows. */
export async function GET(request: NextRequest, context: RouteContext<"/api/import-template/[kind]">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  if (session.role !== "owner" && session.role !== "admin") {
    return NextResponse.json({ error: "Hanya pemilik atau admin klinik." }, { status: 403 });
  }

  const { kind } = await context.params;
  if (!isImportKind(kind)) return NextResponse.json({ error: "Jenis data tidak dikenal." }, { status: 404 });

  const filled = request.nextUrl.searchParams.get("filled") === "1";
  const buffer = await buildImportTemplate(await createClient(), kind, filled);
  const name = filled
    ? IMPORT_CONFIG[kind].fileName.replace("template-", "data-").replace(".xlsx", `-${todayInJakarta()}.xlsx`)
    : IMPORT_CONFIG[kind].fileName;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
