# 🌱 Grassly

**Grassly** je web aplikacija za upravljanje i praćenje sportskih travnjaka — s podrškom za mjerenja vlage, temperature i EC (electrical conductivity) na označenim točkama terena.

🎯 Fokus: sportski tereni i travnjaci, AI prijedlozi u budućnosti, jednostavna i responzivna sučelja.

---

## 🚀 Trenutne funkcionalnosti

- ✅ Registracija i login korisnika
- ✅ JWT autentikacija (access + refresh token)
- ✅ SQLite baza za lokalno testiranje
- ✅ API zaštita middleware-om
- ✅ Refresh token u HttpOnly cookie-u
- ✅ Logout i provjera važenja tokena

---

## 🛠 Tehnologije

| Dio           | Tehnologija                      |
|---------------|----------------------------------|
| Frontend      | React + Vite                     |
| Backend       | Node.js + Express                |
| Baza          | SQLite (`database.sqlite`)       |
| Autentikacija | JWT + bcrypt + cookie-parser     |
| DevOps        | GitHub, Docker, AWS (planirano)  |

---

## 📦 Pokretanje

🔧 Back
  cd backend
  npm install
  npm run dev

🌐 Front
  cd frontend
  npm install
  npm run dev
