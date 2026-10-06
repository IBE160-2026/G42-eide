# Tilbakemelding på product brief

| | |
|---|---|
| **Gruppe** | G42 – G42-eide |
| **Product brief** | `_bmad-output/planning-artifacts/briefs/brief-G42-eide-2026-09-14/brief.md` (commit `2c10177`) |
| **Tilbakemelding fra** | Faglærer i IBE160 (utarbeidet med KI-støtte) |
| **Dato** | 2026-10-06 |

Briefen er skrevet på engelsk; tilbakemeldingen er på norsk. Briefen viser til `addendum.md` for kilder om eksisterende verktøy, men den fila finnes ikke i repoet.

## Samlet vurdering

- **Godt utgangspunkt med justeringer.** Gruppen kan gå videre og innarbeide punktene under.

**Det som er bra:**

1. Avgrensningen er bevisst og godt begrunnet for et soloprosjekt: én fil om gangen, ingen lagring, ingen innlogging, ingen chunking, og store filer avvises med en melding. Hver beslutning har en kort begrunnelse.
2. Kjerneflyten er tydelig beskrevet i fem steg (last opp → valgfrie innstillinger → tekstuttrekk og LLM-kall → sammendrag, flashcards, quiz og nøkkelbegreper → visning i nettleseren). Den er lett å bygge PRD og stories på.
3. Briefen er ærlig om begrensninger: tabeller og figurer håndteres ikke, hallusinasjon er redusert men ikke fjernet, og appen viser et synlig varsel om at innholdet er KI-generert.

**De viktigste endringene:**

1. Suksesskriteriene er for generelle til å testes («a sound, well-documented development process», «reliably get a useful summary»). Gjør dem om til konkrete «brukeren kan …»-kriterier med forventet resultat, f.eks. antall flashcards og quiz-spørsmål, og at hvert element har sidehenvisning.
2. Primærbrukeren er utvikleren selv. Det er ærlig, men gir et svakt grunnlag for design og brukertesting. Beskriv i stedet en typisk medstudent i et konkret emne, selv om du tester med egne forelesningsnotater.
3. Språkmodell, kostnad og teknologistakk er ikke valgt. Avklar dette, og planlegg hvordan sensor kan kjøre appen uten din API-nøkkel (demomodus eller tydelig oppsett med egen nøkkel).

## Vanskelighetsgrad og gjennomførbarhet

### Vurdert vanskelighetsgrad

- **Enkel**

**Sammenlignbart med:** 1) AI Study Buddy (enkel). Briefen følger dette forslaget nesten punkt for punkt, og v1 er avgrenset strammere enn forslaget (ingen lagring og ingen innlogging).

**Begrunnelse:**

| Faktor | Nivå (lav / middels / høy) | Kommentar |
|---|---|---|
| Domenelogikk – hvor mange og hvor kompliserte regler og beregninger må stemme? | Lav | Få egne regler: størrelsesgrense, valgfrie innstillinger og formatering av resultatet. |
| Datamodell – antall entiteter og relasjoner mellom dem | Lav | Ingen database. Resultatet (sammendrag, flashcards, quiz, begreper) lever bare i forespørselen. |
| Brukere, roller og innlogging | Lav | Én anonym bruker, ingen innlogging. |
| KI-funksjonalitet i appen, f.eks. kall til språkmodell, prompts i koden og håndtering av usikre svar | Middels | Ett LLM-kall som skal gi fire strukturerte resultater med sidehenvisninger. Strukturert output (f.eks. JSON) og håndtering av ufullstendige svar krever omtanke. |
| Integrasjoner og eksterne tjenester, f.eks. API-er, betaling og e-post | Middels | Én ekstern tjeneste (språkmodell-API), men leverandør er ikke valgt. |
| Sanntid, samtidighet eller flere brukere som påvirker hverandre | Lav | Ikke relevant. |
| Filhåndtering, f.eks. opplasting, PDF-lesing og eksport | Middels | PDF-tekstuttrekk med sidenummer er kjernen. Lysbilde-PDF-er gir ofte rotete tekst. |
| Sikkerhet og personvern | Lav | Ingen lagring. Innholdet sendes likevel til en ekstern språkmodell; nevn det for brukeren. |

**Hva vanskelighetsgraden betyr for dere:**

- _Enkel:_ Et enkelt prosjekt gir stor sjanse for å bli ferdig. Vanskelighetsgraden inngår likevel i vurderingen, så for å nå helt opp må dere vise mer i gjennomføringen. Det betyr særlig et gjennomarbeidet design, grundig testing, en tydelig dokumentert prosess og en README som virker. Briefen sier selv at prosessen er målet; sørg for at det synes i repoet med prompts, iterasjoner og tester.

### Gjennomførbarhet med BMAD og Claude Code

Dere skal planlegge med BMAD (product brief → PRD → arkitektur → epics og stories) og implementere med Claude Code. Vurderingen under tar hensyn til at det må være tid til hele denne flyten, og til testing, retting og README til slutt.

| Spørsmål | Vurdering (OK / risiko / stor risiko) | Kommentar |
|---|---|---|
| **Tid og omfang** – kan v1 realistisk bli ferdig og stabil i løpet av semesteret, med tid til flere iterasjoner? | OK | Omfanget er realistisk for én nybegynner, med tid til flere runder med testing og forbedring. |
| **BMAD-flyten** – er briefen konkret nok til at PRD, arkitektur og stories kan lages uten store hull, og blir det overkommelig mange stories? | OK | Kjerneflyten og designbeslutningene er konkrete. Teknologistakken må avklares i arkitekturen. Det blir et overkommelig antall stories. |
| **Egnet for Claude Code** – bruker løsningen en vanlig, godt dokumentert teknologistakk som Claude Code håndterer godt, eller krever den nisjeteknologi, spesialmaskinvare eller mye manuell konfigurasjon? | OK | En enkel webapp med filopplasting, et PDF-bibliotek og ett LLM-kall er godt dokumentert. |
| **Kontroll på KI-ens arbeid** – kan gruppen selv avgjøre om koden gjør det riktige? Krever domenet kunnskap gruppen ikke har, f.eks. avanserte beregninger eller fagregler, så er det vanskelig å kvalitetssikre. | OK | Du kjenner dine egne forelesningsnotater og kan vurdere om sammendrag og quiz er riktige. Sidehenvisningene kan kontrolleres mot PDF-en. |
| **Testbarhet** – finnes det tydelige regler og forventede resultater som tester kan skrives mot? | Risiko | Avvisning av store filer, tekstuttrekk, at resultatet har alle fire deler og at sidetall ligger innenfor dokumentet, kan testes automatisk. Dette må stå i suksesskriteriene. |
| **Kjørbar for sensor** – kan appen kjøres lokalt etter README, uten gruppens nøkler, betalte kontoer eller egen infrastruktur? | Risiko | Uten plan krever appen en nøkkel sensor ikke har. Legg inn en demomodus med lagret svar for en eksempel-PDF, eller beskriv oppsett med egen nøkkel. |
| **Avhengigheter og kostnader** – krever løsningen betalte API-er, f.eks. språkmodeller, og finnes det en plan for kostnad, testmodus eller mock-data? | Risiko | Briefen nevner kostnad som risiko, men leverandør og budsjett er ikke valgt. En mock-modus reduserer også kostnaden under utvikling. |

**Konklusjon om gjennomførbarhet:**

- **Gjennomførbart som beskrevet.**

**Forslag til justering av omfang eller vanskelighetsgrad:**

1. Vurder én utvidelse som gir mer å vise i funksjonalitet og testing når kjernen virker, f.eks. at brukeren kan ta quizen interaktivt og få poengsum, eller eksportere flashcards. Legg den som et tydelig andre trinn.
2. Be språkmodellen svare i et fast format (f.eks. JSON med felt for sidetall), og valider svaret i koden før det vises. Det gjør appen mer robust og gir gode testtilfeller.

## Hvorfor product brief er viktig for mappen

Product brief er utgangspunktet for PRD, arkitektur, stories og til slutt koden. Del 1 av mappen vurderes blant annet på om sensor kan følge en sporbar vei fra plan til ferdig app. Den vurderes også på om appen gjør det dere har beskrevet, om den er testet, om den er godt designet, og om den kan kjøres etter README. Et uklart, for stort eller for lite brief gjør alt dette vanskeligere senere. Det er mye enklere å rette nå enn sent i semesteret.

## 1. Gjennomgang av briefens deler

| Del av brief | Status | Kommentar |
|---|---|---|
| Executive Summary – er det klart hva appen er, og hvilket problem den løser? | OK | Tydelig: last opp én forelesning, få sammendrag, flashcards, quiz og nøkkelbegreper med sidehenvisning. |
| The Problem – er problemet konkret, med reelle situasjoner og brukere? | Juster | Kort og generelt. Legg til en konkret situasjon, f.eks. en student som skal repetere ti forelesninger før eksamen i et bestemt emne. |
| The Solution – beskriver løsningen brukeropplevelsen, ikke bare teknologi? | OK | Fem tydelige steg fra brukerens perspektiv. |
| What Makes This Different – er vurderingen ærlig og realistisk? | OK | Ærlig: ingen påstand om nyhet sammenlignet med Quizlet og NotebookLM. Legg til `addendum.md` som det vises til, eller fjern henvisningen. |
| Who This Serves – er primærbrukerne tydelige, og vet vi hva de trenger? | Juster | Utvikleren selv som eneste bruker gir et svakt grunnlag for design. Beskriv en konkret medstudent som primærbruker. |
| Success Criteria – kan kriteriene faktisk sjekkes eller testes? | Endre | Kriteriene handler om prosessen og om at resultatet er «useful». Legg til funksjonelle, sjekkbare kriterier, f.eks. «en PDF på 20 sider gir minst 5 flashcards og 5 quiz-spørsmål med sidetall», «en fil over grensen avvises med en forståelig melding». |
| Scope – er det klart hva som er med i første versjon, og hva som ikke er det? | OK | Tydelig MVP og en god liste over det som er utsatt. |
| Vision – henger visjonen sammen med resten uten å blåse opp omfanget? | OK | «Beyond MVP» er nøktern og uten forpliktelser. |

## 2. Utgangspunkt for del 1 av mappen

Punktene følger kriteriene i sensorveiledningen for del 1. Vektene i parentes viser hvor mye hvert kriterium teller i del 1.

| Kriterium i del 1 | Hva briefen bør legge til rette for | Status | Kommentar |
|---|---|---|---|
| **1. Prosess og KI-styring** (30 %) | Brief som er presis nok til at PRD og stories kan bygges direkte på den, slik at krav kan spores fra brief til kode. | Juster | Briefen er presis nok, men repoet har foreløpig bare én commit med briefen. Fortsett med PRD og arkitektur, og lagre prompts og KI-økter, siden prosessen er det du selv sier er målet. |
| **2. Funksjonalitet og omfang** (20 %) | Realistisk omfang for gruppen og semesteret: en tydelig kjerneflyt som kan bli ferdig og stabil, og nok innhold til å vise reell funksjonalitet. | Juster | Realistisk, men nokså lite. Planlegg én utvidelse som kan legges til når kjernen er stabil. |
| **3. Kvalitetssikring og testing** (15 %) | Suksesskriterier og funksjoner som er konkrete nok til å bli testtilfeller. | Endre | Skriv konkrete, testbare kriterier, og lag et par eksempel-PDF-er med forventet resultat. |
| **4. Design og brukeropplevelse** (10 %) | Tydelige brukere og brukssituasjoner som designet kan bygges rundt, gjerne med de viktigste skjermbildene eller flytene skissert. | Juster | Skisser opplastingssiden og resultatsiden (hvordan flashcards og quiz vises), og hvordan feil og ventetid vises. |
| **5. Kodekvalitet og arkitektur** (10 %) | Teknologivalg som er begrunnet og ikke mer komplekse enn appen trenger. | Juster | Ingen database er et godt valg. Velg språk og rammeverk, og begrunn valget i arkitekturen. |
| **6. README og kjørbarhet** (10 %) | Løsning som andre kan kjøre lokalt uten betalte kontoer, og uten tilgang til gruppens egne tjenester og nøkler. | Juster | Planlegg demomodus eller tydelig nøkkeloppsett med `.env.example`. |
| **7. Ryddighet i repoet** (5 %) | En plan for hvor hemmeligheter, testdata og dokumentasjon skal ligge. | Juster | Legg API-nøkkel i `.env` utenfor Git, og bruk eksempel-PDF-er du har lov til å dele offentlig (ikke kursmateriale med opphavsrett). |

## 3. Neste steg for gruppen

1. Skriv om suksesskriteriene til konkrete, testbare krav og beskriv en konkret primærbruker.
2. Velg språkmodell og teknologistakk, og planlegg demomodus slik at appen kan kjøres uten nøkkel.
3. Legg til det manglende `addendum.md` (eller fjern henvisningen), og gå videre til PRD.

Oppdater product brief i repoet når dere har gjort endringene, slik at historikken viser hvordan planen utviklet seg. Det er en del av prosessen sensor ser etter.
