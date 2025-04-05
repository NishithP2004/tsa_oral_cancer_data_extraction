import { readCSV } from "./utils.js";
import fs from "node:fs/promises"
import { generate_response } from "./services/ollama.js"

const BASE_PATH = "dataset/word_docs"
const dataset = await readCSV("dataset/oral cancer data.csv")

const docs = (await fs.readdir(BASE_PATH)).filter(file => file.endsWith(".docx"))
console.log(`[+] Found ${docs.length} documents`)
const cols = ["DOS", "Pathology", "Surgery", "adjRx", "age", "clinicalT8thed", "dateofLR", "dateofNodalrecurrence", "lastFU", "lateralitysurgery", "nodal8thed", "nodallevel", "pN8thed", "pt8thed", "sex", "stateFU", "subsite"]

const system_prompt = 
`
You are an expert oncologist.
Given a raw summary generated by extracting key features from a patient's historical medical records and progress notes, your task is to synthesize a coherent, grammatically accurate narrative that clearly describes the progression of oral cancer in the patient.

Present your output strictly in the following JSON format:

{
  "summary": ""
}
`

const featureValueMap = {
    "age": null,
    "sex": {
        1: "male",
        2: "female"
    },
    "subsite": {
        1: "tongue",
        2: "Buccal Mucosa",
        3: "Floor of Mouth",
        4: "alveolus",
        5: "hard palate",
        6: "Retromolar Trigone",
        7: "lips"
    },
    "Pathology": {
        1: "Well-Differentiated Squamous Cell Carcinoma",
        2: "Verrucous Carcinoma", 
        3: "Moderately Differentiated Squamous Cell Carcinoma", 
        4: "Poorly Differentiated Squamous Cell Carcinoma",
        5: "others", 
        6: "ca in situ"
    },
    "clinicalT8thed": {
        1: "T1",
        2: "T2",
        3: "T3",
        4: "T4a",
        5: "T4b"
    },
    "nodal8thed": {
        0: "No nodes",
        1: "N1",
        2: "N2a",
        3: "N2b",
        4: "N2c",
        5: "N3a", 
        6: "N3b"
    },
    "pt8thed": {
        1: "T1",
        2: "T2",
        3: "T3",
        4: "T4a",
        5: "T4b"
    },
    "pN8thed": {
        0: "N0",
        1: "N1",
        2: "N2a",
        3: "N2b",
        4: "N2c",
        5: "N3a", 
        6: "N3b"
    },
    "PNI": {
        0: "no",
        1: "yes"
    },
    "LVI": {
        0: "no",
        1: "yes"
    },
    "Margins": {
        0: "negative",
        1: "close",
        2: "positive"
    },
    "Boneinv": {
        0: "no",
        1: "yes"
    },
    "skininv": {
        0: "no",
        1: "yes"
    },
    "ENS": {
        0: "no",
        1: "yes"
    },
    "Surgery": {
        1: "Selective Neck Dissection 1-3",
        2: "Selective Neck Dissection 1-4",
        3: "Modified Radical Neck Dissection",
        4: "Radical Neck Dissection"
    },
    "lateralitysurgery": {
        1: "ipsilateral",
        2: "bilateral"
    },
    "DOS": null,
    "adjRx": {
        0: "no",
        1: "yes"
    },
    "dateofLR": null,
    "Nodalrecurrencelevel": {
        1: "ipsilateral",
        2: "contralateral"
    },
    "Nodallevel": null,
    "dateofNodalrecurrence": null,
    "lastFU": null,
    "stateFU": {
        1: "No Evidence of Disease",
        2: "Alive With Disease", 
        3: "Died With Disease", 
        4: "Dead due to other causes"
    }
}

const featureNameMap = {
    "age": "age",
    "sex": "sex",
    "subsite": "subsite",
    "Pathology": "pathology",
    "clinicalT8thed": "Clinical Tumourstaging, according to 8th Edition",
    "nodal8thed": "Nodal staging according to 8th edition",
    "pt8thed": "Pathological T staging according to Eighth edition",
    "pN8thed": "Pathological N staging According to 8, edition",
    "PNI": "Perineural Invasion",
    "LVI": "Lymphovascular Invasion",
    "Margins": "Margin status",
    "Boneinv": "Bone invasion",
    "skininv": "Skin invasion",
    "ENS": "Extracapsular Nodal Spread",
    "Surgery": "Surgery",
    "lateralitysurgery": "Laterality surgery",
    "DOS": "Date of Surgery",
    "adjRx": "Adjuvant Therapy",
    "dateofLR": "Date of Local Recurrence",
    "Nodalrecurrencelevel": "Nodal recurrence level",
    "Nodallevel": "Nodal level",
    "dateofNodalrecurrence": "Date of Nodal recurrence",
    "lastFU": "Date of Last Follow-Up",
    "stateFU": "State at Last Follow-Up"
}

function reverseMap(features) {
    let str = ""

    for(let feature of Object.keys(features))
        str += `${featureNameMap[feature]}: ${(!featureValueMap[feature])? features[feature]: featureValueMap[feature][features[feature]]} `

    return str
}

async function generateSummary(id) {
    try {
        const specific_cols = [dataset.find((record) => record["ID"] == id)].map(e => {
            const obj = {}
            for(let feature of cols) {
                obj[feature] = e[feature]
            }

            return obj
        })[0]

        const raw_summary = reverseMap(specific_cols)
        const response = (await generate_response({
            system: system_prompt,
            model: "gemma3:4b",
            prompt: raw_summary,
            temperature: 0.7,
            format: "json"
        }))

        const summary = JSON.parse(response)["summary"]
        if(!summary) 
            return generateSummary(id)
        else 
            return summary
    } catch(err) {
        console.error("Error generating summary:", err.message)
    }
}

for(let doc of docs) {
    const id = parseInt(doc.substring(0, doc.indexOf(".")), 10)
    const summary = await generateSummary(id)

    console.clear()
    console.log(`Generating Summary ${id} / ${docs.length}`)

    if (summary) {
        await fs.writeFile(`dataset/summary/${id}.txt`, summary);
    } else {
        console.error(`[!] Summary for ID ${id} is empty. File not written.`);
    }
}