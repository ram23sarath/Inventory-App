# Long Item Names May Clip on Narrow Viewports

## Issue
The item name cell in tables uses `truncate` which clips long text. While this prevents overflow, users may not see the full item name on very narrow screens.

## Reproduction Steps
1. Add an item with a very long name (e.g., "Extra Large Premium Groundnuts Special")
2. View on 360px width viewport
3. Observe text is truncated with ellipsis

## Affected Components
- `src/components/ItemRow.tsx` - name cell
- `src/components/GroupedEntriesList.tsx` - item name column

## Suggested Resolution
Options (requires design input):
1. Add a tooltip showing full name on hover/long-press
2. Allow multi-line wrapping with max 2 lines
3. Implement expandable row on tap
4. Accept truncation as intended behavior (current state)

## Risk Level
Low - functional behavior is correct, just a UX enhancement opportunity.

## Notes
Current `max-w-xs` and `break-words` classes provide reasonable handling. Truncation ensures layout stability.
