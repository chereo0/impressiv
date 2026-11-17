import type { Metadata } from "next";
import { Heebo, Lato, Montserrat, Raleway, Roboto, Roboto_Slab } from "next/font/google";
import "./globals.css";

const heebo = Heebo({ variable: "--font-heebo", subsets: ["latin"], weight: ["400", "600", "700"] });
const lato = Lato({ variable: "--font-lato", subsets: ["latin"], weight: ["400", "700"] });
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});
const raleway = Raleway({ variable: "--font-raleway", subsets: ["latin"], weight: ["300", "400", "700"] });
const roboto = Roboto({ variable: "--font-roboto", subsets: ["latin"], weight: ["500", "600", "700"] });
const robotoSlab = Roboto_Slab({ variable: "--font-roboto-slab", subsets: ["latin"], weight: ["400"] });
export const metadata: Metadata = {
  title: "ImpressIV – We do it live",
  description: "ImpressIV – live event production, exhibitions and shows in Riyadh.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={[heebo, lato, montserrat, raleway, roboto, robotoSlab].map((f) => f.variable).join(" ")}
    >
      <body>{children}</body>
    </html>
  );
}
