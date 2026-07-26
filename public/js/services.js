document.addEventListener('DOMContentLoaded', async () => {
    // CANONICAL LINK
    (function(){
        const url = window.location.origin + window.location.pathname;
        let link = document.querySelector('link[rel="canonical"]');
        if(!link){ link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
        link.href = url.toLowerCase().replace(/\/+$/,'') || window.location.origin;
    })();

    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const firstPart = pathParts[0] || '';

    if (firstPart.includes('.html') || firstPart === '' || firstPart === 'services') {
        console.log('Ana səhifə - API çağırılmır');
        return;
    }

    const platformSlug = firstPart;

    function deslugify(slug) {
        if (!slug) return 'TikTok';
        return slug
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    function slugify(text) {
        return text
            .toLowerCase()
            .replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/ö/g, 'o')
            .replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    const platform = deslugify(platformSlug);

    const breadcrumbCurrent = document.querySelector('.breadcrumb-simple.current');
    const pageTitle = document.querySelector('.page-title h2');
    document.title = `${platform} Xidmətləri`;
    const pageDesc = document.querySelector('.page-title p');
    const badgeSpan = document.querySelector('.platform-count-badge span');
    const grid = document.querySelector('.categories-grid');

    if (!grid) {
        console.error('categories-grid tapılmadı');
        return;
    }

    function cleanServiceName(name) {
        if (!name) return '';
        let cleaned = name;

        // 1. Gizli simvolları sil - zero-width space, non-breaking space
        cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, ''); // zero-width
        cleaned = cleaned.replace(/\u00A0/g, ' '); // non-breaking space
        cleaned = cleaned.replace(/\u2000-\u200A/g, ' '); // digər boşluqlar

        // 2. Emoji və simvollar
        cleaned = cleaned.replace(/[\u{1F000}-\u{1FFFF}]/gu, '');
        cleaned = cleaned.replace(/[\u{2600}-\u{26FF}]/gu, '');
        cleaned = cleaned.replace(/[\u{2700}-\u{27BF}]/gu, '');
        cleaned = cleaned.replace(/[\u{1F900}-\u{1F9FF}]/gu, '');
        cleaned = cleaned.replace(/[\u{1FA70}-\u{1FAFF}]/gu, '');
        cleaned = cleaned.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '');
        cleaned = cleaned.replace(/[➖➕✅❌⚡🚀🛡️⛔❤️🔄📉📍🎬💙💬📺→←↑↓]/g, '');

        // 3. Mötərizələr və provider
        cleaned = cleaned.replace(/\|.*?\|/g, '');
        cleaned = cleaned.replace(/ᴾʳᵒᵛᶦᵈᵉʳ/gi, '');
        cleaned = cleaned.replace(/\[.*?\]/g, '');
        cleaned = cleaned.replace(/\(.*?\)/g, '');

        // 4. Max/Min/Sayılar
        cleaned = cleaned.replace(/\bmax\s*\d+[\s.,]*\d*\s*[kmb]?\b/gi, '');
        cleaned = cleaned.replace(/\bmin\s*\d+[\s.,]*\d*\s*[kmb]?\b/gi, '');
        cleaned = cleaned.replace(/\b\d+[\s.,]*\d*\s*[kmb]?\s*max\b/gi, '');
        cleaned = cleaned.replace(/\b\d+[\s.,]*\d*\s*[kmb]?\s*min\b/gi, '');
        cleaned = cleaned.replace(/\bmax\b/gi, '');
        cleaned = cleaned.replace(/\bmin\b/gi, '');

        // 5. Faiz və Server
        cleaned = cleaned.replace(/\d+\s*%/g, '');
        cleaned = cleaned.replace(/\bserver\s*\d+\b/gi, '');
        cleaned = cleaned.replace(/\bs\d+\b/gi, '');
        cleaned = cleaned.replace(/\bv\d+\b/gi, '');

        // 6. Tire, slash-ları boşluğa çevir ƏVVƏLCƏ
        cleaned = cleaned.replace(/[-_|/\\]+/g, ' ');

        // 7. Artıq boşluqları təmizlə
        cleaned = cleaned.replace(/\s+/g, ' ').trim();

        return cleaned;
    }

    function slugify(text) {
        return text
            .toLowerCase()
            // Əvvəlcə böyük İ-i düzəlt
            .replace(/İ/g, 'i').replace(/I/g, 'i')
            .replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/ö/g, 'o')
            .replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    // Başlıqları yaz - Ekranda AZ hərfləri qalır
    if (breadcrumbCurrent) breadcrumbCurrent.textContent = `${platform}`;
    if (pageTitle) pageTitle.innerHTML = `${platform} <span>Xidmətləri</span>`;

    const descriptions = {
        'Instagram': 'Profilinizi böyütmək və engagement artırmaq üçün paketlər.',
        'TikTok': 'Kəşfətə düşmək və auditoriyanızı qlobal səviyyədə böyütmək üçün eksklüziv paketlər.',
        'YouTube': 'Kanalınızı böyüdün, izlənmə və abunə sayınızı artırın.',
        'Telegram': 'Kanal və qrup üzvlərinizi artırmaq üçün effektiv həllər.',
        'Facebook': 'Səhifə bəyənmələri və post engagement üçün xidmətlər.',
        'Twitter': 'Tweet-lərinizin görünürlüyünü və izləyici sayınızı artırın.',
        'Spotify': 'Musiqi və podcast dinləmələrinizi çoxaldın.',
        'Twitch': 'Canlı yayım izləyiciləri və abunəçilər qazanın.',
        'LinkedIn': 'Professional şəbəkənizi genişləndirin.',
        'Threads': 'Threads hesabınızı böyütmək üçün paketlər.'
    };
    if (pageDesc) pageDesc.textContent = descriptions[platform] || 'Sosial media hesabınızı böyütmək üçün xidmətlər.';

    grid.innerHTML = '<p style="color:var(--text-muted)">Yüklənir...</p>';

    const getIcon = (categoryName) => {
        const name = categoryName.toLowerCase();
        if (name.includes('izləyici') || name.includes('takip') || name.includes('follow') ||
            name.includes('abunə') || name.includes('subscriber') || name.includes('üzv'))
            return 'ri-user-add-fill';
        if (name.includes('bəyən') || name.includes('like') || name.includes('beğen'))
            return 'ri-heart-3-fill';
        if (name.includes('baxış') || name.includes('izlənmə') || name.includes('view') ||
            name.includes('görüntü') || name.includes('gösterim'))
            return 'ri-eye-fill';
        if (name.includes('rəy') || name.includes('yorum') || name.includes('comment') || name.includes('şərh'))
            return 'ri-chat-3-fill';
        if (name.includes('canlı') || name.includes('live') || name.includes('yayım'))
            return 'ri-live-fill';
        if (name.includes('paylaş') || name.includes('share') || name.includes('repost') ||
            name.includes('save') || name.includes('saxla'))
            return 'ri-share-forward-fill';
        if (name.includes('hekayə') || name.includes('hikaye') || name.includes('story'))
            return 'ri-camera-fill';
        if (name.includes('reels'))
            return 'ri-movie-2-fill';
        if (name.includes('video'))
            return 'ri-video-fill';
        if (name.includes('kəşfət') || name.includes('kesfet') || name.includes('explore'))
            return 'ri-compass-3-fill';
        if (name.includes('report') || name.includes('şikayət'))
            return 'ri-alarm-warning-fill';
        return 'ri-apps-2-fill';
    };

    const getSubtext = (categoryName) => {
        const name = categoryName.toLowerCase();
        if (name.includes('izləyici') || name.includes('takip') || name.includes('follow'))
            return 'Real və Aktiv İzləyicilər';
        if (name.includes('bəyən') || name.includes('like') || name.includes('beğen'))
            return 'Sürətli Bəyənmə Xidməti';
        if (name.includes('baxış') || name.includes('izlənmə') || name.includes('view'))
            return 'Kəşfətə düşən Baxışlar';
        if (name.includes('rəy') || name.includes('yorum') || name.includes('comment'))
            return 'Özəl Şərh Xidməti';
        if (name.includes('canlı') || name.includes('live'))
            return 'Canlı Yayım İzləyicisi';
        if (name.includes('paylaş') || name.includes('share') || name.includes('saxla'))
            return 'Statistika Artırma';
        if (name.includes('hekayə') || name.includes('story'))
            return 'Hekayə Baxışları';
        if (name.includes('reels'))
            return 'Reels Engagement';
        if (name.includes('report'))
            return 'Hesabat Xidməti';
        return 'Keyfiyyətli Xidmət';
    };

    try {
        const res = await fetch(`/api/services?platform=${encodeURIComponent(platform)}`);
        const data = await res.json();

        if (data.success && data.categories.length > 0) {
            if (badgeSpan) badgeSpan.textContent = `Bütün ${platform} xidmətləri aktivdir`;

            grid.innerHTML = data.categories.map(cat => {
                const cleanedName = cleanServiceName(cat.name); // "Instagram Bot İzləyici"
                const categorySlug = slugify(cleanedName); // "instagram-bot-izleyici"

                return `
                    <a href="/${platformSlug}/${categorySlug}"
                    class="category-card"
                    title="${cleanedName}">
                        <div class="cat-icon"><i class="${getIcon(cleanedName)}"></i></div>
                        <div class="cat-info">
                            <h3>${cleanedName}</h3>
                            <p>${getSubtext(cleanedName)}</p>
                        </div>
                        <i class="ri-arrow-right-line cat-arrow"></i>
                    </a>
                    `;
            }).join('');
        } else {
            if (badgeSpan) badgeSpan.textContent = `${platform} üçün xidmət tapılmadı`;
            grid.innerHTML = '<p style="color:var(--text-muted)">Bu platformada kateqoriya tapılmadı</p>';
        }
    } catch (err) {
        if (badgeSpan) badgeSpan.textContent = `Xəta baş verdi`;
        grid.innerHTML = '<p style="color:var(--text-muted)">Xəta baş verdi</p>';
        console.error(err);
    }
});