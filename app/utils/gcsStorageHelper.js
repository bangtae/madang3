// app/utils/gcsStorageHelper.js - GCP Cloud Storage 영구 스토리지 연동 헬퍼
const fs = require('fs');
const path = require('path');

const BUCKET_NAME = process.env.GCS_BUCKET || 'madang2-trans.appspot.com';
const GCS_PLANET_FILE = 'planet_world.json';

let storageClient = null;
let bucket = null;
let isGcsReady = false;

// Dynamic require to prevent crash in environments where @google-cloud/storage is not installed
try {
  const { Storage } = require('@google-cloud/storage');
  storageClient = new Storage();
  bucket = storageClient.bucket(BUCKET_NAME);
  isGcsReady = true;
  console.log(`[GCS] Cloud Storage client initialized for bucket: ${BUCKET_NAME}`);
} catch (e) {
  console.warn('[GCS] @google-cloud/storage not available, fallback to local disk:', e.message);
  isGcsReady = false;
}

const GcsStorageHelper = {
  isAvailable() {
    return isGcsReady && !!bucket;
  },

  /**
   * 서버 시작 시 GCS 버킷에서 planet_world.json을 동기화하여 로컬 디스크에 저장
   */
  async syncFromGcs(localFilePath) {
    if (!this.isAvailable()) {
      console.log('[GCS] Sync skipped: GCS not configured, using local file.');
      return null;
    }

    try {
      const file = bucket.file(GCS_PLANET_FILE);
      const [exists] = await file.exists();

      if (exists) {
        const [contents] = await file.download();
        const jsonStr = contents.toString('utf8');
        // Validate JSON before writing
        const parsed = JSON.parse(jsonStr);
        fs.writeFileSync(localFilePath, JSON.stringify(parsed, null, 2), 'utf8');
        console.log(`[GCS] Successfully synced planet_world.json from GCS (${parsed.buildings?.length || 0} buildings, ${parsed.characters?.length || 0} characters)`);
        return parsed;
      } else {
        // GCS에 없으면 로컬 파일 내용을 최초 업로드
        if (fs.existsSync(localFilePath)) {
          console.log('[GCS] planet_world.json not found in GCS. Uploading local initial file...');
          await file.save(fs.readFileSync(localFilePath), {
            contentType: 'application/json',
            resumable: false
          });
          console.log('[GCS] Initial planet_world.json uploaded to GCS successfully.');
        }
      }
    } catch (err) {
      console.error('[GCS] syncFromGcs error (falling back to local file):', err.message);
    }
    return null;
  },

  /**
   * 행성 데이터 변경 시(업로드/철거) GCS 버킷에 영구 저장
   */
  async saveToGcs(data) {
    if (!this.isAvailable()) return false;

    try {
      const file = bucket.file(GCS_PLANET_FILE);
      const jsonStr = JSON.stringify(data, null, 2);
      await file.save(Buffer.from(jsonStr, 'utf8'), {
        contentType: 'application/json',
        resumable: false,
        metadata: {
          cacheControl: 'no-cache, max-age=0'
        }
      });
      console.log(`[GCS] Successfully saved planet_world.json to gs://${BUCKET_NAME}/${GCS_PLANET_FILE}`);
      return true;
    } catch (err) {
      console.error('[GCS] saveToGcs error:', err.message);
      return false;
    }
  },

  /**
   * 업로드된 이미지 파일(Base64)을 GCS에 영구 저장
   */
  async saveImageToGcs(fileName, buffer, contentType = 'image/png') {
    if (!this.isAvailable()) return null;

    try {
      const gcsPath = `uploads/planet/${fileName}`;
      const file = bucket.file(gcsPath);
      await file.save(buffer, {
        contentType: contentType,
        resumable: false,
        metadata: {
          cacheControl: 'public, max-age=31536000'
        }
      });
      console.log(`[GCS] Uploaded image to gs://${BUCKET_NAME}/${gcsPath}`);
      return `https://storage.googleapis.com/${BUCKET_NAME}/${gcsPath}`;
    } catch (err) {
      console.error('[GCS] saveImageToGcs error:', err.message);
      return null;
    }
  },

  /**
   * GCS 버킷에서 행성 이미지 스트리밍 서빙 및 로컬 디스크 캐싱
   */
  async streamPlanetImage(fileName, res, localCachePath) {
    if (!this.isAvailable()) return false;
    try {
      const gcsPath = `uploads/planet/${fileName}`;
      const file = bucket.file(gcsPath);
      const [exists] = await file.exists();
      if (!exists) return false;

      const [metadata] = await file.getMetadata().catch(() => [{}]);
      const contentType = metadata.contentType || 'image/png';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');

      // 로컬 디렉터리가 있으면 백그라운드로 캐시 저장
      if (localCachePath) {
        try {
          const dir = path.dirname(localCachePath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          const writeStream = fs.createWriteStream(localCachePath);
          file.createReadStream().pipe(writeStream);
        } catch (cacheErr) {
          console.warn('[GCS] Local cache write error:', cacheErr.message);
        }
      }

      file.createReadStream().pipe(res);
      return true;
    } catch (err) {
      console.error('[GCS] streamPlanetImage error:', err.message);
      return false;
    }
  },

  /**
   * 주식 매매일지 (stockTradingJournal.json) GCS 영구 동기화
   */
  async syncTradingJournalFromGcs(localFilePath) {
    if (!this.isAvailable()) return null;
    const gcsFile = 'stockTradingJournal.json';
    try {
      const file = bucket.file(gcsFile);
      const [exists] = await file.exists();

      let localData = null;
      if (fs.existsSync(localFilePath)) {
        try { localData = JSON.parse(fs.readFileSync(localFilePath, 'utf8')); } catch (e) {}
      }

      if (exists) {
        const [contents] = await file.download();
        const parsed = JSON.parse(contents.toString('utf8'));

        const localHistLen = Array.isArray(localData?.history) ? localData.history.length : 0;
        const gcsHistLen = Array.isArray(parsed?.history) ? parsed.history.length : 0;

        // 로컬에 복원된 이력이 더 많을 경우 로컬 데이터 우선 보존 및 GCS 동기화
        if (localHistLen > gcsHistLen) {
          console.log(`[GCS] Local trading journal has more history (${localHistLen} vs ${gcsHistLen}). Uploading local to GCS.`);
          await this.saveTradingJournalToGcs(localData);
          return localData;
        }

        fs.writeFileSync(localFilePath, JSON.stringify(parsed, null, 2), 'utf8');
        console.log(`[GCS] Successfully synced stockTradingJournal.json from GCS (${gcsHistLen} trades)`);
        return parsed;
      } else {
        if (localData) {
          await this.saveTradingJournalToGcs(localData);
          console.log('[GCS] Initial stockTradingJournal.json uploaded to GCS.');
        }
      }
    } catch (err) {
      console.error('[GCS] syncTradingJournalFromGcs error:', err.message);
    }
    return null;
  },

  async saveTradingJournalToGcs(data) {
    if (!this.isAvailable() || !data) return false;
    try {
      const file = bucket.file('stockTradingJournal.json');
      const jsonStr = JSON.stringify(data, null, 2);
      await file.save(Buffer.from(jsonStr, 'utf8'), {
        contentType: 'application/json',
        resumable: false,
        metadata: { cacheControl: 'no-cache, max-age=0' }
      });
      console.log(`[GCS] Saved stockTradingJournal.json to gs://${BUCKET_NAME}/stockTradingJournal.json`);
      return true;
    } catch (err) {
      console.error('[GCS] saveTradingJournalToGcs error:', err.message);
      return false;
    }
  },

  /**
   * 스캘핑 엔진 상태 (scalpingStatus.json) GCS 영구 동기화
   */
  async syncScalpingStatusFromGcs(localFilePath) {
    if (!this.isAvailable()) return null;
    const gcsFile = 'scalpingStatus.json';
    try {
      const file = bucket.file(gcsFile);
      const [exists] = await file.exists();

      let localData = null;
      if (fs.existsSync(localFilePath)) {
        try { localData = JSON.parse(fs.readFileSync(localFilePath, 'utf8')); } catch (e) {}
      }

      if (exists) {
        const [contents] = await file.download();
        const parsed = JSON.parse(contents.toString('utf8'));

        const localHistLen = Array.isArray(localData?.history) ? localData.history.length : 0;
        const gcsHistLen = Array.isArray(parsed?.history) ? parsed.history.length : 0;

        if (localHistLen > gcsHistLen) {
          console.log(`[GCS] Local scalping status has more history (${localHistLen} vs ${gcsHistLen}). Uploading local to GCS.`);
          await this.saveScalpingStatusToGcs(localData);
          return localData;
        }

        fs.writeFileSync(localFilePath, JSON.stringify(parsed, null, 2), 'utf8');
        console.log(`[GCS] Successfully synced scalpingStatus.json from GCS (${gcsHistLen} trades)`);
        return parsed;
      } else {
        if (localData) {
          await this.saveScalpingStatusToGcs(localData);
          console.log('[GCS] Initial scalpingStatus.json uploaded to GCS.');
        }
      }
    } catch (err) {
      console.error('[GCS] syncScalpingStatusFromGcs error:', err.message);
    }
    return null;
  },

  async saveScalpingStatusToGcs(data) {
    if (!this.isAvailable() || !data) return false;
    try {
      const file = bucket.file('scalpingStatus.json');
      const jsonStr = JSON.stringify(data, null, 2);
      await file.save(Buffer.from(jsonStr, 'utf8'), {
        contentType: 'application/json',
        resumable: false,
        metadata: { cacheControl: 'no-cache, max-age=0' }
      });
      console.log(`[GCS] Saved scalpingStatus.json to gs://${BUCKET_NAME}/scalpingStatus.json`);
      return true;
    } catch (err) {
      console.error('[GCS] saveScalpingStatusToGcs error:', err.message);
      return false;
    }
  },

  /**
   * AI 끝장 토론 기록 (stockDebateLogs.json) GCS 영구 동기화
   */
  async syncDebateLogsFromGcs(localFilePath) {
    if (!this.isAvailable()) return null;
    const gcsFile = 'stockDebateLogs.json';
    try {
      const file = bucket.file(gcsFile);
      const [exists] = await file.exists();

      let localData = [];
      if (fs.existsSync(localFilePath)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(localFilePath, 'utf8'));
          if (Array.isArray(parsed)) localData = parsed;
        } catch (e) {}
      }

      if (exists) {
        const [contents] = await file.download();
        const gcsData = JSON.parse(contents.toString('utf8'));
        if (!Array.isArray(gcsData)) return localData;

        // 양측 데이터를 ID 기준으로 병합 (더 최신 timestamp / updated_at 우선)
        const itemMap = new Map();
        for (const item of gcsData) {
          const key = item.id || item.item_code;
          if (key) itemMap.set(key, item);
        }
        for (const item of localData) {
          const key = item.id || item.item_code;
          if (key) {
            const existing = itemMap.get(key);
            if (!existing) {
              itemMap.set(key, item);
            } else {
              const tLocal = item.updated_at || item.timestamp || '';
              const tGcs = existing.updated_at || existing.timestamp || '';
              if (tLocal >= tGcs) {
                itemMap.set(key, item);
              }
            }
          }
        }

        const merged = Array.from(itemMap.values());
        merged.sort((a, b) => {
          const tA = a.updated_at || a.timestamp || '';
          const tB = b.updated_at || b.timestamp || '';
          return tB.localeCompare(tA);
        });

        fs.writeFileSync(localFilePath, JSON.stringify(merged, null, 2), 'utf8');
        console.log(`[GCS] Successfully synced stockDebateLogs.json from GCS (merged ${merged.length} debates)`);

        // GCS보다 병합된 데이터가 더 최신이거나 많으면 GCS 업데이트
        if (merged.length > gcsData.length || localData.length > 0) {
          await this.saveDebateLogsToGcs(merged);
        }
        return merged;
      } else {
        if (localData && localData.length > 0) {
          await this.saveDebateLogsToGcs(localData);
          console.log('[GCS] Initial stockDebateLogs.json uploaded to GCS.');
        }
        return localData;
      }
    } catch (err) {
      console.error('[GCS] syncDebateLogsFromGcs error:', err.message);
    }
    return null;
  },

  async saveDebateLogsToGcs(data) {
    if (!this.isAvailable() || !data) return false;
    try {
      const file = bucket.file('stockDebateLogs.json');
      const jsonStr = JSON.stringify(data, null, 2);
      await file.save(Buffer.from(jsonStr, 'utf8'), {
        contentType: 'application/json',
        resumable: false,
        metadata: { cacheControl: 'no-cache, max-age=0' }
      });
      console.log(`[GCS] Saved stockDebateLogs.json to gs://${BUCKET_NAME}/stockDebateLogs.json`);
      return true;
    } catch (err) {
      console.error('[GCS] saveDebateLogsToGcs error:', err.message);
      return false;
    }
  },

  /**
   * AI 심의위원회 리포트 (stockCouncilReports.json) GCS 영구 동기화
   */
  async syncCouncilReportsFromGcs(localFilePath) {
    if (!this.isAvailable()) return null;
    const gcsFile = 'stockCouncilReports.json';
    try {
      const file = bucket.file(gcsFile);
      const [exists] = await file.exists();

      let localData = [];
      if (fs.existsSync(localFilePath)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(localFilePath, 'utf8'));
          if (Array.isArray(parsed)) localData = parsed;
        } catch (e) {}
      }

      if (exists) {
        const [contents] = await file.download();
        const gcsData = JSON.parse(contents.toString('utf8'));
        if (!Array.isArray(gcsData)) return localData;

        const reportMap = new Map();
        for (const item of gcsData) {
          const key = item.id || `${item.item_code}_${item.created_at}`;
          reportMap.set(key, item);
        }
        for (const item of localData) {
          const key = item.id || `${item.item_code}_${item.created_at}`;
          reportMap.set(key, item);
        }
        const merged = Array.from(reportMap.values());
        merged.sort((a, b) => {
          const tA = a.created_at || a.timestamp || '';
          const tB = b.created_at || b.timestamp || '';
          return tB.localeCompare(tA);
        });

        fs.writeFileSync(localFilePath, JSON.stringify(merged, null, 2), 'utf8');
        console.log(`[GCS] Successfully synced stockCouncilReports.json from GCS (${merged.length} reports)`);
        if (merged.length > gcsData.length) {
          await this.saveCouncilReportsToGcs(merged);
        }
        return merged;
      } else {
        if (localData && localData.length > 0) {
          await this.saveCouncilReportsToGcs(localData);
          console.log('[GCS] Initial stockCouncilReports.json uploaded to GCS.');
        }
        return localData;
      }
    } catch (err) {
      console.error('[GCS] syncCouncilReportsFromGcs error:', err.message);
    }
    return null;
  },

  async saveCouncilReportsToGcs(data) {
    if (!this.isAvailable() || !data) return false;
    try {
      const file = bucket.file('stockCouncilReports.json');
      const jsonStr = JSON.stringify(data, null, 2);
      await file.save(Buffer.from(jsonStr, 'utf8'), {
        contentType: 'application/json',
        resumable: false,
        metadata: { cacheControl: 'no-cache, max-age=0' }
      });
      console.log(`[GCS] Saved stockCouncilReports.json to gs://${BUCKET_NAME}/stockCouncilReports.json`);
      return true;
    } catch (err) {
      console.error('[GCS] saveCouncilReportsToGcs error:', err.message);
      return false;
    }
  }
};

module.exports = GcsStorageHelper;
