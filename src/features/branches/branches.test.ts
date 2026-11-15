import { describe, expect, it } from 'vitest';
import { branchAfterSignIn, branchCreateSchema, branchErrorMessage } from './branches.lib';

describe('branchAfterSignIn', () => {
  it('starts at the only branch, owner or not', () => {
    expect(branchAfterSignIn(['a'], 'cashier')).toEqual({ clinicId: 'a', next: '/dashboard' });
    expect(branchAfterSignIn(['a'], 'owner')).toEqual({ clinicId: 'a', next: '/dashboard' });
  });

  it('asks staff every time when there are several, never reusing yesterday’s branch', () => {
    expect(branchAfterSignIn(['a', 'b'], 'front_desk')).toEqual({ clinicId: null, next: '/branch' });
  });

  it('starts the owner of several branches at the company overview', () => {
    expect(branchAfterSignIn(['a', 'b'], 'owner')).toEqual({ clinicId: null, next: '/company' });
  });

  it('asks when there is none (e.g. every branch was archived)', () => {
    expect(branchAfterSignIn([], 'nurse')).toEqual({ clinicId: null, next: '/branch' });
  });
});

describe('branchCreateSchema', () => {
  it('trims and turns blanks into null', () => {
    expect(branchCreateSchema.parse({ name: '  Cabang Bogor ', address: ' ', phone: '' })).toEqual({
      name: 'Cabang Bogor',
      address: null,
      phone: null,
    });
  });

  it('requires a name', () => {
    expect(branchCreateSchema.safeParse({ name: ' ' }).error?.issues[0]?.message).toBe('branches.errors.nameRequired');
  });
});

describe('branchErrorMessage', () => {
  it('maps the database errors to what to do next', () => {
    expect(branchErrorMessage({ message: 'not_a_member' })).toBe('branches.errors.notAMember');
    expect(branchErrorMessage({ message: 'last_branch' })).toBe('branches.errors.lastBranch');
    expect(branchErrorMessage({ message: 'owner_in_every_branch' })).toBe('branches.errors.ownerEverywhere');
    expect(branchErrorMessage({ message: 'last_open_branch' })).toBe('branches.errors.lastOpenBranch');
    expect(branchErrorMessage({ message: 'something else' })).toBe('errors.generic');
  });
});
