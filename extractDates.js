import mammoth from "mammoth";
import fs from "node:fs/promises"
import path from "node:path";
import { readCSV } from "./utils.js";
import { createWriteStream } from "node:fs"

const stream = createWriteStream("output/logs.txt", { 'encoding': 'utf-8' })

console.log = async (msg) => {
    await stream.write(Buffer.from(msg + "\n"))
}

async function extractDates() {
    try {
        const BASE_PATH = "dataset/word_docs"
        const dataset = await readCSV("dataset/oral cancer data.csv")

        const docs = (await fs.readdir(BASE_PATH)).filter(file => file.endsWith(".docx"))
        console.log(`[+] Found ${docs.length} documents`)
        const cols = ["DOS", "dateofLR", "dateofNodalrecurrence", "lastFU"]
        const map = new Map()

        for(let doc of docs) {
            try {
                console.log(`Processing doc ${doc}`)
                const filepath = path.resolve(BASE_PATH, doc)
                const id = parseInt(doc.substring(0, doc.indexOf(".")), 10)
                const row = dataset.find((record) => parseInt(record["ID"], 10) === id) || {}

                const rawText = (await mammoth.extractRawText({
                    path: filepath
                })).value
                const regex = /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/g
                const dates = rawText.match(regex).flatMap(date => {
                    const [DD, MM, YY] = date.split(/[\/-]/) 
                    return [`${DD.padStart(2, "0")}/${MM.padStart(2, "0")}/${YY}`, `${MM.padStart(2, "0")}/${DD.padStart(2, "0")}/${YY}`, `${DD.padStart(2, "0")}/${MM.padStart(2, "0")}/${YY.slice(-2)}`, `${MM.padStart(2, "0")}/${DD.padStart(2, "0")}/${YY.slice(-2)}`, `${DD}/${MM}/${YY}`, `${MM}/${DD}/${YY}`, `${DD}/${MM}/${YY.slice(-2)}`, `${MM}/${DD}/${YY.slice(-2)}`]
                })

                console.log("Dates:" + JSON.stringify(dates))
                
                for(let feature of cols) {
                    console.log(`${feature}: ${row[feature]} - ${dates.includes(row[feature])? "Found": "Not Found"}`)
                    if(dates.includes(row[feature])) {
                        map.set(feature, map.has(feature)? map.get(feature) + 1: 1)
                    }
                }
                console.log("---")
            } catch(err) {
                console.error(`Error processing doc (${doc}):`, err.message)
                continue
            }
        }

        map.forEach((value, key) => {
            console.log(`${key}: ${value}`)
        })
    } catch(err) {
        console.error("Error extracting dates:", err.message)
    }
}

extractDates()