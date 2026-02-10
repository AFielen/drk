# DRK Vereinsabstimmung

Digitales Abstimmungssystem fuer Vereinsversammlungen des Deutschen Roten Kreuzes. Ermoeglicht geheime Abstimmungen per QR-Code direkt vom Smartphone -- ohne Server, ohne Installation, vollstaendig DSGVO-konform.

## Live-Demo

Gehostet auf GitHub Pages: **https://afielen.github.io/drk/index.html**

## Funktionsweise

1. **Versammlungsleiter** oeffnet die App auf dem Laptop/Beamer und startet eine Versammlung
2. Ein **QR-Code** wird auf der Leinwand angezeigt
3. **Mitglieder** scannen den QR-Code mit dem Smartphone und stimmen anonym ab
4. Die **Ergebnisse** werden in Echtzeit auf dem Beamer angezeigt

## Features

- **Vollstaendig anonyme Abstimmung** -- es werden keinerlei persoenliche Daten erhoben oder gespeichert
- **Ja / Nein / Enthaltung** oder frei definierbare Optionen
- **Echtzeit-Ergebnisse** mit Live-Balkendiagrammen
- **Konfigurierbares Zeitlimit** -- einstellbar pro Versammlung, pro Abstimmung ein-/ausschaltbar
- **Doppelabstimmungs-Schutz** -- mehrstufig (Browser-Fingerprinting, localStorage, Presenter-Pruefung)
- **Zwei Abstimmungsmodi** -- Offener Modus und Stimmkarten-Modus (Token-basiert)
- **PDF-Protokoll-Export** -- professionell gestaltetes Protokoll mit DRK-Branding, farbigen Ergebnisbalken und Seitenzahlen (jsPDF)
- **Automatische Reconnect-Logik** -- bei Verbindungsabbruch verbinden sich Teilnehmer-Geraete automatisch neu (Exponential Backoff, bis zu 5 Versuche)
- **Heartbeat/Keep-Alive** -- kontinuierliche Verbindungsueberwachung zwischen Teilnehmern und Versammlungsleiter
- **Bestaetigungsdialog** -- Sicherheitsabfrage vor dem Beenden einer Versammlung mit optionalem PDF-Export
- **Tab-Schutz** -- Warnung beim versehentlichen Schliessen des Browsers waehrend einer aktiven Versammlung
- **Abstimmungshistorie** -- alle Ergebnisse der Versammlung auf einen Blick
- **Danke-Seite** -- nach Versammlungsende mit Statistik-Uebersicht
- **Keine Installation noetig** -- laeuft komplett im Browser
- **Kein Server noetig** -- Peer-to-Peer-Kommunikation via WebRTC (PeerJS)
- **Kryptografisch sichere Session-IDs** -- Peer-IDs werden mit `crypto.getRandomValues()` erzeugt (16 Zeichen, 2^64 Moeglichkeiten)
- **Lokal gehostete Schriftarten** -- kein Laden von Google Fonts, DSGVO-konform

## Datenschutz und Anonymitaet

- **Keine Registrierung, kein Login** -- Mitglieder scannen einfach den QR-Code und stimmen ab
- **Keine Datenbank, kein Server** -- die gesamte Kommunikation laeuft direkt zwischen den Geraeten (Peer-to-Peer via WebRTC)
- **Keine Zuordnung von Stimmen zu Personen** -- der Versammlungsleiter sieht ausschliesslich die aggregierten Ergebnisse (z.B. "5x Ja, 3x Nein"), niemals wer wie abgestimmt hat
- **Keine persistente Datenspeicherung** -- nach Beenden der Versammlung oder Schliessen des Browsers sind alle Daten unwiederbringlich weg
- **Kein Tracking, keine Cookies, keine Analyse-Tools**
- **Keine externen Schriftarten** -- alle Fonts werden lokal ausgeliefert (kein Google Fonts)
- **Open Source** -- der gesamte Quellcode ist einsehbar und ueberpruefbar

Eine ausfuehrliche Datenschutzerklaerung ist in der App unter [datenschutz.html](datenschutz.html) verfuegbar.

## Nutzung

### Offener Modus (Standard)

**Versammlungsleiter (Laptop/Beamer):**

1. Seite im Browser oeffnen
2. Versammlungstitel und Anzahl der Stimmberechtigten eingeben
3. Modus "Offener Modus" auswaehlen (Voreinstellung)
4. Abstimmungsthema eingeben und Abstimmung starten
5. QR-Code wird angezeigt -- Mitglieder scannen diesen
6. Abstimmung schliessen, wenn alle abgestimmt haben
7. Naechste Abstimmung starten oder Versammlung beenden

**Mitglieder (Smartphone):**

1. QR-Code mit der Smartphone-Kamera scannen
2. Link im Browser oeffnen
3. Warten bis die Abstimmung gestartet wird
4. Stimme abgeben -- fertig!

### Stimmkarten-Modus (Token-basiert)

Im Stimmkarten-Modus werden ein oder mehrere Geraete (Tablets/Smartphones) bereitgestellt. Jedes Mitglied authentifiziert sich mit einem persoenlichen Stimmkarten-Code.

**Versammlungsleiter (Laptop/Beamer):**

1. Seite im Browser oeffnen
2. Versammlungstitel und Anzahl der Stimmberechtigten eingeben
3. Modus "Stimmkarten-Modus" auswaehlen
4. "Token-Codes generieren" klicken -- fuer jedes Mitglied wird ein 6-stelliger Code erzeugt (z.B. `K4F-9M2`)
5. "Codes drucken" klicken -- druckbare Karten im Visitenkartenformat (3x4 pro A4-Seite)
6. Stimmkarten-Geraete ueber QR-Code verbinden
7. Abstimmung starten -- auf den Stimmkarten-Geraeten erscheint die Code-Eingabe

**Mitglieder (am Stimmkarten-Geraet):**

1. 6-stelligen Code ueber das Touch-Numpad oder die Tastatur eingeben
2. Nach Validierung: Stimme abgeben (Ja / Nein / Enthaltung oder eigene Optionen)
3. Bestaetigung wird angezeigt -- Geraet setzt sich nach 3 Sekunden automatisch zurueck
4. Geraet an die naechste Person weitergeben

**Hinweis:** Jeder Token-Code kann pro Abstimmungsrunde nur einmal verwendet werden. In der naechsten Runde ist derselbe Code erneut gueltig.

### PDF-Protokoll

Nach Abschluss der Versammlung kann ein PDF-Protokoll heruntergeladen werden. Das Protokoll enthaelt:

- Roter DRK-Kopfbalken mit "DEUTSCHES ROTES KREUZ"-Schriftzug
- Versammlungstitel, Datum und Modus
- Alle Abstimmungen mit Thema, Zeitraum und Ergebnissen
- Farbige Ergebnisbalken (Gruen fuer Ja, Rot fuer Nein, Grau fuer Enthaltung)
- Farbige Zusammenfassung pro Abstimmung (Angenommen/Abgelehnt/Gleichstand)
- Seitenzahlen auf jeder Seite

Der Export ist auch waehrend der Versammlung ueber den Button "Ergebnisse als PDF exportieren" in der Abstimmungshistorie moeglich. Beim Beenden der Versammlung wird ein Bestaetigungsdialog angezeigt, der ebenfalls den PDF-Export anbietet.

## Technik

- **Einzelne HTML-Datei** -- kein Build-Prozess noetig
- **PeerJS** (WebRTC) fuer serverlose Echtzeit-Kommunikation
- **jsPDF** (v2.5.1) fuer PDF-Protokoll-Export mit DRK-Branding
- **QR-Code-Generator** (qrcode-generator v1.4.4) direkt eingebettet
- **Browser-Fingerprinting** (Canvas, WebGL, Audio, Schriftarten, Hardware) zur Verhinderung von Mehrfachabstimmungen
- **Kryptografisch sichere IDs** -- `crypto.getRandomValues()` fuer Peer-IDs und Session-Tokens (Fallback auf Math.random)
- **Automatische Reconnect-Logik** -- Exponential Backoff (0s, 2s, 5s, 10s, 20s), Visibility-Change-Detection, Heartbeat/Keep-Alive (15s Intervall)
- **Peer-ID-Kollisionsschutz** -- bis zu 3 automatische Retries bei ID-Kollision auf dem PeerJS-Server
- **Lokal gehostete Schriftarten** (Source Sans 3, Source Serif 4) -- kein Google Fonts
- Optimiert fuer **Chrome** (QR-Code-Darstellung in Edge eingeschraenkt)

## Doppelabstimmungs-Schutz

Die App verwendet ein mehrstufiges System, um Mehrfachabstimmungen zu verhindern:

1. **Browser-Fingerprinting** -- Beim Verbinden wird ein anonymer Geraete-Hash aus verschiedenen Browser-Signalen erzeugt. Dieser Hash ist auch im Inkognito-Modus identisch.
2. **localStorage / sessionStorage** -- Zusaetzliche Absicherung fuer normale Browser-Fenster und Page Reloads.
3. **Presenter-seitige Pruefung** -- Der Versammlungsleiter-Rechner fuehrt eine eigene Liste aller bereits abgegebenen Stimmen.

**Wichtig:** Ein komplett anderer Browser (z.B. Chrome vs. Firefox) oder ein anderes Geraet erzeugt einen anderen Fingerprint -- das ist gewollt, da in diesem Fall von einer anderen Person ausgegangen wird.

## Verbindungsstabilitaet

Die App enthaelt eine umfangreiche Reconnect-Logik, die Verbindungsabbrueche automatisch behandelt:

1. **Automatische Wiederverbindung** -- Bei Verbindungsverlust startet das Teilnehmer-Geraet automatisch bis zu 5 Reconnect-Versuche mit steigenden Wartezeiten (0s, 2s, 5s, 10s, 20s).
2. **Heartbeat/Keep-Alive** -- Alle 15 Sekunden wird ein Ping/Pong zwischen Teilnehmer und Versammlungsleiter ausgetauscht. Stumme Verbindungsabbrueche werden so zuverlaessig erkannt.
3. **Visibility-Change-Detection** -- Wenn ein Teilnehmer den Browser-Tab wechselt oder das Smartphone sperrt und zurueckkehrt, wird die Verbindung sofort geprueft und bei Bedarf neu aufgebaut.
4. **Host-seitige Erkennung** -- Der Versammlungsleiter sieht in Echtzeit, wie viele Teilnehmer verbunden sind und wie viele sich gerade neu verbinden. Peers, die laenger als 60 Sekunden getrennt sind, werden automatisch bereinigt.
5. **Manueller Retry** -- Falls die automatische Wiederverbindung fehlschlaegt, kann der Teilnehmer ueber einen Button manuell einen neuen Versuch starten oder den QR-Code erneut scannen.

## Projektstruktur

```
index.html          Hauptanwendung (Presenter + Voter)
danke.html          Danke-Seite nach Versammlungsende
datenschutz.html    Datenschutzerklaerung
impressum.html      Impressum
fonts/              Lokal gehostete Schriftarten
  fonts.css         @font-face-Deklarationen
  *.woff2           Schriftarten-Dateien (Source Sans 3, Source Serif 4)
logo.png            DRK-Logo
logo.svg            DRK-Logo (SVG)
```

## Lokale Schriftarten einrichten

Die Schriftarten (Source Sans 3, Source Serif 4) muessen manuell heruntergeladen werden:

1. [Source Sans 3](https://fonts.google.com/specimen/Source+Sans+3) herunterladen
2. [Source Serif 4](https://fonts.google.com/specimen/Source+Serif+4) herunterladen
3. Die .woff2-Dateien in den `fonts/`-Ordner legen (Dateinamen siehe `fonts/fonts.css`)

## Lizenz

Open Source -- der gesamte Quellcode ist einsehbar und ueberpruefbar.

## Kontakt

DRK-Kreisverband StaedteRegion Aachen e.V.
Henry-Dunant-Platz 1, 52146 Wuerselen
E-Mail: Info@DRK-Aachen.de
Web: https://www.drk-aachen.de
