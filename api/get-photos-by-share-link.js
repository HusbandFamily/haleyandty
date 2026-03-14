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
        if (res.ok) {
            const data = await res.json();
            return data.access_token || null;
        }
    }

    return process.env.GOOGLE_PHOTOS_ACCESS_TOKEN || null;
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

    const { shareLinkId } = req.query;

    if (!shareLinkId) {
        res.status(400).json({ error: 'Share link ID is required' });
        return;
    }

    try {
        const accessToken = await getAccessToken();

        if (!accessToken) {
            res.status(500).json({
                error: 'Google Photos API not configured. Set GOOGLE_PHOTOS_REFRESH_TOKEN, GOOGLE_PHOTOS_CLIENT_ID, and GOOGLE_PHOTOS_CLIENT_SECRET in Vercel (or GOOGLE_PHOTOS_ACCESS_TOKEN for short-lived token).'
            });
            return;
        }

        const sharedRes = await fetch(
            'https://photoslibrary.googleapis.com/v1/sharedAlbums',
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!sharedRes.ok) {
            const errText = await sharedRes.text();
            console.error('sharedAlbums error:', errText);
            res.status(sharedRes.status).json({ error: 'Failed to fetch shared albums', details: errText });
            return;
        }

        const sharedData = await sharedRes.json();
        const sharedAlbums = sharedData.sharedAlbums || [];
        let albumId = null;

        for (const album of sharedAlbums) {
            const shareUrl = album.shareInfo?.shareableUrl || '';
            const idFromUrl = shareUrl.split('/').pop();
            if (idFromUrl === shareLinkId) {
                albumId = album.id;
                break;
            }
        }

        if (!albumId) {
            const allRes = await fetch(
                'https://photoslibrary.googleapis.com/v1/albums',
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            if (allRes.ok) {
                const allData = await allRes.json();
                const allAlbums = allData.albums || [];
                for (const album of allAlbums) {
                    const shareUrl = album.shareInfo?.shareableUrl || '';
                    const idFromUrl = shareUrl.split('/').pop();
                    if (idFromUrl === shareLinkId) {
                        albumId = album.id;
                        break;
                    }
                }
            }
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
