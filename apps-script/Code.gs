/**
 * Christie's Hen Do – Idea Box
 * Receives submissions from the GitHub Pages site and adds them to this Sheet.
 *   - Activity ideas            → the "Ideas" tab (first tab)
 *   - Theme / dress code pitches → the "Themes" tab
 *   - Missions for Christie     → the "Missions" tab
 *   - Food and allergies        → the "Food & allergies" tab
 * Tabs are created automatically the first time something arrives for them.
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

const TABS = {
  theme:   { name: 'Themes',           headers: ['Submitted', 'Name', 'Theme', 'The look', 'Link', 'When', 'Christie factor', 'Hype (1-5)', 'Group votes', 'Status', 'Organiser notes'] },
  mission: { name: 'Missions',         headers: ['Submitted', 'Name', 'Mission', 'Rules', 'When', 'Cheek level', "G&Ts she'll need (1-5)", 'Status', 'Organiser notes'] },
  diet:    { name: 'Food & allergies', headers: ['Submitted', 'Name', 'Diet', 'Allergies & notes'] },
};

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
      tab_(ss, 'theme').appendRow([
        new Date(), clean_(p.name), clean_(p.theme), clean_(p.look), clean_(p.link),
        clean_(p.when), clean_(p.christie), clean_(p.hype),
      ]);
      return json_({ ok: true });
    }

    if (p.type === 'mission') {
      if (!p.name || !p.mission) return json_({ ok: false, error: 'Name and mission are required' });
      tab_(ss, 'mission').appendRow([
        new Date(), clean_(p.name), clean_(p.mission), clean_(p.details),
        clean_(p.when), clean_(p.cheek), clean_(p.hype),
      ]);
      return json_({ ok: true });
    }

    if (p.type === 'diet') {
      if (!p.name) return json_({ ok: false, error: 'Name is required' });
      tab_(ss, 'diet').appendRow([new Date(), clean_(p.name), clean_(p.diet), clean_(p.notes)]);
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

// Returns how many ideas, themes and missions are in the box (numbers only, never the content).
// Visit the /exec URL in a browser to check it's live.
function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const count = key => { const sh = ss.getSheetByName(TABS[key].name); return sh ? Math.max(0, sh.getLastRow() - 1) : 0; };
  return json_({
    ok: true,
    count: Math.max(0, ideasSheet_(ss).getLastRow() - 1),
    themes: count('theme'),
    missions: count('mission'),
  });
}

// The Ideas tab is the first tab that isn't one of the special ones above.
function ideasSheet_(ss) {
  const special = Object.values(TABS).map(t => t.name);
  return ss.getSheets().find(s => special.indexOf(s.getName()) === -1);
}

function tab_(ss, key) {
  const t = TABS[key];
  let sh = ss.getSheetByName(t.name);
  if (!sh) {
    sh = ss.insertSheet(t.name, ss.getSheets().length);
    sh.appendRow(t.headers);
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
