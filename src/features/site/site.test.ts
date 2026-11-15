import { describe, expect, it } from 'vitest';
import { BOARD_DONE, BOARD_START, nextBoard } from './site.lib';

describe('nextBoard (hero queue board)', () => {
  it('keeps the board believable over a long morning', () => {
    let patients = BOARD_START;
    let served = 0;

    for (let tick = 0; tick < 500; tick += 1) {
      const next = nextBoard(patients, tick);

      // One move per tick, never backwards.
      const moved = next.patients.filter((patient) => {
        const before = patients.find((item) => item.no === patient.no);

        return before && before.station !== patient.station;
      });

      expect(moved.length).toBeLessThanOrEqual(1);
      for (const patient of moved) {
        expect(patient.station).toBe((patients.find((item) => item.no === patient.no)?.station ?? -1) + 1);
      }

      // One doctor, a short "Pulang" list, unique tickets.
      expect(next.patients.filter((patient) => patient.station === 1).length).toBeLessThanOrEqual(1);
      expect(next.patients.filter((patient) => patient.station === BOARD_DONE).length).toBeLessThanOrEqual(2);
      expect(new Set(next.patients.map((patient) => patient.no)).size).toBe(next.patients.length);

      served += next.served;
      patients = next.patients;
    }

    // Patients keep flowing: the board never stalls.
    expect(served).toBeGreaterThan(50);
  });
});
