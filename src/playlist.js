// playlist.js - Quản lý toàn bộ logic Playlist (tách từ main.js)
import { httpRequest } from "./libs/httpRequest.js";
import { showPlaylistDetail } from "./detail.js";
import { localDb } from "./libs/localDb.js";

/**
 * Khởi tạo toàn bộ chức năng Playlist
 * @param {Object} params - Các tham số cần thiết
 * @param {Object} params.user - Thông tin user đang đăng nhập
 * @param {Array} params.sidebarItems - Mảng ref chứa sidebar items (sẽ được mutate trực tiếp)
 * @param {Function} params.getSidebarItems - Getter cho sidebarItems
 * @param {Function} params.setSidebarItems - Setter cho sidebarItems
 * @param {Function} params.renderSidebar - Hàm render lại sidebar
 * @param {Function} params.fetchSidebarData - Hàm fetch lại data sidebar từ API
 */
export function initPlaylistFeatures({ user, getSidebarItems, setSidebarItems, renderSidebar, fetchSidebarData }) {

  // ===== SHOW PLAYLIST DETAILS =====
  const showPlaylistDetails = (playlist) => {
    // Ẩn tất cả các trang khác - PHẢI xóa cả 'flex' vì Tailwind 'flex' ghi đè 'hidden'
    const homeView = document.querySelector("#home-view");
    if (homeView) {
      homeView.classList.add("hidden");
      homeView.classList.remove("flex");
    }
    document.querySelector("#view-all-page")?.classList.add("hidden");
    document.querySelector("#podcasts-page")?.classList.add("hidden");

    const detailsPage = document.querySelector("#playlist-details-page");
    if (!detailsPage) {
      console.error("Không tìm thấy #playlist-details-page trong HTML");
      return;
    }
    detailsPage.classList.remove("hidden");
    detailsPage.classList.add("flex");

    // Populate data
    const pdTitle = document.querySelector("#pd-title");
    const pdStatus = document.querySelector("#pd-status");
    if (pdTitle) pdTitle.textContent = playlist.name || playlist.title || "My Playlist";
    if (pdStatus) pdStatus.textContent = playlist.is_public !== false ? "Public Playlist" : "Private Playlist";

    const coverImage = document.querySelector("#pd-cover-image");
    const placeholderIcon = document.querySelector("#pd-placeholder-icon");
    const imageSrc = playlist.image_url || playlist.cover_image_url;

    if (imageSrc && imageSrc !== "https://community.spotify.com/t5/image/serverpage/image-id/196380iDD24539B5FCDEAF9/image-size/medium?v=v2&px=400") {
      if (coverImage) {
        coverImage.src = imageSrc;
        coverImage.classList.remove("hidden");
      }
      if (placeholderIcon) placeholderIcon.classList.add("hidden");
    } else {
      if (coverImage) {
        coverImage.classList.add("hidden");
        coverImage.src = "";
      }
      if (placeholderIcon) placeholderIcon.classList.remove("hidden");
    }

    // Cập nhật user info
    const pdUserName = document.querySelector("#pd-user-name");
    const pdUserAvatar = document.querySelector("#pd-user-avatar");
    if (pdUserName) pdUserName.textContent = user?.display_name || user?.username || "User";
    if (pdUserAvatar && user?.avatar_url) pdUserAvatar.src = user.avatar_url;

    // Open edit modal on cover or title click
    // Remove old listeners bằng cách clone
    const pdCoverContainer = document.querySelector("#pd-cover-container");
    const pdEditBtn = document.querySelector("#pd-edit-btn");

    const openEdit = () => openEditModal(playlist);

    if (pdCoverContainer) {
      const newCover = pdCoverContainer.cloneNode(true);
      pdCoverContainer.parentNode.replaceChild(newCover, pdCoverContainer);
      newCover.addEventListener("click", openEdit);
    }

    // Re-query pd-title vì đã set textContent ở trên
    const pdTitleEl = document.querySelector("#pd-title");
    if (pdTitleEl) {
      const newTitle = pdTitleEl.cloneNode(true);
      pdTitleEl.parentNode.replaceChild(newTitle, pdTitleEl);
      newTitle.addEventListener("click", openEdit);
    }

    if (pdEditBtn) {
      const newEditBtn = pdEditBtn.cloneNode(true);
      pdEditBtn.parentNode.replaceChild(newEditBtn, pdEditBtn);
      newEditBtn.addEventListener("click", openEdit);
    }
  };

  // ===== EDIT MODAL =====
  const editModal = document.querySelector("#edit-playlist-modal");
  const closeEditModalBtn = document.querySelector("#close-edit-modal-btn");
  const editNameInput = document.querySelector("#edit-playlist-name");
  const editDescInput = document.querySelector("#edit-playlist-desc");
  const savePlaylistBtn = document.querySelector("#save-playlist-btn");
  const editImage = document.querySelector("#edit-playlist-image");
  const editIcon = document.querySelector("#edit-playlist-icon");
  const fileInput = document.querySelector("#edit-playlist-file");
  const imageContainer = document.querySelector("#edit-playlist-image-container");
  const editPrivacyBtn = document.querySelector("#edit-playlist-privacy-btn");
  const editPrivacyText = document.querySelector("#edit-playlist-privacy-text");
  const editPrivacyIcon = document.querySelector("#edit-playlist-privacy-icon");

  let currentEditPlaylist = null;
  let selectedImageFile = null;
  let isEditingPublic = true;

  const updatePrivacyToggleUI = () => {
    if (!editPrivacyText || !editPrivacyIcon) return;
    if (isEditingPublic) {
      editPrivacyText.textContent = "Make private";
      editPrivacyIcon.innerHTML = `<path d="M11 5V4a3 3 0 0 0-6 0v1H3.5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H11zM6.5 4a1.5 1.5 0 0 1 3 0v1h-3V4zm5.5 10h-8V6.5h8V14z"></path>`;
    } else {
      editPrivacyText.textContent = "Make public";
      editPrivacyIcon.innerHTML = `<path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z"></path><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0z"></path>`;
    }
  };

  if (editPrivacyBtn) {
    editPrivacyBtn.addEventListener("click", () => {
      isEditingPublic = !isEditingPublic;
      updatePrivacyToggleUI();
    });
  }

  const openEditModal = (playlist) => {
    currentEditPlaylist = playlist;
    selectedImageFile = null;
    if (editNameInput) editNameInput.value = playlist.name || playlist.title || "";
    if (editDescInput) editDescInput.value = playlist.description || "";

    isEditingPublic = playlist.is_public !== undefined ? playlist.is_public : true;
    updatePrivacyToggleUI();

    const imgSrc = playlist.image_url || playlist.cover_image_url;
    if (imgSrc && imgSrc !== "https://community.spotify.com/t5/image/serverpage/image-id/196380iDD24539B5FCDEAF9/image-size/medium?v=v2&px=400") {
      if (editImage) {
        editImage.src = imgSrc;
        editImage.classList.remove("hidden");
      }
      if (editIcon) editIcon.classList.add("hidden");
    } else {
      if (editImage) editImage.classList.add("hidden");
      if (editIcon) editIcon.classList.remove("hidden");
    }

    if (editModal) editModal.classList.remove("hidden");
  };

  // Close modal
  if (closeEditModalBtn && editModal) {
    closeEditModalBtn.addEventListener("click", () => {
      editModal.classList.add("hidden");
      currentEditPlaylist = null;
    });
    editModal.addEventListener("click", (e) => {
      if (e.target === editModal) {
        editModal.classList.add("hidden");
        currentEditPlaylist = null;
      }
    });
  }

  // Image upload preview
  if (imageContainer && fileInput) {
    imageContainer.addEventListener("click", () => {
      fileInput.click();
    });

    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        selectedImageFile = file;
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (editImage) {
            editImage.src = ev.target.result;
            editImage.classList.remove("hidden");
          }
          if (editIcon) editIcon.classList.add("hidden");
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // ===== SAVE PLAYLIST =====
  if (savePlaylistBtn) {
    savePlaylistBtn.addEventListener("click", async () => {
      if (!currentEditPlaylist) return;
      savePlaylistBtn.textContent = "Saving...";

      try {
        const newName = editNameInput?.value.trim() || "";
        const newDesc = editDescInput?.value.trim() || "";
        const playlistId = currentEditPlaylist.id || currentEditPlaylist._id;

        // Step 1: Upload ảnh qua ImgBB API (dùng public test key)
        let newImageUrl = null;
        if (selectedImageFile) {
          try {
            const formData = new FormData();
            formData.append("image", selectedImageFile);
            const imgbbRes = await fetch("https://api.imgbb.com/1/upload?key=3a42eb9bc6d9620eddbb02bfa408b63e", {
              method: "POST",
              body: formData
            });
            const imgbbData = await imgbbRes.json();
            if (imgbbRes.ok && imgbbData && imgbbData.data && imgbbData.data.url) {
              newImageUrl = imgbbData.data.url;
            } else {
              throw new Error("ImgBB API error: " + JSON.stringify(imgbbData));
            }
          } catch (e) {
            console.error("Upload to ImgBB failed:", e);
            // Fallback to base64 if upload fails
            newImageUrl = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(selectedImageFile);
            });
          }
        }

        // Step 2: Update playlist info
        const updatePayload = {
          name: newName || "My Playlist",
          description: newDesc,
          is_public: isEditingPublic,
        };
        // Nếu upload thành công thì gán image_url mới
        if (newImageUrl) {
          updatePayload.image_url = newImageUrl;
          try {
            localStorage.setItem(`playlist_avatar_${playlistId}`, newImageUrl);
          } catch (e) {
            console.warn("Could not save to localStorage. Image might be too large.", e);
            if (e.name === 'QuotaExceededError') {
              import("./libs/toast.js").then(m => m.showToast("Ảnh quá lớn, không thể lưu cục bộ!", "error"));
            }
          }
        }

        // Send to backend if possible, but don't crash if it fails
        try {
          await httpRequest.put(`/api/playlists/${playlistId}`, updatePayload, true);
        } catch (e) {
          console.warn("Backend update failed, updating locally only");
        }

        // Step 3: Cập nhật local sidebarItems ngay lập tức (không chờ re-fetch)
        const items = getSidebarItems();
        const idx = items.findIndex(i => (i.id == playlistId || i._id == playlistId) && i.type === 'playlist');
        if (idx !== -1) {
          items[idx] = { ...items[idx], name: newName || items[idx].name, description: newDesc, is_public: isEditingPublic };
          if (newImageUrl) items[idx].image_url = newImageUrl;
          setSidebarItems(items);
          renderSidebar();
        }

        // Sau đó fetch lại từ server để đồng bộ
        await fetchSidebarData();

        // Step 4: Re-fetch playlist mới nhất để hiện lên main view
        try {
          const updatedPlaylistRes = await httpRequest.get(`/api/playlists/${playlistId}`, false);
          const updatedPlaylist = updatedPlaylistRes?.playlist || updatedPlaylistRes?.data || updatedPlaylistRes || currentEditPlaylist;
          const tempAvatar = localStorage.getItem(`playlist_avatar_${playlistId}`);
          
          showPlaylistDetails({
            ...updatedPlaylist,
            name: newName || updatedPlaylist.name || "My Playlist",
            description: newDesc,
            is_public: isEditingPublic,
            image_url: tempAvatar || newImageUrl || updatedPlaylist.image_url || updatedPlaylist.cover_image_url
          });
        } catch {
          // Fallback: dùng data local
          showPlaylistDetails({
            ...currentEditPlaylist,
            name: newName || "My Playlist",
            description: newDesc,
            is_public: isEditingPublic,
            image_url: newImageUrl || currentEditPlaylist.image_url
          });
        }

        editModal.classList.add("hidden");
        currentEditPlaylist = null;
      } catch (error) {
        console.error("Failed to update playlist", error);
        alert("Lỗi khi lưu Playlist: " + error.message);
      } finally {
        savePlaylistBtn.textContent = "Save";
      }
    });
  }

  const dropdownCreatePlaylistBtn = document.querySelector("#dropdown-create-playlist-btn");
  const createDropdown = document.querySelector("#create-dropdown");
  const createBtnIcon = document.querySelector("#create-btn-icon");
  const sidebarCreateBtn = document.querySelector("#sidebar-create-btn");

  if (sidebarCreateBtn && createDropdown) {
    sidebarCreateBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      createDropdown.classList.toggle("hidden");
      createDropdown.classList.toggle("flex");
      if (createBtnIcon) createBtnIcon.classList.toggle("rotate-45");
    });
    
    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!sidebarCreateBtn.contains(e.target) && !createDropdown.contains(e.target)) {
        createDropdown.classList.add("hidden");
        createDropdown.classList.remove("flex");
        if (createBtnIcon) createBtnIcon.classList.remove("rotate-45");
      }
    });
  }

  if (dropdownCreatePlaylistBtn) {
    const newBtn = dropdownCreatePlaylistBtn.cloneNode(true);
    dropdownCreatePlaylistBtn.parentNode.replaceChild(newBtn, dropdownCreatePlaylistBtn);

    newBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Hide dropdown
      if (createDropdown) createDropdown.classList.add("hidden");
      if (createBtnIcon) createBtnIcon.classList.remove("rotate-45");

      try {
        const newPlaylistResponse = await httpRequest.post("/api/playlists", {
          name: "My Playlist",
          description: "",
          is_public: true,
          image_url: ""
        }, true);

        const playlistData = newPlaylistResponse?.data || newPlaylistResponse?.playlist || newPlaylistResponse?.item || newPlaylistResponse;

        let newPlaylistObj = null;
        if (playlistData && (playlistData.id || playlistData._id)) {
          newPlaylistObj = { ...playlistData, type: 'playlist', name: playlistData.name || playlistData.title || "My Playlist" };
          const items = getSidebarItems();
          items.splice(0, 0, newPlaylistObj);
          setSidebarItems(items);
          renderSidebar();
        } else {
          // Fallback: tạo tạm rồi fetch lại
          const tempId = "temp-" + Date.now();
          newPlaylistObj = { id: tempId, name: "My Playlist", type: 'playlist', creator_name: user.username };
          const items = getSidebarItems();
          items.splice(0, 0, newPlaylistObj);
          setSidebarItems(items);
          renderSidebar();

          await new Promise(r => setTimeout(r, 800));
          await fetchSidebarData();

          const updatedItems = getSidebarItems();
          if (updatedItems.length > 0 && updatedItems[0].type === 'playlist') {
            newPlaylistObj = updatedItems[0];
          }
        }

        if (newPlaylistObj) {
          showPlaylistDetails(newPlaylistObj);
        }

      } catch (error) {
        console.error("Failed to create playlist", error);
        alert("Failed to create playlist: " + error.message);
      }
    });
  }

  // ===== BLEND BUTTON =====
  const dropdownBlendBtn = document.querySelector("#dropdown-blend-btn");
  if (dropdownBlendBtn) {
    dropdownBlendBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Hide dropdown
      if (createDropdown) createDropdown.classList.add("hidden");
      if (createBtnIcon) createBtnIcon.classList.remove("rotate-45");

      // Show blend page
      import("./detail.js").then(({ showPage }) => {
        showPage("blend-page");

        // Set user avatar
        const blendAvatar = document.querySelector("#blend-user-avatar");
        if (blendAvatar) {
          const savedTempAvatar = localStorage.getItem(window.getUserKey("temp_user_avatar"));
          try {
            const user = JSON.parse(localStorage.getItem("user"));
            const avatarUrl = savedTempAvatar || user?.avatar_url || user?.image_url;
            if (avatarUrl) blendAvatar.src = avatarUrl;
          } catch(err) {}
        }
      });
    });
  }

  // ===== FOLDER BUTTON =====
  const dropdownFolderBtn = document.querySelector("#dropdown-create-folder-btn");
  if (dropdownFolderBtn) {
    dropdownFolderBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Hide dropdown
      if (createDropdown) createDropdown.classList.add("hidden");
      if (createBtnIcon) createBtnIcon.classList.remove("rotate-45");

      try {
        const folderKey = window.getUserKey("user_folders");
        const folders = JSON.parse(localStorage.getItem(folderKey) || "[]");
        const newFolder = {
          id: 'folder_' + Date.now(),
          name: 'New Folder',
          type: 'folder',
          playlists: [] // will store playlist IDs
        };
        folders.unshift(newFolder);
        localStorage.setItem(folderKey, JSON.stringify(folders));
        
        if (fetchSidebarData) {
          await fetchSidebarData();
        }
      } catch (error) {
        console.error("Failed to create folder", error);
      }
    });
  }

  // ===== CONTEXT MENU (Right-click trên sidebar) =====
  const contextMenu = document.querySelector("#context-menu");
  const contextMenuList = document.querySelector("#context-menu-list");

  if (contextMenu) {
    const hideContextMenu = () => {
      contextMenu.classList.add("hidden");
    };

    document.addEventListener("click", hideContextMenu);
    document.addEventListener("scroll", hideContextMenu, true);

    const sidebarList = document.querySelector("#sidebar-list");
    if (sidebarList) {
      sidebarList.addEventListener("contextmenu", (e) => {
        const itemEl = e.target.closest(".sidebar-item");
        if (!itemEl) return;

        e.preventDefault();
        const id = itemEl.getAttribute("data-id");
        const type = itemEl.getAttribute("data-type");
        const isOwned = itemEl.getAttribute("data-owned") === "true";

        let menuHtml = "";
        if (type === "playlist") {
          if (isOwned) {
            menuHtml += `
              <li class="px-3 py-2 hover:bg-[#3e3e3e] cursor-pointer rounded-sm" id="context-action-edit">Edit details</li>
              <li class="px-3 py-2 hover:bg-[#3e3e3e] cursor-pointer rounded-sm" id="context-action-delete">Delete</li>
            `;
          } else {
            menuHtml += `<li class="px-3 py-2 hover:bg-[#3e3e3e] cursor-pointer rounded-sm" id="context-action-unfollow">Remove from Your Library</li>`;
          }
        } else if (type === "artist") {
          menuHtml += `<li class="px-3 py-2 hover:bg-[#3e3e3e] cursor-pointer rounded-sm" id="context-action-unfollow-artist">Unfollow</li>`;
        } else if (type === "album") {
          menuHtml += `<li class="px-3 py-2 hover:bg-[#3e3e3e] cursor-pointer rounded-sm" id="context-action-remove-album">Remove from Your Library</li>`;
        }

        if (menuHtml) {
          contextMenuList.innerHTML = menuHtml;
          contextMenu.style.top = `${e.clientY}px`;
          contextMenu.style.left = `${e.clientX}px`;
          contextMenu.classList.remove("hidden");

          // Edit details
          const editBtn = document.querySelector("#context-action-edit");
          if (editBtn) {
            editBtn.addEventListener("click", (ev) => {
              ev.stopPropagation();
              const items = getSidebarItems();
              const itemData = items.find(i => (i.id == id || i._id == id) && i.type === "playlist");
              if (itemData) openEditModal(itemData);
              hideContextMenu();
            });
          }

          // Delete playlist - SỬA LỖI: thêm requiresAuth = true
          const deleteBtn = document.querySelector("#context-action-delete");
          if (deleteBtn) {
            deleteBtn.addEventListener("click", async (ev) => {
              ev.stopPropagation();
              try {
                await httpRequest.delete(`/api/playlists/${id}`, true);
                await fetchSidebarData();
                // Nếu đang xem playlist này thì quay về home
                const detailsPage = document.querySelector("#playlist-details-page");
                if (detailsPage && !detailsPage.classList.contains("hidden")) {
                  detailsPage.classList.add("hidden");
                  detailsPage.classList.remove("flex");
                  const homeView = document.querySelector("#home-view");
                  if (homeView) {
                    homeView.classList.remove("hidden");
                    homeView.classList.add("flex");
                  }
                }
              } catch (error) {
                console.error("Delete failed", error);
                alert("Lỗi khi xóa Playlist: " + error.message);
              }
              hideContextMenu();
            });
          }
        }
      });
    }

    // Global contextmenu for Tracks
    document.addEventListener("contextmenu", (e) => {
      const trackRow = e.target.closest("tr[data-track-id]");
      const trackCard = e.target.closest(".group\\/card[data-type='tracks']");
      const trackEl = trackRow || trackCard;
      if (!trackEl) return;

      const trackId = trackEl.getAttribute("data-track-id") || trackEl.getAttribute("data-id");
      if (!trackId) return;

      e.preventDefault();

      const items = getSidebarItems();
      const myPlaylists = items.filter(i => i.type === "playlist" && (i.creator_name === user.username || i.creator_id === user.id));

      if (myPlaylists.length === 0) {
        contextMenuList.innerHTML = `<li class="px-3 py-2 text-[#b3b3b3] text-[13px] rounded-sm italic">You don't have any playlists yet</li>`;
      } else {
        let menuHtml = `<div class="px-3 py-2 text-[#b3b3b3] text-[12px] font-bold uppercase tracking-wider mb-1">Add to playlist</div>`;
        myPlaylists.forEach(pl => {
          menuHtml += `<li class="px-3 py-2 hover:bg-[#3e3e3e] cursor-pointer rounded-sm track-add-playlist-btn truncate" data-playlist-id="${pl.id || pl._id}" data-track-id="${trackId}">${pl.name || "My Playlist"}</li>`;
        });
        contextMenuList.innerHTML = menuHtml;

        // Add event listeners for adding track
        contextMenuList.querySelectorAll(".track-add-playlist-btn").forEach(btn => {
          btn.addEventListener("click", async (ev) => {
            ev.stopPropagation();
            const pid = btn.getAttribute("data-playlist-id");
            const tid = btn.getAttribute("data-track-id");
            if (!tid || tid === "undefined" || tid === "null") {
               alert("Cannot add: Missing track ID on this element.");
               hideContextMenu();
               return;
            }
            try {
              if (pid === "liked-songs") {
                if (tid.startsWith("local_track_")) {
                   await localDb.addTrackToLocalPlaylist(window.getUserKey("liked-songs"), tid);
                } else {
                   let liked = JSON.parse(localStorage.getItem(window.getUserKey("liked_songs")) || "[]");
                   if (!liked.some(t => (t.id || t.track_id || t._id) === tid)) {
                     const res = await httpRequest.get(`/api/tracks/${tid}`);
                     const trackData = res.data || res.track || res;
                     if (trackData) liked.push(trackData);
                   }
                   localStorage.setItem(window.getUserKey("liked_songs"), JSON.stringify(liked));
                }
                alert("Added to Liked Songs!");
              } else if (tid.startsWith("local_track_")) {
                await localDb.addTrackToLocalPlaylist(pid, tid);
                alert("Added to playlist!");
              } else {
                await httpRequest.post(`/api/playlists/${pid}/tracks`, { trackId: tid, track_id: tid }, true);
                alert("Added to playlist!");
              }
              // Refresh the view if the user is currently viewing this playlist
              document.querySelector(`.sidebar-item[data-id="${pid}"]`)?.click();
            } catch (err) {
              alert("Failed to add track: " + err.message);
            }
            hideContextMenu();
          });
        });
      }

      contextMenu.style.top = `${e.clientY}px`;
      contextMenu.style.left = `${e.clientX}px`;
      contextMenu.classList.remove("hidden");
    });
  }

  // ===== SIDEBAR CLICK & DRAG/DROP =====
  const sidebarListEl = document.querySelector("#sidebar-list");
  if (sidebarListEl) {
    // ===== DRAG AND DROP =====
    let draggedPlaylistId = null;

    sidebarListEl.addEventListener("dragstart", (e) => {
      const itemEl = e.target.closest(".sidebar-item");
      if (!itemEl || itemEl.getAttribute("data-type") !== "playlist") return;
      draggedPlaylistId = itemEl.getAttribute("data-id");
      e.dataTransfer.effectAllowed = "move";
      itemEl.classList.add("opacity-50");
    });

    sidebarListEl.addEventListener("dragend", (e) => {
      const itemEl = e.target.closest(".sidebar-item");
      if (itemEl) itemEl.classList.remove("opacity-50");
      draggedPlaylistId = null;
      document.querySelectorAll(".sidebar-item[data-folder-target='true']").forEach(el => el.classList.remove("ring-2", "ring-white", "bg-[#333]"));
    });

    sidebarListEl.addEventListener("dragover", (e) => {
      e.preventDefault(); // Necessary to allow dropping
      const folderEl = e.target.closest(".sidebar-item[data-folder-target='true']");
      if (folderEl) {
        folderEl.classList.add("ring-2", "ring-white", "bg-[#333]");
      }
    });

    sidebarListEl.addEventListener("dragleave", (e) => {
      const folderEl = e.target.closest(".sidebar-item[data-folder-target='true']");
      if (folderEl) {
        folderEl.classList.remove("ring-2", "ring-white", "bg-[#333]");
      }
    });

    sidebarListEl.addEventListener("drop", async (e) => {
      e.preventDefault();
      const folderEl = e.target.closest(".sidebar-item[data-folder-target='true']");
      if (folderEl && draggedPlaylistId) {
        folderEl.classList.remove("ring-2", "ring-white", "bg-[#333]");
        const folderId = folderEl.getAttribute("data-id");
        
        try {
          const folderKey = window.getUserKey("user_folders");
          let folders = JSON.parse(localStorage.getItem(folderKey) || "[]");
          
          // Remove from all other folders first
          folders = folders.map(f => {
            f.playlists = (f.playlists || []).filter(pid => pid !== draggedPlaylistId);
            return f;
          });

          // Add to target folder
          const targetFolder = folders.find(f => f.id === folderId);
          if (targetFolder) {
            targetFolder.playlists.push(draggedPlaylistId);
            localStorage.setItem(folderKey, JSON.stringify(folders));
            if (fetchSidebarData) await fetchSidebarData();
          }
        } catch(err) {
          console.error("Drop failed", err);
        }
      }
    });

    // ===== CLICK HANDLER =====
    sidebarListEl.addEventListener("click", (e) => {
      const itemEl = e.target.closest(".sidebar-item");
      if (!itemEl) return;

      const type = itemEl.getAttribute("data-type");
      const id = itemEl.getAttribute("data-id");

      // Handle folder click (both caret and the item itself)
      if (type === "folder") {
        e.stopPropagation();
        const folderNameEl = itemEl.querySelector("span.text-white");
        const folderName = folderNameEl ? folderNameEl.textContent.trim() : "Folder";
        if (window.setSidebarFolder) {
          window.setSidebarFolder(id, folderName);
        }
        return;
      }

      if (type === "playlist") {
        showPlaylistDetail(id, { user, fetchSidebarData, openEditModal });
      } else if (type === "liked-songs") {
        showPlaylistDetail("liked-songs", { user, fetchSidebarData, openEditModal });
      } else if (type === "artist") {
        // Import lazy để tránh circular dependency
        import("./detail.js").then(({ showArtistDetail }) => {
          showArtistDetail(id, { user, fetchSidebarData });
        });
      } else if (type === "album") {
        import("./detail.js").then(({ showAlbumDetail }) => {
          showAlbumDetail(id, { user, fetchSidebarData });
        });
      }
    });
  } else {
    console.error("[playlist.js] KHÔNG TÌM THẤY #sidebar-list!");
  }

  // Export showPlaylistDetails cho main.js nếu cần
  return { showPlaylistDetails, openEditModal };
}
