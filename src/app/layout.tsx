import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Script from 'next/script';
import { Providers } from './providers';
import './globals.css';

// Tokotype's typeface for Jakarta: highly legible, friendly, local.
const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: { default: 'e-clinic', template: '%s · e-clinic' },
  description: 'Sistem manajemen klinik pratama',
  applicationName: 'e-clinic',
};

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

export default function RootLayout(props: LayoutProps<'/'>) {
  return (
    <html lang="id" className={`${jakarta.variable} h-full antialiased`} suppressHydrationWarning>
      {/* Browser extensions add attributes to <body> before hydration. */}
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <Providers>{props.children}</Providers>
        <Script id="text-size" strategy="beforeInteractive">
          {TEXT_SIZE_SCRIPT}
        </Script>
      </body>
    </html>
  );
}
