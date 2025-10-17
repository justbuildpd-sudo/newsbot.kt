FROM nginx:alpine

# 프론트엔드 파일 복사
COPY index.html /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/
COPY *.html /usr/share/nginx/html/

# Nginx 설정
COPY nginx.conf /etc/nginx/conf.d/default.conf 2>/dev/null || true

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]

