const screenControllers = {
  dashboard: { onEnter: renderDashboard},
  // cases: { onEnter: renderCases},
  case: { onEnter: renderCaseScreen},
  history: { onEnter: renderHistory},
  casesInRoute: { onEnter: rendercasesInRouteTable},
  routes: { onEnter: renderRoutes},
  statusesInRoute: { onEnter: renderStatusesInRoute },
  switchingModes: { onEnter: renderSwitchingModes}
};


function navigate(screenName) {
    if (!authService.isLoggedIn()) {
    loadLogin();
    return;
  }

  if (!authService.hasViewPermission(screenName)) {
    document.getElementById("content").innerHTML =
      `<h3>אין הרשאה לצפייה במסך זה</h3>`;
    return;
  }

  fetch(`ui/screens/${screenName}.html`)
    .then(res => res.text())
    .then(html => {
      document.getElementById("content").innerHTML = html;

      const controller = screenControllers[screenName];
      if (controller?.onEnter) {
        controller.onEnter();
      }
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
    el.innerText = `${username}`; /// `שלום, ${username}`;
  }
}

function applyMenuPermissions() {
  document.querySelectorAll("[data-screen]").forEach(item => {
    const screen = item.dataset.screen;

    if (!authService.hasViewPermission(screen)) {
      item.classList.add("menu-disabled");
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
  if (!authService.hasViewPermission(screenName)) {
    alert("אין לך הרשאה למסך זה");
    return;
  }

  navigate(screenName);
}

function toggleSubmenu(element) {
  const menuItem = element.parentElement;
  menuItem.classList.toggle("open");
}

