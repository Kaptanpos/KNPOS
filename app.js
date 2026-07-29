// Satış Kaydetme ve Masa Kapatma Fonksiyonu
async function completeSale(tableId, saleType, paymentType, items) {
  // items formatı: [{ product_id: 1, quantity: 2, unit_price: 675.00 }]

  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  // 1. sales tablosuna ana satışı ekle
  const { data: saleData, error: saleErr } = await supabase
    .from('sales')
    .insert([{
      total_amount: totalAmount,
      payment_type: paymentType, // 'NAKİT', 'KREDİ KARTI'
      sale_type: saleType        // 'MASA', 'YEMEKSEPETİ', 'PAKET'
    }])
    .select()
    .single();

  if (saleErr) return alert('Satış kaydedilemedi: ' + saleErr.message);

  // 2. sale_items tablosuna ürünleri ekle (Trigger otomatik çalışıp hammaddeleri düşecek!)
  const saleItemsToInsert = items.map(item => ({
    sale_id: saleData.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    line_total: item.quantity * item.unit_price
  }));

  const { error: itemsErr } = await supabase
    .from('sale_items')
    .insert(saleItemsToInsert);

  if (itemsErr) return alert('Satış detayları eklenemedi: ' + itemsErr.message);

  alert('Satış başarıyla tamamlandı, stoklar güncellendi!');
}
