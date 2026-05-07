/****************************************************
 * AI AGENT — Delhi Police Constable Coaching Platform
 * Author: ShyamSthali LLP (Final Build)
 * Description:
 * Core AI engine that:
 *  - Provides hints
 *  - Gives step-by-step explanations
 *  - Tracks mistakes & weak areas
 *  - Generates AI study recommendations
 *  - Talks to the logic engine + question bank
 ****************************************************/

const AIAgent = {
    
    // Stores data for analysis
    studentProfile: {
        totalQuestions: 0,
        correct: 0,
        incorrect: 0,
        weakAreas: {},
        timeTaken: [],
        attempts: [],
    },

    /***********************
     * 1. Load a question
     ***********************/
    loadQuestion: function(subject, chapter, qIndex) {
        const qData = QuestionBank.getQuestion(subject, chapter, qIndex);
        return qData;
    },

    /****************************
     * 2. Provide Tiered Hints
     ****************************/
    getHint: function(questionObj, level) {
        if (!questionObj.hints) return "No hints available.";

        if (level === 1) {
            return questionObj.hints[0] || "No Hint 1 available.";
        }
        if (level === 2) {
            return questionObj.hints[1] || "No Hint 2 available.";
        }
        if (level === 3) {
            return questionObj.hints[2] || "No Hint 3 available.";
        }
        return "No hints available.";
    },

    /***********************************
     * 3. Evaluate an answer submission
     ***********************************/
    evaluateAnswer: function(questionObj, chosenOption, timeSpentSec) {

        // Update student profile
        this.studentProfile.totalQuestions++;
        this.studentProfile.timeTaken.push(timeSpentSec);
        this.studentProfile.attempts.push({ question: questionObj, chosen: chosenOption });

        let isCorrect = (chosenOption === questionObj.answer);

        if (isCorrect) {
            this.studentProfile.correct++;
        } else {
            this.studentProfile.incorrect++;

            // Track weak areas
            let chapKey = questionObj.chapter;
            if (!this.studentProfile.weakAreas[chapKey]) {
                this.studentProfile.weakAreas[chapKey] = 0;
            }
            this.studentProfile.weakAreas[chapKey]++;
        }

        return {
            isCorrect: isCorrect,
            correctAnswer: questionObj.answer,
            explanation: questionObj.explanation
        };
    },

    /******************************************
     * 4. AI Summary after each question
     ******************************************/
    getInstantFeedback: function(isCorrect, questionObj, timeSpentSec) {

        if (isCorrect) {
            return `👍 Correct! You solved this in ${timeSpentSec} sec.`;
        }

        // Wrong answer feedback
        let feedback = "❌ Not correct. ";

        // If time spent is too short → guessed
        if (timeSpentSec < 4) {
            feedback += "This looks like a guess. Try slowing down.";
        }

        // If time spent too long → concept issue
        if (timeSpentSec > 25) {
            feedback += "You took too long → revisit the chapter.";
        }

        // Weak area detection
        let weakCount = this.studentProfile.weakAreas[questionObj.chapter] || 0;
        if (weakCount >= 2) {
            feedback += ` Also, this topic (${questionObj.chapter}) is becoming weak.`;
        }

        return feedback;
    },

    /******************************************************
     * 5. AI-Generated Study Recommendation (Per Session)
     ******************************************************/
    generateStudyPlan: function() {

        let total = this.studentProfile.totalQuestions;
        let correct = this.studentProfile.correct;
        let accuracy = (correct / total) * 100;

        let weakAreasSorted = Object.entries(this.studentProfile.weakAreas)
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 3)
                                    .map(x => x[0]);

        // AI study plan
        return {
            accuracy: accuracy.toFixed(1) + "%",
            weakAreas: weakAreasSorted,
            recommendation: `
Your performance analysis:
• Accuracy: ${accuracy.toFixed(1)}%
• Weak Topics: ${weakAreasSorted.join(", ")}

AI Recommended Study Plan:
1. Revise the weak topics first (10-year high-frequency questions).
2. Attempt 15 practice questions from these chapters.
3. Solve 5 timed questions (≤12 sec each) to improve speed.
4. Watch voice-over explanation to improve memory retention.
            `
        };
    },

    /*********************************
     * 6. Reset for new mock test
     *********************************/
    resetSession: function() {
        this.studentProfile = {
            totalQuestions: 0,
            correct: 0,
            incorrect: 0,
            weakAreas: {},
            timeTaken: [],
            attempts: [],
        };
    },

};

export default AIAgent;
