// Vercel Serverless Function: scrape Google Photos shared albums
// No OAuth, API keys, or Google Cloud project needed.
// Works by fetching the public shared album page and extracting image URLs
// via Google's internal batchexecute RPC.

const RPCID = 'snAcKc';
const BATCH_EXECUTE_URL = 'https://photos.google.com/_/PhotosUi/data/batchexecute';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function extractAlbumInfo(shareLinkId) {
    const albumPageUrl = `https://photos.app.goo.gl/${shareLinkId}`;

    const response = await fetch(albumPageUrl, {
        headers: { 'User-Agent': UA },
        redirect: 'follow'
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch album page (HTTP ${response.status})`);
    }

    const html = await response.text();

    const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/);
    if (!canonicalMatch) {
        throw new Error('Could not find album on this page');
    }

    const canonicalUrl = new URL(canonicalMatch[1]);
    const pathParts = canonicalUrl.pathname.split('/').filter(Boolean);
    const albumId = pathParts[pathParts.length - 1];

    let key = canonicalUrl.searchParams.get('key');
    if (!key) {
        const keyMatch = html.match(/\["(AF1Q[^"]+)"/);
        if (keyMatch) key = keyMatch[1];
    }

    if (!albumId || !key) {
        throw new Error('Could not extract album ID or key from page');
    }

    return { albumId, key, html };
}

async function fetchAlbumPage(albumId, key, pageToken) {
    const queryData = [[RPCID, JSON.stringify([albumId, pageToken || null, null, key])]];
    const params = new URLSearchParams();
    params.append('f.req', JSON.stringify([queryData]));

    const response = await fetch(BATCH_EXECUTE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'User-Agent': UA
        },
        body: params.toString()
    });

    if (!response.ok) {
        throw new Error(`Album data request failed (HTTP ${response.status})`);
    }

    const rawText = await response.text();
    const cleaned = rawText.replace(/^\)\]\}'/, '');

    const parsed = JSON.parse(cleaned);
    const rpcItem = parsed.find(item => Array.isArray(item) && item[1] === RPCID);

    if (!rpcItem || !rpcItem[2]) {
        throw new Error('Unexpected response format from Google Photos');
    }

    const data = JSON.parse(rpcItem[2]);

    const rawItems = data[1] || [];
    const items = rawItems.map(item => {
        const id = item[0];
        const url = (item[1] && item[1][0]) || '';
        return { id, url };
    }).filter(item => item.url);

    return { items, nextPageToken: data[2] || null };
}

function extractUrlsFromHtml(html) {
    const urlPattern = /https:\/\/lh3\.googleusercontent\.com\/pw\/[A-Za-z0-9_\-]+/g;
    const matches = html.match(urlPattern) || [];
    const unique = [...new Set(matches)];
    return unique.map(url => ({
        url: url + '=w2048-h1536',
        alt: 'Wedding photo'
    }));
}

async function scrapeAlbumPhotos(shareLinkId) {
    const { albumId, key, html } = await extractAlbumInfo(shareLinkId);

    try {
        const allItems = [];
        let pageToken = null;
        let page = 0;

        do {
            if (page++ > 20) break;
            const result = await fetchAlbumPage(albumId, key, pageToken);
            allItems.push(...result.items);
            pageToken = result.nextPageToken;
        } while (pageToken);

        if (allItems.length > 0) {
            return allItems.map(item => ({
                url: item.url + '=w2048-h1536',
                alt: 'Wedding photo'
            }));
        }
    } catch (rpcErr) {
        console.warn('RPC extraction failed, falling back to HTML parsing:', rpcErr.message);
    }

    return extractUrlsFromHtml(html);
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { shareLinkId } = req.query;

    if (!shareLinkId) {
        return res.status(400).json({ error: 'shareLinkId query parameter is required' });
    }

    try {
        const photos = await scrapeAlbumPhotos(shareLinkId);

        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
        return res.status(200).json({ photos, count: photos.length });
    } catch (error) {
        console.error('Scraper error:', error);
        return res.status(500).json({
            error: 'Failed to load photos from album',
            message: error.message
        });
    }
}
