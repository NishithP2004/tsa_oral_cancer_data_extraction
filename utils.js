import XLSX from "xlsx"

async function writeExcel(data, filename) {
    try {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, filename);
        XLSX.writeFile(wb, `./output/${filename}.xlsx`);
    } catch (err) {
        console.error("[!] Error writing data to Excel Sheet: " + err.message);
    }
}

async function readExcel(filename) {
    try {
        let wb = XLSX.readFile(filename);
        let sheetNames = wb.SheetNames;
        let ws = wb.Sheets[sheetNames[0]]

        return XLSX.utils.sheet_to_json(ws)

    } catch (err) {
        console.error(`Error reading file: ${filename}`)
        throw err;
    }
}


export {
    writeExcel,
    readExcel
}