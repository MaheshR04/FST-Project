/**
 * Student Task Manager - Frontend Controller
 * Technologies: HTML5, CSS3, ES6 JavaScript, Fetch API
 */

// Application State
const state = {
  tasks: [],
  filters: {
    status: '',
    priority: '',
    search: '',
    sortBy: 'dueDate',
    order: 'asc'
  },
  editingTaskId: null,
  deletingTaskId: null
};

// DOM Element References
const elements = {
  tasksGrid: document.getElementById('tasksGrid'),
  loadingState: document.getElementById('loadingState'),
  emptyState: document.getElementById('emptyState'),
  taskCountBadge: document.getElementById('taskCountBadge'),
  taskListTitle: document.getElementById('taskListTitle'),

  // Stats
  statTotal: document.getElementById('statTotal'),
  statPending: document.getElementById('statPending'),
  statCompleted: document.getElementById('statCompleted'),
  statHighPriority: document.getElementById('statHighPriority'),
  dbStatusText: document.getElementById('dbStatusText'),
  dbStatusBadge: document.getElementById('dbStatusBadge'),

  // Filters & Controls
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  statusFilterTabs: document.getElementById('statusFilterTabs'),
  priorityFilter: document.getElementById('priorityFilter'),
  sortSelect: document.getElementById('sortSelect'),

  // Task Modal
  taskModal: document.getElementById('taskModal'),
  modalHeading: document.getElementById('modalHeading'),
  taskForm: document.getElementById('taskForm'),
  taskIdInput: document.getElementById('taskIdInput'),
  taskTitleInput: document.getElementById('taskTitleInput'),
  taskSubjectInput: document.getElementById('taskSubjectInput'),
  taskDueDateInput: document.getElementById('taskDueDateInput'),
  taskPriorityInput: document.getElementById('taskPriorityInput'),
  taskStatusInput: document.getElementById('taskStatusInput'),
  taskDescInput: document.getElementById('taskDescInput'),
  charCount: document.getElementById('charCount'),
  submitBtnText: document.getElementById('submitBtnText'),
  submitSpinner: document.getElementById('submitSpinner'),
  saveTaskSubmitBtn: document.getElementById('saveTaskSubmitBtn'),
  openCreateModalBtn: document.getElementById('openCreateModalBtn'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  cancelModalBtn: document.getElementById('cancelModalBtn'),
  emptyCreateBtn: document.getElementById('emptyCreateBtn'),

  // Delete Modal
  deleteModal: document.getElementById('deleteModal'),
  deleteTaskTitle: document.getElementById('deleteTaskTitle'),
  cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
  confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),

  // Errors & Toasts
  titleError: document.getElementById('titleError'),
  subjectError: document.getElementById('subjectError'),
  dateError: document.getElementById('dateError'),
  toastContainer: document.getElementById('toastContainer')
};

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  checkHealth();
  fetchStats();
  fetchTasks();
  setDefaultDueDate();
});

function setDefaultDueDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const yyyy = tomorrow.getFullYear();
  const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const dd = String(tomorrow.getDate()).padStart(2, '0');
  elements.taskDueDateInput.value = `${yyyy}-${mm}-${dd}`;
}

// ==========================================================================
// API Interaction Functions (Fetch API)
// ==========================================================================

// Check Backend & Database Health
async function checkHealth() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    if (data.database === 'connected') {
      elements.dbStatusText.textContent = 'MongoDB Atlas Connected';
      elements.dbStatusBadge.style.color = '#065f46';
      elements.dbStatusBadge.style.backgroundColor = '#ecfdf5';
      elements.dbStatusBadge.style.borderColor = '#a7f3d0';
    } else {
      elements.dbStatusText.textContent = 'MongoDB Connecting...';
      elements.dbStatusBadge.style.color = '#92400e';
      elements.dbStatusBadge.style.backgroundColor = '#fef3c7';
      elements.dbStatusBadge.style.borderColor = '#fcd34d';
    }
  } catch (err) {
    elements.dbStatusText.textContent = 'Backend Offline';
    elements.dbStatusBadge.style.color = '#991b1b';
    elements.dbStatusBadge.style.backgroundColor = '#fee2e2';
    elements.dbStatusBadge.style.borderColor = '#fca5a5';
  }
}

// Fetch Summary Statistics
async function fetchStats() {
  try {
    const res = await fetch('/api/tasks/stats');
    const result = await res.json();
    if (result.success) {
      elements.statTotal.textContent = result.data.total;
      elements.statPending.textContent = result.data.pending;
      elements.statCompleted.textContent = result.data.completed;
      elements.statHighPriority.textContent = result.data.highPriorityPending;
    }
  } catch (err) {
    console.error('Failed to fetch stats:', err);
  }
}

// Fetch Tasks with filters & sorting
async function fetchTasks() {
  showLoading(true);
  try {
    const params = new URLSearchParams();
    if (state.filters.status) params.append('status', state.filters.status);
    if (state.filters.priority) params.append('priority', state.filters.priority);
    if (state.filters.search) params.append('search', state.filters.search);
    if (state.filters.sortBy) params.append('sortBy', state.filters.sortBy);
    if (state.filters.order) params.append('order', state.filters.order);

    const res = await fetch(`/api/tasks?${params.toString()}`);
    const result = await res.json();

    if (result.success) {
      state.tasks = result.data;
      renderTasks(state.tasks);
    } else {
      showToast(result.message || 'Error fetching tasks', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to task server', 'error');
  } finally {
    showLoading(false);
  }
}

// Create or Update Task via Form
async function handleFormSubmit(e) {
  e.preventDefault();
  if (!validateForm()) return;

  const payload = {
    title: elements.taskTitleInput.value.trim(),
    subject: elements.taskSubjectInput.value.trim(),
    dueDate: elements.taskDueDateInput.value,
    priority: elements.taskPriorityInput.value,
    status: elements.taskStatusInput.value,
    description: elements.taskDescInput.value.trim()
  };

  setSubmitting(true);

  try {
    const isEdit = Boolean(state.editingTaskId);
    const url = isEdit ? `/api/tasks/${state.editingTaskId}` : '/api/tasks';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (result.success) {
      showToast(isEdit ? 'Task updated successfully!' : 'Task created successfully!', 'success');
      closeTaskModal();
      fetchTasks();
      fetchStats();
    } else {
      showToast(result.message || 'Failed to save task', 'error');
    }
  } catch (err) {
    showToast('Network error while saving task', 'error');
  } finally {
    setSubmitting(false);
  }
}

// Quick Toggle Task Status (Completed <-> Pending)
async function toggleTaskStatus(taskId) {
  try {
    const res = await fetch(`/api/tasks/${taskId}/toggle`, {
      method: 'PATCH'
    });
    const result = await res.json();

    if (result.success) {
      showToast(result.message, 'info');
      fetchTasks();
      fetchStats();
    } else {
      showToast(result.message || 'Status toggle failed', 'error');
    }
  } catch (err) {
    showToast('Error toggling task status', 'error');
  }
}

// Delete Task Confirmation Execution
async function executeDeleteTask() {
  if (!state.deletingTaskId) return;

  try {
    const res = await fetch(`/api/tasks/${state.deletingTaskId}`, {
      method: 'DELETE'
    });
    const result = await res.json();

    if (result.success) {
      showToast('Task deleted successfully', 'success');
      closeDeleteModal();
      fetchTasks();
      fetchStats();
    } else {
      showToast(result.message || 'Failed to delete task', 'error');
    }
  } catch (err) {
    showToast('Network error while deleting task', 'error');
  }
}

// ==========================================================================
// Rendering Logic
// ==========================================================================

function renderTasks(tasks) {
  elements.tasksGrid.innerHTML = '';
  elements.taskCountBadge.textContent = `${tasks.length} task${tasks.length === 1 ? '' : 's'}`;

  // Update dynamic heading based on active filter
  if (state.filters.status === 'Pending') {
    elements.taskListTitle.textContent = 'Pending Tasks & Deadlines';
  } else if (state.filters.status === 'Completed') {
    elements.taskListTitle.textContent = 'Completed Tasks';
  } else {
    elements.taskListTitle.textContent = 'All Assignments & Tasks';
  }

  if (tasks.length === 0) {
    elements.emptyState.style.display = 'flex';
    elements.tasksGrid.style.display = 'none';
    return;
  }

  elements.emptyState.style.display = 'none';
  elements.tasksGrid.style.display = 'grid';

  tasks.forEach((task) => {
    const card = createTaskCardElement(task);
    elements.tasksGrid.appendChild(card);
  });
}

function createTaskCardElement(task) {
  const card = document.createElement('div');
  const isCompleted = task.status === 'Completed';
  card.className = `task-card ${isCompleted ? 'is-completed' : ''}`;

  // Priority badge styling
  const priorityClass = `badge-priority-${task.priority.toLowerCase()}`;
  const priorityIcon = task.priority === 'High' ? '🔴' : task.priority === 'Medium' ? '🟡' : '🟢';

  // Due date computation
  const dueDateObj = new Date(task.dueDate);
  const formattedDate = dueDateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const relativeDue = getRelativeDueString(dueDateObj, isCompleted);

  // Status badge styling
  const statusBadge = isCompleted
    ? `<span class="badge badge-status-completed">✓ Completed</span>`
    : `<span class="badge badge-status-pending">⏳ Pending</span>`;

  card.innerHTML = `
    <div class="card-header-row">
      <label class="custom-checkbox" title="${isCompleted ? 'Mark as Pending' : 'Mark as Completed'}">
        <input type="checkbox" ${isCompleted ? 'checked' : ''} data-toggle-id="${task._id}">
        <span class="checkbox-visual">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </span>
      </label>

      <div class="task-heading-area">
        <h3 class="task-title">${escapeHTML(task.title)}</h3>
        ${task.description ? `<p class="task-description">${escapeHTML(task.description)}</p>` : ''}
      </div>
    </div>

    <div class="card-badges-row">
      <span class="badge badge-subject">
        📚 ${escapeHTML(task.subject)}
      </span>
      <span class="badge ${priorityClass}">
        ${priorityIcon} ${task.priority} Priority
      </span>
      ${statusBadge}
    </div>

    <div class="card-footer-row">
      <div class="due-indicator ${relativeDue.isOverdue ? 'overdue' : ''}">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <span>${relativeDue.text} (${formattedDate})</span>
      </div>

      <div class="card-action-btns">
        <button class="icon-btn edit-btn" title="Edit Task" data-edit-id="${task._id}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="icon-btn delete-btn" title="Delete Task" data-delete-id="${task._id}" data-delete-title="${escapeHTML(task.title)}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  `;

  // Attach card event listeners
  const checkbox = card.querySelector('input[type="checkbox"]');
  checkbox.addEventListener('change', () => toggleTaskStatus(task._id));

  const editBtn = card.querySelector('.edit-btn');
  editBtn.addEventListener('click', () => openEditModal(task));

  const deleteBtn = card.querySelector('.delete-btn');
  deleteBtn.addEventListener('click', () => openDeleteModal(task._id, task.title));

  return card;
}

// Due date relative text helper
function getRelativeDueString(date, isCompleted) {
  if (isCompleted) {
    return { text: 'Completed', isOverdue: false };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const diffTime = target - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: `Overdue by ${Math.abs(diffDays)}d`, isOverdue: true };
  } else if (diffDays === 0) {
    return { text: 'Due Today', isOverdue: false };
  } else if (diffDays === 1) {
    return { text: 'Due Tomorrow', isOverdue: false };
  } else {
    return { text: `Due in ${diffDays} days`, isOverdue: false };
  }
}

// ==========================================================================
// Modal Handlers
// ==========================================================================

function openCreateModal() {
  state.editingTaskId = null;
  elements.modalHeading.textContent = 'Add New Task';
  elements.submitBtnText.textContent = 'Create Task';
  elements.taskForm.reset();
  elements.taskIdInput.value = '';
  elements.charCount.textContent = '0';
  clearErrors();
  setDefaultDueDate();
  elements.taskPriorityInput.value = 'Medium';
  elements.taskStatusInput.value = 'Pending';
  elements.taskModal.classList.add('active');
  elements.taskModal.setAttribute('aria-hidden', 'false');
  elements.taskTitleInput.focus();
}

function openEditModal(task) {
  state.editingTaskId = task._id;
  elements.modalHeading.textContent = 'Edit Task';
  elements.submitBtnText.textContent = 'Save Changes';
  clearErrors();

  elements.taskIdInput.value = task._id;
  elements.taskTitleInput.value = task.title;
  elements.taskSubjectInput.value = task.subject;

  // Format date to YYYY-MM-DD for date input
  const d = new Date(task.dueDate);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  elements.taskDueDateInput.value = `${yyyy}-${mm}-${dd}`;

  elements.taskPriorityInput.value = task.priority;
  elements.taskStatusInput.value = task.status;
  elements.taskDescInput.value = task.description || '';
  elements.charCount.textContent = (task.description || '').length;

  elements.taskModal.classList.add('active');
  elements.taskModal.setAttribute('aria-hidden', 'false');
  elements.taskTitleInput.focus();
}

function closeTaskModal() {
  elements.taskModal.classList.remove('active');
  elements.taskModal.setAttribute('aria-hidden', 'true');
  state.editingTaskId = null;
}

function openDeleteModal(taskId, title) {
  state.deletingTaskId = taskId;
  elements.deleteTaskTitle.textContent = `"${title}"`;
  elements.deleteModal.classList.add('active');
  elements.deleteModal.setAttribute('aria-hidden', 'false');
}

function closeDeleteModal() {
  elements.deleteModal.classList.remove('active');
  elements.deleteModal.setAttribute('aria-hidden', 'true');
  state.deletingTaskId = null;
}

// ==========================================================================
// Form Validation & Feedback
// ==========================================================================

function validateForm() {
  clearErrors();
  let isValid = true;

  const title = elements.taskTitleInput.value.trim();
  const subject = elements.taskSubjectInput.value.trim();
  const dueDate = elements.taskDueDateInput.value;

  if (!title) {
    elements.titleError.textContent = 'Please enter a task title.';
    isValid = false;
  } else if (title.length < 2) {
    elements.titleError.textContent = 'Title must be at least 2 characters.';
    isValid = false;
  }

  if (!subject) {
    elements.subjectError.textContent = 'Please enter the subject or course name.';
    isValid = false;
  }

  if (!dueDate) {
    elements.dateError.textContent = 'Please select a valid due date.';
    isValid = false;
  }

  return isValid;
}

function clearErrors() {
  elements.titleError.textContent = '';
  elements.subjectError.textContent = '';
  elements.dateError.textContent = '';
}

function setSubmitting(isSubmitting) {
  if (elements.submitSpinner) elements.submitSpinner.style.display = isSubmitting ? 'inline-block' : 'none';
  if (elements.submitBtnText) elements.submitBtnText.style.display = isSubmitting ? 'none' : 'inline';
  if (elements.saveTaskSubmitBtn) elements.saveTaskSubmitBtn.disabled = isSubmitting;
}

function showLoading(isLoading) {
  elements.loadingState.style.display = isLoading ? 'flex' : 'none';
  if (isLoading) {
    elements.emptyState.style.display = 'none';
    elements.tasksGrid.style.display = 'none';
  }
}

// Floating Toast Notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span><span>${escapeHTML(message)}</span>`;
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==========================================================================
// Event Listeners
// ==========================================================================

function initEventListeners() {
  // Modal triggers
  elements.openCreateModalBtn.addEventListener('click', openCreateModal);
  elements.emptyCreateBtn.addEventListener('click', openCreateModal);
  elements.closeModalBtn.addEventListener('click', closeTaskModal);
  elements.cancelModalBtn.addEventListener('click', closeTaskModal);

  // Form submit
  elements.taskForm.addEventListener('submit', handleFormSubmit);

  // Character counter
  elements.taskDescInput.addEventListener('input', (e) => {
    elements.charCount.textContent = e.target.value.length;
  });

  // Delete modal buttons
  elements.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
  elements.confirmDeleteBtn.addEventListener('click', executeDeleteTask);

  // Outside click close for modals
  window.addEventListener('click', (e) => {
    if (e.target === elements.taskModal) closeTaskModal();
    if (e.target === elements.deleteModal) closeDeleteModal();
  });

  // Escape key close
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeTaskModal();
      closeDeleteModal();
    }
  });

  // Search input with debounce
  let searchDebounceTimer;
  elements.searchInput.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    elements.clearSearchBtn.style.display = val ? 'block' : 'none';
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      state.filters.search = val;
      fetchTasks();
    }, 280);
  });

  elements.clearSearchBtn.addEventListener('click', () => {
    elements.searchInput.value = '';
    elements.clearSearchBtn.style.display = 'none';
    state.filters.search = '';
    fetchTasks();
  });

  // Status Filter Tabs
  elements.statusFilterTabs.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      elements.statusFilterTabs.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.filters.status = btn.dataset.status;
      fetchTasks();
    });
  });

  // Priority Filter
  elements.priorityFilter.addEventListener('change', (e) => {
    state.filters.priority = e.target.value;
    fetchTasks();
  });

  // Sort Select
  elements.sortSelect.addEventListener('change', (e) => {
    const [field, direction] = e.target.value.split('-');
    state.filters.sortBy = field;
    state.filters.order = direction;
    fetchTasks();
  });

  // Stat Card click to filter
  document.querySelectorAll('.stat-card').forEach((card) => {
    card.addEventListener('click', () => {
      const filter = card.dataset.filter;
      if (filter === 'all') {
        state.filters.status = '';
        state.filters.priority = '';
        setActiveStatusTab('');
        elements.priorityFilter.value = '';
      } else if (filter === 'Pending' || filter === 'Completed') {
        state.filters.status = filter;
        state.filters.priority = '';
        setActiveStatusTab(filter);
        elements.priorityFilter.value = '';
      } else if (filter === 'High') {
        state.filters.status = 'Pending';
        state.filters.priority = 'High';
        setActiveStatusTab('Pending');
        elements.priorityFilter.value = 'High';
      }
      fetchTasks();
    });
  });
}

function setActiveStatusTab(status) {
  elements.statusFilterTabs.querySelectorAll('.tab-btn').forEach((btn) => {
    if (btn.dataset.status === status) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// Utility HTML escape function
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
