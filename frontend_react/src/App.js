import { useEffect, useMemo, useState } from "react";
import "./App.css";

/* -------------------------------------------------------------------------- */
/*                                    DATA                                    */
/* -------------------------------------------------------------------------- */

const MOODS = [
  {
    key: "happy",
    label: "Happy 😀",
    color: "#22C55E", // Green base color
    aria: "I'm feeling happy",
  },
  {
    key: "partially-happy",
    label: "Partially Happy 😊",
    color: "#4ADE80", // Medium green variant
    aria: "I'm feeling partially happy",
  },
  {
    key: "neutral",
    label: "Neutral 😐",
    color: "#A5A6F6", // Lavender base color
    aria: "I'm feeling neutral",
  },
  {
    key: "partially-neutral",
    label: "Partially Neutral 🫤",
    color: "#818CF8", // Mid-lavender variant
    aria: "I'm feeling partially neutral",
  },
  {
    key: "sad",
    label: "Sad 😞",
    color: "#EF4444", // Red base color
    aria: "I'm feeling sad",
  },
  {
    key: "not-really",
    label: "Not Really 😶‍🌫️",
    color: "#FB7185", // Pinkish-red variant
    aria: "I'm not really feeling it",
  },
  {
    key: "excited",
    label: "Excited 🤩",
    color: "#3B82F6", // Blue base color
    aria: "I'm feeling excited",
  },
];

const STORAGE_KEY = "moodHistory_v1";

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    
    const parsedHistory = JSON.parse(raw);
    // Filter out entries with invalid mood keys
    const validHistory = parsedHistory.filter((entry) => {
      const isValid = entry.moodKey && MOODS.some((mood) => mood.key === entry.moodKey);
      if (!isValid) {
        console.warn(`Filtering out invalid mood entry:`, entry);
      }
      return isValid;
    });
    
    return validHistory;
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
    // TEST: New mood entries should appear immediately in Recent History and Summary
    // Updates only the in-memory state (no localStorage write)
    // - Immediately reflects in Recent History list
    // - Immediately updates Summary chart
    // - Does NOT persist to localStorage (requires Save button click)
    const newEntry = { moodKey, ts: Date.now() };
    const updated = [newEntry, ...history]; // Add to the top
    setHistory(updated);
  };

  const handleSaveHistory = () => {
    // TEST: Save button explicitly persists current UI state to localStorage
    // - Only time localStorage is written to
    // - Persists exact state currently visible in UI
    // - Affects all mood types (including newer ones like Partially Happy)
    saveHistory(history);
    alert("Mood history saved!");
  };

  const handleClearHistory = () => {
    // TEST: Clear button immediately empties the UI Recent History state
    // This clears only the in-memory (UI) history without affecting localStorage.
    // localStorage remains unchanged until 'Save' is explicitly clicked.
    // TEST: Summary chart should also update to reflect empty state
    setHistory([]);
  };

  /* ------------------------------ DERIVED DATA ------------------------------ */
  const counts = useMemo(() => {
    const initial = Object.fromEntries(MOODS.map((m) => [m.key, 0]));
    history.forEach((item) => {
      // Only count entries with valid mood keys that exist in MOODS
      if (item.moodKey && initial[item.moodKey] !== undefined) {
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
        <p className="subtitle">Track your daily emotions</p>
      </header>

      {/* Today's Mood Section */}
      <section className="todays-mood-section" aria-label="Today's mood selection">
        <h2 className="section-title">Today's Mood</h2>
        <p className="section-description">How are you feeling right now?</p>
        <div className="mood-buttons">
          {MOODS.map((mood) => (
            <button
              key={mood.key}
              className="mood-btn"
              style={{ background: mood.color }}
              onClick={() => handleSelectMood(mood.key)}
              aria-label={mood.aria}
            >
              {mood.label}
            </button>
          ))}
        </div>
      </section>

      <main className="dashboard">
        {/* History */}
        <div className="history-panel">
          <div className="history-header">
            <h2>Recent History</h2>
            <div className="history-actions">
              <button
                className="btn"
                onClick={handleSaveHistory}
                aria-label="Save history to local storage"
              >
                Save
              </button>
              <button
                className="btn btn-danger"
                onClick={handleClearHistory}
                aria-label="Clear Recent History from UI (localStorage unchanged until Save)"
              >
                Clear
              </button>
            </div>
          </div>
          {history.length === 0 && <p>No moods logged yet.</p>}
          <ul className="history-list">
            {history.slice(0, 10).map((entry, idx) => {
              const mood = MOODS.find((m) => m.key === entry.moodKey);
              
              // Guard against undefined mood objects
              if (!mood) {
                console.warn(`Unknown mood key: ${entry.moodKey}`);
                return (
                  <li key={idx} className="history-item">
                    <span
                      className="badge"
                      style={{ backgroundColor: "#9ca3af" }}
                    >
                      Unknown
                    </span>
                    <time style={{ color: "#6b7280", fontSize: "0.875rem", fontWeight: "500" }}>
                      {new Date(entry.ts).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </time>
                  </li>
                );
              }
              
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
          Click "Save" to persist your mood history. Data is stored on your
          device.
        </small>
      </footer>
    </div>
  );
}

export default App;
