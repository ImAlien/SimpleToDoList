const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const storageKey = "simple-todo-tasks";
const fontSizeKey = "simple-todo-font-size";
const fontScales = { small: 0.92, standard: 1, large: 1.14, xlarge: 1.28 };
const now = new Date();
const toDateKey = (value) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const todayKey = toDateKey(now);
let activeView = "pending";
let calendarDate = new Date(now.getFullYear(), now.getMonth(), 1);
let selectedDate = todayKey;
const savedTasks = JSON.parse(localStorage.getItem(storageKey) || "null");
const legacyTasks = JSON.parse(localStorage.getItem("daymark-tasks") || "null");
let tasks = savedTasks || legacyTasks?.map((task) => ({
  id: task.id,
  title: task.title,
  done: Boolean(task.done),
  createdAt: task.createdAt || now.toISOString(),
  completedAt: task.done ? task.completedAt || task.createdAt || now.toISOString() : null,
})) || [
  { id: 1, title: "整理今天最重要的三件事", done: false, createdAt: now.toISOString() },
  { id: 2, title: "完成项目页面设计", done: false, createdAt: now.toISOString() },
  { id: 3, title: "喝杯水，休息五分钟", done: true, createdAt: now.toISOString(), completedAt: now.toISOString() },
];

const save = () => {
  localStorage.setItem(storageKey, JSON.stringify(tasks));
  fetch("/api/tasks", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tasks),
  }).catch(() => showToast("本地文件备份失败，请确认开发服务正在运行"));
};

async function loadTasksFromDisk() {
  try {
    const response = await fetch("/api/tasks");
    if (response.status === 404) {
      save();
      return;
    }
    if (!response.ok) throw new Error("Failed to load tasks");
    const diskTasks = await response.json();
    if (!Array.isArray(diskTasks)) throw new Error("Invalid task data");
    tasks = diskTasks.map(normalizeTask);
    localStorage.setItem(storageKey, JSON.stringify(tasks));
    render();
  } catch {
    showToast("未能读取本地备份，当前使用浏览器缓存");
  }
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

function normalizeTask(task) {
  return {
    ...task,
    date: task.date || toDateKey(task.createdAt || now),
    completedAt: task.done ? task.completedAt || task.createdAt || now.toISOString() : null,
  };
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function applyFontSize(size) {
  const selectedSize = fontScales[size] ? size : "standard";
  document.documentElement.style.setProperty("--font-scale", fontScales[selectedSize]);
  localStorage.setItem(fontSizeKey, selectedSize);
  $$("[data-font-size]").forEach((button) => button.classList.toggle("active", button.dataset.fontSize === selectedSize));
}

function render() {
  const pending = tasks.filter((task) => !task.done);
  const completed = tasks.filter((task) => task.done);
  const visibleTasks = activeView === "pending" ? pending : activeView === "completed" ? completed : [];
  const total = tasks.length;
  const progress = total ? Math.round((completed.length / total) * 100) : 0;

  $("#pendingCount").textContent = pending.length;
  $("#completedCount").textContent = completed.length;
  $("#calendarCount").textContent = tasks.filter((task) => task.date.startsWith(`${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, "0")}`)).length;
  $("#progressText").textContent = `${progress}%`;
  $("#progressBar").style.width = `${progress}%`;
  $("#progressHint").textContent = progress === 100 && total ? "今天的任务都完成了" : `已完成 ${completed.length} / ${total}`;
  $("#pageTitle").textContent = activeView === "pending" ? "将要做的" : activeView === "completed" ? "已经完成" : "日历";
  $("#listCaption").textContent = activeView === "pending" ? "待办事项" : "完成记录";
  $("#taskSummary").textContent = `${visibleTasks.length} 项`;
  $("#clearCompleted").classList.toggle("hidden", activeView !== "completed" || !completed.length);
  $("#listView").classList.toggle("hidden", activeView === "calendar");
  $("#calendarView").classList.toggle("hidden", activeView !== "calendar");

  $$(".pipeline-step").forEach((step) => step.classList.toggle("active", step.dataset.view === activeView));

  if (activeView !== "calendar") {
    $("#taskList").innerHTML = visibleTasks.length
      ? activeView === "completed" ? renderCompletedGroups(visibleTasks) : visibleTasks.map(renderTask).join("")
      : `<div class="empty-state"><strong>${activeView === "pending" ? "现在没有待办事项" : "还没有完成记录"}</strong><span>${activeView === "pending" ? "在上方写下一件准备做的事" : "完成的任务会出现在这里"}</span></div>`;
  }
  renderCalendar();

  bindTaskActions();
}

function renderTask(task) {
  return `
    <article class="task-item ${task.done ? "completed" : ""}">
      <button class="check-button" data-toggle="${task.id}" aria-label="${task.done ? "恢复任务" : "完成任务"}">${task.done ? "✓" : ""}</button>
      <div>
        <div class="task-title">${escapeHtml(task.title)}</div>
        <span class="task-time">${task.done ? `${formatRelativeDay(task.completedAt)} ${formatTime(task.completedAt)} 完成` : `${formatTaskDate(task.date)} · 添加于 ${formatTime(task.createdAt)}`}</span>
      </div>
      <button class="delete-button" data-delete="${task.id}" aria-label="删除任务">×</button>
    </article>`;
}

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  $("#calendarMonth").textContent = `${year} 年 ${month + 1} 月`;
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  const days = [];
  for (let index = 0; index < 42; index += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    const key = toDateKey(day);
    const count = tasks.filter((task) => task.date === key).length;
    days.push(`<button type="button" class="calendar-day ${day.getMonth() !== month ? "muted" : ""} ${key === todayKey ? "today" : ""} ${key === selectedDate ? "selected" : ""}" data-calendar-date="${key}">
      <span class="calendar-day-number">${day.getDate()}</span>
      ${count ? `<span class="calendar-day-count">${count}</span>` : ""}
    </button>`);
  }
  $("#calendarGrid").innerHTML = days.join("");
  const selectedTasks = tasks.filter((task) => task.date === selectedDate);
  $("#selectedDateTitle").textContent = formatFullDate(selectedDate);
  $("#selectedDateCount").textContent = `${selectedTasks.length} 项任务`;
  $("#calendarTaskList").innerHTML = selectedTasks.length
    ? selectedTasks.map(renderTask).join("")
    : `<div class="empty-state"><strong>这一天没有任务</strong><span>可以在待办页选择这个日期并添加任务</span></div>`;
  $$("[data-calendar-date]").forEach((button) => button.addEventListener("click", () => {
    selectedDate = button.dataset.calendarDate;
    renderCalendar();
    bindTaskActions();
  }));
  bindTaskActions();
}

function bindTaskActions() {
  $$("[data-toggle]").forEach((button) => button.onclick = () => toggleTask(Number(button.dataset.toggle)));
  $$("[data-delete]").forEach((button) => button.onclick = () => deleteTask(Number(button.dataset.delete)));
}

function renderCompletedGroups(completedTasks) {
  const groups = new Map();
  completedTasks
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
    .forEach((task) => {
      const label = formatRelativeDay(task.completedAt);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(task);
    });
  return [...groups.entries()].map(([label, groupTasks]) => `
    <section class="completed-group">
      <div class="completed-group-title"><span>${label}</span><b>${groupTasks.length} 项</b></div>
      <div class="completed-group-list">${groupTasks.map(renderTask).join("")}</div>
    </section>
  `).join("");
}

function formatTime(value) {
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatTaskDate(value) {
  if (value === todayKey) return "今天";
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function formatFullDate(value) {
  return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date(`${value}T12:00:00`));
}

function formatRelativeDay(value) {
  const target = new Date(value);
  const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const daysAgo = Math.round((currentDay - targetDay) / 86400000);
  if (daysAgo === 0) return "今天";
  if (daysAgo === 1) return "昨天";
  if (daysAgo === 2) return "前天";
  return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric" }).format(target);
}

function toggleTask(id) {
  tasks = tasks.map((task) => task.id === id
    ? { ...task, done: !task.done, completedAt: task.done ? null : new Date().toISOString() }
    : task);
  save();
  render();
}

function deleteTask(id) {
  tasks = tasks.filter((task) => task.id !== id);
  save();
  render();
  showToast("任务已删除");
}

$("#todayLabel").textContent = new Intl.DateTimeFormat("zh-CN", {
  month: "long",
  day: "numeric",
  weekday: "long",
}).format(now);

$("#quickAddForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("#taskInput");
  const title = input.value.trim();
  if (!title) {
    input.focus();
    return;
  }
  tasks.unshift({ id: Date.now(), title, date: $("#taskDate").value || todayKey, done: false, createdAt: new Date().toISOString(), completedAt: null });
  activeView = "pending";
  input.value = "";
  save();
  render();
  showToast("已添加到待办");
});

$$(".pipeline-step").forEach((step) => step.addEventListener("click", () => {
  activeView = step.dataset.view;
  render();
}));

$("#prevMonth").addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  render();
});

$("#nextMonth").addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  render();
});

$("#clearCompleted").addEventListener("click", () => {
  tasks = tasks.filter((task) => !task.done);
  save();
  render();
  showToast("已清空完成记录");
});

$("#fontSettingsButton").addEventListener("click", () => {
  const menu = $("#fontSettingsMenu");
  const isOpen = menu.classList.toggle("hidden") === false;
  $("#fontSettingsButton").classList.toggle("active", isOpen);
  $("#fontSettingsButton").setAttribute("aria-expanded", String(isOpen));
});

$$("[data-font-size]").forEach((button) => button.addEventListener("click", () => {
  applyFontSize(button.dataset.fontSize);
  showToast(`界面字号已调整为${button.textContent}`);
}));

document.addEventListener("click", (event) => {
  if (event.target.closest(".font-settings")) return;
  $("#fontSettingsMenu").classList.add("hidden");
  $("#fontSettingsButton").classList.remove("active");
  $("#fontSettingsButton").setAttribute("aria-expanded", "false");
});

applyFontSize(localStorage.getItem(fontSizeKey) || "standard");
$("#taskDate").value = todayKey;
tasks = tasks.map(normalizeTask);
render();
loadTasksFromDisk();
