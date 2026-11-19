# ZAZAN COLLECTIONS — Editable Web Software v3

## Included
- Latest backup: 167 existing entries, loaded on first launch.
- Add, edit, delete; category, status, genres, year, rating, progress, notes and poster.
- IndexedDB auto-save.
- Gallery: previous website images + 10 newly supplied images; upload and remove additional images.
- JSON backup export and restore (restore merges by ID).
- Search, filters, sorting, dashboard counters.
- Responsive mobile/tablet/desktop layout; installable/offline-capable PWA.

## Run
1. Extract this ZIP.
2. Open folder in VS Code.
3. Run `python -m http.server 8000`.
4. Open `http://localhost:8000` in Chrome.
5. For Android install, publish to GitHub Pages and open its HTTPS URL in Chrome → menu → Install app / Add to Home screen.

Do not open index.html directly using file://. Use a local server or HTTPS.

## Data safety
Your entries and user-uploaded gallery images are stored in IndexedDB in this browser on this device. Export backups regularly. Clearing site data can erase the local database. This version does not provide cloud sync. `backup.json` seeds a new empty database only; it does not overwrite an existing archive.

## Animation
No animation file was included in this delivery. Send your animation files and they can be added to the hero/gallery.


## V4 Gallery upgrade
- Automatic slideshow starts by default and cycles through all 20 bundled images plus images uploaded by you.
- Previous/next, dots, pause/play and slide progress indicator.
- Settings panel: autoplay, interval (2–10 seconds), slide/fade transition and complete-image/cover frame mode.
- Complete-image mode is the default for gallery slides and collection poster cards (`object-fit: contain`).
- Slideshow preferences save locally in this browser.
- Existing IndexedDB archive and backup import/export remain intact.

\n## V5 features\n- Separate Manga Reading Room supports PDF volumes and multi-image chapters, stored in IndexedDB on this device.\n- Dark/light mode, notification center, Ctrl+K universal search, achievement badges, progress widgets, draggable dashboard cards and widget visibility controls.\n- CSV export and print-to-PDF report.\n- Gallery uses the slideshow without the duplicate bottom thumbnail gallery. Purple cosplay images are included in the slideshow.\n- Local archive assistant is rule-based, not connected to an AI service. Multi-user roles and cloud notifications require a backend. Manga files are not included in the JSON backup; keep separate copies of imported PDFs/images.\n