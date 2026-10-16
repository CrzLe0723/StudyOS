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
      category: $("category").value, priority:"Medium", deadline:"", duration:30, done:false});
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
    $("plannerSummary").innerHTML = `<div class="stats" style="margin:20px 0 0"><div class="stat"><div class="stat-top">Active tasks</div><div class="stat-number">${active.length}</div></div><div class="stat"><div class="stat-top">With due dates</div><div class="stat-number">${dueSoon.length}</div></div><div class="stat"><div class="stat-top">Finished</div><div class="stat-number">${tasks.filter(t=>t.done).length}</div></div></div>`;
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
