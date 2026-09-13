// tooltip.js - Xử lý hiển thị tooltip khi hover

export function initTooltips() {
  const genericTooltip = document.querySelector("#generic-tooltip");
  if (!genericTooltip) return;

  const showTooltip = (e) => {
    const el = e.currentTarget;
    let text = el.dataset.tooltip;
    
    // Nếu yêu cầu đăng nhập nhưng chưa đăng nhập
    const requireAuth = el.dataset.requireAuth === "true";
    const token = localStorage.getItem("access_token");
    if (requireAuth && !token) {
      text = "Log in to use";
    }

    if (!text) return;

    genericTooltip.textContent = text;
    genericTooltip.classList.remove("hidden");
    
    const rect = el.getBoundingClientRect();
    const tooltipRect = genericTooltip.getBoundingClientRect();
    
    // Tính toán vị trí (mặc định đặt phía trên phần tử)
    let top = rect.top - tooltipRect.height - 8;
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    
    // Nếu ra khỏi viền trên thì đặt phía dưới
    if (top < 0) {
      top = rect.bottom + 8;
    }
    
    // Nếu ra khỏi viền trái/phải
    if (left < 4) left = 4;
    if (left + tooltipRect.width > window.innerWidth - 4) {
      left = window.innerWidth - tooltipRect.width - 4;
    }
    
    genericTooltip.style.top = top + "px";
    genericTooltip.style.left = left + "px";
  };

  const hideTooltip = () => {
    genericTooltip.classList.add("hidden");
  };

  const attachListeners = () => {
    document.querySelectorAll("[data-tooltip]").forEach(el => {
      // Tránh gán nhiều lần
      el.removeEventListener("mouseenter", showTooltip);
      el.removeEventListener("mouseleave", hideTooltip);
      
      el.addEventListener("mouseenter", showTooltip);
      el.addEventListener("mouseleave", hideTooltip);
    });
  };

  // Gán cho các element hiện tại
  attachListeners();

  // Tạo observer để gán cho các element được render sau (ví dụ: detail pages)
  const observer = new MutationObserver(() => {
    attachListeners();
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
}
