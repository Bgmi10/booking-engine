# Enhancement API Routes Documentation

## Backend Routes Structure

All enhancement-related controllers have been moved to `/backend/src/controllers/enhancementsController.ts`

### Enhancement Base Routes (Admin)

| Method | Endpoint | Controller Function | Description | Frontend Usage |
|--------|----------|-------------------|-------------|----------------|
| GET | `/admin/enhancements/all` | `getAllEnhancements` | Fetch all enhancements with rules | ✅ Used in Enhancements.tsx |
| POST | `/admin/enhancements` | `createEnhancement` | Create new enhancement | ✅ Used in CreateEnhancementModal.tsx |
| PUT | `/admin/enhancements/:id` | `updateEnhancement` | Update enhancement | ✅ Used in UpdateEnhancementModal.tsx |
| DELETE | `/admin/enhancements/:id` | `deleteEnhancement` | Delete enhancement | ✅ Used in Enhancements.tsx |

### Enhancement Rule Routes (Admin)

| Method | Endpoint | Controller Function | Description | Frontend Usage |
|--------|----------|-------------------|-------------|----------------|
| GET | `/admin/enhancement-rules/all` | `getAllEnhancementRules` | Fetch all rules | ✅ Ready to use |
| GET | `/admin/enhancement-rules/by-enhancement/:enhancementId` | `getEnhancementRulesByEnhancementId` | Fetch rules for specific enhancement | ✅ Used in EnhancementRules.tsx |
| POST | `/admin/enhancement-rules` | `createEnhancementRule` | Create new rule | ✅ Ready to use |
| PUT | `/admin/enhancement-rules/:id` | `updateEnhancementRule` | Update rule | ✅ Ready to use |
| DELETE | `/admin/enhancement-rules/:id` | `deleteEnhancementRule` | Delete rule | ✅ Used in EnhancementRules.tsx |

### Customer-Facing Routes

| Method | Endpoint | Controller Function | Description | Frontend Usage |
|--------|----------|-------------------|-------------|----------------|
| POST | `/enhancements` | `getEnhancements` | Get available enhancements for booking | ✅ Used in customer booking flow |

## Database Schema Changes

### Enhancement Model
```prisma
model Enhancement {
  id                  String                     @id @default(uuid())
  name                String                     // Changed from 'title'
  description         String
  image               String?
  price               Float                      // Base price
  pricingType         EnhancementPricingType     // PER_GUEST, PER_BOOKING, PER_DAY
  isActive            Boolean                    @default(true)
  createdAt           DateTime                   @default(now())
  updatedAt           DateTime                   @updatedAt
  enhancementRules    EnhancementRule[]          // One-to-many relationship
  enhancementBookings EnhancementBooking[]
}
```

### EnhancementRule Model (New)
```prisma
model EnhancementRule {
  id                  String                     @id @default(uuid())
  name                String                     // Rule name for admin
  enhancementId       String
  enhancement         Enhancement                @relation(...)
  availabilityType    EnhancementAvailabilityType // ALWAYS, WEEKLY, SPECIFIC_DATES, SEASONAL
  availableDays       String[]
  availableTimeStart  String?
  availableTimeEnd    String?
  seasonal            Boolean                    @default(false)
  seasonStart         DateTime?
  seasonEnd           DateTime?
  specificDates       DateTime[]
  validFrom           DateTime?
  validUntil          DateTime?
  roomScope           EnhancementRoomScope       // ALL_ROOMS, SPECIFIC_ROOMS
  roomIds             String[]
  isActive            Boolean                    @default(true)
  createdAt           DateTime                   @default(now())
  updatedAt           DateTime                   @updatedAt
}
```

## Frontend Components Structure

### Updated Components
1. **CreateEnhancementModal.tsx** - Simplified to only create base enhancement
2. **UpdateEnhancementModal.tsx** - Only updates base enhancement data
3. **Enhancements.tsx** - Updated to use `name` instead of `title`
4. **ViewEnhancementModal.tsx** - Shows enhancement with rules

### New Components
1. **EnhancementRules.tsx** - Manages rules for an enhancement
2. **CreateEnhancementRuleModal.tsx** - Creates new rules
3. **UpdateEnhancementRuleModal.tsx** - Updates existing rules

## Type Definitions

### Frontend Types (`/frontend/src/types/types.ts`)
```typescript
export interface Enhancement {
  id: string
  name: string                // Changed from 'title'
  description: string
  price: number
  image?: string
  pricingType: "PER_GUEST" | "PER_BOOKING" | "PER_DAY"
  isActive: boolean
  createdAt: string
  updatedAt: string
  enhancementRules?: EnhancementRule[]
}

export interface EnhancementRule {
  id: string
  name: string
  enhancementId: string
  enhancement?: Enhancement
  availabilityType: "ALWAYS" | "WEEKLY" | "SPECIFIC_DATES" | "SEASONAL"
  availableDays: string[]
  availableTimeStart?: string
  availableTimeEnd?: string
  seasonal: boolean
  seasonStart?: string
  seasonEnd?: string
  specificDates?: string[]
  validFrom?: string
  validUntil?: string
  roomScope: "ALL_ROOMS" | "SPECIFIC_ROOMS"
  roomIds: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}
```

## Zod Schemas (`/backend/src/zod/enhancement.schema.ts`)

- `createEnhancementSchema` - Base enhancement creation
- `updateEnhancementSchema` - Base enhancement updates
- `createEnhancementRuleSchema` - Rule creation
- `updateEnhancementRuleSchema` - Rule updates
- `createEnhancementWithRulesSchema` - Optional convenience method

## Benefits of New Structure

1. **Reusability**: Create enhancement once, apply multiple rules
2. **Flexibility**: Different availability/pricing for same product
3. **Efficiency**: Admins can quickly apply existing enhancements
4. **Scalability**: Easy to add new rule types
5. **Maintenance**: Separation of concerns

## Migration Notes

### Breaking Changes
- `enhancement.title` → `enhancement.name`
- Availability data moved from Enhancement to EnhancementRule
- Need to create rules separately after creating enhancement

### Admin Workflow
1. Create base enhancement (name, description, price, pricing type)
2. Add availability rules (when/where available)
3. Rules can be activated/deactivated independently
4. Multiple rules can apply to same enhancement

## Testing Checklist

- [x] Backend enhancement CRUD operations
- [x] Backend enhancement rule CRUD operations
- [x] Frontend enhancement list display
- [x] Frontend enhancement creation
- [x] Frontend enhancement updates
- [x] Frontend enhancement deletion
- [x] Frontend rule management
- [x] Customer-facing enhancement availability check
- [x] API route connectivity
- [x] Type definitions consistency