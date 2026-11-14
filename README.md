# Maimai’s shows

A static, mobile-friendly reading view of [notmaimai’s MyDramaList](https://mydramalist.com/dramalist/notmaimai). Native-language titles come first, with the source’s English/display title underneath. The site is read-only: update your watch history on MyDramaList as usual.

The default view is a poster grid, ordered by premiere date, newest first, with a compact list view available from the view toggle. Shared URLs override the default sort. The profile avatar loads from [maikirakiwi’s GitHub profile](https://github.com/maikirakiwi). Filter options are derived from the imported shows; statuses without shows are hidden unless selected in a shared URL.

Posters fill vertical frames with a centered crop in the browser. GitHub Actions analyzes new poster URLs with Japanese/English OCR at 0°, 90°, 180°, and 270°, then saves the results in `public/data/posters.json`. Vite includes that JSON in the production JavaScript, and CSS applies the detected correction before the centered crop. No OCR code or models ship to the browser, and no poster IDs are hard-coded.

The JSON is committed back to the default branch by the Actions bot. Existing URLs with a matching analyzer version are skipped entirely—no poster download or repeated OCR. Both confident and inconclusive results are stored. Failed image requests are retried next run; old successful results are retained. Branch protection must permit the bot’s generated-data commits. A bot commit uses `[skip ci]` and the workflow’s `GITHUB_TOKEN`, avoiding recursive deployments. Branch builds analyze for their own preview but only the default branch writes results back.

OCR chooses a rotation only when readable text has a clear lead over the other orientations; ambiguous artwork stays in its source orientation. Stylized lettering, vertical Japanese text, and sparse text can still make analysis inconclusive or incorrect. Image bytes are not modified. If an image changes at the same URL, force a fresh analysis:

```sh
npm run analyze:posters
REFRESH_POSTERS=1 npm run analyze:posters
```

The first analysis downloads OCR language models to `.cache/tesseract/` (cached by Actions) and processes the full collection. Later builds only process new poster URLs. Commit the regenerated JSON after a manual refresh.

## Run locally

Requires Node.js 22 or newer.

```sh
npm install
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

## GitHub Pages

1. Push this project to a GitHub repository.
2. In **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source.
3. The included workflow builds on every branch push and deploys pushes to the repository’s default branch. The same workflow can be started from the Actions tab with **Run workflow**.

No API keys or server are required. Relative build paths support both `owner.github.io/repository/` and custom domains. The workflow needs repository contents write permission to persist generated poster analysis.

## Daily refresh

The workflow refreshes the public list daily at **06:17 Asia/Shanghai** (22:17 UTC). GitHub may delay schedules, and schedules run only on the default branch. A successful list snapshot is cached across runs; the committed snapshot bootstraps first deployment. Poster analysis is committed only when its results change. Every deploy also attempts a list refresh.

```sh
npm run sync
# Optional: refresh cached detail-page metadata as well
REFRESH_DETAILS=1 npm run sync
```

The updater first requests MyDramaList, then uses Jina’s public HTML rendering if the site blocks direct requests. Native titles, MDL scores, ranks, and tags are cached after the first detail import; status, progress, scores, genres, dates, and list membership refresh daily. Use `REFRESH_DETAILS=1` when detail metadata needs refreshing. New titles are enriched before publication.

The parser rejects missing configuration, empty results, duplicates, pagination, and incomplete native-title imports. A failed update never overwrites the last complete snapshot. The workflow logs a warning and deploys the existing snapshot, retaining its true sync date. Availability of both source services can affect freshness. This is an independent personal viewer, not an official MyDramaList product. Posters remain hosted by MyDramaList.

## Filters and sorting

Includes all source status choices: Watching, Completed, On Hold, Dropped, Plan to Watch, Undecided, and Not Interested. Search matches both native and English/display titles. Country, type, category, multi-select genre and tag filters are retained; year filtering is also available. Selected genres/tags must all match. The URL stores filters, sorting, and direction so friends can share a filtered view.

All 17 source sorting choices are included, plus original list order. Both ascending and descending directions are available. To retain the original page’s title ordering, the Title sort uses its English/display title while showing the native title first. Missing values sort last with stable source-order ties. The public page does not expose every field (notably date added, last updated, times rewatched, priority, or started date); those values remain unknown, and selecting a wholly unavailable sort displays an explanation instead of inventing values. Exact internal sorting semantics for those private fields cannot be reproduced from public HTML.

Viewing hours are computed from watched episodes × runtime, rounded to whole hours. Scores shown on cards are your personal ratings; unrated entries display a dash rather than a fabricated rating.
