(() => {
  const key = 'mymargindesk.appearance';
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  function apply() {
    let preference;
    try { preference = localStorage.getItem(key); } catch {}
    const dark = preference === 'dark' || (preference !== 'light' && media.matches);
    const theme = dark ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    const icon = document.querySelector('#tab-icon');
    icon.href = icon.dataset[theme] || './favicon-' + theme + '.svg';
    document.querySelector('meta[name="theme-color"]').content = dark ? '#14221e' : '#f8faf6';
  }
  apply();
  media.addEventListener('change', apply);
  window.addEventListener('storage', apply);
  window.addEventListener('margindesk-appearance', apply);
})();
