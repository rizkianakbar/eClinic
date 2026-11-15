/** What the company has set up once for every branch: the shared catalogue. */
export type CompanyFacts = {
  /** Active polis with a consultation fee (the invoice needs it). */
  pricedPolis: number;
  medicines: number;
};

/** What one branch has set up: itself and its people. */
export type BranchFacts = {
  hasAddress: boolean;
  hasPhone: boolean;
  /** Doctors working at this branch. */
  doctors: number;
  /** Active doctor schedules at this branch. */
  schedules: number;
  /** Front desk, nurses, pharmacists and cashiers working at this branch. */
  team: number;
};

/** Message keys under onboarding.steps. */
export type SetupStepKey = 'polis' | 'medicines' | 'profile' | 'doctors' | 'schedules' | 'team';

export type SetupStep = { key: SetupStepKey; href: string; done: boolean };

/** Done once for the company: every branch, the next one included, uses them. */
export function companySetupSteps(facts: CompanyFacts) {
  return [
    { key: 'polis', href: '/settings/polis', done: facts.pricedPolis > 0 },
    { key: 'medicines', href: '/settings/medicines', done: facts.medicines > 0 },
  ] as const satisfies readonly SetupStep[];
}

/** Done at each branch, in the order that makes its first visit possible. */
export function branchSetupSteps(facts: BranchFacts) {
  return [
    { key: 'profile', href: '/settings/clinic', done: facts.hasAddress && facts.hasPhone },
    { key: 'doctors', href: '/settings/staff?new=doctor', done: facts.doctors > 0 },
    { key: 'schedules', href: '/settings/schedules', done: facts.schedules > 0 },
    { key: 'team', href: '/settings/staff?new=1', done: facts.team > 0 },
  ] as const satisfies readonly SetupStep[];
}

export function allDone(steps: readonly SetupStep[]) {
  return steps.every((step) => step.done);
}
