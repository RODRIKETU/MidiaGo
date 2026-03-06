document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    // Redirect if already logged in
    if (localStorage.getItem('midiago_token')) {
        window.location.href = 'dashboard.html';
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:2px;margin:0"></span><span>Processando...</span>';
            errorMessage.textContent = '';

            try {
                const response = await fetch('/api/auth/login', {
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
                    errorMessage.textContent = data.message || 'Erro ao realizar login.';
                }
            } catch (error) {
                console.error('Login error:', error);
                errorMessage.textContent = 'Erro de conexão com o servidor.';
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>Acessar Portal</span>';
            }
        });
    }
});
