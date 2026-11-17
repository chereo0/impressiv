import Image from "next/image";
import { ReelsList } from "./reels-list";
import { Reveal } from "./reveal";
import { EventTvWall } from "./tv-wall/event-tv-wall";
import { SiteShell } from "./site-shell";
import { WorkSlider } from "./work-slider";
import styles from "./impressiv.module.css";

const SOCIALS = [
  { label: "Facebook", glyph: "", href: "https://www.facebook.com/impressivlive/" },
  { label: "Twitter", glyph: "", href: "https://twitter.com/ImpressIVlive" },
  { label: "Behance", glyph: "", href: "https://www.behance.net/helloa431?tracking_source=search%7Cimpressiv" },
  { label: "LinkedIn", glyph: "", href: "https://www.linkedin.com/company/impressivlive" },
  { label: "Instagram", glyph: "", href: "https://www.instagram.com/impressivlive/" },
  { label: "WhatsApp", glyph: "", href: "http://wa.link/frlwct" },
];

function VerticalLine({ className }: { className?: string }) {
  return (
    <Image
      className={className ? `${styles.vline} ${className}` : styles.vline}
      src="/sites/impressiv/vertical-line.svg"
      alt=""
      width={3}
      height={534}
    />
  );
}

export function ImpressivHome() {
  return (
    <SiteShell>
      <main>
        <EventTvWall />

        <section className={styles.how}>
          <div className={styles.howText}>
            <Reveal>
              <h2 className={styles.eyebrow}>HOW WE DO IT</h2>
              <h2 className={styles.howTitle}>
                We engage the world’s most creative minds to take your projects to a whole new level
              </h2>
              <h2 className={styles.howFoot}>Featured projects</h2>
            </Reveal>
          </div>
          <div className={styles.howLine}>
            <VerticalLine />
          </div>
        </section>

        <section className={styles.reels}>
          <div className={styles.reelsText}>
            <Reveal variant="swing">
              <h2 className={styles.reelsTitle}>
                <a href="https://impressiv.com.sa/reel/">Reels</a>
              </h2>
              <ReelsList />
            </Reveal>
          </div>
          <Reveal variant="rise" className={styles.reelsImageWrap}>
            <div className={styles.reelsImage} role="img" aria-label="Camera operator filming an event" />
          </Reveal>
        </section>

        <Reveal variant="rise">
          <WorkSlider />
        </Reveal>

        <section className={styles.testimonial}>
          <VerticalLine className={styles.testLine} />
          <Reveal>
            <h2 className={styles.testTitle}>TESTIMONIAL</h2>
            <h2 className={styles.testEyebrow}>RIYADH INTERNATIONAL BOOK FAIR 2019</h2>
            <h2 className={styles.testQuote}>
              We planned a good event and we were delivered an incredible experience, that left everyone
              speechless. Our collaboration with ImpressIV went on very smoothly and it was a great pleasure to
              interact with the team.
            </h2>
          </Reveal>
        </section>

        <section className={styles.cta}>
          <Reveal>
            <h2 className={styles.ctaTitle}>Let’s do it live together</h2>
            <h2 className={styles.ctaSub}>
              Tell us a bit about your project and we’ll be in touch with you shortly.
            </h2>
            <a className={styles.ctaButton} href="https://impressiv.com.sa/contact/">
              Message us!
            </a>
          </Reveal>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <div className={styles.footerLogo}>
            <Image src="/sites/impressiv/logo-sm.png" alt="ImpressIV" width={300} height={34} />
          </div>
          <div className={styles.footerCol}>
            <h3 className={styles.footerLabel}>Office</h3>
            <h3 className={styles.footerBody}>
              3896 Prince Muqrin Ibn Abdulaziz
              <br />
              7553 Al Nuzha District, 12474 Riyadh,
              <br />
              Kingdom of Saudi Arabia
            </h3>
          </div>
          <div className={styles.footerCol}>
            <h3 className={styles.footerLabel}>Get in touch with us</h3>
            <h3 className={`${styles.footerBody} ${styles.footerMont}`}>
              <a href="mailto:hello@impressiv.com.sa">hello@impressiv.com.sa</a>
              <br />
              <a href="tel:0118123338">0118123338</a>
              <br />
              <a href="tel:0566061682">0566061682</a>
            </h3>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <h3 className={styles.copy}>© 2011 - 2026 ImpressIV. All rights reserved.</h3>
          <div className={styles.socials}>
            {SOCIALS.map((s) => (
              <a key={s.label} className={styles.social} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}>
                <span aria-hidden="true">{s.glyph}</span>
              </a>
            ))}
          </div>
        </div>
      </footer>
    </SiteShell>
  );
}
