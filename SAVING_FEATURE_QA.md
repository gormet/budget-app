# Saving Feature - QA Test Plan

## Prerequisites

1. **Run the SQL Migration**:
   - Open your Supabase SQL Editor
   - Copy and paste the "SAVING FEATURE" section from `/supabase/sql/09_add_income_carry_over.sql`
   - Execute the SQL
   - Verify the column and index were created (check queries at bottom of migration)

2. **Deploy Changes**:
   - Restart your Next.js development server
   - Ensure all TypeScript compiles without errors

---

## Test Scenarios

### 1. Create a Saving Budget Item

**Steps**:
1. Navigate to Budget page (`/budget`)
2. Select or create a month
3. Select or create a budget type
4. In the "Add Item" form at the bottom:
   - Enter name: "Emergency Fund"
   - Enter amount: 500.00
   - **Check** the "Mark as Saving" checkbox
   - Click "Add Item"

**Expected Results**:
- ✅ Item appears in the table
- ✅ Indigo "Saving" pill is displayed next to the name
- ✅ Checkbox in the "Saving" column is checked
- ✅ Dashboard shows Total Saving = RM 500.00 (indigo color)

---

### 2. Create a Normal Budget Item

**Steps**:
1. In the same budget type:
   - Enter name: "Groceries"
   - Enter amount: 300.00
   - **Leave** "Mark as Saving" unchecked
   - Click "Add Item"

**Expected Results**:
- ✅ Item appears in the table
- ✅ No "Saving" pill displayed
- ✅ Checkbox in the "Saving" column is unchecked
- ✅ Dashboard Total Saving remains RM 500.00
- ✅ Dashboard Total Budget = RM 800.00 (includes both items)

---

### 3. Toggle Normal → Saving (No Expenses)

**Steps**:
1. Find the "Groceries" item
2. Click the checkbox in the "Saving" column

**Expected Results**:
- ✅ Checkbox becomes checked immediately
- ✅ "Saving" pill appears next to the name
- ✅ No confirmation modal shown
- ✅ Dashboard Total Saving = RM 800.00
- ✅ Dashboard Total Budget = RM 800.00 (unchanged)

---

### 4. Add Expense to a Saving Item

**Steps**:
1. Navigate to "New Expense" page (`/expense/new`)
2. Create an expense:
   - Date: today
   - Select the "Emergency Fund" budget item
   - Amount: 50.00
   - Description: "Test expense"
   - Click "Add Expense"
3. Return to Budget page

**Expected Results**:
- ✅ Budget page still shows "Emergency Fund" with "Saving" pill
- ✅ Checkbox still checked
- ✅ Dashboard Total Saving = RM 800.00 (unchanged)
- ✅ Dashboard Posted = RM 50.00

---

### 5. Toggle Saving → Normal (With Expenses) - Confirm

**Steps**:
1. Find the "Emergency Fund" item (has 1 expense)
2. Click the checkbox in the "Saving" column

**Expected Results**:
- ✅ Confirmation modal appears
- ✅ Modal shows:
  - Item name: "Emergency Fund"
  - Expense count: 1
  - Total spent on this item: RM 50.00
  - Total Saving (before): RM 800.00
  - Total Saving (after): RM 300.00
  - Change: - RM 500.00 (in red)
3. Click "Confirm & Convert"

**Expected Results**:
- ✅ Modal closes
- ✅ Checkbox becomes unchecked
- ✅ "Saving" pill disappears
- ✅ Dashboard Total Saving = RM 300.00
- ✅ Dashboard Total Budget = RM 800.00 (unchanged)
- ✅ Dashboard Posted = RM 50.00 (unchanged - expenses still linked)

---

### 6. Toggle Saving → Normal (With Expenses) - Cancel

**Steps**:
1. Toggle "Groceries" to saving (it should have no expenses)
2. Add an expense to "Groceries" (amount: 25.00)
3. Try to toggle "Groceries" back to normal
4. Confirmation modal appears
5. Click "Cancel"

**Expected Results**:
- ✅ Modal closes
- ✅ Checkbox remains checked
- ✅ "Saving" pill remains visible
- ✅ No changes to dashboard

---

### 7. Filter by Savings Only

**Steps**:
1. In the Budget page, with multiple items (some saving, some not)
2. Check the "Show only Savings" checkbox at the top right

**Expected Results**:
- ✅ Only items with "Saving" pill are displayed
- ✅ Normal budget items are hidden
- ✅ Unchecking the filter shows all items again

---

### 8. Edit a Saving Item

**Steps**:
1. Find a saving item (e.g., "Groceries")
2. Click "Edit"
3. Change name to "Groceries & Household"
4. Change amount to 350.00
5. **Uncheck** "Mark as Saving"
6. Click "Save"

**Expected Results**:
- ✅ Name and amount updated
- ✅ Checkbox in table becomes unchecked
- ✅ "Saving" pill disappears
- ✅ Dashboard Total Saving decreased by 350.00
- ✅ Dashboard Total Budget decreased by 50.00 (from 350 to 300)

---

### 9. Delete a Saving Item

**Steps**:
1. Find a saving item
2. Click "Delete"
3. Confirm deletion

**Expected Results**:
- ✅ Item removed from table
- ✅ Dashboard Total Saving decreased by item's amount
- ✅ Dashboard Total Budget decreased by item's amount

---

### 10. Role-Based Permissions

**Steps (as VIEWER)**:
1. Login as a user with VIEWER role in a workspace
2. Navigate to Budget page

**Expected Results**:
- ✅ All checkboxes are disabled
- ✅ Edit and Delete buttons are disabled
- ✅ "Add Item" button is disabled
- ✅ Can view all items and their saving status
- ✅ Can use "Show only Savings" filter

**Steps (as EDITOR/OWNER)**:
- ✅ All controls are enabled
- ✅ Can create, edit, toggle, and delete items

---

## Dashboard Verification

### Card #8: Total Saving

**Before Feature**:
- Display: RM 0.00 (gray)
- Subtitle: "Coming soon"

**After Feature**:
- Display: RM [actual total] (indigo)
- Subtitle: "(in Total Budget)"

**Test**:
1. Start with no saving items → Total Saving = RM 0.00
2. Add saving item (RM 500) → Total Saving = RM 500.00
3. Add another (RM 300) → Total Saving = RM 800.00
4. Toggle one off (RM 500) → Total Saving = RM 300.00
5. Delete one (RM 300) → Total Saving = RM 0.00

**Expected**: All changes reflect immediately on dashboard without page refresh.

---

## Performance Test

**Scenario**: Large budget with many items

**Steps**:
1. Create 50+ budget items (mix of saving and normal)
2. Filter by "Show only Savings"
3. Toggle saving status on multiple items
4. Check dashboard load time

**Expected Results**:
- ✅ Filtering is instant
- ✅ Toggling is smooth (< 1 second)
- ✅ Dashboard loads in < 2 seconds
- ✅ No UI lag or freezing

---

## Edge Cases

### Empty States
- ✅ Dashboard shows RM 0.00 when no saving items exist
- ✅ "Show only Savings" filter shows empty table with message

### Boundary Values
- ✅ Saving item with RM 0.00 amount
- ✅ Saving item with large amount (RM 999,999.99)
- ✅ Many expenses on one saving item (100+)

### Concurrent Changes
- ✅ Two users toggling the same item (last write wins)
- ✅ Deleting a budget type with saving items (all items deleted)

### Error Handling
- ✅ Network error during toggle (user sees error toast)
- ✅ Preview endpoint fails (user can still proceed, assumes no expenses)
- ✅ Invalid data (API returns 400 with clear message)

---

## Regression Tests

Ensure existing features still work:

- ✅ Creating normal budget items (without touching saving checkbox)
- ✅ Editing budget items (name, amount)
- ✅ Deleting budget items
- ✅ Creating expenses linked to budget items
- ✅ Dashboard cards 1-7 show correct values
- ✅ Reimbursement flow unaffected
- ✅ Month creation/duplication works
- ✅ Workspace switching works

---

## Sign-Off Checklist

Before marking this feature as complete:

- [ ] SQL migration executed successfully on dev database
- [ ] All 10 test scenarios pass
- [ ] Dashboard verification complete
- [ ] Performance test acceptable (< 2s load)
- [ ] Edge cases handled gracefully
- [ ] Regression tests pass
- [ ] VIEWER, EDITOR, OWNER roles tested
- [ ] Feature works in production-like environment
- [ ] Documentation reviewed and accurate

---

## Known Limitations (By Design)

These are intentional for the MVP:

1. **No Expense Reassignment**: Expenses remain linked to the original budget item even after toggling saving status. (Future feature)
2. **No Saving Categories**: All savings are lumped together. (Future feature)
3. **No Saving Goals**: Can't set targets or track progress toward goals. (Future feature)
4. **No Rollover Automation**: Savings don't automatically carry to next month. (User must manually set Carry Over)

---

## Troubleshooting

### "Column is_saving does not exist"
- **Fix**: Run the SQL migration from `09_add_income_carry_over.sql`

### Dashboard still shows "Coming soon"
- **Fix**: Hard refresh the browser (Cmd+Shift+R / Ctrl+F5) to clear cached React code

### Confirmation modal not showing
- **Fix**: Ensure the preview endpoint `/api/budget-items/[id]/preview-toggle/route.ts` is deployed

### Total Saving always 0
- **Fix**: Ensure the view `v_month_totals` was updated (check SQL migration)

### "Mark as Saving" checkbox not appearing
- **Fix**: Check that `types/database.ts` includes `is_saving` field and restart dev server

---

## Success Criteria

✅ **All 10 test scenarios pass**  
✅ **Dashboard shows real savings data**  
✅ **Confirmation modal prevents accidental data loss**  
✅ **Performance is acceptable**  
✅ **No regressions in existing features**  
✅ **Role-based permissions work correctly**  

When all criteria are met, the Saving feature is **production-ready**.

