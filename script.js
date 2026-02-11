// =======================
// STORAGE KEYS
// =======================
const STORE_KEY = "dk_workout_history_structured_v4";
const LAST_DAY_KEY = "dk_last_day_v4";
const EQUIP_KEY = "dk_equipment_v4";

// =======================
// DEFAULT EQUIPMENT
// =======================
const DEFAULT_EQUIPMENT = {
  dumbbells: [30, 35, 40],
  kettlebells: [30, 40, 50, 70],
  barbellIncrement: 5
};

function parseNumberList(text) {
  return text
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter(n => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
}

function loadEquipment() {
  try {
    const raw = localStorage.getItem(EQUIP_KEY);
    if (!raw) return { ...DEFAULT_EQUIPMENT };
    const obj = JSON.parse(raw);

    return {
      dumbbells: Array.isArray(obj.dumbbells) ? obj.dumbbells : DEFAULT_EQUIPMENT.dumbbells,
      kettlebells: Array.isArray(obj.kettlebells) ? obj.kettlebells : DEFAULT_EQUIPMENT.kettlebells,
      barbellIncrement: Number(obj.barbellIncrement) || DEFAULT_EQUIPMENT.barbellIncrement
    };
  } catch {
    return { ...DEFAULT_EQUIPMENT };
  }
}

function saveEquipment(eq) {
  localStorage.setItem(EQUIP_KEY, JSON.stringify(eq));
}

let EQUIPMENT = loadEquipment();

// =======================
// SPLIT ROTATION
// =======================
const DAY_CYCLE = ["push", "pull", "legs", "cond", "cardio"];

function getLastDay() {
  return localStorage.getItem(LAST_DAY_KEY) || "";
}
function setLastDay(day) {
  localStorage.setItem(LAST_DAY_KEY, day);
}
function nextDay() {
  const last = getLastDay();
  const idx = DAY_CYCLE.indexOf(last);
  const next = DAY_CYCLE[(idx + 1 + DAY_CYCLE.length) % DAY_CYCLE.length] || DAY_CYCLE[0];
  setLastDay(next);
  return next;
}

// =======================
// EXERCISES
// imp: "barbell" | "dumbbell" | "kettlebell" | "cardio"
// range: reps for lifts, minutes for cardio
// =======================
const EXERCISES = [
  // PUSH
  { id: "bb_bench", name: "Barbell Bench Press", day: "push", range: [5, 8], imp: "barbell" },
  { id: "db_press", name: "DB Shoulder Press", day: "push", range: [8, 12], imp: "dumbbell" },

  // PULL
  { id: "bb_row", name: "Barbell Row", day: "pull", range: [6, 10], imp: "barbell" },
  { id: "db_curl", name: "DB Curl", day: "pull", range: [6, 10], imp: "dumbbell" },

  // LEGS (your preferred template)
  { id: "kb_goblet", name: "KB Goblet Squat", day: "legs", range: [10, 15], imp: "kettlebell" },
  { id: "db_lunge", name: "DB Lunges (per leg)", day: "legs", range: [8, 12], imp: "dumbbell" },
  { id: "kb_sumo", name: "KB Sumo Squat", day: "legs", range: [10, 15], imp: "kettlebell" },
  { id: "bb_rdl", name: "Barbell Romanian Deadlift", day: "legs", range: [8, 12], imp: "barbell" },

  // CONDITIONING (your KB moves)
  { id: "kb_swing_2h", name: "KB Swing (2-Hand)", day: "cond", range: [12, 20], imp: "kettlebell" },
  { id: "kb_swing_1h", name: "KB Swing (1-Hand, per side)", day: "cond", range: [8, 15], imp: "kettlebell" },
  { id: "kb_clean_press", name: "KB Clean & Press (per side)", day: "cond", range: [5, 10], imp: "kettlebell" },
  { id: "pushups", name: "Pushups", day: "cond", range: [15, 30], imp: "bodyweight" },
{ id: "crunches", name: "Crunches", day: "cond", range: [20, 40], imp: "bodyweight" },
  

  // CARDIO
  { id: "zone2", name: "Zone 2 Cardio (walk/jog)", day: "cardio", range: [25, 40], imp: "cardio" }
];

// =======================
// HISTORY STORAGE
// =======================
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveHistory(h) {
  localStorage.setItem(STORE_KEY, JSON.stringify(h));
}
function stamp() {
  return new Date().toLocaleString();
}

// =======================
// SETS PARSER (for sets logging)
// =======================
function parseSetList(text) {
  return text
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .map(n => Number(n))
    .filter(n => Number.isFinite(n) && n > 0);
}

// =======================
// EQUIPMENT-AWARE WEIGHT JUMPS
// =======================
function nextAvailableWeight(current, list) {
  const sorted = (list || []).slice().sort((a, b) => a - b);
  for (const w of sorted) {
    if (w > current) return w;
  }
  return null;
}

function suggestedNextWeight(ex, currentWeight) {
  if (ex.imp === "barbell") return currentWeight + EQUIPMENT.barbellIncrement;
  if (ex.imp === "dumbbell") return nextAvailableWeight(currentWeight, EQUIPMENT.dumbbells);
  if (ex.imp === "kettlebell") return nextAvailableWeight(currentWeight, EQUIPMENT.kettlebells);
  return null;
}

// =======================
// DEFAULT START WEIGHT (no history yet)
// =======================
function defaultStartWeight(ex) {
  if (ex.imp !== "kettlebell" && ex.imp !== "dumbbell") return null;

  const hasKB = (w) => EQUIPMENT.kettlebells.includes(w);
  const hasDB = (w) => EQUIPMENT.dumbbells.includes(w);

  // Swings prefs
  if (ex.id === "kb_swing_2h") return hasKB(70) ? 70 : (hasKB(50) ? 50 : null);
  if (ex.id === "kb_swing_1h") return hasKB(50) ? 50 : null;
  if (ex.id === "kb_clean_press") return hasKB(50) ? 50 : (hasKB(40) ? 40 : null);

  // Leg KB defaults
  if (ex.id === "kb_goblet" || ex.id === "kb_sumo") return hasKB(50) ? 50 : (hasKB(40) ? 40 : null);

  // DB defaults
  if (ex.id === "db_press" || ex.id === "db_curl" || ex.id === "db_lunge") {
    if (hasDB(30)) return 30;
    const sorted = EQUIPMENT.dumbbells.slice().sort((a, b) => a - b);
    return sorted.length ? sorted[0] : null;
  }

  return null;
}

// =======================
// SMARTER PROGRESSIVE OVERLOAD
// - If ALL sets hit top reps -> increase weight (next available)
// - Else -> keep weight, +1 rep to weakest set
// =======================
function nextTarget(ex, last) {
  const [lo, hi] = ex.range;

  // Cardio progression (minutes)
  if (ex.imp === "cardio") {
    const lastMin = last?.minutes ?? null;
    if (lastMin == null) {
      return {
        lastText: "None logged yet.",
        suggestion: `Start in the ${lo}-${hi} min range (aim ~${lo}).`
      };
    }
    const nextMin = Math.min(lastMin + 1, hi);
    return {
      lastText: `${lastMin} min on ${last.time}`,
      suggestion: `Aim for ${nextMin} minutes (was ${lastMin}).`
    };
  }

  // Weighted lifts: need weight + sets[]
  if (!last || last.weight == null || !Array.isArray(last.sets) || last.sets.length === 0) {
    const startW = defaultStartWeight(ex);
    return {
      lastText: "None logged yet.",
      suggestion: startW
        ? `Start with ${startW} lb for 3 sets in the ${lo}-${hi} rep range.`
        : `Start with 3 sets in the ${lo}-${hi} rep range. Pick a weight where your last set lands near ${lo}-${hi}.`
    };
  }

  const lastWeight = last.weight;
  const sets = last.sets;
  const minSet = Math.min(...sets);
  const allHitTop = sets.every(r => r >= hi);

  if (allHitTop) {
    const nextW = suggestedNextWeight(ex, lastWeight);

    if (nextW == null) {
      return {
        lastText: `${lastWeight} × [${sets.join(", ")}] on ${last.time}`,
        suggestion: `You hit the top range on all sets. No heavier ${ex.imp} weight found in your equipment list. Options: add a set, slow tempo, or stricter form.`
      };
    }

    return {
      lastText: `${lastWeight} × [${sets.join(", ")}] on ${last.time}`,
      suggestion: `You hit the top range on all sets → increase to ${nextW} and aim for ${lo}-${hi}.`
    };
  }

  // Not all sets hit top: add +1 rep to weakest set
  const nextSets = sets.slice();
  const idx = nextSets.indexOf(minSet);
  nextSets[idx] = Math.min(nextSets[idx] + 1, hi);

  return {
    lastText: `${lastWeight} × [${sets.join(", ")}] on ${last.time}`,
    suggestion: `Stay at ${lastWeight} and aim for [${nextSets.join(", ")}].`
  };
}

// =======================
// WORKOUT STRUCTURE
// =======================
function pickWorkoutForDay(day) {
  const pool = EXERCISES.filter(e => e.day === day);

  if (day === "push") {
    return [
      pool.find(e => e.id === "bb_bench"),
      pool.find(e => e.id === "db_press")
    ].filter(Boolean);
  }

  if (day === "pull") {
    return [
      pool.find(e => e.id === "bb_row"),
      pool.find(e => e.id === "db_curl")
    ].filter(Boolean);
  }

  if (day === "legs") {
    // Your preferred legs template: goblet + lunge + sumo + RDL
    return [
      pool.find(e => e.id === "kb_goblet"),
      pool.find(e => e.id === "db_lunge"),
      pool.find(e => e.id === "kb_sumo"),
      pool.find(e => e.id === "bb_rdl")
    ].filter(Boolean);
  }

if (day === "cond") {
  const swingOptions = [
    pool.find(e => e.id === "kb_swing_2h"),
    pool.find(e => e.id === "kb_swing_1h")
  ].filter(Boolean);

  const randomSwing = swingOptions[Math.floor(Math.random() * swingOptions.length)];

  return [
    randomSwing,
    pool.find(e => e.id === "kb_clean_press"),
    pool.find(e => e.id === "pushups"),
    pool.find(e => e.id === "crunches")
  ].filter(Boolean);
}

  if (day === "cardio") {
    return [pool.find(e => e.id === "zone2")].filter(Boolean);
  }

  return pool.slice(0, 2);
}

// =======================
// UI RENDERING
// Requires HTML IDs: genBtn, workout, logArea
// Optional equipment editor IDs: eq_dbs, eq_kbs, eq_bar_inc, eq_save, eq_reset, eq_status
// Optional reset rotation button: resetCycleBtn
// =======================
const workoutDiv = document.getElementById("workout");
const logDiv = document.getElementById("logArea");

let currentExercises = [];

function renderWorkout(day, exercises) {
  const history = loadHistory();

  workoutDiv.innerHTML = `
    <h2>${day.toUpperCase()} Day</h2>
    <p><strong>Rotation:</strong> Push → Pull → Legs → Cond → Cardio</p>
    <p><strong>Equipment:</strong> DBs [${EQUIPMENT.dumbbells.join(", ")}], KBs [${EQUIPMENT.kettlebells.join(", ")}], Barbell +${EQUIPMENT.barbellIncrement}</p>
  `;

  exercises.forEach((ex, i) => {
    const last = history[ex.id]?.last || null;
    const target = nextTarget(ex, last);
    const rangeLabel = ex.imp === "cardio" ? `${ex.range[0]}–${ex.range[1]} min` : `${ex.range[0]}–${ex.range[1]} reps`;

    workoutDiv.innerHTML += `
      <div style="border-top:1px dashed #ccc; padding-top:10px; margin-top:10px;">
        <h3>${i + 1}. ${ex.name}</h3>
        <p><strong>Range:</strong> ${rangeLabel}</p>
        <p><strong>Last Performance:</strong> ${target.lastText}</p>
        <p><strong>Next Target:</strong> ${target.suggestion}</p>
      </div>
    `;
  });

  // Logging UI (auto-fill weight!)
  logDiv.innerHTML = "";
  exercises.forEach(ex => {
    const isCardio = ex.imp === "cardio";
    const lastW = history[ex.id]?.last?.weight ?? null;
    const startW = defaultStartWeight(ex);
    const fillW = (lastW != null) ? lastW : (startW != null ? startW : "");

    logDiv.innerHTML += `
      <div style="border-top:1px dashed #ccc; padding-top:10px; margin-top:10px;">
        <h3>Log: ${ex.name}</h3>
        ${
          isCardio
            ? `
              <label>Minutes</label>
              <input id="min_${ex.id}" type="number" inputmode="numeric" placeholder="e.g., 30" />
            `
            : `
              <label>Weight (lbs)</label>
              <input id="w_${ex.id}" type="number" inputmode="numeric" value="${fillW}" />
              <label>Reps per set (comma separated)</label>
              <input id="r_${ex.id}" placeholder="12,12,10" />
              <div style="font-size:12px; color:#555;">Example: 12,12,10</div>
            `
        }
        <button data-id="${ex.id}" class="logBtn" style="margin-top:10px;">Log</button>
      </div>
    `;
  });

  document.querySelectorAll(".logBtn").forEach(btn => {
    btn.addEventListener("click", () => logExercise(btn.dataset.id));
  });
}

function logExercise(exId) {
  const ex = EXERCISES.find(e => e.id === exId);
  if (!ex) return;

  const history = loadHistory();
  history[exId] = history[exId] || { logs: [], last: null };

  const entry = { time: stamp() };

  if (ex.imp === "cardio") {
    const mins = Number(document.getElementById(`min_${exId}`).value);
    if (!mins || mins <= 0) {
      alert("Enter minutes (e.g., 30).");
      return;
    }
    entry.minutes = mins;
  } else {
    const weight = Number(document.getElementById(`w_${exId}`).value);
    const sets = parseSetList(document.getElementById(`r_${exId}`).value);
    if (!weight || weight <= 0 || sets.length === 0) {
      alert("Enter weight and reps like 50 and 12,12,10");
      return;
    }
    entry.weight = weight;
    entry.sets = sets;
  }

  history[exId].logs.push(entry);
  history[exId].last = entry;
  saveHistory(history);

  alert("Logged ✅");
}

// =======================
// EQUIPMENT EDITOR UI (optional)
// =======================
function wireEquipmentEditorIfPresent() {
  const eqDbs = document.getElementById("eq_dbs");
  const eqKbs = document.getElementById("eq_kbs");
  const eqBarInc = document.getElementById("eq_bar_inc");
  const eqSave = document.getElementById("eq_save");
  const eqReset = document.getElementById("eq_reset");
  const eqStatus = document.getElementById("eq_status");

  if (!eqDbs || !eqKbs || !eqBarInc || !eqSave || !eqReset || !eqStatus) return;

  function renderEquipmentUI() {
    eqDbs.value = EQUIPMENT.dumbbells.join(",");
    eqKbs.value = EQUIPMENT.kettlebells.join(",");
    eqBarInc.value = String(EQUIPMENT.barbellIncrement);
    eqStatus.textContent =
      `Saved: DBs [${EQUIPMENT.dumbbells.join(", ")}], KBs [${EQUIPMENT.kettlebells.join(", ")}], Barbell +${EQUIPMENT.barbellIncrement}`;
  }

  eqSave.addEventListener("click", () => {
    const newEq = {
      dumbbells: parseNumberList(eqDbs.value),
      kettlebells: parseNumberList(eqKbs.value),
      barbellIncrement: Number(eqBarInc.value)
    };

    if (newEq.dumbbells.length === 0) newEq.dumbbells = DEFAULT_EQUIPMENT.dumbbells;
    if (newEq.kettlebells.length === 0) newEq.kettlebells = DEFAULT_EQUIPMENT.kettlebells;
    if (!newEq.barbellIncrement) newEq.barbellIncrement = DEFAULT_EQUIPMENT.barbellIncrement;

    EQUIPMENT = newEq;
    saveEquipment(EQUIPMENT);
    renderEquipmentUI();
    alert("Equipment saved ✅");
  });

  eqReset.addEventListener("click", () => {
    EQUIPMENT = { ...DEFAULT_EQUIPMENT };
    saveEquipment(EQUIPMENT);
    renderEquipmentUI();
    alert("Equipment reset ✅");
  });

  renderEquipmentUI();
}

// =======================
// RESET ROTATION BUTTON (optional)
// If you add: <button id="resetCycleBtn">Reset Rotation</button>
// =======================
function wireResetRotationButtonIfPresent() {
  const resetBtn = document.getElementById("resetCycleBtn");
  if (!resetBtn) return;

  resetBtn.addEventListener("click", () => {
    localStorage.removeItem(LAST_DAY_KEY);
    alert("Rotation reset. Next Generate starts at Push.");
  });
}

// =======================
// MAIN BUTTON
// =======================
document.getElementById("genBtn").addEventListener("click", () => {
  const dayTypeEl = document.getElementById("dayType");
  const choice = dayTypeEl ? dayTypeEl.value : "auto";

  let day;
  if (choice === "auto") {
    day = nextDay();          // uses rotation
  } else {
    day = choice;             // uses dropdown selection
    // optional: if you WANT rotation to follow what you picked, uncomment:
    // setLastDay(day);
  }

  currentExercises = pickWorkoutForDay(day);
  renderWorkout(day, currentExercises);
});

wireEquipmentEditorIfPresent();
wireResetRotationButtonIfPresent();
