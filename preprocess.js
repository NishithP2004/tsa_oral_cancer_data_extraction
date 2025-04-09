import mammoth from "mammoth";
import fs from "node:fs/promises"
import path from "node:path";
import { readCSV, readExcel } from "./utils.js"

const SYSTEM_PROMPT = `Extract the essential details from the provided text containing a patient’s oral cancer data. Format the output as a semi-colon separated list of key-value pairs, strictly adhering to the following structure:\nfeature1:value1;feature2:value2;… \nExample: age:40;sex:1;subsite:2;Pathology:3;… \nEnsure precise and efficient extraction by applying the given mappings accurately.`

function convertRowToCsv(row) {
    delete row["ID"]
    let csv = ""

    for(const attr of Object.keys(row)) {
        csv += `${attr}:${row[attr]};`
    }
    
    return csv.slice(0, -1)
}

async function processDocuments(format) {
    try {
        const BASE_PATH = "dataset/word_docs"
        const dataset = await readCSV("dataset/oral cancer data.csv")
        const mappings = (await fs.readFile("dataset/mappings.txt", 'utf-8')).replaceAll(/(\n){3,}/g, "\n").replaceAll(/(\t)+/g, " ").replaceAll(/(\r\n)+/g, "\n")
        const data = []

        const docs = (await fs.readdir(BASE_PATH)).filter(file => file.endsWith(".docx"))
        console.log(`[+] Found ${docs.length} documents`)

        for (let doc of docs) {
            try {
                const id = parseInt(doc.substring(0, doc.indexOf(".")), 10)
                const row = dataset.find((record) => parseInt(record["ID"], 10) === id) || {}
                
                const row_csv = convertRowToCsv(row)

                const filepath = path.resolve(BASE_PATH, doc)
                const rawText = (await mammoth.extractRawText({
                    path: filepath
                })).value
    
                const user_prompt = rawText.replaceAll(/(\n){3,}/g, "\n").replaceAll(/(\t)+/g, " ").replaceAll(/(\r\n)+/g, "\n")
                const system_prompt = `${SYSTEM_PROMPT}\nMappings: ${mappings}`
                const prompt = system_prompt + "\n" + user_prompt

                if(format === "gemini") {
                    data.push({
                        contents: [
                            {
                                role: "user",
                                parts: [
                                    {
                                        text: prompt
                                    }
                                ]
                            },
                            {
                                role: "model",
                                parts: [
                                    {
                                        text: row_csv
                                    }
                                ]
                            }
                        ]
                    })
                } else if(format === "openai") {
                    data.push({
                        messages: [
                            {
                                role: "system",
                                content: system_prompt
                            },
                            {
                                role: "user",
                                content: user_prompt
                            },
                            {
                                role: "assistant",
                                content: row_csv
                            }
                        ]
                    })
                } else {
                    data.push({
                        instruction: system_prompt,
                        input: user_prompt,
                        output: row_csv
                    })
                }
            } catch (err) {
                console.error(`[!] Error extracting text from doc (${doc}): ${err.message}`)
                continue;
            }
        }

        await fs.writeFile("output/oral_cancer_ds_train.jsonl", data.map(row => JSON.stringify(row)).join("\n"))
    } catch (err) {
        console.error("[!] Error processing documents:", err.message)
        throw err
    }
}

processDocuments(process.argv[2])