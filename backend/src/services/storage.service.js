'use strict';
// Storage service stub — integrate with S3/GCS when needed
async function uploadFile(file, key) { throw new Error('Storage service not configured'); }
async function deleteFile(key) { throw new Error('Storage service not configured'); }
async function getFileUrl(key) { throw new Error('Storage service not configured'); }
module.exports = { uploadFile, deleteFile, getFileUrl };
