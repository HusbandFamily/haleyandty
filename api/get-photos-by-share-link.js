// Vercel Serverless Function: fetch photos from Google Photos shared albums
// Uses refresh token so you never have to manually update an access token.
// Set in Vercel: GOOGLE_PHOTOS_REFRESH_TOKEN, GOOGLE_PHOTOS_CLIENT_ID, GOOGLE_PHOTOS_CLIENT_SECRET

async function getAccessToken() {
    const refreshToken = process.env.GOOGLE_PHOTOS_REFRESH_TOKEN;
    const clientId = process.env.GOOGLE_PHOTOS_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_PHOTOS_CLIENT_SECRET;

    if (refreshToken && clientId && clientSecret) {
        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token'
            })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.access_token) {
            return data.access_token;
        }
        const errMsg = data.error_description || data.error || res.statusText;
        throw new Error('Refresh token failed: ' + (errMsg || 'unknown error'));
    }

    if (process.env.GOOGLE_PHOTOS_ACCESS_TOKEN) {
        return process.env.GOOGLE_PHOTOS_ACCESS_TOKEN;
    }

    throw new Error('Set GOOGLE_PHOTOS_REFRESH_TOKEN, GOOGLE_PHOTOS_CLIENT_ID, and GOOGLE_PHOTOS_CLIENT_SECRET in Vercel.');
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const { shareLinkId, debug } = req.query;

    let accessToken;
    try {
        accessToken = await getAccessToken();
    } catch (e) {
        res.status(500).json({ error: e.message || 'Failed to get access token' });
        return;
    }
    if (!accessToken) {
        res.status(500).json({ error: 'No access token available.' });
        return;
    }

    // Debug: return first page of your albums so we can see shareInfo format
    if (debug === '1') {
        const url = 'https://photoslibrary.googleapis.com/v1/albums?pageSize=50';
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
        });
        if (!res.ok) {
            const err = await res.text();
            return res.status(res.status).json({ error: 'Albums fetch failed', details: err });
        }
        const data = await res.json();
        const list = (data.albums || []).map((a) => ({
            id: a.id,
            title: a.title,
            shareableUrl: a.shareInfo?.shareableUrl ?? null,
            shareToken: a.shareInfo?.shareToken ?? null
        }));
        return res.status(200).json({ total: list.length, nextPageToken: data.nextPageToken || null, albums: list });
    }

    if (!shareLinkId) {
        res.status(400).json({ error: 'Share link ID is required' });
        return;
    }

    try {
        // Match: exact ID from URL path, or shareToken, or ID anywhere in shareableUrl
        const albumMatches = (album) => {
            const url = album.shareInfo?.shareableUrl || '';
            const token = album.shareInfo?.shareToken || '';
            const pathId = url.split('/').pop()?.split('?')[0]?.trim() || '';
            return pathId === shareLinkId || token === shareLinkId || url.includes(shareLinkId);
        };

        // Try your own albums first, with pagination
        let albumId = null;
        let pageToken = null;
        do {
            const url = 'https://photoslibrary.googleapis.com/v1/albums?pageSize=50' + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
            const albumsRes = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!albumsRes.ok) break;
            const albumsData = await albumsRes.json();
            const albums = albumsData.albums || [];
            for (const album of albums) {
                if (albumMatches(album)) {
                    albumId = album.id;
                    break;
                }
            }
            pageToken = albumId ? null : (albumsData.nextPageToken || null);
        } while (pageToken);

        // If not found in your albums, try shared-with-you albums (paginated)
        if (!albumId) {
            pageToken = null;
            do {
                const url = 'https://photoslibrary.googleapis.com/v1/sharedAlbums?pageSize=50' + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
                const sharedRes = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (!sharedRes.ok) break;
                const sharedData = await sharedRes.json();
                const sharedAlbums = sharedData.sharedAlbums || [];
                for (const album of sharedAlbums) {
                    if (albumMatches(album)) {
                        albumId = album.id;
                        break;
                    }
                }
                pageToken = albumId ? null : (sharedData.nextPageToken || null);
            } while (pageToken);
        }

        if (!albumId) {
            res.status(404).json({ error: 'Album not found for this share link' });
            return;
        }

        const mediaRes = await fetch(
            'https://photoslibrary.googleapis.com/v1/mediaItems:search',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    albumId,
                    pageSize: 100
                })
            }
        );

        if (!mediaRes.ok) {
            const errText = await mediaRes.text();
            console.error('mediaItems:search error:', errText);
            res.status(mediaRes.status).json({ error: 'Failed to fetch media items', details: errText });
            return;
        }

        const mediaData = await mediaRes.json();
        const photos = (mediaData.mediaItems || []).map(item => ({
            url: item.baseUrl + '=w2048-h2048',
            alt: item.description || item.filename || 'Wedding photo'
        }));

        res.status(200).json({ photos });
    } catch (error) {
        console.error('get-photos error:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
}
