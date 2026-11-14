# Maimai’s shows

A static, mobile-friendly reading view of [notmaimai’s MyDramaList](https://mydramalist.com/dramalist/notmaimai). Native-language titles come first, with the source’s English/display title underneath. The site is read-only: update your watch history on MyDramaList as usual.

The default view is a poster grid, ordered by premiere date, newest first, with a compact list view available from the view toggle. Shared URLs override the default sort. The profile avatar loads from [maikirakiwi’s GitHub profile](https://github.com/maikirakiwi). Filter options are derived from the imported shows; statuses without shows are hidden unless selected in a shared URL.

Posters fill vertical frames with a centered crop in the browser. GitHub Actions analyzes new poster URLs with Japanese/English OCR and upright face detection at 0°, 90°, 180°, and 270°, then saves the results in `public/data/posters.json`. Japanese (`jpn`) language data supports Kanji, Hiragana and Katakana, including single Kanji in the scoring logic. Vite includes the JSON in the production JavaScript, and CSS applies the detected correction before the centered crop. No analysis libraries or models ship to the browser, and no poster IDs are hard-coded.

The JSON is committed back to the default branch by the Actions bot. Existing URLs with a matching analyzer version are skipped entirely—no poster download or repeated OCR. Both confident and inconclusive results are stored. Failed image requests are retried next run; old successful results are retained. Branch protection must permit the bot’s generated-data commits. A bot commit uses `[skip ci]` and the workflow’s `GITHUB_TOKEN`, avoiding recursive deployments. Branch builds analyze for their own preview but only the default branch writes results back.

The `eng-jpn-faces-v2` identifier versions this project's analysis rules; it is not an official model release. Tesseract.js installs from npm's `latest` tag. Strong OCR requires at least 25 points, twice the runner-up score, and a 12-point lead. Otherwise, clear upright-face evidence takes priority (at least 5.5 points, 1.5× the runner-up, and a 2-point lead). The remaining OCR threshold is 8 points, 1.4× the runner-up, and a 3-point lead. Face scores sum detector weights of at least 3; they are not probabilities. Both OCR and face scores, plus the decision method, are saved for inspection. Ambiguous artwork stays in its source orientation. Stylized lettering, vertical Japanese text, sparse text, and false face detections can still make analysis inconclusive or incorrect. Image bytes are not modified. If an image changes at the same URL, force a fresh analysis:

```sh
npm run analyze:posters
REFRESH_POSTERS=1 npm run analyze:posters
```

Local analysis also requires Python 3 and `python3 -m pip install 'opencv-python-headless<5'` (use a virtual environment if required by your Python installation). OpenCV 4 provides the Haar face detector used here; OpenCV 5 removed that API.

To reanalyze **all posters on GitHub Actions**:

1. Push these changes to the repository's default branch.
2. Open **Actions → Refresh and deploy drama journal → Run workflow**.
3. Select the **default branch**, enable **Reanalyze all posters, including saved results**, then click **Run workflow**.
4. The workflow refreshes the list, analyzes every current poster, commits `public/data/posters.json`, and deploys the updated page. Check **Analyze new poster orientations** for each angle, decision method, OCR scores and face scores.

Use **Run workflow** to change the checkbox; **Re-run jobs** reuses the original run's inputs. The new analyzer version also invalidates older saved results automatically on the next normal build. Subsequent builds skip matching results again. Failed images keep their old results and are retried on a later normal build.

The first analysis downloads OCR language models to `.cache/tesseract/` (cached by Actions) and processes the full collection. Later builds only process new poster URLs or outdated analyzer versions. Commit the regenerated JSON after a local manual refresh.

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
