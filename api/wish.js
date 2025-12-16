export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Server Config Error: API Key missing' });
        }


        const modelName = "gemini-2.5-flash-lite";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`;

        const { mode, query, persona, interpretation, outcome } = req.body;

        let promptText = "";

        // プロンプト定義
        if (mode === 'persona') {
            promptText = `あなたはTRPGの優秀なゲームマスターです。以下の条件でランダムなキャラクターと、その人が今一番叶えたい願いを生成してください。
            ## 生成ルール
            - 属性: 年齢、性別、職業など（例：10歳男子小学生、40歳会社員男性）。
            - 性格: （例：気が弱い、強欲、ロマンチスト）。
            - 願い: 具体的で切実なもの。（例：テストで100点取りたい、フランス製の高級バッグが欲しい）
            ## 出力フォーマット (JSONのみ)
            { "attribute": "属性", "personality": "性格", "true_wish": "願い" }`;
        } else if (mode === 'interpretation') {

            promptText = `あなたはドラえもんのひみつ道具「ねがい星」です。願い主の声を聞き間違えたり、言葉を曲解したりする天才です。
            
            願い主の命令: "${query}"
            
            この命令に対して、ダジャレ、同音異義語、言葉の勘違い、文脈の曲解を使って、
            あなたがどう解釈したかを答えてください。
            
            カオスな解釈であればあるほど面白いです。
            命令をダジャレ(香水→洪水)(雨→飴)(モデルガン→モデル募集の看板が「ガン！」)、聞き間違い(切手を頂戴→切って頂戴)、文脈無視で曲解し、斜め上の解釈を出してください。
            
            ## 出力フォーマット (JSONのみ)
            { "interpretation": "あなたが理解した内容" }`;
        } else if (mode === 'outcome') {
            // 曲解 + ペルソナ情報を受け取って、その人のキャラに合った現象を生成
            promptText = `あなたはドラえもんのひみつ道具「ねがい星」です。以下のように願い主の命令を解釈し、実現させることにしました。
            
            願い主の情報:
            - 属性: ${persona.attribute}
            - 性格: ${persona.personality}
            
            あなたが理解した内容: "${interpretation}"
            
            この理解に基づいて、願い主のキャラクターと状況を踏まえて、実際に何が起こったかを、具体的で詳細に説明してください。
            50文字程度で、カオスだが、その人のキャラなりの結果を生み出してください。
            
            ## 出力フォーマット (JSONのみ)
            { "outcome": "起こった現象（50文字程度）" }`;
        } else if (mode === 'reaction') {
            promptText = `あなたは願い主です。
            
            あなたの情報:
            - 属性: ${persona.attribute}
            - 性格: ${persona.personality}
            - 本来の願い: "${persona.true_wish}"
            
            ねがい星の解釈による結果: "${outcome}"
            
            この結果に対して、ショックを受けたり、予想外の展開に戸惑ったり、
            時には思わぬ喜びを感じたりしながら、素直な感想を述べてください。
            
            そして、この結果がどれくらい願いを満たしたか、満足度を0～100で評価してください。
            
            ## 出力フォーマット (JSONのみ)
            { "reaction": "感想（50文字程度）", "satisfaction_score": 数値 }`;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { response_mime_type: "application/json" }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini API Error:", errorText);

            return res.status(500).json({ error: "Gemini API Error", details: errorText });
        }

        const json = await response.json();

        if (!json.candidates || !json.candidates[0].content) {
            return res.status(500).json({ error: "AI response was empty", raw: json });
        }

        const text = json.candidates[0].content.parts[0].text;
        res.status(200).json(JSON.parse(text));

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: error.message });
    }
}



