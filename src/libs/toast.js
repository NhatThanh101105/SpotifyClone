export const showToast = (message, type = "success") => {
  const existingToast = document.querySelector("#spotify-toast");
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement("div");
  toast.id = "spotify-toast";
  
  // Tailwind classes for the toast
  const baseClasses = "fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-md text-white font-bold text-[15px] z-[9999] transition-all duration-300 opacity-0 transform translate-y-4 shadow-lg";
  const bgClass = type === "success" ? "bg-[#1ed760] text-black" : "bg-[#e22134]";
  
  toast.className = `${baseClasses} ${bgClass}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  // Trigger animation
  setTimeout(() => {
    toast.classList.remove("opacity-0", "translate-y-4");
    toast.classList.add("opacity-100", "translate-y-0");
  }, 10);

  // Auto remove
  setTimeout(() => {
    toast.classList.remove("opacity-100", "translate-y-0");
    toast.classList.add("opacity-0", "translate-y-4");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};
