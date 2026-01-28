function navigate(screenName) {
  fetch(`ui/screens/${screenName}.html`)
    .then(res => res.text())
    .then(html => {
      document.getElementById("app").innerHTML = html;
    });
}

function loadLogin() {
    navigate("login");
//   fetch("ui/screens/login.html")
//     .then(res => res.text())
//     .then(html => {
//       //document.body.innerHTML = html;
//       document.getElementById("app").innerHTML = html;
//     });
}

function loadMainLayout() {
   
  fetch("ui/layout/mainLayout.html")
    .then(res => res.text())
    .then(html => {
      //document.body.innerHTML = html;
      document.getElementById("app").innerHTML = html;
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