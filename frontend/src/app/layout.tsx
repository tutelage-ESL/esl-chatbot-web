import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";
import "../styles/tts-status.css";
import "../styles/modern-navigation.css";

// Optimized font loading with display=swap for better performance
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: 'swap',
  preload: true,
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: "ESL Academy - Interactive English Learning Platform",
  description: "Master English with AI-powered conversations, voice practice, and personalized learning paths",
  keywords: "ESL, English learning, AI tutor, voice practice, language learning",
  authors: [{ name: "ESL Academy Team" }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#1e40af",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "ESL Academy - Interactive English Learning",
    description: "Master English with AI-powered conversations and personalized learning",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <head>
        {/* Preload critical CSS files for instant theme switching */}
        <link rel="preload" href="/styles/classic-theme.css" as="style" />
        <link rel="preload" href="/styles/enhanced-theme.css" as="style" />
        
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        
        {/* Preconnect to improve font loading performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <ThemeProvider defaultTheme="enhanced">
          <div id="root" className="app-root">
            {children}
          </div>
        </ThemeProvider>
        
        {/* Performance monitoring script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Monitor Core Web Vitals
              if (typeof window !== 'undefined') {
                window.addEventListener('load', () => {
                  if ('performance' in window) {
                    const navigation = performance.getEntriesByType('navigation')[0];
                    console.log('Page Load Performance:', {
                      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
                      totalTime: navigation.loadEventEnd - navigation.fetchStart
                    });
                  }
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
