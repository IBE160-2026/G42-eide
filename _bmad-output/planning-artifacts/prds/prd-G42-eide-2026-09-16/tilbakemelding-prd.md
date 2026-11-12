# Tilbakemelding på PRD

| | |
|---|---|
| **Gruppe** | G42 – G42-eide |
| **PRD vurdert** | `_bmad-output/planning-artifacts/prds/prd-G42-eide-2026-09-16/prd.md` (status `final`, sist endret 2026-11-08, commit 50b403d) |
| **Dato** | 2026-11-12 |
| **Type** | Formativ tilbakemelding, ikke karakter |

## 1. Samlet inntrykk

Dette er en solid PRD med klar tese, ærlig scope og FR-er som for det meste kan bli testtilfeller. Risikoen ligger i at PRD-en er oppdatert etter arkitekturen og derfor delvis forteller *hvordan* i stedet for *hva*, og i at noen krav som styrer testing og kostnad (demo-/mock-modus, innhold sendt til ekstern leverandør) bare finnes i svarene i §9 og ikke som egne krav.

## 2. Dette fungerer godt

1. **FR-ene har testbare konsekvenser.** FR-1 til FR-4 og FR-7 lister konkrete, verifiserbare forhold, f.eks. FR-1: «validates the file's actual content (its signature), not just its extension» og FR-3: «at least 5 flashcards, at least 5 quiz questions … and at least 5 key concepts». Dette kan oversettes direkte til tester.
2. **KI-kontrollen er gjennomtenkt.** FR-4 validerer hver sidehenvisning mot de faktiske sidemarkørene og sier ærlig at det ikke beviser at siden er den beste. FR-7 behandler feil, ufullstendig og «for tynt» svar, og forbyr oppdiktet innhold. Gruppen skiller tydelig mellom det som sjekkes automatisk og det som sjekkes manuelt.
3. **Ærlig scope.** §5 og §6.2 sier hva som ikke er med og hvorfor, og SM-C1 («do not add Document types, output formats, or audience breadth … to chase impressiveness») er en reell motmetrikk. Glossaret (§3) er presist, f.eks. «Quiz … display-only».

## 3. Oversikt per dimensjon

| Dimensjon | Vurdering | Kort begrunnelse |
|---|---|---|
| Beslutningsklarhet | god | Valg og avveininger er synlige (sky-LLM vs. lokal modell, null lagring), men §9 er nå en historikk av besvarte spørsmål, ikke åpne beslutninger. |
| Substans | sterk | Ingen pynte-personas eller boilerplate-NFR-er. Grenser, språk og feilhåndtering er produktspesifikke. |
| Strategisk sammenheng | god | Tydelig tese: ett arbeidsløp, bygget og testet ende-til-ende. SM-2 og SM-3 måler prosess, ikke produktet. |
| Testbarhet | god | Sterk for FR-1–4 og FR-7. FR-5 har bare én konsekvens, og noen formuleringer er vage («clear message», «reasonably-sized»). |
| Scope og avgrensning | sterk | Eksplisitte utelatelser med begrunnelse. Phase 2 er navngitt, men ikke definert. |
| Brukbarhet for neste fase | god | ID-er er sammenhengende. Enkelte begrepsavvik og henvisninger til AD-nummer gjør PRD-en avhengig av arkitekturdokumentet. |
| Formtilpasning | god | Lett form for én bruker og én reise passer. Seksjonene §9/§10 er arbeidslogg mer enn krav. |

## 4. Viktigste forbedringer

### 4.1 Hva skjer med et element uten gyldig sidehenvisning?
- **Alvorlighet:** høy
- **Hvor:** FR-4 «a citation that isn't one of those markers is rejected rather than shown»; §9 spm. 5 «An item left with no valid page makes the whole pass invalid»; FR-7
- **Problem og hvorfor det betyr noe:** FR-4 sier bare at sitatet avvises. Hva som skjer med selve elementet står kun i et svar i §9, og FR-7 nevner ikke tilfellet som feilårsak. Dessuten sier Glossary at en Page Reference kan hefte ved en *Summary*, men FR-4 dekker bare «Flashcard, Quiz item, or Key Concept». Den som skriver stories og tester får to ulike svar.
- **Forslag:** Flytt regelen inn i kravene. For eksempel i FR-7: «If a Flashcard, Quiz item or Key Concept in a PDF Document has no valid Page Reference after validation, the pass is treated as failed and the failure state is shown (test: a mocked LLM response citing page 999 in a 12-page PDF gives the failure state, not Results).» Avgjør også om Summary har sidehenvisninger, og rett enten Glossary eller FR-4.

### 4.2 FR-5 og FR-6 er for tynne til å teste
- **Alvorlighet:** høy
- **Hvor:** FR-5 «Results are only displayed when a Generation Pass completes successfully»
- **Problem og hvorfor det betyr noe:** FR-5 har én konsekvens, og den sier ikke hva studenten faktisk ser. «Reveal action» for quiz-svar står bare i Glossary, ikke i et FR. Det blir uklart hva UI-testene skal sjekke.
- **Forslag:** Legg til konsekvenser som: «All four Result types are visible on one page after a successful pass», «Each Quiz question initially hides its answer; activating its reveal control shows the answer and the Page Reference», «Each Flashcard shows term and answer», «Page References are shown next to the item they belong to, and are absent (not blank placeholders) for plain-text Documents.»

### 4.3 Testmodus og kostnad mangler som krav
- **Alvorlighet:** høy
- **Hvor:** §8 Cost «No provider or budget has been chosen yet» (utdatert); §9 spm. 2 og 3 («README quickstart in demo mode»)
- **Problem og hvorfor det betyr noe:** Tilbakemeldingen på briefen ba om demomodus slik at appen kan kjøres uten API-nøkkel. PRD-en nevner dette bare som en bisetning i et besvart spørsmål, og §8 Cost motsier §9 (leverandør er valgt). Uten et krav blir ikke demomodus planlagt som story eller testet, og testene av FR-3/FR-4/FR-7 trenger en mock for å være gjentakbare og gratis.
- **Forslag:** Legg til et FR: «FR-8: Run in demo mode. Without an API key the app returns a stored, pre-validated response for a bundled sample PDF. Consequences: demo mode is clearly labelled in the UI; it passes through the same validation as live responses; automated tests use the same mock.» Oppdater §8 Cost med valgt leverandør og budsjettramme (USD 5–10 står nå bare i §9).

### 4.4 Personvern: innhold sendes til en tredjepart
- **Alvorlighet:** medium
- **Hvor:** §8 Privacy «Zero persistence … Processed in memory only»; FR-2 (sanitering av kursfelt)
- **Problem og hvorfor det betyr noe:** PRD-en sier at ingenting lagres, men ikke at hele dokumentteksten sendes til en ekstern LLM-leverandør, og Verification Notice handler kun om nøyaktighet. Begrunnelsen for å avvise gratisnivået (treningsvilkår) står bare i §9. FR-2 beskytter mot injeksjon via kursfeltet, men ikke mot instruksjoner inne i selve dokumentet.
- **Forslag:** Utvid FR-6 eller legg til en konsekvens: «Before upload, the student is told that the Document text is sent to an external LLM provider.» Legg til i FR-3: «Instructions that appear inside the Document text are treated as content, not as instructions» (testes med en PDF som inneholder «ignore previous instructions»).

### 4.5 SM-1 er én lang setning, og primærbrukeren er fortsatt abstrakt
- **Alvorlighet:** medium
- **Hvor:** SM-1 («Functional completion bar — …»); §2.3 UJ-1 «The student, studying for an upcoming exam …»
- **Problem og hvorfor det betyr noe:** SM-1 samler åtte-ni betingelser i ett punkt, så det er uklart hvilken som feilet når målet ikke nås. SM-2 og SM-3 er selvvurderte. UJ-1 har ingen navngitt hovedperson, og feilreisen (avvist fil, mislykket pass) er bare «edge cases». Briefens råd om en konkret medstudent er bare delvis fulgt.
- **Forslag:** Del SM-1 i SM-1a (generering: 5/5/5 + sammendrag), SM-1b (sidehenvisninger), SM-1c (avvisning før LLM-kall) og SM-1d (feiltilstander), hver knyttet til sine FR-er og et navngitt testdokument. Gi UJ-1 en kort, konkret hovedperson (for eksempel en logistikkstudent som skal repetere tre forelesninger i ett navngitt emne), og vurder UJ-2 for «dokumentet avvises eller generering feiler».

## 5. Mekaniske funn

- **FR-ID-er og SM-ID-er** er sammenhengende (FR-1–FR-7, SM-1–3, SM-C1, UJ-1). Alle krysshenvisninger jeg fulgte, løser seg.
- **§10 Assumptions index** peker på en «inline assumption from §4.1 FR-1» som ikke lenger står inline (FR-1 henviser nå til AD-14). Fjern oppføringen eller legg tilbake taggen.
- **Henvisninger til arkitektur** (AD-14, AD-5, AD-15 osv.) i en PRD gjør den avhengig av et nedstrøms dokument. Gjengi tallene (80 sider, 200 000 tegn, 60 000 tokens) i FR-1 i stedet for bare i §9.
- **Begrepsavvik:** «Flashcard» / «Flashcard Set», og «Quiz item» / «quiz questions» brukes om hverandre. «Phase 2» er ikke definert i Glossary.
- **Vage formuleringer å gjøre målbare:** «clear message», «times out» (hvor mange sekunder?), «reasonably-sized» (hva er referansedokumentet?).

## 6. Før dere går videre

**Må avklares før videre UX, arkitektur og epics (om de ikke allerede er gjort):**
- Regelen for manglende/ugyldig sidehenvisning (4.1) og om Summary har sidehenvisninger.
- Om demomodus er et krav (4.3), siden det påvirker arkitektur og testoppsett.
- Hva brukeren får vite om at innholdet sendes til en leverandør (4.4).

**Kan vente:** definisjon av Phase 2 (interaktiv quiz), eksakte tidsavbrudd, og opprydding i §9/§10.

**Oppfølging av briefen:** *Delvis.* Suksesskriteriene er gjort konkrete og testbare (5/5/5, sidehenvisninger, avvisning), og `addendum.md` finnes. Leverandør, stakk og kostnad er avklart, men bare i §9. Demomodus er ikke et krav, og primærbrukeren er fortsatt ikke en konkret medstudent.

## 7. Refleksjonsspørsmål

1. FR-3 og FR-7 sier at LLM-en aldri skal dikte opp innhold. Hvordan vil dere teste dette i praksis, med hvilke dokumenter, og hva godtar dere som «bestått» når testen ikke kan være helautomatisk?
2. Da dere oppdaterte PRD-en etter arkitekturen, hvilke beslutninger valgte dere å la stå som henvisninger til AD-ene, og hvilke ville dere ha beholdt som krav hvis arkitekturen ble byttet ut?

_Vurdert mot kvalitetsrubrikken i bmad-prd. Dette er veiledning, ikke sensur._
