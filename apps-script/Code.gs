/**
 * Christie's Hen Do – Idea Box
 * Receives submissions from the GitHub Pages site and adds them to this Sheet.
 *   - Activity ideas → the "Ideas" tab (first tab)
 *   - Theme / dress code pitches → the "Themes" tab
 *
 * Setup (once):
 *  1. In the Sheet: Extensions → Apps Script. Delete what's there, paste this file, Save.
 *  2. Deploy → New deployment → type "Web app".
 *     Execute as: Me.  Who has access: Anyone.  → Deploy, then Authorise.
 *  3. Copy the Web app URL (ends in /exec) and put it in index.html as SCRIPT_URL.
 *
 * Updating later: Deploy → Manage deployments → ✏️ edit → Version: New version → Deploy.
 * (That keeps the same /exec URL.)
 */

const THEMES_TAB = 'Themes';
const THEME_HEADERS = ['Submitted', 'Name', 'Theme', 'The look', 'Link', 'When', 'Christie factor', 'Hype (1-5)', 'Group votes', 'Status', 'Organiser notes'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const p = (e && e.parameter) || {};

    // Hidden "website" field is a spam trap: real people never fill it in.
    if (p.website) return json_({ ok: true });

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (p.type === 'theme') {
      if (!p.name || !p.theme) return json_({ ok: false, error: 'Name and theme are required' });
      themesSheet_(ss).appendRow([
        new Date(), clean_(p.name), clean_(p.theme), clean_(p.look), clean_(p.link),
        clean_(p.when), clean_(p.christie), clean_(p.hype),
      ]);
      return json_({ ok: true });
    }

    if (!p.name || !p.idea) return json_({ ok: false, error: 'Name and idea are required' });
    ideasSheet_(ss).appendRow([
      new Date(), clean_(p.name), clean_(p.idea), clean_(p.details), clean_(p.link),
      clean_(p.price), clean_(p.time), clean_(p.transport), clean_(p.kit), clean_(p.christie), clean_(p.hype),
    ]);
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

// Returns how many ideas and themes are in the box (numbers only, never the content).
// Visit the /exec URL in a browser to check it's live.
function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const themes = ss.getSheetByName(THEMES_TAB);
  return json_({
    ok: true,
    count: Math.max(0, ideasSheet_(ss).getLastRow() - 1),
    themes: themes ? Math.max(0, themes.getLastRow() - 1) : 0,
  });
}

function ideasSheet_(ss) {
  return ss.getSheets().find(s => s.getName() !== THEMES_TAB);
}

function themesSheet_(ss) {
  let sh = ss.getSheetByName(THEMES_TAB);
  if (!sh) {
    sh = ss.insertSheet(THEMES_TAB, ss.getSheets().length);
    sh.appendRow(THEME_HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
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
