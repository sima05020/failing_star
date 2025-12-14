// 診断用 api/wish.js
export default async function handler(req, res) {
    // 1. 環境変数が読めているかチェック
    const apiKey = process.env.GEMINI_API_KEY;
    
    // キーの中身をログに出す（最初の数文字だけ表示して安全に確認）
    const keyStatus = apiKey ? `Present (Starts with: ${apiKey.substring(0, 4)}...)` : "MISSING";
    console.log("Debug: API Key Status =", keyStatus);

    if (!apiKey) {
        return res.status(500).json({ 
            error: "API Key is missing in Vercel Environment Variables.",
            debug_info: keyStatus
        });
    }

    // 2. 最小限のAPIリクエストを試す
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const prompt = "Say Hello";

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini API Error:", errorText);
            return res.status(500).json({ error: "Gemini API rejected the request", details: errorText });
        }

        const json = await response.json();
        
        // 成功したらその旨を返す
        return res.status(200).json({ 
            success: true, 
            message: "Connection Successful!", 
            ai_response: json.candidates[0].content.parts[0].text 
        });

    } catch (e) {
        console.error("Fetch Error:", e);
        return res.status(500).json({ error: "Fetch failed", details: e.message });
    }
}
