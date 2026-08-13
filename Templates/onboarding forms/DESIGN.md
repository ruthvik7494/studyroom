---
name: Executive Study Marketplace
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#3e4a3d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#6e7b6c'
  outline-variant: '#bdcaba'
  surface-tint: '#006e2d'
  primary: '#006b2c'
  on-primary: '#ffffff'
  primary-container: '#00873a'
  on-primary-container: '#f7fff2'
  inverse-primary: '#62df7d'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#4f5d72'
  on-tertiary: '#ffffff'
  tertiary-container: '#67758c'
  on-tertiary-container: '#fdfcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#7ffc97'
  primary-fixed-dim: '#62df7d'
  on-primary-fixed: '#002109'
  on-primary-fixed-variant: '#005320'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#d5e3fd'
  tertiary-fixed-dim: '#b9c7e0'
  on-tertiary-fixed: '#0d1c2f'
  on-tertiary-fixed-variant: '#3a485c'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-xl:
    fontFamily: Lexend
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Lexend
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Lexend
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Lexend
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max-width: 1280px
  gutter: 24px
  margin-desktop: 64px
  margin-tablet: 32px
  margin-mobile: 16px
  section-padding: 80px
---

## Brand & Style

The design system is engineered for a premium, high-focus environment that bridges the gap between academic rigor and executive professionalism. The target audience includes serious students, researchers, and remote professionals who seek high-quality, curated study and co-working environments.

The visual style is **Corporate / Modern** with a lean toward **Glassmorphism**. It prioritizes clarity and serenity through a light-mode interface that utilizes subtle depth, blurred glass textures, and expansive whitespace. The emotional response should be one of "quiet confidence"—a digital space that feels safe, organized, and conducive to deep cognitive work.

## Colors

The palette is rooted in productivity and stability. 

- **Primary (Emerald Green):** Used strategically for primary actions, success states, and key brand moments. It represents growth and focus.
- **Secondary (Dark Slate):** Reserved for headers, navigation backgrounds, and primary text to establish immediate authority and structure.
- **Neutral (Soft Warm-Gray):** The foundation of the UI. This low-contrast background reduces eye strain during long sessions.
- **Accent (Glass):** Semi-transparent white layers are used for elevated surfaces to maintain a sense of lightness and depth without clutter.

## Typography

The system employs a dual-font strategy. **Lexend** is utilized for headlines to provide a modern, accessible, and structured feel that aids readability. **Inter** is used for all body copy and functional UI labels, providing a neutral and systematic foundation that disappears into the content, allowing the user to focus on information.

Large headlines (XL and LG) should be used sparingly to define clear section entry points. Body copy should prioritize the "Medium" (16px) size for maximum accessibility during extended reading.

## Layout & Spacing

This design system follows a **Fixed Grid** philosophy for desktop to maintain an "executive" and controlled feel, switching to a fluid model for tablet and mobile. 

- **Grid:** A 12-column grid is used for desktop (1280px max-width).
- **Rhythm:** An 8px linear scale governs all padding and margins. 
- **Generous Whitespace:** Section vertical padding is intentionally large (80px+) to separate distinct marketplace offerings and prevent cognitive overload.
- **Mobile Reflow:** On mobile, 12 columns collapse to 4. Margins are reduced to 16px to maximize screen real estate while maintaining a safe "breathing room" around elements.

## Elevation & Depth

Depth is achieved through **Glassmorphism** and **Ambient Shadows**. 

1.  **Base Layer:** The Soft Warm-Gray background (#f8fafc).
2.  **Surface Layer (Cards):** Pure white or 70% translucent white with a `backdrop-blur` of 12px. These surfaces use a very soft, diffused shadow (15% opacity of the Secondary Dark Slate color) with a large blur radius (20px-30px).
3.  **Interactive Layer (Hover/Active):** Elements should slightly lift on hover, increasing the shadow spread and reducing the transparency of the glass effect.

Avoid hard borders; use a 1px inner stroke of white (20% opacity) on glass cards to simulate a light-catching edge.

## Shapes

The shape language is defined by large, welcoming radii. 

- **Primary Cards:** Use a consistent 24px corner radius to evoke a "premium and soft" architectural feel.
- **Standard Components:** Buttons and input fields follow the `rounded-lg` (1rem / 16px) standard to maintain harmony with the larger cards.
- **Chips/Badges:** These are fully pill-shaped (rounded-full) to distinguish them from interactive buttons.

## Components

- **Buttons:** Primary buttons use the Emerald Green background with white Lexend Bold text. High-emphasis buttons should have a slight 2px shadow in the primary color.
- **Cards:** The signature component of the marketplace. Must feature the 24px radius, the glass backdrop-blur, and a subtle light-gray border (1px). Content inside cards should have at least 24px of internal padding.
- **Input Fields:** Soft-gray backgrounds with 16px rounding. The focus state uses a 2px Emerald Green border and a subtle glow.
- **Chips/Status:** For "Available" or "Booked" status. Use a low-saturation version of the status color for the background and a high-saturation version for the text.
- **Lists:** Horizontal separators should be extremely light (5% opacity of Secondary color) or replaced entirely by whitespace and alignment.
- **Additional Components:** "Quiet Meters" (a visual scale showing how quiet a hall is) and "Amenities Icons" should be rendered in the Secondary Dark Slate color at 60% opacity for a sophisticated, understated look.