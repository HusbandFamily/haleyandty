// Photos page: tabs, gallery from scraper API, full-screen viewer
// Layout is controlled by js/photo-grid-config.js — edit that file to customize.

function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

let currentTab = 'welcome-party';
let currentPhotos = [];
let currentPhotoIndex = 0;

const tabButtons = document.querySelectorAll('.tab-button');
const photosGallery = document.getElementById('photosGallery');
const photosLoading = document.getElementById('photosLoading');
const photosError = document.getElementById('photosError');
const imageViewer = document.getElementById('imageViewer');
const viewerImage = document.getElementById('viewerImage');
const viewerClose = document.querySelector('.viewer-close');
const viewerPrev = document.querySelector('.viewer-prev');
const viewerNext = document.querySelector('.viewer-next');
const heroVideo = document.getElementById('heroVideo');
const soundToggle = document.getElementById('soundToggle');

function initPhotosPage() {
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            switchTab(button.getAttribute('data-tab'));
        });
    });

    if (soundToggle && heroVideo) {
        soundToggle.addEventListener('click', () => {
            heroVideo.muted = !heroVideo.muted;
            soundToggle.classList.toggle('muted', heroVideo.muted);
        });
    }

    if (viewerClose) viewerClose.addEventListener('click', closeViewer);
    if (viewerPrev) viewerPrev.addEventListener('click', () => navigateViewer(-1));
    if (viewerNext) viewerNext.addEventListener('click', () => navigateViewer(1));
    if (imageViewer) {
        imageViewer.addEventListener('click', (e) => {
            if (e.target === imageViewer) closeViewer();
        });
    }
    document.addEventListener('keydown', (e) => {
        if (!imageViewer || imageViewer.style.display !== 'flex') return;
        if (e.key === 'Escape') closeViewer();
        else if (e.key === 'ArrowLeft') navigateViewer(-1);
        else if (e.key === 'ArrowRight') navigateViewer(1);
    });

    switchTab('welcome-party');
}

async function switchTab(tabId) {
    currentTab = tabId;

    tabButtons.forEach(button => {
        button.classList.toggle('active', button.getAttribute('data-tab') === tabId);
    });

    if (!photosGallery) return;

    photosGallery.innerHTML = '';
    if (photosLoading) photosLoading.style.display = 'block';
    if (photosError) photosError.style.display = 'none';

    try {
        const photos = window.getPhotosForTab ? await window.getPhotosForTab(tabId) : [];
        currentPhotos = Array.isArray(photos) ? photos : [];

        if (photosLoading) photosLoading.style.display = 'none';

        if (currentPhotos.length > 0) {
            renderPhotos(currentPhotos);
        } else {
            if (photosError) {
                photosError.style.display = 'block';
                photosError.innerHTML = '<p>No photos found in this album. Please try again later.</p>';
            }
        }
    } catch (err) {
        if (photosLoading) photosLoading.style.display = 'none';
        if (photosError) {
            photosError.style.display = 'block';
            const msg = (err && err.message) ? err.message : 'Error loading photos. Try again later.';
            photosError.innerHTML = '<p><strong>Error:</strong> ' + escapeHtml(msg) + '</p><p>Please try again later.</p>';
        }
        console.error(err);
    }
}

function isDesktopLayout() {
    return window.matchMedia('(min-width: 1001px)').matches;
}

function applyGridConfig() {
    if (!photosGallery) return;
    const config = window.PHOTO_GRID_CONFIG || { columns: 12, gap: 32, layout: [] };
    const layout = config.layout || [];

    if (isDesktopLayout()) {
        photosGallery.style.gridTemplateColumns = `repeat(${config.columns || 12}, 1fr)`;
        photosGallery.style.gap = `${config.gap ?? 32}px`;
        photosGallery.querySelectorAll('.photo-item').forEach((item, i) => {
            const entry = layout[i % layout.length];
            if (entry && entry.col != null && entry.span != null) {
                item.style.gridColumn = `${entry.col} / span ${entry.span}`;
            }
        });
    } else {
        photosGallery.style.gridTemplateColumns = '';
        photosGallery.style.gap = '';
        photosGallery.querySelectorAll('.photo-item').forEach(item => {
            item.style.gridColumn = '';
        });
    }
}

function renderPhotos(photos) {
    if (!photosGallery) return;
    photosGallery.innerHTML = '';

    const config = window.PHOTO_GRID_CONFIG || { columns: 12, gap: 32, layout: [] };
    const layout = config.layout || [];

    if (!window._photoGridResizeBound) {
        window._photoGridResizeBound = true;
        window.addEventListener('resize', applyGridConfig);
    }

    photos.forEach((photo, i) => {
        const item = document.createElement('div');
        item.className = 'photo-item';

        if (isDesktopLayout()) {
            const entry = layout[i % layout.length];
            if (entry && entry.col != null && entry.span != null) {
                item.style.gridColumn = `${entry.col} / span ${entry.span}`;
            }
        }

        const img = document.createElement('img');
        img.src = typeof photo === 'string' ? photo : (photo.url || photo);
        img.alt = (photo && photo.alt) ? photo.alt : `Photo ${i + 1}`;
        img.loading = 'lazy';
        img.addEventListener('click', () => openViewer(i));
        item.appendChild(img);
        photosGallery.appendChild(item);
    });

    applyGridConfig();
}

function openViewer(index) {
    if (!currentPhotos.length || !viewerImage || !imageViewer) return;
    currentPhotoIndex = index;
    updateViewerImage();
    imageViewer.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeViewer() {
    if (imageViewer) imageViewer.style.display = 'none';
    document.body.style.overflow = '';
}

function navigateViewer(delta) {
    if (!currentPhotos.length) return;
    currentPhotoIndex = (currentPhotoIndex + delta + currentPhotos.length) % currentPhotos.length;
    updateViewerImage();
}

function updateViewerImage() {
    if (!viewerImage || !currentPhotos.length) return;
    const p = currentPhotos[currentPhotoIndex];
    viewerImage.src = typeof p === 'string' ? p : (p.url || p);
    viewerImage.alt = (p && p.alt) ? p.alt : `Photo ${currentPhotoIndex + 1}`;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPhotosPage);
} else {
    initPhotosPage();
}
