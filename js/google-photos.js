// Google Photos album config + Vercel API (hybrid: site on GitHub Pages, API on Vercel)

// Vercel deployment URL (API runs here; site can stay on GitHub Pages)
const VERCEL_API_BASE_URL = 'https://haleyandty.vercel.app';

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
    if (!album || !album.shareLinkId) return [];

    const cached = getCached(album.shareLinkId);
    if (cached && cached.length > 0) return cached;

    const base = window.location.hostname.includes('vercel.app') ? '' : VERCEL_API_BASE_URL;
    const url = `${base}/api/get-photos-by-share-link?shareLinkId=${encodeURIComponent(album.shareLinkId)}`;

    const res = await fetch(url);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err.error || err.details || res.statusText;
        throw new Error(msg);
    }
    const data = await res.json();
    const photos = data.photos || [];
    if (photos.length > 0) setCached(album.shareLinkId, photos);
    return photos;
}

window.getPhotosForTab = getPhotosForTab;
window.photoAlbums = photoAlbums;
