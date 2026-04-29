function lexicalAnalyzerCPP(code) {
    let tokens = [];
    let i = 0;
    let line = 1;

    const patterns = {
        whitespace: /^[ \t\r\n]+/,
        comment: /^(\/\/.*|\/\*[\s\S]*?\*\/)/,
        preprocessor: /^\#.*/,
        keyword: /^\b(alignas|alignof|and|and_eq|asm|auto|bitand|bitor|bool|break|case|catch|char|char16_t|char32_t|class|compl|const|constexpr|const_cast|continue|decltype|default|delete|do|double|dynamic_cast|else|enum|explicit|export|extern|false|float|for|friend|goto|if|inline|int|long|mutable|namespace|new|noexcept|not|not_eq|nullptr|operator|or|or_eq|private|protected|public|register|reinterpret_cast|return|short|signed|sizeof|static|static_assert|static_cast|struct|switch|template|this|thread_local|throw|true|try|typedef|typeid|typename|union|unsigned|using|virtual|void|volatile|wchar_t|while|xor|xor_eq)\b/,
        identifier: /^[a-zA-Z_][a-zA-Z0-9_]*/,
        integer: /^[0-9]+/,
        float: /^[0-9]*\.[0-9]+/,
        char: /^'([^'\\]|\\.)'/,
        string: /^"([^"\\]|\\.)*"/,
        operator: /^(::|\.\*->\*|==|!=|<=|>=|\+\+|--|\+=|-=|\*=|\/=|%=|&&|\|\||<<|>>|&=|\|=|\^=|->|\?|:|=|[+\-*/%&|^~!<>])/,
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