/**
 * Single-file Vercel Function:
 * - GET  -> serves a minimal HTML UI
 * - POST -> { link, updateMonday?, singleProjectItemId? } -> decodes NeoPay URL and (optionally) updates Monday
 *
 * Required ENV:
 *   MONDAY_API_TOKEN  (Personal API token)
 *
 * Board/Column IDs (Single Project board):
 *   boardId: 1645436514
 *   advance payment link: text_mkqxtzec
 *   final payment link:   text_mkr2wpca
 *   lead id (B2C):        text_mkr4wv8q
 *   API advance amount:   numeric_mks5kp0t
 */

const BOARD_ID = 1645436514;
const COL_ADV_LINK = "text_mkqxtzec";
const COL_FINAL_LINK = "text_mkr2wpca";
const COL_LEAD_ID = "text_mkr4wv8q";
const COL_ADV_AMOUNT = "numeric_mks5kp0t";

function htmlPage() {
  return `<!doctype html>
<html lang="en">
<head> ...styles omitted for brevity... </head>
<body>
  <div class="card">
    <h1>NeoPay Link Inspector</h1>
    <p class="muted">Paste a NeoPay payment URL to decode. Optionally update the Monday “Single Project” item with the link/amount.</p>

    <form method="post" onsubmit="return submitForm(event)">
      <label>NeoPay URL</label>
      <input type="text" id="link" name="link" placeholder="https://psd2.neopay.lt/widget.html?eyJhbGciOi..." required />

      <div class="row" style="margin-top:10px">
        <input type="checkbox" id="updateMonday" name="updateMonday" />
        <label for="updateMonday" style="margin:0">Update Monday (Single Project)</label>
      </div>

      <div id="spidwrap" style="display:none">
        <label>Single Project Item ID</label>
        <input type="text" id="singleProjectItemId" name="singleProjectItemId" placeholder="e.g. 9459657410" />
        <div class="muted">Board: <span class="pill">1645436514</span></div>
      </div>

      <div class="row" style="margin-top:14px">
        <button class="btn" id="submitBtn" type="submit">Decode</button>
      </div>
    </form>

    <div id="out" class="mt"></div>
  </div>

<script>
  const ck = document.getElementById('updateMonday');
  const wrap = document.getElementById('spidwrap');
  ck.addEventListener('change', () => { wrap.style.display = ck.checked ? 'block' : 'none'; });

  async function submitForm(e){
    e.preventDefault();
    const out = document.getElementById('out');
    out.innerHTML = '';
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;

    const link = document.getElementById('link').value.trim();
    const updateMonday = document.getElementById('updateMonday').checked;
    const singleProjectItemId = document.getElementById('singleProjectItemId').value.trim();

    const payload = { link, updateMonday };
    if (updateMonday) payload.singleProjectItemId = singleProjectItemId;

    try{
      const res = await fetch(location.pathname, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Request failed');

      const ex = data.extracted || {};
      out.innerHTML = \`
        \${data.updated ? '<div class="ok">Monday updated for item <b>' + singleProjectItemId + '</b>.</div>' : ''}
        <div class="grid mt">
          <div class="field"><div class="label">Type</div><div class="value">\${ex.type ?? '—'}</div></div>
          <div class="field"><div class="label">Amount</div><div class="value">\${(ex.amount ?? '—')} \${(ex.currency ?? '')}</div></div>
          <div class="field"><div class="label">Transaction ID</div><div class="value">\${ex.transactionId ?? '—'}</div></div>
          <div class="field"><div class="label">Lead ID (internalId)</div><div class="value">\${ex.internalId ?? '—'}</div></div>
          <div class="field"><div class="label">Single Project Item ID</div><div class="value">\${ex.singleProjectItemId ?? '—'}</div></div>
          <div class="field full"><div class="label">Payment purpose</div><div class="value">\${ex.paymentPurpose ?? '—'}</div></div>
        </div>
      \`;
    }catch(err){
      out.innerHTML = '<div class="err>' + (err.message || 'Something went wrong') + '</div>';
    }finally{
      btn.disabled = false;
    }

    return false;
  }
</script>
</body>
</html>`;
}
// ---- helpers ----
function decodeNeoPayUrl(link) {
  try {
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
      internalId: payload.internalId || undefined, // leadId
      singleProjectItemId: payload.singleProjectItemId || undefined,
      paymentPurpose: payload.paymentPurpose || undefined
    };
    return { token, payload, extracted };
  } catch (e) {
    throw new Error(`Failed to decode link: ${e.message}`);
  }
}

async function updateMondaySingleProject(itemId, link, extracted) {
  const token = process.env.MONDAY_API_TOKEN;
  if (!token) throw new Error("MONDAY_API_TOKEN is not set.");

  // Build column values based on payment type
  const colValues = {};

  // Always stamp the lead id if present
  if (extracted.internalId) {
    colValues[COL_LEAD_ID] = extracted.internalId;
  }

  if ((extracted.type || "").toLowerCase() === "advance") {
    colValues[COL_ADV_LINK] = link;
    if (typeof extracted.amount === "number" && !Number.isNaN(extracted.amount)) {
      colValues[COL_ADV_AMOUNT] = extracted.amount;
    }
  } else if ((extracted.type || "").toLowerCase() === "final") {
    colValues[COL_FINAL_LINK] = link;
    // (final amount column is a formula in your board; we don't set it)
  } else {
    // Unknown type — still store the link in advance column as fallback
    colValues[COL_ADV_LINK] = link;
  }

  const mutation = `
    mutation Update($boardId: Int!, $itemId: Int!, $cols: JSON!) {
      change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $cols) {
        id
      }
    }
  `;

  const body = {
    query: mutation,
    variables: {
      boardId: BOARD_ID,
      itemId: Number(itemId),
      cols: JSON.stringify(colValues)
    }
  };

  const resp = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token
    },
    body: JSON.stringify(body)
  });

  const json = await resp.json();
  if (!resp.ok || json.errors) {
    throw new Error(
      "Monday update failed: " + (json.errors?.map(e => e.message).join("; ") || resp.statusText)
    );
  }

  return true;
}

// ---- main handler ----
module.exports = async (req, res) => {
  // CORS for convenience
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
    const { link, updateMonday, singleProjectItemId } = body || {};

    if (!link) throw new Error("Missing 'link'.");

    const { extracted } = decodeNeoPayUrl(link);

    let updated = false;
    if (updateMonday) {
      if (!singleProjectItemId) throw new Error("Missing 'singleProjectItemId' for Monday update.");
      await updateMondaySingleProject(singleProjectItemId, link, extracted);
      updated = true;
    }

    return res.status(200).json({ extracted, updated });
  } catch (e) {
    return res.status(400).json({ error: e.message || "Bad request" });
  }
};
