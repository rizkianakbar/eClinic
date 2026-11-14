import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Script from 'next/script';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { Providers } from './providers';
import './globals.css';

// Tokotype's typeface for Jakarta: highly legible, friendly, local.
const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  const description = `${t('app.description')}. ${t('auth.login.modules')}.`;

  // On Vercel, metadataBase defaults to the deployment URL, so the og:image URL is absolute without config.
  return {
    title: { default: 'e-clinic', template: '%s · e-clinic' },
    description,
    applicationName: 'e-clinic',
    // Staff pages carry patient data; only /login opts back in to indexing.
    robots: { index: false, follow: false },
    openGraph: { type: 'website', siteName: 'e-clinic', title: 'e-clinic', description, locale: 'id_ID' },
    twitter: { card: 'summary_large_image', title: 'e-clinic', description },
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

// Applies the saved text size before first paint (no flash of the wrong size).
const TEXT_SIZE_SCRIPT = `try{var s=localStorage.getItem("e-clinic:text-size");if(s==="large"||s==="xlarge")document.documentElement.dataset.textSize=s}catch(e){}`;

export default async function RootLayout(props: LayoutProps<'/'>) {
  return (
    <html lang={await getLocale()} className={`${jakarta.variable} h-full antialiased`} suppressHydrationWarning>
      {/* Browser extensions add attributes to <body> before hydration. */}
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        {/* Messages come from the request config (i18n/request.ts) in the user's language. */}
        <NextIntlClientProvider>
          <Providers>{props.children}</Providers>
        </NextIntlClientProvider>
        <Script id="text-size" strategy="beforeInteractive">
          {TEXT_SIZE_SCRIPT}
        </Script>
      </body>
    </html>
  );
}
