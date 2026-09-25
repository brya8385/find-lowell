# Find Lowell — store locator

A dispensary locator for Lowell Herb Co, built from our own data.

**Live:** https://brya8385.github.io/find-lowell/

## What's in it

Every store on the map sells Lowell. Each card says only what we can back up:

| Card | Meaning | States | Source |
|---|---|---|---|
| **In stock** · N products + price | The store's own online menu lists Lowell in stock today | NY, NJ, IL, MO, OH | Live menu feed |
| **Currently out of stock** | The store's online menu lists no Lowell in stock today | NY, NJ, IL, MO, OH | Live menu feed |
| No badge, plain "Lowell store" pin | No online menu we can read; the store bought Lowell in the last 60 days, so we make no claim about today's shelf | NJ, IL, CA, CO, NM, MO, OH | Our shipments delivered in the store's state (CA: where the store can be placed on a map); Vireo's monthly retail report for CO and NM (Vireo sells Lowell only in its own stores); Standard Wellness's monthly report for MO and OH |

In `data/doors.json` each store's `st` field carries this: `in_stock`, `out_of_stock` or
`carries`. The older `B` and `C` flags are kept so existing readers don't break; nothing
should be labelled from them.

## How it updates

`data/doors.json` is rebuilt every morning (11:00 UTC) by a private builder and committed
here. It is published only when every validation check passes, among them:

- the count of stores with a live menu is within 20% of the previous day;
- the menu data is at most two days old, in every state;
- no store without a live menu carries a price;
- every store has coordinates inside its own state, and no two entries share a street address;
- every menu link is a full web address whose host resolves, and a real browser has seen it
  open to our products (a store's Lowell brand page, or a product page showing our
  product). A store with no such page gets no link, never its home page;
- every store without a live menu bought Lowell in the last 60 days;
- every partner location maps to a named store.

If any check fails, yesterday's file stays up. The page shows when the file was last updated
and how old the menu data behind it is.

`data/doors.json` keeps its path and its keys (new keys are only ever added), because other
pages read it directly.

## Prices

Prices shown are the **retail shelf price from the store's own menu** for a pack it has in
stock, including any discount it is running. They are never our wholesale price. Stores
without a live menu show no price, because the only figure we hold for them is what we or
our partner charged the retailer.

## Notes

- A product line is a pack shape (Quicks 10 × 0.35 g, Smokes 6 × ~0.6 g, 35's 20 × 0.35 g,
  Outlaws a single 1 g), and a SKU is line × lean. 35's is a 20-pack in New York (menus list
  it as "20 .35 Pre-Rolls | 7g") and a 10-pack in California (our California shipments list
  "LOWELL 35, … 10 Pack"). One classification pass feeds the filters, the badge and the
  product list, so they can never disagree.
- A pack that names no blend is shown by its lean ("Quicks — Hybrid blend"), never by a
  bare letter.
- "Shake" is a retailer's word for our ground flower, not a product; it is normalised away.
- All Terrain is a mixed pack and shows as **Variety**, not Hybrid.
- Two entries at one street address are one store, whatever ids the sources give them.
- Store addresses for the stores from partner reports come from each chain's own store pages.
- Phone numbers come from the lowellherbco.com store list. No source carries opening hours.
- The September 2026 audit of the first version is in `AUDIT-2026-09.md`.
