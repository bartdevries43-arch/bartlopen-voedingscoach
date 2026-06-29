# bartlopen — Voedingscoach

Persoonlijke voedingscoach in de stijl van de bartlopen-hardloopapps, maar gericht op eten.
Je vult een korte intake in, en de app stelt via de Anthropic API een compleet, persoonlijk
voedingsschema samen. Statische web-app: werkt op telefoon, laptop en iPad, en is te
"installeren" als app. Klaar voor GitHub Pages.

## Eenmalig instellen (voor de coach)
1. Open de app, tik op het tandwiel ⚙ rechtsboven.
2. Plak je Anthropic API-sleutel en sla op. De sleutel blijft lokaal op dit apparaat (localStorage).
3. Geef de app aan de hardloper; zij ziet alleen de intake en haar schema.

## Hergebruiken voor iemand anders
Kopieer deze map, vervang zo nodig `coach.jpg`, en pas bovenin `app.js` het `CONFIG`-blok aan
(naam, `storeKey` uniek maken). De vragenlijst staat als `INTAKE` in `app.js`.

## Techniek
- Vanilla JS, geen frameworks. Magma-stijl, mobiel-eerst.
- AI via `POST https://api.anthropic.com/v1/messages`, model `claude-sonnet-4-6`.
- Alles lokaal opgeslagen (intake, schema, afgevinkte boodschappen).
- Zwart-wit printbaar via de print-knop.
