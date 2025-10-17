# InsightForge Web - 시놀로지 NAS 배포판

## 🎯 프로젝트 개요

macOS 전용 SwiftUI 앱을 웹 기반 서비스로 마이그레이션한 버전입니다.

- **프론트엔드**: React (Next.js) - 개발 예정
- **백엔드**: FastAPI (Python)
- **인프라**: Docker + Nginx
- **호스팅**: 시놀로지 NAS (192.168.219.2)

---

## 📦 현재 준비된 파일

### **백엔드** ✅
- `backend/main.py` - FastAPI 서버
- `backend/requirements.txt` - Python 패키지
- `backend/Dockerfile` - Docker 이미지

### **인프라** ✅
- `docker-compose.yml` - 전체 서비스 구성
- `nginx/nginx.conf` - 리버스 프록시 설정

### **데이터** ✅
- `data/assembly_member_lda_analysis.json` (2.7MB)
- `data/assembly_network_graph.json` (5.3MB)
- `data/local_politicians_lda_analysis.json` (4.1MB)
- `data/issue_articles_tracking.json` (2.5MB)
- `data/assembly_by_region.json` (79KB)

### **프론트엔드** ⏳
- 개발 예정 (Next.js + TypeScript)

---

## 🚀 빠른 시작

### **방법 1: File Station (추천)**

1. DSM 로그인 (http://192.168.219.2:5000)
2. File Station → `docker/insightforge` 폴더 생성
3. 모든 파일 드래그 앤 드롭으로 업로드
4. Container Manager → 프로젝트 → 생성
5. `docker-compose.yml` 선택 → 시작

### **방법 2: SSH + SCP**

```bash
# 1. 디렉토리 생성
ssh btf_admin@192.168.219.2
sudo mkdir -p /volume1/docker/insightforge
sudo chown -R btf_admin:users /volume1/docker/insightforge
exit

# 2. 파일 업로드
cd /Users/hopidad/Desktop/workspace
scp -r insightforge-web/* btf_admin@192.168.219.2:/volume1/docker/insightforge/

# 3. 실행
ssh btf_admin@192.168.219.2
cd /volume1/docker/insightforge
docker-compose up -d
```

---

## 📡 API 엔드포인트

### **기본**
- `GET /` - API 정보
- `GET /health` - 헬스 체크
- `GET /docs` - Swagger UI

### **지역 데이터**
- `GET /api/regions` - 전체 지역 목록
- `GET /api/regions/{gu}` - 구 상세 정보

### **LDA 분석**
- `GET /api/lda/assembly/{name}` - 국회의원 LDA
- `GET /api/lda/local/{name}` - 지방정치인 LDA

### **네트워크**
- `GET /api/network/assembly` - 의원-이슈 네트워크
- `GET /api/network/issues/{issue}` - 이슈별 추적
- `GET /api/network/clusters` - 클러스터 정보

### **정치인**
- `GET /api/politicians/assembly` - 국회의원 목록

### **검색**
- `GET /api/search?q={query}` - 통합 검색

### **통계**
- `GET /api/stats/summary` - 전체 통계

---

## 🧪 로컬 테스트 (시놀로지 업로드 전)

### **백엔드만 테스트**

```bash
cd backend

# 가상환경 생성
python3 -m venv venv
source venv/bin/activate

# 패키지 설치
pip install -r requirements.txt

# 서버 실행
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

브라우저에서 확인:
- http://localhost:8000/docs (Swagger UI)
- http://localhost:8000/api/stats/summary

---

## 📊 현재 구현 상태

| 기능 | 백엔드 API | 프론트엔드 | 상태 |
|------|-----------|-----------|------|
| 지역 목록 | ✅ | ⏳ | API 완료 |
| 지역 상세 | ✅ | ⏳ | API 완료 |
| 국회의원 LDA | ✅ | ⏳ | API 완료 |
| 지방정치인 LDA | ✅ | ⏳ | API 완료 |
| 네트워크 그래프 | ✅ | ⏳ | API 완료 |
| 이슈 추적 | ✅ | ⏳ | API 완료 |
| 클러스터 | ✅ | ⏳ | API 완료 |
| 검색 | ✅ | ⏳ | API 완료 |
| 통계 | ✅ | ⏳ | API 완료 |

---

## 🎯 다음 단계

### **즉시 가능:**
1. 백엔드 API를 시놀로지에 배포
2. API 테스트
3. Swagger UI로 API 확인

### **이후 작업:**
1. React 프론트엔드 개발
2. D3.js 네트워크 그래프 구현
3. 반응형 UI 개발

---

## 📁 파일 구조

```
insightforge-web/
├── README.md (이 파일)
├── DEPLOY_TO_SYNOLOGY.md (배포 가이드)
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── main.py (FastAPI 서버)
├── nginx/
│   ├── Dockerfile
│   └── nginx.conf
├── frontend/ (프론트엔드 - 개발 예정)
└── data/
    ├── assembly_member_lda_analysis.json
    ├── assembly_network_graph.json
    ├── local_politicians_lda_analysis.json
    ├── issue_articles_tracking.json
    └── assembly_by_region.json
```

---

## 💡 팁

### **Container Manager 대신 SSH 사용**
더 빠른 배포와 디버깅을 위해 SSH 사용 권장

### **개발 모드**
- 백엔드: `--reload` 옵션으로 자동 재시작
- 프론트엔드: Hot Module Replacement (HMR)

### **로그 확인**
```bash
docker-compose logs -f backend
docker-compose logs -f nginx
```

---

## 🔗 참고 자료

- FastAPI 문서: https://fastapi.tiangolo.com/
- Synology Docker: https://www.synology.com/ko-kr/dsm/feature/docker
- Docker Compose: https://docs.docker.com/compose/

---

**준비 완료! 시놀로지에 배포하시겠습니까?** 🚀

