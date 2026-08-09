# SAP StockMon

> Aplikasi desktop monitoring stock barang via barcode/QR — offline, cepat, akurat.

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Platform | Electron (Windows) |
| Backend | Node.js + better-sqlite3 |
| Frontend | HTML + Vanilla CSS + Vanilla JS |
| Database | SQLite (lokal, offline) |
| Icons | Material Symbols Outlined |
| Font | Inter + JetBrains Mono |

## Status Milestone

```
M0: Foundation    [/] In Progress
M1: Core Data     [ ] Not started
M2: QR Generation [ ] Not started
M3: Scanner       [ ] Not started
M4: Grid Monitor  [ ] Not started
M5: Polish/Export [ ] Not started
```

## Cara Menjalankan

```bash
# Install dependencies
npm install

# Jalankan dalam mode development
npm run dev

# Jalankan normal
npm start
```

## Struktur Project

```
src/
├── main/              ← Node.js main process
│   ├── index.js       ← Entry point Electron
│   ├── preload.js     ← IPC bridge (contextBridge)
│   ├── ipc-handlers.js
│   └── db/            ← SQLite database layer
│
└── renderer/          ← UI (HTML/CSS/JS)
    ├── index.html
    ├── css/           ← Design system
    └── js/            ← App logic + views

workflows/             ← Dokumentasi & planning
data/                  ← Runtime data (gitignored)
logs/                  ← Log files (gitignored)
```

## Dokumentasi

Lihat folder [`workflows/`](workflows/) untuk dokumentasi lengkap:
- [00_overview.md](workflows/00_overview.md) — System overview
- [01_requirements.md](workflows/01_requirements.md) — Requirements
- [02_architecture.md](workflows/02_architecture.md) — Architecture
- [06_ui_design_system.md](workflows/06_ui_design_system.md) — Design system
- [09_milestones.md](workflows/09_milestones.md) — Roadmap
