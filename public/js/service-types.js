document.addEventListener('DOMContentLoaded', async () => {
    // CANONICAL LINK
    (function(){
        const url = window.location.origin + window.location.pathname;
        let link = document.querySelector('link[rel="canonical"]');
        if(!link){ link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
        link.href = url.toLowerCase().replace(/\/+$/,'') || window.location.origin;
    })();

    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const platformSlug = pathParts[0];
    const categorySlug = pathParts[1];

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

    const platform = deslugify(platformSlug);

    const breadcrumbCurrent = document.querySelector('.breadcrumb-simple.current');
    const pageTitle = document.querySelector('.page-title h2');
    const pageDesc = document.querySelector('.page-title p');
    const badgeSpan = document.querySelector('.platform-count-badge span');
    const grid = document.querySelector('.categories-grid');

    function cleanServiceName(name) {
        if (!name) return '';
        let cleaned = name;
        cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');
        cleaned = cleaned.replace(/\u00A0/g, ' ');
        cleaned = cleaned.replace(/[\u{1F000}-\u{1FFFF}]/gu, '');
        cleaned = cleaned.replace(/[\u{2600}-\u{26FF}]/gu, '');
        cleaned = cleaned.replace(/[\u{2700}-\u{27BF}]/gu, '');
        cleaned = cleaned.replace(/[\u{1F900}-\u{1F9FF}]/gu, '');
        cleaned = cleaned.replace(/[\u{1FA70}-\u{1FAFF}]/gu, '');
        cleaned = cleaned.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '');
        cleaned = cleaned.replace(/[➖➕✅❌⚡🚀🛡️⛔❤️🔄📉📍🎬💙💬📺→←↑↓]/g, '');
        cleaned = cleaned.replace(/\|.*?\|/g, '');
        cleaned = cleaned.replace(/ᴾʳᵒᵛᶦᵈᵉʳ/gi, '');
        cleaned = cleaned.replace(/\[.*?\]/g, '');
        cleaned = cleaned.replace(/\(.*?\)/g, '');
        cleaned = cleaned.replace(/\bmax\s*\d+[\s.,]*\d*\s*[kmb]?\b/gi, '');
        cleaned = cleaned.replace(/\bmin\s*\d+[\s.,]*\d*\s*[kmb]?\b/gi, '');
        cleaned = cleaned.replace(/\b\d+[\s.,]*\d*\s*[kmb]?\s*max\b/gi, '');
        cleaned = cleaned.replace(/\b\d+[\s.,]*\d*\s*[kmb]?\s*min\b/gi, '');
        cleaned = cleaned.replace(/\bmax\b/gi, '');
        cleaned = cleaned.replace(/\bmin\b/gi, '');
        cleaned = cleaned.replace(/\d+\s*%/g, '');
        cleaned = cleaned.replace(/\bserver\s*\d+\b/gi, '');
        cleaned = cleaned.replace(/\bs\d+\b/gi, '');
        cleaned = cleaned.replace(/\bv\d+\b/gi, '');
        cleaned = cleaned.replace(/[-_|/\\]+/g, ' ');
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        return cleaned;
    }

    if (!platformSlug ||!categorySlug) {
        if (grid) grid.innerHTML = '<p style="color:var(--text-muted); grid-column: 1/-1; text-align: center; padding: 40px 0;">Platform və ya kateqoriya seçilməyib</p>';
        return;
    }

    grid.innerHTML = '<p style="color:var(--text-muted); grid-column: 1/-1; text-align: center; padding: 40px 0;">Xidmətlər yüklənir...</p>';

    try {
        // 1. Platformun bütün kateqoriyalarını al
        const servicesRes = await fetch(`/api/services?platform=${encodeURIComponent(platform)}`);
        const servicesData = await servicesRes.json();

        if (!servicesData.success) {
            throw new Error('Kateqoriyalar alınmadı');
        }

        // 2. URL-dəki slug-a uyğun kateqoriyanı tap
        const matchedCategory = servicesData.categories.find(cat => {
            const cleanedName = cleanServiceName(cat.name);
            return slugify(cleanedName) === categorySlug;
        });

        if (!matchedCategory) {
            if (grid) grid.innerHTML = '<p style="color:var(--text-muted); grid-column: 1/-1; text-align: center; padding: 40px 0;">Kateqoriya tapılmadı</p>';
            return;
        }

        // EKRANDA ORİJİNAL ADI GÖSTƏR - AZ HƏRFLƏRİ İLƏ
        const displayName = cleanServiceName(matchedCategory.name);
        const originalCategories = matchedCategory.originals || [matchedCategory.original];

        if (breadcrumbCurrent) breadcrumbCurrent.textContent = `${platform}`;
        if (pageTitle) pageTitle.innerHTML = `${displayName}`;
        document.title = `${displayName} | ${platform}`;
        if (pageDesc) pageDesc.textContent = `Xidmət növünü seçin və paketlərə baxın.`;

        // 3. İndi original kateqoriyalarla service-types çək
        const res = await fetch(`/api/service-types?platform=${encodeURIComponent(platform)}&category=${encodeURIComponent(JSON.stringify(originalCategories))}`);
        const data = await res.json();

        if (data.success && data.packages.length > 0) {
            if (badgeSpan) badgeSpan.textContent = `${data.count} xidmət növü`;

            grid.innerHTML = data.packages.map(pkg => {
                const cleanedName = cleanServiceName(pkg.name);
                const serviceSlug = slugify(cleanedName);

                return `
                <div class="category-card" style="cursor: pointer;" data-service="${pkg.id}" data-slug="${serviceSlug}">
                    <div class="cat-icon">
                        <i class="ri-list-check-2"></i>
                    </div>
                    <div class="cat-info">
                        <h3 title="${cleanedName}">${cleanedName}</h3>
                        <p style="color: var(--text-muted); font-size: 13px; margin-top: 8px;">
                            <i class="ri-information-line"></i> Paketlərə bax
                        </p>
                    </div>
                    <i class="ri-arrow-right-line cat-arrow"></i>
                </div>
            `}).join('');

            document.querySelectorAll('.category-card').forEach(card => {
                card.addEventListener('click', () => {
                    const serviceId = card.dataset.service;
                    const serviceSlug = card.dataset.slug;
                    const pkg = data.packages.find(p => p.id == serviceId);

                    // MƏLUMATI sessionStorage-a YAZ
                    sessionStorage.setItem('selectedService', JSON.stringify({
                        id: serviceId,
                        rate: pkg.rate,
                        min: pkg.min,
                        max: pkg.max,
                        name: cleanServiceName(pkg.name),
                        platform: platform,
                        platformSlug: platformSlug,
                        categorySlug: categorySlug,
                        serviceSlug: serviceSlug
                    }));

                    // TƏMİZ LİNKLƏ KEÇ - query yoxdu
                    window.location.href = `/${platformSlug}/${categorySlug}/${serviceSlug}`;
                });
            });

        } else {
            if (badgeSpan) badgeSpan.textContent = `Xidmət tapılmadı`;
            grid.innerHTML = '<p style="color:var(--text-muted); grid-column: 1/-1; text-align: center; padding: 40px 0;">Bu kateqoriyada xidmət tapılmadı</p>';
        }
    } catch (err) {
        console.error('Fetch error:', err);
        if (badgeSpan) badgeSpan.textContent = `Xəta baş verdi`;
        grid.innerHTML = '<p style="color:var(--text-muted); grid-column: 1/-1; text-align: center; padding: 40px 0;">Xəta baş verdi</p>';
    }
});