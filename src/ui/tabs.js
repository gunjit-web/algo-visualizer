/**
 * Simple tab switcher. Each tab button carries `data-tab` matching a panel id.
 */
export function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.panel');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        t.classList.toggle('active', t === tab);
        t.setAttribute('aria-selected', String(t === tab));
      });
      panels.forEach((p) => p.classList.toggle('active', p.id === tab.dataset.tab));
      window.dispatchEvent(new CustomEvent('tabchange', { detail: tab.dataset.tab }));
    });
  });
}
