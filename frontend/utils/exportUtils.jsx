export const downloadCSV = (data, filename) => {
    const csv = [
      Object.keys(data[0]).join(","),
      ...data.map(row => Object.values(row).join(",")),
    ].join("\n");
  
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.click();
  };
  
  export const downloadPDF = (data, title) => {
    // Use jspdf and autotable
  };
  