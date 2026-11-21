/**
 * RevAudit Chrome Extension - Popup Controller & GitHub Auth Engine
 * Manifest V3 compatible, zero external dependencies.
 */

// DOM Elements - Auth
const authStatusBar = document.getElementById('auth-status-bar');
const authAvatarContainer = document.getElementById('auth-avatar-container');
const userAvatar = document.getElementById('user-avatar');
const defaultGhIcon = document.querySelector('.default-gh-icon');
const authUsername = document.getElementById('auth-username');
const rateLimitBadge = document.getElementById('rate-limit-badge');
const rateLimitDetail = document.getElementById('rate-limit-detail');
const authActionBtn = document.getElementById('auth-action-btn');
const authModalBtn = document.getElementById('auth-modal-btn');
const headerAuthLabel = document.getElementById('header-auth-label');

const authDrawer = document.getElementById('auth-drawer');
const closeAuthDrawer = document.getElementById('close-auth-drawer');
const tokenInput = document.getElementById('token-input');
const verifyTokenBtn = document.getElementById('verify-token-btn');
const oauthLoginBtn = document.getElementById('oauth-login-btn');
const authFeedback = document.getElementById('auth-feedback');


// DOM Elements - Repo & Actions
const ownerInput = document.getElementById('owner-input');
const repoInput = document.getElementById('repo-input');
const auditBtn = document.getElementById('audit-btn');
const detectTabBtn = document.getElementById('detect-tab-btn');
const retryBtn = document.getElementById('retry-btn');

// State Views
const idleState = document.getElementById('idle-state');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const resultsState = document.getElementById('results-state');

const loadingTitle = document.getElementById('loading-title');
const loadingSubtitle = document.getElementById('loading-subtitle');
const errorMessage = document.getElementById('error-message');

// Results elements
const statTotal = document.getElementById('stat-total');
const statMerged = document.getElementById('stat-merged');
const statMedian = document.getElementById('stat-median');
const statAnomalies = document.getElementById('stat-anomalies');
const cohortList = document.getElementById('cohort-list');
const anomaliesList = document.getElementById('anomalies-list');
const anomaliesCountBadge = document.getElementById('anomalies-count-badge');
const resultsMeta = document.getElementById('results-meta');
const workloadBody = document.getElementById('workload-body');
const workloadBadge = document.getElementById('workload-badge');
const warningsBox = document.getElementById('warnings-box');
const apiBaseInput = document.getElementById('api-base-input');
const saveApiBaseBtn = document.getElementById('save-api-base-btn');

// Active Auth State in Memory
let currentAuth = null;

function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response) {
        reject(new Error('No response from the extension background.'));
        return;
      }
      if (!response.ok) {
        reject(new Error(response.error || 'Extension action failed.'));
        return;
      }
      resolve(response);
    });
  });
}

// ==========================================
// View State Management
// ==========================================
function setViewState(viewName) {
  idleState.classList.add('hidden');
  loadingState.classList.add('hidden');
  errorState.classList.add('hidden');
  resultsState.classList.add('hidden');

  if (viewName === 'idle') idleState.classList.remove('hidden');
  else if (viewName === 'loading') loadingState.classList.remove('hidden');
  else if (viewName === 'error') errorState.classList.remove('hidden');
  else if (viewName === 'results') resultsState.classList.remove('hidden');
}

// ==========================================
// GitHub Authentication & Rate Limit Logic
// ==========================================

// Fetch live rate limit stats from GitHub API
async function fetchRateLimit(token = null) {
  const headers = { 'Accept': 'application/vnd.github.v3+json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch('https://api.github.com/rate_limit', { headers });
    if (res.ok) {
      const data = await res.json();
      const core = data.resources.core;
      return {
        limit: core.limit,
        remaining: core.remaining,
        reset: core.reset
      };
    }
  } catch (err) {
    console.warn('Could not fetch rate limit:', err);
  }
  return null;
}

// Verify a GitHub token by fetching user profile
async function verifyGitHubToken(token) {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `Bearer ${token}`
    }
  });

  if (res.status === 401) {
    throw new Error('Invalid or expired GitHub token.');
  }
  if (!res.ok) {
    throw new Error(`GitHub returned error: HTTP ${res.status}`);
  }

  const user = await res.json();
  const rateLimit = await fetchRateLimit(token);

  return {
    token,
    username: user.login,
    avatar_url: user.avatar_url,
    name: user.name || user.login,
    rate_limit: rateLimit
  };
}

// Format reset time into minutes
function formatResetTime(resetEpoch) {
  if (!resetEpoch) return '';
  const nowSeconds = Math.floor(Date.now() / 1000);
  const diffMinutes = Math.max(1, Math.round((resetEpoch - nowSeconds) / 60));
  return `resets in ${diffMinutes}m`;
}

// Update DOM elements reflecting Auth status
function updateAuthUI(auth) {
  currentAuth = auth;

  if (auth && auth.token) {
    // Authenticated state
    authStatusBar.className = 'auth-bar authenticated';
    authUsername.textContent = `@${auth.username}`;
    headerAuthLabel.textContent = `@${auth.username}`;

    if (auth.avatar_url) {
      userAvatar.src = auth.avatar_url;
      userAvatar.classList.remove('hidden');
      if (defaultGhIcon) defaultGhIcon.classList.add('hidden');
    }

    rateLimitBadge.className = 'badge-rate-limit high';
    const limit = (auth.rate_limit && auth.rate_limit.limit) ? auth.rate_limit.limit : 5000;
    const remaining = (auth.rate_limit && auth.rate_limit.remaining !== undefined) ? auth.rate_limit.remaining : 5000;
    rateLimitBadge.textContent = `${limit.toLocaleString()} req/hr`;

    const resetStr = (auth.rate_limit && auth.rate_limit.reset) ? ` • ${formatResetTime(auth.rate_limit.reset)}` : '';
    rateLimitDetail.textContent = `🟢 Remaining: ${remaining.toLocaleString()} / ${limit.toLocaleString()} API calls${resetStr}`;

    authActionBtn.textContent = 'Disconnect';
    authActionBtn.className = 'auth-pill-btn disconnect';
  } else {
    // Unauthenticated state
    authStatusBar.className = 'auth-bar unauthenticated';
    authUsername.textContent = 'Public mode';
    headerAuthLabel.textContent = 'Sign in';

    userAvatar.classList.add('hidden');
    if (defaultGhIcon) defaultGhIcon.classList.remove('hidden');

    rateLimitBadge.className = 'badge-rate-limit low';
    rateLimitBadge.textContent = '60 req/hr';
    rateLimitDetail.textContent = 'Public repos only • Sign in for private repos & 5,000/hr';

    authActionBtn.textContent = 'Sign in';
    authActionBtn.className = 'auth-pill-btn';
  }
}

// ==========================================
// Browser Tab Detection
// ==========================================
async function detectCurrentGitHubTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return false;

    // Matches github.com/:owner/:repo
    const match = tab.url.match(/^https?:\/\/github\.com\/([a-zA-Z0-9_\-\.]+)\/([a-zA-Z0-9_\-\.]+)/);
    if (match) {
      const owner = match[1];
      const repo = match[2].replace(/\.git$/, '');
      ownerInput.value = owner;
      repoInput.value = repo;
      return true;
    }
  } catch (err) {
    console.warn('Tab detection error:', err);
  }
  return false;
}

// ==========================================
// Statistical Calculations
// ==========================================
function calculateMedian(values) {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function formatHours(hours) {
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return `${mins}m`;
  }
  if (hours > 72) {
    const days = (hours / 24).toFixed(1);
    return `${days}d (${hours.toFixed(0)}h)`;
  }
  return `${hours.toFixed(1)}h`;
}

// ==========================================
// Main Pull Request Audit Workflow
// ==========================================
async function getApiBase() {
  const stored = await chrome.storage.local.get('api_base_url');
  const value =
    stored.api_base_url ||
    (globalThis.REVAUDIT_CONFIG && globalThis.REVAUDIT_CONFIG.API_BASE_URL) ||
    'https://revaudit-backend.onrender.com';
  return String(value).replace(/\/$/, '');
}

async function performAudit(owner, repo) {
  setViewState('loading');
  loadingTitle.textContent = `Auditing ${owner}/${repo}...`;
  loadingSubtitle.textContent = 'Requesting censoring-aware analysis from the RevAudit API...';

  const apiBase = await getApiBase();
  const token = currentAuth && currentAuth.token ? currentAuth.token : null;
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `${apiBase}/api/audit?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&limit=50`;
  const slowTimer = setTimeout(() => {
    loadingSubtitle.textContent =
      'Waking up the analysis API… free-tier backends can take up to 60 seconds.';
  }, 4000);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  let data;
  try {
    const response = await fetch(url, { headers, signal: controller.signal, cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Repository "${owner}/${repo}" was not found. If it is private, sign in with GitHub first.`);
      }
      if (response.status === 429) {
        throw new Error(payload.detail || 'GitHub rate limit reached. Sign in for 5,000 req/hr or retry later.');
      }
      if (response.status === 403) {
        throw new Error(payload.detail || 'Access denied. Sign in with a token that can read this repository.');
      }
      if (response.status === 401) {
        throw new Error(
          payload.detail ||
            'The analysis API could not authenticate with GitHub. The backend token may be invalid; sign in or contact the operator.',
        );
      }
      throw new Error(payload.detail || `RevAudit API failed (HTTP ${response.status}).`);
    }
    data = payload;
  } catch (err) {
    setViewState('error');
    errorMessage.textContent =
      err.name === 'AbortError'
        ? 'The analysis API timed out. It may be cold-starting; try again.'
        : err.message || 'Network error connecting to the RevAudit API. Check the API base in the auth drawer.';
    return;
  } finally {
    clearTimeout(slowTimer);
    clearTimeout(timeout);
  }

  renderResults(data);
  chrome.storage.local.set({ last_repo: { owner, repo } });
}

// Render Results View
function renderResults(data) {
  const metadata = data.metadata || {};
  const isV2 =
    metadata.analysis_version === '2.0.0' ||
    data.first_review_observed_count !== undefined ||
    data.workload_engine !== undefined;

  const total = data.total_prs_in_sample ?? data.total_closed_prs ?? (Array.isArray(data.pull_requests) ? data.pull_requests.length : 0);
  const merged = data.merged_prs_count ?? 0;
  let overallMedian = data.observed_median_first_review_hours;
  if (overallMedian == null && Array.isArray(data.pull_requests)) {
    const values = data.pull_requests
      .map((pr) => pr.first_review_latency_hours)
      .filter((value) => value != null);
    if (values.length) overallMedian = calculateMedian(values);
  }
  const anomalies = data.anomalies || [];

  statTotal.textContent = total;
  statMerged.textContent = merged;
  statMedian.textContent = overallMedian == null ? '—' : formatHours(overallMedian);
  statAnomalies.textContent = data.anomalies_count ?? anomalies.length;

  const authLabel = currentAuth && currentAuth.token
    ? 'user token'
    : metadata.github_authenticated === true
      ? 'server token'
      : metadata.github_authenticated === false
        ? 'unauthenticated'
        : 'legacy response';
  const versionLabel = metadata.analysis_version ? `analysis v${metadata.analysis_version}` : 'legacy API';
  const sampleLabel = metadata.sample_limit_applied ? ` · sample ${metadata.sample_limit_applied}` : '';
  resultsMeta.textContent = `${versionLabel} · ${authLabel}${sampleLabel}`;

  const cohorts = isV2 ? ['Small', 'Medium', 'Large', 'Unknown'] : ['Small', 'Medium', 'Large'];
  cohortList.innerHTML = '';
  cohorts.forEach((cat) => {
    const info = (data.baseline_medians && data.baseline_medians[cat]) || {};
    const sample = info.sample_size || 0;
    const tagClass = cat.toLowerCase();
    const observed = info.event_count != null ? ` · ${info.event_count} observed` : '';
    const countText = `${sample === 1 ? '1 PR' : `${sample} PRs`}${observed}`;
    const medianAvailable = sample > 0 && info.median_hours != null;
    const medianText =
      sample === 0
        ? 'No data'
        : medianAvailable
          ? formatHours(info.median_hours)
          : info.estimate_status === 'median_not_reached'
            ? 'Median not reached'
            : 'No data';
    const interval = info.confidence_interval_95 || info.mock_ci_90;
    const intervalLabel = info.confidence_interval_95 ? '95% CI' : '90% CI';
    const ciText =
      Array.isArray(interval) && interval.length === 2 && sample > 0
        ? `${intervalLabel}: ${formatHours(interval[0])} – ${formatHours(interval[1])}`
        : sample > 0
          ? 'CI unavailable'
          : '–';

    const row = document.createElement('div');
    row.className = 'cohort-row';
    row.innerHTML = `
      <div class="cohort-info">
        <span class="cohort-tag ${tagClass}">${escapeHtml(cat)}</span>
        <span class="cohort-count">${escapeHtml(countText)}</span>
      </div>
      <div class="cohort-stats">
        <span class="cohort-median ${medianAvailable ? '' : 'muted'}">${escapeHtml(medianText)}</span>
        <span class="cohort-ci">${escapeHtml(ciText)}</span>
      </div>
    `;
    cohortList.appendChild(row);
  });

  anomaliesList.innerHTML = '';
  anomaliesCountBadge.textContent = `${data.anomalies_count ?? anomalies.length} flagged`;

  if (anomalies.length === 0) {
    const emptyNotice = document.createElement('div');
    emptyNotice.className = 'no-anomalies';
    emptyNotice.textContent = '✓ No adjusted triage signals detected in this sample.';
    anomaliesList.appendChild(emptyNotice);
  } else {
    anomalies.slice(0, 10).forEach((item) => {
      const latency = item.review_time_hours ?? item.first_review_latency_hours ?? item.reviewTimeHours;
      const cohortInfo = (data.baseline_medians && data.baseline_medians[item.size_category]) || {};
      const baseline = item.group_median_hours ?? item.baseline_median ?? cohortInfo.median_hours ?? 0;
      const expected = item.expected_first_review_hours;
      const z = item.standardized_residual;
      const parsedRatio =
        item.anomaly_ratio ??
        (baseline ? Number(latency) / Number(baseline) : parseFloat(item.ratio));
      const ratioText = Number.isFinite(parsedRatio) ? `${parsedRatio.toFixed(1)}× baseline` : '—';
      const metaParts = [`by @${item.author || 'unknown'}`, `${item.size_category || 'Unknown'} PR`];
      if (expected != null) metaParts.push(`expected ${formatHours(expected)}`);
      else if (baseline) metaParts.push(`baseline ${formatHours(baseline)}`);
      if (z != null) metaParts.push(`z ${Number(z).toFixed(2)}`);

      const link = document.createElement('a');
      link.className = 'anomaly-item';
      link.href = /^https?:\/\//.test(item.html_url || '') ? item.html_url : '#';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      link.innerHTML = `
        <div class="anomaly-main">
          <div class="anomaly-pr-title">#${escapeHtml(item.pr_number || item.number || '')} ${escapeHtml(item.title || '')}</div>
          <div class="anomaly-meta">${escapeHtml(metaParts.join(' • '))}</div>
        </div>
        <div class="anomaly-stats">
          <span class="anomaly-duration">${escapeHtml(formatHours(latency))}</span>
          <span class="anomaly-ratio">${escapeHtml(ratioText)}</span>
        </div>
      `;
      anomaliesList.appendChild(link);
    });
  }

  const workload = data.workload_summary || {};
  const workloadEngine = data.workload_engine || {};
  workloadBody.replaceChildren();

  const addWorkloadItem = (label, value) => {
    const item = document.createElement('div');
    item.className = 'workload-item';
    const key = document.createElement('span');
    key.textContent = label;
    const val = document.createElement('strong');
    val.textContent = value;
    item.append(key, val);
    workloadBody.appendChild(item);
  };

  if (Object.keys(workload).length || Object.keys(workloadEngine).length) {
    addWorkloadItem('Avg queue', workload.average_concurrent_prs == null ? '—' : Number(workload.average_concurrent_prs).toFixed(1));
    addWorkloadItem('Max queue', String(workload.max_concurrent_prs ?? '—'));
    addWorkloadItem(
      'Correlation',
      workload.correlation_with_first_review_hours == null
        ? '—'
        : Number(workload.correlation_with_first_review_hours).toFixed(2),
    );
    addWorkloadItem('Workload flags', String(workloadEngine.flagged_count ?? '—'));
    addWorkloadItem(
      'Request coverage',
      workloadEngine.request_coverage_pct == null ? '—' : `${Number(workloadEngine.request_coverage_pct).toFixed(1)}%`,
    );
    addWorkloadItem('Review events', String(workload.review_event_count ?? '—'));
    const note = document.createElement('div');
    note.className = 'workload-note';
    note.textContent =
      workloadEngine.limitation ||
      workload.definition ||
      'Workload is an inferred queue proxy, not a complete assignment history.';
    workloadBody.appendChild(note);
    workloadBadge.textContent = workloadEngine.flagged_count != null
      ? `${workloadEngine.flagged_count} flagged`
      : 'snapshot';
  } else {
    const note = document.createElement('div');
    note.className = 'workload-note';
    note.textContent = 'Workload summary is not available in this API response.';
    workloadBody.appendChild(note);
    workloadBadge.textContent = '—';
  }

  const warnings = [...(data.data_quality && data.data_quality.warnings ? data.data_quality.warnings : [])];
  if (metadata.partial && metadata.partial_reason) warnings.unshift(`Partial audit: ${metadata.partial_reason}`);
  if (metadata.sample_limit_note) warnings.push(metadata.sample_limit_note);
  warningsBox.hidden = warnings.length === 0;
  warningsBox.replaceChildren();
  if (warnings.length) {
    const details = document.createElement('details');
    details.className = 'warnings-details';
    const summary = document.createElement('summary');
    summary.textContent = `Data quality warnings (${warnings.length})`;
    const list = document.createElement('ul');
    warnings.slice(0, 4).forEach((warning) => {
      const li = document.createElement('li');
      li.textContent = warning;
      list.appendChild(li);
    });
    details.append(summary, list);
    warningsBox.appendChild(details);
  }

  setViewState('results');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function handleAuditSubmit() {
  const owner = ownerInput.value.trim();
  const repo = repoInput.value.trim();

  if (!owner || !repo) {
    alert('Please enter both owner and repository name.');
    return;
  }

  await performAudit(owner, repo);
}

// ==========================================
// Initialization & Event Listeners
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Load saved Auth state
  const stored = await chrome.storage.local.get(['gh_auth', 'last_repo', 'gh_client_id']);
  if (stored.gh_auth) {
    updateAuthUI(stored.gh_auth);
    // Refresh rate limits in background
    fetchRateLimit(stored.gh_auth.token).then(updated => {
      if (updated) {
        stored.gh_auth.rate_limit = updated;
        chrome.storage.local.set({ gh_auth: stored.gh_auth });
        updateAuthUI(stored.gh_auth);
      }
    });
  } else {
    // Check guest unauthenticated rate limit
    fetchRateLimit().then(guestLimit => {
      if (guestLimit) {
        rateLimitDetail.textContent = `Public mode • ${guestLimit.remaining}/${guestLimit.limit} calls left (${formatResetTime(guestLimit.reset)})`;
      }
    });
  }

  const storedApi = await chrome.storage.local.get('api_base_url');
  apiBaseInput.value =
    storedApi.api_base_url ||
    (globalThis.REVAUDIT_CONFIG && globalThis.REVAUDIT_CONFIG.API_BASE_URL) ||
    'https://revaudit-backend.onrender.com';

  // 2. Tab Detection
  const detected = await detectCurrentGitHubTab();
  if (!detected && stored.last_repo) {
    ownerInput.value = stored.last_repo.owner || '';
    repoInput.value = stored.last_repo.repo || '';
  }

  // 3. Auth UI Events
  authActionBtn.addEventListener('click', async () => {
    if (currentAuth && currentAuth.token) {
      // Disconnect
      await chrome.storage.local.remove(['gh_auth']);
      sendMessage({ type: 'CANCEL_DEVICE_FLOW' }).catch(() => null);
      tokenInput.value = '';
      updateAuthUI(null);
    } else {
      authDrawer.classList.toggle('hidden');
    }
  });

  authModalBtn.addEventListener('click', () => {
    authDrawer.classList.toggle('hidden');
  });

  closeAuthDrawer.addEventListener('click', () => {
    authDrawer.classList.add('hidden');
  });

  saveApiBaseBtn.addEventListener('click', async () => {
    const value = apiBaseInput.value.trim();
    if (!/^https?:\/\//i.test(value)) {
      authFeedback.className = 'auth-feedback error';
      authFeedback.textContent = 'The API URL must start with http:// or https://.';
      return;
    }
    const normalised = value.replace(/\/$/, '');
    await chrome.storage.local.set({ api_base_url: normalised });
    apiBaseInput.value = normalised;
    authFeedback.className = 'auth-feedback success';
    authFeedback.textContent = 'Analysis API saved.';
    setTimeout(() => { authFeedback.textContent = ''; }, 1200);
  });

  // 4. Token Verification (Method 1)
  verifyTokenBtn.addEventListener('click', async () => {
    const rawToken = tokenInput.value.trim();
    if (!rawToken) {
      authFeedback.className = 'auth-feedback error';
      authFeedback.textContent = 'Please enter a GitHub personal access token.';
      return;
    }

    verifyTokenBtn.textContent = 'Verifying...';
    authFeedback.className = 'auth-feedback';
    authFeedback.textContent = '';

    try {
      const authData = await verifyGitHubToken(rawToken);
      await chrome.storage.local.set({ gh_auth: authData });
      sendMessage({ type: 'CANCEL_DEVICE_FLOW' }).catch(() => null);
      updateAuthUI(authData);

      authFeedback.className = 'auth-feedback success';
      authFeedback.textContent = `Connected as @${authData.username}! Limit: 5,000 req/hr.`;

      setTimeout(() => {
        authDrawer.classList.add('hidden');
        authFeedback.textContent = '';
      }, 1400);
    } catch (err) {
      authFeedback.className = 'auth-feedback error';
      authFeedback.textContent = err.message || 'Token verification failed.';
    } finally {
      verifyTokenBtn.textContent = 'Connect';
    }
  });

  // 5. GitHub OAuth (redirect flow; token exchange happens on the backend)
  oauthLoginBtn.addEventListener('click', async () => {
    oauthLoginBtn.disabled = true;
    sendMessage({ type: 'CLEAR_OAUTH_ERROR' }).catch(() => null);
    authFeedback.className = 'auth-feedback';
    authFeedback.textContent = 'Opening GitHub…';
    try {
      const response = await sendMessage({ type: 'START_OAUTH' });
      if (response.auth) {
        updateAuthUI(response.auth);
        authFeedback.className = 'auth-feedback success';
        authFeedback.textContent = `Connected as @${response.auth.username}!`;
        setTimeout(() => {
          authDrawer.classList.add('hidden');
          authFeedback.textContent = '';
        }, 1200);
      }
    } catch (error) {
      authFeedback.className = 'auth-feedback error';
      authFeedback.textContent = error.message;
    } finally {
      oauthLoginBtn.disabled = false;
    }
  });

  // When the auth window opens, the popup closes. Show the result on reopen:
  // a cancellation error, a pending flow, or a completed sign-in.
  try {
    const sessionState = await chrome.storage.session.get([
      'revaudit_oauth_pending',
      'revaudit_oauth_error',
    ]);
    if (!(currentAuth && currentAuth.token)) {
      if (sessionState.revaudit_oauth_error && sessionState.revaudit_oauth_error.message) {
        authDrawer.classList.remove('hidden');
        authFeedback.className = 'auth-feedback error';
        authFeedback.textContent = sessionState.revaudit_oauth_error.message;
      } else if (sessionState.revaudit_oauth_pending) {
        authDrawer.classList.remove('hidden');
        authFeedback.className = 'auth-feedback';
        authFeedback.textContent = 'Finish signing in on GitHub, then reopen this popup.';
      }
    }
  } catch {
    // storage.session may be unavailable on older browsers
  }

  // 6. Action Handlers
  auditBtn.addEventListener('click', handleAuditSubmit);

  detectTabBtn.addEventListener('click', async () => {
    const found = await detectCurrentGitHubTab();
    if (!found) {
      alert('Active browser tab is not a GitHub repository page.');
    }
  });

  [ownerInput, repoInput].forEach(inp => {
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAuditSubmit();
    });
  });

  retryBtn.addEventListener('click', handleAuditSubmit);

  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      ownerInput.value = chip.dataset.owner;
      repoInput.value = chip.dataset.repo;
      handleAuditSubmit();
    });
  });
});
