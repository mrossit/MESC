export type MaterialType = 'pdf' | 'document' | 'video' | 'audio' | 'image' | 'presentation' | 'other';

export const MATERIAL_MAX_FILE_SIZE = 10 * 1024 * 1024;

export const MATERIAL_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/webp',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'video/mp4',
  'video/webm',
  'video/quicktime'
] as const;

export const MATERIAL_TYPES = ['pdf', 'document', 'video', 'audio', 'image', 'presentation', 'other'] as const;

export function getFileType(mimeType: string): MaterialType {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'presentation';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  return 'other';
}

export function isMaterialType(value: unknown): value is MaterialType {
  return typeof value === 'string' && (MATERIAL_TYPES as readonly string[]).includes(value);
}

export function inferMaterialTypeFromExternalUrl(url: string, explicitType?: unknown): MaterialType {
  if (isMaterialType(explicitType)) return explicitType;

  const normalized = url.toLowerCase().split(/[?#]/, 1)[0];

  if (/\.(pdf)$/.test(normalized)) return 'pdf';
  if (/\.(doc|docx|odt|rtf)$/.test(normalized)) return 'document';
  if (/\.(ppt|pptx|odp)$/.test(normalized)) return 'presentation';
  if (/\.(jpe?g|png|webp)$/.test(normalized)) return 'image';
  if (/\.(mp3|m4a|wav|aac|ogg)$/.test(normalized)) return 'audio';
  if (/\.(mp4|webm|mov|m4v)$/.test(normalized)) return 'video';
  if (/youtube\.com|youtu\.be|vimeo\.com/.test(normalized)) return 'video';

  return 'other';
}
