/* =========================================================
 * Admin dashboard controller
 * Handles login, settings, game order, and employee management
 * ========================================================= */
const bootstrap = window.__ADMIN_BOOTSTRAP__ || {};

/* =========================================================
 * Authentication handling for login/logout flows
 * ========================================================= */
const loginForm = document.getElementById('login-form');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout');

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginError.textContent = '';
    try {
      const response = await fetch('../php/auth.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput.value }),
      });
      if (!response.ok) {
        throw new Error('Incorrect password');
      }
      window.location.reload();
    } catch (error) {
      loginError.textContent = error.message;
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await fetch('../php/auth.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    window.location.reload();
  });
}

if (!bootstrap.isAdmin) {
  // When the admin is not logged in the rest of the dashboard stays idle.
} else {
  /* =========================================================
   * Theme form submission handling
   * ========================================================= */
  const themeForm = document.getElementById('theme-form');
  const themeFeedback = document.getElementById('theme-feedback');

  if (themeForm) {
    themeForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(themeForm);
      const theme = {};
      formData.forEach((value, key) => {
        const match = key.match(/theme\[(.+)]/);
        if (match) {
          theme[match[1]] = value;
        }
      });

      try {
        const response = await fetch('../php/save_settings.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ theme, gameOrder: bootstrap.gameOrder || [] }),
        });
        if (!response.ok) throw new Error('Could not save theme');
        bootstrap.theme = theme;
        themeFeedback.textContent = 'Theme updated!';
      } catch (error) {
        themeFeedback.textContent = error.message;
      }
    });
  }

  /* =========================================================
   * Game order rendering and persistence helpers
   * ========================================================= */
  const orderContainer = document.getElementById('game-order');
  const orderFeedback = document.getElementById('order-feedback');
  const saveOrderBtn = document.getElementById('save-order');
  let gameOrder = Array.isArray(bootstrap.gameOrder) ? [...bootstrap.gameOrder] : [];

  const renderGameOrder = () => {
    if (!orderContainer) return;
    orderContainer.innerHTML = '';
    gameOrder.forEach((game, index) => {
      const pill = document.createElement('div');
      pill.className = 'game-pill';
      pill.innerHTML = `
        <span>${game}</span>
        <div>
          <button data-action="up" data-index="${index}">▲</button>
          <button data-action="down" data-index="${index}">▼</button>
        </div>
      `;
      orderContainer.appendChild(pill);
    });
  };

  if (orderContainer) {
    orderContainer.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement)) return;
      const action = target.dataset.action;
      const index = Number(target.dataset.index);
      if (Number.isNaN(index)) return;
      if (action === 'up' && index > 0) {
        [gameOrder[index - 1], gameOrder[index]] = [gameOrder[index], gameOrder[index - 1]];
      }
      if (action === 'down' && index < gameOrder.length - 1) {
        [gameOrder[index + 1], gameOrder[index]] = [gameOrder[index], gameOrder[index + 1]];
      }
      renderGameOrder();
    });
  }

  if (saveOrderBtn) {
    saveOrderBtn.addEventListener('click', async () => {
      try {
        const response = await fetch('../php/save_settings.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ theme: bootstrap.theme || {}, gameOrder }),
        });
        if (!response.ok) throw new Error('Failed to save order');
        bootstrap.gameOrder = [...gameOrder];
        orderFeedback.textContent = 'Game order saved';
      } catch (error) {
        orderFeedback.textContent = error.message;
      }
    });
  }

  renderGameOrder();

  /* =========================================================
   * Employee table rendering and CRUD helpers
   * ========================================================= */
  const employeeTable = document.getElementById('employee-table');
  const addEmployeeBtn = document.getElementById('add-employee');
  const saveEmployeesBtn = document.getElementById('save-employees');
  const employeeFeedback = document.getElementById('employee-feedback');
  let employees = Array.isArray(bootstrap.employees) ? [...bootstrap.employees] : [];

  const renderEmployees = () => {
    if (!employeeTable) return;
    const tbody = employeeTable.querySelector('tbody');
    tbody.innerHTML = '';
    employees.forEach((employee, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><input type="number" value="${employee.id}" data-field="id" data-index="${index}" /></td>
        <td><input type="text" value="${employee.name}" data-field="name" data-index="${index}" /></td>
        <td><input type="text" value="${employee.avatar || ''}" data-field="avatar" data-index="${index}" /></td>
        <td><button class="admin-btn" data-action="delete" data-index="${index}">Delete</button></td>
      `;
      tbody.appendChild(row);
    });
  };

  if (employeeTable) {
    employeeTable.addEventListener('input', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      const index = Number(target.dataset.index);
      const field = target.dataset.field;
      if (Number.isNaN(index) || !field) return;
      employees[index] = { ...employees[index], [field]: field === 'id' ? Number(target.value) : target.value };
    });

    employeeTable.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement)) return;
      if (target.dataset.action === 'delete') {
        const index = Number(target.dataset.index);
        employees.splice(index, 1);
        renderEmployees();
      }
    });
  }

  if (addEmployeeBtn) {
    addEmployeeBtn.addEventListener('click', () => {
      employees.push({ id: Date.now(), name: 'New Employee', avatar: '' });
      renderEmployees();
    });
  }

  if (saveEmployeesBtn) {
    saveEmployeesBtn.addEventListener('click', async () => {
      try {
        const response = await fetch('../php/save_employee.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employees }),
        });
        if (!response.ok) throw new Error('Unable to save employees');
        employeeFeedback.textContent = 'Employees updated';
      } catch (error) {
        employeeFeedback.textContent = error.message;
      }
    });
  }

  renderEmployees();
}
