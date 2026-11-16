import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { Header } from "@/components/Header";
import { MarketProvider } from "@/components/MarketProvider";
import "./globals.css";

// One family. Its width axis gives the wide capitals used for headings (see .display in globals.css).
const archivo = Archivo({
  variable: "--font-body",
  subsets: ["latin"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: {
    default: "Marketplace · Buy and sell near you",
    template: "%s · Marketplace",
  },
  description: "A Facebook-style marketplace. List something in a minute, browse by category, and message sellers.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children, modal }: LayoutProps<"/">) {
  return (
    <html lang="en" className={archivo.variable}>
      <body>
        <MarketProvider>
          {/* The listing modal marks this wrapper inert while it's open. */}
          <div id="page">
            <a href="#main" className="sr-only">
              Skip to content
            </a>
            <Header />
            {children}
          </div>
          {modal}
        </MarketProvider>
      </body>
    </html>
  );
}
