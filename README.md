# Christie's Hen Do · HQ 🪩

The hen group's home page: the idea box, the playlist, what's new, the plan, the money, before-you-go reminders and Croatia tips. Everything people send in is saved as a new row in a private Google Sheet that only the organisers can see.

- `index.html` – the page (hosted on GitHub Pages)
- `apps-script/Code.gs` – the Google Apps Script that receives submissions (and serves the bank details from the Sheet's "Bank details" tab, so they never sit in this public code) and writes them to the Sheet (activity ideas → first tab, theme pitches → "Themes", missions for Christie → "Missions", the finishing touches board → "Extras")

## Who's who

The first time someone opens the HQ on a phone, the door shows the guest list (`GUESTS` in the HUB CONTENT block) and they tap their name. The phone remembers them from then on: the door says "Welcome back", and the forms, hearts and pins use that name without asking again. "Not on the list?" lets anyone else type their name, and "Not you?" (on the door, or at the top of More) switches who's on that phone.

Each phone checks in to the Sheet's "Guests" tab: the name, when they first and last came in, and how many visits, so you can see who's had a look. iPhones wipe a website's saved data after about a week without a visit, so anyone who's been away a while may be asked to tap their name again. Adding the HQ to the home screen (Share → Add to Home Screen) stops that.

## The finishing touches board

Everyone can see it. Cards come from the "Extras" tab. Type **Sorted** in a card's Status column to stamp it, or **Hidden** to take it off the board. Hearts are counted once per name (the "Hearted by" column).

## Updating the page as plans firm up

Near the top of the script in `index.html` there's a **HUB CONTENT** block:

- `UPDATES` – the "What's new" list. Add a line at the top whenever something changes.
- `BUDGET` – the receipt on The money page: each item's price per person, either one `cost` (mark `booked: true` once paid) or a `from`/`to` range. Totals are worked out automatically.
- `DAYS` – the itinerary. Add plans to each day's `plan` list as they're booked; empty days show "TBC".
- `VILLA_TOUR` – the villa reveal. It plays once on each phone, the first time someone taps into the HQ (press and hold the key card, the villa lights up, then a four-photo tour). Swap photos or captions here; the photos live in `villa/`. The full villa page (`pg-villa`, `…/christies-hen/#villa`) is plain HTML, and "Watch the reveal again" at the bottom of it replays the reveal.

The home screen is the idea box buttons plus a grid of tiles. Each tile opens its own page (`pg-villa`, `pg-plan`, `pg-money`, `pg-prep`, `pg-croatia`, `pg-news`); the Spotify mini player sits on the home screen under the idea box, and pages can be linked to directly, e.g. `…/christies-hen/#money`. The money and accommodation bits are plain HTML in those pages.

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

## The look

The styling ends with an **AFTER DARK** layer at the bottom of the `<style>` block: ink and plum ground, champagne gold for anything you tap, cream for the paper props, Cormorant Garamond headings, Outfit to read, Space Mono for labels. One gold button per screen, thin gold outlines for the quieter ones, no emojis. To tweak colours, change the variables at the top of that layer.

The **dock** at the bottom is the main navigation: Home, Plan, the gold + (suggest an activity), Board and More. More opens a drawer with everything else (villa, costs, before you go, Croatia 101, missions, what's new, the playlist). The home screen's "Next up for you" card shows each person the first thing on their Before you go checklist they haven't ticked yet. Cards are solid colours rather than outlines, and each one shows a status as well as where it goes.
