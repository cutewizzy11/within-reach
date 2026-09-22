// Progressive enhancement only. Every feature here works without JS; this just makes it nicer.
(() => {
  'use strict';

  // Move focus to the error summary so screen reader and keyboard users land on it immediately.
  const summary = document.querySelector('[data-error-summary]');
  if (summary) summary.focus();

  // Show/hide password toggles (hidden by default in HTML; only useful once JS can flip the input type).
  document.querySelectorAll('[data-toggle-password]').forEach((btn) => {
    btn.hidden = false;
    const input = document.getElementById(btn.getAttribute('data-toggle-password'));
    if (!input) return;
    btn.addEventListener('click', () => {
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btn.textContent = showing ? 'Show password' : 'Hide password';
      btn.setAttribute('aria-pressed', String(!showing));
    });
  });

  // "Read aloud" buttons for the plain-language summary, using the browser's own speech synthesis.
  if ('speechSynthesis' in window) {
    document.querySelectorAll('[data-speak]').forEach((btn) => {
      btn.hidden = false;
      const target = document.querySelector(btn.getAttribute('data-speak'));
      if (!target) return;
      btn.addEventListener('click', () => {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(target.textContent));
      });
    });
  }

  // Display settings: apply the chosen radio's data attributes live, before the form is submitted,
  // so people can see the effect immediately. The server-rendered page still works if JS is off.
  const prefsForm = document.querySelector('[data-prefs-form]');
  if (prefsForm) {
    const root = document.documentElement;
    prefsForm.addEventListener('change', (e) => {
      const input = e.target;
      if (input.name && input.type === 'radio' && input.checked) root.setAttribute(`data-${input.name}`, input.value);
    });
  }
})();
