import { httpRequest } from './libs/httpRequest.js';

export const initSearch = () => {
  const searchInput = document.querySelector('#search-input');
  const searchDropdown = document.querySelector('#search-dropdown');
  const searchDropdownContent = document.querySelector('#search-dropdown-content');

  if (!searchInput || !searchDropdown || !searchDropdownContent) return;

  let debounceTimer;
  let currentSearchId = 0; // Prevent race conditions

  // Utility to show dropdown
  const showDropdown = () => {
    searchDropdown.classList.remove('hidden');
    searchDropdown.classList.add('flex');
  };

  // Utility to hide dropdown
  const hideDropdown = () => {
    searchDropdown.classList.add('hidden');
    searchDropdown.classList.remove('flex');
  };

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    // If clicking outside search container
    if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
      hideDropdown();
    }
  });

  const renderTrendingSearches = async () => {
    try {
      const data = await httpRequest.get('/api/search/trending?limit=10');
      if (data && data.trending_searches && data.trending_searches.length > 0) {
        searchDropdownContent.innerHTML = `
          <div class="px-3 py-2 text-sm font-bold text-white mb-1">Trending Searches</div>
        `;
        
        data.trending_searches.forEach(keyword => {
          const item = document.createElement('div');
          item.className = 'flex items-center gap-3 px-3 py-2 hover:bg-[#3a3a3a] rounded-md cursor-pointer transition-colors';
          item.innerHTML = `
            <svg viewBox="0 0 24 24" class="h-4 w-4 fill-[#b3b3b3] shrink-0"><path d="M10.533 1.27893C5.35215 1.27893 1.12598 5.41887 1.12598 10.5579C1.12598 15.697 5.35215 19.8369 10.533 19.8369C12.767 19.8369 14.8235 19.0671 16.4402 17.7794L20.7929 22.132C21.1834 22.5226 21.8166 22.5226 22.2071 22.132C22.5976 21.7415 22.5976 21.1083 22.2071 20.7178L17.8634 16.3741C19.1616 14.7849 19.94 12.7634 19.94 10.5579C19.94 5.41887 15.7138 1.27893 10.533 1.27893ZM3.12598 10.5579C3.12598 6.53225 6.42512 3.27893 10.533 3.27893C14.6409 3.27893 17.94 6.53225 17.94 10.5579C17.94 14.5836 14.6409 17.8369 10.533 17.8369C6.42512 17.8369 3.12598 14.5836 3.12598 10.5579Z"></path></svg>
            <span class="text-[14px] font-medium truncate">${keyword}</span>
          `;
          item.addEventListener('click', () => {
            searchInput.value = keyword;
            performSearch(keyword);
          });
          searchDropdownContent.appendChild(item);
        });
      } else {
        searchDropdownContent.innerHTML = `<div class="px-3 py-2 text-sm text-[#b3b3b3]">No trending searches</div>`;
      }
    } catch (error) {
      console.error("Error fetching trending searches:", error);
    }
  };

  const renderSearchResults = (data, query) => {
    searchDropdownContent.innerHTML = '';

    if (!data.results || data.total_results === 0) {
      searchDropdownContent.innerHTML = `
        <div class="px-3 py-4 text-center">
          <span class="text-[15px] text-white font-bold">No results found for "${query}"</span>
          <p class="text-[13px] text-[#b3b3b3] mt-1">Please make sure your words are spelled correctly or use less or different keywords.</p>
        </div>
      `;
      return;
    }

    const { tracks, artists, albums, playlists } = data.results;

    const createSection = (title, items) => {
      if (!items || items.length === 0) return;
      
      const sectionHeader = document.createElement('div');
      sectionHeader.className = 'px-3 py-2 text-[15px] font-bold text-white mt-2 mb-1 border-b border-[#3e3e3e] pb-2';
      sectionHeader.textContent = title;
      searchDropdownContent.appendChild(sectionHeader);

      items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'flex items-center gap-3 px-3 py-2 hover:bg-[#3a3a3a] rounded-md cursor-pointer transition-colors';
        
        const imageUrl = item.image_url || 'https://via.placeholder.com/48';
        const isArtist = item.type === 'artist';
        
        el.innerHTML = `
          <img src="${imageUrl}" alt="${item.title || item.name}" class="w-10 h-10 object-cover ${isArtist ? 'rounded-full' : 'rounded-md'} shrink-0" />
          <div class="flex flex-col overflow-hidden">
            <span class="text-[15px] font-medium text-white truncate">${item.title || item.name}</span>
            <span class="text-[13px] text-[#b3b3b3] truncate">${item.subtitle || (item.type.charAt(0).toUpperCase() + item.type.slice(1))}</span>
          </div>
        `;

        el.addEventListener('click', () => {
          // Client-side SPA routing (simulate)
          hideDropdown();
          history.pushState(null, '', `?type=${item.type}&id=${item.id}`);
          console.log(`Navigating to ${item.type} details page for ID: ${item.id}`);
          // Later we can dispatch an event or call a render detail function here
        });

        searchDropdownContent.appendChild(el);
      });
    };

    createSection('Tracks', tracks);
    createSection('Artists', artists);
    createSection('Albums', albums);
    createSection('Playlists', playlists);
  };

  const performSearch = async (query) => {
    currentSearchId++;
    const searchId = currentSearchId;
    
    // Show loading state explicitly or leave as is
    
    try {
      const data = await httpRequest.get(`/api/search?q=${encodeURIComponent(query)}&type=all&limit=20`);
      
      // If a newer search has been fired, ignore this response (race condition fix)
      if (searchId !== currentSearchId) return;

      renderSearchResults(data, query);
    } catch (error) {
      console.error("Error fetching universal search:", error);
      if (searchId === currentSearchId) {
        searchDropdownContent.innerHTML = `<div class="px-3 py-2 text-sm text-[#b3b3b3]">An error occurred while searching.</div>`;
      }
    }
  };

  searchInput.addEventListener('focus', () => {
    showDropdown();
    if (!searchInput.value.trim()) {
      searchDropdownContent.innerHTML = `<div class="px-3 py-2 text-sm text-[#b3b3b3]">Loading...</div>`;
      renderTrendingSearches();
    }
  });

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    
    clearTimeout(debounceTimer);
    
    if (!query) {
      // Revert to trending
      currentSearchId++; // Invalidates pending searches
      renderTrendingSearches();
      return;
    }

    // Show loading text optionally
    // searchDropdownContent.innerHTML = `<div class="px-3 py-2 text-sm text-[#b3b3b3]">Searching...</div>`;

    debounceTimer = setTimeout(() => {
      performSearch(query);
    }, 300); // 300ms debounce
  });
};
