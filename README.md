# DRK Vereinsabstimmung

Digitales Abstimmungssystem für Vereinssitzungen des Deutschen Roten Kreuzes. Ermöglicht geheime Abstimmungen per QR-Code direkt vom Smartphone -- ohne Server, ohne Installation.

## Funktionsweise

1. **Versammlungsleiter** öffnet die App auf dem Laptop/Beamer und startet eine Versammlung
2. Ein **QR-Code** wird auf der Leinwand angezeigt
3. **Mitglieder** scannen den QR-Code mit dem Smartphone und stimmen anonym ab
4. Die **Ergebnisse** werden in Echtzeit auf dem Beamer angezeigt

## Features

- **Vollstaendig anonyme Abstimmung** -- es werden keinerlei persoenliche Daten erhoben oder gespeichert
- **Ja / Nein / Enthaltung** oder eigene Optionen
- **Echtzeit-Ergebnisse** mit Live-Balkendiagrammen
- **Konfigurierbares Zeitlimit** -- einstellbar pro Versammlung (Standard: 5 Minuten), pro Abstimmung ein-/ausschaltbar
- **Doppelabstimmungs-Schutz** -- jedes Geraet kann pro Runde nur einmal abstimmen
- **Zwei Abstimmungsmodi** -- Offener Modus (eigenes Smartphone) und Stimmkarten-Modus (bereitgestellte Geraete mit persoenlichen Stimmkarten-Codes)
- **Keine Installation noetig** -- laeuft komplett im Browser
- **Kein Server noetig** -- Peer-to-Peer-Kommunikation via WebRTC (PeerJS)
- **Abstimmungshistorie** -- alle Ergebnisse der Versammlung auf einen Blick

## Datenschutz und Anonymitaet

- **Keine Registrierung, kein Login** -- Mitglieder scannen einfach den QR-Code und stimmen ab
- **Keine Datenbank, kein Server** -- die gesamte Kommunikation laeuft direkt zwischen den Geraeten (Peer-to-Peer via WebRTC), es werden keine Daten auf einem Server gespeichert
- **Keine Zuordnung von Stimmen zu Personen** -- der Versammlungsleiter sieht ausschliesslich die aggregierten Ergebnisse (z.B. "5x Ja, 3x Nein"), niemals wer wie abgestimmt hat
- **Keine persistente Datenspeicherung** -- nach Beenden der Versammlung oder Schliessen des Browsers sind alle Daten unwiederbringlich weg
- **Kein Tracking, keine Cookies, keine Analyse-Tools** -- die App verwendet keinerlei Tracking- oder Analysedienste
- **Open Source** -- der gesamte Quellcode ist einsehbar und ueberpruefbar

## Demo

Gehostet auf GitHub Pages: **https://afielen.github.io/drk/index.html**

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
5. "Codes drucken" klicken -- druckbare Karten im Visitenkartenformat (3x4 pro A4-Seite), zum Ausschneiden und Verteilen
6. Stimmkarten-Geraete ueber QR-Code verbinden
7. Abstimmung starten -- auf den Stimmkarten-Geraeten erscheint die Code-Eingabe

**Mitglieder (am Stimmkarten-Geraet):**

1. 6-stelligen Code ueber das Touch-Numpad oder die Tastatur eingeben
2. Nach Validierung: Stimme abgeben (Ja / Nein / Enthaltung oder eigene Optionen)
3. Bestaetigung wird angezeigt -- Geraet setzt sich nach 3 Sekunden automatisch zurueck
4. Geraet an die naechste Person weitergeben

**Hinweis:** Jeder Token-Code kann pro Abstimmungsrunde nur einmal verwendet werden. In der naechsten Runde ist derselbe Code erneut gueltig.

## Technik

- **Einzelne HTML-Datei** -- kein Build-Prozess, keine Abhaengigkeiten
- **PeerJS** (WebRTC) fuer serverlose Echtzeit-Kommunikation
- **QR-Code-Generator** (qrcode-generator v1.4.4) direkt eingebettet
- **Browser-Fingerprinting** zur Verhinderung von Mehrfachabstimmungen (auch im Inkognito-Modus)
- Optimiert fuer **Chrome** (QR-Code-Darstellung in Edge eingeschraenkt)

## Hinweis zum Doppelabstimmungs-Schutz

Die App verwendet ein mehrstufiges System, um Mehrfachabstimmungen zu verhindern:

1. **Browser-Fingerprinting** -- Beim Verbinden wird ein anonymer Geraete-Hash aus verschiedenen Browser-Signalen (Canvas, WebGL, Audio API, Bildschirm, Schriftarten, Hardware) erzeugt. Dieser Hash ist auch im Inkognito-Modus identisch und verhindert erneutes Abstimmen ueber ein privates Fenster desselben Browsers.
2. **localStorage / sessionStorage** -- Zusaetzliche Absicherung fuer normale Browser-Fenster und Page Reloads.
3. **Presenter-seitige Pruefung** -- Der Versammlungsleiter-Rechner fuehrt eine eigene Liste aller bereits abgegebenen Stimmen (nach Fingerprint und Geraete-ID).

**Wichtig:** Ein komplett anderer Browser (z.B. Chrome vs. Firefox) oder ein anderes Geraet erzeugt einen anderen Fingerprint -- das ist gewollt, da in diesem Fall von einer anderen Person ausgegangen wird. Fuer maximale Sicherheit sollte der Versammlungsleiter die Anzahl der Stimmberechtigten korrekt einstellen und die Teilnehmerzahl im Blick behalten.
