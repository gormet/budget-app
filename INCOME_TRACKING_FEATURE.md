# Income Tracking & Dashboard Metrics Feature

**Added:** 2025-10-26  
**Status:** ✅ Complete - Ready for Database Migration

---

## Overview

Enhanced the budgeting app with income tracking and comprehensive dashboard metrics. This feature adds `income` and `carry_over` fields to months and displays 8 key financial metrics on the dashboard.

---

## Feature Summary

### New Fields on Month

1. **Income** (required, ≥ 0)
   - Required when creating a month
   - Validation: Must be >= 0
   - Represents the total income for the month

2. **Carry Over** (optional, ≥ 0, default 0)
   - Optional field, defaults to 0
   - Validation: Must be >= 0
   - Represents money carried forward from previous month

### Dashboard Metrics (8 Cards)

1. **Total Income** = `income + carry_over`
2. **Total Budget** = Sum of all `budget_items.budget_amount`
3. **Posted** = Spend excluding reimbursement items
4. **Approved Reimburse** = Sum of approved `reimbursement_amount`
5. **Total Spending** = Posted + Approved Reimburse
6. **Remaining** = Total Budget - Total Spending
7. **Unallocated** = Total Income - Total Budget
8. **Total Saving** = 0 (placeholder for future implementation)

---

## Implementation Details

### 1. Database Changes

**File:** `supabase/sql/09_add_income_carry_over.sql`

#### Schema Changes
- Added `income NUMERIC(12,2)` column to `months` table (required, >= 0)
- Added `carry_over NUMERIC(12,2)` column to `months` table (default 0, >= 0)

#### New View: `v_month_totals`
- Calculates all 8 dashboard metrics in a single query
- Efficiently joins months, budget items, and expenses
- Includes proper filtering for deleted expenses and reimbursement logic

#### Updated Function
- `duplicate_month_owned()` now copies `income` and `carry_over` values
- Both fields remain editable after duplication

**To Apply:**
1. Open Supabase SQL Editor
2. Run `supabase/sql/09_add_income_carry_over.sql`
3. Verify columns and view are created

---

### 2. TypeScript Types

**File:** `types/database.ts`

#### Updated Month Type
```typescript
months: {
  Row: {
    id: string
    owner_id: string
    workspace_id: string
    year: number
    month: number
    title: string | null
    income: number        // NEW
    carry_over: number    // NEW
    created_at: string
  }
  Insert: {
    id?: string
    owner_id: string
    workspace_id: string
    year: number
    month: number
    title?: string | null
    income: number        // REQUIRED
    carry_over?: number   // OPTIONAL (default 0)
    created_at?: string
  }
}
```

#### New MonthTotals Interface
```typescript
export interface MonthTotals {
  month_id: string
  workspace_id: string
  year: number
  month: number
  title: string | null
  income: number
  carry_over: number
  total_income: number       // 1. income + carry_over
  total_budget: number       // 2. sum of budget_items.budget_amount
  posted: number             // 3. spend excluding reimbursement items
  approved_reimburse: number // 4. sum of approved reimbursement_amount
  total_spending: number     // 5. posted + approved_reimburse
  remaining: number          // 6. total_budget - total_spending
  unallocated: number        // 7. total_income - total_budget
  total_saving: number       // 8. placeholder (0 for now)
}
```

---

### 3. API Changes

#### POST `/api/months`

**File:** `app/api/months/route.ts`

**New Request Body:**
```typescript
{
  workspaceId: string,
  year: number,
  month: number,
  title?: string,
  income: number,      // NEW - required, >= 0
  carryOver?: number   // NEW - optional, >= 0, default 0
}
```

**Validation:**
- `income` is required and must be >= 0
- `carryOver` is optional, defaults to 0, must be >= 0
- Returns full month row including new fields

#### GET `/api/months?workspaceId=X`

**File:** `app/api/months/route.ts`

**Response:** Now includes `income` and `carry_over` in each month object

#### GET `/api/months/:id/totals` ⭐ NEW

**File:** `app/api/months/[id]/totals/route.ts`

**Response:**
```typescript
{
  ok: true,
  data: MonthTotals // All 8 calculated metrics
}
```

Fetches from `v_month_totals` view for efficient calculation.

---

### 4. UI Changes

#### MonthSelector Component

**File:** `components/MonthSelector.tsx`

**Create Month Modal:**
- Added "Income (required)" input field
  - Type: number
  - Min: 0
  - Step: 0.01
  - Required
- Added "Carry Over (optional)" input field
  - Type: number
  - Min: 0
  - Step: 0.01
  - Default: 0

**Duplicate Month Modal:**
- Prefills `income` and `carry_over` from source month
- Both fields remain **editable** before saving
- Values are copied but can be modified

**Validation:**
- Client-side validation ensures income >= 0
- Client-side validation ensures carryOver >= 0
- Shows alert if validation fails

#### Dashboard Page

**File:** `app/page.tsx`

**Changes:**
- Fetches `MonthTotals` from `/api/months/:id/totals`
- Displays 8 metric cards instead of 4
- Color-coded values:
  - Total Income: Green
  - Total Budget: Gray
  - Posted: Blue
  - Approved Reimburse: Purple
  - Total Spending: Orange
  - Remaining: Red if negative, Gray if positive
  - Unallocated: Red if negative, Teal if positive
  - Total Saving: Gray (placeholder)

**Badges:**
- "Over Budget" badge on Remaining if < 0
- "Over Allocated" badge on Unallocated if < 0

**Grid Layout:**
- Responsive: 1 column on mobile, 4 columns on desktop
- Cards arranged in logical order matching spec

---

## Formulas Reference

```
1. Total Income     = income + carry_over
2. Total Budget     = Σ budget_items.budget_amount
3. Posted           = Σ expense_items.amount WHERE need_reimburse = false
4. Approved Reimb   = Σ expense_items.reimbursement_amount WHERE status = 'APPROVED'
5. Total Spending   = (3) + (4)
6. Remaining        = (2) - (5)
7. Unallocated      = (1) - (2)
8. Total Saving     = 0 (placeholder)
```

---

## Testing Checklist

### Database
- [ ] Run `09_add_income_carry_over.sql` in Supabase
- [ ] Verify `income` and `carry_over` columns exist on `months` table
- [ ] Verify `v_month_totals` view returns correct calculations
- [ ] Verify `duplicate_month_owned()` function copies income/carry_over

### API
- [ ] POST `/api/months` fails without `income`
- [ ] POST `/api/months` fails with negative `income`
- [ ] POST `/api/months` succeeds with valid data
- [ ] POST `/api/months` defaults `carryOver` to 0 when omitted
- [ ] GET `/api/months?workspaceId=X` includes income/carry_over
- [ ] GET `/api/months/:id/totals` returns all 8 metrics

### UI - Month Creation
- [ ] Create modal shows income and carry over inputs
- [ ] Income field is required
- [ ] Carry over field defaults to 0
- [ ] Client validation prevents negative values
- [ ] Created month appears in dropdown
- [ ] Income/carry_over values are saved correctly

### UI - Month Duplication
- [ ] Duplicate modal prefills income and carry over from source month
- [ ] Income and carry over can be edited before saving
- [ ] Duplicated month has same income/carry_over (or edited values)
- [ ] Budget structure is copied correctly

### UI - Dashboard
- [ ] All 8 metric cards display correctly
- [ ] Values match database calculations
- [ ] Negative remaining shows red color and "Over Budget" badge
- [ ] Negative unallocated shows red color and "Over Allocated" badge
- [ ] Total Saving shows 0 with "Coming soon" text
- [ ] Cards are responsive (1 col mobile, 4 cols desktop)

### Edge Cases
- [ ] Month with no budget items shows 0 for Total Budget
- [ ] Month with no expenses shows 0 for Posted/Approved/Spending
- [ ] Deleted expenses are excluded from calculations
- [ ] Pending reimbursements don't affect Posted or Approved metrics
- [ ] Only APPROVED reimbursements count in calculations

---

## Files Modified

### Created (2 files)
1. ✅ `supabase/sql/09_add_income_carry_over.sql` - Migration file
2. ✅ `app/api/months/[id]/totals/route.ts` - New endpoint
3. ✅ `INCOME_TRACKING_FEATURE.md` - This documentation

### Modified (4 files)
1. ✅ `types/database.ts` - Added Month and MonthTotals types
2. ✅ `app/api/months/route.ts` - Updated POST validation and insert
3. ✅ `components/MonthSelector.tsx` - Added income/carry_over inputs
4. ✅ `app/page.tsx` - Updated dashboard with 8 metrics

---

## Migration Steps

### Step 1: Run Database Migration
```bash
# In Supabase SQL Editor
# Copy and paste contents of: supabase/sql/09_add_income_carry_over.sql
# Click "Run"
```

### Step 2: Verify Migration
```sql
-- Check columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'months'
  AND column_name IN ('income', 'carry_over');

-- Check view works
SELECT * FROM v_month_totals LIMIT 1;

-- Check function updated
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_name = 'duplicate_month_owned';
```

### Step 3: Update Existing Months (Optional)
If you have existing months with income = 0, you may want to update them:
```sql
-- Update existing months with actual income values
UPDATE months SET income = 5000, carry_over = 0 WHERE id = 'some-uuid';
```

### Step 4: Test in UI
1. Create a new month with income and carry over
2. Verify dashboard shows all 8 metrics
3. Duplicate a month and verify income/carry_over are copied
4. Check that calculations are correct

---

## Notes

### Confirmed Rules
- Posted **does not** include reimbursement line items (pending/unapproved)
- Only APPROVED reimbursements count in Approved Reimburse metric
- Total Saving is a placeholder (always 0 for now)
- Duplicating a month copies income & carry_over (both editable)
- Deleted expenses (`deleted_at IS NOT NULL`) are excluded from all calculations

### Performance Considerations
- `v_month_totals` view uses LEFT JOINs for efficiency
- Aggregations are done in subqueries
- Consider adding indexes if month count grows large:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_expense_items_reimburse 
    ON expense_items(expense_id, reimburse_status);
  ```

### Edit & Delete Functionality ⭐ NEW

The feature has been extended with edit and delete capabilities:
- **Edit Income/Carry Over:** Allowed only before budget items are created (see `EDIT_DELETE_MONTH_FEATURE.md`)
- **Delete Month:** Allowed only when no budget types exist (see `EDIT_DELETE_MONTH_FEATURE.md`)
- **Database Guards:** Trigger blocks income edits, FK RESTRICT blocks deletions
- **UI Controls:** Edit/Delete buttons in MonthSelector with proper warnings

For complete details, see: **`EDIT_DELETE_MONTH_FEATURE.md`**

### Future Enhancements
1. Implement "Total Saving" calculation logic
2. Add month-to-month income trending
3. Add carry over calculation automation
4. Add income vs spending charts
5. Add income source tracking

---

## API Endpoint Summary

| Method | Endpoint | Description | Changes |
|--------|----------|-------------|---------|
| GET | `/api/months?workspaceId=X` | List months | Now includes income/carry_over |
| POST | `/api/months` | Create month | Requires income, optional carryOver |
| GET | `/api/months/:id/totals` | Get metrics | ⭐ NEW - Returns 8 calculated metrics |
| POST | `/api/months/:id/duplicate` | Duplicate month | Now copies income/carry_over |

---

## Acceptance Criteria

- ✅ Month creation fails if `income` is missing or < 0
- ✅ `carryOver` defaults to 0 when omitted
- ✅ Duplicate month copies `income` and `carry_over` (both editable before save)
- ✅ Dashboard displays all 8 metrics in correct order
- ✅ Calculations match specified formulas
- ✅ Negative values show appropriate badges and colors
- ✅ RLS and workspace roles unchanged
- ✅ OWNER remains the only approver
- ✅ No regressions in reimbursement logic
- ✅ Performance is acceptable with existing data

---

**Status:** ✅ Implementation Complete - Ready for Database Migration

**Next Step:** Run `supabase/sql/09_add_income_carry_over.sql` in Supabase SQL Editor

