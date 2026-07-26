# Daycare Case File

A small static web app for ranking MCCYN daycare candidates between Nopal Valley
and JBSA-Lackland. No backend, no database — everything lives in `data.json`.

## Files

- `index.html` — page structure
- `style.css` — visual design
- `app.js` — all logic (loading, saving, ranking math, editing)
- `data.json` — your actual data: daycares, scores, weights, reviews, notes, tags

## Hosting on GitHub Pages

1. Create a repo (e.g. `daycare-ranking`) and push these four files to it.
2. In the repo, go to **Settings → Pages**, set "Source" to your default branch
   (usually `main`) and root folder, then save.
3. GitHub gives you a URL like `https://yourusername.github.io/daycare-ranking/`.
   That's your live app — it reads the `data.json` sitting in the repo.

## How editing works

The app always tries to load `data.json` next to it on page load. To make
changes (scores, notes, tags, weights, trip times, adding/removing a daycare):

**In Chrome or Edge (recommended):**
1. Click **"Open data file..."** and select the `data.json` in your local
   clone of the repo.
2. Make your edits in the app.
3. Click **"Save"** — it writes straight back to that file on disk.
4. In your terminal: `git add data.json && git commit -m "update scores" && git push`.

**In Safari or Firefox** (no direct file-write support yet):
1. Click **"Open data file..."** to load your local copy for editing.
2. Make your edits.
3. Click **"Download updated file"** — this downloads a new `data.json`.
4. Move it into your repo folder (overwriting the old one), then commit and push
   as above.

Either way, the data itself is just JSON — you can also open `data.json` directly
in any text editor and hand-edit it if that's ever faster.

## Data shape

Each daycare in `data.json` looks like this:

```json
{
  "id": "little-dove",
  "name": "Little Dove Learning Center",
  "address": "2655 Talley Rd, San Antonio, TX 78253",
  "phone": "210-679-5100",
  "tripTime": "~28-32 min",
  "scores": { "commute": 5, "reviews": 5, "inspection": 3, "mccyn": 4, "price": null, "hours": 5, "avail": null },
  "reviews": [ { "source": "Google reviews", "url": "", "note": "..." } ],
  "inspectionNote": "free text summary of the Texas HHS inspection history",
  "tags": [],
  "notes": ""
}
```

- Any `scores` value can be `null` (not yet scored) — the weighted total just
  ignores factors that aren't filled in for that daycare, rather than treating
  them as zero.
- `reviews[].url`, when present, is a clickable link (currently pointed at each
  place's Google Maps listing, since individual Google review permalinks
  aren't publicly accessible — open the listing and the reviews are right there).
- Weights live in `data.json` too (`"weights": {...}`), so your priorities
  travel with the data and with git history.

## Notes on the commute estimates

`tripTime` values were estimated from road distance and typical arterial
speeds, not live routing — treat them as ballpark ranges and verify the
top few candidates in Google/Apple Maps (or TomTom, once connected) at your
actual 0730 departure time.
