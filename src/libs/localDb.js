const DB_NAME = 'spotify_clone_db';
const DB_VERSION = 1;
const TRACKS_STORE = 'local_tracks';
const PLAYLISTS_STORE = 'playlist_local_tracks';

let dbPromise = null;

function getDB() {
  if (dbPromise) return dbPromise;
  
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(TRACKS_STORE)) {
        db.createObjectStore(TRACKS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PLAYLISTS_STORE)) {
        db.createObjectStore(PLAYLISTS_STORE, { keyPath: 'playlistId' });
      }
    };
    
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
  
  return dbPromise;
}

export const localDb = {
  async saveLocalTrack(track) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(TRACKS_STORE, 'readwrite');
      const store = tx.objectStore(TRACKS_STORE);
      store.put(track);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getLocalTrack(id) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(TRACKS_STORE, 'readonly');
      const store = tx.objectStore(TRACKS_STORE);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async getAllLocalTracks() {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(TRACKS_STORE, 'readonly');
      const store = tx.objectStore(TRACKS_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async getPlaylistLocalTracks(playlistId) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PLAYLISTS_STORE, 'readonly');
      const store = tx.objectStore(PLAYLISTS_STORE);
      const req = store.get(playlistId);
      req.onsuccess = () => resolve(req.result ? req.result.trackIds : []);
      req.onerror = () => reject(req.error);
    });
  },

  async addTrackToLocalPlaylist(playlistId, trackId) {
    const db = await getDB();
    const tracks = await this.getPlaylistLocalTracks(playlistId);
    if (!tracks.includes(trackId)) {
      tracks.push(trackId);
      return new Promise((resolve, reject) => {
        const tx = db.transaction(PLAYLISTS_STORE, 'readwrite');
        const store = tx.objectStore(PLAYLISTS_STORE);
        store.put({ playlistId, trackIds: tracks });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  },

  async removeTrackFromLocalPlaylist(playlistId, trackId) {
    const db = await getDB();
    const tracks = await this.getPlaylistLocalTracks(playlistId);
    if (tracks.includes(trackId)) {
      const updated = tracks.filter(t => t !== trackId);
      return new Promise((resolve, reject) => {
        const tx = db.transaction(PLAYLISTS_STORE, 'readwrite');
        const store = tx.objectStore(PLAYLISTS_STORE);
        store.put({ playlistId, trackIds: updated });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  }
};
