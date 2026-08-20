const fs = require('fs');
const file = 'src/pages/Operator.jsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const start = lines.findIndex(l => l.includes('const fetchTimeline = async () => {'));
if (start !== -1) {
    // The injected block is 16 lines:
    //         useEffect(() => {
    //         const fetchTimeline = async () => {
    //             if (!selectedTask) {
    // ...
    //         fetchTimeline();
    //     }, [selectedTask]);
    
    // Find where the useEffect starts (should be start - 1)
    const effectStart = start - 1;
    // Find the end of this effect block (should be around start + 14)
    const effectEnd = lines.findIndex((l, i) => i > start && l.includes('}, [selectedTask]);'));
    
    if (effectEnd !== -1) {
        // Remove from effectStart to effectEnd
        const extracted = lines.splice(effectStart, effectEnd - effectStart + 1);
        
        // Find main Operator component:
        const operatorStart = lines.findIndex(l => l.includes('export default function Operator() {'));
        
        if (operatorStart !== -1) {
            // Find the first useEffect inside Operator to insert before it
            const mainEffectStart = lines.findIndex((l, i) => i > operatorStart && l.includes('useEffect(() => {'));
            
            if (mainEffectStart !== -1) {
                // Insert the extracted lines there
                lines.splice(mainEffectStart, 0, ...extracted, '');
                fs.writeFileSync(file, lines.join('\n'), 'utf8');
                console.log('Successfully moved fetchTimeline into Operator component!');
            } else {
                console.log('Could not find useEffect in Operator component.');
            }
        } else {
            console.log('Could not find Operator component.');
        }
    } else {
        console.log('Could not find end of fetchTimeline effect.');
    }
} else {
    console.log('Could not find fetchTimeline.');
}
