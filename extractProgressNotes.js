import mammoth from "mammoth";
import fs from "node:fs/promises"
import path from "node:path";

async function extractProgressNotes() {
    try {
        const BASE_PATH = "dataset/progess notes 101 -120"
        const regex = /Date\s*:\s*\d{2}\/\d{2}\/\d{4}\s*ProgressNotes\s*:(?:.*?(?=Date\s*:\s*\d{2}\/\d{2}\/\d{4}\s*ProgressNotes\s*:|Signed By|$))/gs

        const notes = []

        const docs = (await fs.readdir(BASE_PATH)).filter(file => file.endsWith(".docx"))
        console.log(`[+] Found ${docs.length} documents`)

        for (let doc of docs) {
            try {
                const id = parseInt(doc.substring(0, doc.indexOf(".")), 10)

                const filepath = path.resolve(BASE_PATH, doc)
                const rawText = (await mammoth.extractRawText({
                    path: filepath
                })).value
    
                const text = rawText.replaceAll(/(\n){3,}/g, "\n").replaceAll(/(\t)+/g, " ").replaceAll(/(\r\n)+/g, "\n")
                const progressNotes = text.match(regex)
                console.log("Found: " + progressNotes.length + " progress notes in " + "doc: " + id)
                notes.push(...progressNotes.map(e => ({ id, text: e})))
            } catch (err) {
                console.error(`[!] Error extracting text from doc (${doc}): ${err.message}`)
                continue;
            }
        }

        await fs.writeFile("output/progress_notes_extracted.json", JSON.stringify(Object.groupBy(notes, ({ id }) => id), null, 2))
    } catch (err) {
        console.error("[!] Error processing documents:", err.message)
        throw err
    }
}

extractProgressNotes()