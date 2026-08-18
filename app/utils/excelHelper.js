// app/utils/excelHelper.js - 엑셀 파일 파싱 및 하이퍼링크 추출 유틸리티 (강화 버전 v2)

window.ExcelHelper = {
  /**
   * 문자열 앞뒤의 따옴표(', "), 공백, 비가시 유니코드 문자를 제거
   * (엑셀에서 텍스트 서식 강제로 들어가는 싱글 쿼트 `'https://...` 등의 부호 완전 제거)
   */
  cleanString(str) {
    if (str === undefined || str === null) return '';
    let s = String(str).trim();
    // 앞뒤 따옴표(' " ` ‘ ’ “ ”), non-breaking space(\u00A0), BOM(\uFEFF) 제거
    s = s.replace(/^['"`\u2018\u2019\u201C\u201D\u00A0\uFEFF\s]+/, '');
    s = s.replace(/['"`\u2018\u2019\u201C\u201D\u00A0\uFEFF\s]+$/, '');
    return s.trim();
  },

  /**
   * 엑셀 파일을 읽어서 API 정보 배열로 파싱
   * @param {File} file 
   * @returns {Promise<{success: boolean, rows: Array, error?: string}>}
   */
  parseExcelFile(file) {
    return new Promise((resolve) => {
      if (!window.XLSX) {
        resolve({ success: false, rows: [], error: 'SheetJS(XLSX) 라이브러리가 로드되지 않았습니다.' });
        return;
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          // cellStyles, cellFormulas, cellHTML 옵션을 지정하여 하이퍼링크(cell.l) 및 수식 정보 보존
          const workbook = XLSX.read(data, {
            type: 'array',
            cellStyles: true,
            cellFormulas: true,
            cellDates: true,
            cellHTML: true
          });

          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            resolve({ success: false, rows: [], error: '엑셀 파일 내에 시트가 존재하지 않습니다.' });
            return;
          }

          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          if (!worksheet['!ref']) {
            resolve({ success: false, rows: [], error: '시트에 데이터가 없습니다.' });
            return;
          }

          const range = XLSX.utils.decode_range(worksheet['!ref']);
          
          let titleCol = -1;
          let serviceUrlCol = -1;
          let docsUrlCol = -1;
          let categoryCol = -1;

          let headerRowIndex = -1;
          const maxHeaderScan = Math.min(range.s.r + 5, range.e.r);

          // 1. 스마트 헤더 탐색 (상위 5개 행 내에서 컬럼 위치 감지)
          for (let r = range.s.r; r <= maxHeaderScan; r++) {
            let tempTitle = -1;
            let tempService = -1;
            let tempDocs = -1;
            let tempCat = -1;

            for (let c = range.s.c; c <= range.e.c; c++) {
              const cellKey = XLSX.utils.encode_cell({ r, c });
              const cell = worksheet[cellKey];
              const rawVal = this.getCleanCellValue(cell).text;
              if (!rawVal) continue;

              const norm = rawVal.replace(/[\s\u00A0\uFEFF\r\n\t]+/g, '').toLowerCase();

              // (1) 사용법 사이트 URL (Docs URL) - 서비스 URL보다 먼저 검사하여 오매칭 방지
              if (/(사용법|문서|가이드|docs|documentation)/.test(norm)) {
                if (tempDocs === -1) tempDocs = c;
              }
              // (2) API 이름 (Title)
              else if (/(api이름|api명|서비스이름|서비스명|이름|제목|title|name)/.test(norm)) {
                if (tempTitle === -1) tempTitle = c;
              }
              // (3) API 서비스 URL (Service URL)
              else if (/(api서비스url|서비스url|apiurl|서비스주소|api주소|serviceurl|endpoint|servicelink)/.test(norm)) {
                if (tempService === -1) tempService = c;
              }
              // (4) 카테고리 (Category)
              else if (/(카테고리|분류|category)/.test(norm)) {
                if (tempCat === -1) tempCat = c;
              }
              // (5) 단순 "url", "link", "주소" 인 경우
              else if (norm === 'url' || norm === 'link' || norm === '주소' || norm.includes('url')) {
                if (tempService === -1 && tempDocs !== c) tempService = c;
              }
            }

            if (tempTitle !== -1 || tempService !== -1 || tempDocs !== -1 || tempCat !== -1) {
              headerRowIndex = r;
              titleCol = tempTitle;
              serviceUrlCol = tempService;
              docsUrlCol = tempDocs;
              categoryCol = tempCat;
              break;
            }
          }

          // 기본 컬럼 인덱스 폴백 (A=0: 이름, B=1: 서비스 URL, C=2: 사용법 URL, D=3: 카테고리)
          if (titleCol === -1) titleCol = 0;
          if (serviceUrlCol === -1) serviceUrlCol = 1;
          if (docsUrlCol === -1) docsUrlCol = 2;
          if (categoryCol === -1) categoryCol = 3;

          let startRow = (headerRowIndex !== -1) ? headerRowIndex + 1 : range.s.r;

          const parsedRows = [];

          for (let r = startRow; r <= range.e.r; r++) {
            const titleCell = worksheet[XLSX.utils.encode_cell({ r, c: titleCol })];
            const serviceUrlCell = worksheet[XLSX.utils.encode_cell({ r, c: serviceUrlCol })];
            const docsUrlCell = worksheet[XLSX.utils.encode_cell({ r, c: docsUrlCol })];
            const categoryCell = worksheet[XLSX.utils.encode_cell({ r, c: categoryCol })];

            const titleInfo = this.getCleanCellValue(titleCell);
            const serviceUrlInfo = this.getCleanCellValue(serviceUrlCell);
            const docsUrlInfo = this.getCleanCellValue(docsUrlCell);
            const categoryInfo = this.getCleanCellValue(categoryCell);

            // API 서비스 URL 추출 및 따옴표 제거 정리
            let rawServiceUrl = serviceUrlInfo.url || serviceUrlInfo.text;
            rawServiceUrl = this.cleanString(rawServiceUrl);

            let serviceUrl = rawServiceUrl;

            // 프로토콜(http:// 또는 https://) 누락 시 보정 (예: "24pullrequests.com/api" or "agify.io")
            if (serviceUrl && !/^(https?:\/\/|mailto:|\/)/i.test(serviceUrl)) {
              if (serviceUrl.includes('.') || serviceUrl.includes('/')) {
                serviceUrl = 'https://' + serviceUrl;
              }
            }

            // 사용법 사이트 URL 보정
            let rawDocsUrl = docsUrlInfo.url || docsUrlInfo.text;
            rawDocsUrl = this.cleanString(rawDocsUrl);
            let docsUrl = rawDocsUrl;
            if (docsUrl && !/^(https?:\/\/|mailto:|\/)/i.test(docsUrl)) {
              if (docsUrl.includes('.') || docsUrl.includes('/')) {
                docsUrl = 'https://' + docsUrl;
              }
            }

            // API 이름 보정: 셀 텍스트 우선 사용
            let title = titleInfo.text;
            if (!title && serviceUrlInfo.text && !/^(https?:\/\/)/i.test(serviceUrlInfo.text)) {
              title = serviceUrlInfo.text;
            }
            if (!title && serviceUrl) {
              try {
                title = new URL(serviceUrl).hostname;
              } catch (err) {
                title = serviceUrl;
              }
            }

            const category = categoryInfo.text || '기타';

            if (title || serviceUrl || docsUrl) {
              parsedRows.push({
                rowIndex: r + 1,
                title: title,
                serviceUrl: serviceUrl,
                serviceUrlDisplay: serviceUrlInfo.text || serviceUrl,
                isServiceUrlHyperlink: !!serviceUrlInfo.url,
                docsUrl: docsUrl,
                docsUrlDisplay: docsUrlInfo.text || docsUrl,
                isDocsUrlHyperlink: !!docsUrlInfo.url,
                category: category
              });
            }
          }

          resolve({
            success: true,
            rows: parsedRows,
            detectedCols: { titleCol, serviceUrlCol, docsUrlCol, categoryCol, headerRowIndex }
          });
        } catch (err) {
          console.error('[ExcelHelper] 파싱 에러:', err);
          resolve({ success: false, rows: [], error: '엑셀 파싱 중 오류가 발생했습니다: ' + err.message });
        }
      };

      reader.onerror = () => {
        resolve({ success: false, rows: [], error: '파일을 읽는 중 오류가 발생했습니다.' });
      };

      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * 셀 객체에서 텍스트 및 하이퍼링크 Target URL 분리 추출 (따옴표 제거 및 정제)
   * @param {object} cell 
   * @returns {{text: string, url: string}}
   */
  getCleanCellValue(cell) {
    if (!cell) return { text: '', url: '' };

    let text = '';
    if (cell.w !== undefined && cell.w !== null) {
      text = this.cleanString(cell.w);
    } else if (cell.v !== undefined && cell.v !== null) {
      text = this.cleanString(cell.v);
    }

    let url = '';

    // 1. SheetJS 셀 하이퍼링크 객체 (cell.l)
    if (cell.l) {
      if (typeof cell.l === 'string') {
        url = this.cleanString(cell.l);
      } else if (cell.l.Target) {
        url = this.cleanString(cell.l.Target);
      }
    }

    // 2. 엑셀 수식 =HYPERLINK("https://...", "표시텍스트") 추출
    if (!url && cell.f && typeof cell.f === 'string') {
      const match = cell.f.match(/HYPERLINK\s*\(\s*["']([^"']+)["']/i);
      if (match && match[1]) {
        url = this.cleanString(match[1]);
      }
    }

    // 3. HTML 태그 내 href="https://..." 추출 (cell.h)
    if (!url && cell.h && typeof cell.h === 'string') {
      const match = cell.h.match(/href=["']([^"']+)["']/i);
      if (match && match[1]) {
        url = this.cleanString(match[1]);
      }
    }

    // 4. 셀 텍스트 자체에서 URL 추출 (http://, https://, www., 또는 도메인 형태)
    if (!url && text) {
      const cleaned = this.cleanString(text);
      if (/^(https?:\/\/|www\.)/i.test(cleaned)) {
        url = cleaned.startsWith('www.') ? `http://${cleaned}` : cleaned;
      }
    }

    return { text, url };
  },

  /**
   * 샘플 엑셀 파일 생성 및 다운로드 (하이퍼링크 테스트 데이터 포함)
   */
  downloadSampleTemplate() {
    if (!window.XLSX) {
      alert('SheetJS(XLSX) 라이브러리가 필요합니다.');
      return;
    }

    const wb = XLSX.utils.book_new();

    // 샘플 데이터 헤더 및 행
    const sampleData = [
      ['API 이름', 'API 서비스 URL', '사용법 사이트 URL', '카테고리'],
      ['12월 동안', '24 Pull Requests', '', '개발'],
      ['이름에서', 'Agify.io', '', '개발'],
      ['카카오 맵 API', 'https://api.kakao.com', 'https://developers.kakao.com/docs', '지도']
    ];

    const ws = XLSX.utils.aoa_to_sheet(sampleData);

    // B2 셀 ("24 Pull Requests" display text with hyperlink)
    ws['B2'] = {
      t: 's',
      v: '24 Pull Requests',
      l: { Target: 'https://24pullrequests.com', Tooltip: 'https://24pullrequests.com' }
    };

    // B3 셀 ("Agify.io" display text with hyperlink)
    ws['B3'] = {
      t: 's',
      v: 'Agify.io',
      l: { Target: 'https://agify.io', Tooltip: 'https://agify.io' }
    };

    XLSX.utils.book_append_sheet(wb, ws, 'API_일괄등록_샘플');
    XLSX.writeFile(wb, 'PORTAL_BANG_API_일괄등록_샘플.xlsx');
  }
};
