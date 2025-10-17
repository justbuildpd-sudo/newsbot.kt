# 시놀로지 NAS 배포 가이드

## 📋 사전 준비

### ✅ 확인 완료
- 시놀로지 주소: `192.168.219.2`
- 계정: `btf_admin / Ks&js140405`
- Container Manager: 설치됨
- SSH: 활성화됨 (포트 22)

---

## 🚀 배포 방법 (2가지 옵션)

### **옵션 1: File Station 사용 (GUI - 추천)**

#### Step 1: File Station에서 폴더 생성
1. DSM 로그인 → File Station 실행
2. `docker` 폴더 생성 (없으면)
3. `docker/insightforge` 폴더 생성

#### Step 2: 파일 업로드
1. File Station에서 `docker/insightforge`로 이동
2. 드래그 앤 드롭으로 업로드:
   - `docker-compose.yml`
   - `backend/` 폴더 전체
   - `nginx/` 폴더 전체
   - `data/` 폴더 전체

#### Step 3: Container Manager에서 실행
1. Container Manager 실행
2. 프로젝트 탭
3. "생성" 클릭
4. 경로: `/docker/insightforge` 선택
5. `docker-compose.yml` 선택
6. "시작" 클릭

---

### **옵션 2: SSH + SCP 사용 (CLI)**

#### Step 1: 디렉토리 생성 (SSH)
```bash
ssh btf_admin@192.168.219.2
# 비밀번호: Ks&js140405

# 디렉토리 생성
sudo mkdir -p /volume1/docker/insightforge
sudo chown -R btf_admin:users /volume1/docker/insightforge
exit
```

#### Step 2: 파일 전송 (SCP)
```bash
cd /Users/hopidad/Desktop/workspace

# 전체 프로젝트 업로드
scp -r insightforge-web/* btf_admin@192.168.219.2:/volume1/docker/insightforge/
```

#### Step 3: Docker 실행 (SSH)
```bash
ssh btf_admin@192.168.219.2
cd /volume1/docker/insightforge

# Docker Compose 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

---

## ✅ 배포 후 확인

### **1. 서비스 상태 확인**
```bash
docker ps
```

예상 결과:
```
CONTAINER ID   IMAGE                    STATUS
xxxxx          insightforge-nginx       Up
xxxxx          insightforge-backend     Up
xxxxx          insightforge-frontend    Up
xxxxx          insightforge-redis       Up
```

### **2. API 테스트**
```bash
# 헬스 체크
curl http://192.168.219.2:8000/health

# 통계 요약
curl http://192.168.219.2:8000/api/stats/summary

# 국회의원 목록
curl http://192.168.219.2:8000/api/politicians/assembly | head -50
```

### **3. 웹 접속**

**MacBook에서:**
- http://192.168.219.2 (Nginx를 통한 접속)
- http://192.168.219.2:3000 (프론트엔드 직접)
- http://192.168.219.2:8000/docs (API 문서)

---

## 🔧 트러블슈팅

### **컨테이너 재시작**
```bash
cd /volume1/docker/insightforge
docker-compose restart
```

### **로그 확인**
```bash
docker-compose logs backend
docker-compose logs frontend
docker-compose logs nginx
```

### **컨테이너 중지**
```bash
docker-compose down
```

### **완전 삭제 후 재시작**
```bash
docker-compose down -v
docker-compose up -d
```

---

## 📊 현재 데이터 크기

```
assembly_by_region.json              79 KB
assembly_member_lda_analysis.json   2.7 MB
assembly_network_graph.json         5.3 MB
issue_articles_tracking.json        2.5 MB
local_politicians_lda_analysis.json 4.1 MB
───────────────────────────────────────────
총 데이터 크기:                    ~15 MB
```

---

## 🎯 배포 후 기능

### **웹에서 사용 가능한 기능:**
- ✅ 지역 선택 및 통계 확인
- ✅ 정치인 정보 조회
- ✅ LDA 토픽 분석
- ✅ 네트워크 그래프
- ✅ 의원-이슈 연결
- ✅ 의원-의원 연결
- ✅ 클러스터 시각화
- ✅ 통합 검색

---

## 🔐 보안 권장사항

### **외부 접속 시 (선택)**
1. DDNS 설정: `제어판 → 외부 액세스 → DDNS`
2. 포트 포워딩: 공유기에서 80, 443 포트
3. SSL 인증서: Let's Encrypt
4. 방화벽: 특정 IP만 허용

### **내부 접속만 (현재)**
- 같은 네트워크에서만 접속
- VPN 사용 시 외부에서도 안전하게 접속

---

## 📞 다음 단계

1. **File Station으로 파일 업로드** (5분)
2. **Container Manager에서 실행** (2분)
3. **웹 브라우저에서 확인** (1분)

**준비되셨으면 시작하겠습니다!** 🚀

