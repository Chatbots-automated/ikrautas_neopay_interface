/**
 * Payments Console (Vercel single-file function)
 * - GET  -> Serves UI
 * - POST -> { action, ... }
 *    actions:
 *      - "decode": { link }
 *      - "updateAdvance": { singleProjectItemId, amount }
 *      - "sendWebhook": { link, singleProjectItemId, advanceOverride? }
 *
 * Monday (Single Project):
 *   BOARD_ID: 1645436514
 *   COL_ADV_LINK:    text_mkqxtzec
 *   COL_FINAL_LINK:  text_mkr2wpca
 *   COL_LEAD_ID:     text_mkr4wv8q
 *   COL_ADV_AMOUNT:  numeric_mks5kp0t
 *
 * ENV:
 *   MONDAY_API_TOKEN (required for Monday actions)
 */

const BOARD_ID = 1645436514;
const COL_ADV_LINK = "text_mkqxtzec";
const COL_FINAL_LINK = "text_mkr2wpca";
const COL_LEAD_ID   = "text_mkr4wv8q";
const COL_ADV_AMOUNT= "numeric_mks5kp0t";

const WEBHOOK_URL = "https://n8n-up8s.onrender.com/webhook/77724b7f-99f9-4512-b94f-927d958beb27";
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
input[type="text"],input[type="number"]{width:100%;padding:11px 12px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;background:#fff}
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
      <p class="small">Decode NeoPay links • Fix advance amounts • Resend via n8n webhook</p>
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

// keep the last decoded payload for fallback
let lastExtracted = null;

function showOK(where, msg){ where.innerHTML = '<div class="ok">'+msg+'</div>'; }
function showERR(where, msg){ where.innerHTML = '<div class="err">'+(msg||'Error')+'</div>'; }

async function call(action, payload){
  const res = await fetch(location.pathname, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ action, ...payload })
  });
  const data = await res.json().catch(()=> ({}));
  if(!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

el('btnDecode').addEventListener('click', async () => {
  outDecode.innerHTML = '';
  outAction.innerHTML = '';
  try{
    const link = linkInput.value.trim();
    if(!link) throw new Error('Please paste a NeoPay link.');
    const data = await call('decode', { link });

    const ex = data.extracted || {};
    lastExtracted = ex;

    // Auto-fill Single Project Item ID if present
    if (ex.singleProjectItemId) {
      spIdInput.value = ex.singleProjectItemId;
    }

    outDecode.innerHTML = \`
      <div class="grid mt">
        <div class="field"><div class="label">Type</div><div class="value">\${ex.type ?? '—'}</div></div>
        <div class="field"><div class="label">Amount</div><div class="value">\${(ex.amount ?? '—')} \${(ex.currency ?? '')}</div></div>
        <div class="field"><div class="label">Transaction ID</div><div class="value">\${ex.transactionId ?? '—'}</div></div>
        <div class="field"><div class="label">Lead ID (internalId)</div><div class="value">\${ex.internalId ?? '—'}</div></div>
        <div class="field"><div class="label">Single Project Item ID</div><div class="value">\${ex.singleProjectItemId ?? '—'}</div></div>
        <div class="field full"><div class="label">Payment purpose</div><div class="value">\${ex.paymentPurpose ?? '—'}</div></div>
      </div>
      <div class="chip mt">Decoded OK</div>
    \`;
  }catch(e){
    showERR(outDecode, e.message);
  }
});

el('btnUpdateAdv').addEventListener('click', async () => {
  outAction.innerHTML = '';
  try{
    // prefer manual input; else use last decoded
    const itemId = spIdInput.value.trim() || (lastExtracted && lastExtracted.singleProjectItemId) || '';
    if(!itemId) throw new Error('Single Project Item ID is missing (decode a link first or enter it).');

    const amtRaw = advInput.value.trim();
    if(!amtRaw) throw new Error('Provide advance amount.');
    const amount = Math.round(parseFloat(amtRaw)*100)/100;
    if(Number.isNaN(amount)) throw new Error('Advance amount is not a number.');

    await call('updateAdvance', { singleProjectItemId: itemId, amount });
    showOK(outAction, 'Advance amount updated in Monday.');
  }catch(e){
    showERR(outAction, e.message);
  }
});

el('btnSend').addEventListener('click', async () => {
  outAction.innerHTML = '';
  try{
    const link = linkInput.value.trim();
    if(!link) throw new Error('Paste the NeoPay link and click Decode first.');

    // prefer manual input; else use last decoded
    const itemId = spIdInput.value.trim() || (lastExtracted && lastExtracted.singleProjectItemId) || '';
    if(!itemId) throw new Error('Single Project Item ID is missing (decode a link first or enter it).');

    const override = advInput.value.trim();
    const advanceOverride = override ? Math.round(parseFloat(override)*100)/100 : null;

    await call('sendWebhook', { link, singleProjectItemId: itemId, advanceOverride });
    showOK(outAction, 'Sent to n8n webhook.');
  }catch(e){
    showERR(outAction, e.message);
  }
});
</script>
</body>
</html>`;
}

// ---------- helpers ----------
function decodeNeoPayUrl(link) {
  const qIndex = link.indexOf("?");
  if (qIndex === -1) throw new Error("URL does not contain a token query part.");
  const token = link.slice(qIndex + 1).trim();
  if (!token || token.split(".").length < 3) throw new Error("Token not found or invalid JWT format.");
  const [, payloadB64] = token.split(".");
  const payloadJson = Buffer.from(payloadB64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  const payload = JSON.parse(payloadJson);
  const extracted = {
    type: payload.type || undefined,
    amount: payload.amount ? Number(payload.amount) : undefined,
    currency: payload.currency || undefined,
    transactionId: payload.transactionId || undefined,
    internalId: payload.internalId || undefined,
    singleProjectItemId: payload.singleProjectItemId || undefined,
    paymentPurpose: payload.paymentPurpose || undefined
  };
  return { token, payload, extracted };
}

async function mondayGraphQL(query, variables) {
  const token = process.env.MONDAY_API_TOKEN;
  if (!token) throw new Error("MONDAY_API_TOKEN is not set.");
  const resp = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ query, variables })
  });
  const json = await resp.json();
  if (!resp.ok || json.errors) {
    throw new Error("Monday API error: " + (json.errors?.map(e => e.message).join("; ") || resp.statusText));
  }
  return json.data;
}

// Use ID! (strings) for board_id and item_id
async function mondayUpdateCols(itemId, values) {
  const mutation = `
    mutation Update($boardId: ID!, $itemId: ID!, $cols: JSON!) {
      change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $cols) { id }
    }
  `;
  await mondayGraphQL(mutation, {
    boardId: String(BOARD_ID),
    itemId: String(itemId),
    cols: JSON.stringify(values)
  });
}

async function updateAdvanceAmountOnly(itemId, amount) {
  const rounded = Math.round(Number(amount) * 100) / 100;
  if (Number.isNaN(rounded)) throw new Error("Invalid amount.");
  // numeric column accepts a number; send it as number in the JSON string
  await mondayUpdateCols(itemId, { [COL_ADV_AMOUNT]: rounded });
  return true;
}

// ---------- handler ----------
module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(htmlPage());
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString("utf8");
    const body = raw ? JSON.parse(raw) : {};
    const { action } = body || {};
    if (!action) throw new Error("Missing 'action'.");

    if (action === "decode") {
      const { link } = body;
      if (!link) throw new Error("Missing 'link'.");
      const { extracted } = decodeNeoPayUrl(link);
      return res.status(200).json({ extracted });
    }

    if (action === "updateAdvance") {
      const { singleProjectItemId, amount } = body;
      if (!singleProjectItemId) throw new Error("Missing 'singleProjectItemId'.");
      if (typeof amount === "undefined") throw new Error("Missing 'amount'.");
      await updateAdvanceAmountOnly(singleProjectItemId, amount);
      return res.status(200).json({ updated: true });
    }

    if (action === "sendWebhook") {
      let { link, singleProjectItemId, advanceOverride } = body;
      if (!link) throw new Error("Missing 'link'.");

      // Derive item ID from the link if the client forgot to pass it
      if (!singleProjectItemId) {
        try {
          const { payload } = decodeNeoPayUrl(link);
          if (payload.singleProjectItemId) {
            singleProjectItemId = String(payload.singleProjectItemId);
          }
        } catch {}
      }
      if (!singleProjectItemId) throw new Error("Missing 'singleProjectItemId'.");

      const { payload, extracted } = decodeNeoPayUrl(link);

      const webhookPayload = {
        event: "resend_payment_link",
        sentAt: new Date().toISOString(),
        link,
        extracted,
        rawPayload: payload,
        overrides: {
          advanceAmount: (typeof advanceOverride === "number" && !Number.isNaN(advanceOverride))
            ? Math.round(advanceOverride * 100) / 100
            : null
        },
        monday: {
          boardId: BOARD_ID,
          singleProjectItemId: singleProjectItemId,
          columns: {
            leadId: COL_LEAD_ID,
            advanceLink: COL_ADV_LINK,
            finalLink: COL_FINAL_LINK,
            advanceAmount: COL_ADV_AMOUNT
          }
        },
        meta: {
          uiVersion: "1.3.0",
          source: "vercel-payments-console"
        }
      };

      const resp = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload)
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error("n8n webhook error: " + resp.status + " " + txt);
      }

      return res.status(200).json({ sent: true });
    }

    return res.status(400).json({ error: "Unknown action." });
  } catch (e) {
    return res.status(400).json({ error: e.message || "Bad request" });
  }
};
