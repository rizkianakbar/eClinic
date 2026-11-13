import { describe, expect, it } from 'vitest';
import {
  blockedByVitals,
  buildLanes,
  canCall,
  canCancel,
  canOpenExam,
  canRecordVitals,
  canSkip,
  canStartExam,
  doctorRoom,
  nextToCall,
  polisOf,
  type QueueVisit,
  queueErrorMessage,
} from './queue.lib';

const DOC = 'doc-a';

function visit(overrides: Partial<QueueVisit>): QueueVisit {
  return {
    id: crypto.randomUUID(),
    queue_no: 1,
    status: 'waiting',
    doctor_id: DOC,
    poli_id: 'poli-umum',
    called_at: null,
    skipped_at: null,
    updated_at: '2026-11-12T01:00:00Z',
    // Triage done unless a test says otherwise.
    vitals_recorded_at: '2026-11-12T00:55:00Z',
    payer_type: 'umum',
    patient: { full_name: 'Pasien', mrn: '000001', sex: 'female', birth_date: '1990-01-01' },
    poli: { name: 'Poli Umum' },
    doctor: { full_name: 'dr. A' },
    ...overrides,
  };
}

describe('permissions (mirror the database guard)', () => {
  const waiting = visit({});

  it('lets the own doctor call and examine, not another doctor', () => {
    expect(canCall({ role: 'doctor', userId: DOC }, waiting)).toBe(true);
    expect(canStartExam({ role: 'doctor', userId: DOC }, waiting)).toBe(true);
    expect(canCall({ role: 'doctor', userId: 'doc-b' }, waiting)).toBe(false);
    expect(canStartExam({ role: 'nurse', userId: 'n' }, waiting)).toBe(false);
  });

  it('lets front desk skip and cancel but not call', () => {
    const fd = { role: 'front_desk' as const, userId: 'fd' };

    expect(canCall(fd, waiting)).toBe(false);
    expect(canSkip(fd, waiting)).toBe(true);
    expect(canCancel(fd, waiting)).toBe(true);
  });

  it('locks call and exam until vitals are recorded, but still lets the doctor record them', () => {
    const untriaged = visit({ vitals_recorded_at: null });
    const doctor = { role: 'doctor' as const, userId: DOC };
    const nurse = { role: 'nurse' as const, userId: 'n' };

    expect(canCall(doctor, untriaged)).toBe(false);
    expect(canCall(nurse, untriaged)).toBe(false);
    expect(canStartExam(doctor, untriaged)).toBe(false);
    expect(blockedByVitals(doctor, untriaged)).toBe(true);
    expect(blockedByVitals({ role: 'front_desk', userId: 'fd' }, untriaged)).toBe(false);
    expect(canRecordVitals(doctor, untriaged)).toBe(true);
    expect(canRecordVitals(nurse, untriaged)).toBe(true);
  });

  it('allows nothing once the exam has started', () => {
    const inExam = visit({ status: 'in_exam' });
    const owner = { role: 'owner' as const, userId: 'o' };

    expect(canCall(owner, inExam)).toBe(false);
    expect(canSkip(owner, inExam)).toBe(false);
    expect(canCancel(owner, inExam)).toBe(false);
  });
});

describe('buildLanes', () => {
  it('sorts visits into stations, called first by latest call', () => {
    const lanes = buildLanes([
      visit({ queue_no: 3 }),
      visit({ queue_no: 1, called_at: '2026-11-12T01:00:00Z' }),
      visit({ queue_no: 2, called_at: '2026-11-12T01:05:00Z' }),
      visit({ queue_no: 4, skipped_at: '2026-11-12T01:02:00Z', called_at: '2026-11-12T01:10:00Z' }),
      visit({ queue_no: 5, status: 'in_exam' }),
      visit({ queue_no: 6, status: 'cancelled' }),
      visit({ queue_no: 7, status: 'to_pharmacy' }),
    ]);

    expect(lanes.called.map((v) => v.queue_no)).toEqual([2, 1]);
    expect(lanes.waiting.map((v) => v.queue_no)).toEqual([3]);
    expect(lanes.skipped.map((v) => v.queue_no)).toEqual([4]);
    expect(lanes.inExam).toHaveLength(1);
    expect(lanes.toPharmacy).toHaveLength(1);
    expect(lanes.cancelled).toHaveLength(1);
  });
});

describe('polisOf', () => {
  it('lists each poli once, by name', () => {
    expect(
      polisOf([
        visit({ poli_id: 'u', poli: { name: 'Poli Umum' } }),
        visit({ poli_id: 'g', poli: { name: 'Poli Gigi' } }),
        visit({ poli_id: 'u', poli: { name: 'Poli Umum' } }),
      ]),
    ).toEqual([
      { id: 'g', name: 'Poli Gigi' },
      { id: 'u', name: 'Poli Umum' },
    ]);
  });
});

describe('doctorRoom', () => {
  it('shows the exam in progress, the called patient, and the next number', () => {
    const room = doctorRoom(
      [
        visit({ queue_no: 1, status: 'in_exam' }),
        visit({ queue_no: 2, called_at: '2026-11-12T01:00:00Z' }),
        visit({ queue_no: 3 }),
        visit({ queue_no: 4, doctor_id: 'doc-b' }),
      ],
      DOC,
    );

    expect(room.examining?.queue_no).toBe(1);
    expect(room.called?.queue_no).toBe(2);
    expect(room.next?.queue_no).toBe(3);
    expect(room.waitingCount).toBe(2);
  });

  it('never offers a patient without vitals as next, and lists them apart', () => {
    const room = doctorRoom(
      [
        visit({ queue_no: 1, vitals_recorded_at: null }),
        visit({ queue_no: 2 }),
        visit({ queue_no: 3, vitals_recorded_at: null }),
      ],
      DOC,
    );

    expect(room.next?.queue_no).toBe(2);
    expect(room.awaitingVitals.map((item) => item.queue_no)).toEqual([1, 3]);
  });
});

describe('nextToCall', () => {
  it('picks the lowest uncalled, unskipped number for the doctor', () => {
    const visits = [
      visit({ queue_no: 1, called_at: '2026-11-12T01:00:00Z' }),
      visit({ queue_no: 2, skipped_at: '2026-11-12T01:01:00Z' }),
      visit({ queue_no: 4 }),
      visit({ queue_no: 3 }),
      visit({ queue_no: 0, doctor_id: 'doc-b' }),
    ];

    expect(nextToCall(visits, DOC)?.queue_no).toBe(3);
    expect(nextToCall([], DOC)).toBeUndefined();
    expect(nextToCall([visit({ queue_no: 1, vitals_recorded_at: null })], DOC)).toBeUndefined();
  });
});

describe('queueErrorMessage', () => {
  it('maps guard keys', () => {
    expect(queueErrorMessage({ code: 'P0001', message: 'not_your_patient' })).toMatch(/dokter yang menangani/);

    expect(queueErrorMessage({ code: 'P0001', message: 'vitals_required' })).toMatch(
      /Tanda vital pasien ini belum dicatat/,
    );

    expect(queueErrorMessage({ code: 'XX' })).toMatch(/gagal diperbarui/);
  });
});

describe('exam links and vitals', () => {
  it('lets nurses and the own doctor record vitals while waiting', () => {
    const waiting = visit({});

    expect(canRecordVitals({ role: 'nurse', userId: 'n' }, waiting)).toBe(true);
    expect(canRecordVitals({ role: 'doctor', userId: DOC }, waiting)).toBe(true);
    expect(canRecordVitals({ role: 'front_desk', userId: 'fd' }, waiting)).toBe(false);
    expect(canRecordVitals({ role: 'nurse', userId: 'n' }, visit({ status: 'in_exam' }))).toBe(false);
  });

  it('opens the exam page only for clinical roles', () => {
    expect(canOpenExam({ role: 'doctor', userId: DOC })).toBe(true);
    expect(canOpenExam({ role: 'cashier', userId: 'c' })).toBe(false);
    expect(canOpenExam({ role: 'front_desk', userId: 'fd' })).toBe(false);
  });
});
