(function () {
    const STORED_USER_KEY = "compiler_user";
    const LEGACY_USER_KEY = "user";
    const SESSION_USER_KEY = "compiler_session_user";
    const USER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

    function $(id) {
        return document.getElementById(id);
    }

    function safeLocalGet(key) {
        try {
            return localStorage.getItem(key);
        } catch (error) {
            return null;
        }
    }

    function safeLocalSet(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (error) {
            // localStorage can be unavailable in strict privacy modes.
        }
    }

    function safeLocalRemove(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            // localStorage can be unavailable in strict privacy modes.
        }
    }

    function getCookieValue(name) {
        const prefix = name + "=";
        const parts = document.cookie ? document.cookie.split(";") : [];

        for (let i = 0; i < parts.length; i++) {
            const cookie = parts[i].trim();

            if (cookie.indexOf(prefix) === 0) {
                return decodeURIComponent(cookie.slice(prefix.length));
            }
        }

        return null;
    }

    function setCookieValue(name, value) {
        document.cookie = name + "=" + encodeURIComponent(value) +
            "; max-age=" + USER_COOKIE_MAX_AGE +
            "; path=/; SameSite=Lax";
    }

    function deleteCookieValue(name) {
        document.cookie = name + "=; max-age=0; path=/; SameSite=Lax";
    }

    function parseUser(value) {
        if (!value) {
            return null;
        }

        try {
            const user = JSON.parse(value);

            if (user && user.username && user.password) {
                return {
                    username: String(user.username).trim(),
                    password: String(user.password)
                };
            }
        } catch (error) {
            return null;
        }

        return null;
    }

    function getStoredUser() {
        const primaryUser = parseUser(safeLocalGet(STORED_USER_KEY));
        if (primaryUser) {
            return primaryUser;
        }

        const cookieUser = parseUser(getCookieValue(STORED_USER_KEY));
        if (cookieUser) {
            setStoredUser(cookieUser);
            return cookieUser;
        }

        const legacyUser = parseUser(safeLocalGet(LEGACY_USER_KEY));
        if (legacyUser) {
            setStoredUser(legacyUser);
            return legacyUser;
        }

        return null;
    }

    function setStoredUser(user) {
        const value = JSON.stringify(user);
        safeLocalSet(STORED_USER_KEY, value);
        safeLocalSet(LEGACY_USER_KEY, value);
        setCookieValue(STORED_USER_KEY, value);
    }

    function setSessionUser(username) {
        safeLocalSet(SESSION_USER_KEY, username);
        setCookieValue(SESSION_USER_KEY, username);
    }

    function clearSessionUser() {
        safeLocalRemove(SESSION_USER_KEY);
        deleteCookieValue(SESSION_USER_KEY);
    }

    function getSessionUser() {
        return safeLocalGet(SESSION_USER_KEY) || getCookieValue(SESSION_USER_KEY);
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
