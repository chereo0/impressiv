import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";
import { SiteFooter } from "./site-footer";
import { SiteShell } from "./site-shell";
import { AnimatedText, CountUp } from "./venue/animated-text";
import { ClientMarquee } from "./venue/marquee";
import { VenueExperience } from "./venue/venue-experience";
import { WorkGallery } from "./venue/work-gallery";
import ui from "./venue/ui.module.css";
import v from "./venue/venue.module.css";

const REEL = "https://impressiv.com.sa/reel/";

/**
 * The home page is a walk through one event hall. Each section is a camera stop
 * (`data-station`, in page order); Work owns one stop per project.
 */
export function ImpressivHome() {
  return (
    <SiteShell scene={<VenueExperience />}>
      <main className={v.main}>
        {/* entrance */}
        <section className={v.station} data-station="entrance" data-chapter="Entrance" aria-label="Welcome">
          <div className={cn(v.sticky, v.center)}>
            <Reveal variant="rise" className={cn(v.panel, v.bare)}>
              <p className={v.eyebrow}>Live events · Exhibitions · Shows</p>
              <AnimatedText as="h1" className={v.heroTitle} text="We do it live!" delay={300} />
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

        {/* the hall */}
        <section className={v.station} data-station="hall" data-chapter="The hall" aria-labelledby="how-title">
          <div className={cn(v.sticky, v.left)}>
            <Reveal className={v.panel}>
              <p className={v.eyebrow}>How we do it</p>
              <AnimatedText
                id="how-title"
                className={v.title}
                text="We engage the world’s most creative minds to take your projects to a whole new level"
              />
              <p className={v.body}>
                Stage design, LED and lighting, sound, content and show calling. One team runs the whole night.
              </p>
            </Reveal>
          </div>
        </section>

        {/* LED cube */}
        <section className={v.station} data-station="cube" data-chapter="Reels" aria-labelledby="reels-title">
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

        {/* one stop per project screen */}
        <WorkGallery />

        {/* in the crowd */}
        <section className={v.station} data-station="crowd" data-chapter="The crowd" aria-labelledby="test-title">
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
              <div className={ui.stats}>
                <div className={ui.stat}>
                  <b>
                    <CountUp to={2011} duration={1800} />
                  </b>
                  <span>Live since</span>
                </div>
                <div className={ui.stat}>
                  <b>
                    <CountUp to={50} suffix="+" />
                  </b>
                  <span>Projects on our work page</span>
                </div>
                <div className={ui.stat}>
                  <b className={ui.statText}>LEAP · GITEX</b>
                  <span>Pavilions & booths</span>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* on stage */}
        <section className={v.station} data-station="stage" data-chapter="On stage" aria-labelledby="cta-title">
          <div className={cn(v.sticky, v.center, v.bottom)}>
            <Reveal variant="rise" className={cn(v.panel, v.bare)}>
              <AnimatedText id="cta-title" className={v.ctaTitle} text="Let’s do it live together" />
              <p className={v.heroSub}>Tell us a bit about your project and we’ll be in touch with you shortly.</p>
              <a className={v.buttonGhost} href="https://impressiv.com.sa/contact/">
                Message us!
              </a>
            </Reveal>
          </div>
        </section>
      </main>

      <ClientMarquee />

      <SiteFooter />
    </SiteShell>
  );
}
