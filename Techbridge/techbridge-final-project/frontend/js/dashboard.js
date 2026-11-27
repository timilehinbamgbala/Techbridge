(() => {
  "use strict";

  const API_BASE = window.TECHBRIDGE_API_BASE || "";
  const HEALTH_CHECK_MS = 8000;
  const SEARCH_DELAY_MS = 250;

  const STATUS_LABELS = {
    completed: "Completed",
    "in-progress": "In Progress",
    "not-started": "Not Started"
  };

  const NEXT_STEP = {
    "not-started": { status: "in-progress", label: "Start Task", done: "started" },
    "in-progress": { status: "completed", label: "Mark as Completed", done: "marked as completed" }
  };

  const $ = (id) => document.getElementById(id);

  const el = {
    grid: $("taskGrid"),
    state: $("taskState"),
    count: $("taskCount"),
    chips: document.querySelectorAll("[data-filter]"),
    search: $("taskSearch"),
    hits: $("searchChallenges"),
    apiStatus: $("apiStatus"),
    apiStatusText: $("apiStatusText"),
    internStatus: $("internStatus"),
    currentTask: $("currentTask"),
    doneCount: $("doneCount"),
    totalCount: $("totalCount"),
    percent: $("percentValue"),
    bar: $("progressBar"),
    barFill: $("barFill"),
    statTotal: $("statTotal"),
    statDone: $("statDone"),
    statLeft: $("statLeft"),
    modal: $("taskModal"),
    modalBody: $("taskModalBody"),
    modalClose: $("taskModalClose"),
    toast: $("toast")
  };

  if (!el.grid) return;

  const state = {
    tasks: [],
    filter: "all",
    query: "",
    matchIds: null,
    challengeHits: [],
    searchFailed: false,
    loaded: false,
    loading: false,
    online: null
  };

  let lastTrigger = null;
  let modalToken = 0;
  let searchToken = 0;
  let searchTimer = null;
  let toastTimer = null;

  async function api(path, options) {
    let response;
    try {
      response = await fetch(API_BASE + path, options);
    } catch (networkError) {
      setOnline(false);
      const error = new Error("Unable to reach the server.");
      error.network = true;
      throw error;
    }

    let body = null;
    try {
      body = await response.json();
    } catch (parseError) {
      body = null;
    }

    if (!response.ok) {
      const error = new Error((body && body.error) || `Request failed (${response.status}).`);
      error.status = response.status;
      throw error;
    }

    setOnline(true);
    return body;
  }

  const getTasks = () => api("/api/tasks");
  const getTask = (id) => api(`/api/tasks/${id}`);
  const searchAll = (query) => api(`/api/search?q=${encodeURIComponent(query)}`);
  const updateTaskStatus = (id, status) =>
    api(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });

  function escapeHTML(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatPercent(done, total) {
    if (!total) return "0";
    return String(Math.round((done / total) * 1000) / 10);
  }

  function showToast(message, isError) {
    el.toast.textContent = message;
    el.toast.dataset.type = isError ? "error" : "success";
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.toast.hidden = true;
    }, 3500);
  }

  function setOnline(online) {
    const changed = state.online !== online;
    const wasOffline = state.online === false;
    state.online = online;

    el.apiStatus.dataset.state = online ? "online" : "offline";
    el.apiStatusText.textContent = online ? "Connected" : "Offline";

    if (changed && online && wasOffline && !state.loaded && !state.loading) {
      loadTasks();
    }
  }

  async function checkHealth() {
    if (document.hidden) return;
    try {
      const response = await fetch(API_BASE + "/api/health", { cache: "no-store" });
      setOnline(response.ok);
    } catch (error) {
      setOnline(false);
    }
  }

  function renderProgress() {
    const total = state.tasks.length;
    const done = state.tasks.filter((t) => t.status === "completed").length;
    const percent = formatPercent(done, total);

    el.doneCount.textContent = done;
    el.totalCount.textContent = total;
    el.percent.textContent = percent;
    el.statTotal.textContent = total;
    el.statDone.textContent = done;
    el.statLeft.textContent = total - done;
    el.barFill.style.width = percent + "%";
    el.bar.setAttribute("aria-valuenow", percent);

    let internStatus = "In Progress";
    if (total > 0 && done === total) internStatus = "Completed";
    else if (done === 0 && !state.tasks.some((t) => t.status === "in-progress")) internStatus = "Not Started";
    el.internStatus.textContent = internStatus;

    const current =
      state.tasks.find((t) => t.status === "in-progress") ||
      state.tasks.find((t) => t.status === "not-started");
    el.currentTask.textContent = current ? `Task ${current.id}, ${current.title}` : "All tasks completed";
  }

  function resetProgress() {
    el.doneCount.textContent = "-";
    el.totalCount.textContent = "-";
    el.percent.textContent = "0";
    el.statTotal.textContent = "-";
    el.statDone.textContent = "-";
    el.statLeft.textContent = "-";
    el.barFill.style.width = "0%";
    el.bar.setAttribute("aria-valuenow", "0");
    el.internStatus.textContent = "Unavailable";
    el.currentTask.textContent = "Unavailable";
  }

  function actionButtons(task) {
    const next = NEXT_STEP[task.status];
    const primary = next
      ? `<button type="button" class="btn btn-solid" data-action="advance" data-id="${task.id}" data-next="${next.status}" aria-label="${next.label} for Task ${task.id}">${next.label}</button>`
      : `<button type="button" class="btn btn-solid" disabled>Completed</button>`;
    return (
      `<button type="button" class="btn btn-ghost" data-action="view" data-id="${task.id}" aria-label="View Task ${task.id}: ${escapeHTML(task.title)}">View Task</button>` +
      primary
    );
  }

  const BLOB_A = '<svg class="ch-blob ch-blob-a" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><path d="M28.2,-44.5C36.5,-38.6,43,-30.6,41.6,-22.4C40.1,-14.1,30.6,-5.5,27.8,2.9C24.9,11.4,28.6,19.7,28.5,30.9C28.5,42.1,24.5,56.1,18.3,54.3C12.1,52.4,3.6,34.7,-7.9,29.9C-19.3,25.2,-33.7,33.4,-41.9,31.9C-50,30.4,-51.8,19,-54,7.5C-56.1,-4.1,-58.4,-15.9,-56.9,-28.7C-55.3,-41.5,-49.9,-55.3,-39.7,-60.3C-29.6,-65.4,-14.8,-61.6,-2.4,-57.9C10,-54.1,20,-50.3,28.2,-44.5Z" transform="translate(100 100)"/></svg>';
  const BLOB_B = '<svg class="ch-blob ch-blob-b" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><path d="M26.4,-42.2C35.7,-35.1,45.9,-30.3,57.4,-21.4C69,-12.5,82,0.6,83.7,14.4C85.4,28.2,75.8,42.8,63.3,52C50.9,61.3,35.6,65.2,21.7,65.3C7.8,65.4,-4.6,61.7,-12.2,53.9C-19.8,46,-22.7,34.1,-29.7,25.8C-36.7,17.5,-47.9,13,-50,6.4C-52.1,-0.1,-45.2,-8.8,-40.7,-18.6C-36.3,-28.5,-34.4,-39.6,-28.1,-48C-21.7,-56.4,-10.8,-62.2,-1.2,-60.4C8.5,-58.6,17.1,-49.2,26.4,-42.2Z" transform="translate(100 100)"/></svg>';
  const PEEK_FLAG = '<svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 6V40" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M12 8H35L29 16L35 24H12Z" fill="currentColor"/></svg>';
  const GLYPH = '<svg class="ch-glyph" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="6" width="32" height="36" rx="4"/><path d="M16 18l4 4 8-8M16 32h16"/></svg>';

  function cardTemplate(task, index) {
    const status = escapeHTML(task.status);
    return (
      `<div class="ch-item task-item" data-status="${status}">` +
        `<div class="ch-peek" aria-hidden="true">${PEEK_FLAG}</div>` +
        `<article class="ch-card task-card" data-status="${status}" style="animation-delay:${index * 40}ms">` +
          `<div class="ch-blobs" aria-hidden="true">${BLOB_A}${BLOB_B}</div>` +
          GLYPH +
          `<div class="task-card-top">` +
            `<p class="task-card-no">Task ${task.id}</p>` +
            `<p class="status-badge" data-status="${status}">${escapeHTML(STATUS_LABELS[task.status] || task.status)}</p>` +
          `</div>` +
          `<h3>${escapeHTML(task.title)}</h3>` +
          `<p class="task-card-desc">${escapeHTML(task.description)}</p>` +
          `<div class="task-card-actions">${actionButtons(task)}</div>` +
        `</article>` +
      `</div>`
    );
  }

  function initCardEffects() {
    if (!window.matchMedia("(hover: hover)").matches) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const grid = el.grid;

    const rangify = (value, percent) => {
      const numerator = percent >= 0.5 ? percent - 0.5 : (0.5 - percent) * -1;
      return value * (numerator / 0.5);
    };
    const clamp = (min, value, max) => Math.min(Math.max(min, value), max);

    function pulse(element, name, duration, delay) {
      const run = () => {
        element.classList.remove(name);
        element.classList.add(name);
        setTimeout(() => element.classList.remove(name), duration);
      };
      if (delay) setTimeout(run, delay);
      else run();
    }

    grid.addEventListener("mousemove", (e) => {
      const item = e.target.closest(".ch-item");
      if (!item) return;

      const rect = item.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const xPercent = mouseX / rect.width;
      const yPercent = (e.clientY - rect.top) / rect.height;

      if (!reduceMotion) {
        item.classList.remove("is-settling");
        item.style.transform =
          "perspective(1000px) rotateX(" + rangify(6, yPercent) + "deg) rotateY(" + rangify(-6, xPercent) + "deg) scale(1.02)";
      }

      const peek = item.querySelector(".ch-peek");
      if (peek) {
        const x = clamp(12, mouseX - peek.offsetWidth / 2, item.offsetWidth - peek.offsetWidth - 12);
        peek.style.transform = "translateX(" + x + "px)";
      }
    });

    grid.addEventListener("mouseout", (e) => {
      const item = e.target.closest(".ch-item");
      if (!item || item.contains(e.relatedTarget)) return;
      item.classList.add("is-settling");
      item.style.transform = "";
      setTimeout(() => item.classList.remove("is-settling"), 450);
    });

    grid.addEventListener("mouseup", (e) => {
      const item = e.target.closest(".ch-item");
      if (!item) return;
      if (!item.classList.contains("selected") && !item.classList.contains("chef-reappear")) {
        pulse(item, "selected", 800);
        pulse(item, "chef-reappear", 250, 800);
      }
    });
  }

  function visibleTasks() {
    return state.tasks.filter(
      (t) =>
        (state.filter === "all" || t.status === state.filter) &&
        (!state.matchIds || state.matchIds.has(t.id))
    );
  }

  function renderChallengeHits() {
    if (!state.query) {
      el.hits.hidden = true;
      el.hits.innerHTML = "";
      return;
    }

    if (state.searchFailed) {
      el.hits.innerHTML = "<h3>Matching challenges</h3><p>Search is unavailable right now. Please try again.</p>";
      el.hits.hidden = false;
      return;
    }

    if (state.challengeHits.length === 0) {
      el.hits.hidden = true;
      el.hits.innerHTML = "";
      return;
    }

    el.hits.innerHTML =
      "<h3>Matching challenges</h3><ul>" +
      state.challengeHits
        .map(
          (c) =>
            `<li><a href="challenges.html#${encodeURIComponent(c.id)}"><strong>${escapeHTML(c.title)}</strong>` +
            `<span>${escapeHTML(c.track)} · ${escapeHTML(c.level)}</span></a></li>`
        )
        .join("") +
      "</ul>";
    el.hits.hidden = false;
  }

  function renderTasks() {
    const list = visibleTasks();

    el.grid.innerHTML = list.map(cardTemplate).join("");
    el.grid.hidden = false;
    renderChallengeHits();

    if (list.length === 0) {
      const searching = state.query && !state.searchFailed;
      if (searching && state.challengeHits.length === 0) {
        showState("empty", "<h3>No matching results found.</h3><p>Try a different word, or clear the search to see all tasks.</p>");
      } else if (searching) {
        hideState();
      } else {
        const label = STATUS_LABELS[state.filter] || "";
        showState(
          "empty",
          "<h3>No tasks here yet</h3>" +
            `<p>You have no tasks marked <strong>${escapeHTML(label)}</strong>. Pick another filter to see more.</p>`
        );
      }
    } else {
      hideState();
    }

    el.count.textContent = `Showing ${list.length} of ${state.tasks.length} tasks`;
  }

  function showState(type, html) {
    el.state.dataset.type = type;
    el.state.innerHTML = html;
    el.state.hidden = false;
  }

  function hideState() {
    el.state.hidden = true;
    el.state.innerHTML = "";
  }

  function showLoading() {
    el.grid.hidden = true;
    el.grid.innerHTML = "";
    el.hits.hidden = true;
    el.count.textContent = "";
    showState("loading", '<span class="spinner" aria-hidden="true"></span><p>Loading tasks...</p>');
  }

  function showError() {
    el.grid.hidden = true;
    el.grid.innerHTML = "";
    el.hits.hidden = true;
    el.count.textContent = "";
    showState(
      "error",
      "<h3>Unable to load tasks.</h3>" +
        "<p>Please check your connection or try again.</p>" +
        '<button type="button" class="btn btn-solid" id="retryButton">Try again</button>'
    );
  }

  async function loadTasks() {
    if (state.loading) return;
    state.loading = true;
    showLoading();

    try {
      state.tasks = await getTasks();
      state.loaded = true;
      renderProgress();
      renderTasks();
      if (state.query) runSearch(state.query);
    } catch (error) {
      state.loaded = false;
      state.tasks = [];
      resetProgress();
      showError();
    } finally {
      state.loading = false;
    }
  }

  async function runSearch(query) {
    const token = ++searchToken;

    if (!query) {
      state.matchIds = null;
      state.challengeHits = [];
      state.searchFailed = false;
      if (state.loaded) renderTasks();
      return;
    }

    try {
      const result = await searchAll(query);
      if (token !== searchToken) return;
      state.matchIds = new Set(result.tasks.map((t) => t.id));
      state.challengeHits = result.challenges;
      state.searchFailed = false;
    } catch (error) {
      if (token !== searchToken) return;
      state.matchIds = null;
      state.challengeHits = [];
      state.searchFailed = true;
    }

    if (state.loaded) renderTasks();
  }

  async function advanceTask(id, nextStatus, button) {
    const previous = state.tasks.find((t) => t.id === id);
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "Saving...";

    try {
      const updated = await updateTaskStatus(id, nextStatus);
      const index = state.tasks.findIndex((t) => t.id === updated.id);
      if (index !== -1) state.tasks[index] = updated;

      renderProgress();
      renderTasks();
      const verb = previous && NEXT_STEP[previous.status] ? NEXT_STEP[previous.status].done : "updated";
      showToast(`Task ${updated.id} ${verb}.`, false);
      return updated;
    } catch (error) {
      button.disabled = false;
      button.textContent = original;
      showToast(
        error.network
          ? "Could not save. The backend is offline, so nothing was changed."
          : error.message,
        true
      );
      return null;
    }
  }

  function modalContent(task) {
    const next = NEXT_STEP[task.status];
    return (
      `<div class="ch-modal-meta">` +
        `<p class="ch-track">Task ${task.id}</p>` +
        `<p class="status-badge" data-status="${escapeHTML(task.status)}">${escapeHTML(STATUS_LABELS[task.status] || task.status)}</p>` +
      `</div>` +
      `<h2 id="taskModalTitle">${escapeHTML(task.title)}</h2>` +
      `<section><h3>Description</h3><p>${escapeHTML(task.description)}</p></section>` +
      `<div class="ch-facts">` +
        `<div><strong>${escapeHTML(task.difficulty || "Not set")}</strong><span>Difficulty</span></div>` +
        `<div><strong>${escapeHTML(STATUS_LABELS[task.status] || task.status)}</strong><span>Status</span></div>` +
        `<div><strong>Task ${task.id} of ${state.tasks.length || 8}</strong><span>Position</span></div>` +
      `</div>` +
      `<div class="task-modal-actions">` +
        (next
          ? `<button type="button" class="btn btn-solid" data-modal-advance="${task.id}" data-next="${next.status}">${next.label}</button>`
          : `<button type="button" class="btn btn-solid" disabled>Completed</button>`) +
      `</div>`
    );
  }

  async function openTask(id, trigger) {
    const token = ++modalToken;
    lastTrigger = trigger;

    el.modalBody.innerHTML = '<div class="dash-state" data-type="loading"><span class="spinner" aria-hidden="true"></span><p>Loading task...</p></div>';
    el.modal.querySelector(".ch-modal-inner").scrollTop = 0;
    document.body.classList.add("ch-locked");
    if (!el.modal.open) el.modal.showModal();

    try {
      const task = await getTask(id);
      if (token !== modalToken) return;
      el.modalBody.innerHTML = modalContent(task);
    } catch (error) {
      if (token !== modalToken) return;
      el.modalBody.innerHTML =
        '<div class="dash-state" data-type="error">' +
        "<h3>Unable to load this task.</h3>" +
        `<p>${error.network ? "Please check your connection or try again." : escapeHTML(error.message)}</p>` +
        "</div>";
    }
  }

  el.grid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) return;
    const id = Number(button.dataset.id);

    if (button.dataset.action === "view") openTask(id, button);
    if (button.dataset.action === "advance") advanceTask(id, button.dataset.next, button);
  });

  el.state.addEventListener("click", (event) => {
    if (event.target.closest("#retryButton")) {
      checkHealth();
      loadTasks();
    }
  });

  el.chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      state.filter = chip.dataset.filter;
      el.chips.forEach((c) => c.setAttribute("aria-pressed", c === chip ? "true" : "false"));
      if (state.loaded) renderTasks();
    });
  });

  el.search.addEventListener("input", () => {
    state.query = el.search.value.trim();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => runSearch(state.query), SEARCH_DELAY_MS);
  });

  el.modalBody.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-modal-advance]");
    if (!button) return;
    const id = Number(button.dataset.modalAdvance);
    const updated = await advanceTask(id, button.dataset.next, button);
    if (updated) el.modalBody.innerHTML = modalContent(updated);
  });

  el.modalClose.addEventListener("click", () => el.modal.close());

  el.modal.addEventListener("click", (event) => {
    if (event.target === el.modal) el.modal.close();
  });

  el.modal.addEventListener("close", () => {
    modalToken++;
    document.body.classList.remove("ch-locked");
    if (lastTrigger && document.body.contains(lastTrigger)) lastTrigger.focus();
  });

  initCardEffects();
  loadTasks();
  setInterval(checkHealth, HEALTH_CHECK_MS);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) checkHealth();
  });
})();
