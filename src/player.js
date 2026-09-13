// player.js - Quản lý logic trình phát nhạc (Player)
import { httpRequest } from "./libs/httpRequest.js";

// Trạng thái Player
let audio = null;
let queue = [];
let currentIndex = -1;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;
let previousVolume = 1; // Lưu âm lượng trước khi mute

// DOM Elements
const els = {};

// Link nhạc mẫu (nếu không có audio_url)
const DUMMY_AUDIO = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
const PLACEHOLDER_IMG = "https://i.scdn.co/image/ab67616d0000b273c52e6973e449a0ceefc5f0eb";

// Khởi tạo Player
export function initPlayer() {
  audio = document.querySelector("#audio-player");
  if (!audio) return;

  // Gán DOM elements
  els.playbar = document.querySelector("#playbar");
  els.cover = document.querySelector("#playbar-cover");
  els.title = document.querySelector("#playbar-title");
  els.artist = document.querySelector("#playbar-artist");
  
  els.playBtn = document.querySelector("#playbar-play-btn");
  els.playIcon = document.querySelector("#playbar-play-icon");
  els.pauseIcon = document.querySelector("#playbar-pause-icon");
  els.prevBtn = document.querySelector("#playbar-prev-btn");
  els.nextBtn = document.querySelector("#playbar-next-btn");
  els.shuffleBtn = document.querySelector("#playbar-shuffle-btn");
  els.repeatBtn = document.querySelector("#playbar-repeat-btn");
  els.likeBtn = document.querySelector("#playbar-like-btn");
  
  els.currentTime = document.querySelector("#playbar-current-time");
  els.totalTime = document.querySelector("#playbar-total-time");
  els.progressContainer = document.querySelector("#playbar-progress-container");
  els.progressFill = document.querySelector("#playbar-progress-fill");
  els.progressHandle = document.querySelector("#playbar-progress-handle");
  
  els.volumeBtn = document.querySelector("#playbar-volume-btn");
  els.volumeIconNormal = document.querySelector("#playbar-volume-icon-normal");
  els.volumeIconMute = document.querySelector("#playbar-volume-icon-mute");
  els.volumeContainer = document.querySelector("#playbar-volume-container");
  els.volumeFill = document.querySelector("#playbar-volume-fill");
  els.volumeHandle = document.querySelector("#playbar-volume-handle");

  // Thiết lập sự kiện cho Audio
  audio.addEventListener("timeupdate", handleTimeUpdate);
  audio.addEventListener("ended", handleTrackEnded);
  audio.addEventListener("loadedmetadata", () => {
    els.totalTime.textContent = formatTime(audio.duration);
  });
  audio.addEventListener("play", () => updatePlayPauseState(true));
  audio.addEventListener("pause", () => updatePlayPauseState(false));

  // Thiết lập sự kiện cho Controls
  els.playBtn.addEventListener("click", togglePlay);
  els.prevBtn.addEventListener("click", playPrev);
  els.nextBtn.addEventListener("click", playNext);
  els.shuffleBtn.addEventListener("click", toggleShuffle);
  els.repeatBtn.addEventListener("click", toggleRepeat);
  
  if (els.likeBtn) {
    els.likeBtn.addEventListener("click", () => {
      const currentTrack = queue[currentIndex];
      if (!currentTrack) return;
      
      let liked = JSON.parse(localStorage.getItem(window.getUserKey("liked_songs")) || "[]");
      const trackId = currentTrack.id || currentTrack.track_id || currentTrack._id;
      const isLiked = liked.some(t => (t.id || t.track_id || t._id) === trackId);
      
      if (isLiked) {
        liked = liked.filter(t => (t.id || t.track_id || t._id) !== trackId);
        els.likeBtn.classList.remove("text-[#1ed760]");
        els.likeBtn.classList.add("text-[#b3b3b3]");
        if (trackId.startsWith("local_track_")) {
           import("./libs/localDb.js").then(({ localDb }) => localDb.removeTrackFromLocalPlaylist(window.getUserKey("liked-songs"), trackId));
        }
      } else {
        liked.push(currentTrack);
        els.likeBtn.classList.add("text-[#1ed760]");
        els.likeBtn.classList.remove("text-[#b3b3b3]");
        if (trackId.startsWith("local_track_")) {
           import("./libs/localDb.js").then(({ localDb }) => localDb.addTrackToLocalPlaylist(window.getUserKey("liked-songs"), trackId));
        }
      }
      // Still update localStorage so UI check `isLiked` works immediately, but we will filter dead blobs out when rendering
      localStorage.setItem(window.getUserKey("liked_songs"), JSON.stringify(liked));
      import("./libs/toast.js").then(m => m.showToast(isLiked ? "Removed from Liked Songs" : "Added to Liked Songs", "success"));
      document.dispatchEvent(new Event("liked_songs_changed"));
    });
  }

  // Tiến trình (Progress bar)
  els.progressContainer.addEventListener("click", (e) => {
    const rect = els.progressContainer.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (audio.duration) {
      audio.currentTime = percent * audio.duration;
    }
  });

  // Âm lượng (Volume bar)
  els.volumeContainer.addEventListener("click", (e) => {
    const rect = els.volumeContainer.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setVolume(percent);
  });
  
  els.volumeBtn.addEventListener("click", toggleMute);

  // Mặc định set volume
  setVolume(1);
}

// Format thời gian (giây) -> m:ss
function formatTime(seconds) {
  if (isNaN(seconds) || seconds === Infinity) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Cập nhật UI nút Play/Pause
function updatePlayPauseState(playing) {
  isPlaying = playing;
  if (isPlaying) {
    els.playIcon.classList.add("hidden");
    els.pauseIcon.classList.remove("hidden");
    els.playBtn.setAttribute("data-tooltip", "Pause");
    const gTooltip = document.querySelector("#generic-tooltip");
    if (gTooltip && !gTooltip.classList.contains("hidden")) gTooltip.textContent = "Pause";
  } else {
    els.playIcon.classList.remove("hidden");
    els.pauseIcon.classList.add("hidden");
    els.playBtn.setAttribute("data-tooltip", "Play");
    const gTooltip = document.querySelector("#generic-tooltip");
    if (gTooltip && !gTooltip.classList.contains("hidden")) gTooltip.textContent = "Play";
  }
}

// Xử lý khi nhạc đang chạy
function handleTimeUpdate() {
  if (!audio.duration) return;
  const percent = (audio.currentTime / audio.duration) * 100;
  els.currentTime.textContent = formatTime(audio.currentTime);
  els.progressFill.style.width = `${percent}%`;
  els.progressHandle.style.left = `${percent}%`;
}

// Chuyển bài khi kết thúc
function handleTrackEnded() {
  if (isRepeat) {
    audio.currentTime = 0;
    audio.play();
  } else {
    playNext();
  }
}

// Điều khiển Volume
function setVolume(percent) {
  audio.volume = percent;
  els.volumeFill.style.width = `${percent * 100}%`;
  els.volumeHandle.style.left = `${percent * 100}%`;
  
  if (percent === 0) {
    els.volumeIconNormal.classList.add("hidden");
    els.volumeIconMute.classList.remove("hidden");
    els.volumeBtn.setAttribute("data-tooltip", "Unmute");
    const gTooltip = document.querySelector("#generic-tooltip");
    if (gTooltip && !gTooltip.classList.contains("hidden") && els.volumeBtn.matches(":hover")) gTooltip.textContent = "Unmute";
  } else {
    els.volumeIconNormal.classList.remove("hidden");
    els.volumeIconMute.classList.add("hidden");
    previousVolume = percent; // Lưu lại để dùng khi unmute
    els.volumeBtn.setAttribute("data-tooltip", "Mute");
    const gTooltip = document.querySelector("#generic-tooltip");
    if (gTooltip && !gTooltip.classList.contains("hidden") && els.volumeBtn.matches(":hover")) gTooltip.textContent = "Mute";
  }
}

function toggleMute() {
  if (audio.volume > 0) {
    setVolume(0);
  } else {
    setVolume(previousVolume || 1);
  }
}

// Shuffle & Repeat
function toggleShuffle() {
  isShuffle = !isShuffle;
  els.shuffleBtn.classList.toggle("text-[#1db954]", isShuffle);
  els.shuffleBtn.classList.toggle("text-[#b3b3b3]", !isShuffle);
  els.shuffleBtn.setAttribute("data-tooltip", isShuffle ? "Disable shuffle" : "Enable shuffle");
  const gTooltip = document.querySelector("#generic-tooltip");
  if (gTooltip && !gTooltip.classList.contains("hidden")) gTooltip.textContent = isShuffle ? "Disable shuffle" : "Enable shuffle";
}

function toggleRepeat() {
  isRepeat = !isRepeat;
  els.repeatBtn.classList.toggle("text-[#1db954]", isRepeat);
  els.repeatBtn.classList.toggle("text-[#b3b3b3]", !isRepeat);
  els.repeatBtn.setAttribute("data-tooltip", isRepeat ? "Disable repeat" : "Enable repeat");
  const gTooltip = document.querySelector("#generic-tooltip");
  if (gTooltip && !gTooltip.classList.contains("hidden")) gTooltip.textContent = isRepeat ? "Disable repeat" : "Enable repeat";
}

// Play / Pause
export function togglePlay() {
  if (!audio.src) return;
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
}

// Play bài hát tiếp theo
export function playNext() {
  if (queue.length === 0) return;
  
  if (isShuffle) {
    let nextIdx = currentIndex;
    while (nextIdx === currentIndex && queue.length > 1) {
      nextIdx = Math.floor(Math.random() * queue.length);
    }
    currentIndex = nextIdx;
  } else {
    currentIndex = (currentIndex + 1) % queue.length;
  }
  
  loadTrack(queue[currentIndex]);
}

// Play bài trước đó
export function playPrev() {
  if (queue.length === 0) return;
  
  // Nếu đang nghe hơn 3 giây -> tua lại đầu bài
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  
  if (isShuffle) {
    currentIndex = Math.floor(Math.random() * queue.length);
  } else {
    currentIndex = (currentIndex - 1 + queue.length) % queue.length;
  }
  
  loadTrack(queue[currentIndex]);
}

// Tải bài hát vào Audio Element và cập nhật UI
function loadTrack(track) {
  if (!track) return;
  
  // Hiện playbar nếu đang ẩn
  if (els.playbar) {
    els.playbar.classList.remove("hidden");
    els.playbar.classList.add("flex");
  }

  // Cập nhật DOM
  els.title.textContent = track.title || track.track_title || track.name || "Unknown";
  els.artist.textContent = track.artist_name || track.artist || "";
  els.cover.src = track.image_url || track.track_image_url || track.album_cover_image_url || PLACEHOLDER_IMG;
  
  // Nguồn nhạc (thực tế hoặc dummy)
  audio.src = track.preview_url || track.audio_url || track.track_audio_url || DUMMY_AUDIO;
  
  if (els.likeBtn) {
    const liked = JSON.parse(localStorage.getItem(window.getUserKey("liked_songs")) || "[]");
    const trackId = track.id || track.track_id || track._id;
    const isLiked = liked.some(t => (t.id || t.track_id || t._id) === trackId);
    if (isLiked) {
      els.likeBtn.classList.add("text-[#1ed760]");
      els.likeBtn.classList.remove("text-[#b3b3b3]");
    } else {
      els.likeBtn.classList.remove("text-[#1ed760]");
      els.likeBtn.classList.add("text-[#b3b3b3]");
    }
  }

  audio.play().catch(e => console.log("Auto-play prevented", e));
}

/**
 * Gọi hàm này từ UI bên ngoài (khi click vào bài hát)
 * @param {Object} track - Bài hát cần phát
 * @param {Array} newQueue - Danh sách các bài hát trong danh sách hiện tại (để play Next/Prev)
 */
export function playTrack(track, newQueue = []) {
  if (!audio) initPlayer(); // Đề phòng chưa init
  
  if (newQueue && newQueue.length > 0) {
    queue = newQueue;
  } else if (queue.length === 0) {
    queue = [track];
  }
  
  // Tìm index của track trong queue
  const trackId = track.id || track.track_id || track._id;
  currentIndex = queue.findIndex(t => (t.id || t.track_id || t._id) === trackId);
  if (currentIndex === -1) {
    queue.push(track);
    currentIndex = queue.length - 1;
  }

  loadTrack(queue[currentIndex]);
}
