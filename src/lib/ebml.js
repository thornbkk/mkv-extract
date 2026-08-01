/**
 * Chunked EBML / Matroska Parser for Large Files
 */

const ELEMENTS = {
  EBML: 0x1A45DFA3, Segment: 0x18538067, SeekHead: 0x114D9B74,
  Info: 0x1549A966, Tracks: 0x1654AE6B, TrackEntry: 0xAE,
  TrackNumber: 0xD7, TrackType: 0x83, CodecID: 0x86,
  Name: 0x536E, CodecPrivate: 0x63A2, Language: 0x22B59C,
  LanguageIETF: 0x22B59D, DefaultDuration: 0x23E383,
  Cluster: 0x1F43B675, Timecode: 0xE7,
  SimpleBlock: 0xA3, BlockGroup: 0xA0, Block: 0xA1,
  BlockDuration: 0x9B, ReferenceBlock: 0xFB, TimecodeScale: 0x2AD7B1,
  Void: 0xEC, CRC32: 0xBF,
  SeekID: 0x53AB, SeekPosition: 0x53AC,
  Cues: 0x1C53BB6B, CuePoint: 0xBB, CueTime: 0xB3,
  CueTrackPositions: 0xB7, CueClusterPosition: 0xF1,
};

const TRACK_TYPE_SUBTITLE = 0x11;

const LANGUAGE_NAMES = {
  'eng': 'English', 'en': 'English', 'en-us': 'English', 'en-gb': 'English',
  'fre': 'French', 'fra': 'French', 'fr': 'French', 'fr-ca': 'French',
  'spa': 'Spanish', 'es': 'Spanish', 'es-mx': 'Spanish',
  'ger': 'German', 'deu': 'German', 'de': 'German',
  'ita': 'Italian', 'it': 'Italian',
  'jpn': 'Japanese', 'ja': 'Japanese',
  'kor': 'Korean', 'ko': 'Korean',
  'chi': 'Chinese', 'zho': 'Chinese', 'zh': 'Chinese', 'zh-cn': 'Chinese', 'zh-tw': 'Chinese',
  'rus': 'Russian', 'ru': 'Russian',
  'por': 'Portuguese', 'pt': 'Portuguese', 'pt-br': 'Portuguese',
  'dut': 'Dutch', 'nld': 'Dutch', 'nl': 'Dutch',
  'pol': 'Polish', 'pl': 'Polish',
  'tur': 'Turkish', 'tr': 'Turkish',
  'swe': 'Swedish', 'sv': 'Swedish',
  'tha': 'Thai', 'th': 'Thai',
  'vie': 'Vietnamese', 'vi': 'Vietnamese',
  'ind': 'Indonesian', 'id': 'Indonesian',
  'ara': 'Arabic', 'ar': 'Arabic',
  'hin': 'Hindi', 'hi': 'Hindi',
  'und': 'Unknown'
};

function detectLanguageFromName(name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  if (lower.includes('english') || lower.includes('eng')) return 'English';
  if (lower.includes('french') || lower.includes('francais') || lower.includes('français')) return 'French';
  if (lower.includes('spanish') || lower.includes('espanol') || lower.includes('español')) return 'Spanish';
  if (lower.includes('german') || lower.includes('deutsch')) return 'German';
  if (lower.includes('italian') || lower.includes('italiano')) return 'Italian';
  if (lower.includes('japanese') || lower.includes('japan')) return 'Japanese';
  if (lower.includes('korean') || lower.includes('korea')) return 'Korean';
  if (lower.includes('chinese') || lower.includes('china') || lower.includes('mandarin')) return 'Chinese';
  if (lower.includes('russian') || lower.includes('russia')) return 'Russian';
  if (lower.includes('portuguese') || lower.includes('portugal')) return 'Portuguese';
  if (lower.includes('dutch') || lower.includes('nederlands')) return 'Dutch';
  if (lower.includes('polish') || lower.includes('polski')) return 'Polish';
  if (lower.includes('turkish') || lower.includes('türkçe')) return 'Turkish';
  if (lower.includes('swedish') || lower.includes('svenska')) return 'Swedish';
  if (lower.includes('thai') || lower.includes('ไทย')) return 'Thai';
  if (lower.includes('vietnamese') || lower.includes('tiếng việt')) return 'Vietnamese';
  if (lower.includes('indonesian') || lower.includes('bahasa')) return 'Indonesian';
  if (lower.includes('arabic') || lower.includes('العربية')) return 'Arabic';
  if (lower.includes('hindi') || lower.includes('हिन्दी')) return 'Hindi';
  return null;
}

export function getLanguageFullName(code, trackName) {
  const lowerCode = (code || 'und').toLowerCase();
  let name = LANGUAGE_NAMES[lowerCode];
  if (name && name !== 'Unknown') return name;
  const detected = detectLanguageFromName(trackName);
  if (detected) return detected;
  return code && code !== 'und' ? code.toUpperCase() : 'Unknown';
}

class ChunkedReader {
  constructor(file, chunkSize) {
    this.file = file;
    this.chunkSize = chunkSize || 4 * 1024 * 1024;
    this.cache = new Map();
    this.maxCache = 3;
    this.fileSize = file.size;
  }

  async readRange(offset, length) {
    if (offset + length > this.fileSize) length = this.fileSize - offset;
    if (length <= 0) return new Uint8Array(0);
    for (const [cacheOffset, cacheEntry] of this.cache) {
      const buf = cacheEntry.buffer;
      if (offset >= cacheOffset && offset + length <= cacheOffset + buf.length) {
        return buf.slice(offset - cacheOffset, offset - cacheOffset + length);
      }
    }
    const start = offset;
    const end = Math.min(offset + Math.max(length, this.chunkSize), this.fileSize);
    const slice = this.file.slice(start, end);
    const ab = await slice.arrayBuffer();
    const buffer = new Uint8Array(ab);
    this.cache.set(start, { buffer, timestamp: Date.now() });
    if (this.cache.size > this.maxCache) {
      let oldest = null, oldestTime = Infinity;
      for (const [k, v] of this.cache) {
        if (v.timestamp < oldestTime) { oldestTime = v.timestamp; oldest = k; }
      }
      if (oldest !== null) this.cache.delete(oldest);
    }
    return buffer.slice(0, length);
  }

  async getUint8(offset) {
    const bytes = await this.readRange(offset, 1);
    return bytes[0];
  }

  async getBytes(offset, length) {
    return await this.readRange(offset, length);
  }

  async getString(offset, length) {
    const bytes = await this.readRange(offset, length);
    return new TextDecoder().decode(bytes);
  }
}

async function readElementId(reader, offset) {
  const firstByte = await reader.getUint8(offset);
  let length = 1;
  if (firstByte & 0x80) length = 1;
  else if (firstByte & 0x40) length = 2;
  else if (firstByte & 0x20) length = 3;
  else if (firstByte & 0x10) length = 4;
  else return { value: 0, length: 0 };
  if (offset + length > reader.fileSize) return { value: 0, length: 0 };
  let value = 0;
  for (let i = 0; i < length; i++) {
    value = (value << 8) | await reader.getUint8(offset + i);
  }
  return { value, length };
}

async function readDataSize(reader, offset) {
  const firstByte = await reader.getUint8(offset);
  let length = 1;
  if (firstByte & 0x80) length = 1;
  else if (firstByte & 0x40) length = 2;
  else if (firstByte & 0x20) length = 3;
  else if (firstByte & 0x10) length = 4;
  else if (firstByte & 0x08) length = 5;
  else if (firstByte & 0x04) length = 6;
  else if (firstByte & 0x02) length = 7;
  else if (firstByte & 0x01) length = 8;
  else return { value: 0, length: 0 };
  if (offset + length > reader.fileSize) return { value: 0, length: 0 };
  const mask = 0xFF >> length;
  let value = firstByte & mask;
  for (let i = 1; i < length; i++) {
    value = (value << 8) | await reader.getUint8(offset + i);
  }
  const allOnes = value === ((1 << (7 * length)) - 1);
  return { value: allOnes ? -1 : value, length, unknown: allOnes };
}

async function parseElement(reader, offset) {
  if (offset >= reader.fileSize) return null;
  const idResult = await readElementId(reader, offset);
  if (idResult.length === 0) return null;
  const sizeResult = await readDataSize(reader, offset + idResult.length);
  if (sizeResult.length === 0) return null;
  const id = idResult.value, size = sizeResult.value;
  const idLength = idResult.length, sizeLength = sizeResult.length;
  const dataOffset = offset + idLength + sizeLength;
  const elementLength = idLength + sizeLength + (size >= 0 ? size : 0);
  return {
    id, idLength, size, sizeLength, dataOffset, elementLength,
    unknownSize: sizeResult.unknown,
    endOffset: size >= 0 ? dataOffset + size : -1
  };
}

async function readUint(reader, offset, length) {
  let value = 0;
  for (let i = 0; i < length; i++) {
    value = (value << 8) | await reader.getUint8(offset + i);
  }
  return value;
}

async function readInt(reader, offset, length) {
  let value = await readUint(reader, offset, length);
  const bitLength = length * 8;
  if (value >= (1 << (bitLength - 1))) value -= (1 << bitLength);
  return value;
}

async function parseBlock(reader, offset, size, clusterTimecode) {
  let pos = offset;
  const end = offset + size;
  const trackResult = await readDataSize(reader, pos);
  const trackNumber = trackResult.value;
  pos += trackResult.length;
  const timecode = await readInt(reader, pos, 2);
  pos += 2;
  const flags = await reader.getUint8(pos);
  pos += 1;
  const lacing = (flags & 0x06) >> 1;
  if (lacing !== 0) {
    const frameCount = await reader.getUint8(pos) + 1;
    pos += 1;
    if (lacing === 1) {
      for (let i = 0; i < frameCount - 1; i++) {
        let laceSize = 0, byte;
        do { byte = await reader.getUint8(pos++); laceSize += byte; } while (byte === 0xFF);
      }
    } else if (lacing === 3) {
      for (let i = 0; i < frameCount - 1; i++) {
        const laceResult = await readDataSize(reader, pos);
        pos += laceResult.length;
      }
    }
  }
  const dataLen = end - pos;
  const data = await reader.getBytes(pos, dataLen);
  return { trackNumber, timecode, absoluteTimecode: clusterTimecode + timecode, data };
}

function formatSrtTime(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const ms2 = Math.floor(ms % 1000);
  return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+','+String(ms2).padStart(3,'0');
}

function formatAssTime(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const c = Math.floor((ms % 1000) / 10);
  return h+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+'.'+String(c).padStart(2,'0');
}

async function parseSeekHead(reader, seekHeadOffset) {
  const positions = {};
  const seekHead = await parseElement(reader, seekHeadOffset);
  if (!seekHead) return positions;
  let offset = seekHead.dataOffset;
  const end = seekHead.endOffset;
  while (offset < end) {
    const entry = await parseElement(reader, offset);
    if (!entry) break;
    if (entry.id === 0x4DBB) {
      let seekOffset = entry.dataOffset;
      const seekEnd = entry.endOffset;
      let seekId = null, seekPos = null;
      while (seekOffset < seekEnd) {
        const field = await parseElement(reader, seekOffset);
        if (!field) break;
        if (field.id === ELEMENTS.SeekID) seekId = await readUint(reader, field.dataOffset, field.size);
        else if (field.id === ELEMENTS.SeekPosition) seekPos = await readUint(reader, field.dataOffset, field.size);
        seekOffset += field.elementLength;
      }
      if (seekId !== null && seekPos !== null) positions[seekId] = seekPos;
    }
    offset += entry.elementLength;
  }
  return positions;
}

async function* scanClusters(reader, startOffset, fileSize, onProgress) {
  const chunkSize = 4 * 1024 * 1024;
  const idPattern = [0x1F, 0x43, 0xB6, 0x75];
  let offset = startOffset;
  let scanned = 0;
  let leftover = new Uint8Array(0);
  while (offset < fileSize) {
    const end = Math.min(offset + chunkSize, fileSize);
    const chunkLen = end - offset;
    const chunk = await reader.readRange(offset, chunkLen);
    const combined = new Uint8Array(leftover.length + chunk.length);
    combined.set(leftover);
    combined.set(chunk, leftover.length);
    for (let i = 0; i <= combined.length - 4; i++) {
      if (combined[i] === idPattern[0] && combined[i+1] === idPattern[1] &&
          combined[i+2] === idPattern[2] && combined[i+3] === idPattern[3]) {
        const clusterOffset = offset - leftover.length + i;
        const element = await parseElement(reader, clusterOffset);
        if (element && element.id === ELEMENTS.Cluster) {
          yield { offset: clusterOffset, element };
        }
      }
    }
    scanned += chunk.length;
    if (onProgress) onProgress(scanned, fileSize - startOffset);
    leftover = chunk.slice(-3);
    offset = end;
  }
}

export async function extractSubtitlesFromMKV(file, onProgress) {
  const reader = new ChunkedReader(file);
  const fileSize = file.size;
  const tracks = [];
  const subtitleBlocks = {};
  let timecodeScale = 1000000;
  let segmentOffset = -1;
  let segmentDataOffset = 0;
  let segmentEndOffset = fileSize;

  onProgress?.('Reading EBML header...', 0);

  let offset = 0;
  const ebmlElement = await parseElement(reader, offset);
  if (ebmlElement && ebmlElement.id === ELEMENTS.EBML) {
    offset = ebmlElement.dataOffset + ebmlElement.size;
  }

  onProgress?.('Finding Segment...', 5);

  let scanAttempts = 0;
  const maxScan = 100;
  while (offset < fileSize && scanAttempts < maxScan) {
    const element = await parseElement(reader, offset);
    if (!element) { offset += 1; scanAttempts++; continue; }
    if (element.id === ELEMENTS.Segment) {
      segmentOffset = offset;
      segmentDataOffset = element.dataOffset;
      segmentEndOffset = element.endOffset > 0 ? element.endOffset : fileSize;
      break;
    }
    if (element.size >= 0) offset += element.elementLength;
    else offset += element.idLength + element.sizeLength + 1;
    scanAttempts++;
  }

  if (segmentOffset < 0) throw new Error('No Segment found');

  onProgress?.('Parsing Segment structure...', 10);

  let tracksOffset = -1;
  let cuesOffset = -1;
  const firstChild = await parseElement(reader, segmentDataOffset);
  if (firstChild && firstChild.id === ELEMENTS.SeekHead) {
    onProgress?.('Found SeekHead, reading positions...', 15);
    const seekHeadPositions = await parseSeekHead(reader, segmentDataOffset);
    if (seekHeadPositions[ELEMENTS.Tracks] !== undefined) tracksOffset = segmentDataOffset + seekHeadPositions[ELEMENTS.Tracks];
    if (seekHeadPositions[ELEMENTS.Cues] !== undefined) cuesOffset = segmentDataOffset + seekHeadPositions[ELEMENTS.Cues];
  }

  onProgress?.('Reading Tracks...', 20);

  const parseTrackEntry = async (trackElement) => {
    const track = { trackNumber: 0, trackType: 0, codecId: '', name: '', language: 'und', languageIETF: null, codecPrivate: null, defaultDuration: 0 };
    let fieldOffset = trackElement.dataOffset;
    const fieldEnd = trackElement.endOffset;
    while (fieldOffset < fieldEnd) {
      const field = await parseElement(reader, fieldOffset);
      if (!field) break;
      if (field.id === ELEMENTS.TrackNumber) track.trackNumber = await readUint(reader, field.dataOffset, field.size);
      else if (field.id === ELEMENTS.TrackType) track.trackType = await readUint(reader, field.dataOffset, field.size);
      else if (field.id === ELEMENTS.CodecID) track.codecId = await reader.getString(field.dataOffset, field.size);
      else if (field.id === ELEMENTS.Name) track.name = await reader.getString(field.dataOffset, field.size);
      else if (field.id === ELEMENTS.Language) track.language = await reader.getString(field.dataOffset, field.size);
      else if (field.id === ELEMENTS.LanguageIETF) track.languageIETF = await reader.getString(field.dataOffset, field.size);
      else if (field.id === ELEMENTS.CodecPrivate) track.codecPrivate = await reader.getBytes(field.dataOffset, field.size);
      else if (field.id === ELEMENTS.DefaultDuration) track.defaultDuration = await readUint(reader, field.dataOffset, field.size);
      fieldOffset += field.elementLength;
    }
    if (track.trackType === TRACK_TYPE_SUBTITLE) {
      console.log('[MKV Parser] Subtitle track found:', {
        trackNumber: track.trackNumber,
        codecId: track.codecId,
        name: track.name,
        language: track.language,
        languageIETF: track.languageIETF
      });
      tracks.push(track);
      subtitleBlocks[track.trackNumber] = [];
    }
  };

  if (tracksOffset >= 0) {
    const tracksElement = await parseElement(reader, tracksOffset);
    if (tracksElement && tracksElement.id === ELEMENTS.Tracks) {
      let trackOffset = tracksElement.dataOffset;
      const trackEnd = tracksElement.endOffset;
      while (trackOffset < trackEnd) {
        const trackElement = await parseElement(reader, trackOffset);
        if (!trackElement) break;
        if (trackElement.id === ELEMENTS.TrackEntry) await parseTrackEntry(trackElement);
        trackOffset += trackElement.elementLength;
      }
    }
  } else {
    let segOffset = segmentDataOffset;
    while (segOffset < segmentEndOffset) {
      const element = await parseElement(reader, segOffset);
      if (!element) break;
      if (element.id === ELEMENTS.Tracks) {
        let trackOffset = element.dataOffset;
        const trackEnd = element.endOffset;
        while (trackOffset < trackEnd) {
          const trackElement = await parseElement(reader, trackOffset);
          if (!trackElement) break;
          if (trackElement.id === ELEMENTS.TrackEntry) await parseTrackEntry(trackElement);
          trackOffset += trackElement.elementLength;
        }
        break;
      }
      segOffset += element.elementLength;
    }
  }

  if (tracks.length === 0) {
    onProgress?.('No subtitle tracks found', 100);
    return [];
  }

  onProgress?.('Found ' + tracks.length + ' subtitle track(s), scanning clusters...', 25);

  let clusterCount = 0;

  if (cuesOffset >= 0) {
    const cuesElement = await parseElement(reader, cuesOffset);
    if (cuesElement && cuesElement.id === ELEMENTS.Cues) {
      let cueOffset = cuesElement.dataOffset;
      const cueEnd = cuesElement.endOffset;
      const clusterPositions = [];
      while (cueOffset < cueEnd) {
        const cuePoint = await parseElement(reader, cueOffset);
        if (!cuePoint) break;
        if (cuePoint.id === ELEMENTS.CuePoint) {
          let cpOffset = cuePoint.dataOffset;
          const cpEnd = cuePoint.endOffset;
          while (cpOffset < cpEnd) {
            const cpChild = await parseElement(reader, cpOffset);
            if (!cpChild) break;
            if (cpChild.id === ELEMENTS.CueTrackPositions) {
              let ctpOffset = cpChild.dataOffset;
              const ctpEnd = cpChild.endOffset;
              while (ctpOffset < ctpEnd) {
                const ctpChild = await parseElement(reader, ctpOffset);
                if (!ctpChild) break;
                if (ctpChild.id === ELEMENTS.CueClusterPosition) {
                  clusterPositions.push(segmentDataOffset + await readUint(reader, ctpChild.dataOffset, ctpChild.size));
                }
                ctpOffset += ctpChild.elementLength;
              }
            }
            cpOffset += cpChild.elementLength;
          }
        }
        cueOffset += cuePoint.elementLength;
      }

      for (let i = 0; i < clusterPositions.length; i++) {
        const pos = clusterPositions[i];
        const pct = 25 + Math.floor((i / clusterPositions.length) * 70);
        onProgress?.('Processing cluster ' + (i + 1) + '/' + clusterPositions.length + '...', pct);
        const element = await parseElement(reader, pos);
        if (!element || element.id !== ELEMENTS.Cluster) continue;
        let clusterTimecode = 0;
        let clusterOffset = element.dataOffset;
        const clusterEnd = element.endOffset > 0 ? element.endOffset : pos + element.elementLength;
        while (clusterOffset < clusterEnd) {
          const child = await parseElement(reader, clusterOffset);
          if (!child) break;
          if (child.id === ELEMENTS.Timecode) clusterTimecode = await readUint(reader, child.dataOffset, child.size);
          else if (child.id === ELEMENTS.SimpleBlock) {
            const block = await parseBlock(reader, child.dataOffset, child.size, clusterTimecode);
            if (subtitleBlocks[block.trackNumber]) subtitleBlocks[block.trackNumber].push({ ...block, duration: null });
          } else if (child.id === ELEMENTS.BlockGroup) {
            let bgOffset = child.dataOffset;
            const bgEnd = child.endOffset;
            let blockData = null, blockDuration = null;
            while (bgOffset < bgEnd) {
              const bgChild = await parseElement(reader, bgOffset);
              if (!bgChild) break;
              if (bgChild.id === ELEMENTS.Block) blockData = await parseBlock(reader, bgChild.dataOffset, bgChild.size, clusterTimecode);
              else if (bgChild.id === ELEMENTS.BlockDuration) blockDuration = await readUint(reader, bgChild.dataOffset, bgChild.size);
              bgOffset += bgChild.elementLength;
            }
            if (blockData && subtitleBlocks[blockData.trackNumber]) subtitleBlocks[blockData.trackNumber].push({ ...blockData, duration: blockDuration });
          }
          clusterOffset += child.elementLength;
        }
        clusterCount++;
      }
    }
  } else {
    let clusterIndex = 0;
    for await (const { offset: clusterOffset, element } of scanClusters(reader, segmentDataOffset, fileSize, (scanned, total) => {
      const pct = 25 + Math.floor((scanned / total) * 70);
      onProgress?.('Scanning file for clusters... (' + Math.floor((scanned / total) * 100) + '%)', pct);
    })) {
      clusterIndex++;
      const pct = 25 + Math.floor((clusterIndex / Math.max(clusterIndex, 10)) * 70);
      onProgress?.('Processing cluster ' + clusterIndex + '...', pct);
      let clusterTimecode = 0;
      let cOffset = element.dataOffset;
      const cEnd = element.endOffset > 0 ? element.endOffset : clusterOffset + element.elementLength;
      while (cOffset < cEnd) {
        const child = await parseElement(reader, cOffset);
        if (!child) break;
        if (child.id === ELEMENTS.Timecode) clusterTimecode = await readUint(reader, child.dataOffset, child.size);
        else if (child.id === ELEMENTS.SimpleBlock) {
          const block = await parseBlock(reader, child.dataOffset, child.size, clusterTimecode);
          if (subtitleBlocks[block.trackNumber]) subtitleBlocks[block.trackNumber].push({ ...block, duration: null });
        } else if (child.id === ELEMENTS.BlockGroup) {
          let bgOffset = child.dataOffset;
          const bgEnd = child.endOffset;
          let blockData = null, blockDuration = null;
          while (bgOffset < bgEnd) {
            const bgChild = await parseElement(reader, bgOffset);
            if (!bgChild) break;
            if (bgChild.id === ELEMENTS.Block) blockData = await parseBlock(reader, bgChild.dataOffset, bgChild.size, clusterTimecode);
            else if (bgChild.id === ELEMENTS.BlockDuration) blockDuration = await readUint(reader, bgChild.dataOffset, bgChild.size);
            bgOffset += bgChild.elementLength;
          }
          if (blockData && subtitleBlocks[blockData.trackNumber]) subtitleBlocks[blockData.trackNumber].push({ ...blockData, duration: blockDuration });
        }
        cOffset += child.elementLength;
      }
      clusterCount++;
    }
  }

  onProgress?.('Finalizing...', 95);

  for (const track of tracks) {
    track.blocks = subtitleBlocks[track.trackNumber] || [];
    track.blocks.sort((a, b) => a.absoluteTimecode - b.absoluteTimecode);
    track.timecodeScale = timecodeScale;
  }

  onProgress?.('Done! Extracted ' + tracks.reduce((s, t) => s + t.blocks.length, 0) + ' subtitle blocks', 100);
  return tracks;
}

export function convertToSubtitleFile(track) {
  const codecId = track.codecId;
  const blocks = track.blocks;
  const timecodeScale = track.timecodeScale || 1000000;
  const scaleMs = timecodeScale / 1000000;
  if (blocks.length === 0) return { content: '', extension: 'txt' };

  if (codecId === 'S_TEXT/UTF8') {
    let content = '', index = 1;
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const text = new TextDecoder().decode(block.data).replace(/\x00+$/,'').trim();
      if (!text) continue;
      const startMs = block.absoluteTimecode * scaleMs;
      let endMs;
      if (block.duration !== null && block.duration > 0) {
        endMs = startMs + (block.duration * scaleMs);
      } else if (i < blocks.length - 1) {
        endMs = blocks[i+1].absoluteTimecode * scaleMs;
      } else {
        endMs = startMs + 3000;
      }
      content += index + '\n' + formatSrtTime(startMs) + ' --> ' + formatSrtTime(endMs) + '\n' + text + '\n\n';
      index++;
    }
    return { content, extension: 'srt' };
  } else if (codecId === 'S_TEXT/SSA' || codecId === 'S_TEXT/ASS') {
    let content = '';
    if (track.codecPrivate) {
      content = new TextDecoder().decode(track.codecPrivate).replace(/\x00+$/,'');
      if (!content.endsWith('\n')) content += '\r\n';
    }
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const text = new TextDecoder().decode(block.data).replace(/\x00+$/,'').trim();
      if (!text) continue;
      const startMs = block.absoluteTimecode * scaleMs;
      let endMs;
      if (block.duration !== null && block.duration > 0) {
        endMs = startMs + (block.duration * scaleMs);
      } else if (i < blocks.length - 1) {
        endMs = blocks[i+1].absoluteTimecode * scaleMs;
      } else {
        endMs = startMs + 3000;
      }
      content += 'Dialogue: 0,' + formatAssTime(startMs) + ',' + formatAssTime(endMs) + ',Default,,0,0,0,,' + text + '\r\n';
    }
    return { content, extension: codecId === 'S_TEXT/SSA' ? 'ssa' : 'ass' };
  } else if (codecId === 'S_TEXT/USF') {
    let content = track.codecPrivate ? new TextDecoder().decode(track.codecPrivate).replace(/\x00+$/,'') : '';
    for (const block of blocks) content += new TextDecoder().decode(block.data).replace(/\x00+$/,'');
    return { content, extension: 'usf' };
  } else if (codecId === 'S_VOBSUB') {
    const totalSize = blocks.reduce((sum, b) => sum + b.data.length, 0);
    const merged = new Uint8Array(totalSize);
    let pos = 0;
    for (const block of blocks) { merged.set(block.data, pos); pos += block.data.length; }
    return { content: merged, extension: 'sub', binary: true };
  } else if (codecId === 'S_TEXT/WEBVTT') {
    let content = track.codecPrivate ? new TextDecoder().decode(track.codecPrivate).replace(/\x00+$/,'') : 'WEBVTT\n\n';
    if (!content.trimStart().startsWith('WEBVTT')) content = 'WEBVTT\n\n' + content;
    for (const block of blocks) {
      const text = new TextDecoder().decode(block.data).replace(/\x00+$/,'');
      content += text + '\n\n';
    }
    return { content, extension: 'vtt' };
  } else if (codecId === 'S_HDMV/PGS') {
    const totalSize = blocks.reduce((sum, b) => sum + b.data.length, 0);
    const merged = new Uint8Array(totalSize);
    let pos = 0;
    for (const block of blocks) { merged.set(block.data, pos); pos += block.data.length; }
    return { content: merged, extension: 'sup', binary: true };
  } else {
    let content = track.codecPrivate ? new TextDecoder().decode(track.codecPrivate).replace(/\x00+$/,'') : '';
    for (const block of blocks) {
      content += new TextDecoder().decode(block.data).replace(/\x00+$/,'');
    }
    return { content, extension: 'txt' };
  }
}
