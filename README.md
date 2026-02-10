# DRK Vereinsabstimmung

Digitales Abstimmungssystem für Vereinssitzungen des Deutschen Roten Kreuzes. Ermöglicht geheime Abstimmungen per QR-Code direkt vom Smartphone -- ohne Server, ohne Installation.

## Funktionsweise

1. **Versammlungsleiter** öffnet die App auf dem Laptop/Beamer und startet eine Sitzung
2. Ein **QR-Code** wird auf der Leinwand angezeigt
3. **Mitglieder** scannen den QR-Code mit dem Smartphone und stimmen anonym ab
4. Die **Ergebnisse** werden in Echtzeit auf dem Beamer angezeigt

## Features

- **Geheime Abstimmung** -- Stimmen werden anonym abgegeben
- **Ja / Nein / Enthaltung** oder eigene Optionen
- **Echtzeit-Ergebnisse** mit Live-Balkendiagrammen
- **Doppelabstimmungs-Schutz** -- jedes Geraet kann pro Runde nur einmal abstimmen
- **Keine Installation noetig** -- laeuft komplett im Browser
- **Kein Server noetig** -- Peer-to-Peer-Kommunikation via WebRTC (PeerJS)
- **Abstimmungshistorie** -- alle Ergebnisse der Sitzung auf einen Blick

## Demo

Gehostet auf GitHub Pages: **https://afielen.github.io/test/index.html**

## Nutzung

### Versammlungsleiter (Laptop/Beamer)

1. Seite im Browser oeffnen
2. Sitzungstitel und Anzahl der Stimmberechtigten eingeben
3. Abstimmungsthema eingeben und Abstimmung starten
4. QR-Code wird angezeigt -- Mitglieder scannen diesen
5. Abstimmung schliessen, wenn alle abgestimmt haben
6. Naechste Abstimmung starten oder Sitzung beenden

### Mitglieder (Smartphone)

1. QR-Code mit der Smartphone-Kamera scannen
2. Link im Browser oeffnen
3. Warten bis die Abstimmung gestartet wird
4. Stimme abgeben -- fertig!

## Technik

- **Einzelne HTML-Datei** -- kein Build-Prozess, keine Abhaengigkeiten
- **PeerJS** (WebRTC) fuer serverlose Echtzeit-Kommunikation
- **QR-Code-Generator** (qrcode-generator v1.4.4) direkt eingebettet
- Optimiert fuer **Chrome** (QR-Code-Darstellung in Edge eingeschraenkt)
