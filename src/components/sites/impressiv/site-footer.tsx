import Image from "next/image";
import { cn } from "@/lib/utils";
import styles from "./impressiv.module.css";

const SOCIALS = [
  { label: "Facebook", glyph: "", href: "https://www.facebook.com/impressivlive/" },
  { label: "Twitter", glyph: "", href: "https://twitter.com/ImpressIVlive" },
  { label: "Behance", glyph: "", href: "https://www.behance.net/helloa431?tracking_source=search%7Cimpressiv" },
  { label: "LinkedIn", glyph: "", href: "https://www.linkedin.com/company/impressivlive" },
  { label: "Instagram", glyph: "", href: "https://www.instagram.com/impressivlive/" },
  { label: "WhatsApp", glyph: "", href: "http://wa.link/frlwct" },
];

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerTop}>
        <div className={styles.footerLogo}>
          <Image src="/sites/impressiv/logo-sm.png" alt="ImpressIV" width={300} height={34} />
        </div>
        <div className={styles.footerCol}>
          <h3 className={styles.footerLabel}>Office</h3>
          <p className={styles.footerBody}>
            3896 Prince Muqrin Ibn Abdulaziz
            <br />
            7553 Al Nuzha District, 12474 Riyadh,
            <br />
            Kingdom of Saudi Arabia
          </p>
        </div>
        <div className={styles.footerCol}>
          <h3 className={styles.footerLabel}>Get in touch with us</h3>
          <p className={cn(styles.footerBody, styles.footerMont)}>
            <a href="mailto:hello@impressiv.com.sa">hello@impressiv.com.sa</a>
            <br />
            <a href="tel:0118123338">0118123338</a>
            <br />
            <a href="tel:0566061682">0566061682</a>
          </p>
        </div>
      </div>
      <div className={styles.footerBottom}>
        <p className={styles.copy}>© 2011 - 2026 ImpressIV. All rights reserved.</p>
        <div className={styles.socials}>
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              className={styles.social}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
            >
              <span aria-hidden="true">{s.glyph}</span>
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
