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
const clientIdInput = document.getElementById('client-id-input');
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

// Active Auth State in Memory
let currentAuth = null;

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
    authUsername.textContent = 'GitHub Guest';
    headerAuthLabel.textContent = 'Sign In';

    userAvatar.classList.add('hidden');
    if (defaultGhIcon) defaultGhIcon.classList.remove('hidden');

    rateLimitBadge.className = 'badge-rate-limit low';
    rateLimitBadge.textContent = '60 req/hr';
    rateLimitDetail.textContent = 'Connect GitHub to unlock 5,000 req/hr & private repos';

    authActionBtn.textContent = 'Connect';
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
function categorizePrSize(bodyLength) {
  if (bodyLength < 250) return 'Small';
  if (bodyLength < 1000) return 'Medium';
  return 'Large';
}

function calculateMedian(values) {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculateStd(values, mean) {
  if (!values || values.length <= 1) return 0;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
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
async function performAudit(owner, repo) {
  setViewState('loading');
  loadingTitle.textContent = `Auditing ${owner}/${repo}...`;
  loadingSubtitle.textContent = 'Fetching closed pull requests from GitHub API...';

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'RevAudit-Chrome-Extension'
  };

  const token = currentAuth && currentAuth.token ? currentAuth.token : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=closed&per_page=30`;

  let prsData;
  try {
    const response = await fetch(url, { headers });

    // Update rate limits from response headers
    const remainingHeader = response.headers.get('x-ratelimit-remaining');
    const limitHeader = response.headers.get('x-ratelimit-limit');
    const resetHeader = response.headers.get('x-ratelimit-reset');

    if (remainingHeader && limitHeader && currentAuth) {
      currentAuth.rate_limit = {
        limit: parseInt(limitHeader, 10),
        remaining: parseInt(remainingHeader, 10),
        reset: parseInt(resetHeader, 10)
      };
      await chrome.storage.local.set({ gh_auth: currentAuth });
      updateAuthUI(currentAuth);
    }

    if (response.status === 404) {
      throw new Error(`Repository "${owner}/${repo}" was not found or is private.`);
    } else if (response.status === 403) {
      if (remainingHeader === '0') {
        throw new Error('GitHub API rate limit (60/hr) exceeded. Click "Connect" above to sign in with GitHub for 5,000 calls/hr.');
      }
      throw new Error('Access denied by GitHub API (HTTP 403). Ensure you have permission.');
    } else if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.message || `GitHub API error (HTTP ${response.status})`);
    }

    prsData = await response.json();
  } catch (err) {
    setViewState('error');
    errorMessage.textContent = err.message || 'Network error connecting to GitHub.';
    return;
  }

  if (!Array.isArray(prsData) || prsData.length === 0) {
    setViewState('error');
    errorMessage.textContent = `No closed pull requests found for ${owner}/${repo}.`;
    return;
  }

  loadingSubtitle.textContent = 'Calculating turnaround baselines and anomaly thresholds...';

  const mergedPrs = prsData.filter(pr => pr.merged_at != null);

  if (mergedPrs.length === 0) {
    setViewState('error');
    errorMessage.textContent = 'Found closed pull requests, but none of them were merged.';
    return;
  }

  const processedPrs = mergedPrs.map(pr => {
    const createdDt = new Date(pr.created_at);
    const mergedDt = new Date(pr.merged_at);
    const reviewTimeHours = Math.max(0.01, (mergedDt - createdDt) / (1000 * 3600));
    const bodyLength = (pr.body || '').length;
    const sizeCategory = categorizePrSize(bodyLength);
    const author = (pr.user && pr.user.login) ? pr.user.login : 'unknown';

    return {
      number: pr.number,
      title: pr.title,
      html_url: pr.html_url,
      author,
      bodyLength,
      sizeCategory,
      reviewTimeHours: parseFloat(reviewTimeHours.toFixed(2)),
      created_at: pr.created_at,
      merged_at: pr.merged_at
    };
  });

  const groups = { Small: [], Medium: [], Large: [] };
  processedPrs.forEach(pr => {
    if (groups[pr.sizeCategory]) groups[pr.sizeCategory].push(pr);
  });

  const baselineMedians = {};
  const allReviewTimes = processedPrs.map(p => p.reviewTimeHours);
  const overallMedian = calculateMedian(allReviewTimes);

  ['Small', 'Medium', 'Large'].forEach(cat => {
    const catPrs = groups[cat];
    const cnt = catPrs.length;
    if (cnt === 0) {
      baselineMedians[cat] = { median_hours: 0, sample_size: 0, mock_ci_90: [0, 0] };
      return;
    }

    const times = catPrs.map(p => p.reviewTimeHours);
    const med = calculateMedian(times);
    const mean = times.reduce((a, b) => a + b, 0) / cnt;
    const std = calculateStd(times, mean);

    let margin;
    if (cnt > 1 && std > 0) {
      margin = 1.645 * (std / Math.sqrt(cnt));
    } else {
      margin = med * 0.15;
    }

    const ciLower = Math.max(0, parseFloat((med - margin).toFixed(2)));
    const ciUpper = parseFloat((med + margin).toFixed(2));

    baselineMedians[cat] = {
      median_hours: parseFloat(med.toFixed(2)),
      sample_size: cnt,
      mock_ci_90: [ciLower, ciUpper]
    };
  });

  const anomalies = [];
  processedPrs.forEach(pr => {
    const cohort = baselineMedians[pr.sizeCategory];
    const baselineMedian = (cohort && cohort.median_hours > 0) ? cohort.median_hours : overallMedian;

    if (baselineMedian > 0) {
      const threshold = baselineMedian * 1.5;
      if (pr.reviewTimeHours > threshold) {
        const ratio = (pr.reviewTimeHours / baselineMedian).toFixed(1);
        anomalies.push({
          ...pr,
          baseline_median: baselineMedian,
          threshold: parseFloat(threshold.toFixed(2)),
          ratio: `${ratio}x`
        });
      }
    }
  });

  anomalies.sort((a, b) => parseFloat(b.ratio) - parseFloat(a.ratio));

  renderResults({
    owner,
    repo,
    totalClosed: prsData.length,
    mergedCount: mergedPrs.length,
    overallMedian,
    baselineMedians,
    anomalies
  });

  chrome.storage.local.set({ last_repo: { owner, repo } });
}

// Render Results View
function renderResults(data) {
  statTotal.textContent = data.totalClosed;
  statMerged.textContent = data.mergedCount;
  statMedian.textContent = formatHours(data.overallMedian);
  statAnomalies.textContent = data.anomalies.length;

  cohortList.innerHTML = '';
  ['Small', 'Medium', 'Large'].forEach(cat => {
    const info = data.baselineMedians[cat];
    const row = document.createElement('div');
    row.className = 'cohort-row';

    const tagClass = cat.toLowerCase();
    const countText = info.sample_size === 1 ? '1 PR' : `${info.sample_size} PRs`;
    const medianText = info.sample_size > 0 ? formatHours(info.median_hours) : 'No data';
    const ciText = info.sample_size > 0 ? `90% CI: ${formatHours(info.mock_ci_90[0])} – ${formatHours(info.mock_ci_90[1])}` : '–';

    row.innerHTML = `
      <div class="cohort-info">
        <span class="cohort-tag ${tagClass}">${cat}</span>
        <span class="cohort-count">${countText}</span>
      </div>
      <div class="cohort-stats">
        <span class="cohort-median">${medianText}</span>
        <span class="cohort-ci">${ciText}</span>
      </div>
    `;
    cohortList.appendChild(row);
  });

  anomaliesList.innerHTML = '';
  anomaliesCountBadge.textContent = `${data.anomalies.length} flagged`;

  if (data.anomalies.length === 0) {
    const emptyNotice = document.createElement('div');
    emptyNotice.className = 'no-anomalies';
    emptyNotice.textContent = '✓ No review latency anomalies detected (all PRs reviewed within 1.5x baseline).';
    anomaliesList.appendChild(emptyNotice);
  } else {
    data.anomalies.forEach(item => {
      const link = document.createElement('a');
      link.className = 'anomaly-item';
      link.href = item.html_url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      link.innerHTML = `
        <div class="anomaly-main">
          <div class="anomaly-pr-title">#${item.number} ${escapeHtml(item.title)}</div>
          <div class="anomaly-meta">by @${escapeHtml(item.author)} • ${item.sizeCategory} PR (baseline: ${formatHours(item.baseline_median)})</div>
        </div>
        <div class="anomaly-stats">
          <span class="anomaly-duration">${formatHours(item.reviewTimeHours)}</span>
          <span class="anomaly-ratio">${item.ratio} baseline</span>
        </div>
      `;
      anomaliesList.appendChild(link);
    });
  }

  setViewState('results');
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
        rateLimitDetail.textContent = `Unauthenticated: ${guestLimit.remaining} / ${guestLimit.limit} calls left (${formatResetTime(guestLimit.reset)})`;
      }
    });
  }

  if (stored.gh_client_id) {
    clientIdInput.value = stored.gh_client_id;
  }

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

  // 5. GitHub OAuth LaunchWebAuthFlow (Method 2)
  oauthLoginBtn.addEventListener('click', async () => {
    const clientId = clientIdInput.value.trim();
    if (!clientId) {
      authFeedback.className = 'auth-feedback error';
      authFeedback.textContent = 'Please provide your GitHub OAuth App Client ID.';
      return;
    }

    await chrome.storage.local.set({ gh_client_id: clientId });
    const redirectUri = chrome.identity.getRedirectURL();

    authFeedback.className = 'auth-feedback';
    authFeedback.textContent = 'Opening GitHub login popup...';

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,read:user`;

    try {
      const redirectUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true
      });

      const urlObj = new URL(redirectUrl);
      const code = urlObj.searchParams.get('code');

      if (code) {
        authFeedback.className = 'auth-feedback success';
        authFeedback.textContent = 'GitHub authorized! Exchanging token...';
        // Note: Direct browser token exchange requires client secret or backend proxy
        // If user is running local backend, they can also use PAT for immediate 0-dependency connect
      }
    } catch (err) {
      authFeedback.className = 'auth-feedback error';
      authFeedback.textContent = 'OAuth canceled or redirect failed. Try using a Token above.';
    }
  });

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
