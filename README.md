# Resonance

A browser-based application for analyzing Spotify Extended Streaming History exports. Data processing and visualization run locally, without a Spotify API connection or application backend.

Resonance is an independent project and is not affiliated with or endorsed by Spotify.

## Features

- Import multiple JSON exports with validation and duplicate detection.
- Filter by date, year, content type, minimum playback duration, artist, and device.
- View monthly trends, hourly and weekday distributions, and daily calendar heatmaps.
- Rank artists, tracks, episodes, and albums by listening time or event count.
- Compare years, inspect artist trajectories, and calculate listening concentration and diversity.
- Search playback events and inspect retained source fields.
- Export filtered events and rankings as CSV, charts as SVG, and summaries or cleaned archives as JSON.
- Optionally save the loaded archive in the browser using IndexedDB.

No runtime dependencies, remote fonts, tracking scripts, or personal datasets are included.

## Getting started

Download or clone the repository, then open `index.html` in a browser. Keep `index.html`, `style.css`, `engine.js`, and `app.js` in the same directory.

Select **Choose JSON files**, or drag and drop one or more Spotify Extended Streaming History files onto the page. Additional imports are merged into the current archive.

If local-file restrictions prevent the application or browser storage from working, run the optional static server with Python 3:

```bash
python start.py
```

Use `python3 start.py` on systems where Python 3 is installed under that name, or `py -3 start.py` on Windows. Open http://127.0.0.1:8765. Stop the server with Ctrl+C.

To select a different port:

```bash
python start.py --port 9000
```

The server binds to `127.0.0.1` by default. Browser storage is scoped to the browser profile and origin; changing the hostname or port creates a separate storage context.

## Supported input

Use Spotify **Extended Streaming History** exports, commonly named `Streaming_History_Audio_*.json` or `endsong_*.json`. Each file must be a JSON array. Required fields are a valid `ts` timestamp and a numeric, nonnegative `ms_played` value.

Minimal fictional example:

```json
[
  {
    "ts": "2024-01-01T12:00:00Z",
    "ms_played": 180000,
    "master_metadata_track_name": "Example Track",
    "master_metadata_album_artist_name": "Example Artist",
    "master_metadata_album_album_name": "Example Album",
    "skipped": false
  }
]
```

Music, podcasts, and audiobooks are classified from their available metadata. Rows without recognizable content metadata remain classified as unknown. Invalid rows are counted and skipped; malformed JSON or a non-array file is rejected. The import journal reports these results.

The simplified export format using `endTime` and `msPlayed` is not supported. PDF readme files and ZIP archives are not importable; extract the JSON files first.

## Views and filters

| View | Contents |
| --- | --- |
| Overview | Listening time, event counts, artist counts, streaks, monthly trends, playback flags, and duration distribution |
| Listening patterns | Weekday/hour heatmap, daily calendar, weekday totals, and estimated sessions |
| Rankings | Artists, tracks, episodes, and albums with sortable statistics and CSV export |
| Trends & diversity | Year comparisons, first-observed artists, effective artist count, concentration, and artist trajectories |
| History explorer | Searchable playback events, device filters, event details, and CSV export |
| Data & methodology | Import journal, browser storage controls, archive export, and calculation definitions |

Filters combine across views. Artist, search, and device filters appear as removable chips. Reset clears filters while retaining the selected time zone. Supported time zones are UTC, Europe/Berlin, America/Chicago, and the device time zone.

## Calculation methods

- **Play events:** valid imported rows after deduplication and filtering. This is not Spotify's official stream count. Short and zero-duration events are included unless excluded by the minimum-play filter.
- **Listening time:** sum of `ms_played`. It is not calculated from track length or event count.
- **Dates and hours:** the full duration of an event is assigned to its recorded playback end time (`ts`) in the selected time zone. Events are not split across hour or date boundaries. Timestamps without an explicit offset are interpreted as UTC.
- **Active days and streaks:** dates with positive listening time; streaks count consecutive qualifying dates.
- **Skip and other flag rates:** explicitly true flags divided by known true/false flags. Unknown values are excluded. Ending reasons are not used to infer skips.
- **Track identity:** Spotify URI when available, otherwise content type, title, creator, and album. Artists are grouped by name; albums by creator and album name.
- **Duplicate identity:** timestamp, duration, track identity, platform, country, playback flags, and start/end reasons. Matching events collapse within and across files. Events differing only in discarded fields cannot be distinguished.
- **First-observed artists:** the earliest occurrence in the entire imported archive, rather than the current date filter or the listener's lifetime history. Importing older files can change this result.
- **Effective artist count:** `exp(-sum(p * ln(p)))`, where `p` is each artist's share of music listening time. Unknown creators are excluded. Top-ten concentration uses the same denominator.
- **Sessions:** estimated playback intervals start at `ts - ms_played`. Intervals separated by no more than 30 minutes are merged within the filtered selection. Pauses and concurrent devices limit precision; summed playback can exceed elapsed session time.

Missing months can reflect missing exports. Partial years are not extrapolated. The application does not infer genres, mood, audio features, release dates, or full track lengths. Explicitly false skip flags do not establish that no skipping occurred outside what the export records.

## Privacy and storage

Imports are processed in the browser. IP addresses, usernames, user agents, and offline timestamps are not retained. Retained data still includes personal listening history, platform names, and country codes.

- **Save archive in this browser** stores a snapshot. Later imports are not saved automatically.
- **Delete saved browser copy** removes that snapshot but leaves the current in-memory archive open.
- **Clear current archive** clears memory but leaves any saved browser snapshot intact.
- Neither action modifies original export files.

Clean archive downloads contain the entire loaded archive. CSV downloads contain the current filtered selection or ranking. CSV fields are quoted, and formula-like text is prefixed with an apostrophe for spreadsheet safety.

The repository contains only fictional test fixtures. `.gitignore` excludes common export filenames, generated downloads, and local data folders. Keep personal exports outside the repository, or in an ignored directory such as `private/`.

## Docker

```bash
docker build -t resonance-offline .
docker run --rm -p 127.0.0.1:8765:8765 resonance-offline
```

Open http://127.0.0.1:8765. The initial build requires the Python base image to be available locally or downloaded. Runtime analysis works offline. Saved archives reside in the client browser, not the container.

## Development

The application uses plain JavaScript, CSS, and SVG. No dependency installation or build step is required. Python is optional for local serving. Node.js 18 or later is needed only for tests and syntax checks:

```bash
npm test
npm run check
```

| File | Purpose |
| --- | --- |
| `index.html` | Application shell |
| `style.css` | Layout, responsive styles, and print styles |
| `engine.js` | Normalization, deduplication, filtering, and analytics |
| `app.js` | Import workflow, storage, UI rendering, charts, and exports |
| `start.py` | Optional static server |
| `tests/` | Analytics tests, structural rendering checks, and fictional fixtures |

Tests cover input validation, duplicate detection, missing flags, time-zone boundaries, streaks, session estimates, CSV escaping, archive round trips, and rendering of all views. Structural rendering tests use a minimal DOM facade; they do not replace live-browser interaction or layout testing.

Files are parsed sequentially using a worker where available, with an in-page fallback. Normalization and aggregation run on the main thread. All records remain in memory, so large imports may cause delays or exceed available browser memory. SVG hover tooltips are primarily intended for desktop browsers; tables and CSV exports provide alternatives on touch devices.

For contributions, describe the behavior changed and relevant verification. Use fictional fixtures for reproducible examples and bug reports; do not attach personal exports.

## Related projects

These projects address related use cases. The descriptions below summarize their repository documentation, reviewed on October 19, 2026; they are not performance or security evaluations.

| Project | Focus |
| --- | --- |
| [Your Spotify](https://github.com/Yooooomi/your_spotify) | Self-hosted listening tracking with a server that polls the Spotify API and a statistics dashboard |
| [Spotilyze](https://github.com/flaser381/spotilyze) | Local analysis of exported listening history, with genre metadata, listening-phase analysis, and optional AI reports |
| [SYSH](https://github.com/barmiro/SYSH) | Self-hosted streaming-history dashboard with an Android client. Its README reports import difficulties following Spotify API changes |

Resonance focuses on dependency-free, browser-local analysis of imported JSON exports. It requires no API credentials or database server and documents calculations from the fields available in those exports.

## License

MIT. See [LICENSE](LICENSE).
