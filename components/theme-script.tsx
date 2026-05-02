// Inline script in <head> that sets data-theme before paint.
// Reads localStorage('baze-theme') first, falls back to system preference.
// Prevents flash of wrong theme.

const SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('baze-theme');
    var sys = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored === 'dark' || stored === 'light'
      ? stored
      : (sys ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
