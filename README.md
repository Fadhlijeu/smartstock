# SmartStock

<div align="center">

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg?style=flat-square)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Electron-brightgreen.svg?style=flat-square)
![Runtime](https://img.shields.io/badge/runtime-Node.js%2020%2B-orange.svg?style=flat-square)
![Database](https://img.shields.io/badge/database-SQLite%203-003B57.svg?style=flat-square)
![License](https://img.shields.io/badge/license-ISC-green.svg?style=flat-square)
![Status](https://img.shields.io/badge/milestones-M0--M4%20Completed-success.svg?style=flat-square)

**Enterprise-Grade Desktop Barcode & QR Stock Monitoring Engine**  
*Ultra-fast, 100% offline-first inventory management with visual grid monitoring.*

[Key Features](#-key-features) • [What is SAP?](#-what-is-sap-in-smartstock) • [Architecture](#-architecture--pipeline) • [Quick Start](#-quick-start) • [Roadmap](#-milestones--progress) • [Documentation](#-documentation)

</div>

---

## 🌟 Overview

**SmartStock** is a modern, high-performance desktop application built on **Electron + SQLite** for real-time inventory tracking and barcode/QR stock management. 

Engineered for warehouses, manufacturing distribution hubs, retail backrooms, and quality control stations, SmartStock eliminates the operational drag of paper logs and slow cloud portals. It provides instantaneous (<50ms) barcode verification, automatic part classification, incremental QR code generation, and a real-time visual grid monitor.

---

## 💡 What is "SAP" in SmartStock?

> **SAP** = **Smart Asset & Provisioning** *(formerly inspired by industrial stock workflows)*

In enterprise environments, the term *SAP* is widely recognized for industrial resource planning. In this software:

1. **Smart Asset & Provisioning**: SmartStock is purpose-built to streamline asset provisioning and stock flow at the physical workstation level.
2. **Lean & Local**: Monolithic enterprise ERP systems (such as SAP ECC / S/4HANA / Business One) often require cumbersome cloud infrastructure, high licensing overhead, and slow browser forms for simple scanning tasks.
3. **Workstation Efficiency**: SmartStock serves as the agile edge terminal—operating completely offline with local SQLite storage, eliminating downtime caused by network outages, and syncable with master logs via clean Excel exports.

---

## 🚀 Key Features

- **⚡ Instant Barcode & QR Scanning**  
  Seamlessly integrates with standard USB HID handheld barcode scanners, integrated webcams, or keyboard-wedge inputs with zero driver friction.
- **🛡️ Intelligent Collision & Duplicate Guards**  
  Real-time stock validation prevents accidental double-scans and alerts operators immediately when quantities hit critical thresholds.
- **🏷️ Automated QR Generation Engine**  
  Batch-generate standardized incremental QR codes with embedded part metadata (SKU, serial numbers, PO, invoice dates) ready for thermal or label printing.
- **📊 Real-Time Visual Grid Matrix**  
  Interactive, color-coded grid cards displaying live stock status (`OK` / `LOW STOCK` / `OUT OF STOCK`), minimum quantity indicators, category badges, and quick context actions.
- **🤖 Part Auto-Classification Engine**  
  Classifies items into homogeneous and heterogeneous inventory segments dynamically based on nomenclature and part specifications.
- **📈 Comprehensive Excel & Audit Reporting**  
  One-click snapshot and transaction ledger exports generated via high-speed ExcelJS formatting with custom status highlights.
- **🔒 Zero-Cloud Offline Security**  
  100% of data remains within your local machine. No external telemetry, no remote cloud dependencies, and zero latency.

---

## 🏗️ Architecture & Pipeline

```text
  [ Upload Parts (CSV / Manual) ]
                 │
                 ▼
  [ Auto-Classification Engine ] ──► Detects part type & category rules
                 │
                 ▼
  [ QR / Barcode Generator ]     ──► Incremental batch sequence generator
                 │
                 ▼
  [ SQLite Local Database ]      ──► Fast atomic ACID transactions
                 │
                 ▼
  [ Barcode Scanner (USB/Cam) ]  ──► Hardware-level input parsing (<50ms)
                 │
                 ▼
  [ Live Grid Monitor ]          ──► Color-coded card matrix (OK/LOW/OUT)
                 │
                 ▼
  [ Export Engine (Excel/CSV) ]  ──► Audit-ready inventory reporting
```

---

## 🛠️ Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Shell / Desktop** | [Electron](https://www.electronjs.org/) | Cross-platform native window wrapper |
| **Backend / IPC** | [Node.js](https://nodejs.org/) | Preload IPC bridge via `contextBridge` |
| **Database** | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | Synchronous, high-speed embedded SQLite |
| **Frontend UI** | HTML5 / Modern CSS / Vanilla JS | Custom zero-framework lightweight design system |
| **Typography** | Inter & JetBrains Mono | Crisp legibility for numbers, SKUs, and logs |
| **Icons** | Material Symbols Outlined | Google Design system iconography |
| **Utilities** | `qrcode`, `exceljs`, `csv-parse` | QR rendering, spreadsheets & bulk parsing |

---

## ⚡ Quick Start

### Prerequisites
- **Node.js**: v18+ or v20+
- **Platform**: Windows 10/11 (or macOS / Linux)

### 1. Clone & Install

```bash
git clone https://github.com/Fadhlijeu/smartstock.git
cd smartstock

# Install dependencies (native modules rebuild automatically)
npm install
```

> **Note on Native Modules:** If your environment uses custom C++ build tools, run `npm run rebuild` to ensure `better-sqlite3` targets the local Electron ABI.

### 2. Launch Development Mode

```bash
# Starts Electron with DevTools enabled
npm run dev
```

### 3. Launch Standard Application

```bash
npm start
```

### 4. Build Production Installer (Windows)

```bash
npm run build
```
The installer executable will be generated inside the `dist/` directory.

---

## 📁 Project Structure

```text
smartstock/
├── src/
│   ├── main/                  # Node.js Main Process
│   │   ├── index.js           # Window lifecycle & initialization
│   │   ├── preload.js         # Secure contextBridge API bridge
│   │   ├── ipc-handlers.js    # IPC endpoints for renderer requests
│   │   └── db/                # SQLite connection, migrations & queries
│   │
│   └── renderer/              # Frontend UI Shell
│       ├── index.html         # Main application window
│       ├── css/               # Modular design system & components
│       └── js/                # View controllers, state & scanner listener
│
├── workflows/                 # Complete architectural specs & planning
│   ├── 00_overview.md         # System concept & operational manual
│   ├── 01_requirements.md     # Functional & non-functional matrix
│   ├── 02_architecture.md     # IPC patterns & security model
│   ├── 03_barcode_qr_strategy.md # Barcode payload format & scanners
│   ├── 04_classification_engine.md # Classification logic
│   ├── 05_data_models.md      # SQLite tables & indexes
│   ├── 06_ui_design_system.md # Color tokens, components & grid specs
│   ├── 07_grid_monitor_spec.md# Visual monitor specifications
│   ├── 08_excel_export_spec.md# Workbook layout & export formats
│   └── 09_milestones.md       # Roadmap & phase definitions
│
├── data/                      # Local SQLite database (git-ignored)
├── logs/                      # Application error & audit logs (git-ignored)
└── package.json               # Scripts, dependencies & metadata
```

---

## 🎯 Milestones & Progress

| Milestone | Scope | Status |
|---|---|---|
| **M0: Foundation** | Electron shell, SQLite schema, IPC bridge, UI theme | ✅ **Completed** |
| **M1: Core Data** | Parts CRUD, CSV bulk import, barcode uniqueness checks | ✅ **Completed** |
| **M2: QR Generation** | Incremental sequences, batch SVG/PNG export, print preview | ✅ **Completed** |
| **M3: Scanner** | USB HID scanner listener, webcam reader, fast lookup | ✅ **Completed** |
| **M4: Grid Monitor** | Live stock grid matrix, threshold filters, status badges | ✅ **Completed** |
| **M5: Polish & Export** | High-fidelity Excel report engine, release packaging | 🔄 **Finalizing** |

*For complete historical build logs and session decisions, refer to [`progress.md`](progress.md).*

---

## 📖 Documentation

Detailed architectural blueprints and specifications are available in the [`workflows/`](workflows/) folder:
- [00_overview.md](workflows/00_overview.md) — Comprehensive overview
- [02_architecture.md](workflows/02_architecture.md) — IPC & threading model
- [06_ui_design_system.md](workflows/06_ui_design_system.md) — Design tokens & guidelines
- [07_grid_monitor_spec.md](workflows/07_grid_monitor_spec.md) — Monitor behavior & sorting rules

---

## 📄 License

This project is open-source under the [ISC License](LICENSE).
