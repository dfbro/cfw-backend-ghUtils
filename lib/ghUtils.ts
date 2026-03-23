import { GH_CONFIG } from '@/config/config';

const { OWNER, REPO, TOKEN, Release_Tag } = GH_CONFIG;

const RELEASE_CACHE_TTL_MS = 10_000;
type ReleaseCacheEntry = { expiresAt: number; value: GHReleaseResult };
const releaseByTagCache = new Map<string, ReleaseCacheEntry>();

const getReleaseCacheKey = (owner: string, repo: string, tag: string) => `${owner}/${repo}#${tag}`;

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
// VALIDATORS
// ==========================================
export const isValidTag = (tag: string): boolean => {
    if (!tag) return false

    // Single '@' sendirian
    if (tag === '@') return false

    // ASCII control characters (< \040) dan DEL (\177)
    if (/[\x00-\x1f\x7f]/.test(tag)) return false

    // Karakter terlarang: spasi, ~, ^, :, ?, *, [, \
    if (/[ ~^:?*\[\\]/.test(tag)) return false

    // Sequence @{
    if (/@\{/.test(tag)) return false

    // Double dot ..
    if (/\.\./.test(tag)) return false

    // Akhiri dengan dot
    if (/\.$/.test(tag)) return false

    // Akhiri dengan .lock
    if (/\.lock$/i.test(tag)) return false

    // Diawali atau diakhiri /
    if (/^\//.test(tag)) return false
    if (/\/$/.test(tag)) return false

    // Double slash //
    if (/\/\//.test(tag)) return false

    // Komponen diawali dot (awal string atau setelah /)
    if (/(^|\/)\./.test(tag)) return false

    return true
}


// ==========================================
// INTERFACES & TYPES
// ==========================================

export interface GetReleaseOptions {
    Tag: string;
    Token?: string;
    Owner?: string;
    Repo?: string;
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











export interface deleteGHReleaseSuccess {
    isOK: true;
    message: string;
    isTagFound: true;
}

export interface deleteGHReleaseError {
    isOK: false;
    error: string;
    originErr?: unknown;
    isTagFound?: boolean;
    originErrStatusCode?: number;
    isExpectedError?: boolean;
}

export type DeleteGHReleaseResult = deleteGHReleaseSuccess | deleteGHReleaseError;
















export interface GHRelease {
    message?: string;
    tag_name: string;
    created_at: string;
    updated_at: string;
    id: number;
    url: string;
    isOK: true;
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

export interface GHReleaseNotFound {
    error: string
    isNotFound: true
    originErr: Response | null
    isOK: false
    originErrStatusCode: number
}


export interface GHReleaseFetchError {
    error: string
    originErr: unknown
    isLikelyNotFound?: true
    isOK: false
    originErrStatusCode: number
}

export type GHReleaseResult = GHRelease | GHReleaseNotFound | GHReleaseFetchError 


// ==========================================
// FUNCTIONS
// ==========================================

export const getReleaseByTag = async ({
    Tag,
    Token = TOKEN,
    Owner = OWNER,
    Repo = REPO
}: GetReleaseOptions): Promise<GHReleaseResult> => {
    const cacheKey = getReleaseCacheKey(Owner, Repo, Tag);
    const cached = releaseByTagCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
    }

    const ghUrl = `https://api.github.com/repos/${Owner}/${Repo}/releases/tags/${Tag}`;

    try {
        const response = await fetch(ghUrl, {
            headers: getGithubHeaders(Token)
        });

        if (!response.ok) {
            return { error: 'Release/Tag not found', originErr: response, isNotFound: true, isOK: false, originErrStatusCode: response.status };
        }

        const result = await response.json() as GHRelease;
        releaseByTagCache.set(cacheKey, {
            value: result,
            expiresAt: Date.now() + RELEASE_CACHE_TTL_MS
        });
        return result;
    } catch (err) {
        return { error: 'Error fetching release', originErr: err, isLikelyNotFound: true, isOK: false, originErrStatusCode: 500 };
    }
};


export const getAssetByName = async (
    name: string,
    { Tag, Token = TOKEN, Owner = OWNER, Repo = REPO }: GetReleaseOptions
): Promise<GHAsset> => {
    const release = await getReleaseByTag({ Tag, Token, Owner, Repo });

    if (!('tag_name' in release)) {
        return { error: release.error, originErr: release.originErr, isOK: false, originErrStatusCode: release.originErrStatusCode };
    }

    const objectData = release.assets?.find(asset => asset.name === name);
    if (!objectData) {
        return { error: 'Asset not found in release', isOK: false, originErrStatusCode: 404 };
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
    options: GetReleaseOptions
): Promise<CheckAssetExistsResult> => {
    const check = await getAssetByName(name, options);
    return { doesExist: check.isOK };
};


export const deleteAssetByName = async (
    name: string,
    { Tag, Token = TOKEN, Owner = OWNER, Repo = REPO }: GetReleaseOptions
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
        return { error: 'Failed to delete asset', details: errorData, isOK: false };

    } catch (err) {
        return { error: 'Internal Server Error', isOK: false };
    }
};




export interface createReleaseFetchResultFail {
    message: string;
    errors?: Array<{ resource: string; code: string; field: string; message: string }>;
}


export interface createReleaseFail {
    error: string;
    originErr: createReleaseFetchResultFail | unknown;
    isOK: false;
    originErrStatusCode: number;
}


export const createRelease = async (
    { Tag, Token = TOKEN, Owner = OWNER, Repo = REPO }: GetReleaseOptions
): Promise<GHReleaseResult> => {
    const ghUrl = `https://api.github.com/repos/${Owner}/${Repo}/releases`;

    try {
        const response = await fetch(ghUrl, {
            method: 'POST',
            headers: getGithubHeaders(Token),
            body: JSON.stringify({
                tag_name: Tag,
                name: Tag,
                body: `Release for tag ${Tag}`,
                draft: false,
                prerelease: false
            })
        });

        if (!response.ok) {
            const errorData = await response.json() as createReleaseFetchResultFail;
            return { error: 'Failed to create release', originErr: errorData, isOK: false, originErrStatusCode: response.status };
        }

        const releaseData = await response.json() as GHRelease
        const result: GHRelease = { ...releaseData, isOK: true };
        releaseByTagCache.set(getReleaseCacheKey(Owner, Repo, Tag), {
            value: result,
            expiresAt: Date.now() + RELEASE_CACHE_TTL_MS
        });
        return result;


    } catch (err) {
        console.error('Error creating release:', err);
        return { error: 'Internal Server Error', originErr: err, isOK: false, originErrStatusCode: 500 };
    }

}

export const deleteReleaseByTag = async (
    { Tag, Token = TOKEN, Owner = OWNER, Repo = REPO }: GetReleaseOptions
): Promise<DeleteGHReleaseResult> => {
    const releaseResult = await getReleaseByTag({ Tag, Token, Owner, Repo });


    if (!('tag_name' in releaseResult) && 'isNotFound' in releaseResult && releaseResult.isNotFound) {
        return { error: releaseResult.error, isOK: false, isTagFound: false, isExpectedError: true };
    }
    if (!('tag_name' in releaseResult)) {
        return { error: releaseResult.error, originErr: releaseResult.originErr, isOK: false, originErrStatusCode: releaseResult.originErrStatusCode };
    }

    const releaseId = releaseResult.id;
    const deleteUrl = `https://api.github.com/repos/${Owner}/${Repo}/releases/${releaseId}`;

    try {
        const response = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: getGithubHeaders(Token)
        });

        if (response.status === 204) {
            releaseByTagCache.delete(getReleaseCacheKey(Owner, Repo, Tag));
            return { message: `Release with tag '${Tag}' deleted successfully`, isOK: true, isTagFound: true };
        }

        if (response.status === 404) {
            return { error: `Release with tag '${Tag}' not found`, isOK: false, originErr: response, originErrStatusCode: 404, isTagFound: false, isExpectedError: true };
        }
        const errorData = await response.json();
        console.error('Failed to delete release:', errorData);
        return { error: 'Failed to delete release', originErr: errorData, isOK: false, originErrStatusCode: response.status, isExpectedError: false };

    } catch (err) {
        console.error('Error deleting release:', err);
        return { error: 'Internal Server Error', originErr: err, isOK: false, originErrStatusCode: 500, isExpectedError: false };
    }
}


















// Fungsi upload yang menerima ReadableStream
export const uploadAssetStream = async (
    name: string,
    fileStream: ReadableStream, // Terima stream langsung
    contentType: string,
    { Tag, Token = TOKEN, Owner = OWNER, Repo = REPO, UploadUrl }: GetReleaseOptions & { UploadUrl?: string }
): Promise<GHAsset> => {
    let uploadUrl = UploadUrl;
    if (!uploadUrl) {
        const release = await getReleaseByTag({ Tag, Token, Owner, Repo });
        if (!('tag_name' in release)) return { error: release.error, originErr: release.originErr, isOK: false };
        uploadUrl = release.upload_url;
    }

    const uploadUrlWithName = uploadUrl.replace('{?name,label}', `?name=${encodeURIComponent(name)}`);

    try {
        const response = await fetch(uploadUrlWithName, {
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