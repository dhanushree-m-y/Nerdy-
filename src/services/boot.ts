// Takes the static boot card off screen once React has something to show.
// Native has its own splash (expo-splash-screen), so this is web-only.
import { Platform } from 'react-native';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const clear = () => {
    const el = document.getElementById('numi-boot');
    if (!el) return;
    el.classList.add('numi-boot-out');
    setTimeout(() => el.remove(), 400);
  };
  // Wait for the root to actually have content — the bundle finishing is not the
  // same as the first frame being painted.
  const root = document.getElementById('root');
  if (!root) {
    clear();
  } else if (root.childElementCount > 0) {
    clear();
  } else {
    const obs = new MutationObserver(() => {
      if (root.childElementCount > 0) { obs.disconnect(); requestAnimationFrame(clear); }
    });
    obs.observe(root, { childList: true });
    // Never let a failed mount leave the card stuck on screen.
    setTimeout(() => { obs.disconnect(); clear(); }, 15000);
  }
}
