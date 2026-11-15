# G42 — Prompt & Circumstance

Gruppeprosjekt i **IBE160 Programmering med KI** ved Høgskolen i Molde, høsten 2026 (15 studiepoeng).

Repoet inneholder gruppens applikasjon og dokumentasjon av utvikling, testing og kvalitetssikring med KI.

## Medlemmer

- amma odeibea kwaasi-eide

## Kjøre prosjektet lokalt

AI Study Buddy består av en backend (FastAPI, i `backend/`) og en frontend (Next.js, i `frontend/`). Backend har nå et demo-endepunkt (`POST /api/demo`) som behandler den medfølgende eksempel-PDF-en og returnerer forhåndslagde studieresultater. Demoskjermen i frontend, opplasting og generering av egne resultater kommer i senere stories. Ingen API-nøkkel er nødvendig for å kjøre demomodusen eller testene.

### Demoresultater (midlertidige)

Demoresultatene er basert på en **MIDLERTIDIG testfixture** (`samples/demo-ai-output.json`) som er utarbeidet med hjelp fra KI-assistenten Claude Code og deretter gjennomgått, korrigert og godkjent av prosjektutvikleren.

Resultatene er **ikke hentet fra en faktisk KI-kjøring gjennom AI Study Buddys KI-integrasjon**.

Testfixturen brukes foreløpig til utvikling, testing og demonstrasjon. Den skal erstattes med resultater fra en godkjent, faktisk KI-kjøring før endelig innlevering.

Se `samples/PROVENANCE.md` for dokumentasjon av opprinnelse, gjennomgang og kildehenvisninger.

### Krav

- [uv](https://docs.astral.sh/uv/) 0.8.15
- Python 3.13 (prosjektet bruker 3.13.7, se `backend/.python-version`; `uv` kan installere den)
- Node.js 22 (prosjektet bruker 22.19.0) med npm

### Backend

```bash
cd backend
uv sync
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Backend kjører da på `http://127.0.0.1:8000`. Eksempel på miljøvariabler finnes i `backend/.env.example` (de tas i bruk i en senere story). Ikke legg inn ekte nøkler i filer som committes.

### Frontend

Åpne en ny terminal:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Frontend kjører da på `http://localhost:3000`. På Windows (PowerShell) kan du bruke `Copy-Item .env.example .env.local` i stedet for `cp`.

### Tester

```bash
cd backend
uv run pytest
```

```bash
cd frontend
npm test
```

GitHub Actions kjører begge testsettene på hver Pull Request (`.github/workflows/ci.yml`), med samme versjoner av uv, Python og Node som over, og uten hemmeligheter eller API-nøkkel.

## Kjente begrensninger

PDF-filer må begynne med «%PDF-». Filer med ekstra bytes foran denne signaturen avvises som ikke-støttet filtype.
