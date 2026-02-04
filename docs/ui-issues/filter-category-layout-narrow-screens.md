# Filter Category Layout on Very Narrow Screens

## Issue

The filter checkboxes in View All mode may wrap awkwardly on very narrow screens (below 320px). While the current implementation uses `flex-wrap gap-4`, the spacing could be tighter on extremely narrow devices.

## Reproduction Steps

1. Navigate to the View All mode
2. Select "Expenses" section
3. Resize viewport to 320px or below
4. Observe filter checkbox layout

## Affected Viewports

- Below 320px width

## Suggested Resolution

Consider converting to a vertical stack layout using `flex-col` at very narrow breakpoints, or use a more compact inline layout. This requires design input on preferred visual treatment.

## Risk Level

Low - affects only extremely narrow viewports that are uncommon.

## File

`src/components/InventoryList.tsx` - lines 320-370 (filter checkboxes section)
