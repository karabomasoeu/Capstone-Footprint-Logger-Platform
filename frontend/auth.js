

let currentUser = JSON.parse(localStorage.getItem('fp_user') || 'null');
let authMode    = 'login'; 


function saveSession(token, user) {
  localStorage.setItem('fp_token', token);
  localStorage.setItem('fp_user',  JSON.stringify(user));
  currentUser = user;
}

function clearSession() {
  localStorage.removeItem('fp_token');
  localStorage.removeItem('fp_user');
  currentUser = null;
}

function isLoggedIn() {
  return !!localStorage.getItem('fp_token');
}


function showPanel(name) {
  document.querySelectorAll('.panel').forEach((p) => p.classList.add('hidden'));
  document.getElementById(`panel-${name}`).classList.remove('hidden');
}

function setNavActive(tab) {
  document.querySelectorAll('.nav-tab').forEach((t) => t.classList.remove('active'));
  const btn = document.querySelector(`.nav-tab[data-tab="${tab}"]`);
  if (btn) btn.classList.add('active');
}

function updateNavUser() {
  const nameEl  = document.getElementById('user-name');
  const authBtn = document.getElementById('auth-btn');

  if (isLoggedIn() && currentUser) {
    nameEl.textContent  = currentUser.displayName || currentUser.email;
    authBtn.textContent = 'Sign Out';
    authBtn.onclick     = handleSignOut;
  } else {
    nameEl.textContent  = '';
    authBtn.textContent = 'Sign In';
    authBtn.onclick     = () => navigateTo('auth');
  }
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideAuthError() {
  document.getElementById('auth-error').classList.add('hidden');
}


function navigateTo(tab) {
  if (tab !== 'auth' && !isLoggedIn()) {
    navigateTo('auth');
    return;
  }
  showPanel(tab);
  setNavActive(tab);

  if (tab === 'log')       renderLog();
  if (tab === 'dashboard') renderDashboard();
  if (tab === 'insights')  renderInsights();
}


function setAuthMode(mode) {
  authMode = mode;
  const isRegister = mode === 'register';

  document.getElementById('auth-heading').textContent = isRegister ? 'Create account' : 'Welcome back';
  document.getElementById('auth-sub').textContent     = isRegister
    ? 'Join the community and start logging.'
    : 'Sign in to track your carbon footprint.';
  document.getElementById('auth-submit').textContent  = isRegister ? 'Create Account' : 'Sign In';
  document.getElementById('auth-toggle-text').textContent = isRegister ? 'Already have an account?' : 'No account?';
  document.getElementById('auth-toggle').textContent  = isRegister ? 'Sign in' : 'Register here';

  const nameField = document.getElementById('name-field');
  isRegister ? nameField.classList.remove('hidden') : nameField.classList.add('hidden');

  hideAuthError();
}


async function handleAuthSubmit() {
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const name     = document.getElementById('auth-name').value.trim();

  hideAuthError();

  if (!email || !password) {
    showAuthError('Please enter your email and password.');
    return;
  }

  try {
    let result;
    if (authMode === 'register') {
      result = await api.register(email, password, name);
    } else {
      result = await api.login(email, password);
    }

    saveSession(result.token, result.user);
    updateNavUser();
    navigateTo('log');
  } catch (err) {
    showAuthError(err.message);
  }
}


function handleSignOut() {
  clearSession();
  updateNavUser();
  navigateTo('auth');
}


document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-tab').forEach((btn) => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.tab));
  });

  document.getElementById('auth-submit').addEventListener('click', handleAuthSubmit);
  document.getElementById('auth-toggle').addEventListener('click', () => {
    setAuthMode(authMode === 'login' ? 'register' : 'login');
  });

  ['auth-email', 'auth-password', 'auth-name'].forEach((id) => {
    document.getElementById(id).addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAuthSubmit();
    });
  });

  updateNavUser();

  if (isLoggedIn()) {
    navigateTo('log');
  } else {
    navigateTo('auth');
  }
});
