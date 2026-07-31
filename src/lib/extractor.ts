import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export async function createZip(files: { name: string; data: Uint8Array }[]): Promise<Blob> {
  const zip = new JSZip();
  
  for (const file of files) {
    zip.file(file.name, file.data);
  }
  
  return await zip.generateAsync({ type: 'blob' });
}

export function downloadFile(blob: Blob, filename: string) {
  saveAs(blob, filename);
}
