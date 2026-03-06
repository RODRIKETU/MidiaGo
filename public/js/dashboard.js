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
    const uploadModal = document.getElementById('uploadModal');
    const closeUploadModalBtn = document.getElementById('closeUploadModal');
    const cancelUploadBtn = document.getElementById('cancelUpload');
    
    const btnProfileModal = document.getElementById('btnProfileModal');
    const profileModal = document.getElementById('profileModal');
    const closeProfileModalBtn = document.getElementById('closeProfileModal');
    
    const playerModal = document.getElementById('playerModal');
    const closePlayerModalBtn = document.getElementById('closePlayerModal');
    const videoPlayer = document.getElementById('videoPlayer');
    
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

            card.innerHTML = `
                <div class="media-thumbnail">
                    <span class="media-status ${statusClass}">${statusText}</span>
                    <ion-icon name="play-circle-outline"></ion-icon>
                </div>
                <div class="media-info">
                    <h3 class="media-title" title="${item.title}">${item.title}</h3>
                    <p class="media-desc" title="${item.description || 'Sem descrição'}">${item.description || 'Sem descrição'}</p>
                    <div class="media-meta">
                        <span><ion-icon name="person-circle-outline"></ion-icon> ${item.uploader || 'Desconhecido'}</span>
                        <span><ion-icon name="calendar-outline"></ion-icon> ${dateStr}</span>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => openPlayer(item));
            mediaContainer.appendChild(card);
        });
    }

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
            }
        } catch (err) {
            console.error(err);
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
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('videoFile');
    const fileMessage = document.querySelector('.file-message');
    const uploadForm = document.getElementById('uploadForm');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.remove('dragover'), false);
    });

    dropArea.addEventListener('drop', (e) => {
        let files = e.dataTransfer.files;
        if (files.length) {
            fileInput.files = files;
            updateFileDisplay();
        }
    });

    fileInput.addEventListener('change', updateFileDisplay);

    function updateFileDisplay() {
        if (fileInput.files.length > 0) {
            fileMessage.textContent = fileInput.files[0].name;
            dropArea.style.borderColor = 'var(--primary)';
        } else {
            fileMessage.textContent = 'Arraste seu arquivo de vídeo ou clique para escolher';
            dropArea.style.borderColor = 'var(--border-color)';
        }
    }

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (fileInput.files.length === 0) {
            alert('Selecione um arquivo de vídeo.');
            return;
        }

        const formData = new FormData(uploadForm);
        const submitBtn = document.getElementById('submitUpload');
        const progressContainer = document.getElementById('uploadProgressContainer');
        const progressBar = document.getElementById('uploadProgressBar');
        const progressText = document.getElementById('uploadProgressText');

        submitBtn.disabled = true;
        cancelUploadBtn.disabled = true;
        progressContainer.classList.remove('hidden');

        try {
            // Using XMLHttpRequest to track actual upload progress instead of fetch
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = Math.round((e.loaded / e.total) * 100);
                    progressBar.style.setProperty('--progress', `${percentComplete}%`);
                    progressText.textContent = `${percentComplete}%`;
                }
            });

            xhr.addEventListener('load', async () => {
                if (xhr.status === 201) {
                    uploadModal.classList.add('hidden');
                    uploadForm.reset();
                    updateFileDisplay();
                    progressBar.style.setProperty('--progress', `0%`);
                    progressContainer.classList.add('hidden');
                    await loadMedia(); // Reload main view
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

        // Profile Modal
        btnProfileModal.addEventListener('click', (e) => {
            e.preventDefault();
            fetchProfile(); // refresh data
            profileModal.classList.remove('hidden');
        });
        closeProfileModalBtn.addEventListener('click', () => profileModal.classList.add('hidden'));

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
});
