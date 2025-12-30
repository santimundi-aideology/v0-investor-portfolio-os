# Design System Documentation

## Overview

This document describes the comprehensive design system implemented for the Investor Portfolio OS application. The design system features a modern, premium aesthetic with a forest green and warm gold color palette, optimized for real estate investment professionals.

## Color Palette

### Primary Brand Colors

- **Deep Forest Green**: `#1A4D2E` (Primary)
- **Forest Green Hover**: `#2D5F3F` (Primary Hover)
- **Warm Gold**: `#D4AF37` (Accent)
- **Amber**: `#F5A623` (Accent Hover)

### Neutral Colors

- **Pure White**: `#FFFFFF` (Background)
- **Warm Gray**: `#F8F9FA` (Surface Warm, Muted)
- **Medium Gray**: `#6C757D` (Muted Foreground)
- **Dark Charcoal**: `#2C3E50` (Primary Text)
- **Border Gray**: `#E5E7EB` (Borders, Inputs)

### Semantic Colors

- **Success**: `#28A745`
- **Info**: `#17A2B8`
- **Destructive**: `#DC3545`

### Dark Mode Colors

- **Background**: `#0F1419`
- **Surface**: `#1A1F2E`
- **Text**: `#E5E7EB`
- **Primary (Light)**: `#3A7D5C`

## Typography

### Font Family

- **Primary**: Inter (with fallback to SF Pro Display, Segoe UI, system-ui)
- **Monospace**: System monospace fonts

### Font Weights

- **Regular**: 400 (Body text)
- **Medium**: 500 (Labels, small emphasis)
- **Semibold**: 600 (Headings, buttons)
- **Bold**: 700 (Hero headings)

### Type Scale

```css
/* Hero Headings */
font-size: clamp(3rem, 6vw, 4rem)
font-weight: 700
line-height: 1.1
letter-spacing: -0.02em

/* Section Headings (h2) */
font-size: clamp(2rem, 4vw, 2.5rem)
font-weight: 600
line-height: 1.2

/* Subsection Headings (h3) */
font-size: clamp(1.5rem, 3vw, 1.75rem)
font-weight: 600
line-height: 1.3

/* Body Text */
font-size: 16-18px
font-weight: 400
line-height: 1.6

/* Small Text */
font-size: 14px
font-weight: 500
```

## Spacing System (8px Grid)

- **Micro**: 8px (0.5rem), 12px (0.75rem)
- **Small**: 16px (1rem), 24px (1.5rem)
- **Medium**: 32px (2rem), 40px (2.5rem)
- **Large**: 48px (3rem), 64px (4rem)
- **XL**: 80px (5rem), 96px (6rem)

## Border Radius

- **Small**: 8px (0.5rem)
- **Medium**: 12px (0.75rem)
- **Large**: 16px (1rem)
- **XL**: 20px (1.25rem)

Components use rounded corners consistently:
- Cards: 16px
- Buttons: 12px
- Inputs: 12px
- Badges: Full rounded (pill shape)

## Shadows

- **SM**: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
- **Default**: `0 4px 20px rgba(0, 0, 0, 0.08)`
- **MD**: `0 8px 30px rgba(0, 0, 0, 0.12)`
- **LG**: `0 12px 40px rgba(0, 0, 0, 0.15)`

## Component Styling

### Cards

```css
background: white
border-radius: 16px
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08)
padding: 24px
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)

/* Hover State */
transform: translateY(-4px)
box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12)
```

**Usage**: Add `hover` prop to Card component for interactive cards.

### Buttons

#### Primary Button (Default)

```css
background: linear-gradient(135deg, #1A4D2E 0%, #2D5F3F 100%)
color: white
padding: 14px 32px (py-3.5 px-8)
border-radius: 12px
font-weight: 600
font-size: 16px

/* Hover */
transform: scale(1.02)
filter: brightness(1.1)

/* Active */
transform: scale(0.98)
```

#### Secondary/Outline Button

```css
background: transparent
border: 2px solid #1A4D2E
color: #1A4D2E

/* Hover */
background: #1A4D2E
color: white
```

#### Button Variants

- `default`: Primary gradient button
- `outline`: Secondary with border
- `destructive`: Red for delete actions
- `ghost`: Transparent, minimal
- `accent`: Gold/amber gradient
- `success`: Green for positive actions

**Sizes**: `sm`, `default`, `lg`, `icon`, `icon-sm`, `icon-lg`

### Input Fields

```css
border: 2px solid #E5E7EB
border-radius: 12px
padding: 14px 16px (py-3.5 px-4)
font-size: 16px
height: 44px (11 * 0.25rem)

/* Focus State */
border-color: #1A4D2E
box-shadow: 0 0 0 3px rgba(26, 77, 46, 0.1)

/* Hover State */
border-color: rgba(26, 77, 46, 0.5)
```

### Badges

```css
display: inline-flex
padding: 6px 12px
border-radius: 999px (full rounded)
font-size: 14px
font-weight: 600
background: varies by variant
box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05)

/* Hover (for links) */
transform: scale(1.05)
```

**Variants**: `default`, `secondary`, `outline`, `accent`, `success`, `info`, `destructive`

### Select Dropdowns

```css
/* Trigger */
border: 2px solid #E5E7EB
border-radius: 12px
padding: 14px 16px
height: 44px

/* Focus */
border-color: #1A4D2E
box-shadow: 0 0 0 3px rgba(26, 77, 46, 0.1)

/* Dropdown Content */
border-radius: 12px
shadow: lg
```

### Tabs

```css
/* Tab List */
background: #F8F9FA
border-radius: 12px
padding: 4px
gap: 4px

/* Tab Trigger */
padding: 8px 16px
border-radius: 8px
transition: all 0.2s

/* Active Tab */
background: white
box-shadow: sm
font-weight: 600
```

### Dialog/Modal

```css
/* Overlay */
background: rgba(0, 0, 0, 0.6)
backdrop-filter: blur(4px)

/* Content */
border-radius: 16px
padding: 32px
box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15)
max-width: 512px
```

### Progress Bar

```css
height: 10px
border-radius: 999px (full)
background: rgba(26, 77, 46, 0.2)

/* Indicator */
background: linear-gradient(to right, #1A4D2E, #2D5F3F)
transition: all 0.5s ease-out
```

### Skeleton Loading

Uses the `.shimmer` class which provides an animated gradient effect:

```css
background: #F8F9FA
border-radius: 12px
position: relative
overflow: hidden

/* Shimmer effect */
animation: shimmer 1.5s infinite
```

## Animations & Transitions

### Default Transition

```css
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)
```

### Hover Animations

- **Cards**: `translateY(-4px)` with shadow increase
- **Buttons**: `scale(1.02)` with `brightness(1.1)`
- **Badges**: `scale(1.05)`
- **Images**: `scale(1.05)` (property images)

### Active States

- **Buttons**: `scale(0.98)`

### Loading States

- **Skeleton**: Shimmer effect (1.5s cycle)

## Layout System

### Container

```css
max-width: 1320px
margin: 0 auto
width: 100%
```

### Grid System

- 12-column responsive grid
- Gutters: 24px
- Responsive breakpoints follow Tailwind defaults

### Section Padding

```css
padding-top: 80px
padding-bottom: 80px

/* Large screens */
padding-top: 120px
padding-bottom: 120px
```

### Page Layout

The app uses a fixed sidebar layout with:
- Sidebar: 240px (collapsed: 64px)
- Main content: `max-w-7xl` (1280px)
- Content padding: 16px (mobile), 24px (desktop)
- Warm gray background (`#F8F9FA`) for main area

## Icons & Images

### Icons

- **Library**: Lucide React
- **Style**: Outline/line icons
- **Standard Size**: 20-24px
- **Small Context**: 16px

### Images

```css
border-radius: 12-20px

/* Property Images */
aspect-ratio: 16/10
object-fit: cover

/* Avatars */
aspect-ratio: 1/1
border-radius: 50%

/* Hover Effect */
transform: scale(1.05)
transition: transform 0.4s ease-out
```

### Image Overlay

```css
/* On hover */
background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.4) 100%)
opacity: 0 -> 1
transition: opacity 0.3s
```

## Accessibility

### Contrast Ratios

- All text meets WCAG AA standards (minimum 4.5:1 for normal text)
- Primary on white: ~8.5:1
- Muted foreground: ~4.5:1

### Focus Indicators

```css
outline: 2px solid #1A4D2E
outline-offset: 2px
```

### Touch Targets

Minimum size: 44x44px (following iOS/Android guidelines)

All interactive elements use the `.touch-target` class or have minimum dimensions set.

### Semantic HTML

- Proper heading hierarchy (h1-h6)
- ARIA labels where needed
- Focus management in modals
- Keyboard navigation support

## Utility Classes

### Custom Classes

```css
/* Card Hover Effect */
.card-hover

/* Button Primary Gradient */
.btn-primary-gradient

/* Property Image */
.property-image

/* Badge Pill */
.badge-pill

/* Image Overlay */
.image-overlay

/* Shimmer Loading */
.shimmer

/* Container Custom */
.container-custom

/* Section Padding */
.section-padding

/* Text Hierarchy */
.text-hero
.text-section
.text-subsection

/* Spacing */
.space-micro
.space-sm
.space-md
.space-lg
.space-xl

/* Touch Target */
.touch-target
```

## Responsive Design

### Mobile-First Approach

All components are designed mobile-first with progressive enhancement for larger screens.

### Breakpoints (Tailwind defaults)

- **sm**: 640px
- **md**: 768px
- **lg**: 1024px
- **xl**: 1280px
- **2xl**: 1536px

### Key Responsive Patterns

1. **Typography**: Uses `clamp()` for fluid scaling
2. **Spacing**: Increases from mobile to desktop
3. **Grid**: 1 column (mobile) → multi-column (desktop)
4. **Sidebar**: Hidden on mobile, collapsible on desktop
5. **Touch Targets**: Always 44x44px minimum

## Implementation Notes

1. **Tailwind CSS v4**: Uses new `@theme inline` syntax
2. **CSS Variables**: All colors defined as CSS custom properties
3. **Component Library**: Built on shadcn/ui with Radix UI primitives
4. **Font Loading**: Inter loaded from Google Fonts with `swap` display
5. **Dark Mode**: Optional dark mode palette defined (use `dark:` prefix)

## Usage Examples

### Creating a Card with Hover Effect

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

<Card hover>
  <CardHeader>
    <CardTitle>Property Details</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Using Button Variants

```tsx
import { Button } from '@/components/ui/button'

<Button>Primary Action</Button>
<Button variant="outline">Secondary Action</Button>
<Button variant="accent">Featured Action</Button>
<Button variant="ghost" size="icon-sm">
  <IconComponent />
</Button>
```

### Form Elements

```tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input 
    id="email" 
    type="email" 
    placeholder="Enter your email"
  />
</div>
```

### Loading States

```tsx
import { Skeleton } from '@/components/ui/skeleton'

<div className="space-y-4">
  <Skeleton className="h-48 w-full" />
  <Skeleton className="h-4 w-3/4" />
  <Skeleton className="h-4 w-1/2" />
</div>
```

## Future Enhancements

- [ ] Animation library integration (Framer Motion)
- [ ] Advanced data visualization components
- [ ] Property image galleries with lightbox
- [ ] Interactive map components
- [ ] Print stylesheet for reports
- [ ] Component playground/Storybook

## Support

For questions or contributions to the design system, please refer to the project README or contact the development team.

