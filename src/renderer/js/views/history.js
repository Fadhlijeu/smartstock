/**
 * history.js — Riwayat Transaksi View (M0 placeholder, diimplementasi di M3)
 */

export async function mount(container) {
  container.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Riwayat Transaksi</h2>
      <div style="display:flex;gap:var(--space-2)">
        <button class="btn btn--secondary btn--sm">
          <span class="icon icon--sm">filter_list</span> Filter
        </button>
        <button class="btn btn--secondary btn--sm">
          <span class="icon icon--sm">download</span> Export
        </button>
      </div>
    </div>

    <!-- Filter bar -->
    <div style="display:flex;gap:var(--space-3);margin-bottom:var(--space-4);flex-wrap:wrap">
      <div class="toggle">
        <button class="toggle__option active">Semua</button>
        <button class="toggle__option">▲ IN</button>
        <button class="toggle__option">▼ OUT</button>
      </div>
      <input type="date" class="form-input" style="width:auto" title="Dari tanggal">
      <input type="date" class="form-input" style="width:auto" title="Sampai tanggal">
    </div>

    <!-- Table placeholder -->
    <div style="background:var(--color-paper-1);border:1px solid var(--color-paper-border);border-radius:var(--radius-lg);overflow:hidden">
      <table class="data-table">
        <thead>
          <tr>
            <th>Waktu</th>
            <th>Barang</th>
            <th>Arah</th>
            <th>Qty</th>
            <th>Stok Sebelum</th>
            <th>Stok Sesudah</th>
            <th>Metode</th>
            <th>Operator</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="8">
              <div class="empty-state" style="padding:var(--space-10)">
                <span class="icon icon--xl">receipt_long</span>
                <h3>Belum ada transaksi</h3>
                <p>Riwayat transaksi akan muncul di sini setelah scanner aktif di <strong>Milestone 3</strong>.</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}
