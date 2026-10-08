let activeDay = "day1", activeStationIndex = 1, currentActiveSet = 1, timeRemaining = 30, timerInterval = null, totalCalculatedVolume = 0, isResting = true;
let activeProtocol = "nubret", totalTargetSets = 20, repsPerSet = 20;

const protocolDatabase = {
    nubret: { name: "Serge Nubret Density", sets: 20, reps: 20, rest: 30 },
    coleman: { name: "Ronnie Coleman Power", sets: 4, reps: 8, rest: 90 },
    ageless: { name: "Ageless Athlete Base", sets: 4, reps: 12, rest: 60 }
};

const routineDatabase = {
    day1: { name: "Day 1", stations: { s1: { name: "Band Chest Press", baseProfile: "black_band", baseMult: 45 }, s2: { name: "Band Anchor Pallof Press", baseProfile: "red_band", baseMult: 25 }, s3: { name: "Seated Shoulder Press", baseProfile: "red_band", baseMult: 25 }, s4: { name: "Band Tricep Pushdowns", baseProfile: "yellow_band", baseMult: 12 } } },
    day2: { name: "Day 2", stations: { s1: { name: "Seated Band Rows", baseProfile: "purple_band", baseMult: 60 }, s2: { name: "Band Pull-Aparts", baseProfile: "yellow_band", baseMult: 12 }, s3: { name: "Lat Pulldown (High Anchor)", baseProfile: "red_band", baseMult: 25 }, s4: { name: "Standing Bicep Curl", baseProfile: "red_band", baseMult: 25 } } },
    day3: { name: "Day 3", stations: { s1: { name: "Band Resisted Deadlift", baseProfile: "green_band", baseMult: 90 }, s2: { name: "Band Assisted/Loaded Squat", baseProfile: "purple_band", baseMult: 60 }, s3: { name: "Monster Walks", baseProfile: "red_band", baseMult: 25 }, s4: { name: "Standing Glute Kickbacks", baseProfile: "yellow_band", baseMult: 12 } } }
};

const safeguardRules = {
    "Band Chest Press": { joint: "shoulders", advice: "Shoulder AC warning triggered: Limit structural extension lines. Do not let your elbows slide past your chest midline at the bottom of the pressing path." },
    "Seated Shoulder Press": { joint: "shoulders", advice: "Active impingement warning: Pivot your hand positioning inward to a neutral grip (palms facing each other) to clear subacromial space lines." },
    "Band Anchor Pallof Press": { joint: "wrists", advice: "Wrist strain safeguard active: Loop the resistance strap around your forearms rather than clutching with fingers to bypass torque pressures." },
    "Band Tricep Pushdowns": { joint: "wrists", advice: "Flared carpal tunnel warning: Keep an open-palm pressing profile against the band loop hook setup instead of forcing tight thumb loops." },
    "Seated Band Rows": { joint: "back", advice: "Lumbar shield active: Lock down your core columns. Maintain a perfectly straight vertical chest wall block; do not lean or hinge your torso backwards under high density loading." },
    "Lat Pulldown (High Anchor)": { joint: "shoulders", advice: "Shoulder path safeguard: Drop the range lines slightly short of your chin line. Focus purely on pulling downward with the mid-back wing segments." },
    "Band Resisted Deadlift": { joint: "back", advice: "Lumbar flexion hazard: Step out of the band wrap lines if your spine rounds under fatigue. Switch instantly to unweighted hinge mechanics if stiffness locks up." },
    "Band Assisted/Loaded Squat": { joint: "knees", advice: "Patellar tracking shield active: Drive your heels hard into the floor surface and widen your knees tracking outward over your pinky toes." },
    "Monster Walks": { joint: "knees", advice: "Knee stability advisor: Maintain a micro-hinge alignment. Focus the tension fields entirely on your outer hip glute structures rather than shearing columns." }
};

let sessionTrackingState = {};
function initSessionTrackingState() {
    sessionTrackingState = {};
    Object.keys(routineDatabase).forEach(d => {
        sessionTrackingState[d] = {};
        for(let i=1; i<=4; i++) { sessionTrackingState[d]['s' + i] = { profile: routineDatabase[d].stations['s' + i].baseProfile, mult: routineDatabase[d].stations['s' + i].baseMult, failedForm: false, dropped: false, history: [] }; }
    });
}
initSessionTrackingState();

const countdownClock = document.getElementById('countdownClock'), targetSetLabel = document.getElementById('targetSetLabel'), prepInstructionsLabel = document.getElementById('prepInstructionsLabel'), sessionVolumeDisplay = document.getElementById('sessionVolumeDisplay'), alertBanner = document.getElementById('alertBanner'), dropModalOverlay = document.getElementById('dropModalOverlay'), modalOptionsContainer = document.getElementById('modalOptionsContainer'), skipRestBtn = document.getElementById('skipRestBtn'), addTimeBtn = document.getElementById('addTimeBtn'), daySelector = document.getElementById('daySelector'), clearCacheBtn = document.getElementById('clearCacheBtn'), protocolSelector = document.getElementById('protocolSelector'), strategyLabel = document.getElementById('strategyLabel');

function emitBeep(f, d) { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(), osc = ctx.createOscillator(), g = ctx.createGain(); osc.type = 'sine'; osc.frequency.value = f; g.gain.setValueAtTime(0.1, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d); osc.connect(g); g.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + d); } catch(e){} }
function saveState() { localStorage.setItem('ageless_athlete_session_v5', JSON.stringify({ activeDay, activeStationIndex, currentActiveSet, totalCalculatedVolume, activeProtocol, sessionTrackingState })); }

function loadState() {
    const raw = localStorage.getItem('ageless_athlete_session_v5'); if (!raw) return false;
    try {
        const p = JSON.parse(raw); activeDay = p.activeDay||"day1"; activeStationIndex = p.activeStationIndex||1; currentActiveSet = p.currentActiveSet||1; totalCalculatedVolume = p.totalCalculatedVolume||0; activeProtocol = p.activeProtocol||"nubret"; sessionTrackingState = p.sessionTrackingState||sessionTrackingState;
        totalTargetSets = protocolDatabase[activeProtocol].sets; repsPerSet = protocolDatabase[activeProtocol].reps;
        if(daySelector) daySelector.value = activeDay; if(protocolSelector) protocolSelector.value = activeProtocol;
        if(strategyLabel) strategyLabel.innerText = totalTargetSets + " Sets x " + repsPerSet + " Reps";
        return true;
    } catch(e) { return false; }
}

function executeJointSafeguardChecks() {
    const box = document.getElementById('jointSafeguardBox'); const label = document.getElementById('jointSafeguardText');
    if (!box || !label) return; if (activeStationIndex > 4) { box.style.display = 'none'; return; }
    const currentStationName = routineDatabase[activeDay].stations['s' + activeStationIndex].name; const rule = safeguardRules[currentStationName];
    const rawIntake = localStorage.getItem('ageless_athlete_intake');
    if (rule && rawIntake) {
        try {
            const p = JSON.parse(rawIntake);
            if (p.joints && p.joints[rule.joint] === true) { label.innerText = rule.advice; box.style.display = 'block'; return; }
        } catch(e) {}
    }
    box.style.display = 'none';
}

function syncUI() {
    for (let i = 1; i <= 4; i++) {
        const block = document.getElementById('block_station' + i); if (!block) continue;
        if (i === activeStationIndex) { block.classList.remove('inactive'); block.style.display = 'block'; } else { block.classList.add('inactive'); block.style.display = 'none'; }
    }
    const dayData = routineDatabase[activeDay];
    for (let i = 1; i <= 4; i++) {
        const d = dayData.stations['s' + i], s = sessionTrackingState[activeDay]['s' + i];
        const tEl = document.getElementById('s' + i + 'Title'), lEl = document.getElementById('s' + i + 'LoadLabel'), bT = document.getElementById('b' + i + 'Title'), bB = document.getElementById('s' + i + 'StatusBadge'), bL = document.getElementById('s' + i + 'LogText');
        if (tEl) tEl.innerText = d.name; if (lEl) lEl.innerText = s.dropped ? "📉 Dropped Tension" : s.profile.includes('choke') ? "⚙️ Choked Setup" : "⚡ Base Setup";
        if (bT) bT.innerText = d.name;
        if (bB && bL) {
            if (s.history.length >= totalTargetSets) { bB.innerText = (!s.failedForm && !s.dropped) ? "★ UPGRADED ★" : "BASE LOCKED"; bB.style.color = (!s.failedForm && !s.dropped) ? "var(--accent-green)" : "var(--accent-amber)"; bL.innerText = (!s.failedForm && !s.dropped) ? "Progression Unlocked!" : "Stabilizing Load."; }
            else { bB.innerText = "ACTIVE"; bB.style.color = "var(--accent-blue)"; bL.innerText = "Track clear reps."; }
        }
    }
    if(sessionVolumeDisplay) sessionVolumeDisplay.innerText = totalCalculatedVolume.toLocaleString() + ' lbs';
    if (activeStationIndex > 4) { targetSetLabel.innerText = "Protocols Conquered!"; prepInstructionsLabel.innerText = "Session complete."; executeJointSafeguardChecks(); return; }
    targetSetLabel.innerText = "Up Next: " + dayData.stations['s' + activeStationIndex].name + " Set " + currentActiveSet + " of " + totalTargetSets;
    prepInstructionsLabel.innerText = "Strategy Target: " + repsPerSet + " Repetitions"; renderMatrix(); executeJointSafeguardChecks();
}

function renderMatrix() {
    if (activeStationIndex > 4) return; const grid = document.getElementById('s' + activeStationIndex + 'MatrixGrid'); if (!grid) return; grid.innerHTML = '';
    const h = sessionTrackingState[activeDay]['s' + activeStationIndex].history;
    for (let i = 1; i <= totalTargetSets; i++) {
        const c = document.createElement('div'); c.classList.add('matrix-chip');
        if (h[i-1]) { c.classList.add(h[i-1].formClean ? 'done' : 'loose'); c.innerText = h[i-1].formClean ? '✓' : '✖'; }
        else if (i === currentActiveSet) { c.classList.add('active'); c.innerText = i; } else { c.innerText = i; } grid.appendChild(c);
    }
}

function switchViewTab(tabKey) {
    const sections = ['workout', 'intake', 'tension'];
    sections.forEach(s => {
        const sectionEl = document.getElementById('viewSection_' + s); const btnEl = document.getElementById('tabBtn_' + s);
        if (sectionEl) sectionEl.style.display = (s === tabKey) ? (s === 'workout' ? 'grid' : 'block') : 'none';
        if (btnEl) { if (s === tabKey) btnEl.classList.add('active'); else btnEl.classList.remove('active'); }
    });
    if (tabKey === 'workout') syncUI();
}

let mobileAudioContext = null;

function startTimer() {
    clearInterval(timerInterval); timeRemaining = protocolDatabase[activeProtocol].rest; isResting = true;
    const currentM = timeRemaining < 10 ? '0' + timeRemaining : timeRemaining; countdownClock.innerText = "0:" + currentM; skipRestBtn.innerText = "LOG SET & SKIP REST ▶";
    timerInterval = setInterval(() => {
        timeRemaining--; countdownClock.innerText = "0:" + (timeRemaining < 10 ? '0' + timeRemaining : timeRemaining);
        if (timeRemaining <= 5 && timeRemaining > 0) { countdownClock.classList.add('warning'); emitBeep(440, 0.08); }
        if (timeRemaining <= 0) { clearInterval(timerInterval); isResting = false; emitBeep(880, 0.25); countdownClock.innerText = "WORK"; countdownClock.classList.remove('warning'); alertBanner.innerHTML = "⚡ Perform reps now!"; skipRestBtn.innerText = "✓ LOG COMPLETED SET"; }
    }, 1000);
}

function handleLog() { 
    if (!mobileAudioContext) { try { mobileAudioContext = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } 
    else if (mobileAudioContext.state === 'suspended') { mobileAudioContext.resume(); }

    if (activeStationIndex > 4) { initSessionTrackingState(); totalCalculatedVolume = 0; activeStationIndex = 1; currentActiveSet = 1; saveState(); window.location.reload(); return; } 
    if (isResting) clearInterval(timerInterval); 
    const chk = document.getElementById('s' + activeStationIndex + 'FormCheckbox').checked; 
    const s = sessionTrackingState[activeDay]['s' + activeStationIndex]; 
    if (!chk) s.failedForm = true; 
    const h = s.history; 
    h[currentActiveSet - 1] = { setNum: currentActiveSet, formClean: chk }; 
    totalCalculatedVolume += (repsPerSet * s.mult); 
    if (currentActiveSet < totalTargetSets) { 
        currentActiveSet++; saveState(); renderMatrix(); syncUI(); startTimer(); 
    } else { 
        if (activeStationIndex < 4) { activeStationIndex++; currentActiveSet = 1; saveState(); syncUI(); clearInterval(timerInterval); isResting = false; countdownClock.innerText = "READY"; } 
        else { activeStationIndex++; countdownClock.innerText = "DONE"; skipRestBtn.innerText = "🔄 RESET PROTOCOLS"; saveState(); syncUI(); } 
    } 
}

function openModalSheet() { if (activeStationIndex > 4) return; clearInterval(timerInterval); modalOptionsContainer.innerHTML = '<div class="drop-card" onclick="selectDrop(\'choke\')"><h4>Micro-Drop (Choked Setup)</h4><p>Reduce resistance by 20%</p></div><div class="drop-card" onclick="selectDrop(\'drop\')"><h4>Linear Drop Tier</h4><p>Reduce resistance by 40%</p></div>'; dropModalOverlay.classList.add('open'); }
// Clear out automated timer restarts when closing modal sheets
function closeModalSheet() { dropModalOverlay.classList.remove('open'); }
function selectDrop(t) { const s = sessionTrackingState[activeDay]['s' + activeStationIndex]; s.dropped = true; s.mult = Math.max(8, Math.round(s.mult * (t === 'choke' ? 0.8 : 0.6))); syncUI(); closeModalSheet(); emitBeep(587.33, 0.15); clearInterval(timerInterval); isResting = false; countdownClock.innerText = "READY"; }

if (daySelector) { daySelector.addEventListener('change', (e) => { activeDay = e.target.value; activeStationIndex = 1; currentActiveSet = 1; totalCalculatedVolume = 0; clearInterval(timerInterval); isResting = false; countdownClock.innerText = "READY"; initSessionTrackingState(); saveState(); syncUI(); }); }

if (protocolSelector) {
    protocolSelector.addEventListener('change', (e) => {
        activeProtocol = e.target.value; totalTargetSets = protocolDatabase[activeProtocol].sets; repsPerSet = protocolDatabase[activeProtocol].reps;
        if(strategyLabel) strategyLabel.innerText = totalTargetSets + " Sets x " + repsPerSet + " Reps";
        activeStationIndex = 1; currentActiveSet = 1; totalCalculatedVolume = 0;
        clearInterval(timerInterval); isResting = false; countdownClock.innerText = "READY";
        initSessionTrackingState(); saveState(); syncUI(); 
    });
}

for (let i = 1; i <= 4; i++) { 
    const el = document.getElementById('s' + i + 'FormCheckbox'); 
    if (el) { 
        el.addEventListener('change', () => { 
            const ind = document.getElementById('s' + i + 'FormStatus'); 
            if (ind) { ind.innerText = el.checked ? "FORM: PERFECT ✔" : "FORM: FATIGUE ✖"; ind.style.color = el.checked ? "var(--accent-green)" : "var(--accent-amber)"; } 
        }); 
    } 
}

if (skipRestBtn) skipRestBtn.addEventListener('click', handleLog);
if (addTimeBtn) { addTimeBtn.addEventListener('click', () => { if (isResting && activeStationIndex <= 4) { timeRemaining += 10; countdownClock.innerText = "0:" + timeRemaining; emitBeep(330, 0.05); } }); }
if (clearCacheBtn) { clearCacheBtn.addEventListener('click', () => { localStorage.removeItem('ageless_athlete_session_v5'); initSessionTrackingState(); totalCalculatedVolume = 0; activeStationIndex = 1; currentActiveSet = 1; window.location.reload(); }); }

function saveIntakeData() {
    const intakeProfile = { ageGroup: document.getElementById('intake_age').value, layoffRange: document.getElementById('intake_layoff').value, joints: { shoulders: document.getElementById('joint_shoulders').checked, knees: document.getElementById('joint_knees').checked, back: document.getElementById('joint_back').checked, wrists: document.getElementById('joint_wrists').checked } };
    localStorage.setItem('ageless_athlete_intake', JSON.stringify(intakeProfile));
    const feedback = document.getElementById('intakeStatusFeedback'); if (feedback) { feedback.style.display = 'block'; setTimeout(() => { feedback.style.display = 'none'; }, 4000); }
    syncUI();
}

function loadIntakeData() {
    const raw = localStorage.getItem('ageless_athlete_intake'); if (!raw) return;
    try {
        const p = JSON.parse(raw);
        if (document.getElementById('intake_age')) document.getElementById('intake_age').value = p.ageGroup || '40-49';
        if (document.getElementById('intake_layoff')) document.getElementById('intake_layoff').value = p.layoffRange || 'active';
        if (p.joints) {
            if (document.getElementById('joint_shoulders')) document.getElementById('joint_shoulders').checked = !!p.joints.shoulders;
            if (document.getElementById('joint_knees')) document.getElementById('joint_knees').checked = !!p.joints.knees;
            if (document.getElementById('joint_back')) document.getElementById('joint_back').checked = !!p.joints.back;
            if (document.getElementById('joint_wrists')) document.getElementById('joint_wrists').checked = !!p.joints.wrists;
        }
    } catch(e) {}
}

loadState(); loadIntakeData(); syncUI();
if (activeStationIndex <= 4 && currentActiveSet === 1 && !sessionTrackingState[activeDay]['s1'].history.length) {
    clearInterval(timerInterval); isResting = false; countdownClock.innerText = "READY";
}

function triggerSessionReportCard() {
    clearInterval(timerInterval);
    isResting = false;
    
    const overlay = document.getElementById('sessionReportOverlay');
    if (!overlay) return;
    
    // Core Variable Setup
    const currentProtocolData = protocolDatabase[activeProtocol];
    const currentDayData = routineDatabase[activeDay];
    
    // 1. Calculate Calendar Timestamps
    const dateObj = new Date();
    const timestampEl = document.getElementById('reportTimestamp');
    if (timestampEl) {
        timestampEl.innerText = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + 
                                " @ " + dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }
    
    // 2. Map General Analytics Labels
    if (document.getElementById('reportProtocolName')) document.getElementById('reportProtocolName').innerText = currentProtocolData.name;
    if (document.getElementById('reportDayName')) document.getElementById('reportDayName').innerText = currentDayData.name;
    if (document.getElementById('reportTotalVolume')) document.getElementById('reportTotalVolume').innerText = totalCalculatedVolume.toLocaleString() + " lbs";
    
    // 3. Compute Cumulative Session Repetitions
    let totalRepsCount = 0;
    for (let i = 1; i <= 4; i++) {
        const historyArray = sessionTrackingState[activeDay]['s' + i].history;
        totalRepsCount += (historyArray.length * repsPerSet);
    }
    if (document.getElementById('reportTotalReps')) document.getElementById('reportTotalReps').innerText = totalRepsCount.toLocaleString() + " Reps";
    
    // 4. Generate Dynamically Formatted Exercise Lines
    const listContainer = document.getElementById('reportMovementList');
    if (listContainer) {
        listContainer.innerHTML = '';
        for (let i = 1; i <= 4; i++) {
            const data = currentDayData.stations['s' + i];
            const state = sessionTrackingState[activeDay]['s' + i];
            
            // Calculate clean sets vs form drops
            let cleanSets = 0;
            state.history.forEach(h => { if(h.formClean) cleanSets++; });
            
            const lineItem = document.createElement('div');
            lineItem.style.display = 'flex';
            lineItem.style.justifyContent = 'space-between';
            lineItem.style.borderBottom = '1px dashed #eee';
            lineItem.style.paddingBottom = '4px';
            
            const leftSideText = "• " + data.name;
            const rightSideText = cleanSets + "/" + totalTargetSets + " CLEAN SETS";
            
            lineItem.innerHTML = `<span style="color:#333;">${leftSideText}</span><span style="font-weight:700; color:${cleanSets === totalTargetSets ? '#30d158' : '#ff453a'};">${rightSideText}</span>`;
            listContainer.appendChild(lineItem);
        }
    }
    
    // 5. Open Modal Container Viewport
    overlay.style.display = 'flex';
}

function closeReportCardModal() {
    const overlay = document.getElementById('sessionReportOverlay');
    if (overlay) overlay.style.display = 'none';
    
    // Wipe background variables and reload structural engines cleanly for next workout
    localStorage.removeItem('ageless_athlete_session_v5');
    initSessionTrackingState();
    totalCalculatedVolume = 0;
    activeStationIndex = 1;
    currentActiveSet = 1;
    window.location.reload();
}

// Modify the old milestone evaluation block inside memory to trigger our new completion engine
const originalHandleLog = handleLog;
handleLog = function() {
    if (!mobileAudioContext) { try { mobileAudioContext = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } 
    else if (mobileAudioContext.state === 'suspended') { mobileAudioContext.resume(); }

    if (activeStationIndex > 4) { initSessionTrackingState(); totalCalculatedVolume = 0; activeStationIndex = 1; currentActiveSet = 1; saveState(); window.location.reload(); return; } 
    if (isResting) clearInterval(timerInterval); 
    
    const chk = document.getElementById('s' + activeStationIndex + 'FormCheckbox').checked; 
    const s = sessionTrackingState[activeDay]['s' + activeStationIndex]; 
    if (!chk) s.failedForm = true; 
    const h = s.history; 
    h[currentActiveSet - 1] = { setNum: currentActiveSet, formClean: chk }; 
    totalCalculatedVolume += (repsPerSet * s.mult); 
    
    if (currentActiveSet < totalTargetSets) { 
        currentActiveSet++; saveState(); renderMatrix(); syncUI(); startTimer(); 
    } else { 
        if (activeStationIndex < 4) { 
            activeStationIndex++; currentActiveSet = 1; saveState(); syncUI(); clearInterval(timerInterval); isResting = false; countdownClock.innerText = "READY"; 
        } else { 
            // 4th movement block successfully finished! Call report sheet:
            saveState(); 
            syncUI(); 
            triggerSessionReportCard(); 
        } 
    }
};
