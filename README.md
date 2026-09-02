# Greek Cases — mnemonics for *Going Deeper with New Testament Greek*, ch. 2–5

A small offline-first PWA for getting the five cases, the **article** and the
**adjective** into your head and keeping them there. Sixty-four cards, each
opening with a plain-words paragraph anyone could follow, then the bare pattern
of the construction, then a mnemonic hook, a test you can run on a text, and the
Greek examples.

It is the study half of [seminary-homework-2026][hw]; that app tells you *what*
is due, this one drills the thing itself. Each links to the other.

[hw]: https://github.com/claudekovalenko/seminary-homework-2026

## The whole chapter in two sentences

> **Go to the SPA, then say AAAH.**
> **One object with four twists, then the MMR shot.**

**Nominative — SPA + AAAH**

| | |
|---|---|
| **S**ubject | the subject wears the crown |
| **P**redicate nominative | the subject is the small circle, the predicate the big one |
| **A**pposition | no verb, just a name tag |
| **A**ddress | "Hey, you!" in a nominative coat |
| **A**ppellation | the title is on the name badge — badges don't decline |
| **A**bsolute | the headline: no rope at all |
| **H**anging | it hangs by a pronoun |

Two nominatives round one verb? Ask **Papa** which is the subject: **P**ronoun,
then **A**rticle, then **P**roper name. That is what settles John 1:1 — *ὁ*
λόγος has the article and is the subject, so θεός is the predicate nominative,
anarthrous and still definite.

**Genitive — every genitive is an "of"; ask which kind**

Four drawers. Seven describe a noun and spell **SWAMP RD** — and whatever falls
off the end of the road lands in the Ditch, which is Description, the catch-all.
Two hide a verb. Five modify a verb and spell **PACTS**. Two oddities are left
over.

| | |
|---|---|
| **S**ource | *from* — where it came from |
| **W**hole — partitive | the genitive is the whole pie, the head noun your slice |
| **A**djective — attributive | rewrite it as an adjective: *his powerful word* |
| **M**ade of — material | *made of*, or *full of* |
| **P**ossession | *whose* — try the apostrophe-s |
| **R**elationship | *whose kin* — supply the missing "son of" |
| **D**escription | the ditch at the end of the road: the catch-all |
| Subjective | subject **does** it — "the love of Christ" = Christ loves |
| Objective | object **gets** it — "faith of God" = faith in God |
| **P**rice | for how much? |
| **A**gency or means | by whom? by what? |
| **C**omparison | than what? |
| **T**ime or place | when? where? |
| **S**eparation | away from what? |
| Apposition | another name for the head noun |
| Direct object | feel it, want it, share it, rule it, leave it |

Every group spells something: SPA, AAAH, DATES, MMR, SWAMP RD, PACTS, PORT, HIT, MAMA, BEAD, ASAP, SPECS, plus the article's three P's and three rules.
The definitions on these cards are the chapter summary chart's own wording.

**Dative — to, in, with**

Three old cases wearing one coat. Work out which coat and the use follows.

| | |
|---|---|
| **to or for** | **PORT** — Personal interest · Owns · Re: · To whom |
| **in or at** | **HIT** — Here (place) · In what realm (sphere) · Then (time) |
| **with or by** | **MAMA** — Means · Agency · Manner · Association |
| the leftovers | **BEAD** — Because · Echo · Alias · Devoted verbs |

Means is the hammer, agency is the carpenter: the only test is whether the
dative could have refused. And the dative's fussy-verb list — trusting, obeying,
serving, worshipping, thanking, following — is every one a verb of **devotion**.

**Article — Point, Pronoun, Poof**

It points at one, or stands in for a word, or vanishes — and vanishing is not
"a". Then three named rules: **Sharp joins** (one article over two nouns means
one person), **Colwell drops** (a definite predicate nominative before the copula
loses its article — which is John 1:1), **Apollonius matches** (in a genitive
chain, both take the article or neither does).

**Adjective — four jobs ASAP, five degrees of SPECS**

**A**ttributive (sticks to the noun) · **S**ubstantival (becomes the noun) ·
**A**dverbial (jumps to the verb) · **P**redicate (makes a claim). And
**S**uperlative · **P**ositive · **E**lative · **C**omparative · **S**pecial
cases.

**Accusative — the object goes on DATES, then gets the MMR shot**

The accusative is the case of limitation: the nominative crowns, the accusative
fences.

| | |
|---|---|
| **D**irect object | the verb throws, the object catches |
| **A**lias — apposition | the name tag, now on the object |
| **T**wo — double | *ask someone something* vs *call someone something* |
| **E**cho — cognate | the object echoes the verb: *fight the good fight* |
| **S**ub — subject of infinitive | finite verbs pay in nominative, infinitives in accusative |
| **M**easure | how far? |
| **M**anner | how? |
| **R**espect | how so? — slot in "as to" |

## What is in the app

- **The whole thing** — every peg in the app on one screen, at the top of the
  Map: seventeen acrostics and what each one stands for. This is the bus-stop
  page; the cards underneath are for when a peg does not hold.
- **Map** — the acrostics as tappable tiles, plus the seven confusion pairs
  that account for nearly every wrong answer.
- **Learn** — every card, in four tiers, hardest-first being exactly wrong: an
  **explain-it-like-I'm-five** paragraph, then the bare pattern, then the
  mnemonic hook, then the summary chart's own wording under *What the book
  says*, then the Greek. Read one tier or all five.
- **Drill** — flashcards on Leitner boxes. A right answer moves a card up a box,
  a wrong one knocks it back to box 1, and a card counts as learned at box 4.
  The front rotates between three questions — *what is the hook*, *which use is
  this hook*, *which use does this test find* — so you are learning the concept
  rather than the shape of a card.
- **Spot it** — multiple choice on real examples, and the **Greek is the
  question**: the verse comes first and large, the English sits under it as a
  gloss you can blur out with one tap. Items carrying Greek are drawn twice as
  often as English-only drills. Distractors come from the same case, and
  preferentially from that card's confusion partners: telling a nominative use
  from an accusative one is not the exam.
- **Progress** — what is learned, what is shaky, what you have not seen yet, and
  the countdown to the date you are learning it by.

Everything is stored in `localStorage` on the device. Nothing is uploaded.

## More than one person on one device

A dropdown in the top right picks who is using it. Each person gets their own
Leitner boxes, their own quiz scores, their own filters and their own target
date; switching is instant and nothing is shared. Add, rename and remove people
under **Progress → Who is using this**.

It is still `localStorage`, one entry per person (`gdgc.v1:<id>`, with the roster
in `gdgc.people`), so it needs no server and works offline like everything else.
Progress from before the picker existed is adopted by the first person rather
than orphaned.

Worth knowing: `localStorage` is per-browser-per-device anyway, so two people on
two phones were never sharing anything. This is for the shared laptop or tablet
— or for keeping a second, separate run of the cards.

## Linking into it

Every screen has a URL, so the homework app (or a bookmark, or a note) can point
straight at the thing you want:

```
#/map                            the acrostics
#/learn                          every card
#/learn/nominative               one case
#/card/hanging-nominative        one card, opened
#/drill        #/drill/accusative
#/spot         #/spot/nominative
#/tag/saturday                   everything tagged for this week
#/progress
```

Add `?from=<url>` and the app's "Back to…" link returns there instead of to the
homework app's home page — which is how the buttons in the homework app hand you
back where you came from.

## Running it

Plain HTML/CSS and one ES module, no dependencies, no build step for the hosted
app. It needs to be *served*, not opened as a `file://` URL:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

One file instead of a module graph is deliberate: it gives the whole app a
single cache key, so bumping `?v=` in `index.html` invalidates all of it at once
rather than leaving a stale service worker serving fresh markup beside stale
code. Bump `BUILD` in `js/app.js` and `CACHE` in `sw.js` together.

## Downloading it

**`dist/greek-cases.html`** — the whole app in one 69 KB file. Save it, open it,
done: no server, no install, no network. Rebuild it after any change with:

```sh
node tools/build.mjs
```

The icons are generated too, straight from Node with no image library:

```sh
node tools/icons.mjs
```

`icons/screenshot-*.png` are what Android's install sheet shows. They are real
screenshots at 420×900; retake them from a browser if the design moves.

## Putting it on your home screen

It is a full PWA: a manifest with maskable icons and install screenshots, a
service worker that caches the entire app on first load, and `standalone`
display so it opens without browser chrome. Installed, it works with no signal
at all — the cards, the drill and your progress are all on the device.

It is live at **https://claudekovalenko.github.io/going-deeper-greek-concepts/**

**It has to be served over https.** A browser will not install a page opened off
the filesystem, so the single-file copy cannot become a home-screen icon —
only the address above can.

Publishing is handled by [`.github/workflows/pages.yml`](.github/workflows/pages.yml),
which runs on every push to `main` and can also be run by hand from the Actions
tab (**Deploy to GitHub Pages → Run workflow**) against whatever branch you are
on — which is how this was first published, before `main` existed. It passes
`enablement: true` to `configure-pages`, so it switches Pages on for the
repository itself rather than failing until somebody visits Settings.

Open that address on the phone. The app's own **Put it on your home screen**
card tells you what to do next, and knows which browser you are in:
   - **iPhone/iPad** — Safari → Share → *Add to Home Screen*. It must be Safari;
     Chrome on iOS cannot install a web app.
   - **Android** — the app shows an **Install** button of its own, because
     Chrome hands the prompt to the page rather than showing its own.

**Settings → App version** shows what a device is really running, and has a
button that throws away its offline copy and fetches the app again — for the
phone that stubbornly will not update. Your progress survives that.

Every release bumps `BUILD` in `js/app.js` and `CACHE` in `sw.js` together.

## Editing the cards

Everything the app knows lives in [`data/concepts.json`](data/concepts.json).
Adding a chapter means appending to `sets`, `cards` and `confusions`; nothing in
`js/app.js` is chapter-specific.

```jsonc
{
  "id": "hanging-nominative",     // stable — progress and #/card/… links use it
  "set": "nominative",
  "group": "nominative-other",
  "name": "Hanging Nominative",
  "short": "Hanging",             // shown on the acrostic tile
  "tile": "H",                    // the acrostic letter itself
  "type": "rule",                 // optional: drilled, but never a quiz answer
  "oneLine": "…",
  "mnemonic": "It hangs by a pronoun.",
  "mnemonicWhy": "…",             // why the hook works — the part that sticks
  "spotIt": "…",                  // a test you can run on a text
  "watchOut": "…",                // optional
  "examples": [
    { "ref": "Matt. 13:38",
      "greek": "τὸ δὲ καλὸν *σπέρμα*, οὗτοί εἰσιν …",   // *asterisks* highlight
      "english": "the good *seed* — these are …",
      "note": "…" }               // shown as the explanation when you get it wrong
  ],
  "tags": ["nominative", "other", "saturday"]           // reachable as #/tag/saturday
}
```

Rules of thumb:

- An example with a `note` becomes a *Spot it* question automatically. One
  without a note is display-only.
- `type: "rule"` is for the things that are not a "use" you point at in a text —
  the pecking order, the idea of the case. They are drilled, but they never
  appear as a multiple-choice option.
- `confusions[]` entries need a `pair` of two card ids. Both cards get an
  "easily confused with" section, and the pair is preferred as a distractor.

## A note on the references

Two places where the app is more precise than a lecture note usually is:

- **Subject** is illustrated from **John 1:15** (Ἰωάννης μαρτυρεῖ περὶ αὐτοῦ) —
  John as the one bearing witness. John the Baptist is introduced in the
  prologue at 1:6 and does the witnessing at 1:7, 1:15.
- **Matt. 9:27** reads *ἐλέησον ἡμᾶς, υἱὸς Δαυίδ* — the address follows the
  imperative in the Greek, though it is usually quoted first in English.

## This week and next

Each set carries the `classDate` its chapter is taught on, and a **This week**
chip beside the case chips filters to whichever case is next up — reading the
timetable rather than a tag that goes stale the moment the calendar moves. Also
`#/learn/week`, `#/drill/week`, `#/spot/week`.

## Where the wording comes from

Two layers, deliberately different:

- **`oneLine`** is the plain caption under the pattern, in my words.
- **`bookDef`** is the chapter summary chart's own sentence, kept verbatim, shown
  under *What the book says*. That is the wording an exam will use, so it is
  reproduced rather than paraphrased.

Every Greek example the two charts supply is in, with the chart's own reference
and translation.

## A note on one of the practice exercises

Three of the chapter's four practice exercises are in the quiz. The fourth,
Matt 11:11's τῶν οὐρανῶν in ἡ βασιλεία τῶν οὐρανῶν, is left out on purpose: it
sits between **attributive** ("the heavenly kingdom") and **description**, and
that is a judgement call worth hearing your professor make rather than having
this app assert one. The αὐτοῦ in the same verse is in, as comparison.
