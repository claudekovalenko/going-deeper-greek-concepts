# Greek Cases — mnemonics for *Going Deeper with New Testament Greek*, ch. 2

A small offline-first PWA for getting the **nominative** and **accusative**
uses into your head and keeping them there. Seventeen cards, each with a
mnemonic hook, a one-line definition, a test you can actually run on a text,
and the Greek examples.

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

**Accusative — one object, four twists, then MMR**

The accusative is the case of limitation: the nominative crowns, the accusative
fences.

| | |
|---|---|
| Direct object | the verb throws, the object catches |
| **Echo** — cognate | the object echoes the verb: *fight the good fight* |
| **Two** — double | *ask someone something* vs *call someone something* |
| **Sub** — subject of infinitive | finite verbs pay in nominative, infinitives in accusative |
| **Alias** — apposition | the name tag, now on the object |
| **M**easure | how far? |
| **M**anner | how? |
| **R**espect | how so? — slot in "as to" |

## What is in the app

- **Map** — the two acrostics as tappable tiles, plus the seven confusion pairs
  that account for nearly every wrong answer.
- **Learn** — all seventeen cards: hook, why the hook works, how to spot it,
  what it is easily confused with, and the examples in Greek and English.
- **Drill** — flashcards on Leitner boxes. A right answer moves a card up a box,
  a wrong one knocks it back to box 1, and a card counts as learned at box 4.
  The front rotates between three questions — *what is the hook*, *which use is
  this hook*, *which use does this test find* — so you are learning the concept
  rather than the shape of a card.
- **Spot it** — multiple choice on real examples. Distractors are drawn from the
  same case, and preferentially from that card's confusion partners: telling a
  nominative use from an accusative one is not the exam.
- **Progress** — what is learned, what is shaky, what you have not seen yet, and
  the countdown to the date you are learning it by.

Everything is stored in `localStorage` on the device. Nothing is uploaded.

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

**It has to be served over https first.** A browser will not install a page
opened off the filesystem, and GitHub Pages will not publish until the branch is
on `main`. So:

1. Merge this branch to `main`.
2. Turn on Pages for the repo: **Settings → Pages → Source: GitHub Actions**.
   The included workflow publishes on every push to `main`, at
   `https://claudekovalenko.github.io/going-deeper-greek-concepts/`.
3. Open that address on the phone. The app's own **Put it on your home screen**
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
Adding chapter 3 means appending to `sets`, `cards` and `confusions`; nothing in
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
