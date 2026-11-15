import { describe, expect, it } from 'vitest';
import { clinicUrl, DEMO_SLUG, siteUrl, slugProblem, suggestSlug, tenantFromHost, urlOnRequestHost } from './tenant';

describe('tenantFromHost', () => {
  const root = 'clinic.rzknkbr.xyz';

  it('serves the marketing site on the root domain and www', () => {
    expect(tenantFromHost('clinic.rzknkbr.xyz', root)).toEqual({ kind: 'site' });
    expect(tenantFromHost('WWW.clinic.rzknkbr.xyz', root)).toEqual({ kind: 'site' });
  });

  it('serves a clinic on its subdomain', () => {
    expect(tenantFromHost('sehat.clinic.rzknkbr.xyz', root)).toEqual({ kind: 'clinic', slug: 'sehat' });
    expect(tenantFromHost('demo.clinic.rzknkbr.xyz', root)).toEqual({ kind: 'clinic', slug: DEMO_SLUG });
  });

  it('keeps the port in local development', () => {
    expect(tenantFromHost('localhost:3000', 'localhost:3000')).toEqual({ kind: 'site' });
    expect(tenantFromHost('sehat.localhost:3000', 'localhost:3000')).toEqual({ kind: 'clinic', slug: 'sehat' });
  });

  it('serves the demo clinic on any other host (preview deployments)', () => {
    expect(tenantFromHost('e-clinic-git-main.vercel.app', root)).toEqual({ kind: 'clinic', slug: DEMO_SLUG });
  });

  it('does not take a look-alike domain for a subdomain', () => {
    expect(tenantFromHost('evilclinic.rzknkbr.xyz', root)).toEqual({ kind: 'clinic', slug: DEMO_SLUG });
    // Your other apps on the parent domain are not clinics.
    expect(tenantFromHost('noorish.rzknkbr.xyz', root)).toEqual({ kind: 'clinic', slug: DEMO_SLUG });
  });
});

describe('slugProblem', () => {
  it('accepts a DNS label', () => {
    expect(slugProblem('sehat-sentosa')).toBeNull();
    expect(slugProblem('k24')).toBeNull();
  });

  it('names what is wrong', () => {
    expect(slugProblem('ab')).toBe('short');
    expect(slugProblem('a'.repeat(33))).toBe('long');
    expect(slugProblem('-sehat')).toBe('format');
    expect(slugProblem('sehat-')).toBe('format');
    expect(slugProblem('se--hat')).toBe('format');
    expect(slugProblem('Sehat')).toBe('format');
    expect(slugProblem('sehat.id')).toBe('format');
    expect(slugProblem('www')).toBe('reserved');
    expect(slugProblem(DEMO_SLUG)).toBe('reserved');
  });
});

describe('suggestSlug', () => {
  it('drops "Klinik" and "Pratama" and joins words with hyphens', () => {
    expect(suggestSlug('Klinik Pratama Sehat Sentosa')).toBe('sehat-sentosa');
    expect(suggestSlug('  Klinik  Ibu & Anak "Bunda"  ')).toBe('ibu-anak-bunda');
  });

  it('drops company words too: Group, PT', () => {
    expect(suggestSlug('Sentosa Medika Group')).toBe('sentosa-medika');
    expect(suggestSlug('PT Kian Grup')).toBe('kian');
  });

  it('keeps "klinik" when it is the only word', () => {
    expect(suggestSlug('Klinik')).toBe('klinik');
  });

  it('strips accents and caps the length without a trailing hyphen', () => {
    expect(suggestSlug('Café Médica')).toBe('cafe-medica');
    expect(suggestSlug('Klinik Sangat Panjang Sekali Namanya Lebih Dari Batas')).toBe(
      'sangat-panjang-sekali-namanya-le',
    );
  });
});

describe('urls', () => {
  it('uses https, except on localhost', () => {
    expect(clinicUrl('sehat', '/dashboard', 'rzknkbr.xyz')).toBe('https://sehat.rzknkbr.xyz/dashboard');
    expect(clinicUrl('sehat', '/', 'localhost:3000')).toBe('http://sehat.localhost:3000/');
    expect(siteUrl('/signup', 'rzknkbr.xyz')).toBe('https://rzknkbr.xyz/signup');
  });
});

describe('urlOnRequestHost', () => {
  it('keeps the subdomain the browser asked for', () => {
    const request = {
      url: 'http://localhost:3000/auth/handoff',
      headers: new Headers({ host: 'sehat.localhost:3000' }),
    };

    expect(urlOnRequestHost(request, '/dashboard').href).toBe('http://sehat.localhost:3000/dashboard');
  });

  it('follows the proxy headers in production', () => {
    const request = {
      url: 'http://0.0.0.0/auth/handoff',
      headers: new Headers({ host: 'internal', 'x-forwarded-host': 'sehat.rzknkbr.xyz', 'x-forwarded-proto': 'https' }),
    };

    expect(urlOnRequestHost(request, '/login?reason=link').href).toBe('https://sehat.rzknkbr.xyz/login?reason=link');
  });
});
