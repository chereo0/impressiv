import Image from "next/image";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";
import { SiteShell } from "./site-shell";
import { PROJECTS } from "./venue/content";
import { VenueExperience } from "./venue/venue-experience";
import styles from "./impressiv.module.css";
import v from "./venue/venue.module.css";

const REEL = "https://impressiv.com.sa/reel/";

const SOCIALS = [
  { label: "Facebook", glyph: "", href: "https://www.facebook.com/impressivlive/" },
  { label: "Twitter", glyph: "", href: "https://twitter.com/ImpressIVlive" },
  { label: "Behance", glyph: "", href: "https://www.behance.net/helloa431?tracking_source=search%7Cimpressiv" },
  { label: "LinkedIn", glyph: "", href: "https://www.linkedin.com/company/impressivlive" },
  { label: "Instagram", glyph: "", href: "https://www.instagram.com/impressivlive/" },
  { label: "WhatsApp", glyph: "", href: "http://wa.link/frlwct" },
];

/**
 * The home page is a walk through one event hall. Each section below is a camera
 * stop (`data-station`, in order); its panel stays pinned while the camera arrives.
 */
export function ImpressivHome() {
  return (
    <SiteShell scene={<VenueExperience />}>
      <main className={v.main}>
        {/* 0 · entrance */}
        <section className={v.station} data-station="entrance" aria-label="Welcome">
          <div className={cn(v.sticky, v.center)}>
            <Reveal variant="rise" className={cn(v.panel, v.bare)}>
              <p className={v.eyebrow}>Live events · Exhibitions · Shows</p>
              <h1 className={v.heroTitle}>We do it live!</h1>
              <p className={v.heroSub}>
                ImpressIV produces events, exhibitions and shows across the Kingdom, from concept to the last cue.
              </p>
              <a className={v.button} href="http://wa.link/frlwct">
                Contact us!
              </a>
              <p className={v.scrollHint}>SCROLL TO STEP INSIDE ↓</p>
            </Reveal>
          </div>
        </section>

        {/* 1 · the hall */}
        <section className={v.station} data-station="hall" aria-labelledby="how-title">
          <div className={cn(v.sticky, v.left)}>
            <Reveal className={v.panel}>
              <p className={v.eyebrow}>How we do it</p>
              <h2 id="how-title" className={v.title}>
                We engage the world’s most creative minds to take your projects to a whole new level
              </h2>
              <p className={v.body}>
                Stage design, LED and lighting, sound, content and show calling. One team runs the whole night.
              </p>
              <p className={v.meta}>Featured projects ↓</p>
            </Reveal>
          </div>
        </section>

        {/* 2 · LED cube */}
        <section className={v.station} data-station="cube" aria-labelledby="reels-title">
          <div className={cn(v.sticky, v.left)}>
            <Reveal variant="swing" className={v.panel}>
              <h2 id="reels-title" className={v.reelsTitle}>
                <a href={REEL}>Reels</a>
              </h2>
              <div className={v.reelsList}>
                {["Events", "Exhibition", "Shows", "Making off"].map((item) => (
                  <a key={item} href={REEL}>
                    {item.toUpperCase()}
                  </a>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* 3 · project screens */}
        <section className={v.station} data-station="screens" aria-labelledby="work-title">
          <div className={cn(v.sticky, v.right)}>
            <Reveal className={v.panel}>
              <p className={v.eyebrow}>On the screens</p>
              <h2 id="work-title" className={v.title}>
                Featured work
              </h2>
              <div className={v.projects}>
                {PROJECTS.map((p) => (
                  <a key={p.title} className={v.project} href={p.href}>
                    <Image className={v.projectThumb} src={p.image} alt="" width={220} height={124} />
                    <span>
                      <span className={v.projectTitle}>{p.title}</span>
                      <span className={v.projectSub}>{p.subtitle}</span>
                    </span>
                  </a>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* 4 · in the crowd */}
        <section className={v.station} data-station="crowd" aria-labelledby="test-title">
          <div className={cn(v.sticky, v.center, v.bottom)}>
            <Reveal className={cn(v.panel, v.panelWide)}>
              <p id="test-title" className={v.eyebrow}>
                Testimonial · Riyadh International Book Fair 2019
              </p>
              <p className={v.quote}>
                “We planned a good event and we were delivered an incredible experience, that left everyone
                speechless. Our collaboration with ImpressIV went on very smoothly and it was a great pleasure to
                interact with the team.”
              </p>
            </Reveal>
          </div>
        </section>

        {/* 5 · on stage */}
        <section className={v.station} data-station="stage" aria-labelledby="cta-title">
          <div className={cn(v.sticky, v.center, v.bottom)}>
            <Reveal variant="rise" className={cn(v.panel, v.bare)}>
              <h2 id="cta-title" className={v.ctaTitle}>
                Let’s do it live together
              </h2>
              <p className={v.heroSub}>Tell us a bit about your project and we’ll be in touch with you shortly.</p>
              <a className={v.buttonGhost} href="https://impressiv.com.sa/contact/">
                Message us!
              </a>
            </Reveal>
          </div>
        </section>
      </main>

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
    </SiteShell>
  );
}
