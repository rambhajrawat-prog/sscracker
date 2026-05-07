/************************************************************
 * DP LOGIC ENGINE — Delhi Police Constable AI Platform
 * Author: ShyamSthali LLP (Final – 5 Mock Support)
 *
 * This file is PURE logic:
 *  - No direct imports
 *  - Called from each DP_Mock_TestX.html
 *
 * Functions you actually use:
 *  - DPLogicEngine.buildMockQuestions(QuestionBank, mockId)
 *  - DPLogicEngine.calculateMockScore(AIAgent)
 ************************************************************/

const DPLogicEngine = {

    /********************************************************
     * Exam Blueprint (same pattern for MOCK_TEST_1..5)
     *
     * Normalised blueprint:
     *  - GK & Current Affairs        : 40 Q
     *  - Delhi GK / Delhi Police     : 10 Q
     *  - Reasoning Ability           : 25 Q
     *  - Numerical Ability (Maths)   : 15 Q
     *  - Computer Awareness          : 10 Q
     *  - Total                       : 100 Q
     ********************************************************/
    BLUEPRINTS: {
        "MOCK_TEST_1": null,
        "MOCK_TEST_2": null,
        "MOCK_TEST_3": null,
        "MOCK_TEST_4": null,
        "MOCK_TEST_5": null
    },

    _buildCommonBlueprint: function () {
        return {
            totalQuestions: 100,
            sections: [
                {
                    code: "GK_MAIN",
                    name: "GK & Current Affairs (Core India)",
                    targetCount: 40,
                    pools: [
                        { subject: "gk",     chapter: "Indian Polity" },
                        { subject: "gk",     chapter: "India Geography" },
                        { subject: "ca",     chapter: "Current Affairs" }
                    ]
                },
                {
                    code: "GK_DELHI",
                    name: "Delhi Police / Delhi GK",
                    targetCount: 10,
                    pools: [
                        { subject: "delhi_gk", chapter: "Delhi Special" }
                    ]
                },
                {
                    code: "REASONING",
                    name: "Reasoning Ability",
                    targetCount: 25,
                    pools: [
                        { subject: "reasoning", chapter: "Analogy" },
                        { subject: "reasoning", chapter: "Series" }
                    ]
                },
                {
                    code: "NUMERICAL",
                    name: "Numerical Ability",
                    targetCount: 15,
                    pools: [
                        { subject: "math", chapter: "Percentage" },
                        { subject: "math", chapter: "Number System" }
                    ]
                },
                {
                    code: "COMPUTER",
                    name: "Computer Awareness",
                    targetCount: 10,
                    pools: [
                        { subject: "computer", chapter: "Computer Basics" },
                        { subject: "computer", chapter: "Internet & Security" }
                    ]
                }
            ]
        };
    },

    getBlueprint: function (mockId) {
        const id = mockId || "MOCK_TEST_1";

        if (!this.BLUEPRINTS[id]) {
            this.BLUEPRINTS[id] = this._buildCommonBlueprint();
        }
        return this.BLUEPRINTS[id];
    },

    /****************************************************
     * Build question meta list from QuestionBank
     ****************************************************/
    buildMockQuestions: function (QuestionBank, mockId) {
        const cfg = this.getBlueprint(mockId);

        if (!cfg || !QuestionBank || !QuestionBank.questions) {
            return [];
        }

        const allMeta = [];

        cfg.sections.forEach(section => {
            const code = section.code;
            const targetCount = section.targetCount;
            const pools = section.pools;

            const candidates = [];

            pools.forEach(pool => {
                const subjObj = QuestionBank.questions[pool.subject];
                if (!subjObj) return;

                const arr = subjObj[pool.chapter];
                if (!arr || !Array.isArray(arr) || arr.length === 0) return;

                for (let i = 0; i < arr.length; i++) {
                    candidates.push({
                        subject: pool.subject,
                        chapter: pool.chapter,
                        index: i,
                        sectionCode: code
                    });
                }
            });

            if (candidates.length === 0) {
                console.warn("[DPLogicEngine] No questions found for section:", section.name);
                return;
            }

            const shuffled = candidates.slice();
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const tmp = shuffled[i];
                shuffled[i] = shuffled[j];
                shuffled[j] = tmp;
            }

            if (shuffled.length >= targetCount) {
                allMeta.push(...shuffled.slice(0, targetCount));
            } else {
                allMeta.push(...shuffled);
                let remaining = targetCount - shuffled.length;
                let idx = 0;
                while (remaining > 0 && shuffled.length > 0) {
                    allMeta.push(shuffled[idx % shuffled.length]);
                    idx++;
                    remaining--;
                }
            }
        });

        if (cfg.totalQuestions && allMeta.length > cfg.totalQuestions) {
            return allMeta.slice(0, cfg.totalQuestions);
        }

        return allMeta;
    },

    /****************************************************
     * Calculate mock result from AIAgent.studentProfile
     ****************************************************/
    calculateMockScore: function (AIAgent) {
        const p = (AIAgent && AIAgent.studentProfile) ? AIAgent.studentProfile : {};

        const totalQuestions = p.totalQuestions || 0;
        const correct = p.correct || 0;
        const incorrect = p.incorrect || 0;

        const score = correct;
        const percent = totalQuestions > 0
            ? Math.round((score / totalQuestions) * 100)
            : 0;

        const weakEntries = Object.entries(p.weakAreas || {}).sort((a, b) => b[1] - a[1]);
        const weakAreasPretty = weakEntries.map(([chapter, count]) => `${chapter} (×${count})`);
        const topWeak = weakEntries.slice(0, 3).map(([chapter]) => chapter);

        let aiPlan = null;
        if (AIAgent && typeof AIAgent.generateStudyPlan === "function") {
            try {
                aiPlan = AIAgent.generateStudyPlan();
            } catch (e) {
                console.warn("[DPLogicEngine] Error creating AI plan:", e);
            }
        }

        return {
            score,
            correct,
            incorrect,
            percent,
            weakAreas: weakAreasPretty,
            topWeakAreas: topWeak,
            aiPlan
        };
    }

};

export default DPLogicEngine;
