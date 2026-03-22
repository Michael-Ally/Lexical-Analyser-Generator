// Select elements
const radios = document.querySelectorAll('input[name="inputType"]');
const fileInput = document.getElementById('fileInput');
const codeArea = document.getElementById('codeArea');

// Handle radio button change
radios.forEach(radio => {
    radio.addEventListener('change', () => {
        if (radio.value === "file") {
            fileInput.click(); // open file picker
        }
    });
});

// Read uploaded file and display content
fileInput.addEventListener('change', function () {
    const file = this.files[0];

    if (file) {
        const reader = new FileReader();

        reader.onload = function (e) {
            codeArea.value = e.target.result;
        };

        reader.readAsText(file);
    }
});
