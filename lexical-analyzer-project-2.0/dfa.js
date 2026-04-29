(function (global) {
    const CONCAT = "__CONCAT__";
    let latestModel = null;

    function epsilonClosure(states) {
        const stack = states.slice();
        const visited = new Set(states);

        while (stack.length) {
            const state = stack.pop();

            for (const next of state.epsilon) {
                if (!visited.has(next)) {
                    visited.add(next);
                    stack.push(next);
                }
            }
        }

        return Array.from(visited);
    }

    function move(states, symbol) {
        const result = new Set();

        for (const state of states) {
            const nextStates = state.transitions[symbol] || [];
            for (const next of nextStates) {
                result.add(next);
            }
        }

        return Array.from(result);
    }

    function stateSetKey(states) {
        return states
            .map(function (state) { return state.id; })
            .sort()
            .join(",");
    }

    function createDfaState(id, nfaStates, isAccept) {
        return {
            id: id,
            nfaStates: nfaStates,
            isAccept: Boolean(isAccept),
            transitions: {}
        };
    }

    function createStartDfaState(nfa) {
        const startSet = epsilonClosure([nfa.start]);
        const isAccept = startSet.includes(nfa.accept);
        return createDfaState("D0", startSet, isAccept);
    }

    function getSymbols(states) {
        const symbols = new Set();

        for (const state of states) {
            for (const symbol of Object.keys(state.transitions)) {
                symbols.add(symbol);
            }
        }

        return Array.from(symbols);
    }

    function parseDefinitions(rawValue) {
        const input = rawValue || "";

        if (!input.trim()) {
            return [];
        }

        const lines = input.split(/\r?\n/);
        const definitions = [];
        let current = null;

        for (const rawLine of lines) {
            const line = rawLine.trim();

            if (!line) {
                continue;
            }

            if (line.includes("=")) {
                if (current) {
                    definitions.push(current);
                }

                const parts = line.split("=");
                current = {
                    name: parts.shift().trim() || "Regular Expression",
                    regex: parts.join("=").trim()
                };
            } else if (current) {
                current.regex += line;
            } else {
                definitions.push({
                    name: "Regular Expression",
                    regex: line
                });
            }
        }

        if (current) {
            definitions.push(current);
        }

        return definitions;
    }

    function normalizeRegex(regex) {
        return (regex || "")
            .replace(/\\b/g, "")
            .replace(/(\*|\+|\?)\?/g, "$1")
            .trim();
    }

    function tokenizeRegex(regex) {
        const tokens = [];

        for (let i = 0; i < regex.length; i++) {
            const char = regex[i];

            if (/\s/.test(char)) {
                continue;
            }

            if (char === "\\") {
                if (i + 1 >= regex.length) {
                    throw new Error("Invalid Regular expression: trailing escape sequence.");
                }

                tokens.push(regex.slice(i, i + 2));
                i += 1;
                continue;
            }

            if (char === "[") {
                let end = i + 1;
                let escaped = false;

                while (end < regex.length) {
                    const current = regex[end];

                    if (escaped) {
                        escaped = false;
                    } else if (current === "\\") {
                        escaped = true;
                    } else if (current === "]") {
                        break;
                    }

                    end += 1;
                }

                if (end >= regex.length || regex[end] !== "]") {
                    throw new Error("Invalid Regular expression: unterminated character class.");
                }

                tokens.push(regex.slice(i, end + 1));
                i = end;
                continue;
            }

            tokens.push(char);
        }

        return tokens;
    }

    function isLiteralToken(token) {
        return !["|", CONCAT, "*", "+", "?", "(", ")"].includes(token);
    }

    function addConcat(tokens) {
        const result = [];
        const unaryOperators = ["*", "+", "?"];

        for (let i = 0; i < tokens.length; i++) {
            const current = tokens[i];
            const next = tokens[i + 1];
            result.push(current);

            if (!next) {
                continue;
            }

            const currentEndsTerm = isLiteralToken(current) || current === ")" || unaryOperators.includes(current);
            const nextStartsTerm = isLiteralToken(next) || next === "(";

            if (currentEndsTerm && nextStartsTerm) {
                result.push(CONCAT);
            }
        }

        return result;
    }

    function toPostfix(tokens) {
        const precedence = { "|": 1, [CONCAT]: 2, "*": 3, "+": 3, "?": 3 };
        const output = [];
        const stack = [];

        for (const token of tokens) {
            if (isLiteralToken(token)) {
                output.push(token);
                continue;
            }

            if (token === "(") {
                stack.push(token);
                continue;
            }

            if (token === ")") {
                while (stack.length && stack[stack.length - 1] !== "(") {
                    output.push(stack.pop());
                }

                if (!stack.length) {
                    throw new Error("Invalid Regular expression: mismatched parentheses.");
                }

                stack.pop();
                continue;
            }

            while (
                stack.length &&
                stack[stack.length - 1] !== "(" &&
                precedence[stack[stack.length - 1]] >= precedence[token]
            ) {
                output.push(stack.pop());
            }

            stack.push(token);
        }

        while (stack.length) {
            const next = stack.pop();

            if (next === "(") {
                throw new Error("Invalid Regular expression: mismatched parentheses.");
            }

            output.push(next);
        }

        return output;
    }

    function toPostfixTokenObjects(postfix) {
        return postfix.map(function (token) {
            if (token === CONCAT) {
                return { type: "OPERATOR", value: "." };
            }

            if (["|", "*", "+", "?"].includes(token)) {
                return { type: "OPERATOR", value: token };
            }

            return { type: "SYMBOL", value: token };
        });
    }

    function collectNfaStates(nfa) {
        const visited = new Set();
        const ordered = [];
        const stack = [nfa.start];

        while (stack.length) {
            const state = stack.pop();

            if (!state || visited.has(state.id)) {
                continue;
            }

            visited.add(state.id);
            ordered.push(state);

            Object.keys(state.transitions).forEach(function (symbol) {
                state.transitions[symbol].forEach(function (nextState) {
                    stack.push(nextState);
                });
            });

            state.epsilon.forEach(function (nextState) {
                stack.push(nextState);
            });
        }

        return ordered.sort(function (a, b) {
            return a.id.localeCompare(b.id, undefined, { numeric: true });
        });
    }

    function buildDfaWithTrace(nfa) {
        const startDfaState = createStartDfaState(nfa);
        const knownStates = {};
        const queue = [startDfaState];
        const steps = [];

        knownStates[stateSetKey(startDfaState.nfaStates)] = startDfaState;

        while (queue.length) {
            const current = queue.shift();
            const symbols = getSymbols(current.nfaStates).sort();

            symbols.forEach(function (symbol) {
                const moved = move(current.nfaStates, symbol);
                const closed = epsilonClosure(moved);

                if (!closed.length) {
                    return;
                }

                const key = stateSetKey(closed);

                if (!knownStates[key]) {
                    const id = "D" + Object.keys(knownStates).length;
                    const isAccept = closed.includes(nfa.accept);
                    const newState = createDfaState(id, closed, isAccept);

                    knownStates[key] = newState;
                    queue.push(newState);
                }

                current.transitions[symbol] = knownStates[key].id;

                steps.push({
                    from: current.id,
                    symbol: symbol,
                    move: moved.map(function (state) { return state.id; }),
                    closure: closed.map(function (state) { return state.id; }),
                    to: knownStates[key].id
                });
            });
        }

        return {
            states: Object.values(knownStates),
            steps: steps
        };
    }

    function chooseDefinition(definitions) {
        for (const definition of definitions) {
            try {
                const model = buildRegexModel(definition);
                return model;
            } catch (error) {
                continue;
            }
        }

        if (!definitions.length) {
            throw new Error("Enter a regular expression to generate the DFA.");
        }

        throw new Error("No visualizable regular definition was found in the input.");
    }

    function buildAllModels(definitions) {
        const models = [];

        for (const definition of definitions) {
            try {
                const model = buildRegexModel(definition);
                models.push(model);
            } 
            catch (error) {
                // skip definitions that can't be visualized
                continue;
            }
        }

        return models;
    }

    function populateTokenRuleSelector(models) {
    const select = document.getElementById("tokenRuleSelect");
    const toolbar = document.getElementById("tokenRuleToolbar");

    if (!select || !toolbar) {
        return;
    }


    toolbar.style.display = "flex";


    select.innerHTML = models.map(function (model) {
        return "<option value=\"" + escapeHtml(model.definition.name) + "\">" +
               escapeHtml(model.definition.name) + "</option>";
    }).join("");


    const freshSelect = select.cloneNode(true);
    select.parentNode.replaceChild(freshSelect, select);
t
    freshSelect.addEventListener("change", function () {
        const chosen = models.find(function (m) {
            return m.definition.name === freshSelect.value;
        });
        if (chosen) {
            latestModel = chosen;
            renderOverview(chosen);
            renderHiddenStage(document.getElementById("dfaStageSelect").value || "source", chosen);
        }
    });

  
        if (models.length > 0) {
            latestModel = models[0];
            renderOverview(models[0]);
            renderHiddenStage(document.getElementById("dfaStageSelect").value || "source", models[0]);
        }
    }

    function buildRegexModel(definition) {
        if (!global.TokenizerNFA) {
            throw new Error("nfa.js is not loaded.");
        }

        const cleanedRegex = normalizeRegex(definition.regex);
        if (!cleanedRegex) {
            throw new Error("The selected regular definition is empty.");
        }

        const tokens = tokenizeRegex(cleanedRegex);
        const prepared = addConcat(tokens);
        const postfix = toPostfix(prepared);
        const postfixObjects = toPostfixTokenObjects(postfix);

        global.TokenizerNFA.resetCount();
        const nfa = global.TokenizerNFA.buildFromPostfix(postfixObjects);
        const nfaStates = collectNfaStates(nfa);
        const dfa = buildDfaWithTrace(nfa);

        return {
            definition: definition,
            regex: cleanedRegex,
            tokens: tokens,
            prepared: prepared,
            postfix: postfix,
            nfa: nfa,
            nfaStates: nfaStates,
            dfaStates: dfa.states,
            dfaSteps: dfa.steps
        };
    }

    function renderPlaceholder(targetId, message, isError) {
        const container = document.getElementById(targetId);
        if (!container) {
            return;
        }

        container.innerHTML = "<div class=\"stage-empty\" style=\"color:" + (isError ? "#b91c1c" : "#64748b") + ";\">" + escapeHtml(message) + "</div>";
    }

    function createNfaElements(model) {
        const elements = [];

        elements.push({
            data: {
                id: "__nfa_start__",
                label: "Start"
            },
            classes: "entry"
        });

        elements.push({
            data: {
                id: "__nfa_entry_edge__",
                source: "__nfa_start__",
                target: model.nfa.start.id,
                label: "begin"
            },
            classes: "entry-edge"
        });

        model.nfaStates.forEach(function (state) {
            elements.push({
                data: {
                    id: state.id,
                    label: state.id
                },
                classes: state.id === model.nfa.accept.id ? "accept" : ""
            });

            Object.keys(state.transitions).forEach(function (symbol) {
                state.transitions[symbol].forEach(function (nextState, index) {
                    elements.push({
                        data: {
                            id: state.id + "-" + symbol + "-" + nextState.id + "-" + index,
                            source: state.id,
                            target: nextState.id,
                            label: symbol
                        }
                    });
                });
            });

            state.epsilon.forEach(function (nextState, index) {
                elements.push({
                    data: {
                        id: state.id + "-e-" + nextState.id + "-" + index,
                        source: state.id,
                        target: nextState.id,
                        label: "epsilon"
                    },
                    classes: "epsilon-edge"
                });
            });
        });

        return elements;
    }

    function createDfaElements(model) {
        const elements = [];

        elements.push({
            data: {
                id: "__dfa_start__",
                label: "Start"
            },
            classes: "entry"
        });

        elements.push({
            data: {
                id: "__dfa_entry_edge__",
                source: "__dfa_start__",
                target: model.dfaStates[0].id,
                label: "begin"
            },
            classes: "entry-edge"
        });

        model.dfaStates.forEach(function (state) {
            elements.push({
                data: {
                    id: state.id,
                    label: state.id,
                    detail: "{" + state.nfaStates.map(function (item) { return item.id; }).join(", ") + "}"
                },
                classes: state.isAccept ? "accept" : ""
            });

            Object.keys(state.transitions).forEach(function (symbol) {
                elements.push({
                    data: {
                        id: state.id + "-" + symbol + "-" + state.transitions[symbol],
                        source: state.id,
                        target: state.transitions[symbol],
                        label: symbol
                    }
                });
            });
        });

        return elements;
    }

    function getGraphStyle() {
        return [
            {
                selector: "node.entry",
                style: {
                    "background-color": "#dbeafe",
                    "border-width": 2,
                    "border-color": "#60a5fa",
                    "label": "data(label)",
                    "font-size": 12,
                    "font-weight": "700",
                    "text-valign": "center",
                    "text-halign": "center",
                    "width": 70,
                    "height": 70
                }
            },
            {
                selector: "node",
                style: {
                    "background-color": "#eff6ff",
                    "border-width": 3,
                    "border-color": "#2563eb",
                    "label": "data(label)",
                    "font-size": 13,
                    "font-weight": "700",
                    "text-valign": "center",
                    "text-halign": "center",
                    "width": 64,
                    "height": 64
                }
            },
            {
                selector: "node.accept",
                style: {
                    "background-color": "#dcfce7",
                    "border-color": "#16a34a",
                    "border-width": 4
                }
            },
            {
                selector: "edge.entry-edge",
                style: {
                    "width": 3,
                    "line-color": "#2563eb",
                    "target-arrow-color": "#2563eb",
                    "target-arrow-shape": "triangle",
                    "curve-style": "taxi",
                    "label": "data(label)",
                    "font-size": 12,
                    "font-weight": "700",
                    "text-background-color": "#fff",
                    "text-background-opacity": 1,
                    "text-background-padding": 3
                }
            },
            {
                selector: "edge.epsilon-edge",
                style: {
                    "line-style": "dashed",
                    "line-color": "#94a3b8",
                    "target-arrow-color": "#94a3b8",
                    "target-arrow-shape": "triangle",
                    "label": "data(label)",
                    "font-size": 11,
                    "text-background-color": "#fff",
                    "text-background-opacity": 1,
                    "text-background-padding": 2
                }
            },
            {
                selector: "edge",
                style: {
                    "width": 3,
                    "line-color": "#64748b",
                    "target-arrow-color": "#64748b",
                    "target-arrow-shape": "triangle",
                    "curve-style": "bezier",
                    "label": "data(label)",
                    "font-size": 12,
                    "font-weight": "600",
                    "text-background-color": "#fff",
                    "text-background-opacity": 1,
                    "text-background-padding": 3
                }
            }
        ];
    }

    function mountGraph(container, elements) {
        if (!global.cytoscape) {
            container.innerHTML = "<div class=\"stage-empty\">Cytoscape.js is not loaded.</div>";
            return;
        }

        global.cytoscape({
            container: container,
            elements: elements,
            style: getGraphStyle(),
            layout: {
                name: "breadthfirst",
                directed: true,
                roots: elements.some(function (item) { return item.data.id === "__dfa_start__"; }) ? ["__dfa_start__"] : ["__nfa_start__"],
                padding: 24,
                spacingFactor: 1.35,
                animate: false
            }
        });
    }

    function renderOverview(model) {
        const container = document.getElementById("states");
        if (!container) {
            return;
        }

        container.innerHTML = [
            "<div class=\"dfa-overview\">",
            "<div class=\"dfa-summary-grid\">",
    
            "</div>",
            "<div class=\"stage-graph-canvas\" id=\"dfaOverviewGraph\"></div>",
            "</div>"
        ].join("");

        mountGraph(container.querySelector("#dfaOverviewGraph"), createDfaElements(model));
    }

    function renderHiddenStageOptions(model) {
        const select = document.getElementById("dfaStageSelect");
        const panel = document.getElementById("hiddenStagePanel");
        if (!select) {
            return;
        }

        const options = [
            { value: "source", label: "Regular Expression Preparation" },
            { value: "nfa", label: "Thompson NFA" },
            { value: "subset", label: "Subset Construction Steps" },
            { value: "table", label: "DFA Transition Table" }
        ];

        select.innerHTML = options.map(function (option) {
            return "<option value=\"" + option.value + "\">" + option.label + "</option>";
        }).join("");

        if (!select.dataset.bound) {
            select.addEventListener("change", function () {
                if (latestModel) {
                    renderHiddenStage(this.value, latestModel);
                }
            });
            select.dataset.bound = "true";
        }

        if (panel) {
            panel.open = true;
        }

        renderHiddenStage(select.value || "source", model);
    }

    function renderHiddenStage(stage, model) {
        const container = document.getElementById("hiddenStates");
        if (!container) {
            return;
        }

        if (stage === "nfa") {
            container.innerHTML = "<div class=\"hidden-stage-wrap\"><div class=\"stage-section-title\">Thompson NFA</div><div class=\"stage-graph-canvas\" id=\"hiddenNfaGraph\"></div></div>";
            mountGraph(container.querySelector("#hiddenNfaGraph"), createNfaElements(model));
            return;
        }

        if (stage === "subset") {
            container.innerHTML = [
                "<div class=\"hidden-stage-wrap\">",
                "<div class=\"stage-section-title\">Subset Construction Trace</div>",
                "<ol class=\"stage-list\">",
                model.dfaSteps.map(function (step) {
                    return "<li>" +
                        escapeHtml(step.from + " --" + step.symbol + "--> " + step.to) +
                        "<br><code>move = {" + escapeHtml(step.move.join(", ")) + "} | epsilon-closure = {" + escapeHtml(step.closure.join(", ")) + "}</code></li>";
                }).join(""),
                "</ol>",
                "</div>"
            ].join("");
            return;
        }

        if (stage === "table") {
            const rows = [];

            model.dfaStates.forEach(function (state) {
                const symbols = Object.keys(state.transitions).sort();

                if (!symbols.length) {
                    rows.push("<tr><td>" + escapeHtml(state.id) + "</td><td>-</td><td>-</td><td>" + escapeHtml("{" + state.nfaStates.map(function (item) { return item.id; }).join(", ") + "}") + "</td></tr>");
                    return;
                }

                symbols.forEach(function (symbol) {
                    rows.push(
                        "<tr><td>" + escapeHtml(state.id) + "</td><td>" + escapeHtml(symbol) + "</td><td>" + escapeHtml(state.transitions[symbol]) + "</td><td>" +
                        escapeHtml("{" + state.nfaStates.map(function (item) { return item.id; }).join(", ") + "}") +
                        "</td></tr>"
                    );
                });
            });

            container.innerHTML = [
                "<div class=\"hidden-stage-wrap\">",
                "<div class=\"stage-section-title\">DFA Transition Table</div>",
                "<table class=\"stage-table\">",
                "<tr><th>State</th><th>Symbol</th><th>Next State</th><th>NFA Set</th></tr>",
                rows.join(""),
                "</table>",
                "</div>"
            ].join("");
            return;
        }

        container.innerHTML = [
            "<div class=\"hidden-stage-wrap\">",
            "<div class=\"stage-card-grid\">",
            "<div class=\"stage-card\"><strong>Rule Name</strong><span>" + escapeHtml(model.definition.name) + "</span></div>",
            "<div class=\"stage-card\"><strong>Normalized Regular Expression </strong><code>" + escapeHtml(model.regex) + "</code></div>",
            "<div class=\"stage-card\"><strong>Token Count</strong><span>" + model.tokens.length + "</span></div>",
            "<div class=\"stage-card\"><strong>Postfix</strong><code>" + escapeHtml(model.postfix.join(" ")) + "</code></div>",
            "</div>",
            "</div>"
        ].join("");
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function visualizeRegexDFA() {
        const regexInput = document.getElementById("Regular Expression");

        if (!regexInput) {
            return;
        }

        try {
            const definitions = parseDefinitions(regexInput.value);

            const allModels = buildAllModels(definitions);

            if (allModels.length === 0) {
                throw new Error("No visualizable regular definition was found in the input.");
            }

   
            populateTokenRuleSelector(allModels);

        
            renderHiddenStageOptions(latestModel);

            global.latestGeneratedDFA = latestModel;

        } catch (error) {
            latestModel = null;

            const toolbar = document.getElementById("tokenRuleToolbar");
            if (toolbar) {
                toolbar.style.display = "none";
            }

            renderPlaceholder("states", error.message || "Unable to generate DFA.");
            renderPlaceholder("hiddenStates", error.message || "Unable to generate hidden stages.", true);

            const select = document.getElementById("dfaStageSelect");
            if (select) {
                select.innerHTML = "<option value=\"\">Tokenize code to load stage options</option>";
            }
        }
    }

    global.TokenizerDFA = {
        epsilonClosure: epsilonClosure,
        move: move,
        stateSetKey: stateSetKey,
        createDfaState: createDfaState,
        createStartDfaState: createStartDfaState,
        getSymbols: getSymbols
    };

    global.visualizeRegexDFA = visualizeRegexDFA;
})(window);
