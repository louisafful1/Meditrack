import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const downloadCSV = (data, filename, metadata) => {
    if (!data || !data.length) {
        return;
    }
    // Always quote and escape double quotes in all fields
    const escapeCSVValue = (value) => {
        if (value === null || value === undefined) {
            return '""';
        }
        const stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
    };

    const headers = Object.keys(data[0]);
    const csvRows = [];

    // Add metadata lines (not quoted, for readability)
    if (metadata) {
        csvRows.push(`Facility Name:,${metadata.facilityName}`);
        csvRows.push(`Generated By:,${metadata.userName}`);
        csvRows.push(`Generated At:,${metadata.generatedAt}`);
        csvRows.push(''); // empty line
    }

    // Quote all headers
    csvRows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(","));
    // Quote all data fields
    csvRows.push(...data.map(row => headers.map(fieldName => escapeCSVValue(row[fieldName])).join(",")));
    const csv = csvRows.join("\n");

    // Add BOM for UTF-8 to help Excel recognize encoding
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.click();
    window.URL.revokeObjectURL(url);
};

export const downloadPDF = (data, title, metadata) => {
    if (!data || !data.length) {
        return;
    }
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(title, 14, 22);

    let startY = 30;

    // Add metadata text
    if (metadata) {
        doc.setFontSize(10);
        doc.text(`Facility Name: ${metadata.facilityName}`, 14, startY);
        startY += 6;
        doc.text(`Generated By: ${metadata.userName}`, 14, startY);
        startY += 6;
        doc.text(`Generated At: ${metadata.generatedAt}`, 14, startY);
        startY += 10;
        doc.setFontSize(8);
    }

    const headers = [Object.keys(data[0])];
    const rows = data.map(row => Object.values(row));
    autoTable(doc, {
        startY: startY,
        head: headers,
        body: rows,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        margin: { top: startY, left: 14, right: 14 },
        theme: 'striped',
    });
    doc.save(`${title}.pdf`);
};
