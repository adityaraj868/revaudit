// Public configuration for the RevAudit extension.
// The GitHub OAuth App client ID is public. Device Flow must be enabled for this
// app in GitHub -> Settings -> Developer settings -> OAuth Apps.
// Users can override the client ID in the extension's auth drawer if they use a
// different OAuth App.
window.REVAUDIT_CONFIG = {
  GITHUB_CLIENT_ID: 'Ov23liJmnjUhTCVjcHR8',
  GITHUB_OAUTH_SCOPES: 'repo read:user',
  API_BASE_URL: 'https://revaudit-backend.onrender.com',
};
