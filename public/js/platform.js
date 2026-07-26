document.addEventListener('DOMContentLoaded', async () => {
    // CANONICAL LINK
    (function(){
        const url = window.location.origin + window.location.pathname;
        let link = document.querySelector('link[rel="canonical"]');
        if(!link){ link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
        link.href = url.toLowerCase().replace(/\/+$/,'') || window.location.origin;
    })();

    const container = document.querySelector('.platforms-grid');
    const badgeSpan = document.querySelector('.platform-count-badge span');
    container.innerHTML = '<p style="color:var(--text-muted)">Yüklənir...</p>';

    const platformClass = {
        'Instagram': 'instagram',
        'Threads': 'threads',
        'TikTok': 'tiktok',
        'LinkedIn': 'linkedin',
        'Twitter': 'twitter',
        'YouTube': 'youtube',
        'Telegram': 'telegram',
        'Facebook': 'facebook',
        'Spotify': 'spotify',
        'Twitch': 'twitch',
        'Snapchat': 'snapchat',
        'Discord': 'discord',
        'WhatsApp': 'whatsapp',
        'Pinterest': 'pinterest',
        'Likee': 'likee',
        'SoundCloud': 'soundcloud'
    };

    function slugify(text) {
        return text
        .toLowerCase()
        .replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/ö/g, 'o')
        .replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    try {
        const res = await fetch('/api/platforms');
        const data = await res.json();

        if (data.success) {
            if (badgeSpan) {
                const activeCount = data.platforms.filter(p => p.category_count > 0).length;
                badgeSpan.textContent = `Cəmi ${activeCount} platforma aktivdir`;
            }

            container.innerHTML = data.platforms.map(p => {
                const cssClass = platformClass[p.name] || 'social-services';
                const platformSlug = slugify(p.name);
                const hasCategories = p.category_count > 0;
                
                return `
                    <a href="${hasCategories ? `/${platformSlug}` : 'javascript:void(0)'}" 
                       class="platform-card ${cssClass} ${!hasCategories ? 'disabled' : ''}"
                       ${!hasCategories ? 'style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                        <div class="card-info">
                            <div class="platform-title">${p.name}</div>
                            <div class="platform-subtitle" style="color:#fff">
                                ${hasCategories ? p.category_count + ' kateqoriya' : 'Tezliklə'}
                            </div>
                        </div>
                        <div class="card-visual">
                            <div class="glass-logo-box">
                                <i class="${p.icon}"></i>
                            </div>
                        </div>
                    </a>
                `;
            }).join('');
        }
    } catch (err) {
        container.innerHTML = '<p style="color:var(--text-muted)">Xəta baş verdi</p>';
        if (badgeSpan) badgeSpan.textContent = `Cəmi 0 platforma aktivdir`;
        console.error(err);
    }
});