// One aggregate upload budget, shared by client and server.
export const MAX_BRIEF_UPLOAD_BYTES = 25 * 1024 * 1024
export const MAX_BRIEF_UPLOAD_BASE64 = Math.ceil(MAX_BRIEF_UPLOAD_BYTES / 3) * 4
