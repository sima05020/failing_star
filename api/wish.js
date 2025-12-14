// api/wish.js

export default async function handler(req, res) {
    // POSTメソッド以外は拒否
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // クライアントから送られてきたデータ
    const { mode, query, persona } = req.body;

    // Vercelの環境変数からAPIキーを取得
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'API Key is missing in server settings.' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    let promptText = "";

    // -----------------------------------------
    // モード1: ペルソナ生成 (ゲーム開始時)
    // -----------------------------------------
    if (mode === 'persona') {
        promptText = `
        あなたはTRPGの優秀なゲームマスターです。
        以下の要件で、ユニークなキャラクターと「その人が今、切実に叶えたい願い」をランダムに生成してください。

        ## 生成ルール
        - **属性**: 年齢、性別、職業だけでなく、その人の背景が少し見えるように（例：「52歳 男性 崖っぷちのラーメン屋店主」「14歳 女子 恋に恋する中学生」）。
        - **性格**: ステレオタイプに留まらず、特徴的に（例：「極度の心配性」「自信過剰だが打たれ弱い」「論理的すぎて空気が読めない」）。
        - **真の願い**: 抽象的なものではなく、具体的で切実なものにしてください。

        ## 出力フォーマット (JSONのみ)
        {
            "attribute": "属性の文字列",
            "personality": "性格の文字列",
            "true_wish": "叶えたい願いの内容"
        }
        `;
    }
    // -----------------------------------------
    // モード2: 願いの判定 (ねがい星の発動)
    // -----------------------------------------
    else if (mode === 'wish') {
        promptText = `
        あなたは藤子・F・不二雄作品『ドラえもん』に登場するひみつ道具「ねがい星」になりきってください。
        ユーザーが入力した「願い事（クエリ）」を解釈し、結果を出力します。

        ## キャラクター設定: ねがい星
        - どんな願いでも叶える能力を持つが、**必ず願いを勘違いして**斜め上の結果をもたらす。
        - 悪気はないが、結果として人間に被害を与えることが多い（カオスな展開）。
        - ごく稀に（100回に1回くらい）まともに叶えることもあるが、基本はポンコツである。

        ## 勘違いのロジック（重要）
        ユーザーの入力した言葉に対し、以下のいずれかの手法で曲解してください。
        1. **ダジャレ・同音異義語**: 「香水(こうすい)」→「洪水(こうずい)」、「雨(あめ)」→「飴(あめ)」
        2. **聞き間違い**: 「切手(きって)を頂戴」→「(ここを)切って頂戴」→刃物が飛んでくる
        3. **文脈の無視**: 「足を速くして」→「足が(物理的に)早くなる(腐る)」など
        4. **言葉の切り取り**: 「お菓子」→「お頭(おかしら)」→忍者軍団が現れる

        ## 入力情報
        - **ユーザーの命令**: "${query}"
        - **願い主の属性**: ${persona.attribute}
        - **願い主の性格**: ${persona.personality}
        - **本来の願望**: ${persona.true_wish}

        ## 出力要件
        以下のJSON形式で出力してください。
        "outcome"（結果）は、物理的な現象描写を詳細かつコミカルに行ってください。
        "reaction"（感想）は、願い主の性格（${persona.personality}）を反映した口調にしてください。

        ## 出力フォーマット (JSONのみ)
        {
            "interpretation": "どのように勘違いしたかの短い解説（例：「たいやき」を「タイヤ」と「木」と聞き間違えた）",
            "outcome": "実際に発生したカオスな現象の描写（50文字程度）",
            "reaction": "現象に巻き込まれた願い主の叫びや感想のセリフ",
            "satisfaction_score": 0〜100の整数 (基本は低く、皮肉めいた点数)
        }
        `;
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: {
                    response_mime_type: "application/json",
                    temperature: 0.9 // 創造性を高くしてカオス度を上げる
                }
            })
        });

        const json = await response.json();

        // エラーハンドリング: Geminiがエラーを返した場合
        if (!json.candidates || !json.candidates[0].content) {
            console.error("Gemini Error:", json);
            return res.status(500).json({ error: 'AI generation failed' });
        }

        const text = json.candidates[0].content.parts[0].text;

        // JSONパースして返す
        res.status(200).json(JSON.parse(text));

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}