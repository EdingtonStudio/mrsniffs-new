/* ==========================================================================
   Mr. Sniff's — password (coming soon) page
   The store-password form sits in a <details> toggle. Re-open it after a
   wrong password so the error is visible, and focus the field on open.
   ========================================================================== */
(() => {
  const toggle = document.querySelector('[data-pass-toggle]');
  if (!toggle) return;
  const input = toggle.querySelector('input[type="password"]');
  if (toggle.querySelector('[data-pass-error]')) {
    toggle.open = true;
    if (input) input.focus();
  }
  toggle.addEventListener('toggle', () => {
    if (toggle.open && input) input.focus();
  });
})();
