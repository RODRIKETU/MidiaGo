document.addEventListener('DOMContentLoaded', () => {
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
