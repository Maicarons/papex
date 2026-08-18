# 배포

Papex는 Vercel, 모든 Docker 환경, 또는 자체 호스팅 서버에 배포할 수 있습니다.

## Vercel

1. 저장소를 Vercel로 가져오기.
2. 환경 변수 설정: `DATABASE_URL`, `AUTH_SECRET`.
3. 빌드 명령: `npm run build` (출력은 Next.js가 처리).
4. Vercel Storage로 Postgres를 연결하거나 외부 `DATABASE_URL`을 채우기.
5. 배포 후 한 번 마이그레이션 실행: `npm run db:migrate`.
6. **PDF 저장**: Vercel의 파일 시스템은 런타임에 읽기 전용이므로 `STORAGE_DRIVER=s3`과 `PAPEX_S3_*` 변수를 설정하세요 ([구성 → 저장소](./configuration.md) 참조). 그러면 스트리밍 라우트가 디스크에서 바이트를 제공하는 대신 서명된 객체 URL로 리디렉션됩니다.

## Docker / 자체 호스팅

루트 `docker-compose.yml`로 앱 + 데이터베이스를 함께 실행하세요:

```bash
docker compose up -d
```

또는 Docker에서 Postgres만 실행하고 Next.js 이미지를 직접 빌드:

```bash
docker build -t papex .
docker run -e DATABASE_URL=... -e AUTH_SECRET=... -p 3000:3000 papex
```

## 문서 사이트

문서는 VitePress로 빌드되어 `public/docs`에 들어가고 메인 앱이 `/docs`에서 제공합니다:

```bash
npm run docs:build
```
