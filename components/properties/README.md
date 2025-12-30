# Property Card Component

A beautiful, responsive property card component with smooth animations and interactions.

## Features

- **Elegant Design**: Modern card layout with 4:3 aspect ratio images
- **Smooth Animations**: 
  - Lift on hover with enhanced shadow
  - Image zoom effect (1.08 scale)
  - Action buttons slide in from the right
  - Gradient overlay on hover
- **Interactive Elements**:
  - Favorite/heart button (toggleable)
  - Share button
  - View Details CTA
- **Badges**: Support for "Featured" and "New" badges
- **Property Specs**: Displays bedrooms, bathrooms, and square footage
- **Agent Info**: Optional agent details with avatar
- **Responsive**: Adapts perfectly from mobile to desktop
- **Loading State**: Skeleton component for loading states

## Usage

### Basic Usage

```tsx
import { PropertyCard } from "@/components/properties/property-card"

<PropertyCard 
  property={propertyData}
  onFavoriteToggle={(id) => console.log("Favorited:", id)}
  onShare={(id) => console.log("Shared:", id)}
/>
```

### With All Options

```tsx
<PropertyCard 
  property={propertyData}
  featured={true}
  isNew={true}
  agent={{
    name: "Sarah Al-Rashid",
    role: "Senior Realtor",
    avatar: "/avatar.png"
  }}
  isFavorited={false}
  onFavoriteToggle={handleFavorite}
  onShare={handleShare}
/>
```

### Grid Layout

```tsx
<div className="property-grid">
  {properties.map(property => (
    <PropertyCard key={property.id} property={property} />
  ))}
</div>
```

### Loading State

```tsx
import { PropertyCardSkeleton } from "@/components/properties/property-card-skeleton"

<div className="property-grid">
  {loading ? (
    <>
      <PropertyCardSkeleton />
      <PropertyCardSkeleton />
      <PropertyCardSkeleton />
    </>
  ) : (
    properties.map(property => (
      <PropertyCard key={property.id} property={property} />
    ))
  )}
</div>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `property` | `Property` | required | The property data object |
| `featured` | `boolean` | `false` | Show "Featured" badge |
| `isNew` | `boolean` | `false` | Show "New" badge |
| `agent` | `object` | `undefined` | Agent details (name, role, avatar) |
| `onFavoriteToggle` | `function` | `undefined` | Callback when favorite is toggled |
| `onShare` | `function` | `undefined` | Callback when share is clicked |
| `isFavorited` | `boolean` | `false` | Initial favorite state |

## Property Type

The `Property` type should include:

```typescript
interface Property {
  id: string
  title: string
  address: string
  area: string
  type: "residential" | "commercial" | "mixed-use" | "land"
  status: "available" | "under-offer" | "sold" | "off-market"
  price: number
  size: number
  bedrooms?: number
  bathrooms?: number
  roi?: number
  imageUrl?: string
  // ... other fields
}
```

## Styling

All styles are defined in `app/globals.css` under the `@layer components` section. The component uses:

- Tailwind CSS for base styling
- Custom CSS classes with the `property-card__*` BEM naming convention
- CSS custom properties from the design system

### Key CSS Classes

- `.property-card` - Main card container
- `.property-card__image-container` - Image wrapper with aspect ratio
- `.property-card__image` - Image with zoom animation
- `.property-card__badges` - Badge container (top-left)
- `.property-card__actions` - Action buttons (top-right)
- `.property-card__content` - Content area
- `.property-card__features` - Property specifications
- `.property-card__footer` - Price and CTA
- `.property-card__agent` - Optional agent section
- `.property-grid` - Responsive grid layout

## Responsive Behavior

- **Mobile (< 640px)**: 1 column, compact spacing
- **Tablet (640px - 1024px)**: 2 columns
- **Desktop (1024px+)**: 3 columns

## Animation Details

- **Card lift**: `translateY(-8px)` on hover with 0.4s cubic-bezier
- **Image zoom**: `scale(1.08)` on hover with 0.6s cubic-bezier
- **Shadow**: Transitions from subtle to pronounced
- **Action buttons**: Fade in with slight slide from right
- **CTA button**: Fills with primary color and slides 2px right

## Accessibility

- All interactive elements meet minimum 44x44px touch target
- Proper ARIA labels on buttons
- Keyboard navigable
- Focus visible states
- Semantic HTML structure

## Browser Support

- All modern browsers
- Safari 14+
- Chrome 90+
- Firefox 88+
- Edge 90+

## Dependencies

- Next.js (Image component)
- Lucide React (Icons)
- Tailwind CSS
- shadcn/ui utilities

