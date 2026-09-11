# Find Lowell — store locator prototype

Working prototype of a dispensary locator for Lowell Herb Co, built from our own data.

**Live:** https://brya8385.github.io/find-lowell/

## What's in it

| Tier | Meaning | States | Source |
|---|---|---|---|
| In stock | Confirmed on the store's menu today, with price | NY, NJ, IL, MO, OH | Lit Alerts daily snapshot |
| Carries Lowell | We ship it; no menu feed covers the store | NJ, IL | Sell-in, last 180 days |
| Partner-reported | Location by city, not verified address | CO, NM, CA | Vireo / Standard Wellness reports |

## Prices

Prices shown are the **retail shelf price from the store's own menu**, including any discount
it is running. They are never our wholesale price. Stores that come from partner reports show
no price, because the only figure we hold for them is what we charged the retailer — which is
not what a shopper pays. Tier A: 500 of 534 priced. Tier B and C: zero, by construction.

## Notes

- Coordinates geocoded once via the US Census geocoder with an OpenStreetMap fallback.
- Product lines and varietals are derived by one shared classifier so the filters and the
  listed products can never disagree.
- "Shake" is a retailer's word for our ground flower, not a product — it is normalised away.
- All Terrain is a mixed pack and shows as **Variety**, not Hybrid.
- Missouri is pulled live from the Lit Alerts API; our nightly sync stopped requesting it.
- Ohio went live on 11 Sep 2026, when the API token was reissued carrying `OH` in its claims.
  The entitlement is baked into the JWT, so adding a state means a new token, not just a contract.

Regenerate `data/doors.json` from the scripts in the working scratchpad; this repo holds the
published output only.
