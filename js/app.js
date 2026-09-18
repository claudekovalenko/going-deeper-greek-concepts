/**
 * Greek Cases — mnemonics and drills for Going Deeper with NT Greek, ch. 2–6.
 *
 * Deliberately one file. The sibling app (seminary-homework-2026) learned the
 * hard way that a module graph behind a service worker can serve a fresh page
 * beside stale code; one file means one cache key, so `?v=vN` invalidates the
 * whole app at once and there is nothing to bundle.
 */

const BUILD = 'v33 · 2026-09-18';

// Where the "back to homework" link points. The seminary app links here; this
// links back, so the two feel like two rooms rather than two buildings.
const HOMEWORK_APP = 'https://claudekovalenko.github.io/seminary-homework-2026/';

/**
 * What a new person is aiming at, until they set their own under Progress.
 * Computed rather than hard-coded: a fixed date silently rots, and a countdown
 * reading "-3 days" is worse than no countdown at all.
 */
function nextSaturday(from = new Date()) {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7)); // today, if today is Saturday
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Where the list of people lives. Each person's progress is a separate entry
// under gdgc.v1:<id>, so switching is just reading a different key — no server,
// no accounts, nothing leaves the device.
const PEOPLE_KEY = 'gdgc.people';
const LEGACY_KEY = 'gdgc.v1';
const stateKey = (id) => `${LEGACY_KEY}:${id}`;
const BOXES = 5; // Leitner boxes; box 4 and up counts as learned.
const LEARNED_AT = 4;

let DATA = null;
let route = parseRoute(location.hash);

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Escape, then turn the data files' *asterisk markers* into highlights. */
const mk = (s) => esc(s).replace(/\*([^*]+)\*/g, '<mark>$1</mark>');

/** The same text with the markers simply removed — for quiz prompts. */
const plain = (s) => String(s ?? '').replace(/\*/g, '');

/* ---------------- who is using it ---------------- */

let people = loadPeople();

function loadPeople() {
  try {
    const raw = JSON.parse(localStorage.getItem(PEOPLE_KEY) || 'null');
    if (raw && Array.isArray(raw.list) && raw.list.length) return raw;
  } catch {
    /* fall through and start a fresh list */
  }
  // First run, or an upgrade from the version that only knew one person:
  // whatever progress is already stored belongs to whoever has been using it,
  // so it becomes that person's rather than being orphaned.
  const first = { id: 'p1', name: 'Me' };
  const seeded = { list: [first], active: first.id };
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy && !localStorage.getItem(stateKey(first.id))) {
      localStorage.setItem(stateKey(first.id), legacy);
    }
    localStorage.setItem(PEOPLE_KEY, JSON.stringify(seeded));
  } catch {
    /* private mode: the picker still works, it just will not be remembered */
  }
  return seeded;
}

function savePeople() {
  try {
    localStorage.setItem(PEOPLE_KEY, JSON.stringify(people));
  } catch {
    /* as above */
  }
}

const activePerson = () => people.list.find((x) => x.id === people.active) || people.list[0];

/** Everything transient belongs to whoever was here a moment ago. Drop it. */
function usePerson(id) {
  if (!people.list.some((x) => x.id === id)) return;
  people.active = id;
  savePeople();
  state = load();
  quiz = null;
  current = null;
  flipped = false;
  test = null;
  render();
}

function addPerson(rawName) {
  const name = String(rawName || '').trim().slice(0, 24);
  if (!name) return;
  const person = { id: `p${Date.now().toString(36)}`, name };
  people.list.push(person);
  usePerson(person.id);
}

function renamePerson(id, rawName) {
  const name = String(rawName || '').trim().slice(0, 24);
  const person = people.list.find((x) => x.id === id);
  if (!person || !name) return;
  person.name = name;
  savePeople();
  render();
}

function removePerson(id) {
  // Never leave the app with nobody in it.
  if (people.list.length < 2) return;
  people.list = people.list.filter((x) => x.id !== id);
  try {
    localStorage.removeItem(stateKey(id));
  } catch {
    /* nothing to clean up */
  }
  savePeople();
  usePerson(people.active === id ? people.list[0].id : people.active);
}

/* ---------------- storage ---------------- */

const blank = () => ({
  cards: {}, // id -> { box, seen, right, wrong, last }
  spot: { asked: 0, right: 0, best: 0, streak: 0 },
  target: nextSaturday(),
  // Which set the Learn/Drill/Spot views were last filtered to, so the app
  // reopens where you left it rather than at the top every time.
  filter: 'all',
  // Set once you have waved away the "add it to your home screen" card. The
  // one in Settings is permanent; this only silences the one on the Map.
  installDismissed: false,
  // Quiz prep: the exam is on the Greek, so you can put the gloss away.
  hideEnglish: false
});

let state = load();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(stateKey(people.active)) || 'null');
    return raw ? { ...blank(), ...raw, spot: { ...blank().spot, ...(raw.spot || {}) } } : blank();
  } catch {
    return blank();
  }
}

function save() {
  try {
    localStorage.setItem(stateKey(people.active), JSON.stringify(state));
  } catch {
    /* private mode, a full quota — the app still works, it just forgets. */
  }
}

function progressOf(id) {
  return state.cards[id] || { box: 0, seen: 0, right: 0, wrong: 0, last: null };
}

/** Right answer: up a box. Wrong: all the way back to box 1, which is the point. */
function grade(id, correct) {
  const p = { ...progressOf(id) };
  p.seen += 1;
  p.last = Date.now();
  if (correct) {
    p.right += 1;
    p.box = Math.min(BOXES, Math.max(1, p.box) + 1);
  } else {
    p.wrong += 1;
    p.box = 1;
  }
  state.cards[id] = p;
  save();
}

const isLearned = (id) => progressOf(id).box >= LEARNED_AT;

/** Another person's card progress, read without switching to them. */
function personCards(id) {
  if (id === people.active) return state.cards;
  try {
    return JSON.parse(localStorage.getItem(stateKey(id)) || '{}').cards || {};
  } catch {
    return {};
  }
}

/* ---------------- the target date ---------------- */

function parseDay(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function daysToTarget() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((parseDay(state.target) - today) / 86400000);
}

function targetLabel() {
  const n = daysToTarget();
  if (n > 1) return `${n} days left`;
  if (n === 1) return 'tomorrow';
  if (n === 0) return 'today';
  return 'target passed';
}

/* ---------------- data helpers ---------------- */

const cardById = (id) => DATA.cards.find((c) => c.id === id);
const setById = (id) => DATA.sets.find((s) => s.id === id);
const groupById = (id) => DATA.sets.flatMap((s) => s.groups).find((g) => g.id === id);
const setColor = (id) => setById(id)?.color || 'var(--accent)';

/**
 * Which case is being taught right now: the next class not yet past, or the
 * last one if the term has run out. A hard-coded "this week" tag went stale the
 * moment the calendar moved, so this reads the timetable instead.
 */
/**
 * What this app covers, taken from the chapter line in the data rather than
 * written out again here: "ch. 2-6 — the cases, the article, the adjective, and
 * the verb" gives back everything after the dash. Every count and description in
 * the hero is computed for the same reason — three of them had gone stale by
 * chapter 6, all saying "seven" of things there were now eleven of.
 */
function spread() {
  const m = String(DATA.chapter || '').split('\u2014');
  return (m[1] || DATA.chapter || '').trim();
}

function thisWeekSets() {
  const dated = DATA.sets.filter((s) => s.classDate);
  if (!dated.length) return DATA.sets.map((s) => s.id);
  const today = S_startOfToday();
  const byDate = (a, b) => parseDay(a.classDate) - parseDay(b.classDate);
  const ahead = dated.filter((s) => parseDay(s.classDate) >= today).sort(byDate);
  const when = (ahead.length ? ahead[0] : [...dated].sort(byDate).pop()).classDate;
  return dated.filter((s) => s.classDate === when).map((s) => s.id);
}

function S_startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Is this a filter the views know how to apply? */
const isFilter = (arg) => arg === 'all' || arg === 'week' || !!setById(arg) || String(arg).startsWith('tag:');

/** The cards a view is currently working with, honouring set or tag filters. */
function selection(filter = state.filter) {
  if (!filter || filter === 'all') return DATA.cards;
  if (filter === 'week') {
    const ids = thisWeekSets();
    return DATA.cards.filter((c) => ids.includes(c.set));
  }
  if (filter.startsWith('tag:')) {
    const tag = filter.slice(4);
    return DATA.cards.filter((c) => (c.tags || []).includes(tag));
  }
  return DATA.cards.filter((c) => c.set === filter);
}

function filterLabel(filter = state.filter) {
  if (!filter || filter === 'all') return 'Everything';
  if (filter === 'week') {
    const names = thisWeekSets().map((id) => setById(id).name);
    return `This week — ${names.join(', ')}`;
  }
  if (filter.startsWith('tag:')) return `#${filter.slice(4)}`;
  return setById(filter)?.name || filter;
}

/* ---------------- routing ---------------- */

/**
 * `#/learn/nominative`, `#/card/predicate-nominative`, `#/tag/saturday`.
 * Bare `#learn` works too, so a hand-typed or older link still lands somewhere.
 */
function parseRoute(hash) {
  const raw = String(hash || '').replace(/^#\/?/, '');
  const [name = 'map', arg = null] = raw.split('/');
  return { name: name || 'map', arg: arg || null };
}

const VIEW_NAMES = new Set(['map', 'picture', 'learn', 'drill', 'spot', 'test', 'progress', 'card', 'tag', 'confusions']);

function go(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

/**
 * A link in from the homework app may carry `?from=<url>`, and we send the user
 * back there rather than guessing. Anything that is not an http(s) URL is
 * ignored — a hash parameter is attacker-supplied by definition.
 */
function returnLink() {
  const from = new URLSearchParams(location.search).get('from');
  if (!from) return HOMEWORK_APP;
  try {
    const url = new URL(from, location.href);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : HOMEWORK_APP;
  } catch {
    return HOMEWORK_APP;
  }
}

const backRow = () => `
  <a class="backlink" href="${esc(returnLink())}">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
    Back to Seminary Homework
  </a>`;

/* ---------------- installing it ---------------- */

// Chrome hands us the install prompt instead of showing its own, so we hold on
// to it and put it behind a button. Safari never fires this and has no API for
// it at all — there, all we can do is say where the button is.
let installPrompt = null;
let swReady = false;

const standalone = () =>
  matchMedia('(display-mode: standalone)').matches ||
  matchMedia('(display-mode: minimal-ui)').matches ||
  navigator.standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  render();
});

window.addEventListener('appinstalled', () => {
  installPrompt = null;
  render();
});

const ICON_SHARE = `<svg viewBox="0 0 24 24" aria-hidden="true" class="inline-icon"><path d="M12 15V4"/><path d="M8.5 7.5 12 4l3.5 3.5"/><path d="M6 12H4v8h16v-8h-2"/></svg>`;
const ICON_PLUS = `<svg viewBox="0 0 24 24" aria-hidden="true" class="inline-icon"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 9v6M9 12h6"/></svg>`;

/**
 * How to get this onto a home screen, in whichever of the three situations you
 * are actually in. `dismissible` is the copy that lives on the Map and can be
 * waved away; Settings keeps a permanent one.
 */
function installCard({ dismissible = false } = {}) {
  if (dismissible && (state.installDismissed || standalone())) return '';

  const offline = location.protocol === 'file:';

  const body = offline
    ? `<p class="note">This is the single-file copy, opened straight off the disk. It works with no network at all, but a
         browser will not install a <code>file://</code> page to a home screen — for that, open the hosted address instead.</p>`
    : standalone()
      ? `<p class="note">Installed — you are running it from your home screen. It works with no network, and the drill,
           the cards and your progress are all on the device.</p>`
      : installPrompt
        ? `<p class="note">Add it to your home screen and it opens full-screen, with no browser chrome, and works offline.</p>
           <div class="btnrow"><button class="btn primary wide" data-action="install">${ICON_PLUS} Install</button></div>`
        : isIos()
          ? `<p class="note">On iPhone and iPad, Safari puts this behind the Share button:</p>
             <ol class="steps">
               <li>Tap ${ICON_SHARE} <strong>Share</strong> at the bottom of Safari.</li>
               <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
               <li>Tap <strong>Add</strong>.</li>
             </ol>
             <p class="note">It has to be Safari — Chrome on iOS cannot install a web app. Once it is on the home screen it
                opens full-screen and works with no signal.</p>`
          : `<p class="note">Your browser will offer <strong>Install app</strong> in its menu once it has seen the page a
               couple of times — in Chrome it is the ⋮ menu, or an icon in the address bar. Installed, it opens full-screen
               and works offline.</p>`;

  return `
    <section class="card">
      <h2>
        ${standalone() ? 'On your home screen' : 'Put it on your home screen'}
        ${dismissible ? `<button class="btn small ghost dismiss" data-action="dismiss-install" aria-label="Dismiss">✕</button>` : ''}
      </h2>
      ${body}
      ${
        offline
          ? ''
          : `<p class="note ${swReady ? 'ready' : ''}">${
              swReady ? 'Ready to use offline — the whole app is cached on this device.' : 'Caching for offline use…'
            }</p>`
      }
    </section>`;
}

/* ---------------- shared bits ---------------- */

const dot = (color) => `<span class="dot" style="background:${esc(color)}"></span>`;

function pips(box) {
  return `<span class="box-pips">${Array.from({ length: BOXES }, (_, i) => `<span class="pip ${i < box ? 'on' : ''}"></span>`).join(
    ''
  )}</span>`;
}

function bar(done, total) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return `<div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>`;
}

/** The set / tag chips that every drilling view shares. */
function filterChips(base) {
  const opts = [
    { id: 'all', label: 'Everything' },
    // The syllabus splits the chapters across two weeks, and drilling next
    // week's genitive the night before this week's quiz is wasted effort.
    { id: 'week', label: 'This week' },
    ...DATA.sets.map((s) => ({ id: s.id, label: s.name }))
  ];
  return `<div class="chips">${opts
    .map(
      (o) =>
        `<button class="chip ${state.filter === o.id ? 'on' : ''}" data-action="filter" data-filter="${esc(o.id)}" data-base="${esc(
          base
        )}">${esc(o.label)}</button>`
    )
    .join('')}</div>`;
}

/**
 * Every hook in the app on one screen: each case, each of its groups, the bare
 * peg and what the peg stands for. This is the thing you read on the bus — the
 * cards underneath are for when a peg does not hold.
 */
function cheatSheet() {
  // Count the pegs that actually get a row, not every group: a group whose only
  // card is a rule card renders nothing, and a count nobody can verify is worse
  // than no count.
  const hasCards = (g) => DATA.cards.some((c) => c.group === g.id && c.type !== 'rule');
  const pegs = DATA.sets.reduce((n, s) => n + s.groups.filter(hasCards).length, 0);

  return `
    <section class="card sheet">
      <div class="card-head">
        <h2>The whole thing</h2>
        <span class="muted" style="font-size:12px">${pegs} pegs · ${DATA.cards.length} cards</span>
      </div>
      <div class="sheet-does">
        ${DATA.sets
          .map(
            (set) => `
          <button class="does-row" data-action="goto" data-to="#/learn/${esc(set.id)}">
            <span class="does-name">${dot(set.color)}${esc(set.name)}</span>
            <span class="does-what">${esc(set.does)}</span>
          </button>`
          )
          .join('')}
      </div>

      ${DATA.sets
        .map(
          (set) => `
        <div class="sheet-set">
          <div class="sheet-case">${dot(set.color)}${esc(set.name)}</div>
          ${set.groups
            .map((g) => {
              const members = DATA.cards
                .filter((c) => c.group === g.id && c.type !== 'rule')
                .map((c) => c.short);
              if (!members.length) return '';
              return `
              <button class="sheet-row" data-action="goto" data-to="#/learn/${esc(set.id)}"
                      style="--accent:${esc(set.color)}">
                <span class="sheet-key">${esc(g.key || g.mnemonic)}</span>
                <span class="sheet-members">${esc(members.join(' · '))}</span>
              </button>`;
            })
            .join('')}
        </div>`
        )
        .join('')}
      <p class="note">Tap any line to open its cards.</p>
    </section>`;
}

/* ---------------- the peg ----------------
 * Every card fills one slot of its group's key: the S of SPA, the "Point" of
 * Point · Pronoun · Poof. Until now the letter lived on the map tiles and the
 * card lived in the Learn list, and the two never appeared together — so the
 * acrostic was something you read once and the card was something else you
 * read later. The peg renders the whole key with this card's slot lit and the
 * rest dimmed, and it is the first thing on the card, in the drill answer and
 * in the list row. Same shape everywhere, so the letter and the use are never
 * on screen apart.
 */

function groupOf(card) {
  const set = setById(card.set);
  return (set.groups || []).find((g) => g.id === card.group) || null;
}

/** Split a key into its slots: SPA -> S|P|A, "Point · Pronoun" -> two words. */
function keyParts(key) {
  if (!key) return [];
  if (key.includes('\u00b7')) return key.split('\u00b7').map((s, i) => ({ text: s.trim(), slot: i }));
  if (/^[A-Z][A-Z ]*$/.test(key)) {
    let n = -1;
    return [...key].map((ch) => (ch === ' ' ? { text: ' ', slot: -1 } : { text: ch, slot: ++n }));
  }
  return [{ text: key, slot: 0 }];
}

/** Which slot of its group's key a card fills, or null when it is an extra. */
function pegOf(card) {
  const g = groupOf(card);
  if (!g || !g.key || !card.tile) return null;
  const parts = keyParts(g.key);
  const slot = DATA.cards.filter((c) => c.group === card.group && c.tile).findIndex((c) => c.id === card.id);
  if (slot < 0 || !parts.some((p) => p.slot === slot)) return null;
  return { key: g.key, parts, slot, tile: card.tile, letters: card.tile.length === 1 };
}

/** The whole key, one slot lit. `slot` of -1 lights nothing (a group heading). */
function keyHtml(parts, slot, cls) {
  // Letters read fine butted together (S P A). Words do not: "Aim Outcome If"
  // needs the dots back, or it reads as one phrase.
  const words = parts.some((part) => part.text.length > 1);
  return `<span class="peg-key ${cls || ''}">${parts
    .map((part, i) => {
      if (part.text === ' ') return '<span class="peg-gap"></span>';
      const dot = words && i ? '<span class="peg-dot">·</span>' : '';
      return `${dot}<span class="peg-part${part.slot === slot ? ' on' : ''}">${esc(part.text)}</span>`;
    })
    .join('')}</span>`;
}

/**
 * A group heading without the key it ends with: the chip beside it now says
 * "PORT", so "Pure \u2014 to or for: PORT" would say it twice. Only strips when
 * the tail after the last dash or colon is the key itself, which leaves
 * "Other \u2014 the odd BEADs" alone.
 */
function groupTitle(group) {
  if (!group.key) return group.name;
  const m = group.name.match(/^(.*?)\s*[\u2014:-]\s*(?:the\s+)?([^\u2014:]+?)(?:\s+shot)?$/i);
  return m && m[2].toLowerCase() === group.key.toLowerCase() ? m[1] : group.name;
}

/** The key as a heading chip, nothing lit — used above a group's tiles. */
function keyChip(group) {
  return group.key ? keyHtml(keyParts(group.key), -1, 'peg-chip') : '';
}

/** The card's mnemonic, led by its slot in the key. Opens every card. */
function pegHead(card) {
  const set = setById(card.set);
  const peg = pegOf(card);
  const line = `<div class="hook-line">${esc(card.mnemonic)}</div>
      <div class="hook-why">${esc(card.mnemonicWhy)}</div>`;

  if (!peg) {
    return `<div class="peghead is-extra" style="--accent:${esc(set.color)}">
      <div class="peg-of">Rule \u2014 not one of the letters</div>
      ${line}
    </div>`;
  }

  // "T is for Indirect object" for a letter peg; "“If” — Conditional" for a word
  // peg, unless the word already is the card's name, in which case say it once.
  const tie = peg.letters
    ? `${esc(peg.tile)} is for ${esc(card.short)}`
    : peg.tile.toLowerCase() === card.short.toLowerCase()
      ? esc(card.short)
      : `“${esc(peg.tile)}” — ${esc(card.short)}`;
  return `<div class="peghead" style="--accent:${esc(set.color)}">
      ${keyHtml(peg.parts, peg.slot, 'peg-lg')}
      <div class="peg-of">${tie}</div>
      ${line}
    </div>`;
}

/** The same peg, shrunk to a chip for a collapsed list row. */
function pegMini(card) {
  const peg = pegOf(card);
  if (!peg) return '<span class="peg-key peg-mini is-extra"><span class="peg-part">+</span></span>';
  if (!peg.letters) return `<span class="peg-key peg-mini"><span class="peg-part on">${esc(peg.tile)}</span></span>`;
  return keyHtml(peg.parts, peg.slot, 'peg-mini');
}

/* ---------------- view: map ---------------- */

/** The acrostic, split into one tappable tile per letter. */
function acroTiles(set) {
  const cards = DATA.cards.filter((c) => c.set === set.id && c.type !== 'rule');
  return set.groups
    .map((g) => {
      const mine = cards.filter((c) => c.group === g.id);
      if (!mine.length) return '';
      return `
        <div>
          <div class="group-head">
            <h3>${esc(groupTitle(g))}</h3>
            ${keyChip(g)}
          </div>
          ${g.mnemonic ? `<p class="group-hook">${esc(g.mnemonic)}</p>` : ''}
          <div class="acro">
            ${mine
              .map(
                (c) => `
              <button class="acro-item" data-action="open-card" data-card="${esc(c.id)}"
                      style="border-left-color:${esc(set.color)}">
                ${c.pic ? `<span class="acro-pic" aria-hidden="true">${esc(c.pic)}</span>` : ''}
                <span class="acro-letter${c.tile ? '' : ' is-extra'}">${esc(c.tile || '+')}</span>
                <span class="acro-word">${esc(c.short)}</span>
                ${c.gist ? `<span class="acro-gist">${esc(c.gist)}</span>` : ''}
              </button>`
              )
              .join('')}
          </div>
        </div>`;
    })
    .join('');
}

function viewMap() {
  const learned = DATA.cards.filter((c) => isLearned(c.id)).length;

  return `
    <section class="hero">
      <div class="hero-line">The whole app in ${DATA.sets.length} words</div>
      <div class="hero-mnemonic">${DATA.sets.map((x) => esc(x.verb)).join(' · ')}</div>
      <div class="hero-sub">${DATA.sets.length} sets — ${esc(spread())}</div>
      ${bar(learned, DATA.cards.length)}
      <div class="hero-sub">${learned} of ${DATA.cards.length} learned · ${esc(targetLabel())}</div>
      <div class="btnrow split">
        <button class="btn primary" data-action="goto" data-to="#/picture">See it all in one picture</button>
        <button class="btn" data-action="goto" data-to="#/drill">Drill</button>
      </div>
    </section>

    ${cheatSheet()}

    ${DATA.sets
      .map(
        (set) => `
      <section class="card" style="--accent:${esc(set.color)}">
        <div class="set-head">
          <h2>${dot(set.color)}${esc(set.name)}</h2>
          <span class="muted" style="font-size:12px">${DATA.cards.filter((c) => c.set === set.id && isLearned(c.id)).length}/${
            DATA.cards.filter((c) => c.set === set.id).length
          }</span>
        </div>
        <p class="set-sub">${esc(set.subtitle)}</p>
        ${eli5Block(set.eli5)}
        <div class="hook" style="border-left-color:${esc(set.color)}">
          <div class="hook-line">${esc(set.masterMnemonic)}</div>
          <div class="hook-why">${esc(set.masterMnemonicWhy)}</div>
        </div>
        <p class="bigidea">${esc(set.bigIdea)}</p>
        ${acroTiles(set)}
        <div class="btnrow">
          <button class="btn small" data-action="goto" data-to="#/picture/${esc(set.id)}">${esc(
            set.place || ''
          )} ${esc(set.placeName || 'The picture')}</button>
          <button class="btn small" data-action="goto" data-to="#/learn/${esc(set.id)}">Read the cards</button>
          <button class="btn small" data-action="goto" data-to="#/drill/${esc(set.id)}">Drill this set</button>
        </div>
      </section>`
      )
      .join('')}

    <section class="card">
      <h2>The pairs that get missed</h2>
      <p class="note" style="margin-top:0">Nearly every wrong answer is one of these ${DATA.confusions.length}. Each one comes down to a single test.</p>
      ${DATA.confusions.map(confusionRow).join('')}
    </section>

    ${installCard({ dismissible: true })}

    <section class="card">${backRow()}</section>`;
}

function confusionRow(c) {
  return `
    <div class="confusion">
      <div class="confusion-q">${esc(c.question)}</div>
      <div class="confusion-test"><b>Test:</b> ${esc(c.test)}</div>
      <div class="confusion-test">${esc(c.answer)}</div>
      <div class="confusion-ex">${esc(c.example)}</div>
    </div>`;
}

/**
 * The plain-words version, in front of everything else. Whatever else a card
 * carries, you should be able to read this one paragraph and know what the
 * thing is — no grammar terms, and a picture you can actually see.
 */
function eli5Block(text, pic) {
  if (!text) return '';
  return `
    <div class="eli5">
      ${pic ? `<div class="eli5-pic" aria-hidden="true">${esc(pic)}</div>` : ''}
      <div>
        <span class="label">Like I'm five</span>
        <p>${esc(text)}</p>
      </div>
    </div>`;
}

/**
 * The bare shape of the construction, before a word of prose. Two forms:
 * pattern/filled renders aligned columns (X is Y over "the Word was God"),
 * ladder renders a numbered list for the cards that are a procedure, not a
 * shape. The caption underneath is the one-line definition.
 */
function formulaBlock(card, { caption = true } = {}) {
  const f = card.formula;
  if (!f) return '';

  const body = f.ladder
    ? `<ol class="fladder">${f.ladder.map((step) => `<li>${esc(step)}</li>`).join('')}</ol>`
    : `<div class="fcols">
         ${f.pattern
           .map(
             (tok, i) => `
           <div class="fcol">
             <span class="fpat">${esc(tok)}</span>
             <span class="ffill">${esc(f.filled[i])}</span>
           </div>`
           )
           .join('')}
       </div>`;

  return `
    <div class="formula ${f.ladder ? 'is-ladder' : ''}">
      ${body}
      ${f.note ? `<p class="fnote">${esc(f.note)}</p>` : ''}
      ${caption ? `<p class="fcaption">${esc(card.oneLine)}</p>` : ''}
    </div>`;
}

/**
 * The types inside one card. Some uses are one thing with several flavours —
 * the genitive direct object is a single use taken by five families of verb,
 * the absence of the article is one row with nine contexts under it — and
 * splitting those into separate cards would invent categories the summary
 * chart does not have. They are chunked here instead, numbered and countable,
 * so the list is learnable without pretending each line is its own use. Where
 * the chart really does name separate uses, they are separate cards.
 */
function kindsBlock(card) {
  const ks = card.kinds || [];
  if (!ks.length) return '';
  return `
    <div class="kinds">
      <span class="label">${esc(card.kindsLabel || 'The kinds')} — ${ks.length} of them</span>
      <ol class="kind-list">
        ${ks
          .map((k) => `<li><b>${esc(k.name)}</b>${k.note ? ` — ${esc(k.note)}` : ''}</li>`)
          .join('')}
      </ol>
    </div>`;
}

/* ---------------- view: learn ---------------- */

function conceptCard(c, { open = false } = {}) {
  const set = setById(c.set);
  const p = progressOf(c.id);
  return `
    <details class="concept" id="card-${esc(c.id)}" ${open ? 'open' : ''}>
      <summary>
        ${c.pic ? `<span class="concept-pic" aria-hidden="true">${esc(c.pic)}</span>` : dot(set.color)}
        <span class="concept-name">${esc(c.name)}<span class="concept-hook">${esc(c.mnemonic)}</span></span>
        ${pegMini(c)}
        ${pips(p.box)}
      </summary>
      <div class="concept-body">
        ${pegHead(c)}
        ${eli5Block(c.eli5, c.pic)}
        ${formulaBlock(c)}
        ${kindsBlock(c)}

        <div class="spot">
          <span class="label">How to spot it</span>
          ${esc(c.spotIt)}
        </div>

        ${c.watchOut ? `<div class="watch"><span class="label">Watch out</span>${esc(c.watchOut)}</div>` : ''}

        ${
          c.bookDef
            ? `<div class="bookdef">
                 <span class="label">What the book says</span>
                 ${esc(c.bookDef)}
               </div>`
            : ''
        }

        <div>
          <span class="label">Examples</span>
          ${(c.examples || [])
            .map(
              (e) => `
            <div class="ex">
              <div class="ex-ref">${esc(e.ref)}</div>
              ${e.greek ? `<div class="greek">${mk(e.greek)}</div>` : ''}
              <div class="ex-en">${mk(e.english)}</div>
              ${e.note ? `<div class="ex-note">${esc(e.note)}</div>` : ''}
            </div>`
            )
            .join('')}
        </div>
      </div>
    </details>`;
}

function viewLearn(arg) {
  if (arg && isFilter(arg)) state.filter = arg;
  const cards = selection();
  const bySet = DATA.sets.filter((s) => cards.some((c) => c.set === s.id));

  return `
    <section class="card">
      <h2>Learn — ${esc(filterLabel())}</h2>
      ${filterChips('learn')}
      <p class="note">Tap a card to open it. The pips on the right show how far it has climbed the drill boxes.</p>
    </section>

    ${bySet
      .map((set) => {
        const groups = set.groups.filter((g) => cards.some((c) => c.group === g.id));
        return `
        <section class="card" style="--accent:${esc(set.color)}">
          <div class="set-head"><h2>${dot(set.color)}${esc(set.name)}</h2></div>
          <p class="set-sub">${esc(set.masterMnemonic)}</p>
          ${groups
            .map(
              (g) => `
            <div class="group-head">
              <h3>${esc(groupTitle(g))}</h3>
              ${keyChip(g)}
            </div>
            ${g.mnemonic ? `<p class="group-hook">${esc(g.mnemonic)}</p>` : ''}
            <p class="note" style="margin:0 0 8px">${esc(g.expand)}</p>
            ${cards
              .filter((c) => c.group === g.id)
              .map((c) => conceptCard(c))
              .join('')}`
            )
            .join('')}
        </section>`;
      })
      .join('')}

    <section class="card">
      <h2>Confusion pairs</h2>
      ${DATA.confusions.map(confusionRow).join('')}
    </section>`;
}

/** A single card, deep-linked: `#/card/predicate-nominative`. */
function viewCard(arg) {
  const c = cardById(arg);
  if (!c) return `<section class="card"><p class="empty">No card called “${esc(arg)}”.</p></section>`;
  const set = setById(c.set);
  const pairs = DATA.confusions.filter((x) => x.pair.includes(c.id));
  return `
    <section class="card">
      <div class="set-head">
        <h2>${dot(set.color)}${esc(set.name)}</h2>
        <button class="btn small" data-action="goto" data-to="#/learn/${esc(set.id)}">All ${esc(set.name)} cards</button>
      </div>
    </section>
    ${conceptCard(c, { open: true })}
    ${
      pairs.length
        ? `<section class="card"><h2>Easily confused with</h2>${pairs.map(confusionRow).join('')}</section>`
        : ''
    }
    <section class="card">
      <div class="btnrow split">
        <button class="btn primary" data-action="goto" data-to="#/drill/${esc(set.id)}">Drill this set</button>
        <button class="btn" data-action="goto" data-to="#/picture/${esc(set.id)}">Where it lives</button>
      </div>
    </section>`;
}

/* ---------------- view: drill ---------------- */

/**
 * Four ways of asking about one card, so the drill never becomes "recognise
 * the shape of the front of this card". Which one you get depends on how many
 * times you have seen it, so early reps are recognition and later ones recall.
 * The first asks the peg itself \u2014 the lit letter of the key, nothing else \u2014
 * because that is the direction you need in the exam: you remember PORT, and
 * the O has to give you back "owns it".
 */
const PROMPTS = [
  { label: 'Which use is this letter?', front: (c) => pegFront(c), html: true, small: false },
  { label: 'What is the hook?', front: (c) => c.name, small: false },
  { label: 'Which use is this?', front: (c) => c.mnemonic, small: false },
  { label: 'Which use does this test find?', front: (c) => c.spotIt, small: true }
];

/** The key with this card's slot lit, as the whole face of the flashcard. */
function pegFront(card) {
  const peg = pegOf(card);
  return peg ? keyHtml(peg.parts, peg.slot, 'peg-lg peg-front') : esc(card.name);
}

function promptFor(card) {
  const i = progressOf(card.id).seen % PROMPTS.length;
  // A card with no slot in its key has nothing to ask in the first mode.
  return !pegOf(card) && i === 0 ? PROMPTS[1] : PROMPTS[i];
}

/**
 * Due order: lowest box first (what you know least), then least recently seen.
 * Nothing here is a real spaced-repetition schedule — there are four days until
 * Saturday, so "show me the shakiest thing I have not just seen" is the whole
 * algorithm.
 */
function deck() {
  return [...selection()].sort((a, b) => {
    const pa = progressOf(a.id);
    const pb = progressOf(b.id);
    return pa.box - pb.box || (pa.last || 0) - (pb.last || 0);
  });
}

let flipped = false;
let current = null;

function viewDrill(arg) {
  if (arg && isFilter(arg)) state.filter = arg;
  const due = deck();
  if (!current || !due.some((c) => c.id === current)) {
    current = due[0]?.id || null;
    flipped = false;
  }
  const card = current && cardById(current);
  if (!card) return `<section class="card"><p class="empty">Nothing in this set.</p></section>`;

  const set = setById(card.set);
  const p = progressOf(card.id);
  const prompt = promptFor(card);
  const learned = selection().filter((c) => isLearned(c.id)).length;

  return `
    <section class="card">
      <h2>Drill — ${esc(filterLabel())}</h2>
      ${filterChips('drill')}
      ${bar(learned, selection().length)}
      <div class="flash-meta">
        <span>${learned} of ${selection().length} in box ${LEARNED_AT}+</span>
        <span>${esc(targetLabel())}</span>
      </div>
    </section>

    <section class="card flash" style="--accent:${esc(set.color)}">
      <div class="flash-prompt-label">${dot(set.color)}${esc(prompt.label)}</div>
      <div class="flash-prompt ${prompt.small ? 'is-small' : ''}">${
        prompt.html ? prompt.front(card) : esc(prompt.front(card))
      }</div>

      ${
        flipped
          ? `<div class="flash-answer">
               <div class="name">${esc(card.name)}</div>
               ${pegHead(card)}
               ${eli5Block(card.eli5, card.pic)}
               ${formulaBlock(card)}
               <div class="spot" style="margin-top:9px"><span class="label">Spot it</span>${esc(card.spotIt)}</div>
               ${
                 card.examples && card.examples[0]
                   ? `<div class="ex">
                        <div class="ex-ref">${esc(card.examples[0].ref)}</div>
                        ${card.examples[0].greek ? `<div class="greek">${mk(card.examples[0].greek)}</div>` : ''}
                        <div class="ex-en">${mk(card.examples[0].english)}</div>
                      </div>`
                   : ''
               }
             </div>`
          : ''
      }

      <div class="flash-meta">
        <span>${pips(p.box)} box ${p.box || 0}</span>
        <span>seen ${p.seen}×</span>
      </div>

      ${
        flipped
          ? `<div class="btnrow split">
               <button class="btn bad" data-action="grade" data-ok="0">Again</button>
               <button class="btn good" data-action="grade" data-ok="1">Got it</button>
             </div>`
          : `<div class="btnrow"><button class="btn primary wide" data-action="flip">Show the answer</button></div>`
      }
    </section>

    <section class="card">
      <div class="btnrow split">
        <button class="btn small" data-action="goto" data-to="#/card/${esc(card.id)}">Open the full card</button>
        <button class="btn small" data-action="skip">Skip</button>
      </div>
    </section>`;
}

/* ---------------- view: spot it ---------------- */

/**
 * Quiz items: the hand-written ones from the data file, plus one generated from
 * every worked example. Distractors come from the same set — being asked to
 * tell a nominative use from an accusative one is not the exam.
 */
function quizPool() {
  const items = [];

  for (const q of DATA.extraQuiz) {
    const card = cardById(q.answer);
    if (card && card.type !== 'rule' && selection().some((c) => c.id === card.id)) {
      items.push({
        id: `x:${q.answer}:${items.length}`,
        ref: q.ref || null,
        greek: q.greek ? plain(q.greek) : null,
        prompt: q.greek ? plain(q.english || '') : q.prompt,
        target: q.target || null,
        answer: card.id,
        why: q.why,
        // The book sets these exercises without printing answers, so the app
        // must not pass mine off as the book's.
        unofficial: !!q.unofficial,
        set: card.set
      });
    }
  }

  for (const card of selection()) {
    if (card.type === 'rule') continue;
    for (const [i, ex] of (card.examples || []).entries()) {
      if (!ex.note) continue;
      items.push({
        id: `e:${card.id}:${i}`,
        ref: ex.ref,
        // The exam is on the Greek, so the Greek is the question and the
        // English is a gloss you can put away.
        greek: plain(ex.greek),
        prompt: plain(ex.english),
        answer: card.id,
        why: ex.note,
        set: card.set
      });
    }
  }

  // Greek-bearing items first: an English-only drill is a warm-up, not the exam.
  return items.sort((a, b) => (b.greek ? 1 : 0) - (a.greek ? 1 : 0));
}

function optionsFor(item) {
  const partners = DATA.confusions.filter((c) => c.pair.includes(item.answer)).flatMap((c) => c.pair);
  const sameSet = DATA.cards.filter((c) => c.set === item.set && c.id !== item.answer && c.type !== 'rule');
  const ranked = [
    ...sameSet.filter((c) => partners.includes(c.id)),
    ...shuffle(sameSet.filter((c) => !partners.includes(c.id)))
  ];
  return shuffle([item.answer, ...ranked.slice(0, 3).map((c) => c.id)]);
}

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let quiz = null; // { item, options, picked }

function nextQuestion() {
  const pool = quizPool();
  if (!pool.length) {
    quiz = null;
    return;
  }
  // Twice the tickets for a card you have not learned, twice again for an item
  // that carries Greek — that is what the quiz is actually on.
  const weighted = pool.flatMap((it) => {
    const tickets = (isLearned(it.answer) ? 1 : 2) * (it.greek ? 2 : 1);
    return Array.from({ length: tickets }, () => it);
  });
  const item = weighted[Math.floor(Math.random() * weighted.length)];
  quiz = { item, options: optionsFor(item), picked: null };
}

function viewSpot(arg) {
  // Only when the filter actually changes. This runs on every render, and
  // blanking the question here threw away the answer you had just given —
  // so answering did nothing at all if you arrived by a #/spot/<set> link.
  if (arg && isFilter(arg)) {
    if (state.filter !== arg) {
      state.filter = arg;
      quiz = null;
    }
  }
  // A question left over from another set is not this set's question.
  if (quiz && !selection().some((c) => c.id === quiz.item.answer)) quiz = null;
  if (!quiz) nextQuestion();
  if (!quiz) return `<section class="card"><p class="empty">No questions in this set.</p></section>`;

  const { item, options, picked } = quiz;
  const s = state.spot;

  return `
    <section class="card">
      <h2>Spot it — ${esc(filterLabel())}</h2>
      ${filterChips('spot')}
      <div class="flash-meta" style="margin-top:10px">
        <span class="score">${s.right} / ${s.asked} right</span>
        <span class="score">streak ${s.streak} · best ${s.best}</span>
      </div>
      ${
        practiceItems().length
          ? `<div class="btnrow">
               <button class="btn small" data-action="goto" data-to="#/test/${esc(state.filter)}">
                 Take the book's practice test (${practiceItems().length})
               </button>
             </div>`
          : ''
      }
    </section>

    <section class="card">
      ${item.ref ? `<div class="q-ref">${esc(item.ref)}</div>` : ''}
      ${item.greek ? `<div class="greek q-greek">${esc(item.greek)}</div>` : ''}
      ${item.target ? `<div class="q-target">which use is <strong>${esc(item.target)}</strong>?</div>` : ''}
      <div class="q-prompt ${item.greek ? 'is-gloss' : ''} ${item.greek && state.hideEnglish ? 'is-hidden' : ''}">
        ${esc(item.prompt)}
      </div>
      ${
        item.greek
          ? `<button class="btn small ghost" data-action="toggle-english">
               ${state.hideEnglish ? 'Show the English' : 'Hide the English'}
             </button>`
          : ''
      }
      <div class="options">
        ${options
          .map((id) => {
            const c = cardById(id);
            const cls = !picked ? '' : id === item.answer ? 'correct' : id === picked ? 'wrong' : '';
            return `<button class="option ${cls}" data-action="answer" data-pick="${esc(id)}" ${picked ? 'disabled' : ''}>
                      ${esc(c.name)}<span class="concept-hook">${esc(c.mnemonic)}</span>
                    </button>`;
          })
          .join('')}
      </div>
      ${
        picked
          ? `<div class="verdict">
               <strong>${picked === item.answer ? 'Right.' : `Not quite — it is ${esc(cardById(item.answer).name)}.`}</strong>
               <div class="why">${esc(item.why)}</div>
               ${
                 item.unofficial
                   ? `<p class="why unofficial">From the chapter's practice exercises. The book sets these without
                        printing answers, so this one is reasoned rather than official — worth checking in class.</p>`
                   : ''
               }
               <div class="btnrow split">
                 <button class="btn small" data-action="goto" data-to="#/card/${esc(item.answer)}">Open that card</button>
                 <button class="btn primary" data-action="next-q">Next</button>
               </div>
             </div>`
          : ''
      }
    </section>`;
}

/* ---------------- view: test ---------------- */

/**
 * A test is not a drill. The drill is an endless shuffle you dip into; a test
 * is a fixed set of questions you finish, with a mark at the end and a list of
 * what you got wrong. These are the book's own practice exercises.
 */
let test = null; // { items, i, picked, options, answers: [{ item, picked }] }

const practiceItems = () => quizPool().filter((it) => it.unofficial);

function startTest() {
  const items = shuffle(practiceItems());
  test = items.length ? { items, i: 0, picked: null, options: optionsFor(items[0]), answers: [] } : null;
}

function testAnswer(pick) {
  if (!test || test.picked) return;
  test.picked = pick;
  const item = test.items[test.i];
  const correct = pick === item.answer;
  test.answers.push({ item, picked: pick, correct });
  // A test still feeds the boxes: getting one wrong here should bring the card
  // round again in the drill.
  grade(item.answer, correct);
  save();
}

function testNext() {
  if (!test) return;
  test.i += 1;
  test.picked = null;
  test.options = test.i < test.items.length ? optionsFor(test.items[test.i]) : [];
}

function viewTest(arg) {
  if (arg && isFilter(arg) && state.filter !== arg) {
    state.filter = arg;
    test = null;
  }

  const pool = practiceItems();
  if (!pool.length) {
    return `
      <section class="card">
        <h2>Test — ${esc(filterLabel())}</h2>
        <p class="empty">No practice exercises in this set yet. They arrive a chapter at a time.</p>
        <div class="btnrow"><button class="btn" data-action="goto" data-to="#/test/all">Try every chapter</button></div>
      </section>`;
  }

  if (!test) {
    return `
      <section class="card">
        <h2>Test — ${esc(filterLabel())}</h2>
        ${filterChips('test')}
        <p class="note">${pool.length} questions, each one asked once, in a shuffled order. You get a mark at the end
           and a list of what you missed.</p>
        <p class="note">These are the chapters' own practice exercises. The book sets them without printing answers,
           so the answers here are reasoned — worth checking in class.</p>
        <div class="btnrow"><button class="btn primary wide" data-action="test-start">Start the test</button></div>
      </section>`;
  }

  /* ---- the mark ---- */
  if (test.i >= test.items.length) {
    const right = test.answers.filter((a) => a.correct).length;
    const missed = test.answers.filter((a) => !a.correct);
    const pct = Math.round((right / test.answers.length) * 100);
    return `
      <section class="hero">
        <div class="hero-line">Test finished</div>
        <div class="hero-mnemonic">${right} of ${test.answers.length}</div>
        ${bar(right, test.answers.length)}
        <div class="hero-sub">${pct}%${missed.length ? '' : ' — nothing missed'}</div>
        <div class="btnrow split">
          <button class="btn primary" data-action="test-start">Take it again</button>
          <button class="btn" data-action="goto" data-to="#/spot">Back to Spot it</button>
        </div>
      </section>

      ${
        missed.length
          ? `<section class="card">
               <h2>What to look at</h2>
               ${missed
                 .map(
                   ({ item, picked }) => `
                 <div class="missed">
                   <div class="ex-ref">${esc(item.ref || '')}</div>
                   ${item.greek ? `<div class="greek">${esc(item.greek)}</div>` : ''}
                   <div class="ex-note">You said <strong>${esc(cardById(picked).name)}</strong> —
                     it is <strong>${esc(cardById(item.answer).name)}</strong>.</div>
                   <div class="ex-note">${esc(item.why)}</div>
                   <div class="btnrow">
                     <button class="btn small" data-action="goto" data-to="#/card/${esc(item.answer)}">Open that card</button>
                   </div>
                 </div>`
                 )
                 .join('')}
             </section>`
          : ''
      }`;
  }

  /* ---- a question ---- */
  const item = test.items[test.i];
  const { picked, options } = test;
  const soFar = test.answers.filter((a) => a.correct).length;

  return `
    <section class="card">
      <div class="card-head">
        <h2>Test — ${esc(filterLabel())}</h2>
        <span class="muted" style="font-size:12px">${test.i + 1} of ${test.items.length} · ${soFar} right</span>
      </div>
      ${bar(test.i, test.items.length)}
    </section>

    <section class="card">
      ${item.ref ? `<div class="q-ref">${esc(item.ref)}</div>` : ''}
      ${item.greek ? `<div class="greek q-greek">${esc(item.greek)}</div>` : ''}
      ${item.target ? `<div class="q-target">which use is <strong>${esc(item.target)}</strong>?</div>` : ''}
      <div class="q-prompt is-gloss ${state.hideEnglish ? 'is-hidden' : ''}">${esc(item.prompt)}</div>
      <button class="btn small ghost" data-action="toggle-english">
        ${state.hideEnglish ? 'Show the English' : 'Hide the English'}
      </button>
      <div class="options">
        ${options
          .map((id) => {
            const c = cardById(id);
            const cls = !picked ? '' : id === item.answer ? 'correct' : id === picked ? 'wrong' : '';
            return `<button class="option ${cls}" data-action="test-answer" data-pick="${esc(id)}" ${picked ? 'disabled' : ''}>
                      ${esc(c.name)}<span class="concept-hook">${esc(c.mnemonic)}</span>
                    </button>`;
          })
          .join('')}
      </div>
      ${
        picked
          ? `<div class="verdict">
               <strong>${picked === item.answer ? 'Right.' : `Not quite — it is ${esc(cardById(item.answer).name)}.`}</strong>
               <div class="why">${esc(item.why)}</div>
               <div class="btnrow">
                 <button class="btn primary wide" data-action="test-next">
                   ${test.i + 1 < test.items.length ? 'Next question' : 'See the mark'}
                 </button>
               </div>
             </div>`
          : ''
      }
    </section>`;
}

/* ---------------- view: progress ---------------- */

function viewProgress() {
  const learned = DATA.cards.filter((c) => isLearned(c.id));
  const untouched = DATA.cards.filter((c) => progressOf(c.id).seen === 0);
  const shaky = DATA.cards
    .filter((c) => progressOf(c.id).seen > 0 && !isLearned(c.id))
    .sort((a, b) => progressOf(a.id).box - progressOf(b.id).box);
  const s = state.spot;

  return `
    <section class="card">
      <h2>Where you are</h2>
      ${bar(learned.length, DATA.cards.length)}
      <div class="stats">
        <div><span class="stat">${learned.length}</span><small>of ${DATA.cards.length} learned</small></div>
        <div><span class="stat">${s.asked ? Math.round((s.right / s.asked) * 100) : 0}%</span><small>spot-it accuracy</small></div>
        <div>
          <span class="stat">${Math.max(0, daysToTarget())}</span>
          <small>${daysToTarget() < 0 ? 'target has passed' : 'days to target'}</small>
        </div>
      </div>
      <p class="note">A card counts as learned once it has climbed to box ${LEARNED_AT} — four right answers in a row, with any
         wrong answer knocking it back to box 1.</p>
    </section>

    ${
      shaky.length
        ? `<section class="card">
             <h2>Shakiest first</h2>
             ${shaky
               .map(
                 (c) => `
               <div class="mastery">
                 ${dot(setColor(c.set))}
                 <span class="mastery-name">${esc(c.name)}</span>
                 ${pips(progressOf(c.id).box)}
                 <button class="btn small" data-action="goto" data-to="#/card/${esc(c.id)}">Open</button>
               </div>`
               )
               .join('')}
           </section>`
        : ''
    }

    ${
      untouched.length
        ? `<section class="card">
             <h2>Not yet seen (${untouched.length})</h2>
             ${untouched
               .map(
                 (c) => `
               <div class="mastery">
                 ${dot(setColor(c.set))}
                 <span class="mastery-name">${esc(c.name)}</span>
                 <button class="btn small" data-action="goto" data-to="#/card/${esc(c.id)}">Open</button>
               </div>`
               )
               .join('')}
           </section>`
        : ''
    }

    ${
      learned.length
        ? `<section class="card">
             <h2>Learned (${learned.length})</h2>
             ${learned
               .map(
                 (c) => `
               <div class="mastery">
                 ${dot(setColor(c.set))}
                 <span class="mastery-name">${esc(c.name)}</span>
                 ${pips(progressOf(c.id).box)}
               </div>`
               )
               .join('')}
           </section>`
        : ''
    }

    <section class="card">
      <h2>Who is using this</h2>
      <p class="note" style="margin-top:0">Each person gets their own boxes, their own scores and their own target date.
         Nothing is shared, and nothing leaves this device.</p>
      ${people.list
        .map(
          (x) => `
        <div class="mastery">
          <span class="mastery-name">${x.id === people.active ? '<strong>' : ''}${esc(x.name)}${
            x.id === people.active ? '</strong>' : ''
          }</span>
          <span class="muted" style="font-size:12px">${
            Object.keys(personCards(x.id)).length
          } cards started</span>
          ${
            x.id === people.active
              ? '<span class="pill">here now</span>'
              : `<button class="btn small" data-action="use-person" data-person="${esc(x.id)}">Switch</button>`
          }
          <button class="btn small ghost" data-action="rename-person" data-person="${esc(x.id)}">Rename</button>
          ${
            people.list.length > 1
              ? `<button class="btn small ghost" data-action="remove-person" data-person="${esc(x.id)}">Remove</button>`
              : ''
          }
        </div>`
        )
        .join('')}
      <div class="btnrow">
        <button class="btn small" data-action="add-person">Add someone</button>
      </div>
    </section>

    <section class="card">
      <h2>Settings for ${esc(activePerson().name)}</h2>
      <div class="mastery">
        <span class="mastery-name">Learn it all by</span>
        <input type="date" id="target-date" value="${esc(state.target)}" />
      </div>
      <div class="btnrow">
        <button class="btn small" data-action="reset">Reset all progress</button>
      </div>
      <p class="note">Progress lives in this browser's local storage. Nothing is uploaded anywhere.</p>
      ${backRow()}
    </section>

    ${installCard()}

    <section class="card">
      <h2>App version</h2>
      <p class="note">Running <strong>${esc(BUILD)}</strong>${standalone() ? ' from the home screen' : ''}.</p>
      <p class="note">If a device is stuck on an old version, this throws away its offline copy and fetches the app again.</p>
      <div class="btnrow"><button class="btn small" data-action="clear-cache">Clear the offline copy</button></div>
    </section>`;
}

/* ---------------- view: picture ----------------
 * The whole course as one place you can walk, instead of a pile of lists you
 * can read. Each case is a stop on one street, each group is a spot inside that
 * stop, and each card is an object sitting in that spot. The board is built
 * from the data, so a new chapter opens another door on the same street
 * without anyone drawing anything.
 */

function cardsOfGroup(id) {
  return DATA.cards.filter((c) => c.group === id);
}

/** Every object in a set, in the order you walk past them. */
function thingsOfSet(set) {
  return set.groups.flatMap((g) => cardsOfGroup(g.id));
}

/** One stop on the street: the place, everything in it, the case it is. */
function streetStop(set) {
  const things = thingsOfSet(set);
  const learned = things.filter((c) => isLearned(c.id)).length;
  return `
    <button class="stop" data-action="goto" data-to="#/picture/${esc(set.id)}" style="--accent:${esc(set.color)}">
      <span class="stop-pic" aria-hidden="true">${esc(set.place || set.name.slice(0, 1))}</span>
      <span class="stop-name">${esc(set.placeName || set.name)}</span>
      <span class="stop-things" aria-hidden="true">${things.map((c) => esc(c.pic || '')).join('')}</span>
      <span class="stop-case">${dot(set.color)}${esc(set.name)}</span>
      <span class="stop-count">${learned}/${things.length}</span>
    </button>`;
}

/** A group's objects, named and tappable. */
function thingTiles(cards, { named = true } = {}) {
  return `<div class="things ${named ? '' : 'is-bare'}">
    ${cards
      .map(
        (c) => `
      <button class="thing" data-action="open-card" data-card="${esc(c.id)}" title="${esc(c.short)}">
        <span class="thing-pic" aria-hidden="true">${esc(c.pic || '')}</span>
        ${
          c.tile && c.tile.toLowerCase() !== c.short.toLowerCase()
            ? `<span class="thing-tile">${esc(c.tile)}</span>`
            : ''
        }
        ${named ? `<span class="thing-name">${esc(c.short)}</span>` : ''}
      </button>`
      )
      .join('')}
  </div>`;
}

/** One spot inside a stop: what it looks like, then what is in it. */
function sceneBlock(set, group, { named = true } = {}) {
  const cards = cardsOfGroup(group.id);
  if (!cards.length) return '';
  return `
    <div class="scene" style="--accent:${esc(set.color)}">
      <div class="scene-head">
        <span class="scene-spot" aria-hidden="true">${esc(group.spot || set.place || '')}</span>
        <span class="scene-title">${esc(groupTitle(group))}</span>
        ${keyChip(group)}
      </div>
      ${group.scene ? `<p class="scene-line">${esc(group.scene)}</p>` : ''}
      ${thingTiles(cards, { named })}
    </div>`;
}

function viewPicture(arg) {
  const set = arg ? setById(arg) : null;
  if (arg && !set) return `<section class="card"><p class="empty">No place called “${esc(arg)}”.</p></section>`;

  if (set) {
    const things = thingsOfSet(set);
    return `
      <section class="card place" style="--accent:${esc(set.color)}">
        <div class="place-head">
          <span class="place-pic" aria-hidden="true">${esc(set.place || '')}</span>
          <div>
            <h2>${esc(set.placeName || set.name)}</h2>
            <p class="place-case">${dot(set.color)}${esc(set.name)} — ${esc(set.does || set.subtitle)}</p>
          </div>
        </div>
        ${set.scene ? `<p class="place-line">${esc(set.scene)}</p>` : ''}
        <div class="place-things" aria-hidden="true">${things.map((c) => esc(c.pic || '')).join('')}</div>
        <p class="note">${things.length} things in this one place. Tap any of them to open its card.</p>
      </section>

      ${set.groups.map((g) => sceneBlock(set, g)).join('')}

      <section class="card">
        <div class="btnrow split">
          <button class="btn primary" data-action="goto" data-to="#/drill/${esc(set.id)}">Drill this stop</button>
          <button class="btn" data-action="goto" data-to="#/picture">The whole street</button>
        </div>
      </section>`;
  }

  const w = DATA.world || {};
  const learned = DATA.cards.filter((c) => isLearned(c.id)).length;
  return `
    <section class="hero">
      <div class="hero-line">${esc(w.name || 'The whole thing in one picture')}</div>
      <div class="street-line" aria-hidden="true">${DATA.sets
        .map((x) => esc(x.place || ''))
        .join('<span class="street-arrow">›</span>')}</div>
      <div class="hero-mnemonic">${esc(w.line || DATA.sets.map((x) => x.verb).join(' · '))}</div>
      ${bar(learned, DATA.cards.length)}
      <div class="hero-sub">${DATA.sets.length} stops · ${DATA.cards.length} things · ${learned} learned</div>
    </section>

    <section class="card">
      <h2>The street</h2>
      <p class="note">Every stop, and everything standing in it. Tap a stop to walk into it.</p>
      <div class="street">${DATA.sets.map(streetStop).join('')}</div>
      ${w.why ? `<p class="street-why">${esc(w.why)}</p>` : ''}
    </section>

    ${DATA.sets
      .map(
        (x) => `
      <section class="card place" style="--accent:${esc(x.color)}">
        <div class="place-head is-small">
          <span class="place-pic" aria-hidden="true">${esc(x.place || '')}</span>
          <div>
            <h2>${esc(x.placeName || x.name)}</h2>
            <p class="place-case">${dot(x.color)}${esc(x.name)}</p>
          </div>
          <button class="btn small" data-action="goto" data-to="#/picture/${esc(x.id)}">Walk in</button>
        </div>
        ${x.scene ? `<p class="place-line">${esc(x.scene)}</p>` : ''}
        ${x.groups.map((g) => sceneBlock(x, g, { named: false })).join('')}
      </section>`
      )
      .join('')}`;
}

/* ---------------- render ---------------- */

const VIEWS = {
  map: viewMap,
  picture: viewPicture,
  learn: viewLearn,
  card: viewCard,
  drill: viewDrill,
  spot: viewSpot,
  test: viewTest,
  progress: viewProgress,
  confusions: () => `<section class="card"><h2>Confusion pairs</h2>${DATA.confusions.map(confusionRow).join('')}</section>`
};

function render() {
  route = parseRoute(location.hash);
  if (!VIEW_NAMES.has(route.name)) route = { name: 'map', arg: null };

  // `#/tag/saturday` is Learn with a tag filter, not a view of its own.
  if (route.name === 'tag') {
    state.filter = `tag:${route.arg}`;
    route = { name: 'learn', arg: state.filter };
  }

  $('#app').innerHTML = (VIEWS[route.name] || viewMap)(route.arg);

  const tabFor =
    route.name === 'card' ? 'learn' : route.name === 'confusions' ? 'map' : route.name === 'test' ? 'spot' : route.name;
  $$('.tab').forEach((el) => el.classList.toggle('on', el.dataset.view === tabFor));

  const who = $('#whoami');
  if (who) {
    who.innerHTML = `
      ${people.list
        .map((x) => `<option value="${esc(x.id)}" ${x.id === people.active ? 'selected' : ''}>${esc(x.name)}</option>`)
        .join('')}
      <option value="__add">＋ Add someone…</option>`;
  }

  const due = daysToTarget();
  const target = $('#target');
  if (target) {
    target.classList.toggle('is-due', due <= 1);
    target.innerHTML = `<strong>${esc(targetLabel())}</strong>${esc(
      parseDay(state.target).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    )}`;
  }

  document.title = route.name === 'map' ? 'Greek Cases — Mnemonics' : `Greek Cases — ${route.name}`;
  window.scrollTo(0, 0);
}

/* ---------------- events ---------------- */

document.addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (tab) return go(`#/${tab.dataset.view}`);

  const el = e.target.closest('[data-action]');
  if (!el) return;
  const { action } = el.dataset;

  if (action === 'goto') return go(el.dataset.to);
  if (action === 'open-card') return go(`#/card/${el.dataset.card}`);

  if (action === 'filter') {
    state.filter = el.dataset.filter;
    save();
    quiz = null;
    current = null;
    flipped = false;
    return go(`#/${el.dataset.base}/${state.filter}`);
  }

  if (action === 'flip') {
    flipped = true;
    return render();
  }

  if (action === 'grade') {
    grade(current, el.dataset.ok === '1');
    current = null;
    flipped = false;
    return render();
  }

  if (action === 'skip') {
    // Push it to the back of the queue without pretending you answered it.
    const p = { ...progressOf(current), last: Date.now() };
    state.cards[current] = p;
    save();
    current = null;
    flipped = false;
    return render();
  }

  if (action === 'answer') {
    if (quiz.picked) return;
    const pick = el.dataset.pick;
    quiz.picked = pick;
    const correct = pick === quiz.item.answer;
    grade(quiz.item.answer, correct);
    const s = state.spot;
    s.asked += 1;
    if (correct) {
      s.right += 1;
      s.streak += 1;
      s.best = Math.max(s.best, s.streak);
    } else {
      s.streak = 0;
    }
    save();
    return render();
  }

  if (action === 'toggle-english') {
    state.hideEnglish = !state.hideEnglish;
    save();
    return render();
  }

  if (action === 'test-start') {
    startTest();
    return render();
  }

  if (action === 'test-answer') {
    testAnswer(el.dataset.pick);
    return render();
  }

  if (action === 'test-next') {
    testNext();
    return render();
  }

  if (action === 'next-q') {
    nextQuestion();
    return render();
  }

  if (action === 'dismiss-install') {
    state.installDismissed = true;
    save();
    return render();
  }

  if (action === 'install') {
    if (!installPrompt) return;
    const prompt = installPrompt;
    installPrompt = null;
    prompt.prompt();
    // Whatever they choose, the event is spent — Chrome will fire a fresh one
    // later if they dismiss it, so there is nothing to hold on to here.
    prompt.userChoice.finally(() => render());
    return;
  }

  if (action === 'clear-cache') {
    if (!confirm('Throw away the offline copy and fetch the app again? Your progress is kept.')) return;
    (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch (err) {
        console.warn('Could not clear the offline copy', err);
      }
      location.reload();
    })();
    return;
  }

  if (action === 'use-person') return usePerson(el.dataset.person);

  if (action === 'add-person') return addPerson(prompt('Who is this for? (a first name is plenty)', ''));

  if (action === 'rename-person') {
    const person = people.list.find((x) => x.id === el.dataset.person);
    return renamePerson(el.dataset.person, prompt('Call them what?', person ? person.name : ''));
  }

  if (action === 'remove-person') {
    const person = people.list.find((x) => x.id === el.dataset.person);
    if (!person) return;
    if (!confirm(`Remove ${person.name}, and throw away everything they have learned here?`)) return;
    return removePerson(el.dataset.person);
  }

  if (action === 'reset') {
    if (!confirm(`Clear every box and score for ${activePerson().name}, and start over?`)) return;
    const target = state.target;
    state = blank();
    state.target = target;
    save();
    quiz = null;
    current = null;
    return render();
  }
});

document.addEventListener('change', (e) => {
  if (e.target.id === 'whoami') {
    if (e.target.value === '__add') {
      // Put the picker back where it was first: if they cancel the prompt,
      // the dropdown must not be left sitting on "Add someone".
      e.target.value = people.active;
      addPerson(prompt('Who is this for? (a first name is plenty)', ''));
      return;
    }
    return usePerson(e.target.value);
  }
  if (e.target.id !== 'target-date') return;
  state.target = e.target.value || nextSaturday();
  save();
  render();
});

// Space flips, 1/2 grade — for anyone drilling at a desk rather than on a phone.
document.addEventListener('keydown', (e) => {
  if (route.name !== 'drill' || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    if (!flipped) {
      flipped = true;
      render();
    }
  } else if (flipped && (e.key === '1' || e.key === '2')) {
    grade(current, e.key === '2');
    current = null;
    flipped = false;
    render();
  }
});

window.addEventListener('hashchange', render);

/* ---------------- boot ---------------- */

async function loadData() {
  // The single-file build embeds the cards here so it works with no server.
  if (globalThis.__CONCEPTS__) return globalThis.__CONCEPTS__;
  const res = await fetch('./data/concepts.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Could not load the cards (${res.status})`);
  return res.json();
}

async function boot() {
  try {
    DATA = await loadData();
  } catch (err) {
    $('#app').innerHTML = `<section class="card"><p class="empty">${esc(err.message)}</p></section>`;
    return;
  }
  render();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker
      .register('./sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then(() => {
        swReady = true;
        render();
      })
      .catch(() => {});
  }
}

boot();
