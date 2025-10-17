// API 베이스 URL
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000' 
    : 'http://192.168.219.2:8000';

// 전역 상태
let allRegions = [];
let currentRegion = null;
let networkData = null;
let allSido = [];
let expandedSidos = new Set();
let expandedSigungus = new Set();
let availableYears = [];
let selectedYear = "2023"; // 항상 최신 연도 사용

// ============================================
// 초기화
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 InsightForge 시작...');
    console.log('📍 API_BASE:', API_BASE);
    
    try {
        // 사용 가능한 연도 로드 (최신 연도 자동 선택)
        const yearsResponse = await fetch(`${API_BASE}/api/years`);
        const yearsData = await yearsResponse.json();
        availableYears = yearsData.years || [];
        selectedYear = availableYears[availableYears.length - 1] || "2023";
        console.log(`✅ 최신 연도: ${selectedYear}`);
        
        await loadNationalData();
    } catch (error) {
        console.error('❌ 초기화 실패:', error);
        document.getElementById('regionList').innerHTML = `
            <div class="text-center py-8 text-red-500">
                <p class="font-bold">로드 실패</p>
                <p class="text-sm mt-2">${error.message}</p>
                <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    새로고침
                </button>
            </div>
        `;
    }
});

// 연도 로드 함수 제거 (자동으로 최신 연도 사용)

// ============================================
// 전국 데이터 로드
// ============================================

async function loadNationalData() {
    try {
        console.log('📡 전국 데이터 요청 중...');
        const response = await fetch(`${API_BASE}/api/national/sido`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📦 받은 데이터:', data);
        
        allSido = data.sido_list || [];
        
        if (allSido.length === 0) {
            throw new Error('시도 목록이 비어있습니다');
        }
        
        renderNationalList();
        console.log(`✅ ${allSido.length}개 시도 로드 완료`);
    } catch (error) {
        console.error('❌ 전국 데이터 로드 실패:', error);
        document.getElementById('regionList').innerHTML = `
            <div class="text-center py-8 text-red-500">
                <p class="font-bold">데이터를 불러올 수 없습니다</p>
                <p class="text-sm mt-2">${error.message}</p>
                <button onclick="loadNationalData()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    다시 시도
                </button>
            </div>
        `;
        throw error;
    }
}

async function loadRegions() {
    try {
        const response = await fetch(`${API_BASE}/api/regions`);
        const data = await response.json();
        
        allRegions = data.regions || [];
        
        renderRegionList(allRegions);
        console.log(`✅ ${allRegions.length}개 읍면동 로드 (${data.gu_count}개 구)`);
    } catch (error) {
        console.error('❌ 지역 데이터 로드 실패:', error);
    }
}

// ============================================
// 전국 시도 목록 렌더링
// ============================================

function renderNationalList() {
    const regionList = document.getElementById('regionList');
    
    if (!regionList) {
        console.error('❌ regionList 요소를 찾을 수 없습니다');
        return;
    }
    
    console.log(`🎨 ${allSido.length}개 시도 렌더링 중...`);
    
    let html = '<div class="space-y-2">';
    
    allSido.forEach(sido => {
        const isExpanded = expandedSidos.has(sido.code);
        const popText = sido.total_population ? `${sido.total_population.toLocaleString()}명` : '-';
        
        html += `
            <div>
                <div class="font-semibold text-gray-900 px-3 py-2 bg-blue-50 rounded cursor-pointer hover:bg-blue-100 border border-blue-200 flex items-center justify-between"
                     onclick='toggleSido("${sido.code}")'>
                    <div class="flex items-center gap-2">
                        <svg class="w-3 h-3 transform transition-transform ${isExpanded ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                        <span class="text-sm font-bold">${sido.name}</span>
                    </div>
                    <div class="flex items-center gap-3 text-xs">
                        <span class="text-gray-600">${sido.sigungu_count}개 시군구</span>
                        <span class="text-blue-600 font-semibold">${popText}</span>
                    </div>
                </div>
                ${isExpanded ? `<div id="sido-${sido.code}" class="ml-4 mt-1"></div>` : ''}
            </div>
        `;
    });
    
    html += '</div>';
    regionList.innerHTML = html;
    console.log('✅ 렌더링 완료');
}

async function toggleSido(sidoCode) {
    if (expandedSidos.has(sidoCode)) {
        expandedSidos.delete(sidoCode);
        renderNationalList();
    } else {
        expandedSidos.add(sidoCode);
        renderNationalList();
        await loadSigunguList(sidoCode);
    }
}

async function loadSigunguList(sidoCode) {
    try {
        const response = await fetch(`${API_BASE}/api/national/sido/${sidoCode}`);
        const data = await response.json();
        
        const container = document.getElementById(`sido-${sidoCode}`);
        if (!container) return;
        
        let html = '<div class="space-y-1">';
        
        data.sigungu_list.forEach(sigungu => {
            const isExpanded = expandedSigungus.has(sigungu.sigungu_code);
            const popText = sigungu.total_population ? `${sigungu.total_population.toLocaleString()}명` : '-';
            
            html += `
                <div class="ml-2">
                    <div class="px-2 py-1.5 bg-white rounded border border-gray-200 flex items-center justify-between text-sm">
                        <div class="flex items-center gap-2">
                            <svg class="w-2.5 h-2.5 transform transition-transform ${isExpanded ? 'rotate-90' : ''} cursor-pointer hover:text-blue-600" 
                                 fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                 onclick='toggleSigungu("${sigungu.sigungu_code}")'>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                            <span class="cursor-pointer hover:text-blue-600" onclick='selectSigungu("${sigungu.sigungu_code}")'>${sigungu.sigungu_name}</span>
                        </div>
                        <div class="flex items-center gap-2 text-xs">
                            <span class="text-gray-500">${sigungu.emdong_count}개</span>
                            <span class="text-green-600">${popText}</span>
                        </div>
                    </div>
                    ${isExpanded ? `<div id="sigungu-${sigungu.sigungu_code}" class="ml-3 mt-1"></div>` : ''}
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('❌ 시군구 로드 실패:', error);
    }
}

async function toggleSigungu(sigunguCode) {
    if (expandedSigungus.has(sigunguCode)) {
        expandedSigungus.delete(sigunguCode);
        // 부모 시도 다시 로드
        const sido = allSido.find(s => expandedSidos.has(s.code));
        if (sido) await loadSigunguList(sido.code);
    } else {
        expandedSigungus.add(sigunguCode);
        // 부모 시도 다시 로드
        const sido = allSido.find(s => expandedSidos.has(s.code));
        if (sido) await loadSigunguList(sido.code);
        await loadEmdongList(sigunguCode);
    }
}

async function selectSigungu(sigunguCode) {
    // 시군구 클릭 시 읍면동 목록 확장
    if (!expandedSigungus.has(sigunguCode)) {
        await toggleSigungu(sigunguCode);
    }
}

async function loadEmdongList(sigunguCode) {
    try {
        const response = await fetch(`${API_BASE}/api/national/sigungu/${sigunguCode}`);
        const data = await response.json();
        
        const container = document.getElementById(`sigungu-${sigunguCode}`);
        if (!container) return;
        
        let html = '<div class="space-y-0.5">';
        
        data.emdong_list.forEach(emdong => {
            const popText = emdong.population ? `${emdong.population.toLocaleString()}` : '-';
            
            html += `
                <div class="px-2 py-1 hover:bg-purple-50 rounded cursor-pointer border border-gray-100 text-xs transition-colors"
                     onclick='selectEmdong("${emdong.code}")'>
                    <div class="flex justify-between items-center">
                        <span class="text-gray-700">${emdong.name}</span>
                        <div class="flex items-center gap-2 text-xs">
                            <span class="text-gray-500">${popText}</span>
                            <span class="text-purple-600">${emdong.company_cnt}개</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('❌ 읍면동 로드 실패:', error);
    }
}

async function selectEmdong(emdongCode) {
    try {
        // 연령별 상세 데이터 먼저 로드 (정확한 인구 수치)
        const enhancedResponse = await fetch(`${API_BASE}/api/emdong/${emdongCode}/enhanced`);
        const enhancedData = await enhancedResponse.json();
        
        // 기본 데이터 조회
        const response = await fetch(`${API_BASE}/api/national/emdong/${emdongCode}?year=${selectedYear}`);
        const data = await response.json();
        
        // 연령별 데이터의 정확한 인구 수치로 덮어쓰기
        if (enhancedData.latest && enhancedData.latest.basic) {
            if (!data.household) data.household = {};
            // 정확한 인구로 교체
            data.household.family_member_cnt = enhancedData.latest.basic.total_population;
            // 가구수는 인구/평균가구원수로 계산 (더 정확)
            const avgSize = data.household.avg_family_member_cnt || 2.0;
            data.household.household_cnt = Math.round(enhancedData.latest.basic.total_population / avgSize);
        }
        
        currentRegion = data;
        
        // 정치인 정보 가져오기
        const politiciansResponse = await fetch(`${API_BASE}/api/politicians/emdong/${emdongCode}`);
        const politiciansData = await politiciansResponse.json();
        
        // 데이터 병합
        data.politicians = politiciansData.politicians || [];
        
        renderEmdongDetail(data);
        
        // 시계열 데이터도 가져오기 (있는 경우)
        loadTimeseriesData(emdongCode);
        
    } catch (error) {
        console.error('❌ 읍면동 상세 정보 로드 실패:', error);
    }
}

async function loadTimeseriesData(emdongCode) {
    try {
        // 연령별 상세 데이터 (정확한 인구 수치 포함)
        const enhancedResponse = await fetch(`${API_BASE}/api/emdong/${emdongCode}/enhanced`);
        const enhancedData = await enhancedResponse.json();
        
        if (enhancedData.timeseries) {
            // 연령별 상세 데이터로 시계열 차트 렌더링
            renderTimeseriesChart(enhancedData);
            renderEnhancedStats(enhancedData);
        }
    } catch (error) {
        console.log('시계열 데이터 없음 (정상)');
    }
}

function renderTimeseriesChart(data) {
    const chartDiv = document.getElementById('timeseriesChart');
    if (!chartDiv) return;
    
    const timeseries = data.timeseries || {};
    const years = data.years || [];
    
    if (years.length < 2) {
        chartDiv.innerHTML = '';
        return;
    }
    
    // 전역 저장 (상세 그래프용)
    window.currentTimeseriesData = data;
    
    // 미니 차트 렌더링
    renderMiniCharts(timeseries, years);
    
    // 데이터 추출 (연령별 상세 데이터 우선 사용)
    const populations = [];
    const households = [];
    const companies = [];
    
    years.forEach(year => {
        const yearData = timeseries[year] || {};
        // 연령별 상세 데이터가 있으면 우선 사용 (정확한 인구)
        if (yearData.basic && yearData.basic.total_population > 0) {
            const population = yearData.basic.total_population;
            populations.push(population);
            // 가구수 = 인구 / 평균가구원수
            const avgSize = yearData.household?.avg_family_member_cnt || 2.0;
            households.push(Math.round(population / avgSize));
        } else {
            populations.push(yearData.household?.family_member_cnt || 0);
            households.push(yearData.household?.household_cnt || 0);
        }
        companies.push(yearData.company?.corp_cnt || 0);
    });
    
    chartDiv.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div class="flex items-center justify-between mb-4">
                <h3 class="font-bold text-lg flex items-center">
                    <svg class="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                    시계열 변화 (${years[0]} ~ ${years[years.length-1]})
                </h3>
                <button onclick="showDetailedChart()" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center text-sm">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
                    </svg>
                    항목별 추이
                </button>
            </div>
            <div class="grid grid-cols-3 gap-6">
                <div>
                    <div class="text-sm text-gray-600 mb-3">인구 추이</div>
                    ${renderSparkline(populations, years, 'blue')}
                    <div class="text-xs text-gray-500 mt-2 flex justify-between">
                        <span>${years[0]}: ${populations[0].toLocaleString()}</span>
                        <span>${years[years.length-1]}: ${populations[populations.length-1].toLocaleString()}</span>
                    </div>
                </div>
                <div>
                    <div class="text-sm text-gray-600 mb-3">가구수 추이</div>
                    ${renderSparkline(households, years, 'green')}
                    <div class="text-xs text-gray-500 mt-2 flex justify-between">
                        <span>${years[0]}: ${households[0].toLocaleString()}</span>
                        <span>${years[years.length-1]}: ${households[households.length-1].toLocaleString()}</span>
                    </div>
                </div>
                <div>
                    <div class="text-sm text-gray-600 mb-3">사업체 추이</div>
                    ${renderSparkline(companies, years, 'orange')}
                    <div class="text-xs text-gray-500 mt-2 flex justify-between">
                        <span>${years[0]}: ${companies[0].toLocaleString()}</span>
                        <span>${years[years.length-1]}: ${companies[companies.length-1].toLocaleString()}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderSparkline(values, years, color) {
    if (!values || values.length === 0) return '<div class="text-gray-400 text-xs">데이터 없음</div>';
    
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    
    const points = values.map((v, i) => {
        const x = (i / (values.length - 1)) * 100;
        const y = 100 - ((v - min) / range * 100);
        return `${x},${y}`;
    }).join(' ');
    
    const colorMap = {
        'blue': '#3b82f6',
        'green': '#10b981',
        'orange': '#f97316'
    };
    
    return `
        <svg viewBox="0 0 100 30" class="w-full h-16 bg-gray-50 rounded">
            <polyline points="${points}" 
                fill="none" 
                stroke="${colorMap[color]}" 
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"/>
        </svg>
    `;
}

// ============================================
// 미니 차트 렌더링 (통계 카드용)
// ============================================

function renderMiniCharts(timeseries, years) {
    // 데이터 추출 (연령별 상세 데이터 우선)
    const populations = [];
    const households = [];
    const houses = [];
    const companies = [];
    
    years.forEach(year => {
        const yearData = timeseries[year] || {};
        // 연령별 상세 데이터가 있으면 우선 사용
        if (yearData.basic && yearData.basic.total_population > 0) {
            const population = yearData.basic.total_population;
            populations.push(population);
            // 가구수 = 인구 / 평균가구원수
            const avgSize = yearData.household?.avg_family_member_cnt || 2.0;
            households.push(Math.round(population / avgSize));
        } else {
            populations.push(yearData.household?.family_member_cnt || 0);
            households.push(yearData.household?.household_cnt || 0);
        }
        houses.push(yearData.house?.house_cnt || 0);
        companies.push(yearData.company?.corp_cnt || 0);
    });
    
    // DOM이 완전히 렌더링된 후 미니 차트 그리기
    setTimeout(() => {
        renderMiniChart('miniChart-population', populations, '#ffffff');
        renderMiniChart('miniChart-household', households, '#ffffff');
        renderMiniChart('miniChart-house', houses, '#ffffff');
        renderMiniChart('miniChart-company', companies, '#ffffff');
    }, 100);
}

function renderMiniChart(elementId, values, color) {
    const element = document.getElementById(elementId);
    if (!element || !values || values.length < 2) return;
    
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    
    // 점 좌표 생성
    const points = values.map((v, i) => {
        const x = (i / (values.length - 1)) * 100;
        const y = 30 - ((v - min) / range * 25); // 5px 여백
        return `${x},${y}`;
    }).join(' ');
    
    // 변화율 계산
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const changePercent = firstValue ? ((lastValue - firstValue) / firstValue * 100) : 0;
    const isPositive = changePercent >= 0;
    const arrow = isPositive ? '↗' : '↘';
    
    element.innerHTML = `
        <svg viewBox="0 0 100 30" class="w-full h-full">
            <polyline points="${points}" 
                fill="none" 
                stroke="${color}" 
                stroke-width="1.5"
                opacity="0.8"
                stroke-linecap="round"
                stroke-linejoin="round"/>
        </svg>
        <div class="text-xs opacity-90 mt-0.5 flex items-center justify-between">
            <span>${values[0].toLocaleString()}</span>
            <span class="font-semibold">${arrow} ${Math.abs(changePercent).toFixed(1)}%</span>
            <span>${values[values.length - 1].toLocaleString()}</span>
        </div>
    `;
}

// ============================================
// 연령별 상세 통계 렌더링
// ============================================

function renderEnhancedStats(data) {
    const latest = data.latest || {};
    const basic = latest.basic || {};
    const ageGroups = latest.age_groups || {};
    
    // 연령 통계 섹션을 정치인 섹션 뒤에 추가
    const detailView = document.getElementById('detailView');
    if (!detailView) return;
    
    // 기존 연령 통계 섹션 제거
    const existingAgeSection = document.getElementById('ageStatsSection');
    if (existingAgeSection) {
        existingAgeSection.remove();
    }
    
    // 새 섹션 생성
    const ageSection = document.createElement('div');
    ageSection.id = 'ageStatsSection';
    ageSection.className = 'max-w-5xl mb-6';
    
    ageSection.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 class="font-bold text-lg mb-4 flex items-center">
                <svg class="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
                연령 통계 (${selectedYear}년)
            </h3>
            
            <!-- 주요 지표 -->
            <div class="grid grid-cols-4 gap-4 mb-6">
                <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                    <div class="text-xs text-blue-600 mb-1">평균 연령</div>
                    <div class="text-2xl font-bold text-blue-900">${basic.avg_age || 0}<span class="text-sm">세</span></div>
                </div>
                <div class="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                    <div class="text-xs text-purple-600 mb-1">노령화지수</div>
                    <div class="text-2xl font-bold text-purple-900">${(basic.aging_index || 0).toFixed(1)}</div>
                </div>
                <div class="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                    <div class="text-xs text-orange-600 mb-1">노년부양비</div>
                    <div class="text-2xl font-bold text-orange-900">${(basic.oldage_support_ratio || 0).toFixed(1)}<span class="text-sm">%</span></div>
                </div>
                <div class="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                    <div class="text-xs text-green-600 mb-1">인구밀도</div>
                    <div class="text-2xl font-bold text-green-900">${(basic.population_density || 0).toLocaleString()}<span class="text-sm text-xs">명/km²</span></div>
                </div>
            </div>
            
            <!-- 연령대별 인구 -->
            ${renderAgeGroupChart(ageGroups)}
        </div>
    `;
    
    // 정치인 섹션 뒤에 삽입
    const politiciansSection = document.querySelector('#detailView .max-w-5xl');
    if (politiciansSection && politiciansSection.nextSibling) {
        politiciansSection.parentNode.insertBefore(ageSection, politiciansSection.nextSibling.nextSibling);
    } else {
        detailView.appendChild(ageSection);
    }
}

function renderAgeGroupChart(ageGroups) {
    if (!ageGroups || Object.keys(ageGroups).length === 0) {
        return '<div class="text-gray-400 text-sm">연령대 데이터 없음</div>';
    }
    
    const ageOrder = ["0-9세", "10-19세", "20-29세", "30-39세", "40-49세", "50-59세", "60-69세", "70-79세", "80세 이상"];
    const maxPop = Math.max(...ageOrder.map(age => (ageGroups[age]?.total || 0)));
    
    return `
        <div class="space-y-3">
            <h4 class="font-semibold text-sm text-gray-700 mb-3">연령대별 인구 분포</h4>
            ${ageOrder.map(age => {
                const data = ageGroups[age] || {male: 0, female: 0, total: 0};
                const malePercent = maxPop ? (data.male / maxPop * 100) : 0;
                const femalePercent = maxPop ? (data.female / maxPop * 100) : 0;
                
                return `
                    <div class="flex items-center gap-3">
                        <div class="w-20 text-xs text-gray-600 text-right">${age}</div>
                        <div class="flex-1 flex items-center gap-1">
                            <div class="flex-1 h-6 flex justify-end">
                                <div class="h-full bg-blue-500 rounded-l transition-all" 
                                     style="width: ${malePercent}%"
                                     title="남성: ${data.male.toLocaleString()}명"></div>
                            </div>
                            <div class="w-16 text-center text-xs font-semibold text-gray-700">
                                ${data.total.toLocaleString()}
                            </div>
                            <div class="flex-1 h-6 flex">
                                <div class="h-full bg-pink-500 rounded-r transition-all" 
                                     style="width: ${femalePercent}%"
                                     title="여성: ${data.female.toLocaleString()}명"></div>
                            </div>
                        </div>
                        <div class="w-32 text-xs text-gray-500 flex justify-between">
                            <span class="text-blue-600">♂ ${data.male.toLocaleString()}</span>
                            <span class="text-pink-600">♀ ${data.female.toLocaleString()}</span>
                        </div>
                    </div>
                `;
            }).join('')}
            <div class="mt-4 pt-4 border-t border-gray-200 flex justify-center gap-6 text-xs">
                <div class="flex items-center gap-2">
                    <div class="w-4 h-4 bg-blue-500 rounded"></div>
                    <span class="text-gray-600">남성</span>
                </div>
                <div class="flex items-center gap-2">
                    <div class="w-4 h-4 bg-pink-500 rounded"></div>
                    <span class="text-gray-600">여성</span>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// 정치인 섹션 렌더링
// ============================================

function renderPoliticiansSection(politicians) {
    if (!politicians || politicians.length === 0) {
        return '';
    }
    
    const partyColors = {
        '더불어민주당': 'bg-blue-100 text-blue-800 border-blue-300',
        '국민의힘': 'bg-red-100 text-red-800 border-red-300',
        '무소속': 'bg-gray-100 text-gray-800 border-gray-300',
        '진보당': 'bg-green-100 text-green-800 border-green-300',
        '기타': 'bg-purple-100 text-purple-800 border-purple-300'
    };
    
    const typeOrder = {
        '서울시장': 1,
        '구청장': 2,
        '국회의원': 3,
        '시의원': 4,
        '구의원': 5
    };
    
    return `
        <div class="bg-white p-6 rounded-lg shadow border border-gray-200 mb-6">
            <h3 class="font-bold text-lg mb-4 flex items-center">
                <svg class="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
                지역 정치인
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                ${politicians.map(p => {
                    const colorClass = partyColors[p.party] || partyColors['기타'];
                    return `
                        <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div class="text-2xl mb-2">${p.icon}</div>
                            <div class="text-xs text-gray-500 mb-1">${p.type}</div>
                            <div class="font-bold text-lg mb-2">${p.name}</div>
                            <div class="text-sm text-gray-600 mb-2">${p.district}</div>
                            <div class="inline-block px-2 py-1 text-xs rounded border ${colorClass}">
                                ${p.party}
                            </div>
                            ${p.committee ? `<div class="text-xs text-gray-500 mt-2">${p.committee}</div>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// ============================================
// 항목별 추이 상세 차트
// ============================================

function showDetailedChart() {
    const data = window.currentTimeseriesData;
    if (!data) return;
    
    const timeseries = data.timeseries || {};
    const years = data.years || [];
    
    // 모든 항목 데이터 추출
    const datasets = extractAllDatasets(timeseries, years);
    
    // 모달 생성
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl max-w-7xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 class="text-2xl font-bold text-gray-900 flex items-center">
                    <svg class="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                    항목별 추이 분석
                </h2>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            
            <div class="p-6">
                <!-- 카테고리 탭 -->
                <div class="mb-6 flex space-x-2 overflow-x-auto pb-2">
                    ${renderCategoryTabs()}
                </div>
                
                <!-- 차트 영역 -->
                <div id="detailedChartContent">
                    ${renderCategoryCharts('household', datasets, years)}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function renderCategoryTabs() {
    const categories = [
        { id: 'household', name: '가구/인구', icon: '👨‍👩‍👧‍👦' },
        { id: 'house', name: '주택', icon: '🏠' },
        { id: 'company', name: '사업체', icon: '🏢' }
    ];
    
    return categories.map((cat, idx) => `
        <button onclick="switchChartCategory('${cat.id}')" 
            class="chart-tab px-6 py-3 rounded-lg font-medium transition-all ${idx === 0 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
            data-category="${cat.id}">
            ${cat.icon} ${cat.name}
        </button>
    `).join('');
}

function switchChartCategory(category) {
    const data = window.currentTimeseriesData;
    if (!data) return;
    
    const timeseries = data.timeseries || {};
    const years = data.years || [];
    const datasets = extractAllDatasets(timeseries, years);
    
    // 탭 스타일 변경
    document.querySelectorAll('.chart-tab').forEach(tab => {
        if (tab.dataset.category === category) {
            tab.className = 'chart-tab px-6 py-3 rounded-lg font-medium transition-all bg-indigo-600 text-white';
        } else {
            tab.className = 'chart-tab px-6 py-3 rounded-lg font-medium transition-all bg-gray-100 text-gray-600 hover:bg-gray-200';
        }
    });
    
    // 차트 업데이트
    document.getElementById('detailedChartContent').innerHTML = renderCategoryCharts(category, datasets, years);
}

function extractAllDatasets(timeseries, years) {
    const datasets = {
        household: {},
        house: {},
        company: {}
    };
    
    years.forEach(year => {
        const yearData = timeseries[year] || {};
        
        // 가구/인구 (연령별 데이터 우선 사용)
        let population = 0;
        let households = 0;
        let avgSize = 0;
        
        if (yearData.basic && yearData.basic.total_population > 0) {
            population = yearData.basic.total_population;
            avgSize = yearData.household?.avg_family_member_cnt || 2.0;
            households = Math.round(population / avgSize);
        } else {
            const household = yearData.household || {};
            population = household.family_member_cnt || 0;
            households = household.household_cnt || 0;
            avgSize = household.avg_family_member_cnt || 0;
        }
        
        if (!datasets.household.population) datasets.household.population = [];
        if (!datasets.household.households) datasets.household.households = [];
        if (!datasets.household.avgSize) datasets.household.avgSize = [];
        
        datasets.household.population.push(population);
        datasets.household.households.push(households);
        datasets.household.avgSize.push(avgSize);
        
        // 주택
        const house = yearData.house || {};
        if (!datasets.house.total) datasets.house.total = [];
        if (!datasets.house.detached) datasets.house.detached = [];
        if (!datasets.house.apt) datasets.house.apt = [];
        if (!datasets.house.multi) datasets.house.multi = [];
        
        datasets.house.total.push(house.house_cnt || 0);
        datasets.house.detached.push(house.detached_house_cnt || 0);
        datasets.house.apt.push(house.apt_cnt || 0);
        datasets.house.multi.push(house.multi_house_cnt || 0);
        
        // 사업체
        const company = yearData.company || {};
        if (!datasets.company.total) datasets.company.total = [];
        if (!datasets.company.employees) datasets.company.employees = [];
        if (!datasets.company.avgEmployees) datasets.company.avgEmployees = [];
        
        datasets.company.total.push(company.corp_cnt || 0);
        datasets.company.employees.push(company.corp_emp_cnt || 0);
        datasets.company.avgEmployees.push(company.avg_corp_emp_cnt || 0);
    });
    
    return datasets;
}

function renderCategoryCharts(category, datasets, years) {
    const categoryConfig = {
        household: [
            { key: 'population', name: '인구수', unit: '명', color: '#3b82f6' },
            { key: 'households', name: '가구수', unit: '가구', color: '#10b981' },
            { key: 'avgSize', name: '평균 가구원수', unit: '명/가구', color: '#f59e0b' }
        ],
        house: [
            { key: 'total', name: '전체 주택', unit: '호', color: '#8b5cf6' },
            { key: 'detached', name: '단독주택', unit: '호', color: '#ec4899' },
            { key: 'apt', name: '아파트', unit: '호', color: '#06b6d4' },
            { key: 'multi', name: '다가구주택', unit: '호', color: '#f97316' }
        ],
        company: [
            { key: 'total', name: '사업체수', unit: '개', color: '#6366f1' },
            { key: 'employees', name: '종사자수', unit: '명', color: '#14b8a6' },
            { key: 'avgEmployees', name: '평균 종사자수', unit: '명/사업체', color: '#f59e0b' }
        ]
    };
    
    const items = categoryConfig[category] || [];
    const data = datasets[category] || {};
    
    return `
        <div class="grid grid-cols-1 gap-6">
            ${items.map(item => {
                const values = data[item.key] || [];
                if (values.length === 0) return '';
                
                return renderLineChart(item.name, values, years, item.unit, item.color);
            }).join('')}
        </div>
    `;
}

function renderLineChart(title, values, years, unit, color) {
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    
    // SVG 포인트 생성
    const width = 800;
    const height = 200;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const points = values.map((v, i) => {
        const x = padding + (i / (values.length - 1)) * chartWidth;
        const y = padding + chartHeight - ((v - min) / range * chartHeight);
        return `${x},${y}`;
    }).join(' ');
    
    // 변화율 계산
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const changeRate = firstValue ? ((lastValue - firstValue) / firstValue * 100).toFixed(1) : 0;
    const isPositive = changeRate >= 0;
    
    return `
        <div class="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <div class="flex items-center justify-between mb-4">
                <h4 class="font-bold text-lg">${title}</h4>
                <div class="text-right">
                    <div class="text-2xl font-bold" style="color: ${color}">${lastValue.toLocaleString()} ${unit}</div>
                    <div class="text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}">
                        ${isPositive ? '▲' : '▼'} ${Math.abs(changeRate)}% (${years[0]}→${years[years.length-1]})
                    </div>
                </div>
            </div>
            
            <svg viewBox="0 0 ${width} ${height}" class="w-full bg-white rounded">
                <!-- 그리드 라인 -->
                ${Array.from({length: 5}, (_, i) => {
                    const y = padding + (chartHeight / 4) * i;
                    const value = max - (range / 4) * i;
                    return `
                        <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" 
                            stroke="#e5e7eb" stroke-width="1"/>
                        <text x="${padding - 5}" y="${y + 5}" 
                            text-anchor="end" font-size="12" fill="#6b7280">
                            ${Math.round(value).toLocaleString()}
                        </text>
                    `;
                }).join('')}
                
                <!-- 데이터 라인 -->
                <polyline points="${points}" 
                    fill="none" 
                    stroke="${color}" 
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"/>
                
                <!-- 데이터 포인트 -->
                ${values.map((v, i) => {
                    const x = padding + (i / (values.length - 1)) * chartWidth;
                    const y = padding + chartHeight - ((v - min) / range * chartHeight);
                    return `
                        <circle cx="${x}" cy="${y}" r="4" fill="${color}"/>
                        <text x="${x}" y="${height - 10}" 
                            text-anchor="middle" font-size="12" fill="#6b7280">
                            ${years[i]}
                        </text>
                    `;
                }).join('')}
            </svg>
        </div>
    `;
}

async function selectSigungu(sigunguCode) {
    try {
        const response = await fetch(`${API_BASE}/api/national/sigungu/${sigunguCode}/detail`);
        const data = await response.json();
        
        renderSigunguDetail(data);
        
    } catch (error) {
        console.error('❌ 시군구 상세 정보 로드 실패:', error);
    }
}

function renderSigunguDetail(data) {
    const detailView = document.getElementById('detailView');
    
    const commercial = data.commercial || {};
    const tech = data.tech || {};
    const ageData = commercial.population_by_age || {};
    const genderData = commercial.gender || {};
    const houseType = commercial.house_type || {};
    const regionSummary = commercial.region_summary || {};
    const techCategories = tech.tech_categories || {};
    
    detailView.innerHTML = `
        <div class="max-w-5xl">
            <!-- 헤더 -->
            <div class="mb-6">
                <h2 class="text-3xl font-bold text-gray-900">${commercial.sido_name || ''} ${commercial.sigungu_name || ''}</h2>
                <p class="text-gray-600 mt-1">시군구 코드: ${data.sigungu_code}</p>
            </div>
            
            <!-- 주요 통계 카드 -->
            <div class="grid grid-cols-4 gap-4 mb-6">
                <div class="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
                    <div class="text-sm opacity-90 mb-1">총 인구</div>
                    <div class="text-3xl font-bold">${genderData.total_population ? genderData.total_population.toLocaleString() : '-'}</div>
                    <div class="text-xs opacity-75 mt-1">명</div>
                </div>
                
                <div class="bg-gradient-to-br from-pink-500 to-pink-600 p-6 rounded-xl shadow-lg text-white">
                    <div class="text-sm opacity-90 mb-1">성비</div>
                    <div class="text-3xl font-bold">${genderData.male_per ? genderData.male_per.toFixed(1) : '-'}%</div>
                    <div class="text-xs opacity-75 mt-1">남성 비율</div>
                </div>
                
                <div class="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white">
                    <div class="text-sm opacity-90 mb-1">아파트 비율</div>
                    <div class="text-3xl font-bold">${houseType.apartment_per ? houseType.apartment_per.toFixed(1) : '-'}%</div>
                    <div class="text-xs opacity-75 mt-1">${houseType.apartment_cnt ? houseType.apartment_cnt.toLocaleString() : 0}가구</div>
                </div>
                
                <div class="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-xl shadow-lg text-white">
                    <div class="text-sm opacity-90 mb-1">65세 이상</div>
                    <div class="text-3xl font-bold">${regionSummary.senior_65_plus_per ? regionSummary.senior_65_plus_per.toFixed(1) : '-'}%</div>
                    <div class="text-xs opacity-75 mt-1">고령 인구</div>
                </div>
            </div>
            
            <!-- 연령대별 인구 -->
            <div class="bg-white p-6 rounded-lg shadow border border-gray-200 mb-6">
                <h3 class="font-bold text-lg mb-4 flex items-center">
                    <svg class="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                    연령대별 인구 분포
                </h3>
                <div class="grid grid-cols-4 gap-4">
                    ${renderAgeBar('10대 미만', ageData.under_10_per, ageData.under_10_cnt, 'blue')}
                    ${renderAgeBar('10대', ageData.teen_per, ageData.teen_cnt, 'indigo')}
                    ${renderAgeBar('20대', ageData.twenty_per, ageData.twenty_cnt, 'purple')}
                    ${renderAgeBar('30대', ageData.thirty_per, ageData.thirty_cnt, 'pink')}
                    ${renderAgeBar('40대', ageData.forty_per, ageData.forty_cnt, 'red')}
                    ${renderAgeBar('50대', ageData.fifty_per, ageData.fifty_cnt, 'orange')}
                    ${renderAgeBar('60대', ageData.sixty_per, ageData.sixty_cnt, 'yellow')}
                    ${renderAgeBar('70대+', ageData.seventy_plus_per, ageData.seventy_plus_cnt, 'green')}
                </div>
            </div>
            
            <!-- 주택 유형 -->
            <div class="grid grid-cols-2 gap-6 mb-6">
                <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h3 class="font-bold text-lg mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                        </svg>
                        주택 유형 분포
                    </h3>
                    <div class="space-y-3">
                        ${renderHouseTypeBar('아파트', houseType.apartment_per, houseType.apartment_cnt, 'blue')}
                        ${renderHouseTypeBar('단독주택', houseType.detached_per, houseType.detached_cnt, 'green')}
                        ${renderHouseTypeBar('연립/다세대', houseType.row_house_per, houseType.row_house_cnt, 'purple')}
                        ${renderHouseTypeBar('오피스텔', houseType.officetel_per, houseType.officetel_cnt, 'orange')}
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h3 class="font-bold text-lg mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                        지역 특성
                    </h3>
                    <div class="space-y-3">
                        <div class="flex justify-between py-2 border-b border-gray-100">
                            <span class="text-gray-700">1인 가구 비율</span>
                            <span class="font-semibold text-blue-600">${regionSummary.one_person_family_per ? regionSummary.one_person_family_per.toFixed(1) : '-'}%</span>
                        </div>
                        <div class="flex justify-between py-2 border-b border-gray-100">
                            <span class="text-gray-700">20대 인구 비율</span>
                            <span class="font-semibold text-purple-600">${regionSummary.twenty_age_per ? regionSummary.twenty_age_per.toFixed(1) : '-'}%</span>
                        </div>
                        <div class="flex justify-between py-2">
                            <span class="text-gray-700">거주인구 비율</span>
                            <span class="font-semibold">${regionSummary.resident_population_per ? regionSummary.resident_population_per.toFixed(1) : '-'}%</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 기술업종 분포 -->
            ${Object.keys(techCategories).length > 0 ? `
            <div class="bg-white p-6 rounded-lg shadow border border-gray-200 mb-6">
                <h3 class="font-bold text-lg mb-4 flex items-center">
                    <svg class="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                    </svg>
                    기술업종 분포
                </h3>
                <div class="grid grid-cols-2 gap-4">
                    ${Object.entries(techCategories).map(([code, tech]) => `
                        <div class="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200">
                            <div class="flex justify-between items-center mb-2">
                                <span class="font-semibold text-indigo-900">${tech.name}</span>
                                <span class="text-sm text-indigo-600">${tech.corp_per ? tech.corp_per.toFixed(1) : 0}%</span>
                            </div>
                            <div class="flex justify-between items-center text-sm">
                                <span class="text-gray-600">사업체수:</span>
                                <span class="font-semibold">${tech.corp_cnt ? tech.corp_cnt.toLocaleString() : 0}개</span>
                            </div>
                            ${tech.corp_growth_rate ? `
                            <div class="flex justify-between items-center text-xs mt-1">
                                <span class="text-gray-500">증감률:</span>
                                <span class="font-semibold ${tech.corp_growth_rate > 0 ? 'text-green-600' : 'text-red-600'}">
                                    ${tech.corp_growth_rate > 0 ? '+' : ''}${tech.corp_growth_rate.toFixed(1)}%
                                </span>
                            </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            <!-- 업종 분포 (상위 10개) -->
            ${commercial.business_distribution && commercial.business_distribution.length > 0 ? `
            <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
                <h3 class="font-bold text-lg mb-4 flex items-center">
                    <svg class="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                    </svg>
                    주요 업종 분포 (TOP 10)
                </h3>
                <div class="grid grid-cols-2 gap-3">
                    ${commercial.business_distribution.slice(0, 10).map((biz, idx) => `
                        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div class="flex items-center gap-2">
                                <span class="text-xs font-bold text-gray-500">${idx + 1}</span>
                                <span class="text-sm font-semibold">${biz.s_theme_cd_nm || biz.theme_nm || '-'}</span>
                            </div>
                            <span class="text-sm text-orange-600 font-bold">${biz.dist_per || 0}%</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        </div>
    `;
}

function renderAgeBar(label, percent, count, color) {
    if (!percent) return '';
    return `
        <div class="bg-${color}-50 p-3 rounded-lg border border-${color}-200">
            <div class="text-xs text-gray-600 mb-1">${label}</div>
            <div class="text-xl font-bold text-${color}-600">${percent.toFixed(1)}%</div>
            <div class="text-xs text-gray-500">${count ? count.toLocaleString() : 0}명</div>
        </div>
    `;
}

function renderHouseTypeBar(label, percent, count, color) {
    if (!percent) return '';
    return `
        <div class="flex items-center justify-between py-2 border-b border-gray-100">
            <span class="text-gray-700">${label}</span>
            <div class="flex items-center gap-2">
                <div class="w-32 bg-gray-200 rounded-full h-2">
                    <div class="bg-${color}-600 h-2 rounded-full" style="width: ${percent}%"></div>
                </div>
                <span class="font-semibold text-sm">${percent.toFixed(1)}%</span>
                <span class="text-xs text-gray-500">${count ? count.toLocaleString() : 0}</span>
            </div>
        </div>
    `;
}

function renderEmdongDetail(emdong) {
    const detailView = document.getElementById('detailView');
    
    const household = emdong.household || {};
    const house = emdong.house || {};
    const company = emdong.company || {};
    
    detailView.innerHTML = `
        <div class="max-w-5xl">
            <!-- 헤더 -->
            <div class="mb-6">
                <h2 class="text-3xl font-bold text-gray-900">${emdong.full_address || '읍면동'}</h2>
                <p class="text-gray-600 mt-1">행정동 코드: ${emdong.code} | 최신 데이터: ${selectedYear}년</p>
            </div>
            
            <!-- 시계열 차트 영역 -->
            <div id="timeseriesChart" class="mb-6"></div>
            
            <!-- 정치인 정보 -->
            ${renderPoliticiansSection(emdong.politicians || [])}
            
            <!-- 주요 통계 카드 (미니 그래프 포함) -->
            <div id="mainStatsCards" class="grid grid-cols-4 gap-4 mb-6">
                <div class="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg text-white">
                    <div class="text-xs opacity-90 mb-1">인구 (${selectedYear}년)</div>
                    <div class="text-2xl font-bold mb-1">${household.family_member_cnt ? household.family_member_cnt.toLocaleString() : 0}<span class="text-sm ml-1">명</span></div>
                    <div class="h-12 mb-1" id="miniChart-population" style="min-height: 48px;"></div>
                </div>
                
                <div class="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl shadow-lg text-white">
                    <div class="text-xs opacity-90 mb-1">가구수 (${selectedYear}년)</div>
                    <div class="text-2xl font-bold mb-1">${household.household_cnt ? household.household_cnt.toLocaleString() : 0}<span class="text-sm ml-1">가구</span></div>
                    <div class="h-12 mb-1" id="miniChart-household" style="min-height: 48px;"></div>
                </div>
                
                <div class="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl shadow-lg text-white">
                    <div class="text-xs opacity-90 mb-1">주택수 (${selectedYear}년)</div>
                    <div class="text-2xl font-bold mb-1">${house.house_cnt ? house.house_cnt.toLocaleString() : 0}<span class="text-sm ml-1">호</span></div>
                    <div class="h-12 mb-1" id="miniChart-house" style="min-height: 48px;"></div>
                </div>
                
                <div class="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-xl shadow-lg text-white">
                    <div class="text-xs opacity-90 mb-1">사업체 (${selectedYear}년)</div>
                    <div class="text-2xl font-bold mb-1">${company.corp_cnt ? company.corp_cnt.toLocaleString() : 0}<span class="text-sm ml-1">개</span></div>
                    <div class="h-12 mb-1" id="miniChart-company" style="min-height: 48px;"></div>
                </div>
            </div>
            
            <!-- 상세 통계 -->
            <div class="grid grid-cols-2 gap-6 mb-6">
                <!-- 가구 정보 -->
                <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h3 class="font-bold text-lg mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                        </svg>
                        가구 정보
                    </h3>
                    <div class="space-y-3">
                        <div class="flex justify-between items-center py-2 border-b border-gray-100">
                            <span class="text-gray-700">총 가구수</span>
                            <span class="font-semibold">${household.household_cnt ? household.household_cnt.toLocaleString() : 0}가구</span>
                        </div>
                        <div class="flex justify-between items-center py-2 border-b border-gray-100">
                            <span class="text-gray-700">총 인구</span>
                            <span class="font-semibold">${household.family_member_cnt ? household.family_member_cnt.toLocaleString() : 0}명</span>
                        </div>
                        <div class="flex justify-between items-center py-2">
                            <span class="text-gray-700">평균 가구원수</span>
                            <span class="font-semibold text-blue-600">${household.avg_family_member_cnt ? household.avg_family_member_cnt.toFixed(1) : 0}명</span>
                        </div>
                    </div>
                </div>
                
                <!-- 사업체 정보 -->
                <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h3 class="font-bold text-lg mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                        </svg>
                        사업체 정보
                    </h3>
                    <div class="space-y-3">
                        <div class="flex justify-between items-center py-2 border-b border-gray-100">
                            <span class="text-gray-700">사업체수</span>
                            <span class="font-semibold">${company.corp_cnt ? company.corp_cnt.toLocaleString() : 0}개</span>
                        </div>
                        <div class="flex justify-between items-center py-2 border-b border-gray-100">
                            <span class="text-gray-700">종사자수</span>
                            <span class="font-semibold">${company.tot_worker ? company.tot_worker.toLocaleString() : 0}명</span>
                        </div>
                        <div class="flex justify-between items-center py-2">
                            <span class="text-gray-700">평균 종사자수</span>
                            <span class="font-semibold text-orange-600">${company.corp_cnt && company.tot_worker ? (company.tot_worker / company.corp_cnt).toFixed(1) : 0}명/사업체</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                <strong>📊 데이터 출처:</strong> 통계지리정보서비스(SGIS) 2023년 기준
            </div>
        </div>
    `;
}

// ============================================
// 지역 목록 렌더링
// ============================================

// 전역 상태: 접힌/펼쳐진 구
let expandedGus = new Set();
let expandedSeoul = false;

function renderRegionList(regions) {
    const regionList = document.getElementById('regionList');
    
    // 시도별로 그룹화
    const bySido = {};
    regions.forEach(region => {
        const sido = region.sido || '기타';
        if (!bySido[sido]) bySido[sido] = [];
        bySido[sido].push(region);
    });
    
    let html = '';
    
    Object.keys(bySido).sort().forEach(sido => {
        const sidoRegions = bySido[sido];
        const totalPop = sidoRegions.reduce((sum, r) => sum + (r.population || 0), 0);
        const isExpanded = expandedSeoul && sido === '서울특별시';
        
        // 시도 헤더
        html += `
            <div class="mb-2">
                <div class="font-bold text-gray-900 px-3 py-2 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg cursor-pointer hover:from-blue-100 hover:to-blue-150 flex items-center justify-between"
                     onclick='toggleSeoul()'>
                    <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                        <span>${sido}</span>
                    </div>
                    <span class="text-xs text-gray-600">${sidoRegions.length}개 동</span>
                </div>
                
                ${isExpanded ? renderSeoulGus(sidoRegions) : ''}
            </div>
        `;
    });
    
    regionList.innerHTML = html;
}

function renderSeoulGus(regions) {
    // 구별로 그룹화
    const byGu = {};
    regions.forEach(region => {
        const gu = region.sigungu || '기타';
        if (!byGu[gu]) byGu[gu] = [];
        byGu[gu].push(region);
    });
    
    let html = '<div class="mt-2 space-y-2">';
    
    Object.keys(byGu).sort().forEach(gu => {
        const guRegions = byGu[gu];
        const isExpanded = expandedGus.has(gu);
        
        html += `
            <div class="ml-2">
                <div class="font-semibold text-gray-700 px-2 py-1.5 bg-white rounded cursor-pointer hover:bg-blue-50 border border-gray-200 flex items-center justify-between"
                     onclick='toggleGu("${gu}")'>
                    <div class="flex items-center gap-2">
                        <svg class="w-3 h-3 transform transition-transform ${isExpanded ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                        <span class="text-sm">${gu}</span>
                    </div>
                    <span class="text-xs text-gray-500">${guRegions.length}동</span>
                </div>
                
                ${isExpanded ? `
                <div class="mt-1 ml-4 space-y-1">
                    ${guRegions.map(region => {
                        const pop = region.population || 0;
                        const popText = pop > 0 ? `${(pop / 1000).toFixed(1)}천` : '-';
                        
                        return `
                            <div class="p-2 hover:bg-blue-50 rounded cursor-pointer border border-gray-100 text-sm transition-colors"
                                 onclick='selectRegion("${region.code}")'>
                                <div class="flex justify-between items-center">
                                    <span class="text-gray-700">${region.dong || region.name}</span>
                                    <span class="text-xs text-gray-500">${popText}</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                ` : ''}
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

function toggleSeoul() {
    expandedSeoul = !expandedSeoul;
    renderRegionList(allRegions);
}

function toggleGu(gu) {
    if (expandedGus.has(gu)) {
        expandedGus.delete(gu);
    } else {
        expandedGus.add(gu);
    }
    renderRegionList(allRegions);
}

// ============================================
// GDP, 교통, 안전 정보 렌더링 함수
// ============================================

function renderGdpInfo(regionData) {
    const gdpData = regionData.gdpData;
    if (!gdpData || !gdpData.yearlyGdp) return '<div></div>';
    
    const years = Object.keys(gdpData.yearlyGdp).sort();
    const latestYear = years[years.length - 1];
    const latestGdp = gdpData.yearlyGdp[latestYear];
    const prevYear = years[years.length - 2];
    const prevGdp = gdpData.yearlyGdp[prevYear];
    const growthRate = prevGdp ? ((latestGdp - prevGdp) / prevGdp * 100) : 0;
    
    return `
        <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 class="font-bold text-lg mb-4 flex items-center">
                <svg class="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                경제 (GRDP)
            </h3>
            <div class="space-y-3">
                <div class="flex justify-between py-2 border-b border-gray-100">
                    <span class="text-gray-700">${latestYear}년 GRDP</span>
                    <span class="font-semibold text-blue-600">${(latestGdp / 1000000).toFixed(1)}조원</span>
                </div>
                <div class="flex justify-between py-2">
                    <span class="text-gray-700">전년 대비</span>
                    <span class="font-semibold ${growthRate > 0 ? 'text-green-600' : 'text-red-600'}">
                        ${growthRate > 0 ? '+' : ''}${growthRate.toFixed(1)}%
                    </span>
                </div>
            </div>
        </div>
    `;
}

function renderTrafficInfo(regionData) {
    const trafficData = regionData.trafficData;
    if (!trafficData || !trafficData.yearlyData) return '<div></div>';
    
    const years = Object.keys(trafficData.yearlyData).sort();
    const latestYear = years[years.length - 1];
    const latestTraffic = trafficData.yearlyData[latestYear];
    const prevYear = years[years.length - 2];
    const prevTraffic = trafficData.yearlyData[prevYear];
    const growthRate = prevTraffic ? ((latestTraffic.totalUsage - prevTraffic.totalUsage) / prevTraffic.totalUsage * 100) : 0;
    
    return `
        <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 class="font-bold text-lg mb-4 flex items-center">
                <svg class="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
                교통
            </h3>
            <div class="space-y-3">
                <div class="flex justify-between py-2 border-b border-gray-100">
                    <span class="text-gray-700">${latestYear}년 이용</span>
                    <span class="font-semibold text-green-600">${(latestTraffic.totalUsage / 1000000).toFixed(1)}백만명</span>
                </div>
                <div class="flex justify-between py-2">
                    <span class="text-gray-700">전년 대비</span>
                    <span class="font-semibold ${growthRate > 0 ? 'text-green-600' : 'text-red-600'}">
                        ${growthRate > 0 ? '+' : ''}${growthRate.toFixed(1)}%
                    </span>
                </div>
            </div>
        </div>
    `;
}

function renderSafetyInfo(regionData) {
    const safetyData = regionData.safetyData;
    if (!safetyData) return '<div></div>';
    
    return `
        <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 class="font-bold text-lg mb-4 flex items-center">
                <svg class="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
                안전·복지
            </h3>
            <div class="space-y-3">
                ${safetyData.elderlyLivingAlone ? `
                <div class="flex justify-between py-2 border-b border-gray-100">
                    <span class="text-gray-700">독거노인</span>
                    <span class="font-semibold text-orange-600">${safetyData.elderlyLivingAlone.toLocaleString()}명</span>
                </div>
                ` : ''}
                ${safetyData.disabledPopulation ? `
                <div class="flex justify-between py-2 border-b border-gray-100">
                    <span class="text-gray-700">장애인</span>
                    <span class="font-semibold">${safetyData.disabledPopulation.toLocaleString()}명</span>
                </div>
                ` : ''}
                ${safetyData.crimeRate ? `
                <div class="flex justify-between py-2">
                    <span class="text-gray-700">범죄율</span>
                    <span class="font-semibold text-red-600">${safetyData.crimeRate.toFixed(2)}%</span>
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

// ============================================
// 지역 검색 필터
// ============================================

function filterRegions() {
    const query = document.getElementById('regionSearch').value.toLowerCase();
    
    if (!query) {
        renderRegionList(allRegions);
        return;
    }
    
    const filtered = allRegions.filter(region => {
        const searchText = `${region.sigungu} ${region.dong}`.toLowerCase();
        return searchText.includes(query);
    });
    
    renderRegionList(filtered);
}

// ============================================
// 지역 선택
// ============================================

async function selectRegion(code) {
    try {
        const response = await fetch(`${API_BASE}/api/regions/${encodeURIComponent(code)}`);
        const regionData = await response.json();
        
        currentRegion = regionData;
        renderRegionDetail(regionData, code);
        
    } catch (error) {
        console.error('❌ 지역 상세 정보 로드 실패:', error);
    }
}

// ============================================
// 지역 상세 정보 렌더링
// ============================================

function renderRegionDetail(regionData, code) {
    const detailView = document.getElementById('detailView');
    
    const popData = regionData.population_data || {};
    const realEstateData = regionData.realEstateData || {};
    
    const sido = regionData.sido_name || '서울특별시';
    const sigungu = regionData.sigungu_name || '';
    const dong = regionData.dong_name || '';
    
    detailView.innerHTML = `
        <div class="max-w-5xl">
            <!-- 헤더 -->
            <div class="mb-6">
                <h2 class="text-3xl font-bold text-gray-900">${sido} ${sigungu} ${dong}</h2>
                <p class="text-gray-600 mt-1">행정동 코드: ${regionData.admin_dong_code || code}</p>
            </div>
            
            <!-- 주요 통계 카드 -->
            <div class="grid grid-cols-4 gap-4 mb-6">
                <div class="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
                    <div class="text-sm opacity-90 mb-1">총 인구</div>
                    <div class="text-3xl font-bold">${(popData.total_population || 0).toLocaleString()}</div>
                    <div class="text-xs opacity-75 mt-1">명</div>
                </div>
                
                <div class="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white">
                    <div class="text-sm opacity-90 mb-1">평균 연령</div>
                    <div class="text-3xl font-bold">${(popData.total_avg_age || 0).toFixed(1)}</div>
                    <div class="text-xs opacity-75 mt-1">세</div>
                </div>
                
                <div class="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg text-white">
                    <div class="text-sm opacity-90 mb-1">인구 밀도</div>
                    <div class="text-3xl font-bold">${(popData.population_density || 0).toLocaleString()}</div>
                    <div class="text-xs opacity-75 mt-1">명/km²</div>
                </div>
                
                <div class="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-xl shadow-lg text-white">
                    <div class="text-sm opacity-90 mb-1">고령자 비율</div>
                    <div class="text-3xl font-bold">${(popData.aged_65_plus_ratio || 0).toFixed(1)}</div>
                    <div class="text-xs opacity-75 mt-1">%</div>
                </div>
            </div>
            
            <!-- 상세 통계 -->
            <div class="grid grid-cols-2 gap-6 mb-6">
                <!-- 인구 구성 -->
                <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h3 class="font-bold text-lg mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                        인구 구성
                    </h3>
                    <div class="space-y-3">
                        <div class="flex justify-between items-center py-2 border-b border-gray-100">
                            <span class="text-gray-700">남성</span>
                            <span class="font-semibold text-blue-600">${(popData.male_population || 0).toLocaleString()}명 (${(popData.male_ratio || 0).toFixed(1)}%)</span>
                        </div>
                        <div class="flex justify-between items-center py-2 border-b border-gray-100">
                            <span class="text-gray-700">여성</span>
                            <span class="font-semibold text-pink-600">${(popData.female_population || 0).toLocaleString()}명 (${(popData.female_ratio || 0).toFixed(1)}%)</span>
                        </div>
                        <div class="flex justify-between items-center py-2 border-b border-gray-100">
                            <span class="text-gray-700">세대수</span>
                            <span class="font-semibold">${(popData.household_count || 0).toLocaleString()}세대</span>
                        </div>
                        <div class="flex justify-between items-center py-2">
                            <span class="text-gray-700">세대당 인구</span>
                            <span class="font-semibold">${(popData.avg_household_size || 0).toFixed(2)}명</span>
                        </div>
                    </div>
                </div>
                
                <!-- 고령화 지표 -->
                <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h3 class="font-bold text-lg mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                        </svg>
                        연령 구조
                    </h3>
                    <div class="space-y-3">
                        <div class="flex justify-between items-center py-2 border-b border-gray-100">
                            <span class="text-gray-700">65세 이상</span>
                            <span class="font-semibold text-orange-600">${(popData.aged_65_plus_total || 0).toLocaleString()}명</span>
                        </div>
                        <div class="flex justify-between items-center py-2 border-b border-gray-100">
                            <span class="text-gray-700">고령자 비율</span>
                            <span class="font-semibold">${(popData.aged_65_plus_ratio || 0).toFixed(1)}%</span>
                        </div>
                        <div class="flex justify-between items-center py-2 border-b border-gray-100">
                            <span class="text-gray-700">중위연령</span>
                            <span class="font-semibold">${(popData.total_median_age || 0).toFixed(1)}세</span>
                        </div>
                        <div class="flex justify-between items-center py-2">
                            <span class="text-gray-700">외국인</span>
                            <span class="font-semibold text-purple-600">${(popData.foreigner_count || 0).toLocaleString()}명 (${(popData.foreigner_ratio || 0).toFixed(1)}%)</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 부동산 정보 -->
            ${realEstateData.mae_price_index ? `
            <div class="bg-white p-6 rounded-lg shadow border border-gray-200 mb-6">
                <h3 class="font-bold text-lg mb-4 flex items-center">
                    <svg class="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                    </svg>
                    부동산 가격지수 (2024년)
                </h3>
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-blue-50 p-4 rounded-lg">
                        <div class="text-sm text-gray-600 mb-1">매매가격지수</div>
                        <div class="text-2xl font-bold text-blue-600">${(realEstateData.mae_price_index['2024'] || 0).toFixed(1)}</div>
                    </div>
                    <div class="bg-green-50 p-4 rounded-lg">
                        <div class="text-sm text-gray-600 mb-1">전세가격지수</div>
                        <div class="text-2xl font-bold text-green-600">${(realEstateData.jeon_price_index ? realEstateData.jeon_price_index['2024'] : 0).toFixed(1)}</div>
                    </div>
                </div>
            </div>
            ` : ''}
            
            <!-- GDP, 교통, 안전 정보 -->
            <div class="grid grid-cols-3 gap-6 mb-6">
                ${renderGdpInfo(regionData)}
                ${renderTrafficInfo(regionData)}
                ${renderSafetyInfo(regionData)}
            </div>
            
            <!-- 추가 통계 -->
            <div class="grid grid-cols-2 gap-6 mb-6">
                <!-- 복지 정보 -->
                <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h3 class="font-bold text-lg mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                        </svg>
                        복지
                    </h3>
                    <div class="space-y-3">
                        <div class="flex justify-between py-2 border-b border-gray-100">
                            <span class="text-gray-700">수급자</span>
                            <span class="font-semibold">${(popData.welfare_recipients || 0).toLocaleString()}명</span>
                        </div>
                        <div class="flex justify-between py-2 border-b border-gray-100">
                            <span class="text-gray-700">수급 세대</span>
                            <span class="font-semibold">${(popData.welfare_households || 0).toLocaleString()}세대</span>
                        </div>
                        <div class="flex justify-between py-2">
                            <span class="text-gray-700">수급 비율</span>
                            <span class="font-semibold text-green-600">${(popData.welfare_ratio || 0).toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
                
                <!-- 면적 정보 -->
                <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h3 class="font-bold text-lg mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
                        </svg>
                        지역 정보
                    </h3>
                    <div class="space-y-3">
                        <div class="flex justify-between py-2 border-b border-gray-100">
                            <span class="text-gray-700">면적</span>
                            <span class="font-semibold">${(popData.area || 0).toFixed(2)} km²</span>
                        </div>
                        <div class="flex justify-between py-2 border-b border-gray-100">
                            <span class="text-gray-700">인구 증감률</span>
                            <span class="font-semibold ${(popData.population_growth_rate || 0) > 0 ? 'text-green-600' : 'text-red-600'}">
                                ${(popData.population_growth_rate || 0) > 0 ? '+' : ''}${(popData.population_growth_rate || 0).toFixed(2)}%
                            </span>
                        </div>
                        <div class="flex justify-between py-2">
                            <span class="text-gray-700">성비</span>
                            <span class="font-semibold">남 ${(popData.male_ratio || 0).toFixed(1)} : 여 ${(popData.female_ratio || 0).toFixed(1)}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 정치인 정보 -->
            <div class="bg-white p-6 rounded-lg shadow border border-gray-200 mb-6">
                <h3 class="font-bold text-lg mb-4 flex items-center">
                    <svg class="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    정치인 정보
                </h3>
                <div id="politicianInfo" class="text-gray-500">
                    로딩 중...
                </div>
            </div>
            
            <!-- 비교/순위 버튼 -->
            <div class="flex gap-4">
                <button onclick="showComparison('${sigungu}')" class="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                    구 비교
                </button>
                <button onclick="showRankings('${sigungu}')" class="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                    </svg>
                    순위 보기
                </button>
                <button onclick="toggleLDAPanel()" class="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    LDA 분석
                </button>
            </div>
        </div>
    `;
    
    // 정치인 정보 로드
    loadPoliticianInfo(sigungu, dong);
}

// ============================================
// 비교 및 순위 기능
// ============================================

function showComparison(gu) {
    alert(`${gu} 비교 기능 - 구현 예정`);
}

function showRankings(gu) {
    const detailView = document.getElementById('detailView');
    detailView.innerHTML = `
        <div class="max-w-5xl">
            <div class="mb-6">
                <h2 class="text-3xl font-bold text-gray-900">서울시 구별 순위</h2>
                <p class="text-gray-600 mt-1">25개 구 비교</p>
            </div>
            
            <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div class="text-center py-12 text-gray-500">
                    순위 데이터 로딩 중...
                </div>
            </div>
        </div>
    `;
    
    // 순위 데이터 로드
    loadRankings();
}

async function loadRankings() {
    // 전체 지역 데이터로 순위 계산
    const rankings = {
        population: [...allRegions].sort((a, b) => (b.population || 0) - (a.population || 0)),
        avg_age: [...allRegions].sort((a, b) => (b.avg_age || 0) - (a.avg_age || 0)),
        density: [...allRegions].sort((a, b) => (b.density || 0) - (a.density || 0))
    };
    
    const detailView = document.getElementById('detailView');
    detailView.innerHTML = `
        <div class="max-w-5xl">
            <div class="mb-6">
                <h2 class="text-3xl font-bold text-gray-900">서울시 읍면동 순위</h2>
                <p class="text-gray-600 mt-1">426개 읍면동 비교</p>
            </div>
            
            <div class="grid grid-cols-3 gap-6">
                <!-- 인구 순위 -->
                <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h3 class="font-bold text-lg mb-4 text-blue-600">인구 TOP 10</h3>
                    <div class="space-y-2">
                        ${rankings.population.slice(0, 10).map((region, idx) => `
                            <div class="flex items-center gap-3 p-2 hover:bg-blue-50 rounded cursor-pointer" onclick='selectRegion("${region.code}")'>
                                <div class="w-6 h-6 rounded-full ${idx < 3 ? 'bg-yellow-500' : 'bg-gray-300'} flex items-center justify-center text-white text-xs font-bold">
                                    ${idx + 1}
                                </div>
                                <div class="flex-1">
                                    <div class="text-sm font-semibold">${region.sigungu} ${region.dong}</div>
                                    <div class="text-xs text-gray-500">${(region.population || 0).toLocaleString()}명</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- 평균나이 순위 -->
                <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h3 class="font-bold text-lg mb-4 text-green-600">평균나이 TOP 10</h3>
                    <div class="space-y-2">
                        ${rankings.avg_age.slice(0, 10).map((region, idx) => `
                            <div class="flex items-center gap-3 p-2 hover:bg-green-50 rounded cursor-pointer" onclick='selectRegion("${region.code}")'>
                                <div class="w-6 h-6 rounded-full ${idx < 3 ? 'bg-yellow-500' : 'bg-gray-300'} flex items-center justify-center text-white text-xs font-bold">
                                    ${idx + 1}
                                </div>
                                <div class="flex-1">
                                    <div class="text-sm font-semibold">${region.sigungu} ${region.dong}</div>
                                    <div class="text-xs text-gray-500">${(region.avg_age || 0).toFixed(1)}세</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- 인구밀도 순위 -->
                <div class="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h3 class="font-bold text-lg mb-4 text-purple-600">인구밀도 TOP 10</h3>
                    <div class="space-y-2">
                        ${rankings.density.slice(0, 10).map((region, idx) => `
                            <div class="flex items-center gap-3 p-2 hover:bg-purple-50 rounded cursor-pointer" onclick='selectRegion("${region.code}")'>
                                <div class="w-6 h-6 rounded-full ${idx < 3 ? 'bg-yellow-500' : 'bg-gray-300'} flex items-center justify-center text-white text-xs font-bold">
                                    ${idx + 1}
                                </div>
                                <div class="flex-1">
                                    <div class="text-sm font-semibold">${region.sigungu} ${region.dong}</div>
                                    <div class="text-xs text-gray-500">${(region.density || 0).toLocaleString()}명/km²</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// 정치인 정보 로드
// ============================================

async function loadPoliticianInfo(sigungu, dong) {
    const container = document.getElementById('politicianInfo');
    
    try {
        // 국회의원, 시의원, 구청장, 구의원 정보
        container.innerHTML = `
            <div class="space-y-4">
                <div class="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <div class="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        국
                    </div>
                    <div>
                        <div class="font-semibold">국회의원</div>
                        <div class="text-sm text-gray-600">데이터 로딩 중...</div>
                    </div>
                </div>
                
                <div class="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <div class="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                        구
                    </div>
                    <div>
                        <div class="font-semibold">구청장</div>
                        <div class="text-sm text-gray-600">${sigungu}</div>
                    </div>
                </div>
                
                <div class="text-sm text-gray-500 mt-4">
                    * 정치인 LDA 분석 기능은 개발 중입니다
                </div>
            </div>
        `;
    } catch (error) {
        container.innerHTML = '<div class="text-gray-500">정치인 정보를 불러올 수 없습니다</div>';
    }
}

// ============================================
// 네트워크 지도
// ============================================

async function showNetworkMap() {
    document.getElementById('networkModal').classList.remove('hidden');
    
    if (!networkData) {
        await loadNetworkData();
    }
    
    renderNetwork();
}

function closeNetworkMap(event) {
    if (event && event.target.id !== 'networkModal') return;
    document.getElementById('networkModal').classList.add('hidden');
}

async function loadNetworkData() {
    try {
        const response = await fetch(`${API_BASE}/api/network/assembly`);
        networkData = await response.json();
        console.log('✅ 네트워크 데이터 로드 완료');
    } catch (error) {
        console.error('❌ 네트워크 데이터 로드 실패:', error);
    }
}

function renderNetwork() {
    const container = document.getElementById('networkCanvas');
    
    if (!networkData) {
        container.innerHTML = '<div class="flex items-center justify-center h-full"><div class="text-gray-500">네트워크 데이터 로딩 중...</div></div>';
        return;
    }
    
    const mode = document.getElementById('networkMode').value;
    
    container.innerHTML = `
        <div class="flex items-center justify-center h-full flex-col gap-4">
            <div class="text-2xl font-bold text-gray-700">
                ${mode === 'issue' ? '의원-이슈 연결망' : '의원-의원 연결망'}
            </div>
            <div class="text-gray-600">
                ${networkData.members ? Object.keys(networkData.members).length : 0}명 의원
            </div>
            <div class="text-gray-600">
                ${mode === 'issue' ? 
                    `${networkData.issues ? Object.keys(networkData.issues).length : 0}개 이슈` :
                    `${networkData.member_connections ? networkData.member_connections.length : 0}개 연결`
                }
            </div>
            <div class="text-sm text-gray-500 mt-4">
                D3.js 네트워크 시각화 구현 중...
            </div>
        </div>
    `;
}

function updateNetworkMode() {
    renderNetwork();
}

function searchMembers() {
    const query = document.getElementById('memberSearch').value;
    console.log('의원 검색:', query);
}

// ============================================
// LDA 패널 토글
// ============================================

function toggleLDAPanel() {
    const panel = document.getElementById('ldaPanel');
    panel.classList.toggle('hidden');
}

// ============================================
// 전역 검색
// ============================================

document.getElementById('globalSearch')?.addEventListener('keyup', function(e) {
    const query = e.target.value;
    if (query.length >= 2) {
        performGlobalSearch(query);
    }
});

async function performGlobalSearch(query) {
    try {
        const response = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
        const results = await response.json();
        console.log('검색 결과:', results);
    } catch (error) {
        console.error('검색 실패:', error);
    }
}
