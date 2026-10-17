  const KEY = "odelis-tasks-v1";
  const LEGACY_KEY = "studyos-tasks-v1";
  const $ = id => document.getElementById(id);
  let tasks = load();
  let filter = "All";

  function load() {
    try {
      const current = localStorage.getItem(KEY);
      const old = current === null ? localStorage.getItem(LEGACY_KEY) : null;
      const data = JSON.parse(current ?? old ?? "[]");
      return Array.isArray(data) ? data.filter(t => t && typeof t.id === "string" && typeof t.title === "string").map(t => ({
        id: t.id, title: t.title, category: ["School","Acadeca","Personal","Project","Other","Sports"].includes(t.category) ? t.category : "Other",
        priority: ["High","Medium","Low"].includes(t.priority) ? t.priority : "Medium",
        deadline: typeof t.deadline === "string" ? t.deadline : "",
        duration: Number.isFinite(Number(t.duration)) ? Number(t.duration) : 30,
        done: Boolean(t.done)
      })) : [];
    } catch { return []; }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(tasks)); return true; }
    catch { alert("Odelis could not save in this browser. Please export a backup before continuing."); return false; }
  }

  function todayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  }

  function overdue(t) { return !t.done && t.deadline && t.deadline < todayString(); }

  $("today").textContent = new Date().toLocaleDateString(undefined, {weekday:"long", month:"long", day:"numeric"});
  if (localStorage.getItem(KEY) === null && localStorage.getItem(LEGACY_KEY) !== null) save();

  $("taskForm").addEventListener("submit", e => {
    e.preventDefault();
    const title = $("title").value.trim();
    if (!title) return;
    tasks.push({id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random(), title,
      category: $("category").value, priority:$("priority").value, deadline:$("deadline").value, duration:30, done:false});
    if (save()) { e.target.reset(); filter = "All"; render(); $("title").focus(); }
  });

  $("filters").addEventListener("click", e => {
    const button = e.target.closest("[data-filter]");
    if (!button) return;
    filter = button.dataset.filter;
    render();
  });

  $("tasks").addEventListener("change", e => {
    const cb = e.target.closest("[data-check]");
    if (!cb) return;
    const task = tasks.find(t => t.id === cb.dataset.check);
    if (!task) return;
    task.done = cb.checked;
    if (save()) render();
  });

  $("tasks").addEventListener("click", e => {
    const btn = e.target.closest("[data-delete]");
    if (!btn) return;
    tasks = tasks.filter(t => t.id !== btn.dataset.delete);
    if (save()) render();
  });

  $("export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({version:1,tasks},null,2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "odelis-backup.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  $("importButton").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || !Array.isArray(data.tasks) || !data.tasks.every(t => t && typeof t.id === "string" && typeof t.title === "string")) throw new Error("Invalid backup");
      if (!confirm("Replace your current Odelis tasks with this backup?")) return;
      const previous = tasks;
      tasks = data.tasks.map(t => ({id:t.id,title:t.title,category:t.category || "Other",priority:t.priority || "Medium",deadline:t.deadline || "",duration:Number(t.duration) || 30,done:Boolean(t.done)}));
      if (!save()) tasks = previous;
      render();
    } catch { alert("That file doesn't look like a valid Odelis task backup."); }
    finally { e.target.value = ""; }
  });

  function render() {
    const today = todayString();
    const active = tasks.filter(t => !t.done);
    $("total").textContent = active.length;
    $("due").textContent = active.filter(t => t.deadline === today).length;
    $("completed").textContent = tasks.filter(t => t.done).length;

    document.querySelectorAll("[data-filter]").forEach(b => b.classList.toggle("active", b.dataset.filter === filter));
    const visible = tasks.filter(t => {
      if (filter === "Active") return !t.done;
      if (filter === "Completed") return t.done;
      if (filter === "Today") return !t.done && t.deadline === today;
      if (["School","Acadeca","Personal","Project","Other","Sports"].includes(filter)) return t.category === filter;
      return true;
    }).sort((a,b) => {
      if (a.done !== b.done) return Number(a.done)-Number(b.done);
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return 0;
    });

    $("tasks").innerHTML = visible.length ? visible.map(t => `
      <div class="task ${t.done ? "done" : ""}">
        <input class="task-check" type="checkbox" data-check="${esc(t.id)}" aria-label="Mark ${esc(t.title)} complete" ${t.done ? "checked" : ""}>
        <div class="task-info"><div class="task-title">${esc(t.title)}</div>
          <div class="task-meta"><span class="priority ${t.priority === "High" ? "high" : ""}">${esc(t.priority || "Medium")}</span>${esc(t.category || "Other")}${t.deadline ? " · Due " + esc(t.deadline) : ""}${overdue(t) ? " · Overdue" : ""}</div>
        </div>
        <button class="delete" data-delete="${esc(t.id)}" aria-label="Delete ${esc(t.title)}" title="Delete task">×</button>
      </div>`).join("") : `<div class="empty"><div class="empty-symbol">∿</div>${filter === "All" ? "Nothing here just yet. Add a task above to begin." : "No tasks match this view. Try another filter or add a task."}</div>`;

    const dueSoon = active.filter(t => t.deadline).sort((a,b) => a.deadline.localeCompare(b.deadline));
    $("plannerSummary").innerHTML = `<div class="stats" style="margin:20px 0 0"><div class="stat"><div class="stat-top">Active tasks</div><div class="stat-number">${active.length}</div></div><div class="stat"><div class="stat-top">Due today</div><div class="stat-number">${active.filter(t => t.deadline === today).length}</div></div><div class="stat"><div class="stat-top">Overdue</div><div class="stat-number">${active.filter(t => t.deadline && t.deadline < today).length}</div></div></div>`;

    const plannerView = $("plannerView").value;
    const plannerTasks = tasks.filter(t => plannerView === "all" ? true : plannerView === "completed" ? t.done : !t.done);
    plannerTasks.sort((a,b) => {
      if (a.done !== b.done) return Number(a.done)-Number(b.done);
      const ad = a.deadline || "9999-12-31";
      const bd = b.deadline || "9999-12-31";
      if (ad !== bd) return ad.localeCompare(bd);
      const rank = {High:0,Medium:1,Low:2};
      return (rank[a.priority] ?? 1) - (rank[b.priority] ?? 1);
    });
    $("plannerTasks").innerHTML = plannerTasks.length ? plannerTasks.map(t => `<div class="task ${t.done ? "done" : ""}"><input class="task-check" type="checkbox" data-check="${esc(t.id)}" aria-label="Mark ${esc(t.title)} complete" ${t.done ? "checked" : ""}><div class="task-info"><div class="task-title">${esc(t.title)}</div><div class="task-meta"><span class="priority ${t.priority === "High" ? "high" : ""}">${esc(t.priority || "Medium")}</span>${esc(t.category || "Other")}${t.deadline ? " · Due " + esc(t.deadline) : " · No due date"}${overdue(t) ? " · Overdue" : ""}</div></div><button class="delete" data-delete="${esc(t.id)}" aria-label="Delete ${esc(t.title)}" title="Delete task">×</button></div>`).join("") : `<div class="empty"><div class="empty-symbol">∿</div>${plannerView === "completed" ? "Completed tasks will appear here." : "Nothing to show yet. Add a task to begin planning."}</div>`;
  }

  function goTo(page) {
    document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.page === page));
    document.querySelectorAll(".page-panel").forEach(p => p.classList.toggle("active", p.id === "page-" + page));
    $("sectionLabel").textContent = ({overview:"Your workspace",planner:"Plan with intention",library:"Ideas & references",learning:"Your learning space"})[page] || "Your workspace";
    window.scrollTo({top:0,behavior:"smooth"});
  }
  document.querySelectorAll("[data-page]").forEach(b => b.addEventListener("click", () => goTo(b.dataset.page)));
  document.querySelectorAll("[data-goto]").forEach(b => b.addEventListener("click", () => goTo(b.dataset.goto)));
  $("focusButton").addEventListener("click", () => {
    const next = tasks.find(t => !t.done);
    alert(next ? "A possible next step:\n\n" + next.title + "\n\nGive it your attention, one step at a time." : "You have no active tasks right now. You can add one whenever you're ready.");
  });
  render();


// Notes & Library — kept locally in this browser, separate from task data.
const NOTES_KEY = "odelis-notes-v1";
let notes = loadNotes();
let noteFilter = "All";

function loadNotes() {
  try {
    const data = JSON.parse(localStorage.getItem(NOTES_KEY) || "[]");
    return Array.isArray(data) ? data.filter(n => n && typeof n.id === "string" && typeof n.title === "string").map(n => ({
      id: n.id,
      title: n.title.slice(0, 120),
      body: typeof n.body === "string" ? n.body.slice(0, 12000) : "",
      category: ["Ideas","School","Acadeca","Projects","Reading","Reference"].includes(n.category) ? n.category : "Ideas",
      pinned: Boolean(n.pinned),
      updatedAt: typeof n.updatedAt === "string" ? n.updatedAt : new Date().toISOString()
    })) : [];
  } catch { return []; }
}

function saveNotes() {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    return true;
  } catch {
    alert("Odelis could not save your notes in this browser. Please export a backup before continuing.");
    return false;
  }
}

function noteDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recently edited" : date.toLocaleDateString(undefined, {month:"short", day:"numeric", year:"numeric"});
}

function resetNoteForm() {
  $("noteForm").reset();
  $("noteId").value = "";
  $("noteEditorHeading").textContent = "Capture a thought";
  $("saveNoteButton").textContent = "Save note";
  $("cancelNoteEdit").hidden = true;
  $("noteSaveStatus").textContent = "";
}

function renderNotes() {
  const query = $("noteSearch").value.trim().toLocaleLowerCase();
  const visible = notes.filter(note => {
    const matchesFilter = noteFilter === "All" || (noteFilter === "Pinned" ? note.pinned : note.category === noteFilter);
    const haystack = [note.title, note.body, note.category].join(" ").toLocaleLowerCase();
    return matchesFilter && haystack.includes(query);
  }).sort((a,b) => Number(b.pinned)-Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));

  $("noteCount").textContent = `${notes.length} ${notes.length === 1 ? "note" : "notes"} saved · ${notes.filter(n => n.pinned).length} pinned`;
  document.querySelectorAll("[data-note-filter]").forEach(button => button.classList.toggle("active", button.dataset.noteFilter === noteFilter));

  $("notesList").innerHTML = visible.length ? visible.map(note => `
    <article class="note-card ${note.pinned ? "is-pinned" : ""}">
      <div class="note-card-top"><span class="note-category-chip">${esc(note.category)}</span><span class="note-date">${esc(noteDate(note.updatedAt))}</span></div>
      <h3 class="note-card-title">${esc(note.title)}</h3>
      <p class="note-card-body">${esc(note.body || "An empty page, ready for a thought.")}</p>
      <div class="note-card-actions">
        <button class="text-button" type="button" data-edit-note="${esc(note.id)}">Edit</button>
        <button class="text-button" type="button" data-pin-note="${esc(note.id)}">${note.pinned ? "Unpin" : "Pin"}</button>
        <button class="text-button note-delete" type="button" data-delete-note="${esc(note.id)}">Delete</button>
      </div>
    </article>`).join("") : `<div class="notes-empty"><div class="empty-symbol">∿</div><strong>${query || noteFilter !== "All" ? "No notes found." : "A little space for your ideas."}</strong><span>${query || noteFilter !== "All" ? "Try a different search or collection." : "Write your first note above. It will be here when you return on this device."}</span></div>`;
}

$("noteForm").addEventListener("submit", event => {
  event.preventDefault();
  const title = $("noteTitle").value.trim();
  if (!title) { $("noteTitle").focus(); return; }
  const existingId = $("noteId").value;
  const previous = notes;
  const existing = notes.find(n => n.id === existingId);
  const note = {
    id: existing ? existing.id : (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()),
    title,
    body: $("noteBody").value.trim(),
    category: $("noteCategory").value,
    pinned: $("notePinned").checked,
    updatedAt: new Date().toISOString()
  };
  notes = existing ? notes.map(n => n.id === existing.id ? note : n) : [note, ...notes];
  if (saveNotes()) {
    resetNoteForm();
    noteFilter = "All";
    $("noteSearch").value = "";
    renderNotes();
    $("noteSaveStatus").textContent = "Saved";
  } else { notes = previous; }
});

$("cancelNoteEdit").addEventListener("click", resetNoteForm);
$("noteSearch").addEventListener("input", renderNotes);
$("noteCollections").addEventListener("click", event => {
  const button = event.target.closest("[data-note-filter]");
  if (!button) return;
  noteFilter = button.dataset.noteFilter;
  renderNotes();
});

$("notesList").addEventListener("click", event => {
  const edit = event.target.closest("[data-edit-note]");
  const pin = event.target.closest("[data-pin-note]");
  const remove = event.target.closest("[data-delete-note]");
  if (edit) {
    const note = notes.find(n => n.id === edit.dataset.editNote);
    if (!note) return;
    $("noteId").value = note.id;
    $("noteTitle").value = note.title;
    $("noteBody").value = note.body;
    $("noteCategory").value = note.category;
    $("notePinned").checked = note.pinned;
    $("noteEditorHeading").textContent = "Edit your thought";
    $("saveNoteButton").textContent = "Update note";
    $("cancelNoteEdit").hidden = false;
    $("noteTitle").focus();
    document.querySelector(".library-editor").scrollIntoView({behavior:"smooth",block:"start"});
    return;
  }
  if (pin) {
    const previous = notes;
    notes = notes.map(n => n.id === pin.dataset.pinNote ? {...n, pinned:!n.pinned, updatedAt:new Date().toISOString()} : n);
    if (saveNotes()) renderNotes(); else notes = previous;
    return;
  }
  if (remove) {
    const note = notes.find(n => n.id === remove.dataset.deleteNote);
    if (!note || !confirm(`Delete “${note.title}”? This cannot be undone unless you have a backup.`)) return;
    const previous = notes;
    notes = notes.filter(n => n.id !== note.id);
    if (saveNotes()) renderNotes(); else notes = previous;
  }
});

$("exportNotes").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({version:1, exportedAt:new Date().toISOString(), notes}, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = "odelis-notes-backup.json"; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

$("importNotesButton").addEventListener("click", () => $("importNotesFile").click());
$("importNotesFile").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data || !Array.isArray(data.notes) || !data.notes.every(n => n && typeof n.id === "string" && typeof n.title === "string")) throw new Error("Invalid notes backup");
    if (!confirm("Replace your current Odelis notes with this backup?")) return;
    const previous = notes;
    notes = data.notes.map(n => ({
      id:n.id, title:n.title.slice(0,120), body:typeof n.body === "string" ? n.body.slice(0,12000) : "",
      category:["Ideas","School","Acadeca","Projects","Reading","Reference"].includes(n.category) ? n.category : "Ideas",
      pinned:Boolean(n.pinned), updatedAt:typeof n.updatedAt === "string" ? n.updatedAt : new Date().toISOString()
    }));
    if (saveNotes()) { resetNoteForm(); renderNotes(); } else { notes = previous; }
  } catch { alert("That file doesn't look like a valid Odelis notes backup."); }
  finally { event.target.value = ""; }
});

renderNotes();
