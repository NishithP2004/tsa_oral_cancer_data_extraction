import XLSX from "xlsx"
import fs from "node:fs/promises"

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

async function readExcel(filepath) {
    try {
        let wb = XLSX.readFile(filepath);
        let sheetNames = wb.SheetNames;
        let ws = wb.Sheets[sheetNames[0]]

        return XLSX.utils.sheet_to_json(ws)

    } catch (err) {
        console.error(`Error reading file: ${filepath}`)
        throw err;
    }
}


async function readCSV(filepath) {
    try {
        console.log(filepath)
        const lines = (await fs.readFile(filepath, "utf-8")).split("\n")
        const headers = lines.shift().split(",")
        console.log(headers)

        const data = lines.reduce((acc, line) => {
            const features = line.split(",")
            const obj = {}

            for (let i = 0; i < headers.length; i++) {
                obj[headers[i].replaceAll(/[^a-zA-Z0-9]/g, "")] = features[i]
            }

            acc.push(obj)

            return acc;
        }, [])

        await fs.writeFile("output/test.json", JSON.stringify(data, null, 2))

        return data
    } catch (err) {
        console.error(`Error reading file: ${filepath}`)
        throw err;
    }
}

export {
    writeExcel,
    readExcel,
    readCSV
}