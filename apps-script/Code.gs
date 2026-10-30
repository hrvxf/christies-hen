/**
 * Christie's Hen Do – Idea Box
 * Receives submissions from the GitHub Pages site and adds them to this Sheet.
 *   - Activity ideas            → the "Ideas" tab
 *   - Theme / dress code pitches → the "Themes" tab
 *   - Missions for Christie     → the "Missions" tab
 *   - Finishing touches board   → the "Extras" tab (everyone can see these on the page)
 *     Organisers: type Sorted in the Status column to stamp a card, or Hidden to take it off the board.
 *   - Bank details for paying come from the "Bank details" tab (kept here, not in the public website code).
 *     Fill in its Secret word row to make people type that word before the details show.
 * Tabs are found by name, so other tabs (Budget etc.) can sit anywhere, in any order.
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
  idea:    { name: 'Ideas',            headers: ['Submitted', 'Name', 'Idea', 'Details', 'Link', 'Price each', 'Time', 'Getting there', 'Bring / wear', 'Christie factor', 'Hype (1-5)'] },
  theme:   { name: 'Themes',           headers: ['Submitted', 'Name', 'Theme', 'The look', 'Link', 'When', 'Christie factor', 'Hype (1-5)', 'Group votes', 'Status', 'Organiser notes'] },
  extra:   { name: 'Extras',           headers: ['Submitted', 'ID', 'Name', 'Extra', 'Details', 'Link', 'Category', 'Rough cost each', 'Hearts', 'Hearted by', 'Status', 'Organiser notes'] },
  mission: { name: 'Missions',         headers: ['Submitted', 'Name', 'Mission', 'Rules', 'When', 'Cheek level', "G&Ts she'll need (1-5)", 'Status', 'Organiser notes'] },
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

    if (p.type === 'extra') {
      if (!p.name || !p.extra) return json_({ ok: false, error: 'Name and extra are required' });
      const id = Utilities.getUuid().slice(0, 8);
      tab_(ss, 'extra').appendRow([
        new Date(), id, clean_(p.name), clean_(p.extra), clean_(p.details), clean_(p.link),
        clean_(p.category), clean_(p.cost), 0, '', '', '',
      ]);
      return json_({ ok: true, id: id });
    }

    // A heart on a board card. One per person per card: names are kept in "Hearted by".
    if (p.type === 'heart') {
      const who = who_(p.name);
      if (!who || !p.id) return json_({ ok: false, error: 'Name and card are required' });
      const sh = tab_(ss, 'extra'), n = sh.getLastRow() - 1;
      if (n < 1) return json_({ ok: false, error: 'No cards yet' });
      const i = sh.getRange(2, 2, n, 1).getValues().findIndex(r => String(r[0]) === String(p.id));
      if (i < 0) return json_({ ok: false, error: 'Card not found' });
      const row = i + 2, by = sh.getRange(row, 10);
      const names = String(by.getValue() || '').split(',').map(who_).filter(Boolean);
      const set = new Set(names);
      if (p.on === '0') set.delete(who); else set.add(who);
      by.setValue(clean_([...set].join(', ')));
      sh.getRange(row, 9).setValue(set.size);
      return json_({ ok: true, hearts: set.size });
    }

    if (!p.name || !p.idea) return json_({ ok: false, error: 'Name and idea are required' });
    tab_(ss, 'idea').appendRow([
      new Date(), clean_(p.name), clean_(p.idea), clean_(p.details), clean_(p.link),
      clean_(p.price), clean_(p.time), clean_(p.transport), clean_(p.kit), clean_(p.christie), clean_(p.hype),
    ]);
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

// Returns how many ideas, themes and missions are in the box (numbers only, never the content).
// With ?board=1 it returns the finishing touches board instead (that one's public on the page).
// Visit the /exec URL in a browser to check it's live.
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const q = (e && e.parameter) || {};
  if (q.board) return json_({ ok: true, items: board_(ss, who_(q.me)) });
  if (q.bank) return json_(bank_(ss, q.word));
  const count = key => { const sh = ss.getSheetByName(TABS[key].name); return sh ? Math.max(0, sh.getLastRow() - 1) : 0; };
  return json_({
    ok: true,
    count: count('idea'),
    themes: count('theme'),
    missions: count('mission'),
  });
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

function board_(ss, me) {
  const sh = ss.getSheetByName(TABS.extra.name);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 11).getValues()
    .filter(r => r[1] && String(r[10]).trim().toLowerCase() !== 'hidden')
    .map(r => ({
      id: String(r[1]), name: String(r[2]), extra: String(r[3]), details: String(r[4]), link: String(r[5]),
      category: String(r[6]), cost: String(r[7]), hearts: Number(r[8]) || 0,
      mine: !!me && String(r[9]).split(',').map(who_).indexOf(me) !== -1,
      sorted: String(r[10]).trim().toLowerCase() === 'sorted',
      at: r[0] instanceof Date ? r[0].getTime() : 0,
    }));
}

function bank_(ss, word) {
  const sh = ss.getSheetByName('Bank details');
  if (!sh || sh.getLastRow() < 2) return { ok: false, error: 'No bank details yet' };
  const rows = sh.getRange(1, 1, sh.getLastRow(), 2).getValues();
  const get = k => { const r = rows.find(x => String(x[0]).trim().toLowerCase() === k); return r ? String(r[1]).trim() : ''; };
  const secret = who_(get('secret word'));
  if (secret && who_(word) !== secret) {
    Utilities.sleep(700);                       // slows down guessing
    return { ok: false, needWord: true, wrong: !!word };
  }
  return { ok: true, name: get('name on account'), sort: get('sort code'), account: get('account number'), reference: get('reference') };
}

// Names are matched loosely so "Beth" and " beth " count as the same person.
function who_(v) { return String(v || '').trim().toLowerCase().replace(/^'/, '').slice(0, 60); }

// Keep text short and stop anything being read as a spreadsheet formula.
function clean_(v) {
  v = String(v || '').trim().slice(0, 2000);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
