/**
 * Test data for end-to-end testing on the linked Supabase project.
 *
 *   bun --env-file=.env.local scripts/seed-test-data.ts
 *
 * Safe to re-run: everything is find-or-create; today's demo visits are only
 * created once per day. Everything goes through the app's real rules: each
 * step signs in as a test staff member and calls the same tables/functions as
 * the UI. Test staff use @klinik.test emails and names ending in "(Uji)";
 * deactivate them before go-live.
 *
 * ICD-10: WHO ICD-10 2019 (scripts/icd102019syst_codes.txt, from
 * https://icdcdn.who.int/icd10/) plus Indonesian names for common diagnoses.
 */
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parseIcd10Rows } from "../src/features/settings/settings.lib";
import type { Database } from "../src/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const SECRET = process.env.SUPABASE_SECRET_KEY!;
const PASSWORD = "UjiKlinik#2026";

const admin = createClient<Database>(SUPABASE_URL, SECRET, { auth: { persistSession: false, autoRefreshToken: false } });

type Result = { data: unknown; error: { message: string; code?: string; details?: string } | null };

/** Throws on a Supabase error; otherwise the data (null only for writes without a select). */
function must<R extends Result>(result: R, what: string): NonNullable<R["data"]> {
  if (result.error) throw new Error(`${what}: ${result.error.code ?? ""} ${result.error.message} ${result.error.details ?? ""}`);
  return result.data as NonNullable<R["data"]>;
}

const jakartaToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const plusDays = (days: number) => {
  const date = new Date(`${jakartaToday()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

// 1. ICD-10 -------------------------------------------------------------------------

const ICD10_ID: Record<string, string> = {
  "A01.0": "Demam tifoid",
  "A09": "Diare dan gastroenteritis (infeksi)",
  "A09.9": "Gastroenteritis, tidak spesifik",
  "A15.0": "Tuberkulosis paru",
  // ICD-10 2019 moved dengue from A90/A91 to A97.
  "A97.0": "Dengue tanpa tanda bahaya (demam dengue)",
  "A97.1": "Dengue dengan tanda bahaya (DBD)",
  "A97.2": "Dengue berat",
  "A97.9": "Dengue, tidak spesifik",
  "B01.9": "Cacar air (varisela)",
  "B02.9": "Herpes zoster",
  "B35.4": "Kurap (tinea korporis)",
  "B37.0": "Sariawan jamur (kandidiasis oral)",
  "B82.0": "Cacingan",
  "B86": "Skabies (kudis)",
  "D64.9": "Anemia",
  "E11.9": "Diabetes melitus tipe 2",
  "E78.5": "Hiperlipidemia (kolesterol tinggi)",
  "E79.0": "Hiperurisemia (asam urat tinggi)",
  "F41.9": "Gangguan cemas",
  "G43.9": "Migrain",
  "G44.2": "Sakit kepala tegang (tension headache)",
  "H10.9": "Konjungtivitis (mata merah)",
  "H61.2": "Serumen (kotoran telinga) menumpuk",
  "H66.9": "Otitis media (radang telinga tengah)",
  "I10": "Hipertensi esensial (darah tinggi)",
  "I25.9": "Penyakit jantung koroner kronis",
  "J00": "Common cold (nasofaringitis akut)",
  "J02.9": "Faringitis akut (radang tenggorokan)",
  "J03.9": "Tonsilitis akut (radang amandel)",
  "J06.9": "Infeksi saluran pernapasan atas akut (ISPA)",
  "J11.1": "Influenza",
  "J18.9": "Pneumonia",
  "J20.9": "Bronkitis akut",
  "J30.4": "Rinitis alergi",
  "J45.9": "Asma",
  "K02.9": "Karies gigi (gigi berlubang)",
  "K04.0": "Pulpitis (radang pulpa gigi)",
  "K05.1": "Gingivitis kronis (radang gusi)",
  "K08.8": "Sakit gigi",
  "K12.0": "Stomatitis aftosa (sariawan)",
  "K21.9": "Penyakit refluks asam lambung (GERD)",
  "K29.7": "Gastritis (maag)",
  "K30": "Dispepsia",
  "K35.8": "Apendisitis akut (usus buntu)",
  "K59.0": "Konstipasi (sembelit)",
  "L02.9": "Abses kulit (bisul)",
  "L08.9": "Infeksi kulit lokal",
  "L20.9": "Dermatitis atopik (eksim)",
  "L23.9": "Dermatitis kontak alergi",
  "L30.9": "Dermatitis",
  "L50.9": "Urtikaria (biduran)",
  "L70.0": "Jerawat (akne vulgaris)",
  "M10.9": "Gout (asam urat)",
  "M54.5": "Nyeri punggung bawah",
  "M79.1": "Mialgia (nyeri otot)",
  "M25.5": "Nyeri sendi",
  "N30.0": "Sistitis akut",
  "N39.0": "Infeksi saluran kemih (ISK)",
  "N94.6": "Nyeri haid (dismenore)",
  "O80": "Persalinan normal",
  "R05": "Batuk",
  "R10.4": "Nyeri perut",
  "R11": "Mual dan muntah",
  "R42": "Pusing (dizziness)",
  "R50.9": "Demam",
  "R51": "Sakit kepala",
  "R53": "Lemas dan kelelahan",
  "S01.9": "Luka terbuka di kepala",
  "S61.9": "Luka terbuka di pergelangan dan tangan",
  "S81.9": "Luka terbuka di tungkai bawah",
  "S93.4": "Keseleo pergelangan kaki",
  "T14.0": "Luka lecet (ekskoriasi)",
  "T14.1": "Luka terbuka",
  "T78.4": "Alergi",
  "Z00.0": "Pemeriksaan kesehatan umum (medical check-up)",
  "Z01.2": "Pemeriksaan gigi",
  "Z23": "Imunisasi",
  "Z30.0": "Konsultasi kontrasepsi (KB)",
  "Z34.9": "Pemeriksaan kehamilan normal (ANC)",
};

async function seedIcd10() {
  const lines = readFileSync(new URL("./icd102019syst_codes.txt", import.meta.url), "utf8").split(/\r?\n/).filter(Boolean);
  // WHO "syst_codes" format: field 7 = code with dot (e.g. J06.9), field 9 = title.
  const rows = lines.map((line) => {
    const fields = line.split(";");
    const code = fields[6] ?? "";
    return [code, fields[8] ?? "", ICD10_ID[code] ?? ""];
  });
  const parsed = parseIcd10Rows(rows);
  for (let start = 0; start < parsed.rows.length; start += 1000) {
    const chunk = parsed.rows.slice(start, start + 1000).map((row) => ({ ...row, is_active: true }));
    must(await admin.from("icd10_codes").upsert(chunk, { onConflict: "code" }), "icd10 upsert");
  }
  const missingId = Object.keys(ICD10_ID).filter((code) => !parsed.rows.some((row) => row.code === code));
  console.log(`ICD-10: ${parsed.rows.length} kode (WHO 2019), ${Object.keys(ICD10_ID).length - missingId.length} dengan nama Indonesia, ${parsed.skipped.length} baris dilewati`);
  if (missingId.length) console.log(`  (kode Indonesia tanpa padanan WHO: ${missingId.join(", ")})`);
}

// 2. Staff --------------------------------------------------------------------------

const STAFF = {
  owner: { email: "pemilik.uji@klinik.test", role: "owner", full_name: "Pemilik (Uji)" },
  admin: { email: "admin.uji@klinik.test", role: "admin", full_name: "Admin (Uji)" },
  frontDesk: { email: "resepsionis.uji@klinik.test", role: "front_desk", full_name: "Rina Resepsionis (Uji)" },
  nurse: { email: "perawat.uji@klinik.test", role: "nurse", full_name: "Ners Putri (Uji)", nik: "9999010101900001" },
  doctorGp: {
    email: "dokter.umum.uji@klinik.test",
    role: "doctor",
    full_name: "dr. Budi Santoso (Uji)",
    nik: "9999010101800001",
    sip_number: "SIP/UJI/001",
  },
  doctorDental: {
    email: "dokter.gigi.uji@klinik.test",
    role: "doctor",
    full_name: "drg. Sari Wulandari (Uji)",
    nik: "9999010101850002",
    sip_number: "SIP/UJI/002",
  },
  doctorKia: {
    email: "dokter.kia.uji@klinik.test",
    role: "doctor",
    full_name: "dr. Maya Lestari (Uji)",
    nik: "9999010101870003",
    sip_number: "SIP/UJI/003",
  },
  pharmacist: { email: "apoteker.uji@klinik.test", role: "pharmacist", full_name: "Apt. Dewi (Uji)", nik: "9999010101880004" },
  cashier: { email: "kasir.uji@klinik.test", role: "cashier", full_name: "Kasir Andi (Uji)" },
} as const;

type StaffKey = keyof typeof STAFF;

async function seedStaff(clinicId: string) {
  const existing = new Map<string, string>();
  for (let page = 1; page < 20; page += 1) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    for (const user of data.users) if (user.email) existing.set(user.email, user.id);
    if (data.users.length < 200) break;
  }

  const ids = {} as Record<StaffKey, string>;
  for (const [key, staff] of Object.entries(STAFF) as [StaffKey, (typeof STAFF)[StaffKey]][]) {
    let id = existing.get(staff.email);
    if (id) {
      must(await admin.auth.admin.updateUserById(id, { password: PASSWORD, ban_duration: "none" }), `reset ${staff.email}`);
    } else {
      const created = must(
        await admin.auth.admin.createUser({ email: staff.email, password: PASSWORD, email_confirm: true }),
        `create ${staff.email}`,
      );
      if (!created.user) throw new Error(`create ${staff.email}: no user returned`);
      id = created.user.id;
    }
    must(
      await admin.from("profiles").upsert(
        {
          id,
          clinic_id: clinicId,
          email: staff.email,
          role: staff.role,
          full_name: staff.full_name,
          nik: "nik" in staff ? staff.nik : null,
          sip_number: "sip_number" in staff ? staff.sip_number : null,
          is_active: true,
        },
        { onConflict: "id" },
      ),
      `profile ${staff.email}`,
    );
    ids[key] = id;
  }
  console.log(`Staf uji: ${Object.keys(STAFF).length} akun (kata sandi: ${PASSWORD})`);
  return ids;
}

async function signIn(key: StaffKey): Promise<Client> {
  const client = createClient<Database>(SUPABASE_URL, PUBLISHABLE, { auth: { persistSession: false, autoRefreshToken: false } });
  must(await client.auth.signInWithPassword({ email: STAFF[key].email, password: PASSWORD }), `sign in ${key}`);
  return client;
}

/** Find a row by name, or insert it. */
async function findOrCreate<T extends { id: string }>(
  find: () => PromiseLike<{ data: T | null; error: { message: string } | null }>,
  create: () => PromiseLike<{ data: T | null; error: { message: string } | null }>,
  what: string,
): Promise<T> {
  const found = must(await find(), `find ${what}`);
  if (found) return found;
  const created = must(await create(), `create ${what}`);
  if (!created) throw new Error(`create ${what}: no row`);
  return created;
}

// 3. Master data (as admin) ----------------------------------------------------------

const SERVICES = [
  { name: "Konsultasi Dokter Umum", type: "consultation", price: 50000, doctor_fee_type: "percent", doctor_fee_value: 40 },
  { name: "Konsultasi Dokter Gigi", type: "consultation", price: 75000, doctor_fee_type: "percent", doctor_fee_value: 40 },
  { name: "Konsultasi KIA", type: "consultation", price: 50000, doctor_fee_type: "percent", doctor_fee_value: 40 },
  { name: "Jahit Luka", type: "procedure", price: 150000, doctor_fee_type: "fixed", doctor_fee_value: 50000 },
  { name: "Rawat Luka", type: "procedure", price: 50000, doctor_fee_type: "fixed", doctor_fee_value: 15000 },
  { name: "Nebulizer", type: "procedure", price: 75000, doctor_fee_type: "percent", doctor_fee_value: 20 },
  { name: "Cabut Gigi", type: "procedure", price: 150000, doctor_fee_type: "percent", doctor_fee_value: 40 },
  { name: "Tambal Gigi", type: "procedure", price: 200000, doctor_fee_type: "percent", doctor_fee_value: 40 },
  { name: "EKG", type: "procedure", price: 120000, doctor_fee_type: "none", doctor_fee_value: 0 },
  { name: "Cek Gula Darah", type: "other", price: 25000, doctor_fee_type: "none", doctor_fee_value: 0 },
  { name: "Cek Asam Urat", type: "other", price: 25000, doctor_fee_type: "none", doctor_fee_value: 0 },
  { name: "Administrasi", type: "other", price: 10000, doctor_fee_type: "none", doctor_fee_value: 0 },
  { name: "Paket Medical Check-up", type: "package", price: 250000, doctor_fee_type: "fixed", doctor_fee_value: 50000 },
] as const;

const POLIS = [
  { name: "Poli Umum", bpjs_poli_code: "001", consultation: "Konsultasi Dokter Umum" },
  { name: "Poli Gigi", bpjs_poli_code: "002", consultation: "Konsultasi Dokter Gigi" },
  { name: "Poli KIA", bpjs_poli_code: "003", consultation: "Konsultasi KIA" },
];

// [name, unit, sale price, min stock]
const MEDICINES: [string, string, number, number][] = [
  ["Paracetamol 500 mg", "tablet", 500, 200],
  ["Amoxicillin 500 mg", "kapsul", 1200, 100],
  ["Ibuprofen 400 mg", "tablet", 800, 100],
  ["Chlorpheniramine (CTM) 4 mg", "tablet", 200, 100],
  ["Cetirizine 10 mg", "tablet", 1000, 50],
  ["Antasida DOEN", "tablet", 300, 100],
  ["Omeprazole 20 mg", "kapsul", 1500, 50],
  ["Ranitidine 150 mg", "tablet", 600, 50],
  ["Metformin 500 mg", "tablet", 500, 100],
  ["Glibenclamide 5 mg", "tablet", 400, 50],
  ["Amlodipine 5 mg", "tablet", 800, 100],
  ["Captopril 25 mg", "tablet", 400, 50],
  ["Simvastatin 10 mg", "tablet", 900, 50],
  ["Allopurinol 100 mg", "tablet", 500, 50],
  ["Dexamethasone 0,5 mg", "tablet", 200, 100],
  ["Salbutamol 2 mg", "tablet", 300, 50],
  ["Ambroxol 30 mg", "tablet", 500, 100],
  ["Guaifenesin (GG) 100 mg", "tablet", 300, 100],
  ["Loperamide 2 mg", "tablet", 600, 30],
  ["Oralit", "sachet", 1500, 50],
  ["Zinc 20 mg", "tablet", 1000, 50],
  ["Vitamin C 50 mg", "tablet", 200, 100],
  ["Vitamin B Kompleks", "tablet", 200, 100],
  ["Asam Mefenamat 500 mg", "tablet", 700, 100],
  ["Ciprofloxacin 500 mg", "tablet", 1500, 50],
  ["Metronidazole 500 mg", "tablet", 800, 50],
  ["Kotrimoksazol 480 mg", "tablet", 700, 50],
  ["Domperidone 10 mg", "tablet", 800, 50],
  ["Paracetamol Sirup 120 mg/5 ml", "botol", 15000, 10],
  ["Amoxicillin Sirup 125 mg/5 ml", "botol", 18000, 10],
  ["OBH Sirup", "botol", 12000, 10],
  ["Salep Gentamicin 0,1%", "tube", 12000, 10],
  ["Povidone Iodine 10% 30 ml", "botol", 20000, 5],
  ["Lidocaine 2% injeksi", "ampul", 8000, 10],
  ["Kasa Steril", "lembar", 2000, 50],
  ["Plester", "pcs", 1000, 50],
  ["Spuit 3 ml", "pcs", 3000, 30],
  ["Benang Jahit Silk 3/0", "pcs", 25000, 5],
  ["Alkohol Swab", "pcs", 500, 100],
];

async function seedMasterData(client: Client, clinicId: string, doctorIds: Record<"gp" | "dental" | "kia", string>) {
  const services = new Map<string, string>();
  for (const service of SERVICES) {
    const row = await findOrCreate(
      () => client.from("services").select("id").eq("name", service.name).maybeSingle(),
      () =>
        client
          .from("services")
          .insert({
            name: service.name,
            type: service.type,
            price: service.price,
            doctor_fee_type: service.doctor_fee_type,
            doctor_fee_value: service.doctor_fee_value,
          })
          .select("id")
          .single(),
      `service ${service.name}`,
    );
    services.set(service.name, row.id);
  }
  must(
    await client.rpc("set_package_items", {
      p_package_id: services.get("Paket Medical Check-up")!,
      p_items: [
        { service_id: services.get("Konsultasi Dokter Umum"), qty: 1 },
        { service_id: services.get("Cek Gula Darah"), qty: 1 },
        { service_id: services.get("Cek Asam Urat"), qty: 1 },
        { service_id: services.get("EKG"), qty: 1 },
      ],
    }),
    "package items",
  );

  const polis = new Map<string, string>();
  for (const poli of POLIS) {
    const row = await findOrCreate(
      () => client.from("polis").select("id").eq("name", poli.name).maybeSingle(),
      () => client.from("polis").insert({ name: poli.name, bpjs_poli_code: poli.bpjs_poli_code, clinic_id: clinicId }).select("id").single(),
      `poli ${poli.name}`,
    );
    must(
      await client.from("polis").update({ consultation_service_id: services.get(poli.consultation)!, is_active: true }).eq("id", row.id),
      `poli tariff ${poli.name}`,
    );
    polis.set(poli.name, row.id);
  }

  // Every day of the week, so testing works on any day.
  const sessions = [
    { doctor: doctorIds.gp, poli: "Poli Umum", start: "08:00", end: "14:00", quota: 40 },
    { doctor: doctorIds.gp, poli: "Poli Umum", start: "16:00", end: "21:00", quota: 30 },
    { doctor: doctorIds.dental, poli: "Poli Gigi", start: "09:00", end: "15:00", quota: 20 },
    { doctor: doctorIds.kia, poli: "Poli KIA", start: "08:00", end: "13:00", quota: 20 },
  ];
  const { data: schedules } = await client.from("doctor_schedules").select("doctor_id, day_of_week, start_time");
  const have = new Set((schedules ?? []).map((s) => `${s.doctor_id}|${s.day_of_week}|${s.start_time.slice(0, 5)}`));
  const rows = sessions.flatMap((session) =>
    [1, 2, 3, 4, 5, 6, 7]
      .filter((day) => !have.has(`${session.doctor}|${day}|${session.start}`))
      .map((day) => ({
        clinic_id: clinicId,
        doctor_id: session.doctor,
        poli_id: polis.get(session.poli)!,
        day_of_week: day,
        start_time: session.start,
        end_time: session.end,
        quota: session.quota,
      })),
  );
  if (rows.length) must(await client.from("doctor_schedules").insert(rows), "schedules");

  const medicines = new Map<string, string>();
  for (const [name, unit, price, min_stock] of MEDICINES) {
    const row = await findOrCreate(
      () => client.from("medicines").select("id").eq("name", name).maybeSingle(),
      () => client.from("medicines").insert({ name, unit, price, min_stock }).select("id").single(),
      `medicine ${name}`,
    );
    medicines.set(name, row.id);
  }

  const suppliers = new Map<string, string>();
  for (const supplier of [
    { name: "PT Kimia Farma Trading (Uji)", phone: "021-0000001", address: "Jl. Margonda Raya No. 1, Depok" },
    { name: "PT Enseval Putera (Uji)", phone: "021-0000002", address: "Jl. Raya Bogor Km 30, Depok" },
    { name: "Apotek Mitra Sehat (Uji)", phone: "0812-0000-0003", address: "Jl. Nusantara No. 5, Depok" },
  ]) {
    const row = await findOrCreate(
      () => client.from("suppliers").select("id").eq("name", supplier.name).maybeSingle(),
      () => client.from("suppliers").insert(supplier).select("id").single(),
      `supplier ${supplier.name}`,
    );
    suppliers.set(supplier.name, row.id);
  }

  const { data: clinic } = await client.from("clinics").select("address, phone").eq("id", clinicId).single();
  if (clinic && (!clinic.address || !clinic.phone)) {
    must(
      await client
        .from("clinics")
        .update({
          address: clinic.address ?? "Jl. Margonda Raya No. 100, Kec. Beji, Depok",
          phone: clinic.phone ?? "021-7700000",
          license_no: "503/UJI/DINKES/2026",
        })
        .eq("id", clinicId),
      "clinic profile",
    );
  }

  console.log(`Master: ${SERVICES.length} tarif, ${POLIS.length} poli, ${rows.length} jadwal baru, ${MEDICINES.length} obat, ${suppliers.size} supplier`);
  return { services, polis, medicines, suppliers };
}

// 4. Stock (as pharmacist) -------------------------------------------------------------

async function seedStock(client: Client, medicines: Map<string, string>, suppliers: Map<string, string>) {
  const { count } = await client.from("purchases").select("id", { count: "exact", head: true }).like("invoice_no", "UJI-%");
  if (count) {
    console.log("Stok: pembelian uji sudah ada, dilewati");
    return;
  }
  const lines = MEDICINES.map(([name, , price, minStock], index) => {
    // A few deliberate alerts: low stock and near expiry.
    const lowStock = name.startsWith("Loperamide") || name.startsWith("Povidone");
    const nearExpiry = name.startsWith("Vitamin C") || name.startsWith("OBH");
    return {
      medicine_id: medicines.get(name)!,
      batch_no: `UJI${String(index + 1).padStart(3, "0")}A`,
      expiry_date: plusDays(nearExpiry ? 45 : 540 + index * 3),
      qty: lowStock ? Math.max(1, Math.floor(minStock / 2)) : minStock * 3,
      unit_cost: Math.round((price * 0.6) / 10) * 10,
    };
  });
  const [firstSupplier, secondSupplier] = [...suppliers.values()];
  must(
    await client.rpc("receive_purchase", {
      p_supplier_id: firstSupplier,
      p_invoice_no: "UJI-0001",
      p_purchase_date: jakartaToday(),
      p_note: "Stok awal (data uji)",
      p_items: lines.slice(0, 25),
    }),
    "purchase 1",
  );
  must(
    await client.rpc("receive_purchase", {
      p_supplier_id: secondSupplier,
      p_invoice_no: "UJI-0002",
      p_purchase_date: jakartaToday(),
      p_note: "Stok awal (data uji)",
      p_items: lines.slice(25),
    }),
    "purchase 2",
  );
  // Second, later batch of Paracetamol to show FEFO across batches.
  must(
    await client.rpc("receive_purchase", {
      p_supplier_id: secondSupplier,
      p_invoice_no: "UJI-0003",
      p_purchase_date: jakartaToday(),
      p_note: "Batch kedua (data uji)",
      p_items: [{ medicine_id: medicines.get("Paracetamol 500 mg")!, batch_no: "UJI001B", expiry_date: plusDays(900), qty: 300, unit_cost: 280 }],
    }),
    "purchase 3",
  );
  console.log("Stok: 3 pembelian uji, termasuk stok menipis dan hampir kedaluwarsa");
}

// 5. Patients (as front desk) ------------------------------------------------------------

const PATIENTS: [string, string, "male" | "female", boolean][] = [
  ["Ahmad Fauzi", "1985-03-12", "male", true],
  ["Siti Nurhaliza", "1990-07-25", "female", true],
  ["Budi Hartono", "1972-11-02", "male", false],
  ["Dewi Lestari", "1995-01-18", "female", false],
  ["Rudi Setiawan", "1968-05-30", "male", true],
  ["Fitri Handayani", "2001-09-09", "female", false],
  ["Agus Salim", "1979-12-15", "male", false],
  ["Rina Marlina", "1988-04-22", "female", true],
  ["Joko Susilo", "1960-08-08", "male", true],
  ["Maya Sari", "1993-06-14", "female", false],
  ["Hendra Gunawan", "1983-02-27", "male", false],
  ["Ani Suryani", "1976-10-03", "female", true],
  ["Dimas Pratama", "2015-03-21", "male", false],
  ["Putri Ayu", "2019-11-11", "female", true],
  ["Wahyu Hidayat", "1998-07-07", "male", false],
  ["Lina Marlina", "1987-09-19", "female", false],
  ["Taufik Rahman", "1970-01-01", "male", true],
  ["Nur Aini", "1999-12-25", "female", false],
  ["Yusuf Maulana", "2008-05-05", "male", false],
  ["Ratna Dewi", "1965-04-17", "female", true],
];

async function seedPatients(client: Client, clinicId: string) {
  const ids: string[] = [];
  for (const [index, [name, birth_date, sex, bpjs]] of PATIENTS.entries()) {
    const n = String(index + 1).padStart(4, "0");
    // 9999... is not a real province code: clearly fake NIK / BPJS numbers.
    const nik = `999901010101${n}`;
    const row = await findOrCreate(
      () => client.from("patients").select("id").eq("nik", nik).maybeSingle(),
      () =>
        client
          .from("patients")
          .insert({
            full_name: `${name} (Uji)`,
            nik,
            bpjs_number: bpjs ? `99990000${n.padStart(5, "0")}` : null,
            birth_date,
            sex,
            phone: `08120000${n}`,
            address: `Jl. Contoh No. ${index + 1}, Kel. Pondok Cina, Kec. Beji, Depok`,
            clinic_id: clinicId,
          })
          .select("id")
          .single(),
      `patient ${name}`,
    );
    ids.push(row.id);
  }
  console.log(`Pasien: ${ids.length} pasien uji (${PATIENTS.filter((p) => p[3]).length} BPJS)`);
  return ids;
}

// 6. Today's demo visits at every stage -----------------------------------------------------

async function seedVisits(
  c: Record<StaffKey, Client>,
  ids: Record<StaffKey, string>,
  patients: string[],
  master: Awaited<ReturnType<typeof seedMasterData>>,
) {
  const today = jakartaToday();
  const { count } = await c.frontDesk.from("visits").select("id", { count: "exact", head: true }).eq("visit_date", today).in("patient_id", patients);
  if (count) {
    console.log(`Kunjungan: ${count} kunjungan uji hari ini sudah ada, dilewati`);
    return;
  }

  const day = (() => {
    const d = new Date(`${today}T00:00:00Z`).getUTCDay();
    return d === 0 ? 7 : d;
  })();
  const { data: schedules } = await c.frontDesk.from("doctor_schedules").select("id, doctor_id, start_time").eq("day_of_week", day).eq("is_active", true);
  const sessionOf = (doctorId: string) =>
    must({ data: schedules?.find((s) => s.doctor_id === doctorId && s.start_time.startsWith("0")), error: null }, "session")!.id;
  const gp = sessionOf(ids.doctorGp);
  const dental = sessionOf(ids.doctorDental);

  const register = async (patient: number, schedule: string, payer: "umum" | "bpjs") =>
    must(await c.frontDesk.rpc("create_visit", { p_patient_id: patients[patient], p_schedule_id: schedule, p_payer_type: payer }), "create_visit").id;

  const examine = async (
    doctor: Client,
    visitId: string,
    options: {
      soap: { subjective: string; objective: string; assessment: string; plan: string };
      dx: string[];
      rx?: { medicine: string; qty: number; signa: string }[];
      procedure?: { service: string; performer: string; consumables?: { medicine: string; qty: number }[] };
      sign?: boolean;
    },
  ) => {
    must(await doctor.from("visits").update({ called_at: new Date().toISOString() }).eq("id", visitId), "call");
    must(await doctor.from("visits").update({ status: "in_exam" }).eq("id", visitId), "start exam");
    must(await doctor.from("soap_notes").insert({ visit_id: visitId, ...options.soap }), "soap");
    for (const code of options.dx) must(await doctor.from("visit_diagnoses").insert({ visit_id: visitId, icd10_code: code }), `dx ${code}`);
    if (options.rx?.length) {
      const rx = must(await doctor.from("prescriptions").insert({ visit_id: visitId }).select("id").single(), "rx");
      for (const item of options.rx) {
        must(
          await doctor
            .from("prescription_items")
            .insert({ prescription_id: rx.id, medicine_id: master.medicines.get(item.medicine)!, qty: item.qty, signa: item.signa }),
          `rx ${item.medicine}`,
        );
      }
    }
    if (options.procedure) {
      const procedure = must(
        await doctor
          .from("visit_procedures")
          .insert({ visit_id: visitId, service_id: master.services.get(options.procedure.service)!, performed_by: options.procedure.performer })
          .select("id")
          .single(),
        "procedure",
      );
      for (const item of options.procedure.consumables ?? []) {
        must(
          await doctor
            .from("procedure_consumables")
            .insert({ visit_procedure_id: procedure.id, medicine_id: master.medicines.get(item.medicine)!, qty: item.qty }),
          `consumable ${item.medicine}`,
        );
      }
    }
    if (options.sign !== false) must(await doctor.rpc("sign_visit", { p_visit_id: visitId }), "sign");
  };

  const vitals = async (visitId: string, values: Partial<Database["public"]["Tables"]["vitals"]["Insert"]>) =>
    must(await c.nurse.from("vitals").insert({ visit_id: visitId, ...values }), "vitals");

  const pay = async (visitId: string, method: "cash" | "qris" | "transfer" | null, discount?: { amount: number; reason: string }) => {
    const invoiceId = must(await c.cashier.rpc("create_invoice", { p_visit_id: visitId }), "invoice");
    if (discount) must(await c.cashier.rpc("set_invoice_discount", { p_invoice_id: invoiceId, p_discount: discount.amount, p_reason: discount.reason }), "discount");
    const { data: invoice } = await c.cashier.from("invoices").select("total").eq("id", invoiceId).single();
    const total = invoice?.total ?? 0;
    must(
      await c.cashier.rpc("pay_invoice", {
        p_invoice_id: invoiceId,
        p_method: method ?? "",
        p_cash_received: method === "cash" ? Math.ceil(total / 50000) * 50000 : 0,
        p_reference: method === "qris" ? "QR-UJI" : method === "transfer" ? "TRF-UJI" : "",
      }),
      "pay",
    );
  };

  // Completed visits (feed the cashier, reports and dashboard).
  const v1 = await register(0, gp, "bpjs");
  await vitals(v1, { systolic: 120, diastolic: 80, pulse: 88, temperature: 38.2, respiratory_rate: 20, spo2: 98, weight: 70, height: 170 });
  await examine(c.doctorGp, v1, {
    soap: { subjective: "Demam 2 hari, batuk pilek, nyeri tenggorokan.", objective: "Faring hiperemis, suhu 38,2°C.", assessment: "ISPA", plan: "Simptomatik, istirahat, kontrol 3 hari bila tidak membaik." },
    dx: ["J06.9", "R50.9"],
    rx: [
      { medicine: "Paracetamol 500 mg", qty: 10, signa: "3 x 1 sesudah makan" },
      { medicine: "Chlorpheniramine (CTM) 4 mg", qty: 10, signa: "3 x 1 sesudah makan" },
      { medicine: "Ambroxol 30 mg", qty: 10, signa: "3 x 1 sesudah makan" },
    ],
  });
  must(await c.pharmacist.rpc("dispense_prescription", { p_visit_id: v1, p_not_given: [] }), "dispense v1");
  await pay(v1, null);

  const v2 = await register(2, gp, "umum");
  await vitals(v2, { systolic: 160, diastolic: 100, pulse: 82, weight: 82, height: 168 });
  await examine(c.doctorGp, v2, {
    soap: { subjective: "Pusing, tengkuk berat.", objective: "TD 160/100.", assessment: "Hipertensi esensial", plan: "Amlodipine, diet rendah garam, kontrol 2 minggu." },
    dx: ["I10"],
    rx: [{ medicine: "Amlodipine 5 mg", qty: 30, signa: "1 x 1 pagi" }],
    procedure: { service: "Cek Gula Darah", performer: ids.nurse },
  });
  must(await c.pharmacist.rpc("dispense_prescription", { p_visit_id: v2, p_not_given: [] }), "dispense v2");
  await pay(v2, "cash");

  const v3 = await register(3, gp, "umum");
  await examine(c.doctorGp, v3, {
    soap: { subjective: "Tangan tergores pisau.", objective: "Luka robek 3 cm di telapak tangan kiri.", assessment: "Vulnus laceratum", plan: "Hecting, rawat luka, kontrol 7 hari lepas jahitan." },
    dx: ["S61.9"],
    rx: [
      { medicine: "Asam Mefenamat 500 mg", qty: 10, signa: "3 x 1 bila nyeri" },
      { medicine: "Amoxicillin 500 mg", qty: 15, signa: "3 x 1 sampai habis" },
    ],
    procedure: {
      service: "Jahit Luka",
      performer: ids.doctorGp,
      consumables: [
        { medicine: "Lidocaine 2% injeksi", qty: 1 },
        { medicine: "Benang Jahit Silk 3/0", qty: 1 },
        { medicine: "Kasa Steril", qty: 4 },
        { medicine: "Spuit 3 ml", qty: 1 },
      ],
    },
  });
  must(await c.pharmacist.rpc("dispense_prescription", { p_visit_id: v3, p_not_given: [] }), "dispense v3");
  await pay(v3, "qris", { amount: 5000, reason: "Pembulatan (uji)" });

  const v4 = await register(5, dental, "umum");
  await examine(c.doctorDental, v4, {
    soap: { subjective: "Gigi geraham bawah kanan nyeri.", objective: "Karies profunda 46.", assessment: "Pulpitis", plan: "Tambal sementara, kontrol 1 minggu." },
    dx: ["K04.0"],
    rx: [{ medicine: "Ibuprofen 400 mg", qty: 10, signa: "3 x 1 sesudah makan" }],
    procedure: { service: "Tambal Gigi", performer: ids.doctorDental },
  });
  must(await c.pharmacist.rpc("dispense_prescription", { p_visit_id: v4, p_not_given: [] }), "dispense v4");
  await pay(v4, "transfer");

  // One at each station, for hands-on testing.
  const atCashier = await register(1, gp, "bpjs");
  await examine(c.doctorGp, atCashier, {
    soap: { subjective: "Nyeri ulu hati, mual.", objective: "Nyeri tekan epigastrium.", assessment: "Dispepsia", plan: "Antasida, makan teratur." },
    dx: ["K30"],
    rx: [{ medicine: "Antasida DOEN", qty: 15, signa: "3 x 1 sebelum makan" }],
  });
  must(await c.pharmacist.rpc("dispense_prescription", { p_visit_id: atCashier, p_not_given: [] }), "dispense at-cashier");

  const atPharmacy = await register(4, gp, "umum");
  await vitals(atPharmacy, { systolic: 130, diastolic: 85, temperature: 37.0, weight: 75 });
  await examine(c.doctorGp, atPharmacy, {
    soap: { subjective: "Diare 4x sejak kemarin.", objective: "Turgor baik, bising usus meningkat.", assessment: "Gastroenteritis", plan: "Oralit, zinc, kontrol bila memburuk." },
    dx: ["A09"],
    rx: [
      { medicine: "Oralit", qty: 6, signa: "Setiap habis BAB" },
      { medicine: "Zinc 20 mg", qty: 10, signa: "1 x 1" },
      { medicine: "Loperamide 2 mg", qty: 10, signa: "Bila perlu, maks 4 tablet/hari" },
    ],
  });

  const inExam = await register(6, gp, "umum");
  await vitals(inExam, { systolic: 125, diastolic: 82, pulse: 76, temperature: 36.8 });
  await examine(c.doctorGp, inExam, {
    soap: { subjective: "Kontrol gula darah.", objective: "", assessment: "", plan: "" },
    dx: ["E11.9"],
    sign: false,
  });

  for (const patient of [7, 8, 9]) await register(patient, gp, PATIENTS[patient][3] ? "bpjs" : "umum");
  await register(10, dental, "umum");

  console.log("Kunjungan hari ini: 4 selesai, 1 di kasir, 1 di farmasi, 1 sedang diperiksa, 4 menunggu");
}

async function seedExpenses(owner: Client) {
  const today = jakartaToday();
  const { count } = await owner.from("expenses").select("id", { count: "exact", head: true }).like("description", "%(uji)%");
  if (count) return;
  must(
    await owner.from("expenses").insert([
      { expense_date: today, category: "Listrik", description: "Token listrik (uji)", amount: 500000 },
      { expense_date: today, category: "ATK", description: "Kertas struk thermal (uji)", amount: 150000 },
      { expense_date: today, category: "Kebersihan", description: "Sabun dan disinfektan (uji)", amount: 200000 },
    ]),
    "expenses",
  );
  console.log("Pengeluaran: 3 pengeluaran uji");
}

// Run ------------------------------------------------------------------------------------

async function main() {
  const { data: clinics, error } = await admin.from("clinics").select("id, name").order("created_at").limit(1);
  const clinic = clinics?.[0];
  if (error || !clinic) throw new Error(`clinic: ${error?.message ?? "tidak ada klinik"}`);
  console.log(`Klinik: ${clinic.name}`);

  await seedIcd10();
  const ids = await seedStaff(clinic.id);
  const clients = Object.fromEntries(
    await Promise.all((Object.keys(STAFF) as StaffKey[]).map(async (key) => [key, await signIn(key)] as const)),
  ) as Record<StaffKey, Client>;

  const master = await seedMasterData(clients.admin, clinic.id, { gp: ids.doctorGp, dental: ids.doctorDental, kia: ids.doctorKia });
  await seedStock(clients.pharmacist, master.medicines, master.suppliers);
  const patients = await seedPatients(clients.frontDesk, clinic.id);
  await seedVisits(clients, ids, patients, master);
  await seedExpenses(clients.owner);
  console.log("Selesai.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
