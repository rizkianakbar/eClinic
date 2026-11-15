import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Script from 'next/script';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { getHostTenant } from '@/lib/auth';
import { Providers } from './providers';
import './globals.css';

// Tokotype's typeface for Jakarta: highly legible, friendly, local. The variable font is one file for every weight
// (five static weights were five downloads racing on a slow phone, delaying the headline's paint).
const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  const description = `${t('app.description')}. ${t('auth.login.modules')}.`;

  // On Vercel, metadataBase defaults to the deployment URL, so the og:image URL is absolute without config.
  return {
    title: { default: 'eClinic', template: '%s · eClinic' },
    description,
    applicationName: 'eClinic',
    // Staff pages carry patient data; only /login opts back in to indexing.
    robots: { index: false, follow: false },
    openGraph: { type: 'website', siteName: 'eClinic', title: 'eClinic', description, locale: 'id_ID' },
    twitter: { card: 'summary_large_image', title: 'eClinic', description },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: '#ffffff', // matches the white header bar
  colorScheme: 'light',
};

// The marketing site's client components read only these. Sending the whole catalogue (every clinic screen, ~110 KB)
// inline in each landing page's HTML would put it on the critical path of the first paint.
const SITE_NAMESPACES = ['site', 'tenants', 'journey', 'common', 'errors', 'validation'] as const;

async function clientMessages() {
  const [tenant, messages] = await Promise.all([getHostTenant(), getMessages()]);

  if (tenant.kind !== 'site') return messages;

  return Object.fromEntries(SITE_NAMESPACES.map((namespace) => [namespace, messages[namespace]]));
}

// Applies the saved text size before first paint (no flash of the wrong size).
const TEXT_SIZE_SCRIPT = `try{var s=localStorage.getItem("eClinic:text-size");if(s==="large"||s==="xlarge")document.documentElement.dataset.textSize=s}catch(e){}`;

export default async function RootLayout(props: LayoutProps<'/'>) {
  const [locale, messages] = await Promise.all([getLocale(), clientMessages()]);

  return (
    <html lang={locale} className={`${jakarta.variable} h-full antialiased`} suppressHydrationWarning>
      {/* Browser extensions add attributes to <body> before hydration. */}
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        {/* Messages come from the request config (i18n/request.ts) in the user's language. */}
        <NextIntlClientProvider messages={messages}>
          <Providers>{props.children}</Providers>
        </NextIntlClientProvider>
        <Script id="text-size" strategy="beforeInteractive">
          {TEXT_SIZE_SCRIPT}
        </Script>
      </body>
    </html>
  );
}
