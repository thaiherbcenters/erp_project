const fs = require('fs');
const path = require('path');
const readline = require('readline');

const transcriptPath = 'C:\\Users\\thaih\\.gemini\\antigravity\\brain\\a5065570-f65a-425d-867d-b9921153fb61\\.system_generated\\logs\\transcript_full.jsonl';

async function processTranscript() {
    const fileStream = fs.createReadStream(transcriptPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let patches = [];
    let lastView = null;

    for await (const line of rl) {
        try {
            const data = JSON.parse(line);
            
            // Check tool calls
            if (data.tool_calls) {
                for (const tool of data.tool_calls) {
                    if ((tool.name === 'replace_file_content' || tool.name === 'multi_replace_file_content') && 
                        tool.args.TargetFile && tool.args.TargetFile.includes('Sales.jsx')) {
                        patches.push({
                            time: data.created_at,
                            type: tool.name,
                            args: tool.args
                        });
                    }
                }
            }
            
            // Check tool responses for view_file
            if (data.type === 'TOOL_RESPONSE' && data.tool_responses) {
                for (const res of data.tool_responses) {
                    if (res.name === 'view_file' && res.output && res.output.includes('Sales.jsx')) {
                        lastView = {
                            time: data.created_at,
                            output: res.output
                        };
                    }
                }
            }
        } catch (e) {
            // ignore
        }
    }

    fs.writeFileSync('c:\\Users\\thaih\\OneDrive\\เอกสาร\\GitHub\\erp_project\\sales_jsx_history.json', JSON.stringify({
        lastView,
        patches
    }, null, 2));
    console.log('Saved to sales_jsx_history.json');
}

processTranscript();
