import type { ReactNode } from "react";
import type { Metadata } from "next";
import { ThemeProvider } from "@cruisin/ui";
import "./globals.css";
import "@cruisin/ui/styles.css";
export const metadata: Metadata = {
  title: "CRUISIN Employee Portal",
  description: "Secure CRUISIN operations",
  robots: { index: false, follow: false },
};
export interface RootLayoutProps {
  children: ReactNode;
}
export default function RootLayout({ children }: RootLayoutProps): ReactNode {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
