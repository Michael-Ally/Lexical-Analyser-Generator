function lexicalAnalyzerJava(code) {
    let tokens = [];
    let i = 0;
    let line = 1;

    const patterns = {
        whitespace: /^[ \t\r\n]+/,
        comment: /^(\/\/.*|\/\*[\s\S]*?\*\/)/,
        keyword: /^\b(abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|native|new|package|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|void|volatile|while)\b/,
        boolean: /^\b(true|false)\b/,
        null: /^\bnull\b/,
        identifier: /^[a-zA-Z_$][a-zA-Z0-9_$]*/,
        float: /^[0-9]*\.[0-9]+/,
        decimal: /^[0-9]+\.[0-9]+/,
        integer: /^[0-9]+/,
        char: /^'.*?'/,
        string: /^".*?"/,
        operator: /^(==|!=|<=|>=|\+\+|--|&&|\|\||[+\-*/%=<>!])/,
        delimiter: /^[(){}\[\];,\.]/
    };

    while (i < code.length) {
        let substring = code.slice(i);
        let matched = false;

        for (let type in patterns) {
            let match = substring.match(patterns[type]);

            if (match) {
                matched = true;
                let value = match[0];

                if (type === "whitespace") {
                    let newlineCount = (value.match(/\n/g) || []).length;
                    line += newlineCount;
                } else if (type === "comment") {
                    let newlineCount = (value.match(/\n/g) || []).length;
                    line += newlineCount;
                } else {
                    tokens.push({ type, value, line });
                }

                i += value.length;
                break;
            }
        }

        // Handle unknown characters
        if (!matched) {
            tokens.push({ type: "UNKNOWN", value: code[i], line: line });
            i++;
        }
    }

    return tokens;
}