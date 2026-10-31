# Working on this repo

The user studies from this app on their phone and sends chapters as photos of
the book's pages. When they send a chapter, the job is not done until it is
live on the site and they can see it flagged as the newest chapter.

## Adding a chapter

1. Ask which chapter the pages are from if it is not said; never guess from
   what came before (ch. 8 was once filed as ch. 7).
2. Append to `sets`, `cards`, `confusions` and `extraQuiz` in
   `data/concepts.json` (see the README's "Editing the cards"). Every card
   carries a `ch-N` tag; every set a `classDate`. Practice questions use
   `"ref": "ch. N practice …"`.
3. Give the new chapter's sets the latest `classDate` (the next class day
   after the previous chapter's, unless the user says otherwise). The cheat
   sheet flags whichever chapter has the latest `classDate`
   (`FLAGGED_CHAPTERS = null` in `js/app.js`), so this is what makes the
   newest chapter show its 🚩 — do not set `FLAGGED_CHAPTERS` by hand unless
   the user asks to pin or clear the flag.
4. Update the chapter range in `data/concepts.json` (`chapter`), `index.html`
   (title line and meta description), the comment at the top of `js/app.js`,
   and the README.
5. Bump `BUILD` in `js/app.js`, `CACHE` in `sw.js` and `?v=` in `index.html`
   together, then `node tools/build.mjs`.
6. Check it renders (headless Chromium is at `/opt/pw-browsers/chromium`),
   commit and push. A push to this branch deploys the site through
   `.github/workflows/pages.yml`; confirm the run succeeded before telling
   the user it is live.

## Telling the user

Phones keep an offline copy. From v39 the app reloads itself once when a new
version takes over, so an update shows on the first open; tell them which
build number to look for (Settings → App version).
