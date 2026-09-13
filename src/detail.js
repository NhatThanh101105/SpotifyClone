// detail.js – Trang chi tiết Playlist / Artist / Album
import { httpRequest } from "./libs/httpRequest.js";
import { localDb } from "./libs/localDb.js";
import { initTooltips } from "./tooltip.js";
import { playTrack } from "./player.js";
import { showToast } from "./libs/toast.js";

// ===== HELPER: Ẩn tất cả pages, hiện 1 page =====
export function showPage(pageId) {
  const allPages = [
    "home-view",
    "playlist-details-page",
    "artist-details-page",
    "album-details-page",
    "view-all-page",
    "podcasts-page",
    "user-profile-page",
    "blend-page",
  ];
  allPages.forEach((id) => {
    const el = document.querySelector(`#${id}`);
    if (!el) return;
    el.classList.add("hidden");
    el.classList.remove("flex");
  });
  const target = document.querySelector(`#${pageId}`);
  if (target) {
    target.classList.remove("hidden");
    target.classList.add("flex");
  }
}

// ===== HELPER: Format thời gian ms/s → m:ss =====
function formatDuration(value) {
  if (!value) return "0:00";
  // If value > 20000, it's likely milliseconds. Otherwise, it's seconds.
  const totalSec = value > 20000 ? Math.floor(value / 1000) : Math.floor(value);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

// ===== HELPER: Format tổng thời gian =====
function formatTotalDuration(value) {
  if (!value) return "";
  const totalMin = value > 20000 ? Math.floor(value / 60000) : Math.floor(value / 60);
  if (totalMin < 60) return `${totalMin} min`;
  const hr = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  return min > 0 ? `${hr} hr ${min} min` : `${hr} hr`;
}

// ===== HELPER: Format số lớn =====
function formatNumber(n) {
  if (!n) return "0";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

const PLACEHOLDER_IMG = "https://community.spotify.com/t5/image/serverpage/image-id/196380iDD24539B5FCDEAF9/image-size/medium?v=v2&px=400";

// ===== HELPER: Render danh sách tracks (table) =====
function renderTrackList(tracks, { playlistId = null, user = null, showIndex = true } = {}) {
  if (!tracks || tracks.length === 0) {
    return `<p class="text-[#b3b3b3] text-[14px] py-4">No tracks yet.</p>`;
  }
  const token = localStorage.getItem("access_token");

  return `
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="text-[#b3b3b3] text-[12px] border-b border-[#2a2a2a]">
          <th class="pb-3 w-10 text-center font-normal">#</th>
          <th class="pb-3 pl-2 font-normal">Title</th>
          <th class="pb-3 hidden md:table-cell font-normal">Album</th>
          <th class="pb-3 text-right pr-2 font-normal">
            <svg viewBox="0 0 16 16" class="h-4 w-4 fill-[#b3b3b3] inline"><path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z"/><path d="M8 3.25a.75.75 0 0 1 .75.75v3.25H11a.75.75 0 0 1 0 1.5H7.25V4A.75.75 0 0 1 8 3.25z"/></svg>
          </th>
          ${playlistId && token ? '<th class="pb-3 w-10"></th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${tracks.map((track, i) => {
          const trackId = track.id || track.track_id || track._id;
          const title = track.title || track.track_title || track.name || "Unknown";
          const artistName = track.artist_name || track.artist?.name || track.artist || "";
          const albumTitle = track.album?.title || track.album_title || (typeof track.album === 'string' ? track.album : "") || "";
          const duration = formatDuration(track.duration_ms || track.duration || track.track_duration || 0);
          const imgSrc = track.image_url || track.track_image_url || track.album_cover_image_url || PLACEHOLDER_IMG;
          return `
            <tr class="group/track hover:bg-[#2a2a2a] transition-colors cursor-pointer" data-track-id="${trackId}">
              <td class="py-2 w-10 text-center text-[#b3b3b3] text-[14px]">
                <span class="group-hover/track:hidden">${showIndex ? i + 1 : ''}</span>
                <span class="hidden group-hover/track:inline">
                  <svg viewBox="0 0 24 24" class="h-4 w-4 fill-white mx-auto"><path d="M7.05 3.606l13.49 7.788a.7.7 0 0 1 0 1.212L7.05 20.394A.7.7 0 0 1 6 19.788V4.212a.7.7 0 0 1 1.05-.606z"/></svg>
                </span>
              </td>
              <td class="py-2 pl-2">
                <div class="flex items-center gap-3">
                  <img src="${imgSrc}" class="w-10 h-10 rounded object-cover shrink-0" onerror="this.src='${PLACEHOLDER_IMG}'" />
                  <div class="flex flex-col overflow-hidden">
                    <span class="text-white text-[14px] font-medium truncate">${title}</span>
                    <span class="text-[#b3b3b3] text-[12px] truncate">${artistName}</span>
                  </div>
                </div>
              </td>
              <td class="py-2 text-[#b3b3b3] text-[13px] hidden md:table-cell max-w-[200px] truncate">${albumTitle}</td>
              <td class="py-2 text-[#b3b3b3] text-[13px] text-right pr-2 whitespace-nowrap">${duration}</td>
              ${playlistId && token ? `
                <td class="py-2 w-10 text-center">
                  <button class="remove-track-btn opacity-0 group-hover/track:opacity-100 text-[#b3b3b3] hover:text-[#ff4444] transition-all" data-playlist-id="${playlistId}" data-track-id="${trackId}" data-tooltip="Remove from playlist">
                    <svg viewBox="0 0 16 16" class="h-4 w-4 fill-current"><path d="M1.47 1.47a.75.75 0 0 1 1.06 0L8 6.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L9.06 8l5.47 5.47a.75.75 0 1 1-1.06 1.06L8 9.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L6.94 8 1.47 2.53a.75.75 0 0 1 0-1.06z"/></svg>
                  </button>
                </td>
              ` : ''}
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

// ===== HELPER: Attach play events to track list =====
function attachTrackPlayEvents(container, tracks) {
  if (!container) return;
  container.querySelectorAll("tr[data-track-id]").forEach((row, index) => {
    row.addEventListener("click", (e) => {
      if (e.target.closest(".remove-track-btn")) return;
      const track = tracks[index];
      if (track) playTrack(track, tracks);
    });
  });
}

// ==============================================
// ===== PLAYLIST DETAIL (Full version) =====
// ==============================================
function saveToRecent(item, type) {
  try {
    let recent = JSON.parse(localStorage.getItem(window.getUserKey('recently_played_contexts')) || '[]');
    const id = type === 'liked-songs' ? 'liked-songs' : (item.id || item._id);
    recent = recent.filter(r => r.id !== id);
    recent.unshift({
      id: id,
      name: item.name || item.title || (type === 'liked-songs' ? 'Liked Songs' : 'Unknown'),
      type: type,
      image_url: item.image_url || item.cover_image_url || null
    });
    if (recent.length > 8) recent = recent.slice(0, 8);
    localStorage.setItem(window.getUserKey('recently_played_contexts'), JSON.stringify(recent));
    document.dispatchEvent(new Event('recent_contexts_changed'));
  } catch(e) {}
}

export async function showPlaylistDetail(id, { user, fetchSidebarData, openEditModal } = {}) {
  showPage("playlist-details-page");

  const pdTitle = document.querySelector("#pd-title");
  if (pdTitle) pdTitle.textContent = "Loading...";
  const pdBody = document.querySelector("#pd-body");
  if (pdBody) pdBody.innerHTML = `<div class="flex items-center justify-center h-40"><div class="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1ed760]"></div></div>`;

  try {
    let playlist = null;
    let tracks = [];

    if (id === "liked-songs") {
      playlist = {
        id: "liked-songs",
        name: "Liked Songs",
        is_public: false,
        image_url: "https://community.spotify.com/t5/image/serverpage/image-id/196380iDD24539B5FCDEAF9/image-size/medium?v=v2&px=400",
        creator_name: user?.display_name || user?.username || "You",
        user_id: user?.id
      };
      const allLiked = JSON.parse(localStorage.getItem(window.getUserKey("liked_songs")) || "[]");
      tracks = allLiked.filter(t => {
         const tid = t.id || t.track_id || t._id;
         return !(tid && String(tid).startsWith("local_track_"));
      });
    } else {
      const [playlistRes, tracksRes] = await Promise.allSettled([
        httpRequest.get(`/api/playlists/${id}`, false),
        httpRequest.get(`/api/playlists/${id}/tracks`, false),
      ]);

      playlist = playlistRes.status === "fulfilled"
        ? (playlistRes.value?.playlist || playlistRes.value?.data || playlistRes.value)
        : null;

      tracks = tracksRes.status === "fulfilled"
        ? (tracksRes.value?.tracks || tracksRes.value?.data || (Array.isArray(tracksRes.value) ? tracksRes.value : []))
        : [];
    }

    if (!playlist) { if (pdTitle) pdTitle.textContent = "Not found"; return; }
    
    // Override image with local version if backend didn't save it
    const tempAvatar = localStorage.getItem(`playlist_avatar_${id}`);
    if (tempAvatar) {
      playlist.image_url = tempAvatar;
    }
    
    saveToRecent(playlist, "playlist");

    try {
      const dbPid = id === "liked-songs" ? window.getUserKey("liked-songs") : id;
      const localTrackIds = await localDb.getPlaylistLocalTracks(dbPid);
      for (const tid of localTrackIds) {
        const lt = await localDb.getLocalTrack(tid);
        if (lt) {
          tracks.push({
            id: lt.id,
            _id: lt.id,
            title: lt.title,
            artist_name: lt.artist_name,
            image_url: URL.createObjectURL(lt.imageBlob),
            preview_url: URL.createObjectURL(lt.audioBlob),
            duration_ms: lt.duration,
            isLocal: true,
            album: { title: "Local Files" },
            artist: { name: lt.artist_name }
          });
        }
      }
    } catch(e) {
      console.error("Failed to load local tracks", e);
    }

    const totalMs = tracks.reduce((s, t) => s + (t.duration_ms || t.duration || 0), 0);
    const isOwner = user && (playlist.user_id === user.id || playlist.creator_id === user.id || playlist.creator_name === user.username || playlist.user_username === user.username);
    const token = localStorage.getItem("access_token");
    const imgSrc = playlist.image_url || playlist.cover_image_url;
    const isValidImg = imgSrc && imgSrc !== PLACEHOLDER_IMG;

    // Header
    const pdCoverImage = document.querySelector("#pd-cover-image");
    const pdPlaceholderIcon = document.querySelector("#pd-placeholder-icon");
    if (pdCoverImage && pdPlaceholderIcon) {
      if (isValidImg) {
        pdCoverImage.src = imgSrc;
        pdCoverImage.classList.remove("hidden");
        pdPlaceholderIcon.classList.add("hidden");
      } else {
        pdCoverImage.classList.add("hidden");
        pdPlaceholderIcon.classList.remove("hidden");
      }
    }
    if (pdTitle) pdTitle.textContent = playlist.name || "My Playlist";
    const pdStatus = document.querySelector("#pd-status");
    if (pdStatus) pdStatus.textContent = playlist.is_public !== false ? "Public Playlist" : "Private Playlist";
    const pdUserName = document.querySelector("#pd-user-name");
    if (pdUserName) pdUserName.textContent = playlist.creator_name || playlist.user_display_name || user?.username || user?.display_name || "User";
    const pdUserAvatar = document.querySelector("#pd-user-avatar");
    if (pdUserAvatar) {
      const savedTempAvatar = localStorage.getItem(window.getUserKey("temp_user_avatar"));
      pdUserAvatar.src = savedTempAvatar || user?.avatar_url || user?.image_url || "https://i.scdn.co/image/ab6761610000e5eb55d39ab9c21d506aa52f7021";
    }

    // Cover click → edit modal (owner only)
    const pdCoverContainer = document.querySelector("#pd-cover-container");
    if (pdCoverContainer && isOwner && token && typeof openEditModal === 'function') {
      const newCover = pdCoverContainer.cloneNode(true);
      pdCoverContainer.parentNode.replaceChild(newCover, pdCoverContainer);
      newCover.addEventListener("click", () => openEditModal(playlist));
      // Re-attach image inside new clone
      const newImg = newCover.querySelector("img");
      if (newImg && isValidImg) { newImg.src = imgSrc; newImg.classList.remove("hidden"); }
      const newSvg = newCover.querySelector("svg");
      if (newSvg && isValidImg) newSvg.classList.add("hidden");
    }

    // pd-title click
    const pdTitleEl = document.querySelector("#pd-title");
    if (pdTitleEl && isOwner && token && typeof openEditModal === 'function') {
      const newT = pdTitleEl.cloneNode(true);
      pdTitleEl.parentNode.replaceChild(newT, pdTitleEl);
      newT.textContent = playlist.name || "My Playlist";
      newT.addEventListener("click", () => openEditModal(playlist));
    }

    // Body
    if (!pdBody) return;
    pdBody.innerHTML = `
      <div class="flex items-center gap-6 mb-6">
        <button id="pd-play-btn" class="w-14 h-14 rounded-full bg-[#1ed760] flex items-center justify-center hover:scale-105 transition-transform shadow-lg">
          <svg viewBox="0 0 24 24" class="h-7 w-7 fill-black ml-1"><path d="M7.05 3.606l13.49 7.788a.7.7 0 0 1 0 1.212L7.05 20.394A.7.7 0 0 1 6 19.788V4.212a.7.7 0 0 1 1.05-.606z"/></svg>
        </button>
        ${isOwner && token && id !== 'liked-songs' ? `
          <button id="pd-upload-track-btn" class="font-medium text-[14px] bg-[#3e3e3e] hover:bg-[#4a4a4a] px-4 py-1.5 rounded-full transition-colors text-white flex items-center gap-2">
            <svg viewBox="0 0 16 16" class="h-4 w-4 fill-current"><path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z"></path><path d="M11.75 8a.75.75 0 0 1-.75.75H8.75V11a.75.75 0 0 1-1.5 0V8.75H5a.75.75 0 0 1 0-1.5h2.25V5a.75.75 0 0 1 1.5 0v2.25H11a.75.75 0 0 1 .75.75z"></path></svg>
            Upload Track
          </button>
          <button id="pd-privacy-btn" class="font-medium text-[14px] border border-[#444] hover:border-white px-4 py-1.5 rounded-full transition-colors text-white">
            ${playlist.is_public ? "Make private" : "Make public"}
          </button>
          <button id="pd-delete-btn" class="text-[#b3b3b3] hover:text-[#ff4444] transition-colors" data-tooltip="Delete playlist">
            <svg viewBox="0 0 16 16" class="h-5 w-5 fill-current"><path d="M11 3h4v1.5h-1.052l-.8 9.066a1 1 0 0 1-.997.934H3.849a1 1 0 0 1-.997-.934L2.052 4.5H1V3h4V1.5h6V3zm-6.5 9.5h1l.5-7H4.5l.5 7zm3 0h1V5.5h-1v7zm3 0h1l-.5-7H11l.5 7z"/></svg>
          </button>
        ` : token && !isOwner && id !== 'liked-songs' ? `
          <button id="pd-follow-btn" class="font-bold text-[14px] border border-[#727272] hover:border-white px-6 py-1.5 rounded-full transition-colors text-white">
            Follow
          </button>
        ` : ''}
      </div>
      <p class="text-[#b3b3b3] text-[12px] mb-4">${tracks.length} songs ${totalMs ? '• ' + formatTotalDuration(totalMs) : ''}</p>
      <div class="h-[1px] bg-[#2a2a2a] mb-4"></div>
      <div id="pd-track-list">
        ${renderTrackList(tracks, { playlistId: isOwner && token && id !== 'liked-songs' ? id : null, user })}
      </div>
      ${isOwner && token && id !== 'liked-songs' ? `
        <div class="mt-8 pt-6 border-t border-[#2a2a2a]">
          <button id="pd-edit-details-btn" class="bg-[#242424] hover:bg-[#333] text-white font-medium text-[14px] px-4 py-1.5 rounded-full flex items-center gap-2 transition-colors">
            <svg viewBox="0 0 16 16" class="h-4 w-4 fill-current"><path d="M13.293 2.112L11.888.707a.5.5 0 0 0-.707 0L1 10.887v3.613h3.613L14 3.526a.5.5 0 0 0 0-.707l-.707-.707zM3.199 13.5H2v-1.199L9.421 4.88l1.199 1.2-7.421 7.42zm8.482-8.481L10.482 3.82 11.534 2.77l1.199 1.198-1.052 1.051z"/></svg>
            Name & details
          </button>
        </div>
      ` : ''}
    `;

    // Edit details btn
    document.querySelector("#pd-edit-details-btn")?.addEventListener("click", () => typeof openEditModal === 'function' && openEditModal(playlist));
    document.querySelector("#pd-edit-btn")?.addEventListener("click", () => typeof openEditModal === 'function' && openEditModal(playlist));

    // Privacy toggle
    const privacyBtn = document.querySelector("#pd-privacy-btn");
    if (privacyBtn) {
      privacyBtn.addEventListener("click", async () => {
        try {
          const newPublic = !playlist.is_public;
          await httpRequest.put(`/api/playlists/${id}`, { name: playlist.name, description: playlist.description, is_public: newPublic }, true);
          playlist.is_public = newPublic;
          privacyBtn.textContent = newPublic ? "Make private" : "Make public";
          const pdStatusEl = document.querySelector("#pd-status");
          if (pdStatusEl) pdStatusEl.textContent = newPublic ? "Public Playlist" : "Private Playlist";
          if (fetchSidebarData) await fetchSidebarData();
        } catch (err) { alert("Lỗi: " + err.message); }
      });
    }

    // Upload Track
    document.querySelector("#pd-upload-track-btn")?.addEventListener("click", () => {
      const modal = document.querySelector("#upload-track-modal");
      if (modal) {
        modal.classList.remove("hidden");
        // Store current playlist ID in the modal
        modal.setAttribute("data-playlist-id", id);
      }
    });

    // Delete
    document.querySelector("#pd-delete-btn")?.addEventListener("click", async () => {
      if (!confirm("Bạn có chắc muốn xóa playlist này?")) return;
      try {
        await httpRequest.delete(`/api/playlists/${id}`, true);
        if (fetchSidebarData) await fetchSidebarData();
        showPage("home-view");
      } catch (err) { alert("Lỗi: " + err.message); }
    });

    // Follow/Unfollow (không phải owner)
    const followBtn = document.querySelector("#pd-follow-btn");
    if (followBtn) {
      let isFollowing = false;
      try {
        const meRes = await httpRequest.get("/api/me/playlists", true);
        const myPls = meRes?.playlists || meRes?.data || meRes || [];
        isFollowing = Array.isArray(myPls) && myPls.some(p => p.id === id || p._id === id);
        followBtn.textContent = isFollowing ? "Following" : "Follow";
      } catch {}
      followBtn.addEventListener("click", async () => {
        try {
          if (isFollowing) {
            await httpRequest.delete(`/api/playlists/${id}/follow`, true);
            isFollowing = false; followBtn.textContent = "Follow";
          } else {
            await httpRequest.post(`/api/playlists/${id}/follow`, {}, true);
            isFollowing = true; followBtn.textContent = "Following";
          }
          if (fetchSidebarData) await fetchSidebarData();
        } catch (err) { alert("Lỗi: " + err.message); }
      });
    }

    // Remove track
    pdBody.addEventListener("click", async (e) => {
      const btn = e.target.closest(".remove-track-btn");
      if (!btn || !isOwner) return;
      try {
        await httpRequest.delete(`/api/playlists/${btn.dataset.playlistId}/tracks/${btn.dataset.trackId}`, true);
        const res2 = await httpRequest.get(`/api/playlists/${id}/tracks`, false);
        const updated = res2?.tracks || res2?.data || [];
        const el = document.querySelector("#pd-track-list");
        if (el) el.innerHTML = renderTrackList(updated, { playlistId: id, user });
        attachTrackPlayEvents(document.querySelector("#pd-track-list"), updated);
      } catch (err) {
        console.warn("Backend remove track failed (mock API), updating locally:", err);
        // Remove locally from DOM
        const tr = btn.closest("tr");
        if (tr) tr.remove();
        import("./libs/toast.js").then(m => m.showToast("Track removed from playlist", "success"));
      }
    });

    // Phát nhạc khi click vào bài hát
    attachTrackPlayEvents(document.querySelector("#pd-track-list"), tracks);

    // Phát nhạc playlist (bài đầu tiên)
    document.querySelector("#pd-play-btn")?.addEventListener("click", () => {
      if (tracks.length > 0) playTrack(tracks[0], tracks);
    });

  } catch (err) {
    console.error("showPlaylistDetail:", err);
    if (document.querySelector("#pd-title")) document.querySelector("#pd-title").textContent = "Error";
  }
}

// ==============================================
// ===== LIKED SONGS DETAIL =====
// ==============================================
export async function showLikedSongs({ user, fetchSidebarData, openEditModal } = {}) {
  return showPlaylistDetail("liked-songs", { user, fetchSidebarData, openEditModal });
}

// ==============================================
// ===== ARTIST DETAIL =====
// ==============================================
export async function showArtistDetail(id, { user, fetchSidebarData } = {}) {
  showPage("artist-details-page");
  const page = document.querySelector("#artist-details-page");
  if (!page) return;
  page.innerHTML = `<div class="flex items-center justify-center h-64"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1ed760]"></div></div>`;

  try {
    const res = await httpRequest.get(`/api/artists/${id}`, false);
    const artist = res?.artist || res?.data || res;
    const token = localStorage.getItem("access_token");
    const imgSrc = artist.image_url || artist.avatar_url || PLACEHOLDER_IMG;
    const followers = formatNumber(artist.followers_count || artist.followers || 0);
    const tracks = artist.tracks || [];
    const albums = artist.albums || [];

    let isFollowing = false;
    if (token) {
      try {
        const meRes = await httpRequest.get("/api/me/following", true);
        const following = meRes?.artists || meRes?.data || meRes || [];
        isFollowing = Array.isArray(following) && following.some(a => a.id === id || a._id === id);
      } catch {}
    }

    page.innerHTML = `
      <div class="relative w-full min-h-[340px] shrink-0">
        <div class="absolute inset-0 bg-cover bg-center" style="background-image: url('${imgSrc}');"></div>
        <div class="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-[#121212]"></div>
        <div class="relative px-8 pb-8 pt-24 flex flex-col justify-end min-h-[340px]">
          <span class="text-white text-sm font-bold uppercase tracking-wider mb-2">Artist</span>
          <h1 class="text-white font-black tracking-tight mb-3" style="font-size: clamp(2.5rem, 8vw, 7rem); line-height: 1;">${artist.name || "Artist"}</h1>
          <p class="text-white/80 text-[14px] font-medium">${followers} followers</p>
        </div>
      </div>
      <div class="flex-1 bg-gradient-to-b from-[#1a1a1a] to-[#121212] px-8 py-6">
        <div class="flex items-center gap-6 mb-8">
          <button id="artist-play-btn" class="w-14 h-14 rounded-full bg-[#1ed760] flex items-center justify-center hover:scale-105 transition-transform shadow-lg">
            <svg viewBox="0 0 24 24" class="h-7 w-7 fill-black ml-1"><path d="M7.05 3.606l13.49 7.788a.7.7 0 0 1 0 1.212L7.05 20.394A.7.7 0 0 1 6 19.788V4.212a.7.7 0 0 1 1.05-.606z"/></svg>
          </button>
          ${token ? `
            <button id="artist-follow-btn" class="font-bold text-[14px] border px-6 py-1.5 rounded-full transition-colors text-white ${isFollowing ? 'border-white' : 'border-[#727272] hover:border-white'}" data-tooltip="${isFollowing ? 'Unfollow' : 'Follow'}">
              ${isFollowing ? "Following" : "Follow"}
            </button>
          ` : ''}
        </div>
        ${artist.description ? `<p class="text-[#b3b3b3] text-[14px] mb-8 max-w-2xl">${artist.description}</p>` : ''}
        ${tracks.length > 0 ? `
          <h2 class="text-white text-2xl font-bold mb-4">Popular</h2>
          <div class="mb-8">${renderTrackList(tracks.slice(0, 5), { showIndex: true })}</div>
        ` : ''}
        ${albums.length > 0 ? `
          <h2 class="text-white text-2xl font-bold mb-4">Albums</h2>
          <div class="flex flex-wrap gap-4">
            ${albums.map(album => `
              <div class="w-[160px] cursor-pointer group/album hover:bg-[#282828] p-3 rounded-md transition-colors artist-album-card" data-album-id="${album.id || album._id}">
                <img src="${album.cover_image_url || album.image_url || PLACEHOLDER_IMG}" class="w-full aspect-square object-cover rounded-md mb-3 shadow-lg" onerror="this.src='${PLACEHOLDER_IMG}'" />
                <p class="text-white font-medium text-[14px] truncate">${album.title || album.name || ''}</p>
                <p class="text-[#b3b3b3] text-[12px]">${album.release_year || ''}</p>
              </div>
            `).join("")}
          </div>
        ` : ''}
      </div>
    `;

    const followBtn = document.querySelector("#artist-follow-btn");
    if (followBtn) {
      let following = isFollowing;
      followBtn.addEventListener("click", async () => {
        try {
          if (following) {
            await httpRequest.delete(`/api/artists/${id}/follow`, true);
            following = false;
            followBtn.textContent = "Follow";
            followBtn.classList.remove("border-white"); followBtn.classList.add("border-[#727272]");
            followBtn.setAttribute("data-tooltip", "Follow");
            const gTooltip = document.querySelector("#generic-tooltip");
            if (gTooltip && !gTooltip.classList.contains("hidden")) gTooltip.textContent = "Follow";
          } else {
            await httpRequest.post(`/api/artists/${id}/follow`, {}, true);
            following = true;
            followBtn.textContent = "Following";
            followBtn.classList.add("border-white"); followBtn.classList.remove("border-[#727272]");
            followBtn.setAttribute("data-tooltip", "Unfollow");
            const gTooltip = document.querySelector("#generic-tooltip");
            if (gTooltip && !gTooltip.classList.contains("hidden")) gTooltip.textContent = "Unfollow";
          }
          if (fetchSidebarData) await fetchSidebarData();
        } catch (err) { alert("Lỗi: " + err.message); }
      });
    }

    // Phát nhạc
    attachTrackPlayEvents(document.querySelector("#artist-track-list"), tracks);

    document.querySelector("#artist-play-btn")?.addEventListener("click", () => {
      if (tracks.length > 0) playTrack(tracks[0], tracks);
    });

    page.querySelectorAll(".artist-album-card").forEach(card => {
      card.addEventListener("click", () => showAlbumDetail(card.dataset.albumId, { user, fetchSidebarData }));
    });

  } catch (err) {
    console.error("showArtistDetail:", err);
    page.innerHTML = `<div class="p-8 text-[#b3b3b3]">Failed to load artist.</div>`;
  }
}

// ==============================================
// ===== ALBUM DETAIL =====
// ==============================================
export async function showAlbumDetail(id, { user, fetchSidebarData } = {}) {
  showPage("album-details-page");
  const page = document.querySelector("#album-details-page");
  if (!page) return;
  page.innerHTML = `<div class="flex items-center justify-center h-64"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1ed760]"></div></div>`;

  try {
    const res = await httpRequest.get(`/api/albums/${id}`, false);
    const album = res?.album || res?.data || res;
    const token = localStorage.getItem("access_token");
    const imgSrc = album.cover_image_url || album.image_url || PLACEHOLDER_IMG;
    const tracks = album.tracks || [];
    const totalMs = tracks.reduce((s, t) => s + (t.duration_ms || t.duration || 0), 0);
    const releaseYear = album.release_year || (album.release_date ? album.release_date.substring(0, 4) : "");
    const plays = formatNumber(album.total_plays || album.play_count || 0);

    let isLiked = false;
    if (token) {
      try {
        const likedRes = await httpRequest.get("/api/me/albums/liked", true);
        const liked = likedRes?.albums || likedRes?.data || likedRes || [];
        isLiked = Array.isArray(liked) && liked.some(a => a.id === id || a._id === id);
      } catch {}
    }

    page.innerHTML = `
      <div class="h-[340px] bg-gradient-to-b from-[#5c4033] to-[#282828] flex items-end px-6 pb-6 gap-6 shrink-0">
        <img src="${imgSrc}" class="w-[232px] h-[232px] object-cover rounded shadow-[0_4px_60px_rgba(0,0,0,0.5)] shrink-0" onerror="this.src='${PLACEHOLDER_IMG}'" />
        <div class="flex flex-col gap-2 w-full mt-auto">
          <span class="text-white text-sm font-bold uppercase">Album</span>
          <h1 class="text-white font-black tracking-tight" style="font-size: clamp(1.5rem, 4vw, 5rem); line-height: 1.1;">${album.title || album.name || "Album"}</h1>
          <div class="flex items-center gap-2 text-sm text-white font-medium mt-2 flex-wrap">
            <span class="font-bold">${album.artist_name || ""}</span>
            ${releaseYear ? `<span class="text-white/50">•</span><span>${releaseYear}</span>` : ""}
            <span class="text-white/50">•</span><span>${tracks.length} songs</span>
            ${totalMs ? `<span class="text-white/50">•</span><span class="text-white/70">${formatTotalDuration(totalMs)}</span>` : ""}
          </div>
        </div>
      </div>
      <div class="flex-1 bg-gradient-to-b from-[#222] to-[#121212] px-6 py-6">
        <div class="flex items-center gap-6 mb-6">
          <button id="album-play-btn" class="w-14 h-14 rounded-full bg-[#1ed760] flex items-center justify-center hover:scale-105 transition-transform shadow-lg">
            <svg viewBox="0 0 24 24" class="h-7 w-7 fill-black ml-1"><path d="M7.05 3.606l13.49 7.788a.7.7 0 0 1 0 1.212L7.05 20.394A.7.7 0 0 1 6 19.788V4.212a.7.7 0 0 1 1.05-.606z"/></svg>
          </button>
          ${token ? `
            <button id="album-like-btn" class="transition-colors ${isLiked ? 'text-[#1ed760]' : 'text-[#b3b3b3] hover:text-white'}" data-tooltip="${isLiked ? 'Remove from library' : 'Save to library'}">
              <svg viewBox="0 0 24 24" class="h-8 w-8 fill-current">
                ${isLiked
                  ? '<path d="M15.724 4.22A4.313 4.313 0 0 0 12 6.026 4.313 4.313 0 0 0 8.276 4.22a4.5 4.5 0 0 0-3.187 1.3A4.306 4.306 0 0 0 3.75 8.63c0 1.217.456 2.352 1.339 3.373l.04.05 6.871 7.348 6.87-7.348.04-.05c.883-1.021 1.34-2.156 1.34-3.373a4.306 4.306 0 0 0-1.339-3.11 4.5 4.5 0 0 0-3.187-1.3z"/>'
                  : '<path d="M1.69 2A4.582 4.582 0 0 1 8 2.023 4.583 4.583 0 0 1 11.88.817h.002a4.618 4.618 0 0 1 3.782 3.65v.003a4.543 4.543 0 0 1-1.011 3.84L9.35 14.629a1.765 1.765 0 0 1-2.093.464 1.762 1.762 0 0 1-1.15-1.46l-.004-.002L.81 8.31a4.542 4.542 0 0 1-1.01-3.84v-.003A4.618 4.618 0 0 1 3.582.817H3.58zm1.093 1.488A3.082 3.082 0 0 0 1.258 5.76l5.315 6.31a.262.262 0 0 0 .385 0l5.314-6.31a3.082 3.082 0 0 0-1.525-4.887l-.003-.001A3.118 3.118 0 0 0 8 3.056a3.118 3.118 0 0 0-2.646-2.185h-.003A3.082 3.082 0 0 0 2.783 3.488z"/>'}
              </svg>
            </button>
          ` : ''}
          ${plays ? `<span class="text-[#b3b3b3] text-[13px]">${plays} plays</span>` : ''}
        </div>
        <div id="album-track-list">${renderTrackList(tracks, { showIndex: true })}</div>
        ${releaseYear ? `<p class="text-[#b3b3b3] text-[12px] mt-8">${releaseYear}</p>` : ''}
      </div>
    `;

    const likeBtn = document.querySelector("#album-like-btn");
    if (likeBtn) {
      let liked = isLiked;
      likeBtn.addEventListener("click", async () => {
        try {
          const heartPath_filled = '<path d="M15.724 4.22A4.313 4.313 0 0 0 12 6.026 4.313 4.313 0 0 0 8.276 4.22a4.5 4.5 0 0 0-3.187 1.3A4.306 4.306 0 0 0 3.75 8.63c0 1.217.456 2.352 1.339 3.373l.04.05 6.871 7.348 6.87-7.348.04-.05c.883-1.021 1.34-2.156 1.34-3.373a4.306 4.306 0 0 0-1.339-3.11 4.5 4.5 0 0 0-3.187-1.3z"/>';
          const heartPath_outline = '<path d="M1.69 2A4.582 4.582 0 0 1 8 2.023 4.583 4.583 0 0 1 11.88.817h.002a4.618 4.618 0 0 1 3.782 3.65v.003a4.543 4.543 0 0 1-1.011 3.84L9.35 14.629a1.765 1.765 0 0 1-2.093.464 1.762 1.762 0 0 1-1.15-1.46l-.004-.002L.81 8.31a4.542 4.542 0 0 1-1.01-3.84v-.003A4.618 4.618 0 0 1 3.582.817H3.58zm1.093 1.488A3.082 3.082 0 0 0 1.258 5.76l5.315 6.31a.262.262 0 0 0 .385 0l5.314-6.31a3.082 3.082 0 0 0-1.525-4.887l-.003-.001A3.118 3.118 0 0 0 8 3.056a3.118 3.118 0 0 0-2.646-2.185h-.003A3.082 3.082 0 0 0 2.783 3.488z"/>';
          if (liked) {
            await httpRequest.delete(`/api/albums/${id}/like`, true);
            liked = false;
            likeBtn.classList.remove("text-[#1ed760]"); likeBtn.classList.add("text-[#b3b3b3]");
            likeBtn.querySelector("svg").innerHTML = heartPath_outline;
            likeBtn.setAttribute("data-tooltip", "Save to library");
            const gTooltip = document.querySelector("#generic-tooltip");
            if (gTooltip && !gTooltip.classList.contains("hidden")) gTooltip.textContent = "Save to library";
          } else {
            await httpRequest.post(`/api/albums/${id}/like`, {}, true);
            liked = true;
            likeBtn.classList.add("text-[#1ed760]"); likeBtn.classList.remove("text-[#b3b3b3]");
            likeBtn.querySelector("svg").innerHTML = heartPath_filled;
            likeBtn.setAttribute("data-tooltip", "Remove from library");
            const gTooltip = document.querySelector("#generic-tooltip");
            if (gTooltip && !gTooltip.classList.contains("hidden")) gTooltip.textContent = "Remove from library";
          }
          if (fetchSidebarData) await fetchSidebarData();
        } catch (err) { alert("Lỗi: " + err.message); }
      });
    }

    // Phát nhạc album
    attachTrackPlayEvents(document.querySelector("#album-track-list"), tracks);
    
    document.querySelector("#album-play-btn")?.addEventListener("click", () => {
      if (tracks.length > 0) playTrack(tracks[0], tracks);
    });

  } catch (err) {
    console.error("showAlbumDetail:", err);
    page.innerHTML = `<div class="p-8 text-[#b3b3b3]">Failed to load album.</div>`;
  }
}

// ==============================================
// ===== INIT =====
// ==============================================
export function initDetailPages({ user, fetchSidebarData, openEditModal }) {
  // Home logo + Home button
  const goHome = () => showPage("home-view");
  document.querySelector("#logo-link")?.addEventListener("click", (e) => { e.preventDefault(); goHome(); });
  document.querySelector("#home-btn")?.addEventListener("click", (e) => { e.preventDefault(); goHome(); });

  // Click handler trên home cards (event delegation)
  const handleCardClick = (e) => {
    const card = e.target.closest("[data-id][data-type]");
    if (!card || e.target.closest(".home-play-btn")) return;
    const itemId = card.dataset.id;
    const itemType = card.dataset.type;
    if (!itemId || !itemType) return;
    if (itemType === "playlists" || itemType === "playlist") {
      showPlaylistDetail(itemId, { user, fetchSidebarData, openEditModal });
    } else if (itemType === "artists" || itemType === "artist") {
      showArtistDetail(itemId, { user, fetchSidebarData });
    } else if (itemType === "albums" || itemType === "album") {
      showAlbumDetail(itemId, { user, fetchSidebarData });
    } else if (itemType === "liked-songs") {
      showLikedSongs({ user });
    }
  };

  document.querySelector("#home-view")?.addEventListener("click", handleCardClick);
  document.querySelector("#view-all-page")?.addEventListener("click", handleCardClick);

  document.addEventListener('liked_songs_changed', () => {
    const page = document.querySelector("#playlist-details-page");
    const title = document.querySelector("#pd-title");
    if (page && !page.classList.contains("hidden") && title && title.textContent === "Liked Songs") {
      showLikedSongs({ user });
    }
  });

  return { showPlaylistDetail, showArtistDetail, showAlbumDetail, showPage, showUserProfile };
}

// ===== Show User Profile Page =====
export async function showUserProfile(user, sidebarItems = []) {
  if (!user) return;
  showPage("user-profile-page");

  // DOM Elements
  const avatar = document.querySelector("#up-user-avatar");
  const initial = document.querySelector("#up-user-initial");
  const name = document.querySelector("#up-user-name");
  const plCount = document.querySelector("#up-playlists-count");
  const folCount = document.querySelector("#up-following-count");
  const trackList = document.querySelector("#up-tracks-list");

  // Basic Info
  name.textContent = user.display_name || user.username || "User";
  if (user.avatar_url || user.image_url) {
    avatar.src = user.avatar_url || user.image_url;
    avatar.classList.remove("hidden");
    initial.classList.add("hidden");
  } else {
    avatar.classList.add("hidden");
    initial.classList.remove("hidden");
    initial.textContent = user.username ? user.username.charAt(0).toUpperCase() : "U";
  }

  // Count from sidebar data
  const playlists = sidebarItems.filter(i => i.type === "playlist");
  const following = sidebarItems.filter(i => i.type !== "playlist");
  plCount.textContent = `${playlists.length} Public Playlists`;
  folCount.textContent = `${following.length} Following`;

  // Avatar Upload Logic
  const avatarContainer = document.querySelector("#up-avatar-container");
  const avatarInput = document.querySelector("#up-avatar-input");
  
  if (avatarContainer && avatarInput) {
    avatarContainer.onclick = () => avatarInput.click();
    
    avatarInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const prevAvatarSrc = avatar.src;
      const objectUrl = URL.createObjectURL(file);
      avatar.src = objectUrl;
      avatar.classList.remove("hidden");
      initial.classList.add("hidden");
      
      const updateUIAvatar = (newUrl) => {
        user.avatar_url = newUrl;
        user.image_url = newUrl;
        const headerAvatar = document.querySelector("#user-avatar");
        const headerInitial = document.querySelector("#user-initial");
        if (headerAvatar && headerInitial) {
          headerAvatar.src = newUrl;
          headerAvatar.classList.remove("hidden");
          headerInitial.classList.add("hidden");
        }
        // Save to local storage for persistence across reloads
        localStorage.setItem(window.getUserKey("temp_user_avatar"), newUrl);
        showToast("Cập nhật ảnh đại diện thành công!", "success");
      };

      // Try ImgBB first
      try {
        const formData = new FormData();
        formData.append("image", file);
        const imgbbRes = await fetch("https://api.imgbb.com/1/upload?key=3a42eb9bc6d9620eddbb02bfa408b63e", {
          method: "POST",
          body: formData,
        });
        const imgbbData = await imgbbRes.json();
        
        if (imgbbData && imgbbData.data && imgbbData.data.url) {
          updateUIAvatar(imgbbData.data.url);
        } else {
          throw new Error("ImgBB upload failed");
        }
      } catch (err) {
        console.warn("ImgBB upload error, falling back to local base64:", err);
        // Fallback to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          updateUIAvatar(reader.result);
        };
        reader.readAsDataURL(file);
      }
      
      avatarInput.value = "";
    };
  }

  // Check if we have a temp avatar saved
  const savedAvatar = localStorage.getItem(window.getUserKey("temp_user_avatar"));
  if (savedAvatar) {
    user.avatar_url = savedAvatar;
    user.image_url = savedAvatar;
    avatar.src = savedAvatar;
    avatar.classList.remove("hidden");
    initial.classList.add("hidden");
  }

  // Fetch "Top Tracks" (Simulate with trending)
  try {
    const res = await httpRequest.get("/api/tracks/trending");
    const tracks = (res.data || res.tracks || res).slice(0, 5); // Just top 5
    
    trackList.innerHTML = renderTrackList(tracks, { user, showIndex: true });
    attachTrackPlayEvents(document.querySelector("#up-tracks-list"), tracks);
  } catch (err) {
    trackList.innerHTML = `<div class="text-[#b3b3b3] p-4">Could not load top tracks.</div>`;
  }
}

// ===== Upload Local Track Modal Logic =====
export function initUploadModal() {
  const modal = document.querySelector("#upload-track-modal");
  const closeBtn = document.querySelector("#close-upload-modal-btn");
  const nameInput = document.querySelector("#upload-track-name");
  const artistInput = document.querySelector("#upload-track-artist");
  const imgInput = document.querySelector("#upload-track-img-file");
  const audioInput = document.querySelector("#upload-track-audio-file");
  const saveBtn = document.querySelector("#save-track-btn");
  const errorMsg = document.querySelector("#upload-track-error");
  const imgContainer = document.querySelector("#upload-track-image-container");
  const previewImg = document.querySelector("#upload-track-image");
  const uploadIcon = document.querySelector("#upload-track-icon");
  const audioPreview = document.querySelector("#upload-track-audio-preview");
  const audioLabel = document.querySelector("#upload-track-audio-label");

  if (!modal) return;

  const closeModal = () => {
    modal.classList.add("hidden");
    nameInput.value = "";
    artistInput.value = "";
    imgInput.value = "";
    audioInput.value = "";
    previewImg.src = "";
    previewImg.classList.add("hidden");
    uploadIcon.classList.remove("hidden");
    audioLabel.textContent = "Select MP3 Audio File";
    audioPreview.src = "";
    saveBtn.classList.add("opacity-50", "cursor-not-allowed");
    errorMsg.classList.add("hidden");
    modal.removeAttribute("data-playlist-id");
  };

  closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  imgContainer.addEventListener("click", () => imgInput.click());

  imgInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      previewImg.src = URL.createObjectURL(file);
      previewImg.classList.remove("hidden");
      uploadIcon.classList.add("hidden");
    }
    checkForm();
  });

  audioInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      audioLabel.textContent = file.name;
      audioPreview.src = URL.createObjectURL(file);
    }
    checkForm();
  });

  const checkForm = () => {
    if (nameInput.value.trim() && artistInput.value.trim() && imgInput.files[0] && audioInput.files[0]) {
      saveBtn.classList.remove("opacity-50", "cursor-not-allowed");
    } else {
      saveBtn.classList.add("opacity-50", "cursor-not-allowed");
    }
  };

  nameInput.addEventListener("input", checkForm);
  artistInput.addEventListener("input", checkForm);

  saveBtn.addEventListener("click", async () => {
    if (saveBtn.classList.contains("opacity-50")) {
      errorMsg.classList.remove("hidden");
      return;
    }
    errorMsg.classList.add("hidden");
    const playlistId = modal.getAttribute("data-playlist-id");
    if (!playlistId) return closeModal();

    saveBtn.textContent = "Saving...";
    saveBtn.classList.add("opacity-50", "cursor-not-allowed");

    try {
      const audioFile = audioInput.files[0];
      const imgFile = imgInput.files[0];

      // Get duration
      let durationMs = 0;
      if (audioPreview.readyState > 0) {
        durationMs = Math.floor(audioPreview.duration * 1000);
      } else {
        await new Promise((resolve) => {
          audioPreview.onloadedmetadata = () => {
            durationMs = Math.floor(audioPreview.duration * 1000);
            resolve();
          };
          audioPreview.onerror = () => resolve(); // fallback
        });
      }

      const trackId = 'local_track_' + Date.now() + '_' + Math.floor(Math.random()*1000);
      const currentUserId = (() => {
        try {
          const user = JSON.parse(localStorage.getItem('user'));
          return user ? (user._id || user.id || user.user_id || user.username) : null;
        } catch(e) { return null; }
      })();

      const newTrack = {
        id: trackId,
        title: nameInput.value.trim(),
        artist_name: artistInput.value.trim(),
        duration: durationMs,
        audioBlob: audioFile,
        imageBlob: imgFile,
        userId: currentUserId
      };

      await localDb.saveLocalTrack(newTrack);
      await localDb.addTrackToLocalPlaylist(playlistId === "liked-songs" ? window.getUserKey("liked-songs") : playlistId, trackId);
      
      showToast("Tải nhạc lên thành công!", "success");
      closeModal();
      
      // Trigger a re-render by clicking the active sidebar playlist item
      document.querySelector(`.sidebar-item[data-id="${playlistId}"]`)?.click();
    } catch (e) {
      console.error(e);
      showToast("Lỗi khi tải nhạc", "error");
    } finally {
      saveBtn.textContent = "Upload";
      saveBtn.classList.remove("opacity-50", "cursor-not-allowed");
    }
  });
}
