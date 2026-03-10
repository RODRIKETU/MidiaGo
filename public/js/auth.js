document.addEventListener('DOMContentLoaded', async () => {
    // Theme Initial Load
    const savedTheme = localStorage.getItem('midiago_theme');
    if (savedTheme === 'light') {
        document.documentElement.classList.add('light-mode');
    }

    // Settings Fetch for Favicon, LGPD, Cookies
    try {
        const setRes = await fetch('/api/settings');
        const setData = await setRes.json();
        if (setData.success && setData.settings) {
            const { favicon, background_image, lgpd_text, cookie_text, cookie_policy_link } = setData.settings;
            // Favicon
            if (favicon) {
                let link = document.querySelector("link[rel~='icon']");
                if (!link) {
                    link = document.createElement('link');
                    link.rel = 'icon';
                    document.head.appendChild(link);
                }
                link.href = favicon;
            }
            // Background
            if (background_image) {
                document.body.style.backgroundImage = `url('${background_image}')`;
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundPosition = 'center';
                document.body.style.backgroundRepeat = 'no-repeat';
                document.body.style.backgroundAttachment = 'fixed';
            }
            // LGPD
            if (lgpd_text) {
                document.getElementById('lgpdTextContainer').textContent = lgpd_text;
            }
            // Cookie Banner
            if (cookie_text && !localStorage.getItem('midiago_cookie_accepted')) {
                const banner = document.getElementById('cookieBanner');
                document.getElementById('cookieBannerText').textContent = cookie_text;
                if (cookie_policy_link) {
                    document.getElementById('cookieBannerLink').href = cookie_policy_link;
                } else {
                    document.getElementById('cookieBannerLink').style.display = 'none';
                }
                banner.classList.remove('hidden');

                document.getElementById('acceptCookiesBtn').addEventListener('click', () => {
                    localStorage.setItem('midiago_cookie_accepted', 'true');
                    banner.classList.add('hidden');
                });
            }
        }
    } catch (e) {
        console.error("Could not fetch settings", e);
    }

    // Theme Toggle Binding
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
        themeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Previne outros modais e ações pai
            const root = document.documentElement;
            if (root.classList.contains('light-mode')) {
                root.classList.remove('light-mode');
                localStorage.setItem('midiago_theme', 'dark');
            } else {
                root.classList.add('light-mode');
                localStorage.setItem('midiago_theme', 'light');
            }
        });
    }

    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    // Redirect if already logged in
    if (localStorage.getItem('midiago_token')) {
        window.location.href = 'dashboard.html';
    }

    if (loginForm) {
        const formMode = document.getElementById('formMode');
        const formSubtitle = document.getElementById('formSubtitle');
        const submitBtnText = loginForm.querySelector('button[type="submit"] span');
        const toggleModeText = document.getElementById('toggleModeText');
        const toggleModeBtn = document.getElementById('toggleModeBtn');

        toggleModeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            errorMessage.textContent = '';
            
            if (formMode.value === 'login') {
                formMode.value = 'register';
                formSubtitle.textContent = 'Crie sua conta como Cliente.';
                submitBtnText.textContent = 'Criar Conta';
                toggleModeText.textContent = 'Já possui uma conta?';
                toggleModeBtn.textContent = 'Faça Login';
            } else {
                formMode.value = 'login';
                formSubtitle.textContent = 'Bem-vindo ao portal de mídia empresarial.';
                submitBtnText.textContent = 'Acessar Portal';
                toggleModeText.textContent = 'Não tem uma conta?';
                toggleModeBtn.textContent = 'Cadastre-se';
            }
        });

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:2px;margin:0"></span><span>Processando...</span>';
            errorMessage.textContent = '';

            const endpoint = formMode.value === 'login' ? '/api/auth/login' : '/api/auth/register';

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    localStorage.setItem('midiago_token', data.token);
                    localStorage.setItem('midiago_user', JSON.stringify(data.user));
                    window.location.href = 'dashboard.html';
                } else {
                    errorMessage.textContent = data.message || `Erro ao realizar ${formMode.value === 'login' ? 'login' : 'cadastro'}.`;
                }
            } catch (error) {
                console.error('Auth error:', error);
                errorMessage.textContent = 'Erro de conexão com o servidor.';
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<span>${formMode.value === 'login' ? 'Acessar Portal' : 'Criar Conta'}</span>`;
            }
        });
    }
});
