// Theme: light, dark, or follow the system. The choice is kept in localStorage.
export type Theme = 'light' | 'dark' | 'system';

const KEY = 'aave-tracker:theme';
const media = () => window.matchMedia('(prefers-color-scheme: dark)');

function read(): Theme {
  const v = localStorage.getItem(KEY);
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
}

function apply(theme: Theme): boolean {
  const isDark = theme === 'dark' || (theme === 'system' && media().matches);
  document.documentElement.classList.toggle('dark', isDark);
  return isDark;
}

class ThemeStore {
  preference = $state<Theme>('system');
  isDark = $state(false);

  init() {
    this.preference = read();
    this.isDark = apply(this.preference);
    // Only track system changes while the user is on "system".
    media().addEventListener('change', () => {
      if (this.preference === 'system') this.isDark = apply('system');
    });
  }

  set(theme: Theme) {
    this.preference = theme;
    localStorage.setItem(KEY, theme);
    this.isDark = apply(theme);
  }

  // Cycle order: system → light → dark → system
  cycle() {
    this.set(this.preference === 'system' ? 'light' : this.preference === 'light' ? 'dark' : 'system');
  }
}

export const theme = new ThemeStore();
