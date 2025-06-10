// Function to toggle the menu on smaller screens
function toggleMenu() {
    const navbar = document.querySelector('.navbar');
    navbar.classList.toggle('show');
}

// Function to convert text to SiGML and send it to CWASA
function convertAndPlay() {
    const textBox = document.querySelector('.text-box');
    const text = textBox.value.trim();

    if (text === "") {
        alert("Please enter some text to convert.");
        return;
    }

    // Replace this with logic to generate or fetch the correct SiGML file
    const sigmlUrl = `https://yourwebsite.com/path/to/${encodeURIComponent(text)}.sigml`;

    // Update the iframe source
    const cwasaFrame = document.getElementById('cwasa-frame');
    cwasaFrame.src = `https://vh.cmp.uea.ac.uk/cwasa/player.html?sigml=${sigmlUrl}`;

    console.log("Sending text to CWASA:", text);
}

// Function to clear the text box in the home page
function clearText() {
    const textBox = document.querySelector('.text-box');
    textBox.value = "";
    console.log("Text box cleared.");
}

// Function to start speech recognition
function startSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert("Your browser does not support speech recognition.");
        return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
            const textBox = document.querySelector('.text-box');
            const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            
            recognition.onstart = function() {
                console.log("Speech recognition started. Speak now.");
            };

            recognition.onresult = function(event) {
                let transcript = event.results[0][0].transcript;
                
                // Remove trailing full stop if present
                transcript = transcript.replace(/\.$/, '').trim();
                
                textBox.value = transcript; // Display recognized text in the text box
                console.log("Recognized text:", transcript);
                playTranscript(transcript); // Automatically play the transcript
            };

            recognition.onerror = function(event) {
                console.error("Speech recognition error:", event.error);
            };

            recognition.onspeechend = function() {
                recognition.stop();
                console.log("Speech recognition stopped.");
            };

            recognition.start();
        })
        .catch(err => alert("Microphone access denied. Please enable it in your browser settings."));
}

// Function to play the transcript
async function playTranscript(transcript) {
    console.log("Transcript received:", transcript);
    // Clean the transcript by removing punctuation and extra spaces
    const cleanedTranscript = transcript.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').trim();
    const words = cleanedTranscript.split(/\s+/); // Split on any whitespace
    
    let sigmlContent = '';  // This will hold the content between <sigml> tags

    for (const word of words) {
        if (!word) continue; // Skip empty words
        
        console.log("Processing word:", word);
        let wordSigml = await getWordOrSpellingSigml(word.toLowerCase());
        if (wordSigml) {
            sigmlContent += wordSigml;
        }
    }

    // Wrap all content in a single set of <sigml> tags
    const sigmlText = '<?xml version="1.0" encoding="utf-8"?><sigml>' + sigmlContent + '</sigml>';
    console.log("Generated SiGML text:", sigmlText);
    
    // Update the SiGML textarea in the CWASA player's GUI panel
    const sigmlTextarea = document.querySelector('.txtaSiGMLText.av0');
    if (sigmlTextarea) {
        sigmlTextarea.value = sigmlText;
    } else {
        console.error("SiGML textarea not found!");
    }

    // Use CWASA.playSiGMLText() to play the SiGML data
    if (typeof CWASA !== 'undefined' && typeof CWASA.playSiGMLText === 'function') {
        CWASA.playSiGMLText(sigmlText, 0);
    } else {
        console.error("CWASA player is not initialized or playSiGMLText is not available.");
    }
}

// Function to convert text to SiGML and play it using CWASA.playSiGMLText()
async function playText() {
    const text = document.querySelector('.text-box').value.trim();

    if (text === "") {
        alert("Please enter some text to convert.");
        return;
    }

    console.log("Text to play:", text);
    // Clean the text by removing punctuation and extra spaces
    const cleanedText = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').trim();
    const words = cleanedText.split(/\s+/); // Split on any whitespace
    
    let sigmlContent = '';  // This will hold the content between <sigml> tags

    for (const word of words) {
        if (!word) continue; // Skip empty words
        
        console.log("Processing word:", word);
        let wordSigml = await getWordOrSpellingSigml(word.toLowerCase());
        if (wordSigml) {
            sigmlContent += wordSigml;
        }
    }

    // Wrap all content in a single set of <sigml> tags
    const sigmlText = '<?xml version="1.0" encoding="utf-8"?><sigml>' + sigmlContent + '</sigml>';
    console.log("Generated SiGML text:", sigmlText);

    // Update the SiGML textarea in the CWASA player's GUI panel
    const sigmlTextarea = document.querySelector('.txtaSiGMLText.av0');
    if (sigmlTextarea) {
        sigmlTextarea.value = sigmlText;
    } else {
        console.error("SiGML textarea not found!");
    }

    // Use CWASA.playSiGMLText() to play the SiGML data
    if (typeof CWASA !== 'undefined' && typeof CWASA.playSiGMLText === 'function') {
        CWASA.playSiGMLText(sigmlText, 0);
    } else {
        console.error("CWASA player is not initialized or playSiGMLText is not available.");
    }
}

// Helper function to get SIGML for a word or spell it out letter by letter
async function getWordOrSpellingSigml(word) {
    // First try to get the word as a whole
    let sigml = await fetchSiGML(word);
    if (sigml) {
        return sigml.replace(/<\/?sigml[^>]*>/g, '');
    }

    console.log(`No SIGML found for word "${word}", attempting to spell it out`);
    let spellingSigml = '';
    
    // Spell out each letter
    for (const letter of word) {
        if (/[a-z]/.test(letter)) { // Only process letters a-z
            const letterSigml = await fetchSiGML(letter);
            if (letterSigml) {
                spellingSigml += letterSigml.replace(/<\/?sigml[^>]*>/g, '');
            } else {
                console.error(`No SIGML found for letter: ${letter}`);
            }
        }
    }
    
    return spellingSigml;
}

//  fetchSiGML function to clean XML declarations
async function fetchSiGML(term) {
    try {
        const response = await fetch(`/static/SignFiles/${term}.sigml`);
        if (response.ok) {
            console.log(`Successfully fetched SiGML for: ${term}`);
            let sigml = await response.text();
            // Remove XML declaration if present
            sigml = sigml.replace(/<\?xml[^>]+\?>/, '');
            return sigml;
        } else {
            console.error(`Failed to fetch SiGML for: ${term}`);
            return '';
        }
    } catch (error) {
        console.error(`Error fetching SiGML for: ${term}`, error);
        return '';
    }
}

// Function to handle navigation
function navigateTo(page) {
    if (page === "home") {
        window.location.href = "/";
    } else if (page === "feedback") {
        window.location.href = "/feedback";
    } else if (page === "dictionary") {
        window.location.href = "https://www.dictionary.com";
    }
}

// Function to handle the rating system in the feedback page
function rate(value) {
    const stars = document.querySelectorAll('.star-rating .star');
    const ratingText = document.getElementById('ratingText');

    stars.forEach((star, index) => {
        if (index < value) {
            star.classList.add('selected');
        } else {
            star.classList.remove('selected');
        }
    });

    ratingText.textContent = `You rated: ${value} star(s)`;
    console.log(`Rating submitted: ${value}`);
}

// Function to submit feedback in the feedback page
function submitFeedback() {
    const feedbackText = document.getElementById('feedback').value.trim();
    const ratingText = document.getElementById('ratingText').textContent;

    if (feedbackText === "") {
        alert("Please provide feedback before submitting.");
        return;
    }

    console.log("Feedback submitted:", feedbackText);
    console.log("Rating:", ratingText);
    document.getElementById('feedback').value = "";

    const thankYouMessage = document.getElementById('thankYouMessage');
    thankYouMessage.style.display = "block";
}

// Add event listeners to navigation links
document.addEventListener('DOMContentLoaded', function () {
    const homeLink = document.querySelector('.navbar a[href="/"]');
    const feedbackLink = document.querySelector('.navbar a[href="/feedback"]');
    const dictionaryLink = document.querySelector('.navbar a[href="https://www.dictionary.com"]');

    if (homeLink) {
        homeLink.addEventListener('click', function (e) {
            e.preventDefault();
            navigateTo("home");
        });
    }

    if (feedbackLink) {
        feedbackLink.addEventListener('click', function (e) {
            e.preventDefault();
            navigateTo("feedback");
        });
    }

    if (dictionaryLink) {
        dictionaryLink.addEventListener('click', function (e) {
            e.preventDefault();
            navigateTo("dictionary");
        });
    }
});


