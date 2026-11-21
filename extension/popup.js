const els = {
  authPanel: document.getElementById('authPanel'),
  signInButton: document.getElementById('signInButton'),
  accountButton: document.getElementById('accountButton'),
  repoForm: document.getElementById('repoForm'),
  repoInput: document.getElementById('repoInput'),
  detectButton: document.getElementById('detectButton'),
  detectHint: document.getElementById('detectHint'),
  limitSelect: document.getElementById('limitSelect'),
  auditButton: document.getElementById('auditButton'),
  status: document.getElementById('status'),
  results: document.getElementById('results'),
  resultRepo: document.getElementById('resultRepo'),
  resultMeta: document.getElementById('resultMeta'),
  refreshButton: document.getElementById('refreshButton'),
  summaryGrid: document.getElementById('summaryGrid'),
  cohortBody: document.getElementById('cohortBody'),
  anomalyCount: document.getElementById('anomalyCount'),
  anomalyList: document.getElementById('anomalyList'),
  workloadBody: document.getElementById('workloadBody'),
  warnings: document.getElementById('warnings'),
  dashboardButton: document.getElementById('dashboardButton'),
  repoLink: document.getElementById('repoLink'),
  redirectUri: document.getElementById('redirectUri'),
  copyRedirectButton: document.getElementById('copyRedirectButton'),
  apiBaseInput: document.getElementById('apiBaseInput'),
  saveApiButton: document.getElementById('saveApiButton'),
  setupPanel: document.getElementById('setupPanel'),
};

let state = null;
let lastSlug = null;
let loadingTimer = null;

function send(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response) {
        reject(new Error('The extension background worker did not respond.'));
        return;
      }
      if (!response.ok) {
        reject(new Error(response.error || 'Request failed.'));
        return;
      }
      resolve(response);
    });
  });
}

function parseRepo(value) {
  if (!value) return null;
  const cleaned = String(value)
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/^git@github\.com:/i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '');
  const parts = cleaned.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  if (!/^[A-Za-z0-9_.-]+$/.test(parts[0]) || !/^[A-Za-z0-9_.-]+$/.test(parts[1])) {
    return null;
  }
  return { owner: parts[0], repo: parts[1], slug: `${parts[0]}/${parts[1]}` };
}

function formatNumber(value, digits = 1) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toFixed(digits);
}

function formatHours(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const hours = Number(value);
  if (hours >= 48) return `${(hours / 24).toFixed(1)} d`;
  return `${hours.toFixed(1)} h`;
}

function formatInterval(interval) {
  if (!Array.isArray(interval) || interval.length !== 2) return '—';
  return `${formatHours(interval[0])}–${formatHours(interval[1])}`;
}

function showStatus(kind, text, withSpinner = false) {
  els.status.hidden = false;
  els.status.className = `status status--${kind}`;
  els.status.replaceChildren();
  if (withSpinner) {
    const spinner = document.createElement('span');
    spinner.className = 'spinner';
    els.status.appendChild(spinner);
  }
  const span = document.createElement('span');
  span.textContent = text;
  els.status.appendChild(span);
}

function hideStatus() {
  els.status.hidden = true;
  els.status.replaceChildren();
}

function renderAuth(nextState) {
  state = nextState;
  const signedIn = Boolean(nextState.signedIn);
  els.authPanel.hidden = signedIn;
  els.accountButton.hidden = !signedIn;
  els.redirectUri.textContent = nextState.redirectUri || '';
  if (els.apiBaseInput && document.activeElement !== els.apiBaseInput) {
    els.apiBaseInput.value = nextState.apiBaseUrl || '';
  }
  if (!signedIn) {
    els.accountButton.replaceChildren();
    return;
  }
  els.accountButton.replaceChildren();
  if (nextState.user?.avatar_url) {
    const avatar = document.createElement('img');
    avatar.src = nextState.user.avatar_url;
    avatar.alt = '';
    avatar.className = 'account-avatar';
    els.accountButton.appendChild(avatar);
  }
  const login = document.createElement('span');
  login.className = 'account-login';
  login.textContent = `@${nextState.user?.login || 'github'}`;
  els.accountButton.appendChild(login);
  const signOut = document.createElement('span');
  signOut.textContent = '· sign out';
  signOut.style.color = 'var(--dim)';
  els.accountButton.appendChild(signOut);
}

function summaryTile(label, value, hint, tone = '') {
  const tile = document.createElement('div');
  tile.className = 'summary-tile';
  const l = document.createElement('div');
  l.className = 'summary-label';
  l.textContent = label;
  const v = document.createElement('div');
  v.className = `summary-value ${tone}`;
  v.textContent = value;
  const h = document.createElement('div');
  h.className = 'summary-hint';
  h.textContent = hint;
  tile.append(l, v, h);
  return tile;
}

function renderResults(data, slug) {
  lastSlug = slug;
  const metadata = data.metadata || {};
  els.resultRepo.textContent = slug;
  const authLabel = metadata.github_authenticated ? 'authenticated GitHub API' : 'unauthenticated GitHub API';
  els.resultMeta.textContent = `analysis v${metadata.analysis_version || '—'} · ${authLabel}`;

  els.summaryGrid.replaceChildren(
    summaryTile('PRs sampled', data.total_prs_in_sample ?? 0, `${data.open_prs_count ?? 0} open`),
    summaryTile('Merged', data.merged_prs_count ?? 0, `${data.unmerged_closed_prs_count ?? 0} closed unmerged`, 'summary-value--green'),
    summaryTile(
      'First reviews',
      data.first_review_observed_count ?? 0,
      `${data.first_review_censored_count ?? 0} censored`,
      'summary-value--blue',
    ),
    summaryTile('Median first review', formatHours(data.observed_median_first_review_hours), 'Across observed reviews'),
    summaryTile(
      'Robust signals',
      data.anomalies_count ?? data.anomalies?.length ?? 0,
      '|robust z| ≥ 2.5',
      (data.anomalies_count ?? 0) > 0 ? 'summary-value--amber' : 'summary-value--green',
    ),
    summaryTile(
      'Workload flags',
      data.workload_engine?.flagged_count ?? data.workload_anomalies?.length ?? 0,
      `${formatNumber(data.workload_engine?.request_coverage_pct, 0)}% request coverage`,
      (data.workload_engine?.flagged_count ?? 0) > 0 ? 'summary-value--amber' : 'summary-value--green',
    ),
  );

  const baselines = data.baseline_medians || {};
  els.cohortBody.replaceChildren();
  for (const cohort of ['Small', 'Medium', 'Large', 'Unknown']) {
    const row = baselines[cohort] || {};
    const tr = document.createElement('tr');
    const cells = [
      cohort,
      formatHours(row.median_hours),
      String(row.sample_size ?? 0),
      String(row.event_count ?? 0),
      formatInterval(row.confidence_interval_95),
    ];
    cells.forEach((value, index) => {
      const td = document.createElement('td');
      td.textContent = value;
      if (index >= 1) td.className = 'num';
      tr.appendChild(td);
    });
    els.cohortBody.appendChild(tr);
  }

  const anomalies = (data.anomalies || []).slice(0, 5);
  els.anomalyCount.textContent = `${data.anomalies_count ?? anomalies.length} flagged`;
  els.anomalyCount.className = anomalies.length ? 'pill pill--amber' : 'pill';
  els.anomalyList.replaceChildren();
  if (!anomalies.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No adjusted triage signals in this sample.';
    els.anomalyList.appendChild(empty);
  } else {
    for (const anomaly of anomalies) {
      const item = document.createElement('div');
      item.className = 'anomaly-item';
      const link = document.createElement('a');
      link.className = 'anomaly-title';
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.href = /^https?:\/\//.test(anomaly.html_url || '')
        ? anomaly.html_url
        : `https://github.com/${slug}/pull/${anomaly.pr_number}`;
      link.textContent = `#${anomaly.pr_number} ${anomaly.title || ''}`;
      const meta = document.createElement('div');
      meta.className = 'anomaly-meta';
      const latency = document.createElement('span');
      latency.textContent = `${formatHours(anomaly.review_time_hours ?? anomaly.first_review_latency_hours)} observed`;
      const expected = document.createElement('span');
      expected.textContent = `${formatHours(anomaly.expected_first_review_hours)} expected`;
      const z = document.createElement('span');
      z.className = 'tag';
      z.textContent = `z ${formatNumber(anomaly.standardized_residual, 2)}`;
      meta.append(latency, expected, z);
      item.append(link, meta);
      els.anomalyList.appendChild(item);
    }
  }

  const workload = data.workload_summary || {};
  const engine = data.workload_engine || {};
  els.workloadBody.replaceChildren();
  const workloadItems = [
    ['Avg concurrent', formatNumber(workload.average_concurrent_prs, 1)],
    ['Max', String(workload.max_concurrent_prs ?? 0)],
    ['Correlation', workload.correlation_with_first_review_hours == null ? '—' : formatNumber(workload.correlation_with_first_review_hours, 2)],
    ['Queue at creation', engine.average_queue_at_creation == null ? '—' : formatNumber(engine.average_queue_at_creation, 1)],
  ];
  for (const [label, value] of workloadItems) {
    const div = document.createElement('div');
    div.className = 'workload-item';
    div.textContent = `${label}: `;
    const strong = document.createElement('strong');
    strong.textContent = value;
    div.appendChild(strong);
    els.workloadBody.appendChild(div);
  }
  const note = document.createElement('div');
  note.className = 'workload-note';
  note.textContent =
    engine.limitation ||
    workload.definition ||
    'Workload is an inferred queue proxy, not a formal assignment history.';
  els.workloadBody.appendChild(note);

  const warnings = (data.data_quality?.warnings || []).slice(0, 4);
  els.warnings.hidden = warnings.length === 0;
  els.warnings.replaceChildren();
  if (warnings.length) {
    const list = document.createElement('ul');
    for (const warning of warnings) {
      const li = document.createElement('li');
      li.textContent = warning;
      list.appendChild(li);
    }
    els.warnings.appendChild(list);
  }

  els.repoLink.href = `https://github.com/${slug}`;
  els.results.hidden = false;
  els.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function refreshState() {
  const next = await send({ type: 'GET_STATE' });
  renderAuth(next);
  return next;
}

async function signIn() {
  els.signInButton.disabled = true;
  showStatus('loading', 'Opening GitHub sign-in…', true);
  try {
    await send({ type: 'SIGN_IN' });
    await refreshState();
    hideStatus();
    showStatus('ok', 'Signed in. Enter a repository and run an audit.');
  } catch (error) {
    showStatus('error', error.message);
  } finally {
    els.signInButton.disabled = false;
  }
}

async function signOut() {
  try {
    await send({ type: 'SIGN_OUT' });
    els.results.hidden = true;
    await refreshState();
    hideStatus();
  } catch (error) {
    showStatus('error', error.message);
  }
}

async function detectRepository() {
  try {
    const response = await send({ type: 'ACTIVE_REPO' });
    if (response.repo) {
      els.repoInput.value = response.repo.slug;
      els.detectHint.textContent = `Detected ${response.repo.slug} from the active tab.`;
    } else {
      els.detectHint.textContent = 'No GitHub repository found in the active tab.';
    }
  } catch (error) {
    els.detectHint.textContent = error.message;
  }
}

async function runAudit() {
  const parsed = parseRepo(els.repoInput.value);
  if (!parsed) {
    showStatus('error', 'Enter a repository as owner/repo or a GitHub URL.');
    return;
  }
  els.auditButton.disabled = true;
  els.refreshButton.disabled = true;
  showStatus('loading', `Auditing ${parsed.slug}…`, true);
  clearTimeout(loadingTimer);
  loadingTimer = setTimeout(() => {
    showStatus(
      'loading',
      'Waking up the analysis engine… The free-tier API can take up to 60 seconds.',
      true,
    );
  }, 4000);
  try {
    const response = await send({
      type: 'AUDIT',
      owner: parsed.owner,
      repo: parsed.repo,
      limit: Number(els.limitSelect.value),
    });
    clearTimeout(loadingTimer);
    renderResults(response.data, parsed.slug);
    hideStatus();
  } catch (error) {
    clearTimeout(loadingTimer);
    showStatus('error', error.message);
  } finally {
    els.auditButton.disabled = false;
    els.refreshButton.disabled = false;
  }
}

async function saveApiBase() {
  try {
    const response = await send({ type: 'SET_API_BASE', value: els.apiBaseInput.value });
    renderAuth({ ...state, apiBaseUrl: response.apiBaseUrl });
    showStatus('ok', 'API base URL saved.');
  } catch (error) {
    showStatus('error', error.message);
  }
}

async function copyRedirectUri() {
  try {
    await navigator.clipboard.writeText(els.redirectUri.textContent || '');
    els.copyRedirectButton.textContent = 'Copied';
    setTimeout(() => {
      els.copyRedirectButton.textContent = 'Copy';
    }, 1500);
  } catch {
    showStatus('error', 'Clipboard access failed. Select and copy the URL manually.');
  }
}

async function init() {
  els.signInButton.addEventListener('click', signIn);
  els.accountButton.addEventListener('click', signOut);
  els.detectButton.addEventListener('click', detectRepository);
  els.repoForm.addEventListener('submit', (event) => {
    event.preventDefault();
    runAudit();
  });
  els.refreshButton.addEventListener('click', runAudit);
  els.dashboardButton.addEventListener('click', () => send({ type: 'OPEN_DASHBOARD' }));
  els.saveApiButton.addEventListener('click', saveApiBase);
  els.copyRedirectButton.addEventListener('click', copyRedirectUri);

  try {
    await refreshState();
    await detectRepository();
  } catch (error) {
    showStatus('error', error.message);
  }
}

init();
