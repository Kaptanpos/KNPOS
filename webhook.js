import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://stytmmafrrtqaxobihap.supabase.co";
const SUPABASE_KEY = "sb_publishable_60c-7R-1SshMYxC2xpKL1g_PwApWWqu"; // Veya servis anahtarın

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
    // Sadece POST isteklerini kabul et
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const orderData = req.body;
        
        // Adisyo'dan gelen veriye göre tutar ve ödeme kanalını alalım
        const totalAmount = Number(orderData.totalAmount || orderData.total || orderData.amount || 0);
        const paymentChannel = orderData.channel || orderData.paymentType || "Adisyo / Webhook";

        if (totalAmount <= 0) {
            return res.status(400).json({ error: 'Geçersiz tutar' });
        }

        // Supabase 'sales' tablosuna doğrudan yaz
        const { data, error } = await supabase
            .from("sales")
            .insert({
                total_amount: totalAmount,
                payment_type: paymentChannel
            })
            .select("id")
            .single();

        if (error) throw error;

        console.log("Adisyo Webhook Başarıyla İşlendi, Satış ID:", data.id);
        return res.status(200).json({ success: true, message: "Sipariş başarıyla POS'a işlendi!", saleId: data.id });

    } catch (err) {
        console.error("Webhook işleme hatası:", err.message);
        return res.status(500).json({ error: err.message });
    }
}
