<script>
  import { extractSubtitlesFromMKV, convertToSubtitleFile, getLanguageFullName } from '$lib/ebml.js';
  import JSZip from 'jszip';

  let file = null;
  let tracks = [];
  let parsing = false;
  let progressText = '';
  let progressPercent = 0;
  let errorMsg = '';
  let dragOver = false;
  let fileInput;

  function log(msg) {
    console.log(`[MKV Extractor] ${msg}`);
  }

  function getBaseName() {
    if (!file) return 'subtitle';
    return file.name.replace(/\.mkv$/i, '').replace(/[^a-zA-Z0-9\u0E00-\u0E7F\s]/g, '_').replace(/\s+/g, '_');
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleFile(selected) {
    if (!selected) return;
    const sizeMB = selected.size / 1024 / 1024;
    file = selected;
    tracks = [];
    errorMsg = '';
    progressText = '';
    progressPercent = 0;
    log(`เลือกไฟล์: ${selected.name} (${sizeMB.toFixed(2)} MB)`);
  }

  function handleFileChange(e) {
    handleFile(e.target.files[0]);
    e.target.value = '';
  }

  function handleDragOver(e) {
    e.preventDefault();
    dragOver = true;
  }

  function handleDragLeave(e) {
    e.preventDefault();
    dragOver = false;
  }

  function handleDrop(e) {
    e.preventDefault();
    dragOver = false;
    const droppedFiles = e.dataTransfer?.files;
    if (droppedFiles && droppedFiles.length > 0) {
      const mkvFile = Array.from(droppedFiles).find(f => 
        f.name.toLowerCase().endsWith('.mkv') || f.type === 'video/x-matroska'
      );
      if (mkvFile) {
        handleFile(mkvFile);
      } else {
        errorMsg = 'กรุณาลากไฟล์ .mkv เท่านั้น';
      }
    }
  }

  function triggerFileInput() {
    fileInput?.click();
  }

  async function extractSubtitles() {
    if (!file) return;
    
    parsing = true;
    tracks = [];
    errorMsg = '';
    progressText = 'เริ่มต้น...';
    progressPercent = 0;

    try {
      const onProgress = (msg, pct) => {
        progressText = msg;
        if (typeof pct === 'number') progressPercent = pct;
        log(msg);
      };

      const rawTracks = await extractSubtitlesFromMKV(file, onProgress);
      
      if (rawTracks.length === 0) {
        errorMsg = 'ไม่พบ subtitle track ในไฟล์นี้';
        parsing = false;
        return;
      }

      tracks = rawTracks.map(t => ({
        ...t,
        languageName: getLanguageFullName(t.languageIETF || t.language, t.name),
        blockCount: t.blocks ? t.blocks.length : 0
      }));

      log(`พบ ${tracks.length} subtitle track(s)`);
    } catch (err) {
      errorMsg = `ผิดพลาด: ${err?.message || err}`;
      console.error(err);
    } finally {
      parsing = false;
    }
  }

  function downloadTrack(track) {
    const result = convertToSubtitleFile(track);
    let blob;
    if (result.binary) {
      blob = new Blob([result.content], { type: 'application/octet-stream' });
    } else {
      blob = new Blob([result.content], { type: 'text/plain;charset=utf-8' });
    }
    const base = getBaseName();
    const lang = track.languageName.replace(/\s+/g, '_');
    const nameTag = track.name ? '_' + track.name.replace(/[^a-zA-Z0-9]/g, '_') : '';
    const filename = `${base}_${lang}_Track${track.trackNumber}${nameTag}.${result.extension}`;
    downloadBlob(blob, filename);
  }

  async function downloadAll() {
    if (tracks.length === 0) return;
    const zip = new JSZip();
    const base = getBaseName();
    for (const track of tracks) {
      const result = convertToSubtitleFile(track);
      const lang = track.languageName.replace(/\s+/g, '_');
      const nameTag = track.name ? '_' + track.name.replace(/[^a-zA-Z0-9]/g, '_') : '';
      const filename = `${base}_${lang}_Track${track.trackNumber}${nameTag}.${result.extension}`;
      zip.file(filename, result.content);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, `${base}_subtitles.zip`);
  }
</script>

<div class="container">
  <h1>🎬 MKV Subtitle Extractor</h1>
  <p class="subtitle">แยก subtitle จากไฟล์ MKV โดยไม่ต้องอัปโหลดไปเซิร์ฟเวอร์ (Pure JS Parser)</p>

  <div 
    class="upload-zone"
    class:drag-active={dragOver}
    on:dragover|preventDefault={handleDragOver}
    on:dragleave|preventDefault={handleDragLeave}
    on:drop|preventDefault={handleDrop}
    on:click={triggerFileInput}
    role="button"
    tabindex="0"
  >
    <input
      bind:this={fileInput}
      type="file"
      accept=".mkv,video/x-matroska"
      on:change={handleFileChange}
      style="display: none;"
    />
    {#if !file}
      <div class="drop-icon">📁</div>
      <div>ลากไฟล์ MKV มาวางที่นี่ หรือคลิกเลือก</div>
    {:else}
      <div>📄 {file.name}</div>
      <div class="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
    {/if}
  </div>

  {#if file}
    <button class="btn-primary" on:click={extractSubtitles} disabled={parsing}>
      {parsing ? '⏳ กำลังอ่านไฟล์...' : '🔍 สแกน Subtitle Tracks'}
    </button>
  {/if}

  {#if parsing && progressPercent > 0}
    <div class="progress-bar">
      <div class="progress-fill" style="width: {progressPercent}%"></div>
    </div>
    <div class="progress-text">{progressText} ({progressPercent}%)</div>
  {/if}

  {#if errorMsg}
    <div class="error-box">❌ {errorMsg}</div>
  {/if}

  {#if tracks.length > 0}
    <div class="results">
      <div class="results-header">
        <h3>📦 พบ {tracks.length} Subtitle Track(s)</h3>
        <button class="btn-small" on:click={downloadAll}>ดาวน์โหลดทั้งหมด (ZIP)</button>
      </div>
      <ul class="track-list">
        {#each tracks as track}
          <li class="track-item">
            <div class="track-info">
              <span class="track-lang">{track.languageName}</span>
              <span class="track-codec">{track.codecId}</span>
              {#if track.name}
                <span class="track-name">{track.name}</span>
              {/if}
              <span class="track-blocks">{track.blockCount} blocks</span>
            </div>
            <button class="btn-small" on:click={() => downloadTrack(track)}>ดาวน์โหลด</button>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 720px;
    margin: 2rem auto;
    padding: 1.5rem;
    font-family: system-ui, -apple-system, sans-serif;
    color: #e2e8f0;
    background: #0f172a;
    border-radius: 16px;
  }
  h1 { margin: 0 0 0.25rem; color: #f8fafc; }
  .subtitle { color: #94a3b8; margin-bottom: 1.5rem; }
  .btn-primary {
    width: 100%;
    padding: 0.875rem;
    font-size: 1rem;
    font-weight: 600;
    border: none;
    border-radius: 10px;
    background: #6366f1;
    color: white;
    cursor: pointer;
    margin-bottom: 1rem;
    transition: opacity 0.2s;
  }
  .btn-primary:hover:not(:disabled) { opacity: 0.9; }
  .btn-primary:disabled { background: #475569; cursor: not-allowed; }
  .btn-small {
    padding: 0.4rem 0.8rem;
    font-size: 0.875rem;
    border: none;
    border-radius: 6px;
    background: #059669;
    color: white;
    cursor: pointer;
    white-space: nowrap;
  }
  .btn-small:hover { opacity: 0.9; }
  .upload-zone {
    border: 2px dashed #475569;
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
    margin-bottom: 1rem;
    transition: all 0.2s;
    cursor: pointer;
  }
  .upload-zone:hover, .upload-zone.drag-active {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.1);
  }
  .drop-icon { font-size: 3rem; margin-bottom: 0.5rem; }
  .file-size { color: #94a3b8; font-size: 0.875rem; margin-top: 0.25rem; }
  .progress-bar {
    width: 100%;
    height: 8px;
    background: #1e293b;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }
  .progress-fill {
    height: 100%;
    background: #6366f1;
    transition: width 0.3s;
  }
  .progress-text {
    color: #94a3b8;
    font-size: 0.875rem;
    margin-bottom: 1rem;
    text-align: center;
  }
  .error-box {
    background: #7f1d1d;
    color: #fecaca;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
  }
  .results {
    background: #1e293b;
    padding: 1rem;
    border-radius: 8px;
  }
  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  .results-header h3 { margin: 0; color: #f8fafc; }
  .track-list { list-style: none; padding: 0; margin: 0; }
  .track-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: #0f172a;
    border-radius: 8px;
    margin-bottom: 0.5rem;
    gap: 1rem;
  }
  .track-info {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }
  .track-lang {
    font-weight: 600;
    color: #f8fafc;
  }
  .track-codec {
    color: #94a3b8;
    font-size: 0.8rem;
    background: #1e293b;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
  }
  .track-name {
    color: #cbd5e1;
    font-size: 0.875rem;
  }
  .track-blocks {
    color: #64748b;
    font-size: 0.75rem;
  }
</style>
