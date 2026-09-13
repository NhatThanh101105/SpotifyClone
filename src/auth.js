import { httpRequest } from "./libs/httpRequest.js";
import { showToast } from "./libs/toast.js";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.querySelector("#login-form");
  const signupForm = document.querySelector("#signup-form");

  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const email = document.querySelector("#email").value;
      const username = document.querySelector("#username").value;
      const password = document.querySelector("#password").value;
      const displayName = document.querySelector("#display_name").value;
      const btn = document.querySelector("#signup-btn");

      // Validation
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
      if (!passwordRegex.test(password)) {
        showToast("Password must be at least 6 characters, including uppercase, lowercase, and number.", "error");
        return;
      }

      const originalBtnText = btn.textContent;
      btn.textContent = "Đang đăng ký...";
      btn.disabled = true;

      try {
        // 1. Register
        await httpRequest.post("/api/auth/register", {
          username,
          email,
          password,
          display_name: displayName,
        });

        showToast("Đăng ký thành công!", "success");

        // 2. Auto login
        const loginRes = await httpRequest.post("/api/auth/login", {
          email,
          password,
        });

        if (loginRes.access_token) {
          localStorage.setItem("access_token", loginRes.access_token);
          try {
            const userRes = await httpRequest.get("/api/users/me", true).catch(() => null);
            if (userRes && (userRes._id || userRes.id)) {
               localStorage.setItem("user", JSON.stringify(userRes));
            } else {
               const payload = JSON.parse(atob(loginRes.access_token.split('.')[1]));
               localStorage.setItem("user", JSON.stringify(payload));
            }
          } catch(e) {
            try {
              const payload = JSON.parse(atob(loginRes.access_token.split('.')[1]));
              localStorage.setItem("user", JSON.stringify(payload));
            } catch(e2) {}
          }
        }

        setTimeout(() => {
          window.location.href = "/";
        }, 1500);

      } catch (error) {
        if (error.status === 409) {
          showToast("Email hoặc username đã tồn tại", "error");
        } else {
          showToast(error.message || "Đăng ký thất bại", "error");
        }
        btn.textContent = originalBtnText;
        btn.disabled = false;
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const email = document.querySelector("#email").value;
      const password = document.querySelector("#password").value;
      const btn = document.querySelector("#login-btn");

      const originalBtnText = btn.textContent;
      btn.textContent = "Đang đăng nhập...";
      btn.disabled = true;

      try {
        const res = await httpRequest.post("/api/auth/login", {
          email,
          password,
        });

          if (res.access_token) {
            localStorage.setItem("access_token", res.access_token);
            try {
              const userRes = await httpRequest.get("/api/users/me", true).catch(() => null);
              if (userRes && (userRes._id || userRes.id)) {
                 localStorage.setItem("user", JSON.stringify(userRes));
              } else {
                 const payload = JSON.parse(atob(res.access_token.split('.')[1]));
                 localStorage.setItem("user", JSON.stringify(payload));
              }
            } catch(e) {
              try {
                const payload = JSON.parse(atob(res.access_token.split('.')[1]));
                localStorage.setItem("user", JSON.stringify(payload));
              } catch(e2) {}
            }
          
          showToast("Đăng nhập thành công!", "success");

          setTimeout(() => {
            window.location.href = "/";
          }, 1500);
        } else {
          throw new Error("Không lấy được token");
        }
      } catch (error) {
        if (error.status === 401) {
          showToast("Sai email hoặc mật khẩu", "error");
        } else {
          showToast(error.message || "Đăng nhập thất bại", "error");
        }
        btn.textContent = originalBtnText;
        btn.disabled = false;
      }
    });
  }
});
