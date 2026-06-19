// Minimal standalone ad renderer used when Prism is embedded via iframe.
// The default content script injects the ad directly into the page instead.

const root = document.getElementById('root')
if (root) {
  root.textContent = 'Prism ad frame'
}
