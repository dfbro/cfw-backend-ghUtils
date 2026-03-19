import { GH_CONFIG } from '@/config/config';

const { OWNER, REPO, TOKEN, Release_Tag } = GH_CONFIG;

/**
 * Helper untuk membuat GitHub API Headers secara konsisten
 */
const getGithubHeaders = (token: string, accept = 'application/vnd.github+json') => ({
    'Authorization': `Bearer ${token}`,
    'Accept': accept,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Hono-Static-Proxy'
});

// ==========================================
// INTERFACES & TYPES
// ==========================================

export interface GetReleaseOptions {
    Tag?: string;
    Token?: string;
    Owner?: string;
    Repo?: string;
}

export interface GHRelease {
    tag_name: string;
    created_at: string;
    updated_at: string;
    id: number;
    url: string;
    assets_url: string;
    upload_url: string;
    assets?: Array<{
        id: number;
        name: string;
        content_type: string;
        browser_download_url: string;
        created_at: string;
        updated_at: string;
        size: number;
        digest: string;
        url: string;
    }>;
}

export interface GHAssetSuccess {
    name?: string;
    isOK: true;
    objectId: number;
    objectUrl: string;
    content_type: string;
}

export interface GHAssetError {
    isOK: false;
    error: string;
    originErr?: unknown;
    originErrStatusCode?: number;
}

export type GHAsset = GHAssetSuccess | GHAssetError;

export interface CheckAssetExistsResult {
    doesExist: boolean;
}

export interface DeleteGHAssetSuccess {
    isOK: true;
    message: string;
}

export interface DeleteGHAssetError {
    isOK: false;
    error: string;
    details?: unknown;
}

export type DeleteGHAssetResult = DeleteGHAssetSuccess | DeleteGHAssetError;

export interface UploadGHAssetResponse {
    id: number;
    url: string;
    content_type: string;
    name: string;
    message?: string;
    errors?: Array<{ resource: string; code: string; field: string; message: string }>;
}


// ==========================================
// FUNCTIONS
// ==========================================

export const getReleaseByTag = async ({
    Tag = Release_Tag,
    Token = TOKEN,
    Owner = OWNER,
    Repo = REPO
}: GetReleaseOptions = {}): Promise<GHRelease | null> => {
    const ghUrl = `https://api.github.com/repos/${Owner}/${Repo}/releases/tags/${Tag}`;

    try {
        const response = await fetch(ghUrl, {
            headers: getGithubHeaders(Token, 'application/vnd.github.v3.raw')
        });

        if (!response.ok) {
            console.error('Release not found:', response.statusText);
            return null;
        }

        return await response.json() as GHRelease;
    } catch (err) {
        console.error('Error fetching release from GitHub:', err);
        return null;
    }
};


export const getAssetByName = async (
    name: string,
    { Tag = Release_Tag, Token = TOKEN, Owner = OWNER, Repo = REPO }: GetReleaseOptions = {}
): Promise<GHAsset> => {
    const release = await getReleaseByTag({ Tag, Token, Owner, Repo });

    if (!release || !release.assets) {
        return { error: 'Release not found', isOK: false };
    }

    const objectData = release.assets.find(asset => asset.name === name);
    if (!objectData) {
        return { error: 'Asset not found in release', isOK: false };
    }

    return {
        objectUrl: objectData.url,
        objectId: objectData.id,
        content_type: objectData.content_type,
        isOK: true
    };
};


export const checkAssetExists = async (
    name: string,
    options: GetReleaseOptions = {}
): Promise<CheckAssetExistsResult> => {
    const check = await getAssetByName(name, options);
    return { doesExist: check.isOK };
};


export const deleteAssetByName = async (
    name: string,
    { Tag = Release_Tag, Token = TOKEN, Owner = OWNER, Repo = REPO }: GetReleaseOptions = {}
): Promise<DeleteGHAssetResult> => {
    // 1. Cari dulu asset-nya untuk mendapatkan objectUrl
    const asset = await getAssetByName(name, { Tag, Token, Owner, Repo });

    if (!asset.isOK) {
        return { error: asset.error, isOK: false };
    }

    // 2. Endpoint DELETE menggunakan URL spesifik dari asset
    const deleteUrl = asset.objectUrl;

    try {
        const response = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: getGithubHeaders(Token)
        });

        // GitHub mengembalikan status 204 No Content jika sukses
        if (response.status === 204) {
            return { message: `Asset '${name}' deleted successfully`, isOK: true };
        }

        const errorData = await response.json();
        console.error('Failed to delete asset:', errorData);
        return { error: 'Failed to delete asset', details: errorData, isOK: false };

    } catch (err) {
        console.error('Error deleting asset:', err);
        return { error: 'Internal Server Error', isOK: false };
    }
};


// Fungsi upload yang menerima ReadableStream
export const uploadAssetStream = async (
    name: string,
    fileStream: ReadableStream, // Terima stream langsung
    contentType: string,
    { Tag = Release_Tag, Token = TOKEN, Owner = OWNER, Repo = REPO }: GetReleaseOptions = {}
): Promise<GHAsset> => {

    const release = await getReleaseByTag({ Tag, Token, Owner, Repo });
    if (!release) return { error: 'Release not found', isOK: false };

    const uploadUrl = release.upload_url.replace('{?name,label}', `?name=${encodeURIComponent(name)}`);

    try {
        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                ...getGithubHeaders(Token),
                'Content-Type': contentType,
                // GitHub butuh Content-Length untuk stream, tapi Cloudflare 
                // biasanya akan menanganinya secara otomatis jika body-nya stream.
            },
            body: fileStream // Teruskan stream raw dari user
        });

        const result = await response.json() as UploadGHAssetResponse;

        if (!response.ok) {
            return {
                error: result.message ?? 'Internal Server Error',
                originErr: result.errors ?? "Unknown error",
                originErrStatusCode: response.status,
                isOK: false
            };
        }

        return {
            objectId: result.id,
            objectUrl: result.url,
            content_type: result.content_type,
            name: result.name,
            isOK: true
        };
    } catch (err) {
        console.error('Error uploading asset:', err);
        return { error: 'Stream upload error', isOK: false };
    }
};