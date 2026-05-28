# Rehabology — szakdolgozati alkalmazás

Rehabilitációs gyógytorna webalkalmazás React (Vite) frontenddel, Express backenddel, PostgreSQL adatbázissal és Keycloak hitelesítéssel.

## Előfeltételek

- **Node.js** 18 vagy újabb
- **npm** (a Node.js-sel együtt jön)
- **PostgreSQL** 14 vagy újabb (helyi telepítés vagy Docker)
- **Docker** és **Docker Compose** (Keycloak futtatásához)

## Klónozás és csomagok telepítése

```bash
git clone <repository-url>
cd szakdolgozat

# Frontend függőségek
npm install

# Backend függőségek
cd backend
npm install
cd ..
```

## Környezeti változók

### Frontend — `.env` (projekt gyökér)

Hozz létre egy `.env` fájlt a gyökérben:

```env
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=rehabology
VITE_KEYCLOAK_CLIENT_ID=rehabology-frontend
VITE_API_URL=http://localhost:3001

# Kapcsolat oldal (EmailJS) — opcionális
VITE_EMAILJS_PUBLIC_KEY=
VITE_EMAILJS_SERVICE_ID=
VITE_EMAILJS_TEMPLATE_ID=
```

### Backend — `backend/.env`

```env
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=rehabology
KEYCLOAK_CLIENT_ID=rehabology-frontend
KEYCLOAK_ADMIN_USER=admin
KEYCLOAK_ADMIN_PASSWORD=admin

PG_USER=user
PG_PASSWORD=password
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=rehab
```

---

## Adatbázis felépítése

### 1. Adatbázis létrehozása

```bash
psql -U postgres
```

```sql
CREATE USER user WITH PASSWORD 'password';
CREATE DATABASE rehab OWNER user;
\c rehab
```

### 2. Alap táblák: `testresz` és `gyakorlat`

Első lépésként hozd létre a két alap táblát:

```sql
CREATE TABLE testresz (
  id       INTEGER PRIMARY KEY,
  nev      TEXT NOT NULL,
  elol  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE gyakorlat (
  id             INTEGER PRIMARY KEY,
  gyakorlat_nev  TEXT NOT NULL,
  testresz_id    TEXT NOT NULL REFERENCES testresz (id),
  tipus          TEXT NOT NULL,
  leiras         TEXT,
  ismetlesszam   INTEGER,
  video_link     TEXT
);
```

### 3. `testresz` tábla feltöltése

A testrészek listája megegyezik a `src/pages/Gyakorlatok.jsx` fájlban definiált `TESTRESZEK` tömbbel. Töltsd fel az alábbi sorokkal:

```sql
INSERT INTO testresz (id, nev, elol) VALUES
  ('6',  'Vállak',              TRUE),
  ('5',  'Has',                 TRUE),
  ('4',  'Csípő',               TRUE),
  ('3',  'Comb',                TRUE),
  ('2',  'Térd',                TRUE),
  ('1',  'Boka',                TRUE),
  ('11', 'Nyak',                FALSE),
  ('10', 'Felső hát / lapocka', FALSE),
  ('9',  'Alsó hát / derék',    FALSE),
  ('8',  'Fartájék',            FALSE),
  ('7',  'Combhajlító',         FALSE);
```


### 4. `gyakorlat` tábla feltöltése (admin CSV import)

A gyakorlatokat a **`public/Gyakorlatok.csv`** fájlból lehet betölteni az admin felületen (lásd [Kezdeti adatok](#kezdeti-adatok) alatt). A tábla kezdetben üresen is maradhat; az import hozza létre a sorokat.

### 5. Migrációk (felhasználói program és naptár)

A felhasználói program és a napi gyakorlatsor táblái migrációs SQL fájlokból jönnek létre. Futtasd sorrendben:

```bash
psql -U user -d rehab -f backend/migrations/001_program_napigyakorlat.sql
psql -U user -d rehab -f backend/migrations/002_program_fingerprint_es_napi_unique.sql
```

Ezek létrehozzák:

- `felhasznalo_program` — felhasználónként egy mentett program (testrészek + típus)
- `napi_gyakorlat` — naponta generált gyakorlatsor (a `gyakorlat` táblára hivatkozik)

---

## Keycloak beállítása

### Indítás Dockerrel

A projekt gyökeréből:

```bash
docker compose -f docker-compose.keycloak.yml up -d
```

- Admin konzol: http://localhost:8080/admin
- Bootstrap admin: `admin` / `admin`

Az első indulás 1–3 percet is igénybe vehet.

### Realm és kliens (egyszeri manuális lépések)

1. **Realm létrehozása:** `rehabology`
2. **Kliens:** `rehabology-frontend`
   - **Client authentication:** Off (nyilvános SPA kliens)
   - **Valid redirect URIs / Web origins:** `http://localhost:5173`, `http://127.0.0.1:5173`
   - **Direct access grants:** **ON** (email + jelszó belépés a saját UI-ról)
3. **Admin felülethez** (`/admin`): a felhasználóhoz rendeld hozzá a `realm-management` kliens **realm-admin** szerepét.

---

## Alkalmazás indítása

Három terminálban (vagy háttérben):

```bash
# 1. Keycloak (ha még nem fut)
docker compose -f docker-compose.keycloak.yml up -d

# 2. Backend (port 3001)
cd backend
npm start

# 3. Frontend (port 5173) — új terminál, projekt gyökérből
npm run dev
```

| Szolgáltatás | URL |
|-------------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001 |
| Keycloak | http://localhost:8080 |
| Admin felület | http://localhost:5173/admin |

### Egyéb npm parancsok

```bash
npm run build    # production build → dist/
npm run preview  # dist/ előnézet
npm run lint     # ESLint
```

---

## Kezdeti adatok

### Gyakorlatok CSV importálása

1. Indítsd el az alkalmazást és jelentkezz be az admin felületre: http://localhost:5173/admin
   (Keycloak fiók **realm-admin** jogosultsággal)
2. A **Gyakorlat hozzáadása** szekcióban válaszd a **CSV import** módot.
3. Töltsd fel a `public/Gyakorlatok.csv` fájlt.

**Kötelező CSV oszlopok** (első sor = fejléc, kis- és nagybetű mindegy):

| Oszlop | Leírás |
|--------|--------|
| `gyakorlat_nev` | Gyakorlat neve |
| `testresz_id` | Testrész azonosító (1–11, pl. `6` = vállak) |
| `tipus` | `nyujtas` vagy `erosites` |

**Opcionális oszlopok:** `leiras`, `ismetlesszam`, `video_link`
Az `id` oszlop figyelmen kívül marad — az új sorok azonosítója automatikusan növekszik.

Példa fejléc:

```csv
gyakorlat_nev,testresz_id,tipus,leiras,ismetlesszam,video_link
Vállnyújtás 1,6,nyujtas,Tedd a tenyered a falra…,10,vallnyujt1.MOV
```

A `video_link` értéknek a `public/` mappában elérhető fájlnevet kell tartalmaznia (pl. `vallnyujt1.MOV`). A videókat az admin felületen is feltöltheted.

---

## Projektstruktúra (röviden)

```
szakdolgozat/
├── src/                 # React frontend
├── backend/             # Express API
│   ├── migrations/      # SQL migrációk (program, napi sor)
│   └── index.js         # API belépési pont (port 3001)
├── public/              # Statikus fájlok, gyakorlat-videók, Gyakorlatok.csv
├── docker-compose.keycloak.yml
└── vite.config.js
```

## Hibaelhárítás

| Probléma | Megoldás |
|----------|----------|
| Belépés sikertelen | Keycloak fut-e? A `rehabology` realm és a kliens **Direct access grants** be van kapcsolva? |
| Backend nem éri el a DB-t | Ellenőrizd a `backend/.env` PG_* értékeket; a `rehab` adatbázis és a `gyakorlat` / `testresz` táblák léteznek-e. |
| CSV import hibás sor | A `testresz_id` 1–11 között legyen; a `tipus` csak `nyujtas` vagy `erosites`. |
| Videó nem jelenik meg | A fájl a `public/` mappában van-e, és a `video_link` megegyezik-e a fájlnévvel? |
| CORS hiba | A frontend `http://localhost:5173`-ról fut; a backend csak ezeket az origin-eket engedi. |
