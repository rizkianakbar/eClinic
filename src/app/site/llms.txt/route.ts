import { getTranslations } from 'next-intl/server';
import { JOURNEY } from '@/features/visits/visits.constants';
import { clinicUrl, DEMO_SLUG, siteUrl } from '@/lib/tenant';

// /llms.txt (llmstxt.org): a plain summary of the product for AI assistants and answer engines. Built from the same
// messages as the landing, so it never claims more than the page does.
export const dynamic = 'force-static';

export async function GET() {
  const t = await getTranslations({ locale: 'id', namespace: 'site' });
  const body = [
    '# e-clinic',
    '',
    `> ${t('meta.description')}`,
    '',
    t('hero.lead'),
    '',
    '## Alur kunjungan',
    '',
    ...JOURNEY.map((station) => `- ${t(`journey.stations.${station.status}.title`)}`),
    '',
    '## Halaman',
    '',
    `- [Beranda](${siteUrl('/')}): ${t('meta.title')}`,
    `- [Daftarkan klinik](${siteUrl('/signup')}): ${t('meta.signupDescription')}`,
    `- [Klinik demo](${clinicUrl(DEMO_SLUG, '/login')}): ${t('hero.demoNote')}`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
}
