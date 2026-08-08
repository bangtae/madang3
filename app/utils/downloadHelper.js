// app/utils/downloadHelper.js - API 정보 카테고리별 다운로드 유틸리티

window.DownloadHelper = {
  /**
   * API 목록을 JSON 파일로 다운로드
   * @param {Array} apis - API 데이터 배열
   * @param {string} selectedCategory - 선택된 카테고리 ('ALL' 또는 특정 카테고리명)
   */
  downloadJson(apis, selectedCategory = 'ALL') {
    const isAll = selectedCategory === 'ALL';
    const targetApis = isAll ? apis : apis.filter(item => item.category === selectedCategory);

    if (targetApis.length === 0) {
      return { success: false, message: '⚠️ 다운로드할 API 정보가 없습니다.' };
    }

    let exportData;
    if (isAll) {
      // 전체 카테고리: 카테고리별로 그룹화하여 생성
      const grouped = {};
      targetApis.forEach(api => {
        const cat = api.category || '기타';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push({
          id: api.id,
          title: api.title,
          serviceUrl: api.serviceUrl,
          docsUrl: api.docsUrl,
          createdAt: api.createdAt
        });
      });

      exportData = {
        title: 'PORTAL BANG - API Information Export',
        downloadedAt: new Date().toISOString(),
        filterCategory: '전체 카테고리',
        totalCount: targetApis.length,
        categoryCount: Object.keys(grouped).length,
        categories: grouped
      };
    } else {
      // 특정 카테고리
      exportData = {
        title: 'PORTAL BANG - API Information Export',
        downloadedAt: new Date().toISOString(),
        filterCategory: selectedCategory,
        totalCount: targetApis.length,
        apis: targetApis.map(api => ({
          id: api.id,
          title: api.title,
          category: api.category,
          serviceUrl: api.serviceUrl,
          docsUrl: api.docsUrl,
          createdAt: api.createdAt
        }))
      };
    }

    const jsonStr = JSON.stringify(exportData, null, 2);
    const fileName = this.generateFileName(selectedCategory, 'json');
    this.triggerDownload(jsonStr, fileName, 'application/json;charset=utf-8');

    return { success: true, count: targetApis.length, category: isAll ? '전체 카테고리' : selectedCategory };
  },

  /**
   * API 목록을 CSV(엑셀 호환 UTF-8 BOM 포함) 파일로 다운로드
   * @param {Array} apis - API 데이터 배열
   * @param {string} selectedCategory - 선택된 카테고리 ('ALL' 또는 특정 카테고리명)
   */
  downloadCsv(apis, selectedCategory = 'ALL') {
    const isAll = selectedCategory === 'ALL';
    const targetApis = isAll ? apis : apis.filter(item => item.category === selectedCategory);

    if (targetApis.length === 0) {
      return { success: false, message: '⚠️ 다운로드할 API 정보가 없습니다.' };
    }

    // CSV 헤더 정의
    const headers = ['카테고리', 'API 이름', '서비스 URL', '사용법 URL', '등록일시'];
    const csvRows = [];

    // 헤더 행 추가 (CSV 이스케이프 처리)
    csvRows.push(headers.map(h => this.escapeCsvValue(h)).join(','));

    // 데이터 행 추가
    targetApis.forEach(api => {
      const row = [
        api.category || '기타',
        api.title || '',
        api.serviceUrl || '',
        api.docsUrl || '',
        api.createdAt ? new Date(api.createdAt).toLocaleString('ko-KR') : ''
      ];
      csvRows.push(row.map(v => this.escapeCsvValue(v)).join(','));
    });

    // 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM(\uFEFF) 추가
    const csvString = '\uFEFF' + csvRows.join('\r\n');
    const fileName = this.generateFileName(selectedCategory, 'csv');
    this.triggerDownload(csvString, fileName, 'text/csv;charset=utf-8');

    return { success: true, count: targetApis.length, category: isAll ? '전체 카테고리' : selectedCategory };
  },

  /**
   * CSV 필드값 이스케이프 처리 (큰따옴표, 쉼표, 줄바꿈 대응)
   */
  escapeCsvValue(val) {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  },

  /**
   * 저장 파일명 생성
   */
  generateFileName(category, extension) {
    const safeCategory = category === 'ALL' ? '전체' : category.replace(/[\/\\?%*:|"<>]/g, '_').trim();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `api_list_${safeCategory}_${dateStr}.${extension}`;
  },

  /**
   * 브라우저 파일 다운로드 실행
   */
  triggerDownload(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
};
