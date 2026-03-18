// Photos page: tabs, gallery from scraper API, full-screen viewer

// Editorial grid layout config: col = column start (1-8), w = column span, h = row span
// Each row is ~80px tall on desktop. Adjust these to reposition/resize images.
const defaultLayout = [
    { col: 3, w: 2, h: 3 },
    { col: 6, w: 3, h: 3 },
    { col: 1, w: 5, h: 4 },
    { col: 6, w: 3, h: 4 },
    { col: 2, w: 4, h: 3 },
    { col: 1, w: 2, h: 3 },
    { col: 4, w: 2, h: 2 },
    { col: 6, w: 3, h: 4 },
    { col: 1, w: 2, h: 2 },
    { col: 3, w: 4, h: 4 },
    { col: 3, w: 3, h: 4 },
    { col: 7, w: 2, h: 3 },
    { col: 1, w: 3, h: 4 },
    { col: 4, w: 2, h: 3 },
    { col: 6, w: 3, h: 4 },
    { col: 2, w: 4, h: 3 },
    { col: 7, w: 2, h: 2 },
];

const layouts = {
    'welcome-party': defaultLayout,
    'tuscany-touring': defaultLayout,
    'wedding-day': defaultLayout,
    'pool-party': defaultLayout,
};

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

function renderPhotos(photos) {
    if (!photosGallery) return;
    photosGallery.innerHTML = '';

    const layout = layouts[currentTab] || defaultLayout;

    photos.forEach((photo, i) => {
        const item = document.createElement('div');
        item.className = 'photo-item';

        if (layout[i]) {
            const { col, w, h } = layout[i];
            item.style.gridColumn = `${col} / span ${w}`;
            item.style.gridRow = `span ${h}`;
        }

        const img = document.createElement('img');
        img.src = typeof photo === 'string' ? photo : (photo.url || photo);
        img.alt = (photo && photo.alt) ? photo.alt : `Photo ${i + 1}`;
        img.loading = 'lazy';
        img.addEventListener('click', () => openViewer(i));
        item.appendChild(img);
        photosGallery.appendChild(item);
    });
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
