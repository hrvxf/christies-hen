# Christie's Hen Do · Idea Box 🪩

A branded form for the hen do group to drop ideas into. Every submission is saved as a new row in a private Google Sheet that only the organisers can see.

- `index.html` – the form (hosted on GitHub Pages)
- `apps-script/Code.gs` – the Google Apps Script that receives submissions and writes them to the Sheet

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
