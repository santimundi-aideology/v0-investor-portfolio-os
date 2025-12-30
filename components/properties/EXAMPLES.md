# Property Card Component - Examples & Demos

This file demonstrates various use cases and configurations of the PropertyCard component.

## Example 1: Basic Property Card

```tsx
import { PropertyCard } from "@/components/properties/property-card"

const basicProperty = {
  id: "prop-1",
  title: "Marina Tower Office Suite",
  address: "Marina Tower, Floor 25, Dubai Marina",
  area: "Dubai Marina",
  type: "commercial" as const,
  status: "available" as const,
  price: 8500000,
  size: 2500,
  roi: 9.5,
  imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c",
}

function BasicExample() {
  return <PropertyCard property={basicProperty} />
}
```

## Example 2: Featured Property with Agent

```tsx
const featuredProperty = {
  id: "prop-2",
  title: "Downtown Boulevard Retail",
  address: "Boulevard Plaza, Downtown Dubai",
  area: "Downtown Dubai",
  type: "commercial" as const,
  status: "available" as const,
  price: 12000000,
  size: 3200,
  roi: 11.2,
  imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8",
}

function FeaturedExample() {
  return (
    <PropertyCard
      property={featuredProperty}
      featured={true}
      agent={{
        name: "Sarah Al-Rashid",
        role: "Senior Realtor",
        avatar: "/professional-woman-avatar.png",
      }}
      onFavoriteToggle={(id) => console.log("Favorited:", id)}
      onShare={(id) => console.log("Shared:", id)}
    />
  )
}
```

## Example 3: Residential Property with Bedrooms/Bathrooms

```tsx
const residentialProperty = {
  id: "prop-3",
  title: "JVC Villa Compound",
  address: "District 12, Jumeirah Village Circle",
  area: "JVC",
  type: "residential" as const,
  status: "available" as const,
  price: 4500000,
  size: 4800,
  bedrooms: 4,
  bathrooms: 5,
  roi: 7.8,
  imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9",
}

function ResidentialExample() {
  return (
    <PropertyCard
      property={residentialProperty}
      isNew={true}
      agent={{
        name: "Sarah Al-Rashid",
        role: "Senior Realtor",
        avatar: "/professional-woman-avatar.png",
      }}
    />
  )
}
```

## Example 4: Grid Layout with Multiple Cards

```tsx
import { mockProperties, currentUser } from "@/lib/mock-data"

function GridExample() {
  const handleFavorite = (propertyId: string) => {
    console.log("Toggle favorite:", propertyId)
  }

  const handleShare = (propertyId: string) => {
    if (navigator.share) {
      navigator.share({
        title: "Check out this property",
        url: `/properties/${propertyId}`,
      })
    }
  }

  return (
    <div className="property-grid">
      {mockProperties.map((property, index) => (
        <PropertyCard
          key={property.id}
          property={property}
          featured={index === 0}
          isNew={
            new Date(property.createdAt) >
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
          agent={{
            name: currentUser.name,
            role: "Senior Realtor",
            avatar: currentUser.avatar || "/professional-woman-avatar.png",
          }}
          onFavoriteToggle={handleFavorite}
          onShare={handleShare}
        />
      ))}
    </div>
  )
}
```

## Example 5: With Loading States

```tsx
import { PropertyCard } from "@/components/properties/property-card"
import { PropertyCardSkeleton } from "@/components/properties/property-card-skeleton"

function LoadingExample() {
  const [loading, setLoading] = useState(true)
  const [properties, setProperties] = useState([])

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setProperties(mockProperties)
      setLoading(false)
    }, 2000)
  }, [])

  return (
    <div className="property-grid">
      {loading ? (
        <>
          <PropertyCardSkeleton />
          <PropertyCardSkeleton />
          <PropertyCardSkeleton />
          <PropertyCardSkeleton />
          <PropertyCardSkeleton />
          <PropertyCardSkeleton />
        </>
      ) : (
        properties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))
      )}
    </div>
  )
}
```

## Example 6: Filtering Properties

```tsx
function FilteredGridExample() {
  const [areaFilter, setAreaFilter] = useState("all")
  
  const filteredProperties = mockProperties.filter(
    (property) => areaFilter === "all" || property.area === areaFilter
  )

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button
          variant={areaFilter === "all" ? "default" : "outline"}
          onClick={() => setAreaFilter("all")}
        >
          All Areas
        </Button>
        <Button
          variant={areaFilter === "Dubai Marina" ? "default" : "outline"}
          onClick={() => setAreaFilter("Dubai Marina")}
        >
          Dubai Marina
        </Button>
        <Button
          variant={areaFilter === "Downtown Dubai" ? "default" : "outline"}
          onClick={() => setAreaFilter("Downtown Dubai")}
        >
          Downtown Dubai
        </Button>
      </div>

      <div className="property-grid">
        {filteredProperties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>
    </div>
  )
}
```

## Example 7: With Favorites Persistence

```tsx
import { useState } from "react"

function FavoritesExample() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  const handleFavoriteToggle = (propertyId: string) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev)
      if (newFavorites.has(propertyId)) {
        newFavorites.delete(propertyId)
      } else {
        newFavorites.add(propertyId)
      }
      return newFavorites
    })
  }

  return (
    <div className="property-grid">
      {mockProperties.map((property) => (
        <PropertyCard
          key={property.id}
          property={property}
          isFavorited={favorites.has(property.id)}
          onFavoriteToggle={handleFavoriteToggle}
        />
      ))}
    </div>
  )
}
```

## Example 8: Custom Grid Layouts

### Two Column Layout
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
  {properties.map((property) => (
    <PropertyCard key={property.id} property={property} />
  ))}
</div>
```

### Four Column Layout (Desktop)
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
  {properties.map((property) => (
    <PropertyCard key={property.id} property={property} />
  ))}
</div>
```

### Single Column (Featured List)
```tsx
<div className="max-w-2xl mx-auto space-y-6">
  {properties.map((property) => (
    <PropertyCard key={property.id} property={property} featured />
  ))}
</div>
```

## Example 9: With Different Property Types

```tsx
function PropertyTypesExample() {
  const commercialProps = mockProperties.filter(p => p.type === "commercial")
  const residentialProps = mockProperties.filter(p => p.type === "residential")
  const landProps = mockProperties.filter(p => p.type === "land")

  return (
    <div className="space-y-12">
      <section>
        <h2 className="text-2xl font-bold mb-6">Commercial Properties</h2>
        <div className="property-grid">
          {commercialProps.map(property => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-6">Residential Properties</h2>
        <div className="property-grid">
          {residentialProps.map(property => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-6">Land Plots</h2>
        <div className="property-grid">
          {landProps.map(property => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      </section>
    </div>
  )
}
```

## Example 10: Interactive Demo with All States

```tsx
function InteractiveDemo() {
  const [showFeatured, setShowFeatured] = useState(true)
  const [showNew, setShowNew] = useState(true)
  const [showAgent, setShowAgent] = useState(true)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const sampleProperty = mockProperties[0]

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-xl border">
        <h3 className="font-semibold mb-4">Property Card Options</h3>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showFeatured}
              onChange={(e) => setShowFeatured(e.target.checked)}
            />
            <span>Show Featured Badge</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showNew}
              onChange={(e) => setShowNew(e.target.checked)}
            />
            <span>Show New Badge</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showAgent}
              onChange={(e) => setShowAgent(e.target.checked)}
            />
            <span>Show Agent Info</span>
          </label>
        </div>
      </div>

      <div className="max-w-md mx-auto">
        <PropertyCard
          property={sampleProperty}
          featured={showFeatured}
          isNew={showNew}
          agent={
            showAgent
              ? {
                  name: "Sarah Al-Rashid",
                  role: "Senior Realtor",
                  avatar: "/professional-woman-avatar.png",
                }
              : undefined
          }
        />
      </div>
    </div>
  )
}
```

## Styling Tips

### Custom Card Hover Effects

```css
/* Add more dramatic hover effect */
.property-card:hover {
  transform: translateY(-12px) scale(1.02);
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.2);
}
```

### Adjust Grid Spacing

```tsx
/* Tighter spacing */
<div className="property-grid gap-4" />

/* Wider spacing */
<div className="property-grid gap-12" />
```

### Change Card Aspect Ratio

```css
/* 16:9 aspect ratio */
.property-card__image-container {
  aspect-ratio: 16/9;
}

/* Square aspect ratio */
.property-card__image-container {
  aspect-ratio: 1/1;
}
```

## Performance Tips

1. **Image Optimization**: Use Next.js Image component with proper sizing
2. **Lazy Loading**: Use Intersection Observer for cards below the fold
3. **Virtual Scrolling**: For large lists (100+ properties), use react-window
4. **Memoization**: Wrap PropertyCard with React.memo for better performance

```tsx
import { memo } from 'react'

export const PropertyCard = memo(function PropertyCard(props) {
  // ... component code
})
```

