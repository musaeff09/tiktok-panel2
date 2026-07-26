document.addEventListener('DOMContentLoaded', async () => {
    // CANONICAL LINK
    (function(){
        const url = window.location.origin + window.location.pathname;
        let link = document.querySelector('link[rel="canonical"]');
        if(!link){ link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
        link.href = url.toLowerCase().replace(/\/+$/,'') || window.location.origin;
    })();

    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const platformSlug = pathParts[0] || 'tiktok';
    const categorySlug = pathParts[1] || '';
    const serviceSlug = pathParts[2] || '';

    const serviceData = JSON.parse(sessionStorage.getItem('selectedService') || '{}');

    if (!serviceData.id || serviceData.serviceSlug !== serviceSlug) {
        console.error('Service məlumatı tapılmadı');
        window.location.href = `/${platformSlug}/${categorySlug}`;
        return;
    }

    const serviceId = serviceData.id;
    const baseRateTL = parseFloat(serviceData.rate) || 0;
    const min = parseInt(serviceData.min) || 100;
    const max = parseInt(serviceData.max) || 100000;

    const EXCHANGE_API_KEY = 'c1d9e3e37b6d70977c6de286';
    const EXCHANGE_API_URL = `https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/latest/TRY`;

    function slugify(text) {
        return text
            .toLowerCase()
            .replace(/İ/g, 'i').replace(/I/g, 'i')
            .replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/ö/g, 'o')
            .replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function deslugify(slug) {
        if (!slug) return '';
        return slug
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    const platform = serviceData.platform || deslugify(platformSlug);
    const displayName = serviceData.name || deslugify(serviceSlug);

    const breadcrumbCurrent = document.querySelector('.breadcrumb-simple.current');
    const pageTitle = document.querySelector('.page-title h2');
    document.title = `${displayName} | ${platform}`;

    const pageDesc = document.querySelector('.page-title p');
    const badgeSpan = document.querySelector('.platform-count-badge span');
    const grid = document.querySelector('.packages-grid');

    if (breadcrumbCurrent) breadcrumbCurrent.textContent = `${platform}`;
    if (pageTitle) pageTitle.innerHTML = `${displayName}`;
    if (pageDesc) pageDesc.textContent = `Paket seçin və sifariş verin.`;

    if (!grid) {
        console.error('packages-grid tapılmadı!');
        return;
    }

    grid.innerHTML = '<p style="color:var(--text-muted); grid-column: 1/-1; text-align: center; padding: 40px 0;">Məzənnə və paketlər yüklənir...</p>';

    let TL_TO_AZN = 0.04;
    try {
        const rateRes = await fetch(EXCHANGE_API_URL);
        const rateData = await rateRes.json();
        if (rateData.result === 'success' && rateData.conversion_rates.AZN) {
            TL_TO_AZN = rateData.conversion_rates.AZN;
            console.log('Güncel məzənnə:', TL_TO_AZN);
        }
    } catch (e) {
        console.error('Məzənnə API xətası, default istifadə olunur:', e);
    }

    const baseRateAZN = baseRateTL * TL_TO_AZN;

    let markupPercent = 100;
    const platLower = platform.toLowerCase();
    if (platLower === 'tiktok') {
        markupPercent = 200;
    } else if (platLower === 'instagram') {
        markupPercent = 100;
    } else {
        markupPercent = 100;
    }

    const rate = baseRateAZN * (1 + markupPercent / 100);

    console.log('Params:', { serviceId, displayName, platform, baseRateTL, baseRateAZN, TL_TO_AZN, rate, markupPercent, min, max });

    function generatePackages(minVal, maxVal, unitRate) {
        const packages = [];
        const steps = [
            50, 100, 250, 500, 750, 1000, 2500, 5000,
            7500, 10000, 25000, 50000, 75000, 100000, 250000, 500000, 750000, 1000000
        ];

        steps.forEach(step => {
            if (step >= minVal && step <= maxVal) {
                const price = (unitRate / 1000 * step);
                if (price >= 0.10) {
                    packages.push(step);
                }
            }
        });

        if (maxVal >= minVal && !packages.includes(maxVal)) {
            const maxPrice = (unitRate / 1000 * maxVal);
            if (maxPrice >= 0.10) {
                packages.push(maxVal);
                packages.sort((a, b) => a - b);
            }
        }

        if (packages.length === 0) {
            if (minVal <= maxVal) {
                const minPrice = (unitRate / 1000 * minVal);
                if (minPrice >= 0.10) packages.push(minVal);
            }
            if (maxVal > minVal) {
                const maxPrice = (unitRate / 1000 * maxVal);
                if (maxPrice >= 0.10) packages.push(maxVal);
            }
        }

        return packages;
    }

    const availablePackages = generatePackages(min, max, rate);

    if (badgeSpan) badgeSpan.textContent = `${availablePackages.length} paket mövcuddur`;

    if (availablePackages.length === 0) {
        grid.innerHTML = `<p style="color:var(--text-muted); grid-column: 1/-1; text-align: center; padding: 40px 0;">
            Bu xidmət üçün uyğun paket tapılmadı<br>
            Min: ${min} - Max: ${max}<br>
            <span style="font-size: 12px; color: #ff6b6b;">Qeyd: 10 qəpikdən aşağı paketlər göstərilmir</span>
        </p>`;
        return;
    }

    grid.innerHTML = '';

    availablePackages.forEach(amount => {
        const price = (rate / 1000 * amount).toFixed(2);
        const isFeatured = amount === 1000 || amount === Math.min(...availablePackages.filter(p => p >= 1000));

        const card = document.createElement('div');
        card.className = `pkg-card ${isFeatured ? 'featured' : ''}`;
        card.innerHTML = `
            <div class="pkg-header">
                <div class="pkg-main-icon">
                    <i class="ri-user-add-line"></i>
                </div>
                <div>
                    <h3>${amount.toLocaleString()} ədəd</h3>
                    <div class="pkg-price">
                        <span class="amt">${price}</span><span class="cur">AZN</span>
                    </div>
                </div>
            </div>

            <div class="pkg-body">
                <ul class="pkg-features">
                    <li><i class="ri-lock-unlock-line"></i> <span>Şifrəsiz Dəstək</span></li>
                    <li><i class="ri-bank-card-line"></i> <span>Güvənli Ödəniş</span></li>
                    <li><i class="ri-shield-check-line"></i> <span>Zəmanətli Xidmət</span></li>
                    <li><i class="ri-flashlight-line"></i> <span>Anlıq Göndərim</span></li>
                    <li><i class="ri-time-line"></i> <span>${rate < 2 ? '0-1' : rate < 10 ? '0-3' : '0-24'} Saat</span></li>
                </ul>
            </div>
            <button class="pkg-btn" data-amount="${amount}" data-price="${price}">
               Sifariş Et
            </button>
        `;
        grid.appendChild(card);
    });

    // BUDU ƏSAS HİSSƏ - KLIK EVENTİ
    grid.addEventListener('click', (e) => {
        const btn = e.target.closest('.pkg-btn');
        if (!btn) return;

        e.preventDefault();

        const amount = btn.dataset.amount;
        const price = btn.dataset.price;

        console.log('Paket seçildi:', { amount, price });

        // 1. PAKETI YADDA SAXLA
        sessionStorage.setItem('orderData', JSON.stringify({
            api_service_id: serviceId,   // <-- id yox, api_service_id
            amount: amount,
            price: price,
            rate: rate.toFixed(4),
            name: displayName,
            platform: platform,
            platformSlug: platformSlug,
            serviceSlug: serviceSlug,
            link: '' // hələlik boş, checkout-da dolduracağıq
        }));

        // 2. CHECKOUT-A GÖNDƏR
        window.location.href = '/checkout';
    });
});