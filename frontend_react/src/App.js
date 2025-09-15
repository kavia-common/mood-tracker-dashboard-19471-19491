import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

/**
 * Maps a JS Date to a yyyy-mm-dd key.
 */
function dateKey(d = new Date()) {
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Build an array of the last N dates as yyyy-mm-dd keys, newest last.
 */
function lastNDaysKeys(n = 14) {
  const arr = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    arr.push(dateKey(d));
  }
  return arr;
}

/**
 * Safely load from localStorage.
 */
function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Safely save to localStorage.
 */
function saveLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore write errors
  }
}

/**
 * Mood constants and metadata
 */
const MOODS = {
  happy: { label: 'Happy', emoji: '😊', colorVar: 'var(--mood-happy)' },
  neutral: { label: 'Neutral', emoji: '😐', colorVar: 'var(--mood-neutral)' },
  sad: { label: 'Sad', emoji: '😔', colorVar: 'var(--mood-sad)' },
};
const MOOD_KEYS = Object.keys(MOODS);
const STORAGE_KEYS = {
  theme: 'mood.theme',
  moods: 'mood.days',
};

/**
 * PUBLIC_INTERFACE
 * App - Mood Tracker Dashboard root
 * - Tracks last 14 days moods (one per day)
 * - Persists to localStorage
 * - Ocean Professional theme with accessible UI
 */
function App() {
  // Theme state - initialize from localStorage or system preference
  const initialTheme = loadLS(STORAGE_KEYS.theme, null)
    ?? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  const [theme, setTheme] = useState(initialTheme);
  const [moodsByDay, setMoodsByDay] = useState(() => {
    // Ensure we store only last 14 days keys
    const fromLS = loadLS(STORAGE_KEYS.moods, {});
    const allowed = new Set(lastNDaysKeys(14));
    const cleaned = {};
    for (const k of Object.keys(fromLS || {})) {
      if (allowed.has(k) && MOOD_KEYS.includes(fromLS[k])) cleaned[k] = fromLS[k];
    }
    return cleaned;
  });

  // Apply theme on mount and when theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveLS(STORAGE_KEYS.theme, theme);
  }, [theme]);

  // Persist moods
  useEffect(() => {
    saveLS(STORAGE_KEYS.moods, moodsByDay);
  }, [moodsByDay]);

  // Derived data
  const dayKeys = useMemo(() => lastNDaysKeys(14), []);
  const counts = useMemo(() => {
    const c = { happy: 0, neutral: 0, sad: 0 };
    for (const k of dayKeys) {
      const v = moodsByDay[k];
      if (v && c[v] !== undefined) c[v] += 1;
    }
    return c;
  }, [moodsByDay, dayKeys]);

  const todayKey = dateKey();
  const todayMood = moodsByDay[todayKey] || null;

  // PUBLIC_INTERFACE
  function toggleTheme() {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }

  /**
   * PUBLIC_INTERFACE
   * setMoodForToday - set or change today's mood
   */
  function setMoodForToday(mood) {
    if (!MOOD_KEYS.includes(mood)) return;
    setMoodsByDay(prev => ({ ...prev, [todayKey]: mood }));
  }

  /**
   * PUBLIC_INTERFACE
   * clearToday - remove today's mood
   */
  function clearToday() {
    setMoodsByDay(prev => {
      const next = { ...prev };
      delete next[todayKey];
      return next;
    });
  }

  /**
   * PUBLIC_INTERFACE
   * resetAll - clears all moods in the last 14 days
   */
  function resetAll() {
    const cleared = {};
    saveLS(STORAGE_KEYS.moods, cleared);
    setMoodsByDay(cleared);
  }

  // Chart calculations - donut arc paths
  const total = dayKeys.length;
  const segments = useMemo(() => {
    // Avoid zero-division; create segments proportional to counts
    const vals = [
      { key: 'happy', count: counts.happy, color: MOODS.happy.colorVar, label: MOODS.happy.label },
      { key: 'neutral', count: counts.neutral, color: MOODS.neutral.colorVar, label: MOODS.neutral.label },
      { key: 'sad', count: counts.sad, color: MOODS.sad.colorVar, label: MOODS.sad.label },
    ];
    let acc = 0;
    return vals.map(v => {
      const start = acc / total;
      const frac = total === 0 ? 0 : v.count / total;
      acc += v.count;
      return { ...v, start, frac };
    });
  }, [counts, total]);

  // Generate SVG arc for a donut segment
  const radius = 70;
  const innerRadius = 40;
  function arcPath(startT, fracT) {
    if (fracT <= 0) return '';
    const startAngle = 2 * Math.PI * startT - Math.PI / 2;
    const endAngle = 2 * Math.PI * (startT + fracT) - Math.PI / 2;

    const sx = Math.cos(startAngle) * radius;
    const sy = Math.sin(startAngle) * radius;
    const ex = Math.cos(endAngle) * radius;
    const ey = Math.sin(endAngle) * radius;

    const largeArc = fracT > 0.5 ? 1 : 0;

    // Outer arc + line to inner + inner arc back + close
    const ix = Math.cos(endAngle) * innerRadius;
    const iy = Math.sin(endAngle) * innerRadius;
    const isx = Math.cos(startAngle) * innerRadius;
    const isy = Math.sin(startAngle) * innerRadius;

    return [
      `M ${sx} ${sy}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${ex} ${ey}`,
      `L ${ix} ${iy}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${isx} ${isy}`,
      'Z',
    ].join(' ');
  }

  return (
    <div className="App">
      {/* Header */}
      <header className="app-header" role="banner">
        <div className="header-inner">
          <div className="brand" aria-label="Mood Tracker Dashboard">
            <div className="brand-badge" aria-hidden="true" />
            <div>
              <div className="brand-title">Mood Tracker</div>
              <div className="brand-sub">Ocean Professional</div>
            </div>
          </div>

          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="container" role="main">
        <div className="grid">
          {/* Left: Mood selection and history */}
          <section className="card" aria-labelledby="mood-select-heading">
            <h2 id="mood-select-heading" className="card-title">Today’s Mood</h2>
            <p className="card-subtitle" aria-live="polite">
              {todayMood ? `You selected: ${MOODS[todayMood].label}` : 'No selection yet'}
            </p>

            <div className="mood-buttons" role="group" aria-label="Mood options">
              {MOOD_KEYS.map((k) => {
                const active = todayMood === k;
                return (
                  <button
                    key={k}
                    type="button"
                    className="mood-btn"
                    aria-pressed={active}
                    aria-label={`${MOODS[k].label} mood`}
                    onClick={() => setMoodForToday(k)}
                    onKeyDown={(e) => {
                      // keyboard support: Enter/Space to select
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setMoodForToday(k);
                      }
                    }}
                  >
                    <span className="mood-emoji" aria-hidden="true">{MOODS[k].emoji}</span>
                    <span className="mood-label">{MOODS[k].label}</span>
                  </button>
                );
              })}
            </div>

            <div className="actions">
              <button className="btn" onClick={clearToday} aria-label="Clear today's mood">
                ⨯ Clear today
              </button>
              <button
                className="btn btn-warning"
                onClick={resetAll}
                aria-label="Reset all moods for the last 14 days"
              >
                ♻ Reset last 14 days
              </button>
            </div>

            <h3 className="card-title" style={{ marginTop: 18 }}>History (Last 14 Days)</h3>
            <div className="history-list" role="list" aria-label="Mood history for last 14 days">
              {dayKeys.map((k) => {
                const m = moodsByDay[k] || null;
                const label = m ? `${k}: ${MOODS[m].label}` : `${k}: not set`;
                return (
                  <div
                    key={k}
                    role="listitem"
                    className="history-item"
                    data-mood={m || ''}
                    aria-label={label}
                    title={label}
                  >
                    <div className="dot" />
                  </div>
                );
              })}
            </div>
            <p className="footer-note">Click a mood to log today. History auto-saves in your browser.</p>
          </section>

          {/* Right: Summary chart */}
          <section className="card" aria-labelledby="summary-heading">
            <h2 id="summary-heading" className="card-title">14‑Day Summary</h2>
            <div className="chart-wrap">
              <svg
                className="donut"
                viewBox="-90 -90 180 180"
                role="img"
                aria-labelledby="chart-title chart-desc"
              >
                <title id="chart-title">Mood breakdown donut chart</title>
                <desc id="chart-desc">
                  Shows proportions of moods in the last 14 days as a donut chart.
                </desc>

                {/* Donut background */}
                <circle cx="0" cy="0" r="70" fill="var(--primary-100)" />
                <circle cx="0" cy="0" r="40" fill="var(--surface)" />

                {/* Segments */}
                {segments.map(seg => (
                  seg.frac > 0 ? (
                    <path
                      key={seg.key}
                      d={arcPath(seg.start, seg.frac)}
                      fill={seg.color}
                      stroke="var(--surface)"
                      strokeWidth="0.5"
                    >
                      <title>{`${seg.label}: ${counts[seg.key]} of ${total} days`}</title>
                    </path>
                  ) : null
                ))}
              </svg>

              <div className="legend" aria-label="Chart legend">
                <div className="legend-item">
                  <span className="legend-swatch" style={{ background: MOODS.happy.colorVar }} aria-hidden="true" />
                  <span>Happy</span>
                  <span className="count">{counts.happy}</span>
                </div>
                <div className="legend-item">
                  <span className="legend-swatch" style={{ background: MOODS.neutral.colorVar }} aria-hidden="true" />
                  <span>Neutral</span>
                  <span className="count">{counts.neutral}</span>
                </div>
                <div className="legend-item">
                  <span className="legend-swatch" style={{ background: MOODS.sad.colorVar }} aria-hidden="true" />
                  <span>Sad</span>
                  <span className="count">{counts.sad}</span>
                </div>
              </div>
            </div>
            <p className="footer-note" aria-live="polite">
              Total tracked days: {total}. Data is private and stays in your browser.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
