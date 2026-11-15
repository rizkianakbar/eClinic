import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';
import { JOURNEY } from '@/features/visits/visits.constants';

// Link previews (WhatsApp, Slack, X) of any page. Same look as the login hero; Bahasa, like printouts.
export const alt = 'e-clinic';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// The journey colours of the login hero (--line-* tokens), on the dark green canvas.
const STATION_DOTS = ['#d4952b', '#3a7bd5', '#7a5bd1', '#22936f', '#8fa29d'];

export default async function OpengraphImage() {
  const t = await getTranslations({ locale: 'id' });

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 80,
        color: '#ffffff',
        backgroundImage: 'radial-gradient(120% 80% at 0% 0%, #1d5c4c 0%, #0f2f28 55%, #0b221d 100%)',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <svg width="64" height="64" viewBox="0 0 32 32" role="img" aria-label="e-clinic">
          <rect width="32" height="32" rx="8" fill="#17735c" />
          <path
            d="M8.5 13.2c0-2.6 2-4.5 4.4-4.5 1.4 0 2.5.6 3.1 1.6.6-1 1.7-1.6 3.1-1.6 2.4 0 4.4 1.9 4.4 4.5 0 4.3-5.2 7.9-7.5 9.6-2.3-1.7-7.5-5.3-7.5-9.6Z"
            fill="none"
            stroke="#fff"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <path
            d="M9.5 15.5h3.2l1.4-2.4 2.2 4.4 1.5-2h4.7"
            fill="none"
            stroke="#fff"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span style={{ fontSize: 40 }}>e-clinic</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
        <div style={{ display: 'flex', maxWidth: 1000, fontSize: 60, lineHeight: 1.15, letterSpacing: -1 }}>
          {t('auth.login.tagline')}
        </div>
        <div style={{ display: 'flex', width: 900 }}>
          {JOURNEY.map((station, index) => (
            <div
              key={station.status}
              style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              {index < JOURNEY.length - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 10,
                    left: '50%',
                    width: '100%',
                    height: 4,
                    background: STATION_DOTS[index],
                  }}
                />
              )}
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  background: STATION_DOTS[index],
                  border: '6px solid #0f2f28',
                  boxSizing: 'content-box',
                  marginTop: -6,
                }}
              />
              <span style={{ marginTop: 14, fontSize: 26, color: 'rgba(255,255,255,0.75)' }}>
                {t(`journey.${station.status}.short`)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', fontSize: 28, color: 'rgba(255,255,255,0.6)' }}>{t('auth.login.modules')}</div>
    </div>,
    size,
  );
}
