
let cy = cytoscape({
    container: document.getElementById('cy'),
    style: [
        {
            selector: 'node',
            style: {
                'background-color': '#1e293b',
                'label': 'data(id)',
                'color': '#f8fafc',
                'text-valign': 'center',
                'text-halign': 'center',
                'width': '40px',
                'height': '40px',
                'border-width': 2,
                'border-color': '#3b82f6'
            }
        },
        {
            selector: 'edge',
            style: {
                'width': 2,
                'line-color': '#475569',
                'target-arrow-color': '#475569',
                'target-arrow-shape': 'triangle',
                'curve-style': 'bezier',
                'label': 'data(label)',
                'font-size': '12px',
                'color': '#94a3b8',
                'text-background-opacity': 1,
                'text-background-color': '#0f172a',
                'text-margin-y': -10
            }
        },
        {
            selector: '.accept-state',
            style: { 'border-style': 'double', 'border-width': 4 }
        }
    ],
    elements: {
        nodes: [
            { data: { id: 'q0' } },
            { data: { id: 'q1' }, classes: 'accept-state' }
        ],
        edges: [
            { data: { id: 'e1', source: 'q0', target: 'q1', label: '[a-z]' } }
        ]
    },
    layout: { name: 'grid', padding: 50 }
});

document.getElementById('btn-generate').addEventListener('click', () => {
    const rules = document.getElementById('regex-input').value;
    console.log("Generating DFA for:", rules);
    

    alert("full back end not yet developed ");
});

document.getElementById('btn-scan').addEventListener('click', () => {
    const table = document.getElementById('token-results');
    
   
    const mockTokens = [
        { lex: 'while', type: 'KEYWORD', line: 1 },
        { lex: '(', type: 'PUNCTUATION', line: 1 },
        { lex: 'x', type: 'IDENTIFIER', line: 1 }
    ];

    table.innerHTML = mockTokens.map(t => `
        <tr class="result-row">
            <td class="lexeme">${t.lex}</td>
            <td class="token">${t.type}</td>
            <td class="line">${t.line}</td>
        </tr>
    `).join('');
});