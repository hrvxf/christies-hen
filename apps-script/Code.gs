/**
 * Christie's Hen Do – Idea Box
 * Receives submissions from the GitHub Pages site and adds them to this Sheet.
 *   - Activity ideas            → the "Ideas" tab
 *   - Theme / dress code pitches → the "Themes" tab
 *   - Missions for Christie     → the "Missions" tab
 *   - Themes & extras board     → the "Extras" tab (everyone can see these on the page and vote on them)
 *   - Who's been in             → the "Guests" tab: one row per phone, with the name they picked at the door,
 *                                 when they first and last came in, and how many visits.
 *     Organisers: in the Extras tab's Status column pick Confirmed to lock a pin in (an extra moves to
 *     Confirmed on the page and its cost comes off the extras pot; a theme gets stamped for its day),
 *     or Not this time / Hidden to take it off the board. Blank means it's still up for a vote.
 *     The pot's size comes from the Budget tab's "Extras pot" row.
 *   - Bank details for paying come from the "Bank details" tab (kept here, not in the public website code).
 *     Fill in its Secret word row to make people type that word before the details show.
 *   - Organiser mode (Adam's lock in the HQ): every organiser request carries the code from the Bank details
 *     tab's "Organiser code" row and is checked here. Five wrong codes in 15 minutes locks it for 15 minutes.
 *     Unlocked, the HQ can confirm / turn down board pins, log an extra as bought (a row in the Budget tab's
 *     Payments out, against the Extras pot), and see and confirm activity ideas (a line in Costs and bookings).
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
  extra:   { name: 'Extras',           headers: ['Submitted', 'ID', 'Name', 'Extra', 'Details', 'Link', 'Category', 'Rough cost (all in)', 'Hearts', 'Hearted by', 'Status', 'Organiser notes', 'Day'] },
  guest:   { name: 'Guests',           headers: ['Device', 'Name', 'First seen', 'Last seen', 'Visits', 'Phone'] },
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

    // A phone checking in at the door. One row per phone; a name change just updates the row.
    if (p.type === 'hello') {
      const dev = String(p.device || '').trim().slice(0, 40);
      if (!p.name || !dev) return json_({ ok: false, error: 'Name and device are required' });
      const sh = tab_(ss, 'guest'), now = new Date(), n = sh.getLastRow() - 1;
      const i = n > 0 ? sh.getRange(2, 1, n, 1).getValues().findIndex(r => String(r[0]) === dev) : -1;
      if (i < 0) {
        sh.appendRow([dev, clean_(p.name), now, now, 1, clean_(p.phone)]);
      } else {
        const row = i + 2, visits = Number(sh.getRange(row, 5).getValue()) || 0;
        sh.getRange(row, 2).setValue(clean_(p.name));
        sh.getRange(row, 4, 1, 3).setValues([[now, visits + 1, clean_(p.phone)]]);
      }
      return json_({ ok: true });
    }

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
        clean_(p.category), clean_(p.cost), 0, '', '', '', clean_(p.day),
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
  if (q.board) return json_({ ok: true, items: board_(ss, who_(q.me)), pot: pot_(ss) });
  if (q.bank) return json_(bank_(ss, q.word));
  if (q.org) return json_(org_(ss, q));
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

// Status: blank (or "Up for a vote") = voting, "Confirmed" (or the old "Sorted") = locked in,
// "Not this time" or "Hidden" = off the board.
function board_(ss, me) {
  const sh = ss.getSheetByName(TABS.extra.name);
  if (!sh || sh.getLastRow() < 2) return [];
  const status = r => String(r[10]).trim().toLowerCase();
  return sh.getRange(2, 1, sh.getLastRow() - 1, 13).getValues()
    .filter(r => r[1] && ['hidden', 'not this time'].indexOf(status(r)) === -1)
    .map(r => {
      const by = String(r[9]).split(',').map(who_).filter(Boolean);
      return {
        id: String(r[1]), name: String(r[2]), extra: String(r[3]), details: String(r[4]), link: String(r[5]),
        category: String(r[6]), cost: String(r[7]), hearts: by.length || Number(r[8]) || 0, by: by,
        mine: !!me && by.indexOf(me) !== -1,
        confirmed: ['confirmed', 'sorted'].indexOf(status(r)) !== -1,
        day: String(r[12] || ''),
        at: r[0] instanceof Date ? r[0].getTime() : 0,
      };
    });
}

// The extras pot, from the Budget tab's "Extras pot" row (the amount is in the next column).
function pot_(ss) {
  const sh = ss.getSheetByName('Budget');
  if (!sh) return null;
  const rows = sh.getRange(1, 1, Math.min(sh.getLastRow(), 60), 2).getValues();
  const r = rows.find(x => String(x[0]).trim().toLowerCase().indexOf('extras pot') === 0);
  const n = r ? Number(r[1]) : NaN;
  return isFinite(n) ? n : null;
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

/* ---------------- Organiser mode ---------------- */

function org_(ss, q) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const auth = orgOk_(ss, q.code);
    if (!auth.ok) return auth;
    if (q.org === 'check') return { ok: true };
    if (q.org === 'ideas') return { ok: true, ideas: ideas_(ss) };
    if (q.org === 'pin') return pinStatus_(ss, q);
    if (q.org === 'bought') return bought_(ss, q);
    if (q.org === 'idea') return ideaStatus_(ss, q);
    return { ok: false, error: 'Unknown action' };
  } finally {
    lock.releaseLock();
  }
}

function orgOk_(ss, code) {
  const cache = CacheService.getScriptCache(), fails = Number(cache.get('orgFails') || 0);
  if (fails >= 5) return { ok: false, locked: true };
  const sh = ss.getSheetByName('Bank details');
  const rows = sh && sh.getLastRow() ? sh.getRange(1, 1, sh.getLastRow(), 2).getValues() : [];
  const r = rows.find(x => String(x[0]).trim().toLowerCase() === 'organiser code');
  const want = r ? String(r[1]).trim() : '';
  if (want && String(code || '').trim() === want) return { ok: true };
  Utilities.sleep(900);                          // slows down guessing
  cache.put('orgFails', String(fails + 1), 900);
  return { ok: false, wrong: true };
}

// The first cell (top 80 rows) whose text is exactly label, as { row, col } (1-based).
function head_(sh, label) {
  const v = sh.getRange(1, 1, Math.min(sh.getMaxRows(), 80), sh.getMaxColumns()).getDisplayValues();
  for (let r = 0; r < v.length; r++) { const c = v[r].indexOf(label); if (c !== -1) return { row: r + 1, col: c + 1 }; }
  return null;
}
// The first row at or below startRow where width cells from col are all empty.
function firstEmpty_(sh, startRow, col, width) {
  const n = Math.max(1, sh.getMaxRows() - startRow + 1);
  const v = sh.getRange(startRow, col, n, width).getValues();
  const i = v.findIndex(r => r.every(x => x === '' || x === null));
  return i === -1 ? null : startRow + i;
}
function extraRow_(sh, id) {
  const n = sh.getLastRow() - 1;
  if (n < 1 || !id) return 0;
  const i = sh.getRange(2, 2, n, 1).getValues().findIndex(r => String(r[0]) === String(id));
  return i < 0 ? 0 : i + 2;
}
const today_ = () => Utilities.formatDate(new Date(), 'Europe/London', 'dd/MM/yyyy');

// Confirm, turn down, hide or send back to the vote a board pin; optionally set its cost.
function pinStatus_(ss, q) {
  const sh = tab_(ss, 'extra'), row = extraRow_(sh, q.id);
  if (!row) return { ok: false, error: 'Card not found' };
  const s = String(q.status || '');
  if (['Confirmed', 'Not this time', 'Hidden', ''].indexOf(s) === -1) return { ok: false, error: 'Unknown status' };
  sh.getRange(row, 11).setValue(s);
  if (q.cost !== undefined && String(q.cost).trim() !== '') sh.getRange(row, 8).setValue(clean_(q.cost));
  return { ok: true };
}

// Log what an extra actually cost: a row in the Budget tab's Payments out, against the Extras pot line.
function bought_(ss, q) {
  const amt = Number(String(q.amount || '').replace(/[^0-9.]/g, ''));
  if (!(amt > 0)) return { ok: false, error: 'How much was it?' };
  const ex = tab_(ss, 'extra'), row = extraRow_(ex, q.id);
  if (!row) return { ok: false, error: 'Card not found' };
  const b = ss.getSheetByName('Budget');
  const h = b && head_(b, 'For (item)');
  if (!h) return { ok: false, error: "Can't find Payments out in the Budget tab" };
  let item = 'Extras pot';
  const it = head_(b, 'Item');
  if (it) {
    const v = b.getRange(it.row + 1, it.col, 100, 3).getValues().find(r => String(r[2]).trim() === 'From contingency');
    if (v) item = String(v[0]);
  }
  const r = firstEmpty_(b, h.row + 1, h.col - 2, 4);
  if (!r) return { ok: false, error: 'Payments out is full' };
  const what = String(ex.getRange(row, 4).getValue());
  b.getRange(r, h.col - 2, 1, 4).setValues([[today_(), clean_(q.to), item, amt]]);
  b.getRange(r, h.col + 4).setValue(clean_(what + (q.note ? ' · ' + q.note : '')));
  ex.getRange(row, 11).setValue('Confirmed');
  const notes = ex.getRange(row, 12), was = String(notes.getValue() || '');
  notes.setValue(clean_((was ? was + ' | ' : '') + 'Bought: £' + amt + ' on ' + today_()));
  return { ok: true };
}

// The private idea box, for the organiser only. Columns are found by their headers.
function ideaCols_(sh) {
  const h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(x => String(x).trim().toLowerCase());
  const at = (...names) => { for (const n of names) { const i = h.findIndex(x => x.indexOf(n) === 0); if (i !== -1) return i; } return -1; };
  return { name: at('name'), idea: at('idea'), details: at('details'), link: at('link'), price: at('price'), time: at('time'),
    transport: at('transport', 'getting there'), kit: at('kit', 'bring'), christie: at('christie'), hype: at('hype'),
    status: at('status'), notes: at('organiser notes'), width: h.length };
}
function ideas_(ss) {
  const sh = ss.getSheetByName(TABS.idea.name);
  if (!sh || sh.getLastRow() < 2) return [];
  const c = ideaCols_(sh), get = (r, k) => c[k] >= 0 ? String(r[c[k]] || '') : '';
  return sh.getRange(2, 1, sh.getLastRow() - 1, c.width).getValues().map((r, i) => ({
    row: i + 2, at: r[0] instanceof Date ? r[0].getTime() : 0,
    name: get(r, 'name'), idea: get(r, 'idea'), details: get(r, 'details'), link: get(r, 'link'), price: get(r, 'price'),
    time: get(r, 'time'), transport: get(r, 'transport'), kit: get(r, 'kit'), christie: get(r, 'christie'), hype: get(r, 'hype'),
    status: get(r, 'status'),
  })).filter(x => x.idea && x.status.toLowerCase() !== 'hidden');
}
// Confirm or turn down an activity idea. Confirming can add it to the Budget tab's Costs and bookings
// as "Quoted", at the price each times everyone paying.
function ideaStatus_(ss, q) {
  const sh = ss.getSheetByName(TABS.idea.name);
  if (!sh) return { ok: false, error: 'No ideas yet' };
  let c = ideaCols_(sh);
  if (c.status === -1) { sh.getRange(1, c.width + 1).setValue('Status'); c = ideaCols_(sh); }
  const row = Number(q.row);
  if (!(row >= 2 && row <= sh.getLastRow())) return { ok: false, error: 'Idea not found' };
  const vals = sh.getRange(row, 1, 1, c.width).getValues()[0];
  const idea = String(vals[c.idea] || '');
  if (idea !== String(q.idea || '')) return { ok: false, error: 'That idea has moved in the Sheet. Reload and try again.' };
  const s = String(q.status || '');
  if (['Confirmed', 'Not this time', ''].indexOf(s) === -1) return { ok: false, error: 'Unknown status' };
  sh.getRange(row, c.status + 1).setValue(s);
  if (s !== 'Confirmed' || q.add !== '1') return { ok: true };

  const b = ss.getSheetByName('Budget'), it = b && head_(b, 'Item');
  if (!it) return { ok: true, warn: "Confirmed, but couldn't find Costs and bookings in the Budget tab" };
  const r = firstEmpty_(b, it.row + 1, it.col, 1);
  const each = Number(String(q.each || '').replace(/[^0-9.]/g, ''));
  const ppl = head_(b, 'People paying');
  const total = each > 0 ? (ppl ? '=' + each + '*' + b.getRange(ppl.row, ppl.col + 1).getA1Notation() : each * 7) : '';
  const who = String(vals[c.name] || '').trim();
  b.getRange(r, it.col, 1, 4).setValues([[clean_(idea), '', 'Quoted', total]]);
  b.getRange(r, it.col + 10).setValue(clean_('From the idea box' + (who ? ': ' + who + "'s idea" : '') + (each > 0 ? '. £' + each + ' each, times everyone paying.' : '. Add the total cost.')));
  if (c.notes >= 0) sh.getRange(row, c.notes + 1).setValue(clean_('Added to the budget ' + today_()));
  return { ok: true, added: true };
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
