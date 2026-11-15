import { JOURNEY } from '@/features/visits/visits.constants';

// Hero queue board (SiteJourneyBoard): a pure simulation, so it is testable and renders the same on the server.

export type BoardPatient = {
  no: number;
  name: string;
  station: number;
  bpjs: boolean;
  /** The visitor, after "Coba: daftarkan pasien": they move every other tick so each caption can be read. */
  you?: boolean;
};

/** Sample patients (fictional). The board starts mid-morning so every station has someone. */
const NAMES = [
  'Siti R.',
  'Budi S.',
  'Ayu L.',
  'Rahmat H.',
  'Dewi K.',
  'Agus P.',
  'Nur A.',
  'Fajar M.',
  'Rina W.',
  'Yusuf T.',
  'Lestari D.',
  'Hendra G.',
];

export const BOARD_START: BoardPatient[] = [
  { no: 4, name: NAMES[0], station: 4, bpjs: true },
  { no: 5, name: NAMES[1], station: 4, bpjs: false },
  { no: 6, name: NAMES[2], station: 3, bpjs: false },
  { no: 7, name: NAMES[3], station: 2, bpjs: true },
  { no: 8, name: NAMES[4], station: 1, bpjs: false },
  { no: 9, name: NAMES[5], station: 0, bpjs: true },
  { no: 10, name: NAMES[6], station: 0, bpjs: false },
];

export const BOARD_DONE = JOURNEY.length - 1;
/** How many patients stay visible under "Pulang" before they leave the board. */
const DONE_SHOWN = 2;
export const BOARD_TICK_MS = 1900;

/** The visitor joins the queue as a patient of their own ("Anda"), replacing an earlier visit of theirs. */
export function addVisitor(patients: BoardPatient[], name: string): BoardPatient[] {
  const others = patients.filter((patient) => !patient.you);
  const no = Math.max(0, ...others.map((patient) => patient.no)) + 1;

  return [...others, { no, name, station: 0, bpjs: false, you: true }];
}

/**
 * One step of a calm clinic morning: one patient moves to the next station; now and then someone new arrives. While
 * the visitor is on their way, they take every other step, so the board shows their visit at reading pace.
 */
export function nextBoard(patients: BoardPatient[], tick: number) {
  const board = patients.map((patient) => ({ ...patient }));
  const visitor = board.find((patient) => patient.you && patient.station < BOARD_DONE);
  let served = 0;

  if (visitor && tick % 2 === 0) {
    visitor.station += 1;
    if (visitor.station === BOARD_DONE) served = 1;
  } else {
    // One move per tick; the station tried first rotates (cashier, pharmacy, exam, waiting room) so the flow is even.
    const order = [0, 1, 2, 3].map((offset) => 3 - ((tick + offset) % 4));

    for (const station of order) {
      const next = station + 1;
      // One doctor: the exam room holds one patient at a time.
      if (next === 1 && board.some((patient) => patient.station === 1)) continue;

      const mover = board
        .filter((patient) => patient.station === station && !patient.you)
        .sort((a, b) => a.no - b.no)[0];

      if (!mover) continue;

      mover.station = next;
      if (next === BOARD_DONE) served = 1;
      break;
    }
  }

  if (tick % 3 === 2 && board.filter((patient) => patient.station === 0).length < 3) {
    const no = Math.max(...board.map((patient) => patient.no)) + 1;

    board.push({ no, name: NAMES[no % NAMES.length], station: 0, bpjs: no % 3 === 0 });
  }

  // "Pulang" keeps the latest few; the visitor stays until they register again.
  const done = board.filter((patient) => patient.station === BOARD_DONE && !patient.you).sort((a, b) => b.no - a.no);
  const leaving = new Set(done.slice(DONE_SHOWN).map((patient) => patient.no));

  return { patients: board.filter((patient) => !leaving.has(patient.no)), served };
}

// "Who sees what" table. Mirrors the RLS policies and requireRole() checks; keep the two in step.

export const ACCESS_ROLES = ['front_desk', 'nurse', 'doctor', 'pharmacist', 'cashier', 'admin', 'owner'] as const;

export const ACCESS = [
  { key: 'readRecords', roles: ['doctor', 'nurse', 'owner'] },
  { key: 'writeRecords', roles: ['doctor'] },
  { key: 'vitals', roles: ['nurse', 'doctor'] },
  { key: 'voidInvoice', roles: ['owner', 'admin'] },
  { key: 'finance', roles: ['owner'] },
  { key: 'activity', roles: ['owner', 'admin'] },
] as const satisfies readonly { key: string; roles: readonly (typeof ACCESS_ROLES)[number][] }[];
