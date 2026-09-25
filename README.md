# Find Lowell — store locator

A dispensary locator for Lowell Herb Co, built from our own data.

**Live:** https://brya8385.github.io/find-lowell/

## What's in it

| Tier | Meaning | States | Source |
|---|---|---|---|
| In stock | Lowell is on the store's own menu today, with the menu's price | NY, NJ, IL, MO, OH | Live menu feed |
| Carries Lowell (dashed pin) | We shipped the store in the last 180 days and no menu feed reads its menu | NJ, IL | Our shipments |
| Partner-reported (grey pin) | Sold in the partner's latest monthly report | CO, NM | Vireo's monthly retail report (Vireo sells Lowell only in its own stores) |
| | Shipped since June 2026, where the store can be placed on a map | CA | Our shipments |

## How it updates

`data/doors.json` is rebuilt every morning (11:00 UTC) by a private builder and committed
here. It is published only when every validation check passes: the in-stock store count is
within 20% of the previous day, the menu data is at most two days old, no Tier B or C store
carries a price, every store has coordinates inside its own state, every menu link is a full
web address, no two entries share a street address, and every partner location maps to a
named store. If any check fails, yesterday's file stays up. The page shows when the file was
last updated and how old the menu data behind it is.

`data/doors.json` keeps its path and its keys (new keys are only ever added), because other
pages read it directly.

## Prices

Prices shown are the **retail shelf price from the store's own menu**, including any discount
it is running. They are never our wholesale price. Stores from shipments or partner reports
show no price, because the only figure we hold for them is what we charged the retailer.

## Notes

- A product line is a pack shape (Quicks 10 × 0.35 g, Smokes 6 × ~0.6 g, 35's 20 × 0.35 g,
  Outlaws a single 1 g), and a SKU is line × lean. One classification pass feeds the filters,
  the badge and the product list, so they can never disagree.
- "Shake" is a retailer's word for our ground flower, not a product; it is normalised away.
- All Terrain is a mixed pack and shows as **Variety**, not Hybrid.
- Two entries at one street address are one store, whatever ids the sources give them.
- Store addresses for the partner-reported stores come from each chain's own store pages.
- Phone numbers come from the lowellherbco.com store list. No source carries opening hours.
- The September 2026 audit of the first version is in `AUDIT-2026-09.md`.
