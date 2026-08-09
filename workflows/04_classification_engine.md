# 04 — Classification Engine
## SAP StockMon · Auto-Classification: Homogen vs Heterogen

---

## Problem Statement

Saat user upload batch barang, ada tiga skenario:

1. **Batch Homogen**: 50 unit baut M6 — semua identik → 1 QR, qty = 50
2. **Batch Heterogen**: Baut M6 + Mur M6 + Ring M6 — berbeda jenis → 3 QR
3. **Mixed**: Baut M6 (×50) + Baut M8 (×30) + Kabel listrik 10m — campur → 3 QR

**Tantangan**: Sistem harus otomatis membedakan ini **tanpa user perlu pilih mana yang homogen mana yang tidak**, sambil tetap memberi user kontrol penuh untuk override.

---

## Klasifikasi Berlapis (3-Layer)

```
Layer 1: Exact Match
  → Serial Number prefix sama + nama identik = PASTI homogen

Layer 2: Fuzzy Match (Similarity)
  → Nama mirip (>85% similarity) + kategori sama = MUNGKIN homogen
  → Tampilkan ke user untuk konfirmasi

Layer 3: Category-Based Grouping
  → Kategori sama → group di grid, tapi QR tetap terpisah
  → Beda kategori → pasti heterogen
```

---

## Layer 1: Exact Match

```javascript
// Dua item dianggap EXACT homogen jika:
function isExactHomogen(itemA, itemB) {
  return (
    normalizedName(itemA.name) === normalizedName(itemB.name) &&
    itemA.mrInvoice === itemB.mrInvoice &&
    itemA.purchaseOrder === itemB.purchaseOrder
  );
}

function normalizedName(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')         // normalize spaces
    .replace(/[×x]\s*\d+/g, '')   // hapus "×50", "x100"
    .replace(/\s*(pcs|unit|buah|set|kg|meter|m|cm|mm)\s*$/i, '') // hapus satuan
    .trim();
}
```

---

## Layer 2: Fuzzy Match

```javascript
// similarity.js — Levenshtein-based similarity
function similarity(strA, strB) {
  const a = normalizedName(strA);
  const b = normalizedName(strB);
  
  if (a === b) return 1.0;
  
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  const longerLength = longer.length;
  
  if (longerLength === 0) return 1.0;
  
  const editDistance = levenshtein(longer, shorter);
  return (longerLength - editDistance) / longerLength;
}

// Threshold:
// >= 0.90 → SANGAT MIRIP → auto-group, tapi tampilkan preview ke user
// 0.70 - 0.89 → MIRIP → tampilkan warning, minta konfirmasi
// < 0.70 → BERBEDA → treat as heterogen
const HOMOGEN_AUTO_THRESHOLD = 0.90;
const HOMOGEN_SUGGEST_THRESHOLD = 0.70;
```

---

## Layer 3: Category Classification

### Rule Engine

```javascript
// rules.engine.js
class RulesEngine {
  constructor() {
    this.rules = [];
    this.loadBuiltinRules();
    this.loadCustomRules();
  }

  loadBuiltinRules() {
    // Format: { keywords: [], category: string, confidence: float }
    this.rules = [
      // Mechanical - Fastener
      { keywords: ['baut', 'bolt', 'screw', 'sekrup'], category: 'Mechanical/Fastener', confidence: 0.9 },
      { keywords: ['mur', 'nut', 'kacang'], category: 'Mechanical/Fastener', confidence: 0.9 },
      { keywords: ['ring', 'washer', 'cincin'], category: 'Mechanical/Fastener', confidence: 0.85 },
      { keywords: ['paku', 'nail', 'rivet'], category: 'Mechanical/Fastener', confidence: 0.85 },
      
      // Mechanical - Bearing & Motion
      { keywords: ['bearing', 'bantalan', 'laher'], category: 'Mechanical/Bearing', confidence: 0.95 },
      { keywords: ['gear', 'roda gigi', 'sproket', 'sprocket'], category: 'Mechanical/Gear', confidence: 0.9 },
      { keywords: ['belt', 'v-belt', 'sabuk', 'rantai', 'chain'], category: 'Mechanical/Drive', confidence: 0.85 },
      
      // Mechanical - Valve & Pipe
      { keywords: ['valve', 'katup', 'solenoid valve'], category: 'Mechanical/Valve', confidence: 0.9 },
      { keywords: ['pipa', 'pipe', 'selang', 'hose', 'tube', 'fitting'], category: 'Mechanical/Pipe', confidence: 0.85 },
      { keywords: ['seal', 'gasket', 'o-ring', 'packing'], category: 'Mechanical/Seal', confidence: 0.9 },
      
      // Electrical - Cable & Wire
      { keywords: ['kabel', 'cable', 'kawat', 'wire', 'NYA', 'NYM', 'NYYHY'], category: 'Electrical/Cable', confidence: 0.9 },
      { keywords: ['terminal', 'konektor', 'connector', 'socket', 'plug'], category: 'Electrical/Connector', confidence: 0.85 },
      
      // Electrical - Components
      { keywords: ['relay', 'contactor', 'kontaktor'], category: 'Electrical/Control', confidence: 0.9 },
      { keywords: ['mcb', 'mccb', 'fuse', 'sikring', 'breaker'], category: 'Electrical/Protection', confidence: 0.9 },
      { keywords: ['sensor', 'proximity', 'limit switch', 'photoelectric'], category: 'Electrical/Sensor', confidence: 0.9 },
      { keywords: ['motor', 'pompa', 'pump', 'inverter', 'vfd'], category: 'Electrical/Motor', confidence: 0.85 },
      
      // Consumable
      { keywords: ['oli', 'oil', 'grease', 'pelumas', 'lubricant'], category: 'Consumable/Lubricant', confidence: 0.9 },
      { keywords: ['cat', 'paint', 'thinner', 'primer'], category: 'Consumable/Paint', confidence: 0.9 },
      { keywords: ['sarung tangan', 'glove', 'safety', 'helm', 'masker', 'ppe', 'apd'], category: 'Consumable/Safety', confidence: 0.85 },
      { keywords: ['majun', 'lap', 'kain', 'tissue', 'rags'], category: 'Consumable/Cleaning', confidence: 0.8 },
      
      // Instrument
      { keywords: ['pressure gauge', 'manometer', 'thermometer', 'flow meter'], category: 'Instrument/Measurement', confidence: 0.9 },
      { keywords: ['panel', 'display', 'hmi', 'plc', 'scada'], category: 'Instrument/Control', confidence: 0.9 },
    ];
  }

  classify(name, description = '') {
    const text = `${name} ${description}`.toLowerCase();
    const tokens = tokenize(text);
    
    let bestMatch = { category: 'Uncategorized', confidence: 0 };
    const matches = [];
    
    for (const rule of this.rules) {
      const matchedKeywords = rule.keywords.filter(kw => 
        tokens.some(token => token.includes(kw) || kw.includes(token))
      );
      
      if (matchedKeywords.length > 0) {
        const score = (matchedKeywords.length / rule.keywords.length) * rule.confidence;
        matches.push({ 
          category: rule.category, 
          score, 
          matchedKeywords 
        });
      }
    }
    
    if (matches.length > 0) {
      matches.sort((a, b) => b.score - a.score);
      bestMatch = matches[0];
    }
    
    return {
      category: bestMatch.category,
      confidence: bestMatch.score || 0,
      candidates: matches.slice(0, 3), // top 3 untuk dropdown
      autoAssigned: bestMatch.confidence >= 0.7
    };
  }
}
```

---

## Homogen Detection Pipeline

### Input: Batch Upload

```javascript
// homogen.detector.js
async function processBatch(rawItems) {
  // Step 1: Classify semua items
  const classifiedItems = rawItems.map(item => ({
    ...item,
    classification: classifier.classify(item.name, item.description)
  }));
  
  // Step 2: Find exact homogen groups
  const groups = groupExactHomogen(classifiedItems);
  
  // Step 3: Find fuzzy homogen candidates
  const fuzzyCandidates = findFuzzyCandidates(groups.singletons);
  
  // Step 4: Build result
  return {
    exactGroups: groups.exactGroups,       // auto-merged
    fuzzyCandidates: fuzzyCandidates,      // perlu konfirmasi user
    uniqueItems: groups.singletons.filter( // truly heterogen
      item => !fuzzyCandidates.some(c => c.includes(item))
    ),
    summary: buildSummary(groups, fuzzyCandidates)
  };
}
```

### Hasil Processing & User Confirmation UI

```
Upload Batch: 5 items dari CSV

┌─────────────────────────────────────────────────────┐
│  📦 Batch Preview                                    │
│                                                      │
│  ✓ Auto-grouped (homogen terdeteksi):                │
│  ┌─────────────────────────────────────────┐         │
│  │ Baut M6 Stainless   ×2 baris → qty: 200 │ [merge]│
│  └─────────────────────────────────────────┘         │
│                                                      │
│  ⚠ Perlu konfirmasi (mirip, beda):                  │
│  ┌─────────────────────────────────────────┐         │
│  │ Baut M8 Stainless                        │        │
│  │ Baut M8 SS Grade A ← sama barang?        │        │
│  │ [Ya, gabung]  [Tidak, pisah]             │        │
│  └─────────────────────────────────────────┘         │
│                                                      │
│  ✓ Unique items (heterogen, siap):                   │
│  • Kabel NYA 2.5mm     → QR-2026-0003               │
│                                                      │
│  [Generate QR untuk semua]  [Review ulang]           │
└─────────────────────────────────────────────────────┘
```

---

## Category Tree

```
Root Categories
├── Mechanical
│   ├── Fastener (baut, mur, ring, paku)
│   ├── Bearing (bearing, laher)
│   ├── Gear & Drive (gear, belt, rantai)
│   ├── Valve & Pipe (valve, pipa, fitting, seal)
│   ├── Hydraulic (cylinder, pump hydraulic)
│   └── Structure (frame, bracket, profile)
│
├── Electrical
│   ├── Cable & Wire (kabel, kawat)
│   ├── Connector (terminal, konektor, plug)
│   ├── Control (relay, contactor, mcb, mccb)
│   ├── Sensor (proximity, limit switch, photoelectric)
│   ├── Motor & Drive (motor, pompa, inverter)
│   └── Lighting (lampu, LED, fluorescent)
│
├── Instrument
│   ├── Measurement (pressure gauge, thermometer)
│   └── Control System (PLC, HMI, panel)
│
├── Consumable
│   ├── Lubricant (oli, grease, pelumas)
│   ├── Paint & Chemical (cat, thinner, chemical)
│   ├── Safety / PPE (sarung tangan, helm, masker)
│   └── Cleaning (majun, tissu, lap)
│
├── Tools
│   ├── Hand Tools (kunci, obeng, tang)
│   └── Power Tools (gerinda, bor, las)
│
└── Uncategorized
    └── (flag: needs_review = true)
```

---

## Confidence Scoring UI

Setiap part yang diklasifikasi otomatis menampilkan badge confidence:

```
┌──────────────────────────────────────────┐
│ Baut M6 Stainless 50pcs                  │
│ Category: Mechanical/Fastener            │
│ Confidence: ████████░░ 85%  [Override ▼] │
│                                          │
│ Candidates:                              │
│  • Mechanical/Fastener  85%             │
│  • Mechanical/Structure 45%             │
│  • Uncategorized        10%             │
└──────────────────────────────────────────┘
```

---

## User Learning (Rule-Based)

Saat user override klasifikasi:

```javascript
// learning.manager.js
async function recordOverride(original, corrected, part) {
  // Simpan ke custom.rules.json
  const customRules = loadCustomRules();
  
  const newRule = {
    keywords: tokenize(part.name).slice(0, 5), // top 5 tokens
    category: corrected,
    confidence: 0.95,
    learnedFrom: {
      originalCategory: original,
      partName: part.name,
      timestamp: Date.now()
    }
  };
  
  customRules.push(newRule);
  saveCustomRules(customRules);
  
  // Classifier reload rules
  await classifier.reloadCustomRules();
}
```

Custom rules memiliki **prioritas lebih tinggi** dari builtin rules.

---

## Edge Cases

### Barang Tidak Dikenal Sama Sekali

```
Input: "Komponen XR-450 type B special"

Tokenize: [komponen, xr-450, type, b, special]
Matches: none > 0.5 threshold

Result:
  category: "Uncategorized"
  confidence: 0.0
  autoAssigned: false
  flag: needs_review

Action:
  - Part masuk DB dengan category "Uncategorized"
  - Badge "⚠ Review" muncul di grid card
  - Admin notification: "X item perlu klasifikasi manual"
```

### Batch dengan Semua Item Identik

```
Input CSV:
  Baut M6, INV-001, PO-001, qty=50
  Baut M6, INV-001, PO-001, qty=50
  Baut M6, INV-001, PO-001, qty=100

Detection: EXACT HOMOGEN
Action: Auto-merge → 1 part, qty = 200
No confirmation needed (confidence = 100%)
```

### Item dengan Satuan Berbeda

```
Input:
  "Kabel NYA 2.5mm — 10 meter"
  "Kabel NYA 2.5mm — 5 meter"
  "Kabel NYA 2.5mm — 1 rol (100m)"

Issue: Sama jenis, tapi satuan berbeda
Resolution:
  - Detect satuan (meter vs rol)
  - Cek: apakah user ingin track per-rol atau per-meter?
  - Dialog: "Kabel NYA 2.5mm ditemukan dengan satuan berbeda. Track sebagai: [per meter] [per rol] [pisah]"
```

### Serial Number Conflict

```
Upload:
  ItemA: SN = BOLT-2026-0001
  ItemB: SN = BOLT-2026-0001  ← KONFLIK!

Resolution:
  - Flag konflik di preview screen
  - Opsi: [Auto-fix SN B → BOLT-2026-0002] [Hapus item B] [Edit manual]
  - Tidak lanjut sampai konflik resolved
```
