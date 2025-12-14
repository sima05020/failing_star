// api/wish.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Server Config Error: API Key missing' });
        }

        // ▼▼▼ 修正ポイント：モデル名を「001」付きの正式名称に変更 ▼▼▼
        const modelName = "gemini-2.5-flash"; 
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`;

        const { mode, query, persona } = req.body;
        
        let promptText = "";

        // プロンプト定義
        if (mode === 'persona') {
            promptText = `あなたはTRPGの優秀なゲームマスターです。以下の要件で、ユニークなキャラクターと「その人が今、切実に叶えたい願い」をランダムに生成してください。
            ## 生成ルール
            - 属性: 年齢、性別、職業、背景（例：52歳 男性 崖っぷちラーメン屋）。
            - 性格: 特徴的に（例：極度の心配性）。
            - 真の願い: 具体的で切実なもの。
            ## 出力フォーマット (JSONのみ)
            { "attribute": "属性", "personality": "性格", "true_wish": "願い" }`;
        } else if (mode === 'wish') {
            promptText = `あなたはドラえもんのひみつ道具「ねがい星」です。
            ユーザーの命令: "${query}"
            願い主: ${persona.attribute} (${persona.personality})
            本来の願望: ${persona.true_wish}
            
            命令をダジャレ(香水→洪水)、聞き間違い(切手を頂戴→切って頂戴)、文脈無視で曲解し、斜め上の結果を出してください。
            ## 出力フォーマット (JSONのみ)
            { "interpretation": "解釈", "outcome": "結果(50文字程度)", "reaction": "感想", "satisfaction_score": 数値 }`;
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
            // 詳細なエラーを返すようにする
            return res.status(500).json({ error: "Gemini API Error", details: errorText });
        }

        const json = await response.json();
        
        // 安全にテキストを取り出す
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

