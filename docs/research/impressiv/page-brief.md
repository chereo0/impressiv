# impressiv.com.sa — home page brief

Source: https://impressiv.com.sa/ (WordPress + Elementor, inspected 2026-11-17 at 1440×900 and 375×812).

## Route map

| Source | Local | Owner files |
| --- | --- | --- |
| `https://impressiv.com.sa/` | `/` | `src/app/page.tsx`, `src/components/sites/impressiv/*` |

Out of scope (links kept pointing at the source): `/work/`, `/about/`, `/approach/`, `/reel/`, `/contact/`, `/work/*` project pages, WhatsApp `wa.link`, social profiles.

## Sections (desktop 1440)

1. **Header** – 76px, transparent over hero, logo `IVSWPLogoSM.png` 160×18 at left 57px, hamburger SVG 44×45 (50px box) at right. Sticky on desktop/tablet; after 300px scroll gets bg `#151515`. Hamburger opens a 380px right-side "push" off-canvas panel (bg `#FFB500`), page dimmed; links Work/About/Approach/Reels/Contact in Montserrat 700 40px `#0F0F0F` letter-spacing .5px, 57px gap; white logo SVG below; close = FA `window-close` square.
2. **Hero** – 765px tall, background video `impressiv_reel-2019_cover-hd.mp4` (autoplay/muted/loop, hidden on phone → `SCCA_2018_cover-SD.jpg`), black overlay 0.3. "We do it live!" Heebo 600 79.2px `#FCB415` centered; button "Contact us!" Raleway 700 16px, black on `#FFB500`, 15px 30px, 45px above, hover text white, wobble-horizontal. Mobile: 300px tall, heading 36px.
3. **How we do it** – bg `#151515`, ~554px, padding-bottom ~100px. Left column (x=160, w≈906): eyebrow Lato 14px ls 1px `#FCB415`; headline Heebo 600 43.2px/51.84 white; "Featured projects" Lato 14px white. Right: vertical yellow line SVG (3×534 scaled to 178 high). Mobile headline 40/48.
4. **Reels** – 727px, bg `#151515`. Left 45%: "Reels" Heebo 700 43.2px `#F1F1F1`; list EVENTS/EXHIBITION/SHOWS/MAKING OFF Lato 600 14px/42px ls 2px uppercase, scroll-parallax translateY. Right 55%: `impressiv-home-reels.jpg` centred, hidden on phone.
5. **Featured work slider** – 400px, 3 slides (KACST / EID Festival 2019 / Saudi National Day 88), bg images cover, heading Roboto 700 35px, description Roboto Slab 17px, "DETAILS" outlined button Roboto 500 15px 12/24 1.6px white border. Autoplay 5s, infinite, slide 500ms, prev/next arrows + bullets (6px, active opacity 1, others .2).
6. **Testimonial** – white, 681px. Yellow vertical line left; "TESTIMONIAL" Roboto 600 32px `#54595F`; "RIYADH INTERNATIONAL BOOK FAIR 2019" Lato 700 14px ls 1px `#FCB415`; quote Heebo 400 28.8px/43.2 `#1C1C1C`.
7. **CTA** – bg `rgba(23,24,28,.97)`; "Let’s do it live together" Montserrat 700 66.24px `#FFB500`; sub Raleway 300 25.6px/40.96 white; "Message us!" outlined yellow button Raleway 700 16px.
8. **Footer** – bg `#151515`. Logo PNG 280 wide; "Office" / "Get in touch with us" Montserrat 700 19.2px `rgba(229,229,229,.21)`; body Raleway/Montserrat 300 19.2/28.8 `#E5E5E5`. Bottom row: © text + FA brand icons `#69727D` (Facebook, Twitter, Behance, LinkedIn, Instagram, WhatsApp).

## Asset map

| Source URL | Local |
| --- | --- |
| /wp-content/uploads/2019/06/impressiv-logo-white.svg | public/sites/impressiv/impressiv-logo-white.svg |
| /wp-content/uploads/2020/02/IVSWPLogoSM.png | public/sites/impressiv/logo-sm.png |
| /wp-content/uploads/2019/06/vertical-line.svg | public/sites/impressiv/vertical-line.svg |
| /wp-content/uploads/2020/03/impressiv_reel-2019_cover-hd.mp4 | public/sites/impressiv/hero-reel.mp4 |
| /wp-content/uploads/2020/03/SCCA_2018_cover-SD.jpg | public/sites/impressiv/hero-poster.jpg |
| /wp-content/uploads/2020/02/impressiv-home-reels.jpg | public/sites/impressiv/reels.jpg |
| /wp-content/uploads/2019/08/home-work-slide1-king-impressiv1.jpg | public/sites/impressiv/slide-kacst.jpg |
| /wp-content/uploads/2020/03/eid-video-cover-impressiv-1.jpg | public/sites/impressiv/slide-eid.jpg |
| /wp-content/uploads/2019/09/saudi-national-day-square3-impressiv.jpg | public/sites/impressiv/slide-national-day.jpg |
| elementor font-awesome webfonts/fa-brands-400.woff2 | public/sites/impressiv/fa-brands-400.woff2 |

Fonts: Google Fonts Heebo, Lato, Montserrat, Raleway, Roboto, Roboto Slab (loaded via `next/font/google`).
