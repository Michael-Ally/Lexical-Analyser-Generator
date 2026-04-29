(function (global) {
    let stateCount = 0;

    function createState(id) {
        return {
            id: id,
            transitions: {},
            epsilon: []
        };
    }

    function addTransition(from, symbol, to) {
        if (!from.transitions[symbol]) {
            from.transitions[symbol] = [];
        }

        from.transitions[symbol].push(to);
    }

    function addEpsilonTransition(from, to) {
        from.epsilon.push(to);
    }

    function createFragment(start, accept) {
        return { start: start, accept: accept };
    }

    function symbolFragment(symbol, startId, acceptId) {
        const start = createState(startId);
        const accept = createState(acceptId);
        addTransition(start, symbol, accept);
        return createFragment(start, accept);
    }

    function concatFragments(frag1, frag2) {
        addEpsilonTransition(frag1.accept, frag2.start);
        return createFragment(frag1.start, frag2.accept);
    }

    function unionFragments(first, second, startId, acceptId) {
        const start = createState(startId);
        const accept = createState(acceptId);

        addEpsilonTransition(start, first.start);
        addEpsilonTransition(start, second.start);
        addEpsilonTransition(first.accept, accept);
        addEpsilonTransition(second.accept, accept);

        return createFragment(start, accept);
    }

    function kleene(fragment, startId, acceptId) {
        const start = createState(startId);
        const accept = createState(acceptId);

        addEpsilonTransition(start, fragment.start);
        addEpsilonTransition(start, accept);
        addEpsilonTransition(fragment.accept, fragment.start);
        addEpsilonTransition(fragment.accept, accept);

        return createFragment(start, accept);
    }

    function plus(fragment, startId, acceptId) {
        const start = createState(startId);
        const accept = createState(acceptId);

        addEpsilonTransition(start, fragment.start);
        addEpsilonTransition(fragment.accept, fragment.start);
        addEpsilonTransition(fragment.accept, accept);

        return createFragment(start, accept);
    }

    function optional(fragment, startId, acceptId) {
        const start = createState(startId);
        const accept = createState(acceptId);

        addEpsilonTransition(start, fragment.start);
        addEpsilonTransition(start, accept);
        addEpsilonTransition(fragment.accept, accept);

        return createFragment(start, accept);
    }

    function nextStateId() {
        return "q" + stateCount++;
    }

    function resetCount() {
        stateCount = 0;
    }

    function buildSymbolNFA(symbol) {
        return symbolFragment(symbol, nextStateId(), nextStateId());
    }

    function buildFromPostfix(postfixTokens) {
        const stack = [];

        for (const token of postfixTokens) {
            if (token.type === "SYMBOL") {
                stack.push(buildSymbolNFA(token.value));
                continue;
            }

            if (token.value === ".") {
                const right = stack.pop();
                const left = stack.pop();
                stack.push(concatFragments(left, right));
                continue;
            }

            if (token.value === "|") {
                const right = stack.pop();
                const left = stack.pop();
                stack.push(unionFragments(left, right, nextStateId(), nextStateId()));
                continue;
            }

            if (token.value === "*") {
                const fragment = stack.pop();
                stack.push(kleene(fragment, nextStateId(), nextStateId()));
                continue;
            }

            if (token.value === "+") {
                const fragment = stack.pop();
                stack.push(plus(fragment, nextStateId(), nextStateId()));
                continue;
            }

            if (token.value === "?") {
                const fragment = stack.pop();
                stack.push(optional(fragment, nextStateId(), nextStateId()));
            }
        }

        return stack.pop();
    }

    global.TokenizerNFA = {
        createState: createState,
        addTransition: addTransition,
        addEpsilonTransition: addEpsilonTransition,
        createFragment: createFragment,
        symbolFragment: symbolFragment,
        concatFragments: concatFragments,
        unionFragments: unionFragments,
        kleene: kleene,
        plus: plus,
        optional: optional,
        nextStateId: nextStateId,
        resetCount: resetCount,
        buildSymbolNFA: buildSymbolNFA,
        buildFromPostfix: buildFromPostfix
    };
})(window);
