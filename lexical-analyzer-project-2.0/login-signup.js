(function () {
    const STORED_USER_KEY = "compiler_user";
    const LEGACY_USER_KEY = "user";
    const SESSION_USER_KEY = "compiler_session_user";

    function $(id) {
        return document.getElementById(id);
    }

    function getStoredUser() {
        const primaryValue = localStorage.getItem(STORED_USER_KEY);
        if (primaryValue) {
            return JSON.parse(primaryValue);
        }

        const legacyValue = localStorage.getItem(LEGACY_USER_KEY);
        if (!legacyValue) {
            return null;
        }

        const legacyUser = JSON.parse(legacyValue);

        if (legacyUser && legacyUser.username && legacyUser.password) {
            setStoredUser({
                username: String(legacyUser.username).trim(),
                password: String(legacyUser.password)
            });
            return getStoredUser();
        }

        return null;
    }

    function setStoredUser(user) {
        localStorage.setItem(STORED_USER_KEY, JSON.stringify(user));
        localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(user));
    }

    function setSessionUser(username) {
        localStorage.setItem(SESSION_USER_KEY, username);
    }

    function clearSessionUser() {
        localStorage.removeItem(SESSION_USER_KEY);
    }

    function getSessionUser() {
        return localStorage.getItem(SESSION_USER_KEY);
    }

    function togglePassword(fieldId, trigger) {
        const field = $(fieldId);
        if (!field) {
            return;
        }

        const isPassword = field.type === "password";
        field.type = isPassword ? "text" : "password";

        if (trigger) {
            trigger.textContent = isPassword ? "Hide" : "Show";
        }
    }

    function bindToggles() {
        document.querySelectorAll(".toggle[data-target]").forEach(function (button) {
            button.addEventListener("click", function () {
                togglePassword(button.getAttribute("data-target"), button);
            });
        });
    }

    function handleLoginSubmit(event) {
        event.preventDefault();

        const username = $("username").value.trim();
        const password = $("password").value;
        const storedUser = getStoredUser();

        if (!storedUser) {
            alert("No user found! Please sign up first.");
            return;
        }

        if (
            username === String(storedUser.username || "").trim() &&
            password === String(storedUser.password || "")
        ) {
            setSessionUser(username);
            window.location.href = "newdash.html";
            return;
        }

        alert("Invalid Username or Password");
    }

    function handleSignupSubmit(event) {
        event.preventDefault();

        const username = $("username").value.trim();
        const password = $("newPassword").value;
        const confirmPassword = $("confirmPassword").value;

        if (!username) {
            alert("Username is required.");
            return;
        }

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        if (password.length < 4) {
            alert("Password must be at least 4 characters long!");
            return;
        }

        setStoredUser({
            username: username,
            password: password
        });

        alert("Signup Successful! Please login.");
        window.location.href = "login.html";
    }

    function protectDashboard() {
        const page = document.body ? document.body.getAttribute("data-auth-page") : null;
        const isDashboard = page === "dashboard";
        const isAuthPage = page === "login" || page === "signup";
        const sessionUser = getSessionUser();

        if (isDashboard && !sessionUser) {
            window.location.href = "login.html";
            return;
        }

        if (isAuthPage && sessionUser) {
            window.location.href = "newdash.html";
        }

        if (isDashboard && sessionUser) {
            const titleElement = document.getElementById("dashboardTitle");
            if (titleElement) {
                titleElement.textContent = `Welcome, ${sessionUser}`;
            }
        }
    }

    function logout() {
        clearSessionUser();
        window.location.href = "login.html";
    }

    function init() {
        protectDashboard();
        bindToggles();

        const loginForm = $("loginForm");
        if (loginForm) {
            loginForm.addEventListener("submit", handleLoginSubmit);
        }

        const signupForm = $("signupForm");
        if (signupForm) {
            signupForm.addEventListener("submit", handleSignupSubmit);
        }
    }

    window.togglePassword = togglePassword;
    window.logout = logout;

    document.addEventListener("DOMContentLoaded", init);
})();
