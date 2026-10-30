/**
 * Christie's Hen Do – Idea Box
 * Receives submissions from the GitHub Pages form and adds them to this Sheet.
 *
 * Setup (once):
 *  1. In the Sheet: Extensions → Apps Script. Delete what's there, paste this file, Save.
 *  2. Deploy → New deployment → type "Web app".
 *     Execute as: Me.  Who has access: Anyone.  → Deploy, then Authorise.
 *  3. Copy the Web app URL (ends in /exec) and put it in index.html as SCRIPT_URL.
 */

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const p = (e && e.parameter) || {};

    // Hidden "website" field is a spam trap: real people never fill it in.
    if (p.website) return json_({ ok: true });
    if (!p.name || !p.idea) return json_({ ok: false, error: 'Name and idea are required' });

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    sheet.appendRow([
      new Date(),
      clean_(p.name),
      clean_(p.idea),
      clean_(p.details),
      clean_(p.link),
      clean_(p.price),
      clean_(p.time),
      clean_(p.transport),
      clean_(p.kit),
      clean_(p.christie),
      clean_(p.hype),
    ]);
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

// Returns how many ideas are in the box (a number only, never the ideas themselves).
// Visit the /exec URL in a browser to check it's live.
function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  return json_({ ok: true, count: Math.max(0, sheet.getLastRow() - 1) });
}

// Keep text short and stop anything being read as a spreadsheet formula.
function clean_(v) {
  v = String(v || '').trim().slice(0, 2000);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
