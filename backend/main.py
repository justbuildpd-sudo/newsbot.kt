#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Dict, List, Any, Optional
from collections import defaultdict
import json
import os
from pathlib import Path

app = FastAPI(
    title="InsightForge API",
    description="지역 통계 및 정치인 분석 API",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인만 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 데이터 디렉토리 (로컬 테스트 시)
if os.path.exists("/app/data"):
    DATA_DIR = Path("/app/data")
else:
    DATA_DIR = Path(__file__).parent.parent / "data"

print(f"📁 데이터 디렉토리: {DATA_DIR}")

# 데이터 캐시
data_cache: Dict[str, Any] = {}
aggregated_cache: Dict[str, Any] = {}  # 집계된 데이터 캐시

def load_json_file(filename: str) -> Any:
    """JSON 파일 로드 및 캐싱"""
    if filename in data_cache:
        return data_cache[filename]
    
    file_path = DATA_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"{filename} 파일을 찾을 수 없습니다")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            data_cache[filename] = data
            return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"파일 로드 실패: {str(e)}")

# ============================================
# 기본 엔드포인트
# ============================================

@app.get("/")
async def root():
    """API 루트"""
    return {
        "message": "InsightForge API",
        "version": "1.0.0",
        "endpoints": {
            "regions": "/api/regions",
            "lda": "/api/lda/*",
            "politicians": "/api/politicians/*",
            "network": "/api/network/*",
            "search": "/api/search"
        }
    }

@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {"status": "healthy"}

# ============================================
# 지역 데이터 API
# ============================================

def aggregate_data_on_startup():
    """앱 시작 시 데이터 미리 집계"""
    try:
        print("📊 데이터 집계 시작...")
        
        national_regions = load_json_file("sgis_national_regions.json")
        stats_data = load_json_file("sgis_comprehensive_stats.json")
        commercial_data = load_json_file("sgis_commercial_stats.json")
        tech_data = load_json_file("sgis_tech_stats.json")
        
        regions_data = national_regions.get('regions', {})
        stats_regions = stats_data.get('regions', {})
        
        # 시도별 집계
        sido_aggregated = {}
        for sido_cd, sido_info in regions_data.items():
            sido_aggregated[sido_cd] = {
                "code": sido_cd,
                "name": sido_info.get('sido_name', ''),
                "sigungu_count": len(sido_info.get('sigungu_list', [])),
                "total_population": 0,
                "total_household": 0,
                "total_company": 0
            }
        
        # 시군구별 집계
        sigungu_aggregated = defaultdict(lambda: {
            "total_household": 0,
            "total_population": 0,
            "total_company": 0,
            "total_worker": 0,
            "emdong_count": 0
        })
        
        # 통계 집계
        for emdong_cd, emdong_stats in stats_regions.items():
            sido_cd = emdong_stats.get('sido_code')
            sigungu_cd = emdong_stats.get('sigungu_code')
            
            population = emdong_stats.get('household', {}).get('family_member_cnt', 0)
            household = emdong_stats.get('household', {}).get('household_cnt', 0)
            company = emdong_stats.get('company', {}).get('corp_cnt', 0)
            worker = emdong_stats.get('company', {}).get('tot_worker', 0)
            
            # 시도 집계
            if sido_cd in sido_aggregated:
                sido_aggregated[sido_cd]["total_population"] += population
                sido_aggregated[sido_cd]["total_household"] += household
                sido_aggregated[sido_cd]["total_company"] += company
            
            # 시군구 집계
            if sigungu_cd:
                sigungu_aggregated[sigungu_cd]["total_population"] += population
                sigungu_aggregated[sigungu_cd]["total_household"] += household
                sigungu_aggregated[sigungu_cd]["total_company"] += company
                sigungu_aggregated[sigungu_cd]["total_worker"] += worker
                sigungu_aggregated[sigungu_cd]["emdong_count"] += 1
        
        aggregated_cache["sido"] = sido_aggregated
        aggregated_cache["sigungu"] = dict(sigungu_aggregated)
        aggregated_cache["commercial"] = commercial_data.get('regions', {})
        aggregated_cache["tech"] = tech_data
        
        print(f"✅ 데이터 집계 완료: {len(sido_aggregated)}개 시도, {len(sigungu_aggregated)}개 시군구")
        print(f"✅ 상권 데이터: {len(commercial_data.get('regions', {}))}개 시군구")
        print(f"✅ 기술업종 데이터: {len(tech_data.get('sigungu', {}))}개 시군구")
        
    except Exception as e:
        print(f"❌ 데이터 집계 실패: {e}")

@app.on_event("startup")
async def startup_event():
    """앱 시작 시 실행"""
    aggregate_data_on_startup()

@app.get("/api/national/sido")
async def get_sido_list():
    """전국 시도 목록 (통계 포함) - 캐시 사용"""
    try:
        if "sido" not in aggregated_cache:
            aggregate_data_on_startup()
        
        sido_aggregated = aggregated_cache.get("sido", {})
        sido_list = list(sido_aggregated.values())
        
        stats_data = load_json_file("sgis_comprehensive_stats.json")
        
        return {
            "total": len(sido_list),
            "sido_list": sido_list,
            "metadata": stats_data.get('metadata', {})
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/national/sido/{sido_code}")
async def get_sigungu_list(sido_code: str):
    """특정 시도의 시군구 목록 (통계 포함) - 캐시 사용"""
    try:
        if "sigungu" not in aggregated_cache:
            aggregate_data_on_startup()
        
        national_regions = load_json_file("sgis_national_regions.json")
        regions_data = national_regions.get('regions', {})
        
        if sido_code not in regions_data:
            raise HTTPException(status_code=404, detail=f"{sido_code} 시도를 찾을 수 없습니다")
        
        sido_info = regions_data[sido_code]
        sigungu_list = sido_info.get('sigungu_list', [])
        sigungu_cache = aggregated_cache.get("sigungu", {})
        
        # 캐시된 통계 추가
        enhanced_sigungu = []
        for sigungu_item in sigungu_list:
            sigungu_cd = sigungu_item['sigungu_code']
            stats = sigungu_cache.get(sigungu_cd, {})
            
            enhanced_sigungu.append({
                **sigungu_item,
                "emdong_count": stats.get("emdong_count", 0),
                "total_household": stats.get("total_household", 0),
                "total_population": stats.get("total_population", 0),
                "total_company": stats.get("total_company", 0),
                "total_worker": stats.get("total_worker", 0)
            })
        
        return {
            "sido_code": sido_code,
            "sido_name": sido_info.get('sido_name', ''),
            "sigungu_list": enhanced_sigungu,
            "total": len(enhanced_sigungu)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/national/sigungu/{sigungu_code}/detail")
async def get_sigungu_detail(sigungu_code: str):
    """시군구 상세 정보 (상권 + 기술업종)"""
    try:
        commercial_cache = aggregated_cache.get("commercial", {})
        tech_cache = aggregated_cache.get("tech", {})
        
        sigungu_commercial = commercial_cache.get(sigungu_code, {})
        sigungu_tech = tech_cache.get("sigungu", {}).get(sigungu_code, {})
        
        return {
            "sigungu_code": sigungu_code,
            "commercial": sigungu_commercial,
            "tech": sigungu_tech
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/national/sigungu/{sigungu_code}")
async def get_emdong_list(sigungu_code: str):
    """특정 시군구의 읍면동 목록 (통계 포함)"""
    try:
        stats_data = load_json_file("sgis_comprehensive_stats.json")
        stats_regions = stats_data.get('regions', {})
        
        # 연령별 상세 데이터 로드 (정확한 인구)
        try:
            enhanced_data = load_json_file("sgis_enhanced_multiyear_stats.json")
            enhanced_2023 = enhanced_data.get('regions_by_year', {}).get('2023', {})
        except:
            enhanced_2023 = {}
        
        emdong_list = []
        sigungu_name = None
        for emdong_cd, emdong_stats in stats_regions.items():
            if emdong_stats.get('sigungu_code') == sigungu_code:
                if not sigungu_name:
                    sigungu_name = emdong_stats.get('sigungu_name', '')
                
                # 연령별 데이터에서 정확한 인구 가져오기
                enhanced = enhanced_2023.get(emdong_cd, {})
                accurate_pop = enhanced.get('basic', {}).get('total_population', 0)
                
                # 정확한 인구가 있으면 사용
                if accurate_pop > 0:
                    population = accurate_pop
                    avg_size = emdong_stats.get('household', {}).get('avg_family_member_cnt', 2.0)
                    household_cnt = round(population / avg_size)
                else:
                    population = emdong_stats.get('household', {}).get('family_member_cnt', 0)
                    household_cnt = emdong_stats.get('household', {}).get('household_cnt', 0)
                
                emdong_list.append({
                    "code": emdong_cd,
                    "name": emdong_stats.get('emdong_name', ''),
                    "full_address": emdong_stats.get('full_address', ''),
                    "household_cnt": household_cnt,
                    "population": population,
                    "avg_family_size": emdong_stats.get('household', {}).get('avg_family_member_cnt', 0),
                    "house_cnt": emdong_stats.get('house', {}).get('house_cnt', 0),
                    "company_cnt": emdong_stats.get('company', {}).get('corp_cnt', 0),
                    "worker_cnt": emdong_stats.get('company', {}).get('tot_worker', 0),
                    "x_coord": emdong_stats.get('x_coord', ''),
                    "y_coord": emdong_stats.get('y_coord', '')
                })
        
        return {
            "sigungu_code": sigungu_code,
            "sigungu_name": sigungu_name,
            "emdong_list": emdong_list,
            "total": len(emdong_list)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/national/emdong/{emdong_code}")
async def get_emdong_detail(emdong_code: str, year: Optional[str] = "2023"):
    """특정 읍면동 상세 정보 (연도별)"""
    try:
        # 다년도 데이터 로드
        multiyear_data = load_json_file("sgis_multiyear_stats.json")
        
        # 요청한 연도의 데이터
        year_data = multiyear_data.get('regions_by_year', {}).get(year, {})
        
        if emdong_code not in year_data:
            # 최신 데이터 (2023년)로 폴백
            stats_data = load_json_file("sgis_comprehensive_stats.json")
            stats_regions = stats_data.get('regions', {})
            
            if emdong_code not in stats_regions:
                raise HTTPException(status_code=404, detail=f"{emdong_code} 읍면동을 찾을 수 없습니다")
            
            emdong_stats = stats_regions[emdong_code]
            
            return {
                "code": emdong_code,
                "sido_code": emdong_stats.get('sido_code', ''),
                "sido_name": emdong_stats.get('sido_name', ''),
                "sigungu_code": emdong_stats.get('sigungu_code', ''),
                "sigungu_name": emdong_stats.get('sigungu_name', ''),
                "emdong_name": emdong_stats.get('emdong_name', ''),
                "full_address": emdong_stats.get('full_address', ''),
                "household": emdong_stats.get('household', {}),
                "house": emdong_stats.get('house', {}),
                "company": emdong_stats.get('company', {}),
                "x_coord": emdong_stats.get('x_coord', ''),
                "y_coord": emdong_stats.get('y_coord', ''),
                "year": emdong_stats.get('year', '2023')
            }
        
        # 다년도 데이터 반환
        emdong_stats = year_data[emdong_code]
        
        # 연령별 상세 데이터에서 정확한 인구 가져오기
        try:
            enhanced_data = load_json_file("sgis_enhanced_multiyear_stats.json")
            enhanced_year = enhanced_data.get('regions_by_year', {}).get(year, {})
            enhanced_emdong = enhanced_year.get(emdong_code, {})
            
            if enhanced_emdong and enhanced_emdong.get('basic'):
                # 정확한 인구로 교체
                accurate_pop = enhanced_emdong['basic']['total_population']
                if not emdong_stats.get('household'):
                    emdong_stats['household'] = {}
                emdong_stats['household']['family_member_cnt'] = accurate_pop
                # 가구수도 계산
                avg_size = emdong_stats['household'].get('avg_family_member_cnt', 2.0)
                emdong_stats['household']['household_cnt'] = round(accurate_pop / avg_size)
        except:
            pass
        
        return {
            "code": emdong_code,
            "household": emdong_stats.get('household', {}),
            "house": emdong_stats.get('house', {}),
            "company": emdong_stats.get('company', {}),
            "year": year
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/years")
async def get_available_years():
    """사용 가능한 연도 목록"""
    try:
        multiyear_data = load_json_file("sgis_multiyear_stats.json")
        years = list(multiyear_data.get('regions_by_year', {}).keys())
        
        return {
            "years": sorted(years),
            "total": len(years),
            "metadata": multiyear_data.get('metadata', {})
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/emdong/{emdong_code}/timeseries")
async def get_emdong_timeseries(emdong_code: str):
    """특정 읍면동의 시계열 데이터"""
    try:
        multiyear_data = load_json_file("sgis_multiyear_stats.json")
        regions_by_year = multiyear_data.get('regions_by_year', {})
        
        timeseries = {}
        for year, year_data in sorted(regions_by_year.items()):
            if emdong_code in year_data:
                timeseries[year] = year_data[emdong_code]
        
        if not timeseries:
            raise HTTPException(status_code=404, detail=f"{emdong_code} 시계열 데이터를 찾을 수 없습니다")
        
        return {
            "code": emdong_code,
            "timeseries": timeseries,
            "years": sorted(timeseries.keys())
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/emdong/{emdong_code}/enhanced")
async def get_emdong_enhanced(emdong_code: str):
    """특정 읍면동의 연령별 상세 데이터 (시계열)"""
    try:
        enhanced_data = load_json_file("sgis_enhanced_multiyear_stats.json")
        regions_by_year = enhanced_data.get('regions_by_year', {})
        
        timeseries = {}
        for year, year_data in sorted(regions_by_year.items()):
            if emdong_code in year_data:
                timeseries[year] = year_data[emdong_code]
        
        if not timeseries:
            raise HTTPException(status_code=404, detail=f"{emdong_code} 연령별 데이터를 찾을 수 없습니다")
        
        return {
            "code": emdong_code,
            "timeseries": timeseries,
            "years": sorted(timeseries.keys()),
            "latest": timeseries.get("2023", {})
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/politicians/emdong/{emdong_code}")
async def get_politicians_by_emdong(emdong_code: str):
    """특정 읍면동의 정치인 정보 (행정동 코드 기반)"""
    try:
        # 읍면동 정보 로드
        stats_data = load_json_file("sgis_comprehensive_stats.json")
        emdong_info = stats_data.get('regions', {}).get(emdong_code, {})
        
        if not emdong_info:
            return {
                "emdong_code": emdong_code,
                "politicians": []
            }
        
        # 동 이름과 구 이름 추출
        emdong_name = emdong_info.get('emdong_name', '')
        sigungu_name = emdong_info.get('sigungu_name', '').replace('서울특별시 ', '')
        sido_code = emdong_info.get('sido_code', '')
        sido_name = emdong_info.get('sido_name', '')
        
        # 동 매핑 로드
        mapping_data = load_json_file("dong_election_mapping_complete.json")
        dong_mapping = mapping_data.get(emdong_name, {})
        
        politicians = []
        
        # 서울 지역만 정치인 데이터 표시
        if sido_code != '11':
            return {
                "emdong_code": emdong_code,
                "emdong_name": emdong_name,
                "sigungu_name": sigungu_name,
                "sido_name": sido_name,
                "politicians": [],
                "total": 0
            }
        
        # 각 정치인 데이터 로드 (서울만)
        assembly_data = load_json_file("national_assembly_22nd_real.json")
        si_uiwon_data = load_json_file("seoul_si_uiwon_8th_real.json")
        gu_uiwon_data = load_json_file("seoul_gu_uiwon_8th_real.json")
        mayor_data = load_json_file("seoul_mayor_8th_real.json")
        gu_mayor_data = load_json_file("seoul_gu_mayor_8th.json")
        
        # 1. 서울시장 (서울 모든 동에 표시)
        if mayor_data:
            # mayor_data가 dict인 경우 (단일 시장 정보)
            if isinstance(mayor_data, dict) and 'name' in mayor_data:
                politicians.append({
                    "type": "서울시장",
                    "name": mayor_data.get('name', '').split('\n')[0],
                    "party": mayor_data.get('party', ''),
                    "district": "서울특별시",
                    "icon": "🌆",
                    "priority": 1
                })
            # mayor_data가 {이름: 정보} 형태인 경우
            else:
                for mayor_name, mayor_info in mayor_data.items():
                    if isinstance(mayor_info, dict):
                        politicians.append({
                            "type": "서울시장",
                            "name": mayor_name.split('\n')[0],
                            "party": mayor_info.get('party', ''),
                            "district": "서울특별시",
                            "icon": "🌆",
                            "priority": 1
                        })
        
        # 2. 구청장 (해당 구의 모든 동에 표시)
        if sigungu_name and sigungu_name in gu_mayor_data:
            gu_mayor_info = gu_mayor_data[sigungu_name]
            if isinstance(gu_mayor_info, dict):
                politicians.append({
                    "type": "구청장",
                    "name": gu_mayor_info.get('name', '').split('\n')[0].split('(')[0].strip(),
                    "party": gu_mayor_info.get('party', ''),
                    "district": sigungu_name,
                    "icon": "🏢",
                    "priority": 2
                })
        
        # 3. 국회의원 (선거구별로 찾기)
        na_district = dong_mapping.get('na_uiwon', '')
        if na_district:
            # 동 매핑에 있는 선거구로 찾기 (예: "종로구")
            assembly_member = assembly_data.get(na_district)
            if assembly_member and isinstance(assembly_member, dict):
                politicians.append({
                    "type": "국회의원",
                    "name": assembly_member.get('name', '').split('\n')[0],
                    "party": assembly_member.get('party', ''),
                    "district": na_district,
                    "committee": assembly_member.get('committee'),
                    "icon": "🏛️",
                    "priority": 3
                })
        else:
            # 매핑이 없으면 구 이름으로 찾기 (예: "강남구갑", "강남구을")
            for key in assembly_data.keys():
                if key.startswith(sigungu_name):
                    assembly_member = assembly_data[key]
                    if isinstance(assembly_member, dict):
                        politicians.append({
                            "type": "국회의원",
                            "name": assembly_member.get('name', '').split('\n')[0],
                            "party": assembly_member.get('party', ''),
                            "district": key,
                            "committee": assembly_member.get('committee'),
                            "icon": "🏛️",
                            "priority": 3
                        })
                        break  # 첫 번째 매칭만 사용
        
        # 4. 시의원 (선거구별로 찾기)
        si_district = dong_mapping.get('si_uiwon', '')
        if si_district:
            # 선거구 이름으로 찾기 (예: "종로구제2선거구")
            found = False
            for district_key, si_members in si_uiwon_data.items():
                if isinstance(si_members, list):
                    for member in si_members:
                        if isinstance(member, dict) and member.get('district') == si_district:
                            politicians.append({
                                "type": "시의원",
                                "name": member.get('name', '').split('\n')[0],
                                "party": member.get('party', ''),
                                "district": si_district,
                                "icon": "🏛️",
                                "priority": 4
                            })
                            found = True
            
            # 선거구별 매칭이 안 되면 구 단위로 매칭 (폴백)
            if not found and sigungu_name and sigungu_name in si_uiwon_data:
                si_members = si_uiwon_data[sigungu_name]
                if isinstance(si_members, list):
                    for member in si_members:
                        if isinstance(member, dict):
                            politicians.append({
                                "type": "시의원",
                                "name": member.get('name', '').split('\n')[0],
                                "party": member.get('party', ''),
                                "district": member.get('district', sigungu_name),
                                "icon": "🏛️",
                                "priority": 4
                            })
        
        # 5. 구의원 (선거구별로 찾기)
        gu_district = dong_mapping.get('gu_uiwon', '')
        if gu_district and sigungu_name and sigungu_name in gu_uiwon_data:
            gu_members = gu_uiwon_data[sigungu_name]
            if isinstance(gu_members, list):
                for member in gu_members:
                    if isinstance(member, dict):
                        member_district = member.get('district', '')
                        # 선거구가 일치하는 구의원만 추가
                        if member_district == gu_district:
                            politicians.append({
                                "type": "구의원",
                                "name": member.get('name', '').split('\n')[0],
                                "party": member.get('party', ''),
                                "district": gu_district,
                                "icon": "🏘️",
                                "priority": 5
                            })
        
        # priority 순으로 정렬 (시장 → 구청장 → 국회의원 → 시의원 → 구의원)
        politicians.sort(key=lambda x: x.get('priority', 999))
        
        return {
            "emdong_code": emdong_code,
            "emdong_name": emdong_name,
            "sigungu_name": sigungu_name,
            "politicians": politicians,
            "total": len(politicians)
        }
        
    except Exception as e:
        import traceback
        print(f"Error in get_politicians_by_emdong: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/regions")
async def get_regions():
    """지역 목록 (서울 읍면동)"""
    try:
        seoul_data = load_json_file("seoul_comprehensive_data.json")
        
        # regions 키 안에 실제 데이터가 있음
        regions_data = seoul_data.get('regions', {})
        
        # 서울 구/동 목록
        regions = []
        for key, value in regions_data.items():
            if isinstance(value, dict):
                sido = value.get('sido_name', '서울특별시')
                sigungu = value.get('sigungu_name', '')
                dong = value.get('dong_name', '')
                
                pop_data = value.get('population_data', {})
                
                regions.append({
                    "code": key,
                    "sido": sido,
                    "sigungu": sigungu,
                    "dong": dong,
                    "name": f"{sigungu} {dong}".strip() if dong else sigungu,
                    "population": pop_data.get('total_population', 0),
                    "avg_age": pop_data.get('total_avg_age', 0),
                    "density": pop_data.get('population_density', 0),
                    "is_gu": not dong
                })
        
        # 구별로 그룹화
        by_gu = defaultdict(list)
        for region in regions:
            by_gu[region['sigungu']].append(region)
        
        return {
            "regions": regions,
            "by_gu": dict(by_gu),
            "total": len(regions),
            "gu_count": len(by_gu)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/regions/{code}")
async def get_region_detail(code: str):
    """지역 상세 정보 (통합)"""
    try:
        seoul_data = load_json_file("seoul_comprehensive_data.json")
        gdp_data = load_json_file("seoul_gdp_data.json")
        traffic_data = load_json_file("seoul_traffic_data.json")
        safety_data = load_json_file("seoul_safety_data.json")
        
        regions_data = seoul_data.get('regions', {})
        
        # 코드로 찾기
        region = None
        for key, value in regions_data.items():
            if code == key or code in key:
                region = value.copy()
                break
        
        if not region:
            raise HTTPException(status_code=404, detail=f"{code} 데이터를 찾을 수 없습니다")
        
        # 추가 데이터 병합
        sigungu = region.get('sigungu_name', '')
        
        if sigungu in gdp_data:
            region['gdpData'] = gdp_data[sigungu]
        
        if sigungu in traffic_data:
            region['trafficData'] = traffic_data[sigungu]
        
        if sigungu in safety_data:
            region['safetyData'] = safety_data[sigungu]
        
        return region
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# LDA 분석 API
# ============================================

@app.get("/api/lda/district/{gu}")
async def get_district_lda(gu: str):
    """구 단위 LDA 분석"""
    try:
        # 구 뉴스 데이터에서 LDA 추출 (현재는 간단한 키워드 추출)
        # 실제로는 분석 결과를 별도로 저장하거나 실시간 분석
        return {
            "gu": gu,
            "topics": [],
            "keywords": [],
            "message": "LDA 분석 결과 (구현 예정)"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/lda/assembly/{name}")
async def get_assembly_lda(name: str):
    """국회의원 LDA 분석"""
    try:
        data = load_json_file("assembly_member_lda_analysis.json")
        
        if name not in data:
            raise HTTPException(status_code=404, detail=f"{name} 의원의 데이터를 찾을 수 없습니다")
        
        return data[name]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/lda/local/{name}")
async def get_local_lda(name: str):
    """지방정치인 LDA 분석"""
    try:
        data = load_json_file("local_politicians_lda_analysis.json")
        
        if name not in data:
            raise HTTPException(status_code=404, detail=f"{name} 정치인의 데이터를 찾을 수 없습니다")
        
        return data[name]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# 정치인 API
# ============================================

@app.get("/api/politicians/assembly")
async def get_assembly_members():
    """국회의원 목록"""
    try:
        data = load_json_file("assembly_by_region.json")
        
        all_members = []
        
        # 지역구 의원
        if "regional" in data:
            for region, members in data["regional"].items():
                for member in members:
                    member["type"] = "regional"
                    member["region"] = region
                    all_members.append(member)
        
        # 비례대표
        if "proportional" in data:
            for party, members in data["proportional"].items():
                for member in members:
                    member["type"] = "proportional"
                    member["party"] = party
                    all_members.append(member)
        
        return {"members": all_members, "total": len(all_members)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# 네트워크 API
# ============================================

@app.get("/api/network/assembly")
async def get_assembly_network():
    """국회의원-이슈 네트워크"""
    try:
        data = load_json_file("assembly_network_graph.json")
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/network/issues/{issue}")
async def get_issue_tracking(issue: str):
    """이슈별 기사 추적"""
    try:
        data = load_json_file("issue_articles_tracking.json")
        
        if issue not in data:
            raise HTTPException(status_code=404, detail=f"{issue} 이슈를 찾을 수 없습니다")
        
        return data[issue]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/network/clusters")
async def get_clusters():
    """의원 클러스터 정보"""
    try:
        network_data = load_json_file("assembly_network_graph.json")
        
        return {
            "clusters": network_data.get("clusters", []),
            "member_to_cluster": network_data.get("member_to_cluster", {}),
            "stats": network_data.get("connection_stats", {})
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# 검색 API
# ============================================

@app.get("/api/search")
async def search(q: str, type: Optional[str] = None):
    """통합 검색"""
    if not q:
        raise HTTPException(status_code=400, detail="검색어를 입력하세요")
    
    results = {
        "query": q,
        "regions": [],
        "assembly_members": [],
        "local_politicians": []
    }
    
    try:
        # 지역 검색
        if not type or type == "region":
            region_data = load_json_file("seoul_comprehensive_data.json")
            for region_id, region in region_data.items():
                if isinstance(region, dict):
                    name = region.get("sigunguName", "") + region.get("dongName", "")
                    if q.lower() in name.lower():
                        results["regions"].append({
                            "id": region_id,
                            "name": name,
                            "type": "region"
                        })
        
        # 국회의원 검색
        if not type or type == "assembly":
            assembly_data = load_json_file("assembly_by_region.json")
            for region, members in assembly_data.get("regional", {}).items():
                for member in members:
                    if q.lower() in member.get("name", "").lower():
                        results["assembly_members"].append(member)
        
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# 통계 API
# ============================================

@app.get("/api/stats/summary")
async def get_stats_summary():
    """전체 통계 요약"""
    try:
        assembly_data = load_json_file("assembly_by_region.json")
        network_data = load_json_file("assembly_network_graph.json")
        
        # 의원 수 계산
        regional_count = sum(len(members) for members in assembly_data.get("regional", {}).values())
        proportional_count = sum(len(members) for members in assembly_data.get("proportional", {}).values())
        
        return {
            "assembly_members": {
                "regional": regional_count,
                "proportional": proportional_count,
                "total": regional_count + proportional_count
            },
            "network": {
                "issues": len(network_data.get("issues", {})),
                "connections": len(network_data.get("connections", [])),
                "member_connections": len(network_data.get("member_connections", [])),
                "clusters": len(network_data.get("clusters", []))
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

