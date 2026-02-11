(() => {
  const $ = (id) => document.getElementById(id);

  // -----------------------------
  // STATUS + ERROR DISPLAY
  // -----------------------------
  function setStatus(msg) {
    const s = $("status");
    if (s) s.textContent = "Status: " + msg;
  }

  window.addEventListener("error", (e) => setStatus("ERROR: " + (e?.message || "unknown")));
  window.addEventListener("unhandledrejection", (e) =>
    setStatus("PROMISE ERROR: " + (e?.reason?.message || e?.reason || "unknown"))
  );

  // -----------------------------
  // STORAGE + HELPERS
  // -----------------------------
  const STORE_KEY = "dk_workout_history_v777";
  const LAST_DAY_KEY = "dk_last_day_v777";
  const DAY_CYCLE = ["push", "pull", "legs", "cond", "cardio"];

  function stamp() {
    return new Date().toLocaleString();
  }

  function safeParse(raw, fallback) {
    try { return JSON.parse(raw); } catch { return fallback; }
  }

  function loadHistory() {
    return safeParse(localStorage.getItem(STORE_KEY) || "{}", {});
  }

  function saveHistory(h) {
    localStorage.setItem(STORE_KEY, JSON.stringify(h));
  }

  function parseSetList(text) {
    return String(text || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
      .map(Number)
      .filter(n => Number.isFinite(n) && n > 0);
  }

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

  // -----------------------------
  // EXERCISES (edit freely)
  // -----------------------------
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

    // CONDITIONING (generator)
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

    return pool; // push/pull/legs/cardio = show all tagged
  }

  function renderWorkout(day, exercises) {
    const workoutDiv = $("workout");
    const logDiv = $("logArea");
    if (!workoutDiv || !logDiv) {
      alert("Missing #workout or #logArea in index.html");
      return;
    }

    const list = (exercises || []).filter(Boolean);
    workoutDiv.innerHTML = `<h3>${String(day).toUpperCase()} DAY</h3>`;
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

  // -----------------------------
  // EMOM TIMER (minute reset + 10s warning + rotate)
  // -----------------------------
  let emomInterval = null;
  let totalMinutes = 30;
  let minuteIndex = 0;   // 0..totalMinutes-1
  let secondsLeft = 60;  // countdown for the current minute
  let warned = false;

  const EMOM_SEQUENCE = ["Goblet Squats", "Rows", "Kettlebell Swings", "Pushups"];

  function setEmomExerciseLabel() {
    const ex = EMOM_SEQUENCE[minuteIndex % EMOM_SEQUENCE.length];
    $("timerExercise") && ($("timerExercise").textContent = ex);
  }

  function setEmomTimerText() {
    const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
    const ss = String(secondsLeft % 60).padStart(2, "0");
    $("timerDisplay") && ($("timerDisplay").textContent = `${mm}:${ss}`);
  }

  function beep(freq = 900, ms = 150) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.value = 0.12;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => osc.stop(), ms);
  }

  function startEmom() {
    if (emomInterval) return;

    const mins = Number($("timerMinutes")?.value) || 0;
    if (mins <= 0) return alert("Enter total minutes (e.g. 30).");
    totalMinutes = mins;

    $("timerStatus") && ($("timerStatus").textContent = "Running…");

    emomInterval = setInterval(() => {
      secondsLeft--;

      // 10-second warning
      if (secondsLeft === 10 && !warned) {
        warned = true;
        beep(600, 120);
      }

      // minute ended
      if (secondsLeft <= 0) {
        beep(950, 180);
        minuteIndex++;

        // finished?
        if (minuteIndex >= totalMinutes) {
          clearInterval(emomInterval);
          emomInterval = null;
          $("timerStatus") && ($("timerStatus").textContent = "Done ✅");
          // extra finish beeps
          setTimeout(() => beep(950, 180), 50);
          setTimeout(() => beep(950, 180), 250);
          return;
        }

        // reset next minute
        secondsLeft = 60;
        warned = false;
        setEmomExerciseLabel();
      }

      setEmomTimerText();
      $("timerStatus") && ($("timerStatus").textContent = `Running… minute ${Math.min(minuteIndex + 1, totalMinutes)}/${totalMinutes}`);
    }, 1000);
  }

  function pauseEmom() {
    clearInterval(emomInterval);
    emomInterval = null;
    $("timerStatus") && ($("timerStatus").textContent = "Paused");
  }

  function resetEmom() {
    pauseEmom();
    minuteIndex = 0;
    secondsLeft = 60;
    warned = false;
    setEmomExerciseLabel();
    setEmomTimerText();
    $("timerStatus") && ($("timerStatus").textContent = "");
  }

  // -----------------------------
  // INIT (single place wires everything)
  // -----------------------------
  function init() {
    // Workout generator wiring
    $("genBtn")?.addEventListener("click", () => {
      const choice = $("dayType")?.value || "auto";
      const day = (choice === "auto") ? nextDay() : choice;
      renderWorkout(day, pickWorkoutForDay(day));
    });

    $("resetCycleBtn")?.addEventListener("click", () => {
      localStorage.removeItem(LAST_DAY_KEY);
      alert("Rotation reset ✅");
    });

    // EMOM wiring
    setEmomExerciseLabel();
    setEmomTimerText();
    $("startTimer")?.addEventListener("click", startEmom);
    $("pauseTimer")?.addEventListener("click", pauseEmom);
    $("resetTimer")?.addEventListener("click", resetEmom);

    setStatus("ready ✅");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
