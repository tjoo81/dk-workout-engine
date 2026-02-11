// =======================
// STORAGE KEYS
// =======================
const STORE_KEY = "dk_workout_history_v6";
const LAST_DAY_KEY = "dk_last_day_v6";
const EQUIP_KEY = "dk_equipment_v6";

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
    return JSON.parse(raw);
  } catch {
    return { ...DEFAULT_EQUIPMENT };
  }
}

function saveEquipment(eq) {
  localStorage.setItem(EQUIP_KEY, JSON.stringify(eq));
}

let EQUIPMENT = loadEquipment();

// =======================
// ROTATION
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
// =======================
const EXERCISES = [

  // PUSH
  { id: "bb_bench", name: "Barbell Bench Press", day: "push", range: [5, 8], imp: "barbell" },
  { id: "db_press", name: "DB Shoulder Press", day: "push", range: [8, 12], imp: "dumbbell" },

  // PULL
  { id: "bb_row", name: "Barbell Row", day: "pull", range: [6, 10], imp: "barbell" },
  { id: "db_curl", name: "DB Curl", day: "pull", range: [6, 10], imp: "dumbbell" },

  // LEGS
  { id: "kb_goblet", name: "KB Goblet Squat", day: "legs", range: [10, 15], imp: "kettlebell" },
  { id: "db_lunge", name: "DB Lunges (per leg)", day: "legs", range: [8, 12], imp: "dumbbell" },
  { id: "kb_sumo", name: "KB Sumo Squat", day: "legs", range: [10, 15], imp: "kettlebell" },
  { id: "bb_rdl", name: "Barbell RDL", day: "legs", range: [8, 12], imp: "barbell" },

  // CONDITIONING
  { id: "kb_swing_2h", name: "KB Swing (2-Hand)", day: "cond", range: [12, 20], imp: "kettlebell" },
  { id: "kb_swing_1h", name: "KB Swing (1-Hand, per side)", day: "cond", range: [8, 15], imp: "kettlebell" },
  { id: "kb_clean_press", name: "KB Clean & Press (per side)", day: "cond", range: [5, 10], imp: "kettlebell" },
  { id: "pushups", name: "Pushups", day: "cond", range: [15, 30], imp: "bodyweight" },
  { id: "crunches", name: "Crunches", day: "cond", range: [20, 40], imp: "bodyweight" },

  // CARDIO
  { id: "zone2", name: "Zone 2 Cardio", day: "cardio", range: [25, 40], imp: "cardio" }
];

// =======================
// HISTORY
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
function parseSetList(text) {
  return text
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter(n => Number.isFinite(n) && n > 0);
}

// =======================
// WORKOUT BUILDER
// =======================
function pickWorkoutForDay(day) {
  const pool = EXERCISES.filter(e => e.day === day);

  if (day === "cond") {
    const twoH = pool.find(e => e.id === "kb_swing_2h");
    const oneH = pool.find(e => e.id === "kb_swing_1h");

    const swing = Math.random() < 0.5 ? twoH : oneH;

    return [
      swing,
      pool.find(e => e.id === "kb_clean_press"),
      pool.find(e => e.id === "pushups"),
      pool.find(e => e.id === "crunches")
    ].filter(Boolean);
  }

  if (day === "push")
    return [
      pool.find(e => e.id === "bb_bench"),
      pool.find(e => e.id === "db_press")
    ].filter(Boolean);

  if (day === "pull")
    return [
      pool.find(e => e.id === "bb_row"),
      pool.find(e => e.id === "db_curl")
    ].filter(Boolean);

  if (day === "legs")
    return [
      pool.find(e => e.id === "kb_goblet"),
      pool.find(e => e.id === "db_lunge"),
      pool.find(e => e.id === "kb_sumo"),
      pool.find(e => e.id === "bb_rdl")
    ].filter(Boolean);

  if (day === "cardio")
    return [pool.find(e => e.id === "zone2")].filter(Boolean);

  return [];
}

// =======================
// UI RENDER
// =======================
const workoutDiv = document.getElementById("workout");
const logDiv = document.getElementById("logArea");

function renderWorkout(day, exercises) {
  exercises = (exercises || []).filter(Boolean);

  workoutDiv.innerHTML = `<h3>${day.toUpperCase()} DAY</h3>`;
  logDiv.innerHTML = "";

  exercises.forEach(ex => {
    workoutDiv.innerHTML += `
      <p>
        <strong>${ex.name}</strong><br/>
        Target: ${ex.range[0]}-${ex.range[1]}
      </p>
    `;

    logDiv.innerHTML += `
      <div>
        <h4>${ex.name}</h4>
        ${ex.imp !== "cardio" && ex.imp !== "bodyweight"
          ? `<input id="w_${ex.id}" type="number" placeholder="Weight" />`
          : ""}
        ${ex.imp === "cardio"
          ? `<input id="m_${ex.id}" type="number" placeholder="Minutes" />`
          : `<input id="r_${ex.id}" placeholder="Reps e.g. 12,12,10" />`}
        <button onclick="logExercise('${ex.id}')">Log</button>
      </div>
    `;
  });
}

function logExercise(id) {
  const ex = EXERCISES.find(e => e.id === id);
  const history = loadHistory();
  history[id] = history[id] || { logs: [], last: null };

  const entry = { time: stamp() };

  if (ex.imp === "cardio") {
    entry.minutes = Number(document.getElementById(`m_${id}`).value);
  } else {
    entry.sets = parseSetList(document.getElementById(`r_${id}`).value);
    if (ex.imp !== "bodyweight")
      entry.weight = Number(document.getElementById(`w_${id}`).value);
  }

  history[id].logs.push(entry);
  history[id].last = entry;
  saveHistory(history);

  alert("Logged!");
}

// =======================
// BUTTONS
// =======================
document.getElementById("genBtn").addEventListener("click", () => {
  const choice = document.getElementById("dayType")?.value || "auto";

  let day = choice === "auto" ? nextDay() : choice;

  renderWorkout(day, pickWorkoutForDay(day));
});

document.getElementById("resetCycleBtn").addEventListener("click", () => {
  localStorage.removeItem(LAST_DAY_KEY);
  alert("Rotation reset.");
});
