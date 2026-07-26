document.addEventListener('DOMContentLoaded', () => {
    // CANONICAL LINK - checkout üçün paramsız
    (function () {
        const url = window.location.origin + '/checkout';
        let link = document.querySelector('link[rel="canonical"]');
        if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
        link.href = url;
    })();

    // Səhifənin doğruluğunu yoxla
    if (!document.querySelector('.checkout-section')) return;

    // SessionStorage-dan məlumatları götür
    const orderData = JSON.parse(sessionStorage.getItem('orderData') || '{}');

    // Əgər məlumat yoxdursa geri qaytar
    if (!orderData.price) {
        alert('Sifariş məlumatı tapılmadı. Zəhmət olmasa yenidən seçin.');
        window.location.href = '/';
        return;
    }

    // Sifariş özətini doldur
    const pkgNameElem = document.getElementById('checkoutPkgName');
    const pkgPriceElem = document.getElementById('checkoutPkgPrice');
    const pkgAmountElem = document.getElementById('checkoutPkgAmount');
    const pkgLinkElem = document.getElementById('checkoutPkgLink');

    if (pkgNameElem) pkgNameElem.textContent = orderData.name || "Seçilmiş Paket";
    if (orderData.name) {
        document.title = `${orderData.name} - Ödəniş`;
    }
    if (pkgPriceElem) pkgPriceElem.textContent = parseFloat(orderData.price).toFixed(2) + ' AZN';
    if (pkgAmountElem) pkgAmountElem.textContent = orderData.amount || '0';
    if (pkgLinkElem) pkgLinkElem.textContent = orderData.link || '-';

    const form = document.getElementById('epointPaymentForm');
    const payBtn = document.querySelector('.pay-now-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Form məlumatlarını götür
        // 32-36 sətirləri dəyiş
        const formData = new FormData(form);
        const customerName = formData.get('fullName')?.trim();
        const customerEmail = formData.get('email')?.trim();
        const customerPhone = formData.get('phone')?.trim();
        const customerLink = formData.get('link')?.trim() || orderData.link;

        // Validasiya
        if (!customerName || !customerEmail || !customerPhone || !customerLink) {
            alert('Zəhmət olmasa bütün sahələri doldurun.');
            return;
        }

        // Email format yoxla
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customerEmail)) {
            alert('Zəhmət olmasa düzgün email daxil edin.');
            return;
        }

        // Düyməni kilidlə
        payBtn.disabled = true;
        payBtn.innerHTML = '<i class="ri-loader-4-line btn-spin"></i> <span>Yönləndirilir...</span>';

        try {
            // Serverə göndəriləcək obyekt
            const finalPayload = {
                api_service_id: orderData.api_service_id ? parseInt(orderData.api_service_id) : null,
                package_id: null, // artıq lazım deyil
                quantity: parseInt(orderData.amount) || 0,
                link: customerLink, // <-- DOLU GƏLİR
                price: parseFloat(orderData.price),
                customer_name: customerName,
                customer_phone: customerPhone,
                customer_email: customerEmail
            };

            // Ödəniş linki yaratmaq üçün serverə sorğu
            const res = await fetch('/api/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalPayload)
            });

            // Server HTML qaytarsa tutaq
            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await res.text();
                console.error('Server JSON qaytarmadı:', text);
                throw new Error('Server xətası baş verdi. Zəhmət olmasa yenidən cəhd edin.');
            }

            const data = await res.json();

            if (data.success && data.redirect_url) {
                // Sifariş yaradıldı, Epoint-ə yönləndiririk
                sessionStorage.removeItem('orderData');
                window.location.href = data.redirect_url;
            } else {
                throw new Error(data.error || 'Ödəniş linki alınmadı');
            }
        } catch (err) {
            console.error('Ödəniş xətası:', err);
            alert('Xəta baş verdi: ' + err.message);
            payBtn.disabled = false;
            payBtn.innerHTML = '<span>Ödənişi Tamamla</span><i class="ri-arrow-right-line"></i>';
        }
    });
});