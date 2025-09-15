import { useEffect, useMemo, useState } from "react";
import "./App.css";

/* -------------------------------------------------------------------------- */
/*                                    DATA                                    */
/* -------------------------------------------------------------------------- */

const MOODS = [
  {
    key: "happy",
    label: "Happy",
    color: "#4ade80", // emerald-400
    aria: "I'm feeling happy"
  },
  {
    key: "partiallyHappy",
    label: "Partially Happy",
    color: "#86efac", // emerald-300
    aria: "I'm feeling partially happy"
  },
  {
    key: "neutral",
    label: "Neutral",
    color: "#facc15", // amber-400
    aria: "I'm feeling neutral"
  },
  {
    key: "partiallyNeutral",
    label: "Partially Neutral",
    color: "#fde047", // amber-300
    aria: "I'm feeling partially neutral"
  },
  {
    key: "sad",
    label: "Sad",
    color: "#60a5fa", // blue-400
    aria: "I'm feeling sad"
  },
  {
    key: "notReally",
    label: "Not really",
    color: "#c084fc", // violet-300
    aria: "I'm not really feeling anything"
  }
];

const STORAGE_KEY = "moodHistory_v1";

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

/**
 * Generates the segments for a conic-gradient chart.
 * Returns CSS string like: "red 0 90deg, blue 90deg 180deg, ..."
 */
function createConicGradient(segments) {
  // segments: [{color, percentage}]
  let currentDeg = 0;
  const parts = segments.map((seg) => {
    const start = currentDeg;
    const end = currentDeg + seg.percentage * 360;
    currentDeg = end;
    return `${seg.color} ${start}deg ${end}deg`;
  });
  return `conic-gradient(${parts.join(", ")})`;
}

/* -------------------------------------------------------------------------- */
/*                                   APP                                      */
/* -------------------------------------------------------------------------- */

// PUBLIC_INTERFACE
function App() {
  const [history, setHistory] = useState(() => loadHistory());

  /* ------------------------------ EVENT HANDLERS ----------------------------- */

  const handleSelectMood = (moodKey) => {
    const newEntry = { moodKey, ts: Date.now() };
    const updated = [newEntry, ...history]; // newest first
    setHistory(updated);
  };

  /* ------------------------------ PERSIST STATE ------------------------------ */
  useEffect(() => {
    saveHistory(history);
  }, [history]);

  /* ------------------------------ DERIVED DATA ------------------------------ */
  const counts = useMemo(() => {
    const initial = Object.fromEntries(MOODS.map((m) => [m.key, 0]));
    history.forEach((item) => {
      if (initial[item.moodKey] !== undefined) {
        initial[item.moodKey] += 1;
      }
    });
    return initial;
  }, [history]);

  const total = useMemo(
    () => Object.values(counts).reduce((acc, n) => acc + n, 0),
    [counts]
  );

  const segments = useMemo(() => {
    if (total === 0) return [];
    return MOODS.map((m) => ({
      color: m.color,
      percentage: counts[m.key] / total
    })).filter((s) => s.percentage > 0);
  }, [counts, total]);

  const gradient = segments.length
    ? createConicGradient(segments)
    : "conic-gradient(#e5e7eb 0deg 360deg)"; // gray fallback

  /* -------------------------------------------------------------------------- */
  /*                                   RENDER                                   */
  /* -------------------------------------------------------------------------- */
  return (
    <div className="container">
      <header>
        <h1 className="title">Mood Tracker</h1>
        <p className="subtitle">How are you feeling today?</p>
      </header>

      {/* Mood Buttons */}
      <section className="mood-buttons" aria-label="Select your mood">
        {MOODS.map((mood) => (
          <button
            key={mood.key}
            className="mood-btn"
            style={{ backgroundColor: mood.color }}
            onClick={() => handleSelectMood(mood.key)}
            aria-label={mood.aria}
          >
            {mood.label}
          </button>
        ))}
      </section>

      <main className="dashboard">
        {/* History */}
        <div className="history-panel">
          <h2>Recent History</h2>
          {history.length === 0 && <p>No moods logged yet.</p>}
          <ul className="history-list">
            {history.slice(0, 10).map((entry, idx) => {
              const mood = MOODS.find((m) => m.key === entry.moodKey);
              return (
                <li key={idx} className="history-item">
                  <span
                    className="badge"
                    style={{ backgroundColor: mood.color }}
                  >
                    {mood.label}
                  </span>
                  <time>
                    {new Date(entry.ts).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </time>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Summary Chart */}
        <div className="summary-panel">
          <h2>Summary</h2>
          <div
            className="donut"
            style={{
              background: gradient
            }}
            role="img"
            aria-label="Mood distribution chart"
          />

          {/* Legend */}
          <ul className="legend">
            {MOODS.map((mood) => (
              <li key={mood.key} className="legend-item">
                <span
                  className="legend-color"
                  style={{ backgroundColor: mood.color }}
                  aria-hidden="true"
                />
                <span className="legend-label">{mood.label}</span>
                <span className="legend-count">{counts[mood.key] || 0}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer>
        <small>
          Data is stored locally on your device. Clear browser storage to reset.
        </small>
      </footer>
    </div>
  );
}

export default App;
