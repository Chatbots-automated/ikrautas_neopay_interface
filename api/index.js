/**
 * Payments Console (Vercel single-file function)
 * - GET  -> Serves UI
 * - POST -> { action, ... }
 *    actions:
 *      - "decode": { link }
 *      - "updateAdvance": { singleProjectItemId, amount }
 *      - "sendWebhook": { link, to, subject?, message?, singleProjectItemId?, advanceOverride? }
 *
 * Monday (Single Project):
 *   BOARD_ID: 1645436514
 *   COL_ADV_LINK:    text_mkqxtzec
 *   COL_FINAL_LINK:  text_mkr2wpca
 *   COL_LEAD_ID:     text_mkr4wv8q
 *   COL_ADV_AMOUNT:  numeric_mks5kp0t
 *
 * ENV:
 *   MONDAY_API_TOKEN (required for updateAdvance)
 */

const BOARD_ID = 1645436514;
const COL_ADV_LINK = "text_mkqxtzec";
const COL_FINAL_LINK = "text_mkr2wpca";
const COL_LEAD_ID   = "text_mkr4wv8q";
const COL_ADV_AMOUNT= "numeric_mks5kp0t";

const WEBHOOK_URL = "https://n8n-up8s.onrender.com/webhook-test/77724b7f-99f9-4512-b94f-927d958beb27";
const LOGO_URL = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSRzPxDNBqdxgrLYaD4EfETwe6vp-6Hqe3i0w&s";

// ---------- UI ----------
function htmlPage() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Payments Console</title>
<style>
:root{--bg:#0f172a;--card:#fff;--text:#0f172a;--muted:#64748b;--accent:#0ea5e9;--accent2:#111827;
--ok-bg:#ecfdf5;--ok-bd:#a7f3d0;--ok-tx:#065f46;--err-bg:#fef2f2;--err-bd:#fecaca;--err-tx:#991b1b;--chip:#f1f5f9}
*{box-sizing:border-box}body{margin:0;background:linear-gradient(120deg,#f8fafc,#eef2ff 70%);color:var(--text);
font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,Helvetica,sans-serif}
.wrap{max-width:1100px;margin:40px auto;padding:0 16px}
.brand{display:flex;gap:12px;align-items:center;margin-bottom:14px}
.brand img{height:38px;width:auto;border-radius:8px}
.card{background:var(--card);border-radius:18px;box-shadow:0 12px 40px rgba(2,6,23,.08);padding:20px}
h1{font-size:20px;margin:0 0 4px}
p.small{margin:0;color:var(--muted);font-size:13px}
label{display:block;font-size:13px;margin:12px 0 6px;color:#334155}
input[type="text"],input[type="email"],input[type="number"],textarea{width:100%;padding:11px 12px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;background:#fff}
textarea{min-height:110px;resize:vertical}
.row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.muted{color:var(--muted);font-size:12px}
.btn{background:var(--accent);color:#fff;border:0;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer}
.btn.alt{background:var(--accent2)}
.btn:disabled{opacity:.5;cursor:not-allowed}
.pill{display:inline-block;background:var(--chip);color:var(--text);border-radius:999px;padding:6px 10px;font-family:ui-monospace,Menlo,monospace;font-size:12px}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.full{grid-column:1 / -1}
.field{background:#f8fafc;border:1px solid #eef2f7;border-radius:12px;padding:10px}
.label{color:var(--muted);font-size:12px;margin-bottom:6px}
.value{font-family:ui-monospace,Menlo,monospace;word-break:break-all}
.ok{background:var(--ok-bg);color:var(--ok-tx);border:1px solid var(--ok-bd);padding:10px;border-radius:12px}
.err{background:var(--err-bg);color:var(--err-tx);border:1px solid var(--err-bd);padding:10px;border-radius:12px}
.mt{margin-top:16px}
.section{display:grid;grid-template-columns:1.15fr .85fr;gap:16px}
@media (max-width:920px){.section{grid-template-columns:1fr}}
.bar{display:flex;gap:10px;align-items:center;margin-top:12px}
.chip{background:#e2e8f0;color:#0f172a;border-radius:8px;padding:6px 8px;font-size:12px}
</style>
</head>
<body>
<div class="wrap">
  <div class="brand">
    <img src="${LOGO_URL}" alt="Brand" />
    <div>
      <h1>Payments Console</h1>
      <p class="small">Decode NeoPay links • Fix advance amounts • Resend payment via n8n webhook</p>
    </div>
  </div>

  <div class="card section">
    <div>
      <h2 style="margin:0 0 8px;font-size:18px">1) Decode & Inspect</h2>
      <label>NeoPay URL</label>
      <input type="text" id="link" placeholder="https://psd2.neopay.lt/widget.html?eyJhbGciOi..." />
      <div class="bar">
        <button class="btn" id="btnDecode">Decode</button>
        <span class="muted">Board <span class="pill">1645436514</span></span>
      </div>
      <div id="decodeOut" class="mt"></div>
    </div>

    <div>
      <h2 style="margin:0 0 8px;font-size:18px">2) Fix & Resend</h2>
      <div class="row">
        <div style="flex:1">
          <label>Single Project Item ID</label>
          <input type="text" id="singleProjectItemId" placeholder="e.g. 9459657410" />
        </div>
        <div style="flex:1">
          <label>Override Advance Amount (EUR)</label>
          <input type="number" id="advanceAmount" step="0.01" placeholder="e.g. 345.50" />
        </div>
      </div>
      <div class="row" style="margin-top:10px">
        <button class="btn alt" id="btnUpdateAdv">Update Advance in Monday</button>
        <span class="muted">Writes to column <span class="pill">${COL_ADV_AMOUNT}</span></span>
      </div>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>

      <label>Customer Email</label>
      <input type="email" id="emailTo" placeholder="client@example.com" />
      <label>Subject</label>
      <input type="text" id="emailSubject" value="Mokėjimo nuoroda" />
      <label>Message (HTML ok)</label>
      <textarea id="emailMessage"><p>Sveiki,</p>
<p>Čia yra jūsų mokėjimo nuoroda:</p>
<p><a href="#" id="msgLink">—</a></p>
<p>Jei turite klausimų, parašykite.</p>
</textarea>
      <div class="bar">
        <button class="btn" id="btnSend">Send to n8n webhook</button>
        <span class="muted">POST → ${WEBHOOK_URL}</span>
      </div>
      <div id="actionOut" class="mt"></div>
    </div>
  </div>
</div>

<script>
const el = (id) => document.getElementById(id);
const outDecode = el('decodeOut');
const outAction = el('actionOut');
const linkInput = el('link');
const spIdInput = el('singleProjectItemId');
const advInput = el('advanceAmount');
const toInput = el('emailTo');
const subjInput = el('emailSubject');
const msgInput = el('emailMessage');

function showOK(where, msg){ where.innerHTML = '<div class="ok">
