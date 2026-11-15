import { describe, expect, it } from 'vitest';
import { addVisitor, BOARD_DONE, BOARD_START, nextBoard } from './site.lib';

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

describe('the visitor on the board', () => {
  it('joins the waiting room and walks every station, one every other tick', () => {
    let patients = addVisitor(BOARD_START, 'Anda');
    const path: number[] = [];

    for (let tick = 0; tick < 12; tick += 1) {
      patients = nextBoard(patients, tick).patients;
      path.push(patients.find((patient) => patient.you)?.station ?? -1);
    }

    expect(path.slice(0, 8)).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
    // Arrived home, and still on the board.
    expect(path.at(-1)).toBe(BOARD_DONE);
  });

  it('registering again replaces the earlier visit', () => {
    const twice = addVisitor(addVisitor(BOARD_START, 'Anda'), 'Anda');

    expect(twice.filter((patient) => patient.you)).toHaveLength(1);
    expect(twice.find((patient) => patient.you)?.station).toBe(0);
  });
});
