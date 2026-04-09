

let activeFilter = 'all';
let allLogs      = [];

const CAT_ICONS = { transport: '🚗', food: '🍽️', energy: '⚡', other: '♻️' };



function renderLogMetrics(logs) {
  const total   = logs.reduce((s, l) => s + l.co2kg, 0);
  const todayStr = new Date().toISOString().split('T')[0];
  const today   = logs.filter((l) => l.loggedAt.startsWith(todayStr)).reduce((s, l) => s + l.co2kg, 0);
  const catTotals = getCatTotals(logs);
  const topCat  = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];

  document.getElementById('log-metrics').innerHTML = `
    <div class="metric-card">
      <div class="metric-label">Total CO2</div>
      <div class="metric-value amber">${total.toFixed(1)} kg</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Today</div>
      <div class="metric-value">${today.toFixed(1)} kg</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Activities</div>
      <div class="metric-value green">${logs.length}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Top Category</div>
      <div class="metric-value" style="font-size:14px;text-transform:capitalize">
        ${topCat ? CAT_ICONS[topCat[0]] + ' ' + topCat[0] : '—'}
      </div>
    </div>
  `;
}



function renderLogList(logs) {
  const filtered = activeFilter === 'all'
    ? logs
    : logs.filter((l) => l.category === activeFilter);

  const container = document.getElementById('log-list');

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🌱</div>
        No activities logged yet. Start tracking your footprint above.
      </div>`;
    return;
  }

  container.innerHTML = `<div class="log-list">` +
    filtered.map((log) => {
      const date = log.loggedAt ? log.loggedAt.split('T')[0] : '';
      return `
        <div class="log-item">
          <span class="log-badge cat-${log.category}">${log.category}</span>
          <span class="log-name">
            ${log.name}
            <span class="log-sub">${log.quantity} ${log.unit}</span>
          </span>
          <span class="log-date">${date}</span>
          <span class="log-co2">${log.co2kg.toFixed(2)} kg</span>
          <button class="btn-delete" onclick="deleteLog('${log._id}')">✕</button>
        </div>`;
    }).join('') + `</div>`;
}

function updatePreview() {
  const sel    = document.getElementById('activity-select');
  const qty    = parseFloat(document.getElementById('activity-qty').value) || 0;
  const opt    = sel.options[sel.selectedIndex];
  const factor = parseFloat(opt.dataset.factor) || 0;
  const unit   = opt.dataset.unit || '';
  const preview = document.getElementById('co2-preview');

  if (factor && qty > 0) {
    const co2 = (factor * qty).toFixed(3);
    preview.textContent = `${qty} ${unit} × ${factor} kg CO2/${unit} = ${co2} kg CO2`;
    preview.classList.remove('hidden');
  } else {
    preview.classList.add('hidden');
  }
}


async function logActivity() {
  const sel    = document.getElementById('activity-select');
  const qty    = parseFloat(document.getElementById('activity-qty').value);
  const opt    = sel.options[sel.selectedIndex];

  if (!opt.value || !qty || qty <= 0) return;

  const payload = {
    activityKey:    opt.value,
    name:           opt.text.split(' —')[0].trim(),
    category:       opt.dataset.cat,
    quantity:       qty,
    unit:           opt.dataset.unit,
    emissionFactor: parseFloat(opt.dataset.factor),
  };

  try {
    const log = await api.createLog(payload);
    allLogs.unshift(log);
    sel.value = '';
    document.getElementById('activity-qty').value = '';
    document.getElementById('co2-preview').classList.add('hidden');
    renderLogMetrics(allLogs);
    renderLogList(allLogs);
  } catch (err) {
    alert('Failed to save activity: ' + err.message);
  }
}


async function deleteLog(id) {
  try {
    await api.deleteLog(id);
    allLogs = allLogs.filter((l) => l._id !== id);
    renderLogMetrics(allLogs);
    renderLogList(allLogs);
  } catch (err) {
    alert('Failed to delete: ' + err.message);
  }
}


function setFilter(cat, btn) {
  activeFilter = cat;
  document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  renderLogList(allLogs);
}

async function renderLog() {
  try {
    const { logs } = await api.getLogs();
    allLogs = logs;
    renderLogMetrics(allLogs);
    renderLogList(allLogs);
  } catch (err) {
    console.error('Failed to load logs:', err.message);
  }
}



function getCatTotals(logs) {
  const t = { transport: 0, food: 0, energy: 0, other: 0 };
  logs.forEach((l) => { t[l.category] = (t[l.category] || 0) + l.co2kg; });
  return t;
}


document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('activity-select').addEventListener('change', updatePreview);
  document.getElementById('activity-qty').addEventListener('input', updatePreview);
  document.getElementById('log-btn').addEventListener('click', logActivity);

  document.getElementById('filter-row').addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
      setFilter(e.target.dataset.cat, e.target);
    }
  });
});
