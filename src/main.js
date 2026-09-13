import { httpRequest } from "./libs/httpRequest";
import { initSearch } from "./search";
import { initPlaylistFeatures } from "./playlist";
import { initDetailPages, showPlaylistDetail, showPage, showUserProfile, initUploadModal } from "./detail";
import { initPlayer, playTrack } from "./player";
import { initTooltips } from "./tooltip";

let homeDataCache = {};

// Migrate old unprefixed localStorage data to user-specific keys
(function migrateOldLocalStorage() {
  const oldKeys = ["liked_songs", "recently_played_contexts", "temp_user_avatar"];
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    const uid = user && (user._id || user.id || user.user_id || user.username);
    if (uid) {
      oldKeys.forEach(key => {
        const oldVal = localStorage.getItem(key);
        const newKey = key + "_" + uid;
        if (oldVal && !localStorage.getItem(newKey)) {
          // Move old data to user-specific key
          localStorage.setItem(newKey, oldVal);
        }
        // Always remove the old unprefixed key
        localStorage.removeItem(key);
      });
    }
  } catch(e) {}
})();

const attachPlayButtonListeners = () => {
  document.querySelectorAll(".home-play-btn").forEach(btn => {
    // Prevent multiple listeners
    btn.removeEventListener("click", playBtnHandler);
    btn.addEventListener("click", playBtnHandler);
  });
};

const playBtnHandler = async (e) => {
  e.stopPropagation();
  const token = localStorage.getItem("access_token");
  if (!token) {
    showAuthTooltip(e.currentTarget);
    return;
  }
  
  const playBtn = e.currentTarget;
  const type = playBtn.dataset.type;
  const id = playBtn.dataset.id;
  if (!type || !id) return;
  
  try {
    let url = "";
    if (type === "playlist" || type === "playlists") url = `/api/playlists/${id}`;
    else if (type === "album" || type === "albums") url = `/api/albums/${id}`;
    else if (type === "artist" || type === "artists") url = `/api/artists/${id}`;
    else if (type === "tracks") {
       const trackObj = homeDataCache["tracks"]?.find(t => (t.id || t._id) == id);
       if (trackObj) playTrack(trackObj, homeDataCache["tracks"]);
       return;
    }
    
    if (url) {
      const res = await httpRequest.get(url, false);
      const data = res?.data || res?.playlist || res?.album || res?.artist || res;
      if (data && data.tracks && data.tracks.length > 0) {
        playTrack(data.tracks[0], data.tracks);
      } else if (data && data.popular_tracks && data.popular_tracks.length > 0) {
        playTrack(data.popular_tracks[0], data.popular_tracks);
      } else {
        alert("Không có bài hát nào để phát!");
      }
    }
  } catch (err) {
    console.error("Lỗi khi fetch data để play:", err);
  }
};

const showAuthTooltip = (targetEl) => {
  const tooltip = document.querySelector("#auth-tooltip");
  if (!tooltip) return;
  const rect = targetEl.getBoundingClientRect();
  
  // Try to place to the right of the target
  tooltip.style.left = (rect.right + 15) + "px";
  tooltip.style.top = Math.max(0, rect.top - 20) + "px";
  
  tooltip.classList.remove("hidden");
  setTimeout(() => tooltip.classList.remove("opacity-0"), 10);
};

const renderHomeSection = (containerId, items, type) => {
  const container = document.querySelector(`#${containerId}`);
  if (!container) return;

  if (!items || items.length === 0) {
    const section = container.closest('section');
    if (section) section.classList.add('hidden');
    return;
  }

  const htmlString = items.map((item) => {
    let imageSrc = "https://community.spotify.com/t5/image/serverpage/image-id/196380iDD24539B5FCDEAF9/image-size/medium?v=v2&px=400";
    let title = "Untitled";
    let description = "";

    if (type === "tracks") {
      imageSrc = item.image_url || item.album_cover_image_url || imageSrc;
      title = item.title;
      description = item.artist_name || "";
    } else if (type === "artists") {
      imageSrc = item.image_url || imageSrc;
      title = item.name;
      description = "Artist";
    } else if (type === "albums") {
      imageSrc = item.cover_image_url || imageSrc;
      title = item.title;
      description = item.artist_name || "";
    } else if (type === "playlists") {
      imageSrc = item.image_url || item.cover_image_url || imageSrc;
      title = item.name;
      description = item.description || `By ${item.user_display_name || 'Spotify'}`;
    }

    const isArtist = type === "artists";

    return `
      <div class="w-[180px] shrink-0 rounded-md p-3 hover:bg-[#282828] transition-colors group/card cursor-pointer" data-id="${item.id || item._id}" data-type="${type}">
        <div class="relative w-full aspect-square ${isArtist ? 'rounded-full' : 'rounded-md'} overflow-hidden mb-4 shadow-lg">
          <img src="${imageSrc}" class="w-full h-full object-cover" onerror="this.src='https://community.spotify.com/t5/image/serverpage/image-id/196380iDD24539B5FCDEAF9/image-size/medium?v=v2&px=400'" />
          
          <button class="home-play-btn absolute bottom-2 right-2 w-12 h-12 rounded-full bg-[#1ed760] shadow-lg text-black flex items-center justify-center hover:scale-105 opacity-0 group-hover/card:opacity-100 transition-all z-10 translate-y-2 group-hover/card:translate-y-0" data-id="${item.id || item._id}" data-type="${type}">
            <svg viewBox="0 0 24 24" class="h-6 w-6 fill-current">
              <path d="M7.05 3.606l13.49 7.788a.7.7 0 0 1 0 1.212L7.05 20.394A.7.7 0 0 1 6 19.788V4.212a.7.7 0 0 1 1.05-.606z"></path>
            </svg>
          </button>
        </div>
        <h3 class="font-bold text-[16px] truncate text-white">${title}</h3>
        <p class="text-[14px] text-[#b3b3b3] truncate mt-1">${description}</p>
      </div>
    `;
  }).join("");

  container.innerHTML = htmlString;
  attachPlayButtonListeners();
};

const renderQuickAccess = (items) => {
  const container = document.querySelector("#home-quick-access-list");
  if (!container) return;

  const htmlString = items.map(item => {
    let title = item.name || item.title || "Liked Songs";
    let type = item.type || "playlist";
    let imageSrc = item.image_url || item.cover_image_url || "https://community.spotify.com/t5/image/serverpage/image-id/196380iDD24539B5FCDEAF9/image-size/medium?v=v2&px=400";
    
    return `
      <div class="flex items-center bg-[#ffffff1a] hover:bg-[#ffffff33] rounded-[4px] overflow-hidden group/qa cursor-pointer transition-colors h-12 lg:h-16 relative" data-id="${item.id || item._id || 'liked-songs'}" data-type="${type}">
        <div class="w-12 h-12 lg:w-16 lg:h-16 shrink-0 relative flex items-center justify-center bg-[#282828]">
          ${type === 'liked-songs' || item.id === 'liked-songs' ? `<div class="w-full h-full bg-gradient-to-br from-[#450af5] to-[#c4efd9] flex items-center justify-center"><svg viewBox="0 0 24 24" class="h-6 w-6 lg:h-8 lg:w-8 fill-white"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg></div>` : `<img src="${imageSrc}" class="w-full h-full object-cover shadow-[0_8px_24px_rgba(0,0,0,0.5)]" onerror="this.src='https://community.spotify.com/t5/image/serverpage/image-id/196380iDD24539B5FCDEAF9/image-size/medium?v=v2&px=400'" />`}
        </div>
        <div class="flex-1 px-4 truncate font-bold text-white text-[15px] pointer-events-none">${title}</div>
        <button class="home-play-btn absolute right-2 w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-[#1ed760] shadow-lg text-black flex items-center justify-center hover:scale-105 opacity-0 group-hover/qa:opacity-100 transition-all z-10" data-id="${item.id || item._id || 'liked-songs'}" data-type="${type}">
          <svg viewBox="0 0 24 24" class="h-5 w-5 fill-current pointer-events-none">
            <path d="M7.05 3.606l13.49 7.788a.7.7 0 0 1 0 1.212L7.05 20.394A.7.7 0 0 1 6 19.788V4.212a.7.7 0 0 1 1.05-.606z"></path>
          </svg>
        </button>
      </div>
    `;
  }).join("");

  container.innerHTML = htmlString;
  attachPlayButtonListeners(); 
};

const fetchHomeData = async () => {
  try {
    const results = await Promise.allSettled([
      httpRequest.get("/api/tracks/trending", false),
      httpRequest.get("/api/artists", false),
      httpRequest.get("/api/albums", false),
      httpRequest.get("/api/playlists", false)
    ]);

    const extractData = (res) => {
      if (res.status === "fulfilled" && res.value) {
        if (Array.isArray(res.value)) return res.value;
        if (res.value.data && Array.isArray(res.value.data)) return res.value.data;
        if (res.value.items && Array.isArray(res.value.items)) return res.value.items;
        if (res.value.tracks && Array.isArray(res.value.tracks)) return res.value.tracks;
        if (res.value.artists && Array.isArray(res.value.artists)) return res.value.artists;
        if (res.value.albums && Array.isArray(res.value.albums)) return res.value.albums;
        if (res.value.playlists && Array.isArray(res.value.playlists)) return res.value.playlists;
      }
      return [];
    };

    homeDataCache.tracks = extractData(results[0]);
    homeDataCache.artists = extractData(results[1]);
    homeDataCache.albums = extractData(results[2]);
    homeDataCache.playlists = extractData(results[3]);

    try {
      const { localDb } = await import("./libs/localDb.js");
      const localTracks = await localDb.getAllLocalTracks();
      
      const currentUserId = (() => {
        try {
          const user = JSON.parse(localStorage.getItem('user'));
          return user ? (user._id || user.id || user.user_id || user.username) : null;
        } catch(e) { return null; }
      })();

      // Deduplicate local tracks by title and artist so they don't appear multiple times on the home view
      const uniqueLocalTracks = [];
      const seen = new Set();
      for (const lt of localTracks.reverse()) {
        if (lt.userId && lt.userId !== currentUserId) continue; // Filter by user, allow old tracks without userId

        const key = (lt.title + "|" + lt.artist_name).toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          uniqueLocalTracks.push(lt);
        }
      }

      const mappedLocalTracks = uniqueLocalTracks.map(lt => ({
        id: lt.id,
        _id: lt.id,
        title: lt.title,
        name: lt.title,
        artist_name: lt.artist_name,
        artist: { name: lt.artist_name },
        image_url: URL.createObjectURL(lt.imageBlob),
        preview_url: URL.createObjectURL(lt.audioBlob),
        duration_ms: lt.duration,
        isLocal: true,
        album: { title: "Local Files" }
      }));
      // Put them at the beginning of Today's biggest hits
      homeDataCache.tracks.unshift(...mappedLocalTracks);
    } catch(err) {
      console.warn("Failed to load local tracks for home view", err);
    }

    renderHomeSection("home-tracks-list", homeDataCache.tracks, "tracks");
    renderHomeSection("home-artists-list", homeDataCache.artists, "artists");
    renderHomeSection("home-albums-list", homeDataCache.albums, "albums");
    renderHomeSection("home-playlists-list", homeDataCache.playlists, "playlists");

    // Show All logic
    document.querySelectorAll("a[href='#!']").forEach((link) => {
      if (link.textContent.trim() === "Show all") {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          const section = link.closest("section");
          if (!section) return;
          const sectionId = section.id;
          const type = sectionId.split("-")[1]; // e.g., 'tracks'
          const title = section.querySelector("h2").textContent;

          document.querySelector("#home-view").classList.add("hidden");
          document.querySelector("#podcasts-page").classList.add("hidden");
          document.querySelector("#view-all-page").classList.remove("hidden");
          document.querySelector("#view-all-page").classList.add("flex");
          
          document.querySelector("#view-all-title").textContent = title;
          
          // Re-use render function, it attaches play button listeners
          renderHomeSection("view-all-grid", homeDataCache[type], type);
        });
      }
    });

  } catch (error) {
    console.error("Failed to fetch home data", error);
  }
};

// Auth Toggle Logic
document.addEventListener("DOMContentLoaded", async () => {
  // Initialize Search Feature
  initSearch();
  initUploadModal();

  const token = localStorage.getItem("access_token");
  const authButtons = document.querySelector("#auth-buttons");
  const userProfile = document.querySelector("#user-profile");
  const userAvatar = document.querySelector("#user-avatar");
  const userDropdown = document.querySelector("#user-dropdown");
  const logoutBtn = document.querySelector("#logout-btn");
  const previewBanner = document.querySelector("#preview-banner");
  const playbar = document.querySelector("#playbar");

  const guestLinks = document.querySelector("#guest-links");
  const authInstallApp = document.querySelector("#auth-install-app");
  const loggedInLinks = document.querySelector("#logged-in-links");

  // Layout elements
  const guestSidebar = document.querySelector("#guest-sidebar");
  const userSidebar = document.querySelector("#user-sidebar");

  // Create Dropdown Logic
  const createBtn = document.querySelector("#create-playlist-btn");
  const createDropdown = document.querySelector("#create-dropdown");
  const createBtnIcon = document.querySelector("#create-btn-icon");
  if (createBtn && createDropdown) {
    createBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const token = localStorage.getItem("access_token");
      if (!token) {
        showAuthTooltip(createBtn);
      } else {
        createDropdown.classList.toggle("hidden");
        if (createBtnIcon) {
          createBtnIcon.classList.toggle("rotate-45");
        }
      }
    });
    document.addEventListener("click", () => {
      createDropdown.classList.add("hidden");
      if (createBtnIcon) {
        createBtnIcon.classList.remove("rotate-45");
      }
    });
  }

  // Auth Tooltip Logic
  const authTooltip = document.querySelector("#auth-tooltip");
  const authTooltipClose = document.querySelector("#auth-tooltip-close");
  if (authTooltipClose) {
    authTooltipClose.addEventListener("click", () => {
      authTooltip.classList.add("opacity-0");
      setTimeout(() => authTooltip.classList.add("hidden"), 200);
    });
  }
  document.addEventListener("click", (e) => {
    if (authTooltip && !authTooltip.classList.contains("hidden") && !authTooltip.contains(e.target)) {
      // Don't close if clicking a require-auth-btn (it's handled there)
      if (!e.target.closest(".require-auth-btn") && !e.target.closest(".home-play-btn")) {
        authTooltip.classList.add("opacity-0");
        setTimeout(() => authTooltip.classList.add("hidden"), 200);
      }
    }
  });

  document.querySelectorAll(".require-auth-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        e.preventDefault();
        e.stopPropagation(); // prevent closing dropdown or tooltip immediately
        showAuthTooltip(e.currentTarget);
      }
    });
  });



  // Language toggle button
  const langBtn = document.querySelector("#lang-btn");
  const langText = document.querySelector("#lang-text");
  if (langBtn && langText) {
    langBtn.addEventListener("click", () => {
      const isEnglish = langText.textContent === "English";
      langText.textContent = isEnglish ? "Tiếng Việt" : "English";
      document.title = isEnglish ? "Spotify - Trình phát trên web: Âm nhạc cho mọi người" : "Spotify - Web Player: Music for everyone";
    });
  }

  // Podcasts Page Navigation
  const browsePodcastsBtn = document.querySelector("#browse-podcasts-btn");
  if (browsePodcastsBtn) {
    browsePodcastsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelector("#home-view").classList.add("hidden");
      document.querySelector("#view-all-page").classList.add("hidden");
      document.querySelector("#view-all-page").classList.remove("flex");
      document.querySelector("#podcasts-page").classList.remove("hidden");
      document.querySelector("#podcasts-page").classList.add("flex");
    });
  }

  // Home Navigation (Clicking logo or Home button)
  document.querySelectorAll("a[href='#']").forEach(link => {
    if (link.closest("header")) {
      link.addEventListener("click", (e) => {
        // Simple way: just reload or show home view
        if (!link.classList.contains("text-[14px]")) { // Skip right links
          e.preventDefault();
          showPage("home-view");
        }
      });
    }
  });

  // Add Scroll Left buttons and attach scroll events for horizontal lists
  const sections = document.querySelectorAll("section.group .relative");
  sections.forEach((container) => {
    const list = container.querySelector(".overflow-x-auto");
    const rightBtn = container.querySelector(".scroll-right-btn");
    
    if (list && rightBtn) {
      // Create Left Button
      const leftBtn = document.createElement("button");
      leftBtn.className = "absolute -left-2 top-1/2 -translate-y-[calc(50%+1rem)] w-10 h-10 rounded-full bg-[#181818] shadow-lg text-white flex items-center justify-center hover:scale-105 opacity-0 group-hover:opacity-100 transition-opacity z-10 hidden";
      leftBtn.innerHTML = `<svg viewBox="0 0 16 16" class="w-5 h-5 fill-current"><path d="M11.069 1.069L4.138 8l6.931 6.931.737-.738L5.612 8l6.194-6.194-.737-.737z"/></svg>`;
      container.insertBefore(leftBtn, list);

      // Scroll Logic
      const scrollAmount = 600;

      rightBtn.addEventListener("click", () => {
        list.scrollBy({ left: scrollAmount, behavior: "smooth" });
      });

      leftBtn.addEventListener("click", () => {
        list.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      });
      
      // Toggle button visibility based on scroll position
      const toggleButtons = () => {
        if (list.scrollLeft > 0) {
          leftBtn.classList.remove("hidden");
          leftBtn.classList.add("md:flex");
        } else {
          leftBtn.classList.add("hidden");
          leftBtn.classList.remove("md:flex");
        }

        if (list.scrollLeft + list.clientWidth >= list.scrollWidth - 10) {
          rightBtn.classList.add("hidden");
          rightBtn.classList.remove("md:flex");
        } else {
          rightBtn.classList.remove("hidden");
          rightBtn.classList.add("md:flex");
        }
      };

      list.addEventListener("scroll", toggleButtons);
      // Run once after rendering data
      setTimeout(toggleButtons, 1000);
      window.addEventListener("resize", toggleButtons);
    }
  });

  const setLoggedOutState = () => {
    if (authButtons) {
      authButtons.classList.remove("hidden");
      authButtons.classList.add("flex");
    }
    if (guestLinks) {
      guestLinks.classList.remove("hidden");
      guestLinks.classList.add("flex");
    }
    if (authInstallApp) {
      authInstallApp.classList.remove("hidden");
      authInstallApp.classList.add("flex");
    }
    if (loggedInLinks) {
      loggedInLinks.classList.add("hidden");
      loggedInLinks.classList.remove("flex");
    }
    if (previewBanner) {
      previewBanner.classList.remove("hidden");
      previewBanner.classList.add("flex");
    }
    if (userProfile) {
      userProfile.classList.add("hidden");
      userProfile.classList.remove("flex");
    }
    if (playbar) {
      playbar.classList.add("hidden");
      playbar.classList.remove("flex");
    }
    const homeFilters = document.querySelector("#home-filters");
    if (homeFilters) {
      homeFilters.classList.add("hidden");
      homeFilters.classList.remove("flex");
    }
    // Layout
    if (guestSidebar) {
      guestSidebar.classList.remove("hidden");
      guestSidebar.classList.add("flex");
    }
    if (userSidebar) {
      userSidebar.classList.add("hidden");
      userSidebar.classList.remove("flex");
    }
  };

  const setLoggedInState = (user) => {
    if (authButtons) authButtons.classList.add("hidden");
    if (guestLinks) guestLinks.classList.add("hidden");
    if (authInstallApp) authInstallApp.classList.add("hidden");
    if (previewBanner) previewBanner.classList.add("hidden");
    
    if (loggedInLinks) {
      loggedInLinks.classList.remove("hidden");
      loggedInLinks.classList.add("flex");
    }

    // Layout
    if (guestSidebar) guestSidebar.classList.add("hidden");
    if (userSidebar) {
      userSidebar.classList.remove("hidden");
      userSidebar.classList.add("flex");
    }
    const homeFilters = document.querySelector("#home-filters");
    if (homeFilters) {
      homeFilters.classList.remove("hidden");
      homeFilters.classList.add("flex");
    }

    if (userProfile) {
      userProfile.classList.remove("hidden");
      userProfile.classList.add("flex");
      
      const userInitial = document.querySelector("#user-initial");
      
      const savedTempAvatar = localStorage.getItem(window.getUserKey("temp_user_avatar"));
      const finalAvatarUrl = savedTempAvatar || user.avatar_url || user.image_url;
      
      if (finalAvatarUrl) {
        userAvatar.src = finalAvatarUrl;
        userAvatar.classList.remove("hidden");
        userInitial.classList.add("hidden");
      } else {
        userAvatar.classList.add("hidden");
        userInitial.classList.remove("hidden");
        userInitial.textContent = user.username ? user.username.charAt(0).toUpperCase() : "U";
      }

      userProfile.addEventListener("click", (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle("hidden");
        userDropdown.classList.toggle("flex");
      });

      document.addEventListener("click", (e) => {
        if (!userProfile.contains(e.target)) {
          userDropdown.classList.add("hidden");
          userDropdown.classList.remove("flex");
        }
      });

      // Handle Profile / Account Modal
      const dropdownLinks = userDropdown.querySelectorAll("a");
      dropdownLinks.forEach(link => {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          const text = link.textContent.trim().toLowerCase();
          
          if (text.includes("upgrade")) {
            alert("This feature is premium only!");
            return;
          }
          
          // For Account, Profile, Settings -> Show Profile Page
          showUserProfile(user, sidebarItems);
          
          userDropdown.classList.add("hidden");
          userDropdown.classList.remove("flex");
        });
      });
    }

    let sidebarItems = [];
    let currentFilter = 'all';
    let currentSort = 'recents';
    let currentSearch = '';
    let currentView = 'default-list';
    let currentFolderId = null;

    window.setSidebarFolder = (folderId, folderName) => {
      currentFolderId = folderId;
      const defaultHeader = document.querySelector("#sidebar-header-default");
      const folderHeader = document.querySelector("#sidebar-header-folder");
      const folderTitle = document.querySelector("#sidebar-folder-title");
      
      if (folderId) {
        if (defaultHeader) defaultHeader.classList.add("hidden");
        if (folderHeader) {
          folderHeader.classList.remove("hidden");
          folderHeader.classList.add("flex");
        }
        if (folderTitle) folderTitle.textContent = folderName || "Folder";
      } else {
        if (defaultHeader) defaultHeader.classList.remove("hidden");
        if (folderHeader) {
          folderHeader.classList.add("hidden");
          folderHeader.classList.remove("flex");
        }
      }
      renderSidebar();
    };

    const folderBackBtn = document.querySelector("#sidebar-folder-back-btn");
    if (folderBackBtn) {
      folderBackBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        window.setSidebarFolder(null);
      });
    }

    // Sidebar Data Fetch & Render

    const renderSidebar = () => {
      const sidebarList = document.querySelector("#sidebar-list");
      if (!sidebarList) return;
      
      let filteredItems = sidebarItems.filter(item => {
        if (currentFilter !== 'all' && item.type !== (currentFilter === 'playlists' ? 'playlist' : currentFilter === 'artists' ? 'artist' : 'album')) return false;
        if (currentSearch && !((item.name || item.title || '').toLowerCase().includes(currentSearch.toLowerCase()))) return false;
        
        // Folder logic
        if (currentFolderId) {
          // If inside a folder, only show playlists that are IN this folder
          if (item.folderId !== currentFolderId) return false;
        } else {
          // If in root, hide playlists that are inside ANY folder
          if (item.folderId) return false;
        }

        return true;
      });

      filteredItems.sort((a, b) => {
        if (currentSort === 'alphabetical') {
          return (a.name || a.title || '').localeCompare(b.name || b.title || '');
        } else if (currentSort === 'creator') {
          const creatorA = a.type === 'artist' ? a.name : a.type === 'playlist' ? (a.creator_name || '') : (a.artist_name || '');
          const creatorB = b.type === 'artist' ? b.name : b.type === 'playlist' ? (b.creator_name || '') : (b.artist_name || '');
          return creatorA.localeCompare(creatorB);
        }
        return 0;
      });

      if (currentView.includes('grid')) {
        const isExpanded = document.querySelector("#sidebar-container")?.classList.contains("w-[50vw]");
        if (isExpanded) {
          sidebarList.className = "grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 px-2";
        } else {
          sidebarList.className = "grid grid-cols-2 lg:grid-cols-3 gap-2 px-2";
        }
      } else {
        sidebarList.className = "flex flex-col px-2";
      }

      const isList = currentView.includes('list');
      const isCompact = currentView.includes('compact');
      const allLikedSidebar = JSON.parse(localStorage.getItem(window.getUserKey("liked_songs")) || "[]");
      const likedSongsCount = allLikedSidebar.filter(t => {
         const tid = t.id || t.track_id || t._id;
         return !(tid && String(tid).startsWith("local_track_"));
      }).length;

      const likedSongsHtml = `
        <div class="sidebar-item ${isList ? 'flex items-center gap-3 cursor-pointer hover:bg-[#1a1a1a] p-2 rounded-md transition-colors group' : 'flex flex-col cursor-pointer hover:bg-[#1a1a1a] p-3 rounded-md transition-colors group'}" data-id="liked-songs" data-type="liked-songs">
          <div class="${isList ? (isCompact ? 'w-8 h-8' : 'w-12 h-12') : 'w-full aspect-square mb-3'} bg-gradient-to-br from-[#450af5] to-[#c4efd9] rounded-md flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" class="${isList ? (isCompact ? 'h-4 w-4' : 'h-6 w-6') : 'h-10 w-10'} fill-white"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>
          </div>
          <div class="flex flex-col truncate">
            <span class="text-[#1ed760] font-medium ${isCompact && isList ? 'text-[14px]' : 'text-[15px]'} truncate">Liked Songs</span>
            ${isCompact ? '' : `
            <span id="liked-songs-count" class="text-[#b3b3b3] text-[13px] truncate flex items-center gap-1">
              <svg viewBox="0 0 16 16" class="h-3 w-3 fill-[#1ed760]"><path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z"></path></svg>
              Playlist • ${likedSongsCount} songs
            </span>`}
          </div>
        </div>
      `;

      // Async update liked songs count to include local tracks
      import('./libs/localDb.js').then(({ localDb }) => {
        localDb.getPlaylistLocalTracks(window.getUserKey("liked-songs")).then(localIds => {
           const countEl = document.querySelector("#liked-songs-count");
           if (countEl) countEl.innerHTML = `<svg viewBox="0 0 16 16" class="h-3 w-3 fill-[#1ed760]"><path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z"></path></svg> Playlist • ${likedSongsCount + localIds.length} songs`;
        }).catch(() => {});
      });

      const itemsHtml = filteredItems.filter(item => item.name !== "Liked Songs").map(item => {
        const hasImage = item.image_url || item.cover_image_url;
        const isPlaceholder = !hasImage || hasImage === "https://community.spotify.com/t5/image/serverpage/image-id/196380iDD24539B5FCDEAF9/image-size/medium?v=v2&px=400";
        const imageSrc = isPlaceholder ? "" : hasImage;
        const title = item.name || item.title || "Untitled";
        let subtitle = "";
        
        if (item.type === "playlist") {
          subtitle = `Playlist • ${item.creator_name || user?.username || "User"}`;
        } else if (item.type === "artist") {
          subtitle = "Artist";
        } else if (item.type === "album") {
          subtitle = `Album • ${item.artist_name || "Unknown Artist"}`;
        } else if (item.type === "folder") {
          subtitle = `${item.playlists ? item.playlists.length : 0} playlists`;
        }

        const isOwned = item.type === "folder" || item.creator_name === user?.username || item.creator_id === user?.id;
        const isArtist = item.type === "artist";

        let imageHtml = "";
        if (item.type === "folder") {
          imageHtml = `<div class="w-full h-full bg-[#242424] flex items-center justify-center"><svg viewBox="0 0 24 24" class="h-6 w-6 fill-none stroke-[#b3b3b3] stroke-[2]"><path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h4.62a1.5 1.5 0 0 1 1.06.44l1.88 1.88a.5.5 0 0 0 .35.15h5.09A2.5 2.5 0 0 1 21 8v10.5A2.5 2.5 0 0 1 18.5 21H5.5A2.5 2.5 0 0 1 3 18.5V5.5z" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;
        } else if (isPlaceholder && item.type === "playlist") {
          imageHtml = `<div class="w-full h-full bg-[#282828] flex items-center justify-center"><svg viewBox="0 0 24 24" class="h-[50%] w-[50%] fill-[#b3b3b3]"><path d="M6 3h15v15.5a3.5 3.5 0 1 1-3.5-3.5h1V7h-11v11.5a3.5 3.5 0 1 1-3.5-3.5h1V3zm2 2v9.04c-.32-.03-.65-.04-1-.04-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V7h11v5.04c-.32-.03-.65-.04-1-.04-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V5H8z"/></svg></div>`;
        } else {
          imageHtml = `<img src="${imageSrc || 'https://community.spotify.com/t5/image/serverpage/image-id/196380iDD24539B5FCDEAF9/image-size/medium?v=v2&px=400'}" class="w-full h-full object-cover" onerror="this.src='https://community.spotify.com/t5/image/serverpage/image-id/196380iDD24539B5FCDEAF9/image-size/medium?v=v2&px=400'" />`;
        }

        const caretHtml = item.type === "folder" ? `<button class="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#333] rounded-full"><svg viewBox="0 0 16 16" class="h-4 w-4 fill-[#b3b3b3]"><path d="M14 6l-6 6-6-6h12z"></path></svg></button>` : "";

        const draggableAttr = item.type === "playlist" ? 'draggable="true"' : '';
        const folderTargetAttr = item.type === "folder" ? 'data-folder-target="true"' : '';

        if (isList) {
          return `
            <div class="sidebar-item flex items-center gap-3 cursor-pointer hover:bg-[#1a1a1a] p-2 rounded-md transition-colors group" data-id="${item.id || item._id}" data-type="${item.type}" data-owned="${isOwned}" ${draggableAttr} ${folderTargetAttr}>
              <div class="${isCompact ? 'w-8 h-8' : 'w-12 h-12'} bg-[#282828] ${isArtist ? 'rounded-full' : 'rounded-md'} overflow-hidden shrink-0 flex items-center justify-center shadow-md">
                ${imageHtml}
              </div>
              <div class="flex flex-col truncate pointer-events-none">
                <span class="text-white font-medium ${isCompact ? 'text-[14px]' : 'text-[15px]'} truncate">${title}</span>
                ${isCompact ? '' : `<span class="text-[#b3b3b3] text-[13px] truncate">${subtitle}</span>`}
              </div>
              ${caretHtml}
            </div>
          `;
        } else {
          return `
            <div class="sidebar-item flex flex-col cursor-pointer hover:bg-[#1a1a1a] p-3 rounded-md transition-colors group" data-id="${item.id || item._id}" data-type="${item.type}" data-owned="${isOwned}">
              <div class="w-full aspect-square bg-[#282828] ${isArtist ? 'rounded-full' : 'rounded-md'} overflow-hidden mb-3 flex items-center justify-center shadow-md relative">
                ${imageHtml}
                ${item.type === "folder" ? `<div class="absolute bottom-2 right-2 p-1 bg-[#121212] rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"><svg viewBox="0 0 16 16" class="h-3 w-3 fill-[#b3b3b3]"><path d="M14 6l-6 6-6-6h12z"></path></svg></div>` : ""}
              </div>
              <span class="text-white font-medium text-[14px] truncate mb-1 pointer-events-none">${title}</span>
              ${isCompact ? '' : `<span class="text-[#b3b3b3] text-[12px] truncate pointer-events-none">${subtitle}</span>`}
            </div>
          `;
        }
      }).join("");

      sidebarList.innerHTML = (currentFilter === 'all' || currentFilter === 'playlists' ? likedSongsHtml : '') + itemsHtml;

      // Sidebar item click handlers are managed by playlist.js via event delegation
    };

    const fetchSidebarData = async () => {
      try {
        const timestamp = new Date().getTime();
        const [playlistsRes, artistsRes, albumsRes] = await Promise.allSettled([
          httpRequest.get(`/api/me/playlists?t=${timestamp}`, true),
          httpRequest.get(`/api/me/following?t=${timestamp}`, true),
          httpRequest.get(`/api/me/albums/liked?t=${timestamp}`, true)
        ]);

        const extractArray = (res) => {
          if (res.status === "fulfilled" && res.value) {
            const val = res.value;
            if (Array.isArray(val)) return val;
            if (val.data && Array.isArray(val.data)) return val.data;
            if (val.playlists && Array.isArray(val.playlists)) return val.playlists;
            if (val.artists && Array.isArray(val.artists)) return val.artists;
            if (val.albums && Array.isArray(val.albums)) return val.albums;
            if (val.items && Array.isArray(val.items)) return val.items;
          }
          return [];
        };

        let folders = [];
        let foldersMap = {};
        try {
          const folderKey = window.getUserKey("user_folders");
          folders = JSON.parse(localStorage.getItem(folderKey) || "[]");
          folders.forEach(f => {
            (f.playlists || []).forEach(pid => {
              foldersMap[pid] = f.id;
            });
          });
        } catch(e) {}

        sidebarItems = [
          ...folders,
          ...extractArray(playlistsRes).map(p => {
            const tempAvatar = localStorage.getItem(`playlist_avatar_${p.id || p._id}`);
            return { 
              ...p, 
              type: 'playlist', 
              image_url: tempAvatar || p.image_url || p.cover_image_url,
              folderId: foldersMap[p.id || p._id] || null
            };
          }),
          ...extractArray(artistsRes).map(a => ({ ...a, type: 'artist' })),
          ...extractArray(albumsRes).map(a => ({ ...a, type: 'album' }))
        ];

        renderSidebar();
        
        if (user) {
          document.querySelector("#home-quick-access-section")?.classList.remove("hidden");
          const recentStr = localStorage.getItem(window.getUserKey('recently_played_contexts'));
          let recents = [];
          if (recentStr) {
            try { recents = JSON.parse(recentStr); } catch(e){}
          }
          if (recents.length > 0) {
            renderQuickAccess(recents.slice(0, 4));
          } else {
            renderQuickAccess([{ type: 'liked-songs', id: 'liked-songs', name: 'Liked Songs' }, ...sidebarItems].slice(0, 4));
          }
        } else {
          document.querySelector("#home-quick-access-section")?.classList.add("hidden");
        }
      } catch (error) {
        console.error("Failed to fetch sidebar data", error);
      }
    };

    document.addEventListener('refreshSidebar', () => {
      fetchSidebarData();
    });
    
    document.addEventListener('liked_songs_changed', () => {
      renderSidebar();
    });

    document.addEventListener('recent_contexts_changed', () => {
      if (!user) return;
      const recentStr = localStorage.getItem(window.getUserKey('recently_played_contexts'));
      let recents = [];
      if (recentStr) {
        try { recents = JSON.parse(recentStr); } catch(e){}
      }
      if (recents.length > 0) {
        renderQuickAccess(recents.slice(0, 4));
      }
    });

    // Khởi tạo toàn bộ tính năng Playlist từ file riêng
    const playlistFeatures = initPlaylistFeatures({
      user,
      getSidebarItems: () => sidebarItems,
      setSidebarItems: (items) => { sidebarItems = items; },
      renderSidebar,
      fetchSidebarData
    });

    // Khởi tạo Detail Pages (Playlist, Artist, Album)
    initDetailPages({
      user,
      fetchSidebarData,
      openEditModal: playlistFeatures?.openEditModal || null
    });

    // Khởi tạo Player
    initPlayer();
    
    // Khởi tạo Tooltips
    initTooltips();

    fetchSidebarData();

    // Expand Sidebar Logic
    const sidebarExpandBtn = document.querySelector("#sidebar-expand-btn");
    const sidebarContainer = document.querySelector("#sidebar-container");
    let isSidebarExpanded = false;

    if (sidebarExpandBtn && sidebarContainer) {
      sidebarExpandBtn.addEventListener("click", () => {
        isSidebarExpanded = !isSidebarExpanded;
        
        if (isSidebarExpanded) {
          // Expanded state
          sidebarContainer.classList.remove("w-[320px]");
          sidebarContainer.classList.add("w-[50vw]"); 
          sidebarExpandBtn.setAttribute("data-tooltip", "Minimize Your Library");
          
          currentView = 'grid'; // Force grid view when expanded
          const gridViewBtn = document.querySelector("#sidebar-view-btn");
          if (gridViewBtn) {
            gridViewBtn.innerHTML = `
              <span class="text-[13px] font-medium mr-1">Grid</span>
              <svg viewBox="0 0 16 16" class="h-4 w-4 fill-current"><path d="M14 1.5H2c-.28 0-.5.22-.5.5v12c0 .28.22.5.5.5h12c.28 0 .5-.22.5-.5V2c0-.28-.22-.5-.5-.5zM3 13V3h4v10H3zm5.5 0V3h4v10h-4z"></path></svg>
            `;
          }
          
          // Change icon to minimize icon
          sidebarExpandBtn.innerHTML = `
            <svg viewBox="0 0 16 16" class="h-4 w-4 fill-current">
              <path d="M11 5V3.5h1.5V2.06L8.56 6H10v1.5H13V6h-1.5V4.56l3.94-3.94a.749.749 0 0 0-1.06-1.06L11 5zM5 11v1.5H3.5v1.44L7.44 10H6v-1.5H3V10h1.5v1.44l-3.94 3.94a.749.749 0 0 0 1.06 1.06L5 11z"></path>
            </svg>
          `;
        } else {
          // Collapsed state
          sidebarContainer.classList.remove("w-[50vw]");
          sidebarContainer.classList.add("w-[320px]");
          sidebarExpandBtn.setAttribute("data-tooltip", "Expand Your Library");
          
          currentView = 'default-list'; // Revert to list view
          const gridViewBtn = document.querySelector("#sidebar-view-btn");
          if (gridViewBtn) {
            gridViewBtn.innerHTML = `
              <span class="text-[13px] font-medium mr-1">List</span>
              <svg viewBox="0 0 16 16" class="h-4 w-4 fill-current"><path d="M14 13.5H2V12h12v1.5zm0-4H2V8h12v1.5zm0-4H2V4h12v1.5z"></path></svg>
            `;
          }
          
          // Change icon back to expand icon
          sidebarExpandBtn.innerHTML = `
            <svg viewBox="0 0 16 16" class="h-4 w-4 fill-current">
              <path d="M7.19 1A.749.749 0 0 1 8 1.75V4h-1.5V2.56L2.56 6.5H4v1.5H1V4h1.5v1.44L6.44 1.5A.749.749 0 0 1 7.19 1zM15 12h-1.5v-1.44l-3.94 3.94a.749.749 0 0 1-1.06-1.06l3.94-3.94H11V8h4v4z"></path>
            </svg>
          `;
        }
        
        // Re-init tooltips since we changed data-tooltip
        if (typeof initTooltips === 'function') initTooltips();
        
        renderSidebar();
      });
    }

    // Home Filter logic
    const homeFilterBtns = document.querySelectorAll(".home-filter-btn");
    homeFilterBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        // Reset all buttons (except following) to dark mode
        homeFilterBtns.forEach(b => {
          if (b.dataset.filter !== "following") {
            b.className = "home-filter-btn px-3 py-1.5 rounded-full bg-[#2a2a2a] hover:bg-[#333333] text-white text-[14px] font-medium transition-colors";
          }
        });
        
        const followingBtn = document.querySelector(".home-filter-btn[data-filter='following']");
        if (followingBtn) followingBtn.classList.add("hidden");

        const filter = btn.dataset.filter;
        
        if (filter === "all" || filter === "podcasts") {
          btn.className = "home-filter-btn px-3 py-1.5 rounded-full bg-white text-black text-[14px] font-medium transition-colors";
        } else if (filter === "music") {
          btn.className = "home-filter-btn px-3 py-1.5 rounded-full bg-white text-black text-[14px] font-medium transition-colors";
          if (followingBtn) {
            followingBtn.classList.remove("hidden");
            followingBtn.className = "home-filter-btn px-3 py-1.5 rounded-full bg-[#2a2a2a] hover:bg-[#333333] text-white text-[14px] font-medium transition-colors";
          }
        } else if (filter === "following") {
          const musicBtn = document.querySelector(".home-filter-btn[data-filter='music']");
          if (musicBtn) {
            musicBtn.className = "home-filter-btn px-3 py-1.5 rounded-full bg-[#2a2a2a] hover:bg-[#333333] text-white text-[14px] font-medium transition-colors";
          }
          btn.className = "home-filter-btn px-3 py-1.5 rounded-full bg-white text-black text-[14px] font-medium transition-colors";
          btn.classList.remove("hidden");
        }
      });
    });

    // Event Listeners for Phase 2 UI
    const searchBtn = document.querySelector("#sidebar-search-btn");
    const searchContainer = document.querySelector("#sidebar-search-container");
    const searchInput = document.querySelector("#sidebar-search-input");
    
    if (searchBtn && searchContainer) {
      searchBtn.addEventListener("click", () => {
        searchBtn.classList.add("hidden");
        searchContainer.classList.remove("hidden");
        searchInput.focus();
      });
      searchInput.addEventListener("input", (e) => {
        currentSearch = e.target.value;
        renderSidebar();
      });
      searchInput.addEventListener("blur", () => {
        if (!currentSearch) {
          searchContainer.classList.add("hidden");
          searchBtn.classList.remove("hidden");
        }
      });
    }

    const sortBtn = document.querySelector("#sidebar-sort-btn");
    const sortDropdown = document.querySelector("#sidebar-sort-dropdown");
    const sortText = document.querySelector("#sidebar-sort-text");
    
    if (sortBtn && sortDropdown) {
      sortBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        sortDropdown.classList.toggle("hidden");
        sortDropdown.classList.toggle("flex");
      });
      document.addEventListener("click", (e) => {
        if (!sortDropdown.contains(e.target) && !sortBtn.contains(e.target)) {
          sortDropdown.classList.add("hidden");
          sortDropdown.classList.remove("flex");
        }
      });

      document.querySelectorAll(".sidebar-sort-option").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const btnEl = e.target.closest("button");
          const sortVal = btnEl.getAttribute("data-sort");
          currentSort = sortVal;
          // Only update the main button text if it's not recently-added (just "Recents" on the button)
          if (sortVal === "recently-added") {
            sortText.textContent = "Recents";
          } else {
            sortText.textContent = btnEl.textContent.trim();
          }
          
          document.querySelectorAll(".sidebar-sort-option").forEach(b => {
            b.classList.remove("text-[#1ed760]");
            b.classList.add("text-[#e5e5e5]");
            b.querySelector("svg").classList.add("hidden");
          });
          
          btnEl.classList.remove("text-[#e5e5e5]");
          btnEl.classList.add("text-[#1ed760]");
          btnEl.querySelector("svg").classList.remove("hidden");
          
          renderSidebar();
          sortDropdown.classList.add("hidden");
          sortDropdown.classList.remove("flex");
        });
      });

      const sidebarViewText = document.querySelector("#sidebar-view-text");
      document.querySelectorAll(".sidebar-view-option").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const btnEl = e.target.closest("button");
          const viewVal = btnEl.getAttribute("data-view");
          const labelVal = btnEl.getAttribute("data-label");
          currentView = viewVal;
          
          if (sidebarViewText) sidebarViewText.textContent = labelVal;

          document.querySelectorAll(".sidebar-view-option").forEach(b => {
            b.classList.remove("text-[#1ed760]", "bg-[#3e3e3e]");
            b.classList.add("text-[#b3b3b3]");
          });
          
          btnEl.classList.remove("text-[#b3b3b3]");
          btnEl.classList.add("text-[#1ed760]", "bg-[#3e3e3e]");
          
          renderSidebar();
          sortDropdown.classList.add("hidden");
          sortDropdown.classList.remove("flex");
        });
      });
    }

    const filterChips = document.querySelectorAll("#user-sidebar .flex.items-center.gap-2.px-2.pb-2 button");
    filterChips.forEach(chip => {
      chip.addEventListener("click", () => {
        const type = chip.textContent.toLowerCase();
        if (chip.classList.contains("bg-white")) {
          // Deselect
          chip.classList.remove("bg-white", "text-black");
          chip.classList.add("bg-[#242424]", "text-white");
          currentFilter = "all";
        } else {
          // Select
          filterChips.forEach(c => {
            c.classList.remove("bg-white", "text-black");
            c.classList.add("bg-[#242424]", "text-white");
          });
          chip.classList.remove("bg-[#242424]", "text-white");
          chip.classList.add("bg-white", "text-black");
          currentFilter = type;
        }
        renderSidebar();
      });
    });

    if (playbar) {
      playbar.classList.remove("hidden");
      playbar.classList.add("flex");
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        
        try {
          await httpRequest.post("/api/auth/logout", {});
        } catch (error) {
          console.warn("Logout API issue or not ready:", error);
        }

        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        window.location.href = "/";
      });
    }

    // Phase 3: Create Playlist is now handled by global event delegation below

    // Phase 3: Context Menu - Đã chuyển sang playlist.js

    // Edit Playlist Modal Logic - Đã chuyển sang playlist.js

  };

  if (token) {
    try {
      const user = await httpRequest.get("/api/users/me", true);
      localStorage.setItem("user", JSON.stringify(user));
      setLoggedInState(user);
    } catch (error) {
      console.error("Token invalid or expired", error);
      localStorage.removeItem("access_token");
      setLoggedOutState();
    }
  } else {
    setLoggedOutState();
  }

  // Phase 6: Fetch Home View Data
  fetchHomeData();
});