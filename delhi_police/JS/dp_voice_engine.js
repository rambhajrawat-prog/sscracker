/************************************************************
 * DP VOICE ENGINE — Delhi Police Constable AI Platform
 * Author: ShyamSthali LLP (Final Build)
 *
 * Handles:
 *  - Text → Speech for teacher-style explanations
 *  - Bilingual (Hindi / English) voice prompts
 *  - Playback of pre-recorded audio files
 *  - Generation of "teacher-like" narration scripts
 ************************************************************/

const DPVoiceEngine = {

    currentUtterance: null,

    /************************************************
     * 1. Speak Text Using Browser Speech Synthesis
     *    mode: "hi" (Hindi), "en" (English), "mix"
     ************************************************/
    speakText: function (text, mode = "mix") {
        if (!window.speechSynthesis) {
            console.warn("Speech Synthesis not supported in this browser.");
            return;
        }

        // Stop any ongoing speech
        this.stopSpeech();

        const utter = new SpeechSynthesisUtterance(text);

        // Voice selection logic (browser dependent)
        let lang = "en-IN";
        if (mode === "hi") lang = "hi-IN";
        if (mode === "en") lang = "en-IN";
        if (mode === "mix") lang = "hi-IN"; // you can adjust

        utter.lang = lang;
        utter.rate = 1;      // normal speed
        utter.pitch = 1;     // neutral pitch
        utter.volume = 1;    // full volume

        this.currentUtterance = utter;
        window.speechSynthesis.speak(utter);
    },

    /************************************************
     * 2. Stop Ongoing Speech
     ************************************************/
    stopSpeech: function () {
        if (window.speechSynthesis && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
        this.currentUtterance = null;
    },

    /************************************************
     * 3. Play Pre-Recorded Audio (Teacher Voice)
     * 
     *  - audioId: id of <audio> tag in HTML
     *    e.g. <audio id="audio_profit_loss" src="assets/audio/profit_loss_intro.mp3"></audio>
     ************************************************/
    playPreRecorded: function (audioId) {
        const audioElem = document.getElementById(audioId);
        if (!audioElem) {
            console.warn("Audio element not found:", audioId);
            return;
        }
        // Stop speech synthesis before playing audio
        this.stopSpeech();
        audioElem.currentTime = 0;
        audioElem.play();
    },

    /************************************************
     * 4. Pause Pre-Recorded Audio
     ************************************************/
    pausePreRecorded: function (audioId) {
        const audioElem = document.getElementById(audioId);
        if (!audioElem) return;
        audioElem.pause();
    },

    /************************************************
     * 5. Teacher-Style Script Generator
     * 
     *  Given a question object, generate a narration
     *  that sounds like a teacher explaining in class.
     ************************************************/
    generateTeacherScriptForQuestion: function (questionObj, mode = "mix") {
        if (!questionObj) return "";

        const q = questionObj.question || "";
        const explanation = questionObj.explanation || "";
        const chapter = questionObj.chapter || "this topic";

        // Very simple template — you can customize more later
        if (mode === "hi") {
            return `
Namaste bachcho, aaj hum "${chapter}" ka ek bahut important sawal dekh rahe hain.

Sawal hai:
${q}

Ab isko step-by-step samjhte hain.
${explanation}

Is type ke sawal Delhi Police Constable ke paper mein baar-baar repeat hote hain,
isliye is concept ko achchhi tarah yaad rakhiye.
            `;
        }

        if (mode === "en") {
            return `
Hello everyone, today we are looking at an important question from "${chapter}".

The question is:
${q}

Now, let's understand it step-by-step.
${explanation}

Questions like this are frequently asked in the Delhi Police Constable exam,
so make sure you remember this concept clearly.
            `;
        }

        // mix (Hinglish)
        return `
Namaste dosto, aaj hum "${chapter}" ka ek important question dekh rahe hain.

Question hai:
${q}

Chaliye ise step-by-step samjhte hain:
${explanation}

Iss type ke questions Delhi Police Constable exam mein baar-baar aate hain,
isliye concept ko strong rakhiye aur 2–3 baar practice kariye.
        `;
    },

    /************************************************
     * 6. Speak Teacher Script for a Question
     ************************************************/
    speakTeacherExplanation: function (questionObj, mode = "mix") {
        const script = this.generateTeacherScriptForQuestion(questionObj, mode);
        this.speakText(script, mode);
    }

};

export default DPVoiceEngine;
