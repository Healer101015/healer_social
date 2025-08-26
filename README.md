# Healer — Rede Social (Starter)

## Backend
1. Entre na pasta `backend` e copie `.env.example` para `.env` (ajuste se quiser).
2. Instale deps: `npm install`
3. Rode: `npm run dev`
   - API: `http://localhost:4000`
   - Uploads servidos em `/uploads/...`

## Frontend
1. Entre na pasta `frontend`
2. Instale deps: `npm install`
3. Crie `.env` com (opcional):
   ```
   VITE_API_URL=http://localhost:4000
   ```
4. Rode: `npm run dev` (Vite em `http://localhost:5173`)

## Funcionalidades
- Cadastro/login (JWT)
- Feed com posts (texto, imagem, vídeo)
- Curtir, comentar
- Perfil com avatar/bio (upload)
- Solicitação e aceitação de amizade (rotas de exemplo)

## Observações
- Mongo local: `mongodb://127.0.0.1:27017/healer`
- Uploads são salvos em `backend/uploads/` e servidos estaticamente.
