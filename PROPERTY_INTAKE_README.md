# Property Intake / Add Property Feature

## Overview

This feature implements a complete property intake workflow for internal users (realtor, owner, admin) to add properties to the portfolio through multiple entry points and intake methods.

## Architecture

### Core Components

1. **Property Store** (`lib/property-store.ts`)
   - In-memory mock repository for CRUD operations
   - Tracks associations (investor shortlists, memo links)
   - Manages readiness status workflow
   - **Future**: Replace with database calls

2. **Property Intake Wizard** (`components/properties/property-intake-wizard.tsx`)
   - Multi-step wizard: Source Selection → Manual Entry/Upload → Review
   - Handles context-aware routing based on entry point
   - Mock file extraction for PDF/XLSX/CSV uploads

3. **Extended Property Type** (`lib/types.ts`)
   - New fields: `readinessStatus`, `source`, `ingestionHistory`, `unitType`, etc.
   - Backward compatible with existing mock data

### Entry Points

1. **Properties List** (`/properties`)
   - "Add Property" button → `/properties/new`

2. **Investor Detail** (`/investors/[id]`)
   - "Add candidate property" button → `/properties/new?investorId={id}&returnTo=investor`
   - On save: Adds to investor's shortlist, redirects back with toast

3. **Memo Creation** (`/memos/new`)
   - "Add property to memo" button → `/properties/new?memoId={id}&returnTo=memo`
   - On save: Links property to memo, returns to memo creation

## Workflow

### Source Selection
- **Enabled**: Manual Entry, Upload File (PDF/XLSX/CSV)
- **Coming Soon** (disabled): Paste Listing Link, Import from CRM, Developer Feed

### Manual Entry
- **Required**: Project/building name, area, unit type, price, source type
- **Optional**: Size, floor, view, parking, payment plan, notes, bedrooms, bathrooms, year built, description
- Progressive disclosure: Optional fields hidden by default

### Upload File
- Accepts PDF, XLSX, CSV
- Mock extraction function simulates parsing (returns best-effort fields)
- Extracted data prefills review form

### Review & Normalize
- Shows extracted/prefilled data
- AI suggestions placeholder (UI-only)
- Uncertainty warnings placeholder
- User can mark "needs verification"
- Readiness status calculated automatically

### Readiness Status Logic

- **DRAFT**: Missing required fields
- **NEEDS_VERIFICATION**: User flagged, or Portal/Other source without evidence
- **READY_FOR_MEMO**: All required fields + source declared + confirmed

## Status Badges

Status badges appear in:
- `/properties` list (table view)
- `/properties/[id]` detail page header
- Property picker surfaces (future)

## Access Control

- **Internal roles** (owner, admin, realtor): Full access
- **Investor role**: Redirected to `/dashboard` if accessing `/properties/*` routes
- Implemented via `RoleRedirect` component

## Mock Data

- Seed properties initialized in `lib/mock-data.ts`
- Store initialized via `lib/init-property-store.ts` (imported in property pages)
- Existing mock properties updated with `readinessStatus` and `source` fields

## Future Extensions

### Portal Link Ingestion
- Parse listing URLs from major portals (Property Finder, Bayut, etc.)
- Extract structured data from HTML/metadata
- Location: Extend `mockExtractPropertyData` or create new function

### Real Extraction Service
- Replace `mockExtractPropertyData` with actual PDF/XLSX/CSV parsing
- Consider libraries: `pdf-parse`, `xlsx`, `csv-parse`
- Add error handling and validation

### Deduplication
- Check for existing properties before creating
- Match on: address, title, price range
- Suggest merge or skip

### Trust Scoring Rails
- Implement trust score calculation based on:
  - Source credibility (developer > broker > portal > other)
  - Document completeness
  - Verification status
  - Historical accuracy

### Database Integration
- Replace `lib/property-store.ts` with Supabase/PostgreSQL calls
- Add proper migrations for new fields
- Implement RLS policies for multi-tenant access

## Testing Checklist

- [x] Internal user can add property via manual entry
- [x] Internal user can upload file and see extracted data
- [x] Status badge appears in list and detail pages
- [x] Investor persona cannot access `/properties` routes
- [x] Entry from investor detail creates shortlist association
- [x] Entry from memo creation links property to memo
- [x] Toast notifications appear on save
- [x] Context-aware routing works correctly

## Files Modified/Created

### Created
- `lib/property-store.ts` - Mock property repository
- `lib/init-property-store.ts` - Store initialization
- `components/properties/property-intake-wizard.tsx` - Main wizard component
- `components/ui/textarea.tsx` - Textarea UI component
- `app/(app)/properties/new/page.tsx` - New property route
- `PROPERTY_INTAKE_README.md` - This file

### Modified
- `lib/types.ts` - Extended Property interface
- `lib/mock-data.ts` - Added readinessStatus and source to seed data
- `app/layout.tsx` - Added Toaster provider
- `components/properties/properties-content.tsx` - Updated list to show readiness status
- `app/(app)/properties/[id]/page.tsx` - Added new sections (source, ingestion history, trust)
- `components/investors/investor-detail.tsx` - Added entry point button
- `app/(app)/memos/new/page.tsx` - Added entry point button
- `app/(app)/properties/page.tsx` - Added access control and store init

