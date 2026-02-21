import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';

const CONTAINER_NAME = 'algosensei';

// Singleton ContainerClient with HMR-safe global caching
let containerClient: ContainerClient | undefined;

function getContainerClient(): ContainerClient {
  if (containerClient) return containerClient;

  const globalWithAzure = global as typeof globalThis & {
    _azureContainerClient?: ContainerClient;
  };

  if (
    process.env.NODE_ENV === 'development' &&
    globalWithAzure._azureContainerClient
  ) {
    containerClient = globalWithAzure._azureContainerClient;
    return containerClient;
  }

  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connStr) {
    throw new Error(
      'Missing environment variable: "AZURE_STORAGE_CONNECTION_STRING"'
    );
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(connStr);
  containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

  if (process.env.NODE_ENV === 'development') {
    globalWithAzure._azureContainerClient = containerClient;
  }

  return containerClient;
}

// Encode email for use as a blob path segment
export function encodeEmail(email: string): string {
  return email
    .toLowerCase()
    .replace(/@/g, '_at_')
    .replace(/[^a-z0-9._-]/g, '_');
}

// Generate a unique ID (replaces MongoDB ObjectId)
export function generateId(): string {
  const timestamp = Date.now().toString(16).padStart(12, '0');
  const random = Math.random().toString(16).substring(2, 10);
  return `${timestamp}${random}`;
}

// Upload a JSON object as a blob
export async function uploadJson(
  blobPath: string,
  data: unknown
): Promise<void> {
  const client = getContainerClient();
  const blockBlobClient = client.getBlockBlobClient(blobPath);
  const content = JSON.stringify(data);
  await blockBlobClient.upload(content, Buffer.byteLength(content), {
    blobHTTPHeaders: { blobContentType: 'application/json' },
  });
}

// Download a blob and parse as JSON. Returns null if not found.
export async function downloadJson<T = unknown>(
  blobPath: string
): Promise<T | null> {
  const client = getContainerClient();
  const blobClient = client.getBlobClient(blobPath);
  try {
    const response = await blobClient.download();
    if (!response.readableStreamBody) return null;
    const text = await streamToString(response.readableStreamBody);
    return JSON.parse(text) as T;
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 404) return null;
    throw err;
  }
}

// Delete a blob. Returns true if deleted, false if not found.
export async function deleteBlob(blobPath: string): Promise<boolean> {
  const client = getContainerClient();
  const blobClient = client.getBlobClient(blobPath);
  try {
    await blobClient.delete();
    return true;
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 404) return false;
    throw err;
  }
}

// List all blobs under a prefix and return their parsed JSON contents
export async function listJsonBlobs<T = unknown>(prefix: string): Promise<T[]> {
  const client = getContainerClient();
  const results: T[] = [];
  for await (const blob of client.listBlobsFlat({ prefix })) {
    const data = await downloadJson<T>(blob.name);
    if (data !== null) results.push(data);
  }
  return results;
}

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (data) => {
      chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data));
    });
    stream.on('end', () => resolve(Buffer.concat(chunks).toString()));
    stream.on('error', reject);
  });
}

export default getContainerClient;
