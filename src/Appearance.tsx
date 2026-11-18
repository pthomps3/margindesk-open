import {useState} from 'react';
export function Appearance() {
  const [preference, setPreference] = useState(() => {
    try { return localStorage.getItem('mymargindesk.appearance') || 'system'; }
    catch { return 'system'; }
  });
  return <label className="appearance-control">Appearance
    <select aria-label="Appearance" value={preference} onChange={event => {
      const value = event.target.value;
      try { localStorage.setItem('mymargindesk.appearance', value); } catch {}
      setPreference(value);
      window.dispatchEvent(new Event('margindesk-appearance'));
    }}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select>
  </label>;
}
