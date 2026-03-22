// Google Photos album config — scraper approach (no OAuth needed)
// Site on GitHub Pages, scraper API on Vercel

const VERCEL_API_BASE_URL = 'https://haleyandty.vercel.app';

const photoAlbums = {
    'welcome-party': {
        name: 'Welcome Party',
        shareLinkId: 'ucWxSPb3eCosfusH9'
    },
    'tuscany-touring': {
        name: 'Tuscany Touring',
        shareLinkId: 'NTmdkq1dTPNPU9QJ9'
    },
    'wedding-day': {
        name: 'Wedding Day',
        shareLinkId: 'ucWxSPb3eCosfusH9'
    },
    'pool-party': {
        name: 'Pool Party',
        shareLinkId: 'NTmdkq1dTPNPU9QJ9'
    }
};

const CACHE_DURATION = 60 * 60 * 1000;
// Bump this version to force all visitors to refresh photos immediately
const CACHE_VERSION = 2;
const CACHE_PREFIX = 'gp_v' + CACHE_VERSION + '_';

function getCached(key) {
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + key);
        if (!raw) return null;
        const { t, photos } = JSON.parse(raw);
        if (Date.now() - t < CACHE_DURATION && Array.isArray(photos)) return photos;
        localStorage.removeItem(CACHE_PREFIX + key);
    } catch (e) {}
    return null;
}

function setCached(key, photos) {
    try {
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ t: Date.now(), photos }));
    } catch (e) {}
}

async function getPhotosForTab(tabId) {
    const album = photoAlbums[tabId];
    if (!album || !album.shareLinkId) return [];

    const cached = getCached(album.shareLinkId);
    if (cached && cached.length > 0) return cached;

    const base = window.location.hostname.includes('vercel.app') ? '' : VERCEL_API_BASE_URL;
    const url = `${base}/api/get-photos-by-share-link?shareLinkId=${encodeURIComponent(album.shareLinkId)}`;

    const res = await fetch(url);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || res.statusText);
    }

    const data = await res.json();
    const photos = data.photos || [];
    if (photos.length > 0) setCached(album.shareLinkId, photos);
    return photos;
}

window.getPhotosForTab = getPhotosForTab;
window.photoAlbums = photoAlbums;
