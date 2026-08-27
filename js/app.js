/**
 * Greek Cases — mnemonics and drills for Going Deeper with NT Greek, ch. 2.
 *
 * Deliberately one file. The sibling app (seminary-homework-2026) learned the
 * hard way that a module graph behind a service worker can serve a fresh page
 * beside stale code; one file means one cache key, so `?v=vN` invalidates the
 * whole app at once and there is nothing to bundle.
 */

const BUILD = 'v4 · 2026-08-27';

// Where the "back to homework" link points. The seminary app links here; this
// links back, so the two feel like two rooms rather than two buildings.
const HOMEWORK_APP = 'https://claudekovalenko.github.io/seminary-homework-2026/';

// What you said you wanted these learned by. Editable under Progress.
const DEFAULT_TARGET = '2026-08-29';

const KEY = 'gdgc.v1';
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

/* ---------------- storage ---------------- */

const blank = () => ({
  cards: {}, // id -> { box, seen, right, wrong, last }
  spot: { asked: 0, right: 0, best: 0, streak: 0 },
  target: DEFAULT_TARGET,
  // Which set the Learn/Drill/Spot views were last filtered to, so the app
  // reopens where you left it rather than at the top every time.
  filter: 'all',
  // Set once you have waved away the "add it to your home screen" card. The
  // one in Settings is permanent; this only silences the one on the Map.
  installDismissed: false
});

let state = load();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    return raw ? { ...blank(), ...raw, spot: { ...blank().spot, ...(raw.spot || {}) } } : blank();
  } catch {
    return blank();
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
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

/** The cards a view is currently working with, honouring set or tag filters. */
function selection(filter = state.filter) {
  if (!filter || filter === 'all') return DATA.cards;
  if (filter.startsWith('tag:')) {
    const tag = filter.slice(4);
    return DATA.cards.filter((c) => (c.tags || []).includes(tag));
  }
  return DATA.cards.filter((c) => c.set === filter);
}

function filterLabel(filter = state.filter) {
  if (!filter || filter === 'all') return 'Everything';
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

const VIEW_NAMES = new Set(['map', 'learn', 'drill', 'spot', 'progress', 'card', 'tag', 'confusions']);

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
          <h3>${esc(g.name)}</h3>
          <div class="acro">
            ${mine
              .map(
                (c) => `
              <button class="acro-item" data-action="open-card" data-card="${esc(c.id)}"
                      style="border-left-color:${esc(set.color)}">
                <span class="acro-letter">${esc(c.tile || c.short.slice(0, 1))}</span>
                <span class="acro-word">${esc(c.short)}</span>
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
      <div class="hero-line">The whole chapter in two sentences</div>
      <div class="hero-mnemonic">Go to the SPA, say AAAH.</div>
      <div class="hero-sub">One object with four twists, then the MMR shot.</div>
      ${bar(learned, DATA.cards.length)}
      <div class="hero-sub">${learned} of ${DATA.cards.length} learned · ${esc(targetLabel())}</div>
      <div class="btnrow split">
        <button class="btn primary" data-action="goto" data-to="#/drill">Drill</button>
        <button class="btn" data-action="goto" data-to="#/spot">Spot it</button>
      </div>
    </section>

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
        <div class="hook" style="border-left-color:${esc(set.color)}">
          <div class="hook-line">${esc(set.masterMnemonic)}</div>
          <div class="hook-why">${esc(set.masterMnemonicWhy)}</div>
        </div>
        <p class="bigidea">${esc(set.bigIdea)}</p>
        ${acroTiles(set)}
        <div class="btnrow">
          <button class="btn small" data-action="goto" data-to="#/learn/${esc(set.id)}">Read the cards</button>
          <button class="btn small" data-action="goto" data-to="#/drill/${esc(set.id)}">Drill this set</button>
        </div>
      </section>`
      )
      .join('')}

    <section class="card">
      <h2>The pairs that get missed</h2>
      <p class="note" style="margin-top:0">Nearly every wrong answer is one of these seven. Each one comes down to a single test.</p>
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

/* ---------------- view: learn ---------------- */

function conceptCard(c, { open = false } = {}) {
  const set = setById(c.set);
  const p = progressOf(c.id);
  return `
    <details class="concept" id="card-${esc(c.id)}" ${open ? 'open' : ''}>
      <summary>
        ${dot(set.color)}
        <span class="concept-name">${esc(c.name)}<span class="concept-hook">${esc(c.mnemonic)}</span></span>
        ${pips(p.box)}
      </summary>
      <div class="concept-body">
        ${formulaBlock(c)}

        <div class="hook" style="border-left-color:${esc(set.color)}">
          <span class="label">Mnemonic</span>
          <div class="hook-line">${esc(c.mnemonic)}</div>
          <div class="hook-why">${esc(c.mnemonicWhy)}</div>
        </div>

        <div class="spot">
          <span class="label">How to spot it</span>
          ${esc(c.spotIt)}
        </div>

        ${c.watchOut ? `<div class="watch"><span class="label">Watch out</span>${esc(c.watchOut)}</div>` : ''}

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
  if (arg === 'all' || (arg && (setById(arg) || arg.startsWith('tag:')))) state.filter = arg;
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
            <h3>${esc(g.name)}</h3>
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
        <button class="btn" data-action="goto" data-to="#/map">Back to the map</button>
      </div>
    </section>`;
}

/* ---------------- view: drill ---------------- */

/**
 * Three ways of asking about one card, so the drill never becomes "recognise
 * the shape of the front of this card". Which one you get depends on how many
 * times you have seen it, so early reps are recognition and later ones recall.
 */
const PROMPTS = [
  { label: 'What is the hook?', front: (c) => c.name, small: false },
  { label: 'Which use is this?', front: (c) => c.mnemonic, small: false },
  { label: 'Which use does this test find?', front: (c) => c.spotIt, small: true }
];

function promptFor(card) {
  return PROMPTS[progressOf(card.id).seen % PROMPTS.length];
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
  if (arg === 'all' || (arg && (setById(arg) || arg.startsWith('tag:')))) state.filter = arg;
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
      <div class="flash-prompt ${prompt.small ? 'is-small' : ''}">${esc(prompt.front(card))}</div>

      ${
        flipped
          ? `<div class="flash-answer">
               <div class="name">${esc(card.name)}</div>
               ${formulaBlock(card)}
               <div class="hook" style="border-left-color:${esc(set.color)};margin-top:9px">
                 <div class="hook-line">${esc(card.mnemonic)}</div>
                 <div class="hook-why">${esc(card.mnemonicWhy)}</div>
               </div>
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
      items.push({ id: `x:${q.answer}:${items.length}`, prompt: q.prompt, answer: card.id, why: q.why, set: card.set });
    }
  }

  for (const card of selection()) {
    if (card.type === 'rule') continue;
    for (const [i, ex] of (card.examples || []).entries()) {
      if (!ex.note) continue;
      const line = ex.greek ? `${plain(ex.english)}  —  ${plain(ex.greek)}` : plain(ex.english);
      items.push({
        id: `e:${card.id}:${i}`,
        prompt: `${ex.ref} — ${line}`,
        answer: card.id,
        why: ex.note,
        set: card.set
      });
    }
  }

  return items;
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
  // Weight toward cards that are not yet learned — twice the tickets each.
  const weighted = pool.flatMap((it) => (isLearned(it.answer) ? [it] : [it, it]));
  const item = weighted[Math.floor(Math.random() * weighted.length)];
  quiz = { item, options: optionsFor(item), picked: null };
}

function viewSpot(arg) {
  if (arg === 'all' || (arg && (setById(arg) || arg.startsWith('tag:')))) {
    state.filter = arg;
    quiz = null;
  }
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
    </section>

    <section class="card">
      <div class="q-prompt">${esc(item.prompt)}</div>
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
               <div class="btnrow split">
                 <button class="btn small" data-action="goto" data-to="#/card/${esc(item.answer)}">Open that card</button>
                 <button class="btn primary" data-action="next-q">Next</button>
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
        <div><span class="stat">${daysToTarget()}</span><small>days to target</small></div>
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
      <h2>Settings</h2>
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

/* ---------------- render ---------------- */

const VIEWS = {
  map: viewMap,
  learn: viewLearn,
  card: viewCard,
  drill: viewDrill,
  spot: viewSpot,
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

  const tabFor = route.name === 'card' ? 'learn' : route.name === 'confusions' ? 'map' : route.name;
  $$('.tab').forEach((el) => el.classList.toggle('on', el.dataset.view === tabFor));

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

  if (action === 'reset') {
    if (!confirm('Clear every box and score, and start these 17 cards over?')) return;
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
  if (e.target.id !== 'target-date') return;
  state.target = e.target.value || DEFAULT_TARGET;
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
