const screenControllers = {
  dashboard: { onEnter: renderDashboard },
  cases: { onEnter: renderCasesBuilder },
  case: { onEnter: renderCaseScreen },
  history: { onEnter: renderHistory },
  casesInRoute: { onEnter: rendercasesInRouteTable },
  routes: { onEnter: renderRoutes },
  statusesInRoute: { onEnter: renderStatusesInRoute },
  switchingModes: { onEnter: renderSwitchingModes },
  groups: { onEnter: renderGroups },
  foreclosureCaseBuilder: { onEnter: renderForeclosureCaseBuilder },
  foreclosureProcess: { onEnter: renderForeclosureProcess },
  foreclosureApproval: { onEnter: renderForeclosureApproval },
  debtTypes: { onEnter: renderDebtTypes },
};

function canViewScreen(screenName) {
  return permissionService.canViewScreen(screenName);
}

function showNoScreenPermission() {
  document.getElementById("content").innerHTML =
    `<h3>אין הרשאה לצפייה במסך זה</h3>`;
}

function setActiveMenuItem(screenName) {
  document.querySelectorAll(".sidebar [data-screen]").forEach(item => {
    const isActive = item.dataset.screen === screenName;

    item.classList.toggle("menu-screen--active", isActive);

    if (isActive) {
      item.setAttribute("aria-current", "page");
    } else {
      item.removeAttribute("aria-current");
    }
  });
}

function navigate(screenName) {
  if (!authService.isLoggedIn()) {
    loadLogin();
    return;
  }

  // בדיקה מרכזית לפני טעינת קובץ ה-HTML של המסך.
  // גם אם מישהו קרא ידנית ל-navigate מה-console, המסך לא ייטען בלי הרשאה.
  if (!canViewScreen(screenName)) {
    showNoScreenPermission();
    return;
  }

  fetch(`ui/screens/${screenName}.html`)
    .then(res => {
      if (!res.ok) {
        throw new Error(`Screen not found: ${screenName}`);
      }

      return res.text();
    })
    .then(html => {
      document.getElementById("content").innerHTML = html;
      setActiveMenuItem(screenName);

      const controller = screenControllers[screenName];
      if (controller?.onEnter) {
        controller.onEnter();
      }
    })
    .catch(error => {
      console.error(error);
      document.getElementById("content").innerHTML =
        `<h3>המסך לא נמצא או שלא ניתן לטעון אותו</h3>`;
    });
}

function loadLogin() {
  fetch("ui/screens/login.html")
    .then(res => res.text())
    .then(html => {
      document.getElementById("app").innerHTML = html;
    });
}

function loadMainLayout() {
  fetch("ui/layout/mainLayout.html")
    .then(res => res.text())
    .then(html => {
      document.getElementById("app").innerHTML = html;

      applyMenuPermissions();
      showUsername();
      navigate("dashboard");
    });
}

function showUsername() {
  const username = authService.getCurrentUsername();

  if (!username) return;

  const el = document.getElementById("usernameDisplay");
  if (el) {
    el.innerText = username;
  }
}

function applyMenuPermissions() {
  document.querySelectorAll("[data-screen]").forEach(item => {
    const screen = item.dataset.screen;
    const hasPermission = canViewScreen(screen);

    item.classList.toggle("menu-disabled", !hasPermission);
    item.setAttribute("aria-disabled", String(!hasPermission));

    if (!hasPermission) {
      item.title = "אין הרשאה למסך זה";
    } else {
      item.removeAttribute("title");
    }
  });
}

function handleLogout() {
  authService.logout();
  loadLogin();
}

async function handleLogin() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const success = authService.login(username, password);

  if (!success) {
    document.getElementById("loginError").innerText =
      "שם משתמש או סיסמה שגויים";
    return;
  }

  loadMainLayout();
}

function handleMenuClick(screenName) {
  // בדיקה בזמן לחיצה על התפריט.
  // זו שכבת הגנה נוספת מעבר לעיצוב של menu-disabled.
  if (!canViewScreen(screenName)) {
    alert("אין לך הרשאה למסך זה");
    return;
  }

  navigate(screenName);
}

function handleComingSoon(screenLabel) {
  alert(`${screenLabel} עדיין בפיתוח`);
}

function toggleSubmenu(element) {
  const menuItem = element.parentElement;
  menuItem.classList.toggle("open");
}

function toggleMobileMenu() {
  const sidebar = document.getElementById("sidebar");
  const button = document.getElementById("mobileMenuToggle");

  if (!sidebar || !button) return;

  const isOpen = sidebar.classList.toggle("mobile-menu-open");
  button.setAttribute("aria-expanded", String(isOpen));
}

function toggleDesktopSidebar() {
  const app = document.querySelector(".app-container");
  const button = document.getElementById("desktopSidebarToggle");

  if (!app || !button) return;

  const isCollapsed = app.classList.toggle("sidebar-collapsed");
  button.setAttribute("aria-expanded", String(!isCollapsed));
}

window.toggleMobileMenu = toggleMobileMenu;
window.toggleDesktopSidebar = toggleDesktopSidebar;
