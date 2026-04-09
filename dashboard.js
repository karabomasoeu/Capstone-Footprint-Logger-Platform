

const CAT_COLORS = {
  transport: '#378ADD',
  food:      '#BA7517',
  energy:    '#1D9E75',
  other:     '#888780',
};

let pieChartInst = null;
let barChartInst = null;

async function renderDashboard() {
  try {
    const [dash, community] = await Promise.all([api.getDashboard(), api.getCommunity()]);
    renderDashMetrics(dash);
    renderStreak(dash.loggedDates);
    renderPieChart(dash.byCategory);
    renderBarChart(dash.dailyTotals);
    renderCommunity(dash.byCategory, community);
  } catch (err) {
    console.error('Dashboard error:', err.message);
  }
}


function renderDashMetrics(dash) {
  const commTotal = 44.5; 
  document.getElementById('dash-metrics').innerHTML = `
    <div class="metric-card">
      <div class="metric-label">Total CO2</div>
      <div class="metric-value amber">${dash.totalCo2.toFixed(1)} kg</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Today</div>
      <div class="metric-value">${dash.todayCo2.toFixed(1)} kg</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Activities</div>
      <div class="metric-value green">${dash.totalLogs}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Community avg/day</div>
      <div class="metric-value" style="color:var(--blue)">${commTotal} kg</div>
    </div>
  `;
}

function renderStreak(loggedDates) {
  const days = [];
  const today = new Date();
  const loggedSet = new Set(loggedDates);
  const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  for (let i = 6; i >= 0; i--) {
    const d  = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    days.push({ ds, label: DAY_LABELS[d.getDay()], isToday: i === 0, logged: loggedSet.has(ds) });
  }

  const count = days.filter((d) => d.logged).length;

  document.getElementById('streak-row').innerHTML =
    days.map((d) => {
      const cls = d.isToday ? 'today' : d.logged ? 'logged' : 'missed';
      return `<div class="streak-day ${cls}" title="${d.ds}">${d.label}</div>`;
    }).join('') +
    `<span class="streak-label">${count}/7 days logged</span>`;
}

function renderPieChart(byCategory) {
  const labels = Object.keys(CAT_COLORS);
  const data   = labels.map((l) => (byCategory[l] ? byCategory[l].co2 : 0));
  const colors = labels.map((l) => CAT_COLORS[l]);
  const total  = data.reduce((a, b) => a + b, 0);

  if (pieChartInst) pieChartInst.destroy();

  const ctx = document.getElementById('pie-chart').getContext('2d');

  if (total === 0) {
    ctx.clearRect(0, 0, 300, 220);
    document.getElementById('pie-legend').innerHTML = '<span style="color:var(--text-muted);font-size:12px">No data yet</span>';
    return;
  }

  pieChartInst = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth:     2,
        borderColor:     '#fff',
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => ` ${c.label}: ${c.raw.toFixed(1)} kg CO2`,
          },
        },
      },
    },
  });

  document.getElementById('pie-legend').innerHTML = labels.map((l, i) => {
    const pct = total > 0 ? ((data[i] / total) * 100).toFixed(0) : 0;
    return `<span>
      <span class="legend-dot" style="background:${colors[i]}"></span>
      ${l} ${pct}%
    </span>`;
  }).join('');
}


function renderBarChart(dailyTotals) {
  const today = new Date();
  const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const labels = [];
  const data   = [];

  const dailyMap = {};
  dailyTotals.forEach((d) => { dailyMap[d._id] = d.co2; });

  for (let i = 6; i >= 0; i--) {
    const d  = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    labels.push(DAY_LABELS[d.getDay()]);
    data.push(Math.round((dailyMap[ds] || 0) * 100) / 100);
  }

  if (barChartInst) barChartInst.destroy();

  const ctx = document.getElementById('bar-chart').getContext('2d');
  barChartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label:           'kg CO2',
        data,
        backgroundColor: '#1D9E75',
        borderRadius:    4,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          grid:  { color: 'rgba(0,0,0,0.06)' },
          ticks: { font: { size: 11 } },
        },
        x: {
          grid:  { display: false },
          ticks: { font: { size: 11 }, autoSkip: false },
        },
      },
    },
  });
}


function renderCommunity(byCategory, community) {
  const { comparison } = community;
  const myTotal   = Object.values(byCategory).reduce((s, c) => s + c.co2, 0);
  const commTotal = comparison.reduce((s, c) => s + c.communityAvg, 0);
  const maxVal    = Math.max(myTotal, commTotal, 1);
  const diff      = myTotal - commTotal;
  const diffLabel = diff > 0
    ? `+${diff.toFixed(1)} kg above community average`
    : `${Math.abs(diff).toFixed(1)} kg below community average`;
  const diffColor = diff > 0 ? 'var(--red)' : 'var(--green)';

  document.getElementById('community-compare').innerHTML = `
    <div class="compare-row">
      <span class="compare-label">You</span>
      <div class="compare-bar-wrap">
        <div class="compare-bar" style="width:${((myTotal / maxVal) * 100).toFixed(0)}%;background:${diff > 0 ? '#E24B4A' : '#1D9E75'}"></div>
      </div>
      <span class="compare-val">${myTotal.toFixed(1)} kg</span>
    </div>
    <div class="compare-row">
      <span class="compare-label">Community avg</span>
      <div class="compare-bar-wrap">
        <div class="compare-bar" style="width:${((commTotal / maxVal) * 100).toFixed(0)}%;background:#888780"></div>
      </div>
      <span class="compare-val">${commTotal.toFixed(1)} kg/day</span>
    </div>
    <p class="compare-summary" style="color:${diffColor}">${diffLabel}</p>
  `;
}
