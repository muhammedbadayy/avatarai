// ============================================================
//  AvatarAI — Serverless fonksiyon (Vercel)
//  Dosya yolu: /api/generate.js
//
//  NE YAPAR:
//  1. Uygulamadan gelen "stil" bilgisini alır
//  2. O stile karşılık gelen hazır görsel tarifini (prompt) seçer
//  3. fal.ai'ya gönderip gerçek avatar görselini üretir
//  4. Görselin linkini uygulamaya geri döndürür
//
//  ÖNEMLİ: API anahtarın bu dosyada DEĞİL, Vercel'in
//  "Environment Variables" ayarında saklanır. Asla koda yazma.
//  Vercel panelinde SADECE şunu ekle:
//    FAL_KEY = senin-fal-anahtarin
//
//  (Artık Anthropic/Claude anahtarına GEREK YOK — tek fatura, tek anahtar.)
// ============================================================

// Her stil için hazır İngilizce görsel tarifi.
// İstersen bu metinleri değiştirerek sonucu özelleştirebilirsin.
const STYLE_PROMPTS = {
  'profesyonel':
    'professional corporate headshot portrait of a person, clean studio background, soft natural lighting, sharp focus, business attire, confident expression, high quality, photorealistic',
  'anime':
    'anime and manga style portrait of a person, vibrant colors, expressive large eyes, detailed cel-shaded illustration, dynamic lighting, high quality digital art',
  'fantastik':
    'epic fantasy warrior portrait of a person, ornate armor, dramatic cinematic atmosphere, magical glowing background, detailed, painterly fantasy art style',
  'siber-punk':
    'cyberpunk neon portrait of a person, futuristic city background, glowing neon lights, reflective surfaces, moody atmosphere, highly detailed sci-fi art',
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sadece POST destekleniyor' });
  }

  try {
    const { style } = req.body || {};
    if (!style || typeof style !== 'string') {
      return res.status(400).json({ error: 'style alanı gerekli' });
    }

    // Gelen stil anahtarına karşılık gelen tarifi seç.
    // Eşleşme bulunamazsa stilin kendisini prompt olarak kullan.
    const imagePrompt = STYLE_PROMPTS[style] || style;

    // --- fal.ai ile gerçek görseli üret ---
    // flux/schnell hızlı ve ucuz (1-2 saniye, görsel başı ~1 sent).
    // Kaliteyi artırmak istersen flux/dev veya flux-pro kullanabilirsin (daha pahalı).
    const falResp = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Key ' + process.env.FAL_KEY,
      },
      body: JSON.stringify({
        prompt: imagePrompt,
        image_size: 'square_hd',
        num_images: 1,
        num_inference_steps: 4,
      }),
    });

    if (!falResp.ok) {
      const t = await falResp.text();
      return res.status(502).json({ error: 'fal.ai hatası', detail: t });
    }

    const falData = await falResp.json();
    const imageUrl =
      falData.images && falData.images[0] ? falData.images[0].url : null;

    if (!imageUrl) {
      return res.status(502).json({ error: 'Görsel üretilemedi' });
    }

    return res.status(200).json({
      imageUrl: imageUrl,
      prompt: imagePrompt,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Sunucu hatası', detail: String(err) });
  }
}
