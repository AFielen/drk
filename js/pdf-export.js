// pdf-export.js — PDF-Protokoll-Export mit DRK-Branding

function pdfFormatTime(d){
    if(!d) return "";
    if(typeof d==="string" || typeof d==="number") d = new Date(d);
    return d.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});
}

function pdfFormatDate(d){
    if(!d) return "";
    if(typeof d==="string" || typeof d==="number") d = new Date(d);
    return d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});
}

export function generatePdf(historyData, sessionTitle, voterCount, sessionMode){
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
    var W = doc.internal.pageSize.getWidth();
    var H = doc.internal.pageSize.getHeight();
    var margin = 20;
    var y = 0;
    var maxW = W - 2*margin;
    var now = new Date();

    // Colors
    var DRK_R=227, DRK_G=6, DRK_B=19;

    function checkPage(needed){
        if(y + needed > H - 20){
            doc.addPage();
            // Red top bar on every page
            doc.setFillColor(DRK_R, DRK_G, DRK_B);
            doc.rect(0, 0, W, 3, "F");
            y = 12;
        }
    }

    // ===== PAGE 1 HEADER =====
    // Red top bar
    doc.setFillColor(DRK_R, DRK_G, DRK_B);
    doc.rect(0, 0, W, 3, "F");
    y = 10;

    // DRK Branding
    doc.setFontSize(10);
    doc.setFont("helvetica","bold");
    doc.setTextColor(DRK_R, DRK_G, DRK_B);
    doc.setCharSpace(1.5);
    doc.text("DEUTSCHES ROTES KREUZ", margin, y);
    doc.setCharSpace(0);
    y += 5;
    doc.setFontSize(9);
    doc.setFont("helvetica","normal");
    doc.setTextColor(102, 102, 102);
    y += 4;

    // Title
    doc.setFontSize(20);
    doc.setFont("helvetica","bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Abstimmungsprotokoll", margin, y);
    y += 8;

    // Session title
    doc.setFontSize(13);
    doc.setFont("helvetica","normal");
    doc.setTextColor(40, 40, 40);
    doc.text(sessionTitle || "Versammlung", margin, y);
    y += 7;

    // Metadata line
    doc.setFontSize(9);
    doc.setTextColor(153, 153, 153);
    doc.text("Erstellt am " + pdfFormatDate(now) + " um " + pdfFormatTime(now) + " Uhr | Stimmberechtigte: " + voterCount + " | Modus: " + (sessionMode==="stimmkarten"?"Stimmkarten":"Offen"), margin, y);
    y += 6;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, W-margin, y);
    y += 10;

    // ===== EACH VOTE =====
    var totalBeteiligung = 0;
    historyData.forEach(function(item, i){
        checkPage(45);

        // Topic heading in DRK red
        doc.setFontSize(12);
        doc.setFont("helvetica","bold");
        doc.setTextColor(DRK_R, DRK_G, DRK_B);
        var topicLines = doc.splitTextToSize((i+1) + ". " + item.topic, maxW);
        doc.text(topicLines, margin, y);
        y += topicLines.length * 5 + 2;

        // Description in gray italic
        if(item.description){
            doc.setFontSize(9);
            doc.setFont("helvetica","italic");
            doc.setTextColor(102, 102, 102);
            var descLines = doc.splitTextToSize(item.description, maxW);
            doc.text(descLines, margin, y);
            y += descLines.length * 4 + 2;
        }

        // Timestamp
        doc.setFontSize(9);
        doc.setFont("helvetica","normal");
        doc.setTextColor(153, 153, 153);
        var timeStr = "";
        if(item.startedAt) timeStr += pdfFormatTime(item.startedAt);
        if(item.closedAt) timeStr += " \u2013 " + pdfFormatTime(item.closedAt) + " Uhr";
        else if(timeStr) timeStr += " Uhr";
        if(timeStr){
            doc.text("Zeitraum: " + timeStr, margin, y);
            y += 5;
        }

        // Results with colored bars
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        item.options.forEach(function(opt){
            checkPage(8);
            var count = item.votes[opt]||0;
            var pct = item.totalCast>0 ? Math.round(count/item.totalCast*100) : 0;
            doc.setFont("helvetica","normal");
            doc.setTextColor(40, 40, 40);
            doc.text(opt + ":", margin + 2, y);
            doc.text(count + " (" + pct + "%)", margin + 55, y);
            // Bar background
            var barX = margin + 80;
            var barW = maxW - 82;
            doc.setFillColor(235, 235, 235);
            doc.rect(barX, y-3, barW, 4, "F");
            // Colored bar fill
            if(pct > 0){
                if(opt==="Ja") doc.setFillColor(76, 175, 80);
                else if(opt==="Nein") doc.setFillColor(DRK_R, DRK_G, DRK_B);
                else if(opt==="Enthaltung") doc.setFillColor(153, 153, 153);
                else doc.setFillColor(100, 149, 237); // custom options: cornflower blue
                doc.rect(barX, y-3, barW*(pct/100), 4, "F");
            }
            y += 6;
        });

        // Outcome summary with color
        checkPage(10);
        doc.setFontSize(9);
        doc.setFont("helvetica","bold");
        var outcomeText = "";
        if(item.outcome==="accepted"){
            outcomeText = "ANGENOMMEN";
            doc.setTextColor(DRK_R, DRK_G, DRK_B);
        } else if(item.outcome==="rejected"){
            outcomeText = "ABGELEHNT";
            doc.setTextColor(80, 80, 80);
        } else if(item.outcome==="tie"){
            outcomeText = "STIMMENGLEICHHEIT";
            doc.setTextColor(120, 120, 120);
        } else if(item.winner){
            outcomeText = "Gewinner: " + item.winner;
            doc.setTextColor(DRK_R, DRK_G, DRK_B);
        }
        doc.text("Ergebnis: " + outcomeText, margin, y);
        y += 4;
        doc.setFont("helvetica","normal");
        doc.setTextColor(100, 100, 100);
        doc.text("Abgegeben: " + item.totalCast + "/" + item.totalVoters + (item.notVoted>0 ? " | Nicht abgestimmt: " + item.notVoted : ""), margin, y);
        y += 5;

        // Divider
        doc.setDrawColor(204, 204, 204);
        doc.line(margin, y, W-margin, y);
        y += 8;

        // Track participation
        if(item.totalVoters > 0) totalBeteiligung += (item.totalCast / item.totalVoters) * 100;
    });

    // ===== SUMMARY BOX =====
    checkPage(35);
    // Gray background box
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin, y, maxW, 25, 2, 2, "F");
    y += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica","bold");
    doc.setTextColor(40, 40, 40);
    doc.text("Zusammenfassung", margin + 4, y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont("helvetica","normal");
    doc.setTextColor(80, 80, 80);
    var avgBeteiligung = historyData.length > 0 ? Math.round(totalBeteiligung / historyData.length) : 0;
    doc.text("Anzahl Abstimmungen: " + historyData.length + " | Stimmberechtigte: " + voterCount + " | Durchschnittliche Beteiligung: " + avgBeteiligung + "%", margin + 4, y);
    y += 5;
    doc.setFontSize(8);
    doc.setTextColor(153, 153, 153);
    doc.text("Dieses Protokoll wurde automatisch erstellt.", margin + 4, y);
    y += 14;

    // ===== ADD FOOTER TO ALL PAGES =====
    var totalPages = doc.getNumberOfPages();
    for(var p = 1; p <= totalPages; p++){
        doc.setPage(p);
        // Footer line
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, H - 12, W - margin, H - 12);
        // Left: branding
        doc.setFontSize(7);
        doc.setFont("helvetica","normal");
        doc.setTextColor(153, 153, 153);
        doc.text("DRK Vereinsabstimmung", margin, H - 8);
        // Right: page number
        doc.text("Seite " + p + " von " + totalPages, W - margin, H - 8, {align:"right"});
    }

    var filename = "Abstimmungsprotokoll_" + (sessionTitle||"Versammlung").replace(/[^a-zA-Z0-9\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df]/g,"_") + "_" + pdfFormatDate(now).replace(/\./g,"-") + ".pdf";
    doc.save(filename);
}