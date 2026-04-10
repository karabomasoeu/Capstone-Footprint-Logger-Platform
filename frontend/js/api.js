function getUsers()   { return JSON.parse(localStorage.getItem('fp_users')  || '{}'); }
function _getLogs()   { return JSON.parse(localStorage.getItem('fp_logs')   || '[]'); }
function saveUsers(u) { localStorage.setItem('fp_users', JSON.stringify(u)); }
function saveLogs(l)  { localStorage.setItem('fp_logs',  JSON.stringify(l)); }
function uid()        { return '_' + Math.random().toString(36).slice(2, 11); }

function currentUserId() {
  const u = JSON.parse(localStorage.getItem('fp_user') || 'null');
  return u ? u.id : null;
}

function wait(ms = 120) { return new Promise(r => setTimeout(r, ms)); }


async function apiRegister(email, password, displayName) {
  await wait();
  if (!email || !password)    throw new Error('Email and password are required.');
  if (password.length < 6)    throw new Error('Password must be at least 6 characters.');
  const users = getUsers();
  if (users[email])           throw new Error('An account with that email already exists.');

  const user = {
    id:          uid(),
    email,
    displayName: displayName || email.split('@')[0],
    weeklyGoal:  { transport: 15, food: 10, energy: 8, other: 3 },
    createdAt:   new Date().toISOString(),
  };
  users[email] = { ...user, _pw: password };
  saveUsers(users);
  return { token: 'local_' + user.id, user };
}

async function apiLogin(email, password) {
  await wait();
  if (!email || !password) throw new Error('Email and password are required.');
  const users  = getUsers();
  const record = users[email];
  if (!record || record._pw !== password) throw new Error('Invalid email or password.');
  const { _pw, ...user } = record;
  return { token: 'local_' + user.id, user };
}


async function apiGetLogs(category = 'all') {
  await wait();
  const userId = currentUserId();
  let logs = _getLogs().filter(l => l.userId === userId);
  if (category !== 'all') logs = logs.filter(l => l.category === category);
  logs.sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt));
  return { logs, total: logs.length };
}

async function apiCreateLog(payload) {
  await wait();
  const userId = currentUserId();
  if (!userId) throw new Error('Not authenticated.');
  const { activityKey, name, category, quantity, unit, emissionFactor } = payload;
  if (!activityKey || !name || !category || !quantity || !unit || !emissionFactor)
    throw new Error('All activity fields are required.');
  if (quantity <= 0) throw new Error('Quantity must be greater than zero.');

  const log = {
    _id:          uid(),
    userId,
    activityKey,
    name,
    category,
    quantity,
    unit,
    emissionFactor,
    co2kg:        Math.round(quantity * emissionFactor * 1000) / 1000,
    loggedAt:     new Date().toISOString(),
  };
  const logs = _getLogs();
  logs.unshift(log);
  saveLogs(logs);
  return log;
}

async function apiDeleteLog(id) {
  await wait();
  const userId = currentUserId();
  const logs   = _getLogs();
  const idx    = logs.findIndex(l => l._id === id && l.userId === userId);
  if (idx === -1) throw new Error('Log entry not found.');
  logs.splice(idx, 1);
  saveLogs(logs);
  return { message: 'Deleted.' };
}


async function apiGetDashboard() {
  await wait();
  const userId = currentUserId();
  const all    = _getLogs().filter(l => l.userId === userId);

  const totalCo2  = all.reduce((s, l) => s + l.co2kg, 0);
  const todayStr  = new Date().toISOString().split('T')[0];
  const todayCo2  = all
    .filter(l => l.loggedAt.startsWith(todayStr))
    .reduce((s, l) => s + l.co2kg, 0);

  const byCategory = {};
  all.forEach(l => {
    if (!byCategory[l.category]) byCategory[l.category] = { co2: 0, count: 0 };
    byCategory[l.category].co2   += l.co2kg;
    byCategory[l.category].count += 1;
  });
  Object.keys(byCategory).forEach(k => {
    byCategory[k].co2 = Math.round(byCategory[k].co2 * 100) / 100;
  });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const dayMap = {};
  all
    .filter(l => new Date(l.loggedAt) >= sevenDaysAgo)
    .forEach(l => {
      const d = l.loggedAt.split('T')[0];
      dayMap[d] = (dayMap[d] || 0) + l.co2kg;
    });

  const dailyTotals = Object.entries(dayMap)
    .map(([_id, co2]) => ({ _id, co2: Math.round(co2 * 100) / 100 }))
    .sort((a, b) => a._id.localeCompare(b._id));

  return {
    totalCo2:   Math.round(totalCo2 * 100) / 100,
    totalLogs:  all.length,
    todayCo2:   Math.round(todayCo2 * 100) / 100,
    byCategory,
    dailyTotals,
    loggedDates: dailyTotals.map(d => d._id),
  };
}


const COMMUNITY_AVG = { transport: 18.4, food: 12.7, energy: 9.3, other: 4.1 };
const WEEKLY_GOAL   = { transport: 15,   food: 10,   energy: 8,   other: 3   };

const TIPS = {
  transport: [
    'Try carpooling or public transit two days per week to significantly cut transport emissions.',
    'Plan trips to combine errands into a single journey.',
    'Consider cycling for trips under 5 km it produces zero emissions.',
  ],
  food: [
    'Try one meat-free day per week, it can reduce food emissions by up to 15%.',
    'Reducing beef consumption has the single largest food-related impact.',
    'Buy local and seasonal produce to minimise transport and storage emissions.',
  ],
  energy: [
    'Switch to LED bulbs throughout your home, they use up to 80% less energy.',
    'Unplug devices on standby as they draw power even when not in use.',
    'Consider a solar water heater to reduce geyser electricity consumption.',
  ],
  other: [
    'Buy second-hand clothing when possible to avoid production emissions.',
    'Compost organic waste instead of sending it to landfill.',
    'Choose products with minimal packaging.',
  ],
};

async function apiGetInsights() {
  await wait();
  const userId     = currentUserId();
  const all        = _getLogs().filter(l => l.userId === userId);

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weekly = all.filter(l => new Date(l.loggedAt) >= oneWeekAgo);

  const weeklyTotals  = {};
  weekly.forEach(l => { weeklyTotals[l.category]  = (weeklyTotals[l.category]  || 0) + l.co2kg; });

  const allTimeTotals = {};
  all.forEach(l    => { allTimeTotals[l.category] = (allTimeTotals[l.category] || 0) + l.co2kg; });

  const goals = Object.entries(WEEKLY_GOAL).map(([cat, goal]) => {
    const current = Math.round((weeklyTotals[cat] || 0) * 100) / 100;
    return {
      category:   cat,
      goal,
      current,
      percentage: Math.min(100, Math.round((current / goal) * 100)),
      onTrack:    current <= goal,
    };
  });

  const tips = Object.entries(allTimeTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, total]) => {
      const catTips   = TIPS[cat] || [];
      const tip       = catTips[Math.floor(Math.random() * catTips.length)] || '';
      const weekTotal = weeklyTotals[cat] || 0;
      const commDay   = COMMUNITY_AVG[cat] || 0;
      const diff      = weekTotal - commDay * 7;
      return {
        category:        cat,
        totalCo2:        Math.round(total     * 100) / 100,
        weekCo2:         Math.round(weekTotal * 100) / 100,
        communityAvgDay: commDay,
        vsCommunitPct:   commDay > 0 ? Math.round((Math.abs(diff) / (commDay * 7)) * 100) : 0,
        aboveCommunity:  diff > 0,
        tip,
      };
    });

  return { goals, tips };
}

async function apiGetCommunity() {
  await wait();
  const userId = currentUserId();
  const all    = _getLogs().filter(l => l.userId === userId);

  const userTotals = {};
  all.forEach(l => { userTotals[l.category] = (userTotals[l.category] || 0) + l.co2kg; });

  const comparison = Object.entries(COMMUNITY_AVG).map(([cat, avg]) => ({
    category:     cat,
    userTotal:    Math.round((userTotals[cat] || 0) * 100) / 100,
    communityAvg: avg,
    difference:   Math.round(((userTotals[cat] || 0) - avg) * 100) / 100,
  }));

  return { comparison, communityAvg: COMMUNITY_AVG };
}


const api = {
  register:     apiRegister,
  login:        apiLogin,
  getLogs:      apiGetLogs,
  createLog:    apiCreateLog,
  deleteLog:    apiDeleteLog,
  getDashboard: apiGetDashboard,
  getInsights:  apiGetInsights,
  getCommunity: apiGetCommunity,
};
