document.addEventListener('DOMContentLoaded', () => {
    // Check Auth
    const token = localStorage.getItem('midiago_token');
    const userStr = localStorage.getItem('midiago_user');
    
    if (!token || !userStr) {
        window.location.href = 'index.html';
        return;
    }

    const user = JSON.parse(userStr);
    
    // UI Elements setup
    document.getElementById('welcomeText').textContent = `Olá, ${user.username}!`;
    document.getElementById('userAvatar').textContent = user.username.charAt(0).toUpperCase();

    // DOM Elements - UI Modes
    const gridBtn = document.getElementById('btnGridView');
    const listBtn = document.getElementById('btnListView');
    const mediaContainer = document.getElementById('mediaContainer');
    
    // DOM Elements - Modals
    const btnUploadModal = document.getElementById('btnUploadModal');
    if (user.role === 'cliente') {
        btnUploadModal.style.display = 'none';
    }

    const uploadModal = document.getElementById('uploadModal');
    const closeUploadModalBtn = document.getElementById('closeUploadModal');
    const cancelUploadBtn = document.getElementById('cancelUpload');
    
    const editMediaModal = document.getElementById('editMediaModal');
    const closeEditMediaModalBtn = document.getElementById('closeEditMediaModal');
    const cancelEditMediaBtn = document.getElementById('cancelEditMedia');
    const editMediaForm = document.getElementById('editMediaForm');
    
    const btnProfileModal = document.getElementById('btnProfileModal');
    const profileModal = document.getElementById('profileModal');
    const closeProfileModalBtn = document.getElementById('closeProfileModal');
    
    const playerModal = document.getElementById('playerModal');
    const closePlayerModalBtn = document.getElementById('closePlayerModal');
    const videoPlayer = document.getElementById('videoPlayer');
    
    // Admin Panels
    const btnAdminPanel = document.getElementById('btnAdminPanel');
    const adminContainer = document.getElementById('adminContainer');
    const pageTitleContainer = document.getElementById('pageTitleContainer');
    const pageTitleText = document.getElementById('pageTitleText');
    const pageSubtitleText = document.getElementById('pageSubtitleText');
    const editUserModal = document.getElementById('editUserModal');
    
    if (user.role === 'superadmin') {
        btnAdminPanel.classList.remove('hidden');
    }

    const btnLogout = document.getElementById('btnLogout');

    // DOM Elements - Data
    const searchInput = document.getElementById('searchInput');

    // Global State
    let mediaItems = [];
    let currentView = 'grid'; // 'grid' | 'list'

    // --- Initialization ---
    initApp();

    async function initApp() {
        await loadMedia();
        setupEventListeners();
    }

    // --- Core Functions ---
    async function loadMedia() {
        document.getElementById('loadingIndicator').classList.remove('hidden');
        mediaContainer.innerHTML = '';
        document.getElementById('emptyState').classList.add('hidden');

        try {
            // Note: simple un-paginated fetch for demonstration. API supports pagination.
            const response = await fetch('/api/media/list', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch API');

            const result = await response.json();
            mediaItems = result.data || [];
            
            renderMedia(mediaItems);
            
        } catch (error) {
            console.error("Error loading media:", error);
            alert("Erro ao carregar arquivos de mídia.");
        } finally {
            document.getElementById('loadingIndicator').classList.add('hidden');
        }
    }

    function renderMedia(items) {
        if (items.length === 0) {
            document.getElementById('emptyState').classList.remove('hidden');
            return;
        }

        mediaContainer.className = currentView === 'grid' ? 'media-grid' : 'media-list';
        mediaContainer.innerHTML = '';

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'media-card';
            
            const isPrivate = item.status === 'private';
            const statusClass = isPrivate ? 'status-private' : 'status-public';
            const statusText = isPrivate ? 'Privado' : 'Público';
            
            // Format Date
            const dateObj = new Date(item.created_at);
            const dateStr = dateObj.toLocaleDateString('pt-BR');

            const coverHtml = item.cover_filename 
                ? `<img src="/api/media/stream/cover/${item.id}${isPrivate ? '?token='+token : ''}" class="media-cover-img" alt="Capa" />`
                : `<ion-icon name="play-circle-outline"></ion-icon>`;
                
            const canEditDelete = user.role === 'superadmin' || item.uploaded_by === user.id;

            card.innerHTML = `
                <div class="media-thumbnail" style="cursor: pointer;">
                    ${coverHtml}
                    <span class="media-status ${statusClass}">${statusText}</span>
                </div>
                <div class="media-info">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <h3 class="media-title" title="${item.title}" style="cursor: pointer; flex: 1;">${item.title}</h3>
                        ${canEditDelete ? `
                            <div class="media-actions" style="display: flex; gap: 0.5rem; margin-left: 0.5rem;">
                                <button class="btn-icon edit-btn" style="color: var(--text-secondary); cursor: pointer;" data-id="${item.id}" title="Editar">
                                    <ion-icon name="create-outline"></ion-icon>
                                </button>
                                <button class="btn-icon delete-btn" style="color: var(--danger); cursor: pointer;" data-id="${item.id}" title="Excluir">
                                    <ion-icon name="trash-outline"></ion-icon>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    <p class="media-desc" title="${item.description || 'Sem descrição'}">${item.description || 'Sem descrição'}</p>
                    <div class="media-meta">
                        <span><ion-icon name="person-circle-outline"></ion-icon> ${item.uploader || 'Desconhecido'}</span>
                        <span><ion-icon name="calendar-outline"></ion-icon> ${dateStr}</span>
                    </div>
                </div>
            `;

            // Player binds
            card.querySelector('.media-thumbnail').addEventListener('click', () => openPlayer(item));
            card.querySelector('.media-title').addEventListener('click', () => openPlayer(item));

            if (canEditDelete) {
                card.querySelector('.edit-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    openEditModal(item);
                });
                card.querySelector('.delete-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteMedia(item.id);
                });
            }

            mediaContainer.appendChild(card);
        });
    }

    // --- Edit & Delete Logic ---
    function openEditModal(item) {
        document.getElementById('editMediaId').value = item.id;
        document.getElementById('editTitle').value = item.title;
        document.getElementById('editDescription').value = item.description || '';
        document.getElementById('editStatus').value = item.status;
        editMediaModal.classList.remove('hidden');
    }

    async function deleteMedia(id) {
        if (!confirm('Tem certeza de que deseja excluir permanentemente esta mídia? O arquivo de vídeo será deletado do servidor.')) return;
        
        try {
            const response = await fetch(`/api/media/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok && data.success) {
                alert('Mídia excluída com sucesso.');
                loadMedia();
            } else {
                alert('Erro: ' + (data.message || 'Não foi possível excluir.'));
            }
        } catch (err) {
            console.error('Delete error', err);
            alert('Erro de conexão ao excluir.');
        }
    }

    editMediaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editMediaId').value;
        const submitBtn = document.getElementById('submitEditMedia');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Salvando...';

        const payload = {
            title: document.getElementById('editTitle').value,
            description: document.getElementById('editDescription').value,
            status: document.getElementById('editStatus').value
        };

        try {
            const response = await fetch(`/api/media/${id}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            
            if (response.ok && data.success) {
                editMediaModal.classList.add('hidden');
                loadMedia();
            } else {
                alert('Erro: ' + (data.message || 'Falha ao editar.'));
            }
        } catch (err) {
            console.error('Edit error', err);
            alert('Erro de conexão.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Salvar Alterações';
        }
    });

    function openPlayer(item) {
        document.getElementById('playerTitle').textContent = item.title;
        document.getElementById('playerDesc').textContent = item.description || '';
        
        let streamUrl = `/api/media/stream/${item.id}`;
        let externalUrl = `http://${window.location.host}/api/media/stream/${item.id}`; // Base for preview

        const isPrivate = item.status === 'private';
        const apiInst = document.getElementById('apiInstructions');
        
        if (isPrivate) {
            // Include token explicitly just for the web player
            // In a real API usage, we'd use Header Authorization / x-personal-token
            streamUrl += `?token=${token}`;
            apiInst.classList.remove('hidden');
            document.getElementById('apiEndpointText').textContent = 
                `GET ${externalUrl}\nHeaders: x-personal-token: SEU_TOKEN_PESSOAL`;
        } else {
            apiInst.classList.add('hidden');
        }

        document.getElementById('externalLinkBtn').href = externalUrl;
        
        videoPlayer.src = streamUrl;
        playerModal.classList.remove('hidden');
        videoPlayer.play().catch(e => console.log("Auto-play prevented", e));
    }

    // --- Profile Modal & Token ---
    async function fetchProfile() {
        try {
            const response = await fetch('/api/auth/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (response.ok && data.success) {
                document.getElementById('profileName').textContent = data.user.username;
                document.getElementById('profileRole').textContent = data.user.role;
                document.getElementById('personalTokenInput').value = data.user.personal_token || '';
                
                // Populate new fields
                document.getElementById('email').value = data.user.email || '';
                document.getElementById('phone').value = data.user.phone || '';
                document.getElementById('cep').value = data.user.cep || '';
                document.getElementById('address').value = data.user.address || '';
                document.getElementById('document_type').value = data.user.document_type || '';
                document.getElementById('document_number').value = data.user.document_number || '';
                
                if (data.user.avatar) {
                    document.getElementById('avatarPreview').innerHTML = `<img src="${data.user.avatar}" alt="Avatar">`;
                }

                if (data.user.role === 'cliente') {
                    document.getElementById('premiumBanner').classList.remove('hidden');
                } else {
                    document.getElementById('premiumBanner').classList.add('hidden');
                }
            }
        } catch (err) {
            console.error(err);
        }
    }

    // Profile Form Submission
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const docError = document.getElementById('documentError');
        if (!docError.classList.contains('hidden')) {
            alert('Corrija os erros antes de salvar.');
            return;
        }

        const submitBtn = document.getElementById('submitProfile');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Salvando...';

        const formData = new FormData(e.target);

        try {
            const response = await fetch('/api/auth/profile/update', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            const data = await response.json();
            
            if (response.ok && data.success) {
                alert('Perfil atualizado com sucesso!');
                fetchProfile(); // refresh
            } else {
                alert('Erro: ' + (data.message || 'Falha ao atualizar perfil'));
            }
        } catch (err) {
            console.error(err);
            alert('Erro de conexão');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Salvar Alterações';
        }
    });

    // Premium Subscription Upgrade
    const btnUpgradePremium = document.getElementById('btnUpgradePremium');
    if (btnUpgradePremium) {
        btnUpgradePremium.addEventListener('click', async () => {
            if(!confirm('Deseja assinar o plano Premium para desbloquear envios de vídeos?')) return;
            
            btnUpgradePremium.disabled = true;
            btnUpgradePremium.textContent = 'Processando...';

            try {
                const response = await fetch('/api/auth/subscribe', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                const data = await response.json();

                if (response.ok && data.success) {
                    alert(data.message);
                    // Update local storage token and user object
                    localStorage.setItem('midiago_token', data.token);
                    localStorage.setItem('midiago_user', JSON.stringify(data.user));
                    // Force complete reload to re-apply UI visibility rules (Upload buttons, edit buttons, etc)
                    window.location.reload();
                } else {
                    alert('Erro: ' + (data.message || 'Não foi possível realizar a assinatura.'));
                    btnUpgradePremium.disabled = false;
                    btnUpgradePremium.textContent = 'Assinar Agora';
                }
            } catch (err) {
                console.error('Subscription error', err);
                alert('Erro de conexão ao processar a assinatura.');
                btnUpgradePremium.disabled = false;
                btnUpgradePremium.textContent = 'Assinar Agora';
            }
        });
    }

    // ViaCEP Integration
    document.getElementById('cep').addEventListener('blur', async (e) => {
        let cep = e.target.value.replace(/\D/g, '');
        if (cep.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    document.getElementById('address').value = `${data.logradouro}, , ${data.bairro}, ${data.localidade} - ${data.uf}`;
                }
            } catch (err) {
                console.error("ViaCEP error", err);
            }
        }
    });

    // Document Validation (CPF/CNPJ)
    const docInput = document.getElementById('document_number');
    const docType = document.getElementById('document_type');
    const docError = document.getElementById('documentError');

    function validateCPF(cpf) {
        cpf = cpf.replace(/\D/g, '');
        if(cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
        let sum = 0, rest;
        for (let i = 1; i <= 9; i++) sum = sum + parseInt(cpf.substring(i-1, i)) * (11 - i);
        rest = (sum * 10) % 11;
        if ((rest == 10) || (rest == 11)) rest = 0;
        if (rest != parseInt(cpf.substring(9, 10))) return false;
        sum = 0;
        for (let i = 1; i <= 10; i++) sum = sum + parseInt(cpf.substring(i-1, i)) * (12 - i);
        rest = (sum * 10) % 11;
        if ((rest == 10) || (rest == 11)) rest = 0;
        if (rest != parseInt(cpf.substring(10, 11))) return false;
        return true;
    }

    function validateCNPJ(cnpj) {
        cnpj = cnpj.replace(/\D/g, '');
        if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
        let size = cnpj.length - 2;
        let numbers = cnpj.substring(0, size);
        let digits = cnpj.substring(size);
        let sum = 0;
        let pos = size - 7;
        for (let i = size; i >= 1; i--) {
            sum += numbers.charAt(size - i) * pos--;
            if (pos < 2) pos = 9;
        }
        let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
        if (result != digits.charAt(0)) return false;
        size = size + 1;
        numbers = cnpj.substring(0, size);
        sum = 0;
        pos = size - 7;
        for (let i = size; i >= 1; i--) {
            sum += numbers.charAt(size - i) * pos--;
            if (pos < 2) pos = 9;
        }
        result = sum % 11 < 2 ? 0 : 11 - sum % 11;
        if (result != digits.charAt(1)) return false;
        return true;
    }

    docInput.addEventListener('input', () => {
        let val = docInput.value.replace(/\D/g, '');
        docInput.value = val; // enforce numbers only
        validateDoc();
    });

    docType.addEventListener('change', validateDoc);

    function validateDoc() {
        const type = docType.value;
        const val = docInput.value;
        if (!val || !type) {
            docError.classList.add('hidden');
            return;
        }

        let isValid = false;
        if (type === 'CPF') isValid = validateCPF(val);
        else if (type === 'CNPJ') isValid = validateCNPJ(val);

        if (!isValid && val.length > 0) {
            docError.classList.remove('hidden');
        } else {
            docError.classList.add('hidden');
        }
    }

    document.getElementById('generateTokenBtn').addEventListener('click', async () => {
        try {
            const btn = document.getElementById('generateTokenBtn');
            const originalText = btn.textContent;
            btn.textContent = 'Gerando...';
            btn.disabled = true;

            const response = await fetch('/api/auth/generate-token', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                document.getElementById('personalTokenInput').value = data.token;
            } else {
                alert('Erro ao gerar token: ' + (data.message || ''));
            }
            
            btn.textContent = originalText;
            btn.disabled = false;
        } catch (err) {
            console.error(err);
            alert('Erro de conexão ao gerar token');
        }
    });

    document.getElementById('copyTokenBtn').addEventListener('click', () => {
        const input = document.getElementById('personalTokenInput');
        if (!input.value) return;
        
        navigator.clipboard.writeText(input.value).then(() => {
            const icon = document.querySelector('#copyTokenBtn ion-icon');
            icon.name = 'checkmark-outline';
            setTimeout(() => { icon.name = 'copy-outline'; }, 2000);
        });
    });

    // --- Upload Logic ---
    const dropAreaVideo = document.getElementById('dropAreaVideo');
    const fileInputVideo = document.getElementById('videoFile');
    const fileMessageVideo = document.getElementById('videoFileMessage');

    const dropAreaCover = document.getElementById('dropAreaCover');
    const fileInputCover = document.getElementById('coverFile');
    const fileMessageCover = document.getElementById('coverFileMessage');

    const uploadForm = document.getElementById('uploadForm');

    // Setup Video Drop
    setupDropArea(dropAreaVideo, fileInputVideo, fileMessageVideo, 'vídeo');
    // Setup Cover Drop
    setupDropArea(dropAreaCover, fileInputCover, fileMessageCover, 'capa');

    function setupDropArea(area, input, messageEl, typeName) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            area.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            area.addEventListener(eventName, () => area.classList.add('dragover'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            area.addEventListener(eventName, () => area.classList.remove('dragover'), false);
        });

        area.addEventListener('drop', (e) => {
            let files = e.dataTransfer.files;
            if (files.length) {
                input.files = files;
                updateFileDisplay(input, messageEl, area, typeName);
            }
        });

        input.addEventListener('change', () => updateFileDisplay(input, messageEl, area, typeName));
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function updateFileDisplay(input, messageEl, area, typeName) {
        if (input.files.length > 0) {
            messageEl.textContent = input.files[0].name;
            area.style.borderColor = 'var(--primary)';
        } else {
            messageEl.textContent = `Arraste o arquivo de ${typeName} ou clique para escolher`;
            area.style.borderColor = 'var(--border-color)';
        }
    }

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (fileInputVideo.files.length === 0) {
            alert('Selecione um arquivo de vídeo principal.');
            return;
        }

        const formData = new FormData(uploadForm);
        const submitBtn = document.getElementById('submitUpload');
        const progressContainer = document.getElementById('uploadProgressContainer');
        const progressBar = document.getElementById('uploadProgressBar');
        const progressText = document.getElementById('uploadProgressText');
        const statusText = document.getElementById('uploadStatusText');

        submitBtn.disabled = true;
        cancelUploadBtn.disabled = true;
        progressContainer.classList.remove('hidden');
        statusText.textContent = 'Enviando Arquivos...';
        progressBar.style.setProperty('--progress', `0%`);
        progressText.textContent = `0%`;

        try {
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = Math.round((e.loaded / e.total) * 100);
                    progressBar.style.setProperty('--progress', `${percentComplete}%`);
                    progressText.textContent = `${percentComplete}%`;

                    if (percentComplete >= 100) {
                        statusText.textContent = 'Processando no Servidor...';
                        progressBar.style.setProperty('--progress', `100%`);
                        progressText.textContent = `Aguarde`;
                    }
                }
            });

            xhr.addEventListener('load', async () => {
                if (xhr.status === 201) {
                    statusText.textContent = 'Sucesso!';
                    setTimeout(async () => {
                        uploadModal.classList.add('hidden');
                        uploadForm.reset();
                        updateFileDisplay(fileInputVideo, fileMessageVideo, dropAreaVideo, 'vídeo');
                        updateFileDisplay(fileInputCover, fileMessageCover, dropAreaCover, 'capa');
                        progressContainer.classList.add('hidden');
                        await loadMedia(); // Reload main view
                    }, 1000);
                } else {
                    alert('Erro no upload: ' + xhr.responseText);
                }
                submitBtn.disabled = false;
                cancelUploadBtn.disabled = false;
            });

            xhr.addEventListener('error', () => {
                alert('Ocorreu um erro de rede durante o upload.');
                submitBtn.disabled = false;
                cancelUploadBtn.disabled = false;
            });

            xhr.open('POST', '/api/media/upload', true);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.send(formData);

        } catch (err) {
            console.error('Upload form error:', err);
            submitBtn.disabled = false;
            cancelUploadBtn.disabled = false;
        }
    });

    // --- Search & Listeners Setup ---
    function setupEventListeners() {
        // View Toggles
        gridBtn.addEventListener('click', () => {
            currentView = 'grid';
            gridBtn.classList.add('active');
            listBtn.classList.remove('active');
            renderMedia(mediaItems);
        });

        listBtn.addEventListener('click', () => {
            currentView = 'list';
            listBtn.classList.add('active');
            gridBtn.classList.remove('active');
            renderMedia(mediaItems);
        });

        // Search
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = mediaItems.filter(item => 
                item.title.toLowerCase().includes(query) || 
                (item.description && item.description.toLowerCase().includes(query))
            );
            renderMedia(filtered);
        });

        // Upload Modal
        btnUploadModal.addEventListener('click', (e) => {
            e.preventDefault();
            uploadModal.classList.remove('hidden');
        });
        closeUploadModalBtn.addEventListener('click', () => uploadModal.classList.add('hidden'));
        cancelUploadBtn.addEventListener('click', () => uploadModal.classList.add('hidden'));

        // Edit Modal Events
        closeEditMediaModalBtn.addEventListener('click', () => editMediaModal.classList.add('hidden'));
        cancelEditMediaBtn.addEventListener('click', () => editMediaModal.classList.add('hidden'));

        // Profile Modal
        btnProfileModal.addEventListener('click', (e) => {
            e.preventDefault();
            fetchProfile(); // refresh data
            profileModal.classList.remove('hidden');
        });
        closeProfileModalBtn.addEventListener('click', () => profileModal.classList.add('hidden'));

        // Admin Edit User Modal
        document.getElementById('closeEditUserModal').addEventListener('click', () => editUserModal.classList.add('hidden'));
        document.getElementById('cancelEditUser').addEventListener('click', () => editUserModal.classList.add('hidden'));

        // Admin Panel Toggle
        if (btnAdminPanel) {
            btnAdminPanel.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
                btnAdminPanel.classList.add('active');
                
                mediaContainer.classList.add('hidden');
                document.querySelector('.view-controls').classList.add('hidden');
                document.getElementById('emptyState').classList.add('hidden');
                
                adminContainer.classList.remove('hidden');
                pageTitleText.textContent = 'Gerenciar Usuários';
                pageSubtitleText.textContent = 'Monitoramento e edições de privilégios de acesso.';
                
                loadAdminUsers();
            });
        }

        // Navigation reset (Dashboard click)
        const btnDashboard = document.querySelector('.nav-item');
        if (btnDashboard) {
            btnDashboard.addEventListener('click', (e) => {
                if (e.target.closest('#btnUploadModal') || e.target.closest('#btnProfileModal') || e.target.closest('#btnAdminPanel') || e.target.closest('#btnLogout')) return;
                e.preventDefault();
                
                document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
                btnDashboard.classList.add('active');
                
                adminContainer.classList.add('hidden');
                mediaContainer.classList.remove('hidden');
                document.querySelector('.view-controls').classList.remove('hidden');
                
                pageTitleText.textContent = 'Sua Galeria';
                pageSubtitleText.textContent = 'Acesse e gerencie todo o portfólio de vídeos.';
                
                if (mediaItems.length === 0) {
                    document.getElementById('emptyState').classList.remove('hidden');
                }
            });
        }

        // Player Modal
        closePlayerModalBtn.addEventListener('click', () => {
            playerModal.classList.add('hidden');
            videoPlayer.pause();
            videoPlayer.src = ''; // Release resource
        });

        // Logout
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('midiago_token');
            localStorage.removeItem('midiago_user');
            window.location.href = 'index.html';
        });

        // Close Modals on background click
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    if (modal.id === 'playerModal') {
                        videoPlayer.pause();
                        videoPlayer.src = '';
                    }
                    modal.classList.add('hidden');
                }
            });
        });
    }

    // --- Admin Functions ---
    async function loadAdminUsers() {
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Carregando usuários...</td></tr>';
        
        try {
            const response = await fetch('/api/admin/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (response.ok && data.success) {
                tbody.innerHTML = '';
                if (data.users.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Nenhum usuário encontrado.</td></tr>';
                    return;
                }
                
                data.users.forEach(u => {
                    const tr = document.createElement('tr');
                    
                    const roleBadge = u.role === 'superadmin' ? '<span class="badge" style="background:var(--danger)">Superadmin</span>' :
                                      u.role === 'usuario' ? '<span class="badge" style="background:var(--primary)">Usuário</span>' :
                                      '<span class="badge" style="background:var(--text-secondary)">Cliente</span>';
                    
                    const date = new Date(u.created_at).toLocaleDateString('pt-BR');
                    
                    tr.innerHTML = `
                        <td>
                            <strong>${u.username}</strong><br>
                            <small style="color:var(--text-secondary)">${u.email || 'Sem email'}</small>
                        </td>
                        <td>${roleBadge}</td>
                        <td>${u.upload_count} / ${u.video_quota}</td>
                        <td>${u.total_views}</td>
                        <td>${date}</td>
                        <td>
                            <button class="btn btn-sm btn-outline" onclick="openEditUserModal(${u.id}, '${u.username}', '${u.role}', ${u.video_quota})">Editar</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id}, '${u.username}')">Excluir</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            } else {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger)">Erro: ${data.message}</td></tr>`;
            }
        } catch (err) {
            console.error('Admin Fetch Users Error:', err);
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--danger)">Erro de conexão.</td></tr>';
        }
    }

    window.openEditUserModal = (id, username, role, quota) => {
        document.getElementById('adminEditUserId').value = id;
        document.getElementById('adminEditUserName').value = username;
        document.getElementById('adminEditUserRole').value = role;
        document.getElementById('adminEditUserQuota').value = quota;
        document.getElementById('editUserModal').classList.remove('hidden');
    };

    window.deleteUser = async (id, username) => {
        if (!confirm(`TEM CERTEZA ABSOLUTA? Esta ação irá deletar o usuário "${username}" e TODOS OS VÍDEOS pertencentes a ele para sempre! Esta ação não pode ser desfeita.`)) return;
        
        try {
            const response = await fetch(`/api/admin/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (response.ok && data.success) {
                alert('Usuário deletado e mídia purgada com sucesso.');
                loadAdminUsers();
            } else {
                alert('Erro: ' + data.message);
            }
        } catch (err) {
            alert('Erro de conexão ao deletar usuário.');
        }
    };

    const editUserForm = document.getElementById('editUserForm');
    if (editUserForm) {
        editUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('adminEditUserId').value;
            const role = document.getElementById('adminEditUserRole').value;
            const quota = document.getElementById('adminEditUserQuota').value;
            
            const submitBtn = editUserForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Salvando...';

            try {
                const response = await fetch(`/api/admin/users/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ role, video_quota: quota })
                });
                const data = await response.json();
                
                if (response.ok && data.success) {
                    document.getElementById('editUserModal').classList.add('hidden');
                    loadAdminUsers();
                } else {
                    alert('Erro ao atualizar usuário: ' + data.message);
                }
            } catch (err) {
                alert('Erro de conexão ao salvar usuário.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Salvar Permissões';
            }
        });
    }

});
