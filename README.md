# links-presence-calculator

Applicazione web locale per calcolare automaticamente la percentuale di lavoro agile a partire dagli export Excel generati dal sistema LINKS.

## Cosa fa

Importa uno o più file `.xlsx` o `.xls` esportati da LINKS e calcola per ogni anno:

- **Giornate Agile** — giorni con almeno una riga `Sede = LAVORO AGILE`
- **Giornate Lavorative** — giorni con sede fisica (incluso "Presso cliente") e tipologia `STANDARD` o `TRASFERTA`
- **Percentuale Agile** — `Agile / Totali × 100`
- **Proiezione** — quanti giorni in ufficio mancano per rispettare il limite massimo impostato

Le righe con tipologia `PERMESSO`, `MALATTIA`, `FERIE`, `STRAORDINARIO` o `INDENNITA TRASFERTA` sono escluse dal conteggio.

Se un giorno presenta sia righe agile sia righe in presenza (conflitto), l'app sospende l'elaborazione e chiede all'utente come classificarlo.

Stessa cosa per tipologie non riconosciute: elaborazione sospesa, il sistema mostra valore, conteggio e date coinvolte e chiede come trattarle.

Tutti i dati vengono salvati in JSON locale (`data/`). Nessun database, nessun servizio esterno, nessun dato inviato in cloud.

Le colonne `Progetto`, `Issue Jira`, `Data Inizio Progetto`, `Cliente` e `Responsabile del Contratto` presenti nei file Excel vengono ignorate automaticamente: non vengono lette, non vengono salvate, non compaiono mai nell'interfaccia.

## Avvio

```bash
npm install
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

## Comandi

```bash
npm run dev        # server di sviluppo
npm run build      # build di produzione
npm run lint       # ESLint
npm test           # unit test (Jest)
npm run test:watch # Jest in watch mode
```

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- `xlsx` per la lettura dei file Excel
- JSON locale per la persistenza

## Note sui file LINKS

LINKS esporta file `.xls` in formato HTML (non binario). La libreria `xlsx` interpreta le date testuali `DD/MM/YYYY` come formato americano `MM/DD/YYYY`, causando errori di mese. Il parser gestisce questo caso rilevando i file HTML e leggendo il testo delle celle direttamente, senza affidarsi alla conversione numerica delle date.
