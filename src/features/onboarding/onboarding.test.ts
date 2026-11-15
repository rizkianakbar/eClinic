import { describe, expect, it } from 'vitest';
import { allDone, type BranchFacts, branchSetupSteps, companySetupSteps } from './onboarding.lib';

const NEW_BRANCH: BranchFacts = { hasAddress: false, hasPhone: false, doctors: 0, schedules: 0, team: 0 };

const done = (steps: readonly { key: string; done: boolean }[]) =>
  Object.fromEntries(steps.map((step) => [step.key, step.done]));

describe('companySetupSteps', () => {
  it('needs a priced poli and medicines, once for the whole company', () => {
    expect(done(companySetupSteps({ pricedPolis: 0, medicines: 0 }))).toEqual({ polis: false, medicines: false });
    expect(allDone(companySetupSteps({ pricedPolis: 2, medicines: 39 }))).toBe(true);
  });
});

describe('branchSetupSteps', () => {
  it('starts with nothing done for a new branch', () => {
    expect(allDone(branchSetupSteps(NEW_BRANCH))).toBe(false);
    expect(branchSetupSteps(NEW_BRANCH).every((step) => !step.done)).toBe(true);
  });

  it('needs both address and phone for the profile', () => {
    expect(done(branchSetupSteps({ ...NEW_BRANCH, hasAddress: true })).profile).toBe(false);
    expect(done(branchSetupSteps({ ...NEW_BRANCH, hasAddress: true, hasPhone: true })).profile).toBe(true);
  });

  it('counts doctors apart from the rest of the team', () => {
    expect(done(branchSetupSteps({ ...NEW_BRANCH, doctors: 1 }))).toMatchObject({ doctors: true, team: false });
    expect(done(branchSetupSteps({ ...NEW_BRANCH, team: 2 }))).toMatchObject({ doctors: false, team: true });
  });

  it('is complete for a branch with everything in place', () => {
    expect(allDone(branchSetupSteps({ hasAddress: true, hasPhone: true, doctors: 2, schedules: 5, team: 3 }))).toBe(
      true,
    );
  });
});
