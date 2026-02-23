# Investor Frontend — Performance & Google-Ready Checklist

Use this checklist to keep the investor area aligned with Core Web Vitals, mobile-first UX, and accessibility. **Do not redesign the product**; focus on technical frontend improvements.

---

## 1. Core Web Vitals

### LCP (Largest Contentful Paint)
- [ ] **Images:** Use `next/image` (or `InvestorImage`) for all property/media images. No raw `<img>` for content images.
- [ ] **Formats:** Rely on Next.js config (`images.formats: ['image/avif', 'image/webp']`) for modern formats.
- [ ] **Dimensions:** Always reserve space: use `width`/`height` or a wrapper with fixed aspect ratio (e.g. `aspect-[4/3]`) so layout doesn’t shift.
- [ ] **Hero / above-the-fold:** Set `priority` on the main LCP image (e.g. first carousel slide). Do **not** lazy-load the hero image.
- [ ] **Below-the-fold:** Use `loading="lazy"` (or `lazy={true}` on `InvestorImage`) for images that are not in the initial viewport.
- [ ] **Sizes:** Provide a sensible `sizes` attribute so the browser can choose the right resolution (e.g. `(max-width: 640px) 100vw, 33vw`).

### CLS (Cumulative Layout Shift)
- [ ] **Reserve space:** Images, banners, charts, and dynamic content have fixed height or aspect-ratio containers (skeletons with fixed height when loading).
- [ ] **Avoid late-injected UI:** Don’t inject tooltips, alerts, or async cards in a way that pushes main content down after load.
- [ ] **Fonts:** Use `font-display: swap` and preload critical fonts (already set in root layout for Inter).
- [ ] **Loading states:** Use skeleton placeholders with the same approximate dimensions as final content instead of spinners that change layout.

### INP (Interaction to Next Paint)
- [ ] **Main thread:** Split heavy components; defer non-critical scripts.
- [ ] **Re-renders:** Use memoization and virtualization for long lists where appropriate.
- [ ] **Inputs:** Debounce search and expensive filters.
- [ ] **Animation:** Prefer CSS animations over JS-heavy animation where possible.

---

## 2. Mobile-First & Responsive

- [ ] All investor pages are fully responsive and usable on mobile.
- [ ] Same essential content on mobile and desktop (no important sections hidden only on mobile).
- [ ] Touch targets are at least 44×44px for buttons, dropdowns, and filters.
- [ ] No horizontal scroll; tables use responsive patterns (stacked rows, cards, or horizontal scroll with clear affordance).

---

## 3. UX Consistency & Design System

- [ ] **Spacing:** Use a consistent spacing scale (e.g. Tailwind spacing).
- [ ] **Typography:** Consistent typography scale and heading hierarchy across pages.
- [ ] **Buttons:** Consistent button styles (primary, secondary, ghost) and sizes.
- [ ] **Cards:** Consistent card styles (radius, shadows, borders).
- [ ] **Hierarchy:** Headings, sections, and CTAs are predictable across pages.
- [ ] Avoid stacking multiple transparency layers that reduce readability.

---

## 4. Non-Intrusive UI

- [ ] Avoid blocking popups/overlays on mobile; prefer inline or compact patterns.
- [ ] Toasts/alerts are compact and non-blocking (e.g. Sonner with `closeButton`, reasonable `duration`).

---

## 5. Structured Data (if public pages exist)

- [ ] Where relevant, add JSON-LD (Organization, Article, Breadcrumbs) that matches visible content.
- [ ] Do **not** add schema that doesn’t match what users see.

---

## 6. Accessibility

- [ ] **Contrast:** Text and UI meet WCAG contrast requirements.
- [ ] **Focus:** Visible focus states and keyboard navigation for interactive elements.
- [ ] **Icon buttons:** All icon-only buttons have `aria-label` or a `sr-only` text label.
- [ ] **Semantic HTML:** Use correct heading levels and semantic sections (`<header>`, `<main>`, `<nav>`, etc.).

---

## Quick Reference: InvestorImage

For property/content images in the investor app:

- **Above-the-fold hero:** `priority`, no `lazy`.
- **Below-the-fold:** `lazy`, fixed aspect container (e.g. `aspectRatio="4/3"`), optional `sizes`.
- **Thumbnails:** `lazy`, small `sizes` (e.g. `64px`), `fallbackIconSize="sm"` if desired.

File: `components/investor/investor-image.tsx`.
