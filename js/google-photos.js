// Google Photos album config + Vercel API (hybrid: site on GitHub Pages, API on Vercel)

// Vercel deployment URL (API runs here; site can stay on GitHub Pages)
const VERCEL_API_BASE_URL = 'https://haleyandty.vercel.app';

// Add albumId (from ?debug=1 response) to each album if share link lookup fails
const photoAlbums = {
    'welcome-party': {
        name: 'Welcome Party',
        shareLinkId: 'zMvGzMNd4BvJYdok7',
        url: 'https://photos.app.goo.gl/zMvGzMNd4BvJYdok7'
    },
    'tuscany-touring': {
        name: 'Tuscany Touring',
        shareLinkId: 'LqawFef4gJmi7C5J7',
        url: 'https://photos.app.goo.gl/LqawFef4gJmi7C5J7'
    },
    'wedding-day': {
        name: 'Wedding Day',
        shareLinkId: 'tAqLNDejzyzSSonL7',
        url: 'https://photos.app.goo.gl/tAqLNDejzyzSSonL7'
    },
    'pool-party': {
        name: 'Pool Party',
        shareLinkId: 'q6iLDzRT5Ypz7KedA',
        url: 'https://photos.app.goo.gl/q6iLDzRT5Ypz7KedA'
    }
};

const CACHE_DURATION = 60 * 60 * 1000;
const CACHE_PREFIX = 'gp_';

function getCached(shareLinkId) {
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + shareLinkId);
        if (!raw) return null;
        const { t, photos } = JSON.parse(raw);
        if (Date.now() - t < CACHE_DURATION && Array.isArray(photos)) return photos;
        localStorage.removeItem(CACHE_PREFIX + shareLinkId);
    } catch (e) {}
    return null;
}

function setCached(shareLinkId, photos) {
    try {
        localStorage.setItem(CACHE_PREFIX + shareLinkId, JSON.stringify({ t: Date.now(), photos }));
    } catch (e) {}
}

async function getPhotosForTab(tabId) {
    const album = photoAlbums[tabId];
    const cacheKey = album?.shareLinkId || album?.albumId || tabId;
    if (!album || (!album.shareLinkId && !album.albumId)) return [];

    const cached = getCached(cacheKey);
    if (cached && cached.length > 0) return cached;

    const base = window.location.hostname.includes('vercel.app') ? '' : VERCEL_API_BASE_URL;
    const params = new URLSearchParams();
    if (album.albumId) params.set('albumId', album.albumId);
    if (album.shareLinkId) params.set('shareLinkId', album.shareLinkId);
    const url = `${base}/api/get-photos-by-share-link?${params.toString()}`;

    const res = await fetch(url);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err.error || err.details || res.statusText;
        throw new Error(msg);
    }
    const data = await res.json();
    const photos = data.photos || [];
    if (photos.length > 0) setCached(cacheKey, photos);
    return photos;
}

window.getPhotosForTab = getPhotosForTab;
window.photoAlbums = photoAlbums;
