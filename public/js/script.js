document.addEventListener('DOMContentLoaded', async () => {

    // --- Mobil Menyu ---
    const menu = document.getElementById('nav-list');
    const openBtn = document.getElementById('mobile-menu-trigger');
    const closeBtn = document.getElementById('close-menu-btn');
    if (openBtn && closeBtn && menu) {
        openBtn.addEventListener('click', () => menu.classList.add('active'));
        closeBtn.addEventListener('click', () => menu.classList.remove('active'));
    }

    // --- AXTARIŞ ---
    const platforms = ['TikTok','Instagram','YouTube','Telegram','Facebook','Twitter','Spotify','Twitch'];
    const searchPlatforms = q => !q ? [] : platforms.filter(p => p.toLowerCase().includes(q.toLowerCase().trim()));
    const slugify = text => text.toLowerCase().replace(/ə/g,'e').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ç/g,'c').replace(/ğ/g,'g').replace(/\s+/g,'-');

    // Desktop
    const desktopSearch = document.getElementById('desktop-search');
    const desktopResults = document.getElementById('desktop-results');
    const desktopQuickLinks = desktopResults?.querySelector('.quick-links');
    if (desktopSearch && desktopResults) {
        desktopSearch.addEventListener('focus', () => desktopResults.style.display = 'block');
        desktopSearch.addEventListener('input', e => {
            const results = searchPlatforms(e.target.value);
            if (desktopQuickLinks) {
                desktopQuickLinks.innerHTML = results.length ? results.map(p => `<a href="/${slugify(p)}">${p}</a>`).join('') 
                    : e.target.value ? '<p style="color:var(--text-muted);padding:10px">Nəticə yoxdur...</p>'
                    : `<a href="/tiktok">TikTok</a><a href="/instagram">Instagram</a><a href="/youtube">YouTube</a>`;
            }
        });
        document.addEventListener('click', e => { if (!desktopSearch.contains(e.target) && !desktopResults.contains(e.target)) desktopResults.style.display = 'none'; });
    }

    // Mobil
    const mobileSearchInput = document.querySelector('.mobile-search-area input');
    const mobileResultsArea = document.querySelector('.search-results-area');
    if (mobileSearchInput && mobileResultsArea) {
        mobileSearchInput.addEventListener('input', e => {
            const results = searchPlatforms(e.target.value);
            mobileResultsArea.innerHTML = results.length ? results.map(p => `<a href="/${slugify(p)}" style="display:block;padding:10px;color:var(--text);text-decoration:none;border-bottom:1px solid var(--border)"><i class="ri-search-line"></i> ${p}</a>`).join('') : '<p>Axtarış nəticəsi yoxdur...</p>';
        });
        document.querySelectorAll('.mobile-search-area .tag').forEach(tag => {
            tag.addEventListener('click', () => { mobileSearchInput.value = tag.textContent.trim(); mobileSearchInput.dispatchEvent(new Event('input')); });
        });
    }

    // --- Hero Slider ---
    const slider = document.getElementById('hero-slider');
    const slides = document.querySelectorAll('.slide');
    const prevBtn = document.getElementById('prev-slide');
    const nextBtn = document.getElementById('next-slide');
    const dotsContainer = document.getElementById('slider-dots');
    if (slider && slides.length) {
        let current = 0;
        slides.forEach((_, i) => { const dot = document.createElement('div'); dot.className = 'dot' + (i===0?' active':''); dot.onclick = () => { current = i; update(); }; dotsContainer?.appendChild(dot); });
        const dots = document.querySelectorAll('.dot');
        const update = () => { slider.style.transform = `translateX(-${current*100}%)`; dots.forEach((d,i)=>d.classList.toggle('active', i===current)); };
        const next = () => { current = (current+1)%slides.length; update(); };
        const prev = () => { current = (current-1+slides.length)%slides.length; update(); };
        nextBtn?.addEventListener('click', next); prevBtn?.addEventListener('click', prev);
        let auto = setInterval(next, 5000);
        document.querySelector('.hero-slider-wrapper')?.addEventListener('mouseenter', ()=>clearInterval(auto));
        document.querySelector('.hero-slider-wrapper')?.addEventListener('mouseleave', ()=>auto=setInterval(next,5000));
    }

    // --- Tabs ---
    const setupTabs = (btns, contents, attr) => {
        document.querySelectorAll(btns).forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute(attr);
                document.querySelectorAll(btns).forEach(b=>b.classList.remove('active'));
                document.querySelectorAll(contents).forEach(c=>c.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(target)?.classList.add('active');
            });
        });
    };
    setupTabs('.why-tab-btn', '.why-tab-content', 'data-target');

    // --- Bottom Nav ---
    const bottomMenu = document.querySelector('.bottom-nav');
    const footer = document.querySelector('.footer');
    if (bottomMenu && footer) {
        new IntersectionObserver(entries => {
            entries.forEach(e => {
                bottomMenu.style.transform = e.isIntersecting ? 'translateY(120%)' : 'translateY(0)';
                bottomMenu.style.opacity = e.isIntersecting ? '0' : '1';
                bottomMenu.style.pointerEvents = e.isIntersecting ? 'none' : 'auto';
            });
        }, {threshold:0.05}).observe(footer);
    }

    // --- POPULYAR XİDMƏTLƏR (DÜZƏLİŞ BURDA) ---
    const sTabs = document.querySelectorAll('.s-tab-btn');
    const sGrids = document.querySelectorAll('.services-grid');
    if (sTabs.length) {
        sTabs.forEach(btn => {
            btn.addEventListener('click', () => {
                const platform = btn.dataset.platform;
                sTabs.forEach(t => t.classList.remove('active'));
                btn.classList.add('active');
                sGrids.forEach(grid => {
                    grid.classList.toggle('active', grid.dataset.platform === platform);
                });
            });
        });
    }
});

// Modal funksiyalar (eyni qalır)
function openOrderModal(name, price) {
    const modal = document.getElementById('orderModal');
    if (modal) {
        document.getElementById('selectedPkgName').innerText = name;
        document.getElementById('selectedPkgPrice').innerText = price;
        modal.style.display = 'flex';
    }
}
function closeOrderModal() { document.getElementById('orderModal').style.display = 'none'; }
window.onclick = e => { const m = document.getElementById('orderModal'); if (e.target == m) closeOrderModal(); };

document.querySelectorAll('.page-btn:not(.disabled)').forEach(btn => {
  btn.addEventListener('click', () => {
    window.location.href = btn.getAttribute('href');
  });
});