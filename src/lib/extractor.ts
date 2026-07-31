import JSZip from 'jszip';

export async function createZip(files: { name: string; data: Uint8Array }[]): Promise<Blob> {
  const zip = new JSZip();
  
  for (const file of files) {
    zip.file(file.name, file.data);
  }
  
  return await zip.generateAsync({ type: 'blob' });
}

export function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
