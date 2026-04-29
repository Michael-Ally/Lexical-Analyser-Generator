let currentLang = 'c';
let latestTokens = [];


setTimeout(function() {
    let cBtn = document.querySelector('.lang-preset-btn.c');
    let cppBtn = document.querySelector('.lang-preset-btn.cpp');
    let javaBtn = document.querySelector('.lang-preset-btn.java');
    let tokenizeBtn = document.getElementById('generateBtn');
    let reportBtn = document.getElementById('reportBtn');
    let clearBtn = document.getElementById('clearInput');

    if (cBtn) {
        cBtn.addEventListener('click', function() {
            currentLang = 'c';
            loadLangPreset('c');
            // refresh banner after preset change
            updateLangBanner(detectLanguage(document.getElementById('codeArea').value), currentLang);
        });
    }

    if (cppBtn) {
        cppBtn.addEventListener('click', function() {
            currentLang = 'cpp';
            loadLangPreset('cpp');
            updateLangBanner(detectLanguage(document.getElementById('codeArea').value), currentLang);
        });
    }

    if (javaBtn) {
        javaBtn.addEventListener('click', function() {
            currentLang = 'java';
            loadLangPreset('java');
            updateLangBanner(detectLanguage(document.getElementById('codeArea').value), currentLang);
        });
    }

    if (tokenizeBtn) {
        tokenizeBtn.addEventListener('click', function() {
            tokenize();
        });
    }

    if (reportBtn) {
        reportBtn.addEventListener('click', function() {
            runDiagnostics();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            document.getElementById('codeArea').value = '';
            document.getElementById('Regular Expression').value = '';
            let table = document.getElementById('tokenTable');
            if (table) {
                while (table.rows.length > 1) {
                    table.deleteRow(1);
                }
            }
            latestTokens = [];
            resetDiagnostics();
            if (typeof visualizeRegexDFA === 'function') {
                visualizeRegexDFA();
            }
        });
    }

    // Handle input type radio buttons for file upload
    let inputTypeRadios = document.querySelectorAll('input[name="inputType"]');
    let fileInput = document.getElementById('fileInput');
    
    if (inputTypeRadios) {
        inputTypeRadios.forEach(function(radio) {
            radio.addEventListener('change', function() {
                if (this.value === 'file' && fileInput) {
                    fileInput.click();
                }
            });
        });
    }

    // Handle file input change
    if (fileInput) {
        fileInput.addEventListener('change', function(event) {
            let file = event.target.files[0];
            if (file) {
                let reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('codeArea').value = e.target.result;
                    // run detection after file load
                    updateLangBanner(detectLanguage(e.target.result), currentLang);
                };
                reader.readAsText(file);
            }
        });
    }

    // detect language as user types or pastes
    let codeArea = document.getElementById('codeArea');
    if (codeArea) {
        codeArea.addEventListener('input', function() {
            updateLangBanner(detectLanguage(this.value), currentLang);
        });
        codeArea.addEventListener('paste', function() {
         
            setTimeout(() => updateLangBanner(detectLanguage(this.value), currentLang), 50);
        });
    }
}, 100);

// Detect language by trying each lexer and counting unknown tokens
function detectLanguage(code) {
    code = (code || '').trim();
    if (!code) return null;

    let candidates = {
        c: typeof lexicalAnalyzerC === 'function' ? lexicalAnalyzerC : null,
        cpp: typeof lexicalAnalyzerCPP === 'function' ? lexicalAnalyzerCPP : null,
        java: typeof lexicalAnalyzerJava === 'function' ? lexicalAnalyzerJava : null
    };

    let results = {};
    Object.keys(candidates).forEach(function(lang) {
        let fn = candidates[lang];
        if (!fn) {
            results[lang] = {unknown: Infinity, known: 0, total: 0};
            return;
        }
        try {
            let toks = fn(code) || [];
            let total = toks.length;
            let unknown = toks.filter(function(t) { return String(t.type).toLowerCase() === 'unknown'; }).length;
            let known = total - unknown;
            results[lang] = {unknown: unknown, known: known, total: total};
        } catch (e) {
            results[lang] = {unknown: Infinity, known: 0, total: 0};
        }
    });

    tokens
    let best = null;
    let bestUnknown = Infinity;
    Object.keys(results).forEach(function(lang) {
        let r = results[lang];
        if (r.unknown < bestUnknown) {
            bestUnknown = r.unknown;
            best = lang;
        }
    });

    // if best has too many unknowns or no known tokens, treat as undetected
    if (!best || results[best].total === 0) return null;
    if (results[best].unknown > Math.floor(results[best].total * 0.25)) return null;

    return best;
}

function updateLangBanner(detectedLang, presetLang) {
    let banner = document.getElementById('langBanner');
    if (!banner) return;
    if (detectedLang === null) {
        banner.innerHTML = '<div style="color:#b91c1c; font-weight:600;">Language not detected</div>';
        return;
    }

    let label = 'Language Detected: ' + (detectedLang ? detectedLang.toUpperCase() : 'Unknown');
    if (presetLang && detectedLang !== presetLang) {
        banner.innerHTML = '<div style="color:#b91c1c; font-weight:600;">' + label + ' — preset mismatch (expected ' + presetLang.toUpperCase() + ')</div>';
    } else {
        banner.innerHTML = '<div style="color:#047857; font-weight:600;">' + label + '</div>';
    }
}

function setReportList(listId, items) {
    let list = document.getElementById(listId);

    if (!list) {
        return;
    }

    list.innerHTML = '';

    items.forEach(function(item) {
        let li = document.createElement('li');
        li.textContent = item;
        list.appendChild(li);
    });
}

function resetDiagnostics() {
    let tokenCount = document.getElementById('reportTokenCount');
    let errorCount = document.getElementById('reportErrorCount');

    if (tokenCount) {
        tokenCount.textContent = '0';
    }

    if (errorCount) {
        errorCount.textContent = '0';
    }

    setReportList('reportSummary', ['Run tokenization to generate an overview.']);
    setReportList('reportIssues', ['No lexer issues detected yet.']);
}

function runDiagnostics() {
    let code = document.getElementById('codeArea').value.trim();
    let tokens = latestTokens.slice();
    let issues = [];
    let summary = [];
    let tokenCount = document.getElementById('reportTokenCount');
    let errorCount = document.getElementById('reportErrorCount');

    if (!code && tokens.length === 0) {
        resetDiagnostics();
        return;
    }

    if (tokens.length === 0 && code) {
        if (currentLang === 'c') {
            tokens = lexicalAnalyzerC(code);
        } else if (currentLang === 'cpp') {
            tokens = lexicalAnalyzerCPP(code);
        } else if (currentLang === 'java') {
            tokens = lexicalAnalyzerJava(code);
        }
    }

    issues = tokens.filter(function(token) {
        return String(token.type).toLowerCase() === 'unknown';
    });

    summary.push('Diagnostics generated for the current source code.');
    summary.push('Detected ' + tokens.length + ' tokens using the ' + currentLang.toUpperCase() + ' lexer.');

    if (tokenCount) {
        tokenCount.textContent = String(tokens.length);
    }

    if (errorCount) {
        errorCount.textContent = String(issues.length);
    }

    setReportList('reportSummary', summary);

    if (issues.length === 0) {
        setReportList('reportIssues', ['No lexer issues detected yet.']);
        return;
    }

    setReportList('reportIssues', issues.map(function(issue) {
        return 'Unknown token "' + issue.value + '" at line ' + issue.line + '.';
    }));
}

function loadLangPreset(lang) {
    if (lang === 'c') {
        document.getElementById('Regular Expression').value = `WHITESPACE      = [ \\t\\r\\n]+

COMMENT         = //.*|/\\*[\\s\\S]*?\\*/

PREPROCESSOR    = \\#.*

KEYWORD         = \\b(auto|break|case|char|const|continue|default|do|double|else|enum|extern|
                    float|for|goto|if|int|long|register|return|short|signed|sizeof|static|
                    struct|switch|typedef|union|unsigned|void|volatile|while)\\b

IDENTIFIER      = [a-zA-Z_][a-zA-Z0-9_]*

INTEGER         = [0-9]+
FLOAT           = [0-9]*\\.[0-9]+([eE][+-]?[0-9]+)?

CHAR            = '([^'\\\\]|\\\\.)'
STRING          = "([^"\\\\]|\\\\.)*"

OPERATOR        = (==|!=|<=|>=|\\+\\+|--|\\+=|-=|\\*=|/=|%=|&&|\\|\\||<<|>>|&=|\\|=|\\^=|->|\\?|:|=|[+\\-*/%&|^~!<>])

DELIMITER       = [(){}\\[\\]]
SEMICOLON       = ;
COMMA           = ,
DOT             = \\.

ELLIPSIS        = \\.\\.\\.`;
    } else if (lang === 'cpp') {
        document.getElementById('Regular Expression').value = `WHITESPACE      = [ \\t\\r\\n]+

COMMENT         = //.*|/\\*[\\s\\S]*?\\*/

PREPROCESSOR    = \\#.*

KEYWORD         = \\b(alignas|alignof|and|and_eq|asm|auto|bitand|bitor|bool|break|case|catch|char|char16_t|char32_t|class|compl|const|constexpr|const_cast|continue|decltype|default|delete|do|double|dynamic_cast|else|enum|explicit|export|extern|false|float|for|friend|goto|if|inline|int|long|mutable|namespace|new|noexcept|not|not_eq|nullptr|operator|or|or_eq|private|protected|public|register|reinterpret_cast|return|short|signed|sizeof|static|static_assert|static_cast|struct|switch|template|this|thread_local|throw|true|try|typedef|typeid|typename|union|unsigned|using|virtual|void|volatile|wchar_t|while|xor|xor_eq)\\b

IDENTIFIER      = [a-zA-Z_][a-zA-Z0-9_]*

INTEGER         = [0-9]+
FLOAT           = [0-9]*\\.[0-9]+([eE][+-]?[0-9]+)?

CHAR            = '([^'\\\\]|\\\\.)'
STRING          = "([^"\\\\]|\\\\.)*"

OPERATOR        = (::|\\.|\\*->\\*|==|!=|<=|>=|\\+\\+|--|\\+=|-=|\\*=|/=|%=|&&|\\|\\||<<|>>|&=|\\|=|\\^=|->|\\?|:|=|[+\\-*/%&|^~!<>])

DELIMITER       = [(){}\\[\\]]
SEMICOLON       = ;
COMMA           = ,
DOT             = \\.

ELLIPSIS        = \\.\\.\\.`;
    } else if (lang === 'java') {
        document.getElementById('Regular Expression').value = `WHITESPACE      = [ \\t\\r\\n]+

COMMENT         = //.*|/\\*[\\s\\S]*?\\*/

PREPROCESSOR    = \\#.*

KEYWORD         = \\b(abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|native|new|package|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|void|volatile|while)\\b

IDENTIFIER      = [a-zA-Z_][a-zA-Z0-9_]*

INTEGER         = [0-9]+
FLOAT           = [0-9]*\\.[0-9]+([eE][+-]?[0-9]+)?

CHAR            = '([^'\\\\]|\\\\.)'
STRING          = "([^"\\\\]|\\\\.)*"

OPERATOR        = (==|!=|<=|>=|\\+\\+|--|\\+=|-=|\\*=|/=|%=|&&|\\|\\||<<|>>|>>>|&=|\\|=|\\^=|->|\\?|:|=|instanceof|[+\\-*/%&|^~!<>])

DELIMITER       = [(){}\\[\\]]
SEMICOLON       = ;
COMMA           = ,
DOT             = \\.

ELLIPSIS        = \\.\\.\\.`;
    }
}

function tokenize() {
    let code = document.getElementById('codeArea').value;
    let tokens;
    if (currentLang === 'c') {
        tokens = lexicalAnalyzerC(code);
    } else if (currentLang === 'cpp') {
        tokens = lexicalAnalyzerCPP(code);
    } else if (currentLang === 'java') {
        tokens = lexicalAnalyzerJava(code);
    }
    let table = document.getElementById('tokenTable');

    if (!table) {
        alert('Token table not found!');
        return;
    }

    // Clear table except header
    while (table.rows.length > 1) {
        table.deleteRow(1);
    }

    // Populate table with tokens
    tokens.forEach(token => {
        let row = table.insertRow();
        row.insertCell(0).textContent = token.value;
        row.insertCell(1).textContent = token.type.toUpperCase();
        row.insertCell(2).textContent = token.line;
    });

    latestTokens = tokens.slice();

    if (typeof visualizeRegexDFA === 'function') {
        visualizeRegexDFA();
    }
}
