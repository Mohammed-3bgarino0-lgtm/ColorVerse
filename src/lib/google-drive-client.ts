import { createSign } from 'node:crypto';

const DEFAULT_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DEFAULT_DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DEFAULT_DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';

export interface GoogleDriveClientOptions {
  clientEmail?: string;
  privateKey?: string;
  tokenUrl?: string;
  apiBaseUrl?: string;
  uploadBaseUrl?: string;
}

export interface GoogleDriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  size?: string;
  webViewLink?: string;
  webContentLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  appProperties?: Record<string, string>;
}

export interface UploadGoogleDriveFileInput {
  name: string;
  mimeType: string;
  parentId: string;
  data: Buffer | Uint8Array;
  appProperties?: Record<string, string>;
}

export class GoogleDriveNotConfiguredError extends Error {
  constructor() {
    super('Google Drive server credentials are not configured.');
    this.name = 'GoogleDriveNotConfiguredError';
  }
}

export class GoogleDriveRequestError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'GoogleDriveRequestError';
    this.status = status;
    this.details = details;
  }
}

function base64Url(value: string | Buffer): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function normalizedPrivateKey(value: string): string {
  return value.replace(/\\n/g, '\n').trim();
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function multipartBody(
  metadata: Record<string, unknown>,
  mimeType: string,
  data: Buffer | Uint8Array,
): { boundary: string; body: Buffer } {
  const boundary = `colorverse_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const prefix = Buffer.from(
    [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify(metadata),
      `--${boundary}`,
      `Content-Type: ${mimeType}`,
      '',
      '',
    ].join('\r\n'),
  );
  const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
  return { boundary, body: Buffer.concat([prefix, Buffer.from(data), suffix]) };
}

export class GoogleDriveClient {
  readonly clientEmail: string;
  readonly privateKey: string;
  readonly tokenUrl: string;
  readonly apiBaseUrl: string;
  readonly uploadBaseUrl: string;
  private tokenCache?: { value: string; expiresAt: number };

  constructor(options: GoogleDriveClientOptions = {}) {
    this.clientEmail = options.clientEmail ?? process.env.GOOGLE_DRIVE_CLIENT_EMAIL ?? '';
    this.privateKey = normalizedPrivateKey(
      options.privateKey ?? process.env.GOOGLE_DRIVE_PRIVATE_KEY ?? '',
    );
    this.tokenUrl = options.tokenUrl ?? process.env.GOOGLE_DRIVE_TOKEN_URL ?? DEFAULT_TOKEN_URL;
    this.apiBaseUrl = (options.apiBaseUrl ?? DEFAULT_DRIVE_API).replace(/\/$/, '');
    this.uploadBaseUrl = (options.uploadBaseUrl ?? DEFAULT_DRIVE_UPLOAD_API).replace(/\/$/, '');
  }

  get configured(): boolean {
    return Boolean(this.clientEmail && this.privateKey);
  }

  private assertion(): string {
    if (!this.configured) throw new GoogleDriveNotConfiguredError();
    const now = Math.floor(Date.now() / 1000);
    const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = base64Url(JSON.stringify({
      iss: this.clientEmail,
      scope: DRIVE_SCOPE,
      aud: this.tokenUrl,
      iat: now,
      exp: now + 3600,
    }));
    const unsigned = `${header}.${claims}`;
    const signature = createSign('RSA-SHA256').update(unsigned).sign(this.privateKey);
    return `${unsigned}.${base64Url(signature)}`;
  }

  private async accessToken(force = false): Promise<string> {
    if (!force && this.tokenCache && this.tokenCache.expiresAt > Date.now() + 60_000) {
      return this.tokenCache.value;
    }
    if (!this.configured) throw new GoogleDriveNotConfiguredError();

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: this.assertion(),
      }),
    });
    const text = await response.text();
    const decoded = safeJson(text) as Record<string, unknown>;
    const token = typeof decoded?.access_token === 'string' ? decoded.access_token : '';
    if (!response.ok || !token) {
      throw new GoogleDriveRequestError(
        'Unable to obtain a Google Drive access token.',
        response.status,
        decoded,
      );
    }
    const expiresIn = Number(decoded.expires_in || 3600);
    this.tokenCache = { value: token, expiresAt: Date.now() + expiresIn * 1000 };
    return token;
  }

  private async request(url: string, init: RequestInit = {}, retry = true): Promise<Response> {
    const token = await this.accessToken();
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { ...init, headers });
    if (response.status === 401 && retry) {
      this.tokenCache = undefined;
      return this.request(url, init, false);
    }
    return response;
  }

  async getFileMetadata(fileId: string): Promise<GoogleDriveFileMetadata> {
    const fields = [
      'id', 'name', 'mimeType', 'parents', 'size', 'webViewLink', 'webContentLink',
      'createdTime', 'modifiedTime', 'appProperties',
    ].join(',');
    const response = await this.request(
      `${this.apiBaseUrl}/files/${encodeURIComponent(fileId)}?supportsAllDrives=true&fields=${encodeURIComponent(fields)}`,
    );
    const text = await response.text();
    const decoded = safeJson(text);
    if (!response.ok) {
      throw new GoogleDriveRequestError('Unable to read Google Drive file metadata.', response.status, decoded);
    }
    return decoded as GoogleDriveFileMetadata;
  }

  async uploadFile(input: UploadGoogleDriveFileInput): Promise<GoogleDriveFileMetadata> {
    const metadata = {
      name: input.name,
      parents: [input.parentId],
      appProperties: input.appProperties,
    };
    const multipart = multipartBody(metadata, input.mimeType, input.data);
    const fields = 'id,name,mimeType,parents,size,webViewLink,webContentLink,createdTime,modifiedTime,appProperties';
    const response = await this.request(
      `${this.uploadBaseUrl}/files?uploadType=multipart&supportsAllDrives=true&fields=${encodeURIComponent(fields)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/related; boundary=${multipart.boundary}`,
          'Content-Length': String(multipart.body.length),
        },
        body: multipart.body,
      },
    );
    const text = await response.text();
    const decoded = safeJson(text);
    if (!response.ok) {
      throw new GoogleDriveRequestError('Unable to upload a file to Google Drive.', response.status, decoded);
    }
    return decoded as GoogleDriveFileMetadata;
  }

  async downloadFile(fileId: string): Promise<{ metadata: GoogleDriveFileMetadata; data: Buffer }> {
    const metadata = await this.getFileMetadata(fileId);
    const response = await this.request(
      `${this.apiBaseUrl}/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
    );
    if (!response.ok) {
      const text = await response.text();
      throw new GoogleDriveRequestError(
        'Unable to download a Google Drive file.',
        response.status,
        safeJson(text),
      );
    }
    return { metadata, data: Buffer.from(await response.arrayBuffer()) };
  }

  async readJsonFile<T = unknown>(fileId: string): Promise<T> {
    const downloaded = await this.downloadFile(fileId);
    try {
      return JSON.parse(downloaded.data.toString('utf8')) as T;
    } catch (error) {
      throw new GoogleDriveRequestError('Google Drive JSON file is invalid.', 422, error);
    }
  }

  async listChildren(folderId: string): Promise<GoogleDriveFileMetadata[]> {
    const results: GoogleDriveFileMetadata[] = [];
    let pageToken = '';
    do {
      const params = new URLSearchParams({
        q: `'${folderId.replace(/'/g, "\\'")}' in parents and trashed = false`,
        pageSize: '1000',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true',
        fields: 'nextPageToken,files(id,name,mimeType,parents,size,webViewLink,createdTime,modifiedTime,appProperties)',
      });
      if (pageToken) params.set('pageToken', pageToken);
      const response = await this.request(`${this.apiBaseUrl}/files?${params.toString()}`);
      const text = await response.text();
      const decoded = safeJson(text) as { files?: GoogleDriveFileMetadata[]; nextPageToken?: string };
      if (!response.ok) {
        throw new GoogleDriveRequestError('Unable to list Google Drive folder.', response.status, decoded);
      }
      results.push(...(decoded.files || []));
      pageToken = decoded.nextPageToken || '';
    } while (pageToken);
    return results;
  }
}
