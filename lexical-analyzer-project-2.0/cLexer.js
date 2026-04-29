function lexicalAnalyzerC(code) {
    let tokens = [];
    let i = 0;
    let line = 1;

    const patterns = {
        whitespace: /^[ \t\r\n]+/,
        comment: /^(\/\/.*|\/\*[\s\S]*?\*\/)/,
        preprocessor: /^\#.*/,
        keyword: /^\b(auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|int|long|register|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while)\b/,
        identifier: /^[a-zA-Z_][a-zA-Z0-9_]*/,
        integer: /^[0-9]+/,
        float: /^[0-9]*\.[0-9]+/,
        char: /^'([^'\\]|\\.)'/,
        string: /^"([^"\\]|\\.)*"/,
        operator: /^(==|!=|<=|>=|\+\+|--|\+=|-=|\*=|\/=|%=|&&|\|\||<<|>>|&=|\|=|\^=|->|\?|:|=|[+\-*/%&|^~!<>])/,
        delimiter: /^[(){}\[\]]/,
        semicolon: /^;/,
        comma: /^,/,
        dot: /^\./,
        ellipsis: /^\.\.\./
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

        if (!matched) {
            tokens.push({ type: "unknown", value: code[i], line });
            i++;
        }
    }

    return tokens;
}
