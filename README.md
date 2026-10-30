# Christie's Hen Do · HQ 🪩

The hen group's home page: the idea box, the playlist, what's new, the plan, the money, before-you-go reminders and Croatia tips. Everything people send in is saved as a new row in a private Google Sheet that only the organisers can see.

- `index.html` – the page (hosted on GitHub Pages)
- `apps-script/Code.gs` – the Google Apps Script that receives submissions and writes them to the Sheet (activity ideas → first tab, theme pitches → "Themes", missions for Christie → "Missions")

## Updating the page as plans firm up

Near the top of the script in `index.html` there's a **HUB CONTENT** block:

- `UPDATES` – the "What's new" list. Add a line at the top whenever something changes.
- `BUDGET` – the receipt on The money page: each item's low and high price per person. Totals are worked out automatically.
- `DAYS` – the itinerary. Add plans to each day's `plan` list as they're booked; empty days show "TBC".

The home screen is the idea box buttons plus a grid of tiles. Each tile opens its own page (`pg-plan`, `pg-money`, `pg-prep`, `pg-croatia`, `pg-news`); the Spotify mini player sits on the home screen under the idea box, and pages can be linked to directly, e.g. `…/christies-hen/#money`. The money and accommodation bits are plain HTML in those pages.

## Connecting it to the Sheet (one time)

1. Open the Sheet → **Extensions → Apps Script**.
2. Delete the starter code, paste in `apps-script/Code.gs`, and click **Save**.
3. **Deploy → New deployment** → click the cog → **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy** and allow access when asked (Google will warn the app is unverified: **Advanced → Go to project**).
5. Copy the **Web app URL** (ends in `/exec`) and paste it into `index.html` as `SCRIPT_URL`.

## Updating the script

After changing `Code.gs`: **Deploy → Manage deployments → ✏️ edit → Version: New version → Deploy**. This keeps the same `/exec` URL, so the page keeps working.

## Easter egg

Tap the mirror ball 5 times. 🍸
