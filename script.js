// Garage Gym Planner - v20 (known-good reset)
(() => {
  const STORE_KEY = "dk_workout_history_v20";
  const LAST_DAY_KEY = "dk_last_day_v20";
  const EQUIP_KEY = "dk_equipment_v20";

  const DEFAULT_EQUIPMENT = {
    dumbbells: [30, 35, 40],
    kettlebells: [30, 40, 50, 70],
    barbellIncrement: 5
  };

  const DAY_CYCLE = ["push", "pull", "legs", "cond", "cardio"];
  const $ = (id) => document.getElementById(id);

  function setStatus(msg) {
    const el = $("status");
    if (el) el.textContent = "Status: " + msg;
  }

  window.addEventListener("error", (e) => setStatus("ERROR: " + (e?.message || "unknown")));
  window.addEventListener("unhandledrejection", (e) => setStatus("PROMISE ERROR: " + (e?.reason?.message || e?.reason || "unknown")));

  function safeParseJSON(raw, fallback) {
    try { return JSON.parse(raw); } catch { return fallback; }
  }

  function parseNumberList(text) {
    return String(text || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
      .map(Number)
      .filter(n => Number.isFinite(n) && n > 0)
      .sort((a, b) => a - b);
  }

  function parseSetList(text) {
    return String(text || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
      .map(Number)
      .filter(n => Number.isFinite(n) && n > 0);
  }

  function stamp() {
    return new Date().toLocaleString();
  }

  function loadHistory() {
    return safeParseJSON(localStorage.getItem(STORE_KEY) || "{}", {});
  }
  function saveHistory(h) {
    localStorage.setItem(STORE_KEY, JSON.stringify(h));
  }

  function loadEquipment() {
    const eq = safeParseJSON(localStorage.getItem(EQUIP_KEY) || "null", null);
    if (!eq) return { ...DEFAULT_EQUIPMENT };
    return {
      dumbbells: Array.isArray(eq.dumbbells) && eq.dumbbells.length ? eq.dumbbells : DEFAULT_EQUIPMENT.dumbbells,
      kettlebells: Array.isArray(eq.kettlebells) && eq.kettlebells.length ? eq.kettlebells : DEFAULT_EQUIPMENT.kettlebells,
      barbellIncrement: Number(eq.barbellIncrement) || DEFAULT_EQUIPMENT.barbellIncrement
    };
  }
  function saveEquipment(eq) {
    localStorage.setItem(EQUIP_KEY, JSON.stringify(eq));
  }

  let EQUIPMENT = loadEquipment();

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

  // --- Exercises (edit freely)
  const EXERCISES = [
    // PUSH
    { id: "bb_bench", name: "Barbell Bench Press", day: "push", range: [5, 8], imp: "barbell" },
    { id: "db_press", name: "DB Shoulder Press", day: "push", range: [8, 12], imp: "dumbbell" },
    { id: "db_fly", name: "DB Chest Fly", day: "push", range: [10, 15], imp: "dumbbell" },
    { id: "tri_ext", name: "Overhead Triceps Extension", day: "push", range: [10, 15], imp: "dumbbell" },
    { id: "pushups_push", name: "Pushups", day: "push", range: [15, 30], imp: "bodyweight" },

    // PULL
    { id: "bb_row", name: "Barbell Row", day: "pull", range: [6, 10], imp: "barbell" },
    { id: "db_curl", name: "DB Curl", day: "pull", range: [6, 10], imp: "dumbbell" },
    { id: "hammer_curl", name: "Hammer Curl", day: "pull", range: [8, 12], imp: "dumbbell" },
    { id: "rear_delt", name: "Rear Delt Fly", day: "pull", range: [12, 20], imp: "dumbbell" },

    // LEGS
    { id: "kb_goblet", name: "KB Goblet Squat", day: "legs", range: [10, 15], imp: "kettlebell" },
    { id: "db_lunge", name: "DB Lunges (per leg)", day: "legs", range: [8, 12], imp: "dumbbell" },
    { id: "kb_sumo", name: "KB Sumo Squat", day: "legs", range: [10, 15], imp: "kettlebell" },
    { id: "bb_rdl", name: "Barbell RDL", day: "legs", range: [8, 12], imp: "barbell" },

    // CONDITIONING
    { id: "kb_swing_2h", name: "KB Swing (2-Hand)", day: "cond", range: [12, 20], imp: "kettlebell" },
    { id: "kb_swing_1h", name: "KB Swing (1-Hand, per side)", day: "cond", range: [8, 15], imp: "kettlebell" },
    { id: "kb_clean_press", name: "KB Clean & Press (per side)", day: "cond", range: [5, 10], imp: "kettlebell" },
    { id: "pushups_cond", name: "Pushups", day: "cond", range: [15, 30], imp: "bodyweight" },
    { id: "crunches", name: "Crunches", day: "cond", range: [20, 40], imp: "bodyweight" },

    // CARDIO
    { id: "zone2", name: "Zone 2 Cardio", day: "cardio", range: [25, 40], imp: "cardio" }
  ];

  function pickWorkoutForDay(day) {
    const pool = EXERCISES.filter(e => e.day === day).filter(Boolean);

    if (day === "cond") {
      const twoH = pool.find(e => e.id === "kb_swing_2h");
      const oneH = pool.find(e => e.id === "kb_swing_1h");
      const swing = (Math.random() < 0.5 ? twoH : oneH);

      return [
        swing,
        pool.find(e => e.id === "kb_clean_press"),
        pool.find(e => e.id === "pushups_cond"),
        pool.find(e => e.id === "crunches")
      ].filter(Boolean);
    }

    return pool; // Push/Pull/Legs/Cardio = show all
  }

  function renderWorkout(day, exercises) {
    const workoutDiv = $("workout");
    const logDiv = $("logArea");
    if (!workoutDiv || !logDiv) return setStatus("Missing #workout or #logArea");

    const list = (exercises || []).filter(Boolean);

    workoutDiv.innerHTML = `
      <h3>${String(day).toUpperCase()} DAY</h3>
      <p class="small">DBs [${EQUIPMENT.dumbbells.join(", ")}] • KBs [${EQUIPMENT.kettlebells.join(", ")}] • Barbell +${EQUIPMENT.barbellIncrement}</p>
    `;

    logDiv.innerHTML = "";

    if (!list.length) {
      workoutDiv.innerHTML += `<p>No exercises found for "${day}".</p>`;
      return;
    }

    list.forEach(ex => {
      workoutDiv.innerHTML += `
        <div style="border-top:1px dashed #333; padding-top:10px; margin-top:10px;">
          <strong>${ex.name}</strong><br/>
          Target: ${ex.range[0]}–${ex.range[1]} ${ex.imp === "cardio" ? "min" : "reps"}
        </div>
      `;

      const weightField =
        (ex.imp !== "cardio" && ex.imp !== "bodyweight")
          ? `<input id="w_${ex.id}" type="number" inputmode="numeric" placeholder="Weight (lbs)" />`
          : "";

      const repsOrMins =
        (ex.imp === "cardio")
          ? `<input id="m_${ex.id}" type="number" inputmode="numeric" placeholder="Minutes (e.g. 30)" />`
          : `<input id="r_${ex.id}" placeholder="Reps per set (e.g. 12,12,10)" />`;

      logDiv.innerHTML += `
        <div style="border-top:1px dashed #333; padding-top:10px; margin-top:10px;">
          <strong>Log: ${ex.name}</strong><br/>
          ${weightField}
          ${repsOrMins}
          <button class="logBtn" data-ex="${ex.id}" style="margin-top:8px;">Log</button>
        </div>
      `;
    });

    document.querySelectorAll(".logBtn").forEach(btn => {
      btn.addEventListener("click", () => logExercise(btn.dataset.ex));
    });
  }

  function logExercise(exId) {
    const ex = EXERCISES.find(e => e.id === exId);
    if (!ex) return alert("Unknown exercise: " + exId);

    const history = loadHistory();
    history[exId] = history[exId] || { logs: [], last: null };
    const entry = { time: stamp() };

    if (ex.imp === "cardio") {
      const mins = Number($(`m_${exId}`)?.value);
      if (!mins || mins <= 0) return alert("Enter minutes (e.g. 30).");
      entry.minutes = mins;
    } else {
      const sets = parseSetList($(`r_${exId}`)?.value);
      if (!sets.length) return alert("Enter reps like 12,12,10.");
      entry.sets = sets;

      if (ex.imp !== "bodyweight") {
        const w = Number($(`w_${exId}`)?.value);
        if (!w || w <= 0) return alert("Enter a weight (lbs).");
        entry.weight = w;
      }
    }

    history[exId].logs.push(entry);
    history[exId].last = entry;
    saveHistory(history);

    alert("Logged ✅");
  }

  function wireEquipmentUI() {
    const eqDbs = $("eq_dbs");
    const eqKbs = $("eq_kbs");
    const eqBar = $("eq_bar_inc");
    const eqSave = $("eq_save");
    const eqReset = $("eq_reset");
    const eqStatus = $("eq_status");
    if (!eqDbs || !eqKbs || !eqBar || !eqSave || !eqReset || !eqStatus) return;

    function refresh() {
      eqDbs.value = EQUIPMENT.dumbbells.join(",");
      eqKbs.value = EQUIPMENT.kettlebells.join(",");
      eqBar.value = String(EQUIPMENT.barbellIncrement);
      eqStatus.textContent = `Saved: DBs [${EQUIPMENT.dumbbells.join(", ")}], KBs [${EQUIPMENT.kettlebells.join(", ")}], Barbell +${EQUIPMENT.barbellIncrement}`;
    }

    eqSave.addEventListener("click", () => {
      const newEq = {
        dumbbells: parseNumberList(eqDbs.value),
        kettlebells: parseNumberList(eqKbs.value),
        barbellIncrement: Number(eqBar.value) || 5
      };
      if (!newEq.dumbbells.length) newEq.dumbbells = DEFAULT_EQUIPMENT.dumbbells;
      if (!newEq.kettlebells.length) newEq.kettlebells = DEFAULT_EQUIPMENT.kettlebells;

      EQUIPMENT = newEq;
      saveEquipment(EQUIPMENT);
      refresh();
      alert("Equipment saved ✅");
    });

    eqReset.addEventListener("click", () => {
      EQUIPMENT = { ...DEFAULT_EQUIPMENT };
      saveEquipment(EQUIPMENT);
      refresh();
      alert("Equipment reset ✅");
    });

    refresh();
  }

  function init() {
    const genBtn = $("genBtn");
    const resetBtn = $("resetCycleBtn");
    if (!genBtn) return setStatus("Missing #genBtn");

    genBtn.addEventListener("click", () => {
      const choice = $("dayType")?.value || "auto";
      const day = (choice === "auto") ? nextDay() : choice;
      renderWorkout(day, pickWorkoutForDay(day));
      setStatus("ready ✅");
    });

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        localStorage.removeItem(LAST_DAY_KEY);
        alert("Rotation reset ✅");
      });
    }

    wireEquipmentUI();
    setStatus("ready ✅");
  }

  document.addEventListener("DOMContentLoaded", init);
  setStatus("script loaded ✅");
})();
