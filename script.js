document.addEventListener('DOMContentLoaded', () => {
    // ----- State -----
    let livros = [];
    let desafios = [];
    let quotes = []; // Novo estado para quotes
    let metaAnual = 12;
    let readingLog = {};
    let settings = { pagesPerHour: 30 };
    let achievements = [];
    let hasUnexportedChanges = false; // Flag para alterações não salvas

    // ----- Elements & Templates -----
    const modalContainer = document.getElementById('modal-container');
    const toastsEl = document.getElementById('toasts');
    const themeIcon = document.getElementById('theme-icon');
    const sunIcon = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>`;
    const moonIcon = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>`;
    const inspiracaoQuotes = ["Um leitor vive mil vidas antes de morrer... O homem que nunca lê vive apenas uma.", "Os livros são os espelhos da alma.", "A leitura é uma porta aberta para um mundo de descobertas sem fim."];
    
    // ----- Utilities -----
    const uid = ()=> Date.now().toString(36) + Math.random().toString(36).slice(2,6);
    function showToast(msg, timeout=2600){
      const n = document.createElement('div'); n.className = 'toast'; n.textContent = msg;
      toastsEl.appendChild(n);
      setTimeout(()=> n.remove(), timeout);
    }
    const gerarCapaPadrao = (titulo) => `https://placehold.co/400x600/f9f6f1/2b2b2b?text=${encodeURIComponent((titulo||'Sem título').slice(0,20))}&font=inter`;
    const escapeHtml = (s) => s ? String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;') : '';
    const toYYYYMMDD = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    // ----- Data using localStorage -----
    function loadData() {
        livros = JSON.parse(localStorage.getItem('biblioteca')) || sampleData('livros');
        desafios = JSON.parse(localStorage.getItem('desafios')) || sampleData('desafios');
        
        const loadedQuotes = JSON.parse(localStorage.getItem('quotes')) || [];
        quotes = loadedQuotes.filter(q => q && q.text && q.text.trim() !== '');

        metaAnual = parseInt(localStorage.getItem('metaAnual') || '12');
        readingLog = JSON.parse(localStorage.getItem('readingLog')) || {};
        settings = JSON.parse(localStorage.getItem('settings')) || { pagesPerHour: 30 };
        
        if (quotes.length < loadedQuotes.length) {
            localStorage.setItem('quotes', JSON.stringify(quotes));
        }

        renderAll();
    }
    function saveData() {
        localStorage.setItem('biblioteca', JSON.stringify(livros));
        localStorage.setItem('desafios', JSON.stringify(desafios));
        localStorage.setItem('quotes', JSON.stringify(quotes)); // Salva quotes
        localStorage.setItem('metaAnual', String(metaAnual));
        localStorage.setItem('readingLog', JSON.stringify(readingLog));
        localStorage.setItem('settings', JSON.stringify(settings));
        hasUnexportedChanges = true;
        renderAll();
    }
    function sampleData(type) {
        if(type === 'livros') return [];
        if(type === 'desafios') return [];
        return [];
    }

    // ----- Navigation -----
    function setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
        const views = document.querySelectorAll('.view-content');

        // Define o estado inicial
        document.querySelector('#view-inicio').classList.add('active');
        document.querySelectorAll('a[href="#inicio"]').forEach(link => link.classList.add('nav-item-active'));

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                const targetId = link.getAttribute('href').substring(1);
                const targetView = document.getElementById(`view-${targetId}`);

                // Desativa todos os links e views
                views.forEach(view => view.classList.remove('active'));
                navLinks.forEach(navLink => navLink.classList.remove('nav-item-active'));
                
                // Ativa o view e link correspondente
                if(targetView) {
                    targetView.classList.add('active');
                }
                
                document.querySelectorAll(`a[href="#${targetId}"]`).forEach(l => l.classList.add('nav-item-active'));
            });
        });
    }

    // ----- Modals -----
    function openModal(content, id, maxWidth = 'max-w-2xl'){
        const modalWrapper = document.createElement('div');
        modalWrapper.id = id;
        modalWrapper.className = 'fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm pop-in';
        modalWrapper.innerHTML = `<div class="w-full ${maxWidth} card p-6 max-h-[90vh] overflow-y-auto">${content}</div>`;
        modalContainer.appendChild(modalWrapper);
        modalWrapper.addEventListener('click', e => { if(e.target === modalWrapper) closeModal(id); });
    }
    function closeModal(id){ document.getElementById(id)?.remove(); }

    // ----- Book Logic (unchanged) -----
    function openBookModal(livro = null) {
        const content = `
        <form id="form-livro" class="space-y-4">
            <input type="hidden" id="livro-id" value="${livro?.id || ''}">
            <h3 class="text-lg font-semibold">${livro ? 'Editar Livro' : 'Adicionar Livro'}</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="md:col-span-2"><label class="text-xs font-medium">Título</label><input id="form-titulo" required class="w-full p-2 border border-[var(--border)] rounded-md bg-transparent focus-ring" value="${escapeHtml(livro?.titulo || '')}"></div>
                <div><label class="text-xs font-medium">Autor</label><input id="form-autor" required class="w-full p-2 border border-[var(--border)] rounded-md bg-transparent focus-ring" value="${escapeHtml(livro?.autor || '')}"></div>
                <div><label class="text-xs font-medium">Gênero</label><input id="form-genero" class="w-full p-2 border border-[var(--border)] rounded-md bg-transparent focus-ring" value="${escapeHtml(livro?.genero || '')}"></div>
                <div class="md:col-span-2"><label class="text-xs font-medium">URL da capa</label><input id="form-capa" class="w-full p-2 border border-[var(--border)] rounded-md bg-transparent focus-ring" placeholder="https://" value="${escapeHtml(livro?.capa || '')}"></div>
                <div><label class="text-xs font-medium">Páginas</label><input id="form-paginas" type="number" class="w-full p-2 border border-[var(--border)] rounded-md bg-transparent focus-ring" value="${livro?.paginas || ''}"></div>
                <div><label class="text-xs font-medium">Páginas lidas</label><input id="form-paginas-lidas" type="number" class="w-full p-2 border border-[var(--border)] rounded-md bg-transparent focus-ring" value="${livro?.paginasLidas || ''}"></div>
                <div><label class="text-xs font-medium">Status</label><select id="form-status" class="w-full p-2 border border-[var(--border)] rounded-md bg-transparent"><option ${livro?.status === 'Lido' ? 'selected' : ''}>Lido</option><option ${livro?.status === 'Lendo' ? 'selected' : ''}>Lendo</option><option ${livro?.status === 'Quero Ler' ? 'selected' : ''}>Quero Ler</option></select></div>
                <div><label class="text-xs font-medium">Nota (0-5)</label><input id="form-nota" type="number" min="0" max="5" step="0.5" class="w-full p-2 border border-[var(--border)] rounded-md bg-transparent focus-ring" value="${livro?.nota || ''}"></div>
            </div>
            <div><label class="text-xs font-medium">Resenha / Anotações</label><textarea id="form-resenha" rows="4" class="w-full p-2 border border-[var(--border)] rounded-md bg-transparent focus-ring">${escapeHtml(livro?.resenha || '')}</textarea></div>
            <div class="flex justify-end gap-3 pt-2"><button type="button" class="btn-cancel py-2 px-4 rounded-md border border-[var(--border)]">Cancelar</button><button type="submit" class="py-2 px-4 rounded-md bg-[var(--accent)] text-white font-semibold">Salvar</button></div>
        </form>`;
        openModal(content, 'book-modal');
        document.getElementById('form-livro').addEventListener('submit', handleBookFormSubmit);
        document.querySelector('#book-modal .btn-cancel').addEventListener('click', () => closeModal('book-modal'));
    }
    function handleBookFormSubmit(e){
        e.preventDefault();
        const form = e.target;
        const id = form.querySelector('#livro-id').value || uid();
        const paginasLidasAnterior = livros.find(l => l.id === id)?.paginasLidas || 0;
        
        const novo = {
            id,
            titulo: form.querySelector('#form-titulo').value.trim(),
            autor: form.querySelector('#form-autor').value.trim(),
            capa: form.querySelector('#form-capa').value.trim() || gerarCapaPadrao(form.querySelector('#form-titulo').value.trim()),
            genero: form.querySelector('#form-genero').value.trim(),
            paginas: parseInt(form.querySelector('#form-paginas').value) || 0,
            status: form.querySelector('#form-status').value,
            nota: parseFloat(form.querySelector('#form-nota').value) || null,
            resenha: form.querySelector('#form-resenha').value.trim() || '',
            paginasLidas: parseInt(form.querySelector('#form-paginas-lidas').value) || 0,
        };
        const idx = livros.findIndex(l => l.id === id);
        if(idx > -1){
            const old = livros[idx];
            if(old.status !== 'Lido' && novo.status === 'Lido') {
                novo.dataConclusao = Date.now();
                checkChallengeProgress(novo);
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            }
            livros[idx] = {...old, ...novo};
            showToast('Livro atualizado!');
        } else {
            if(novo.status === 'Lido') {
                novo.dataConclusao = Date.now();
                checkChallengeProgress(novo);
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            }
            novo.created = Date.now();
            novo.favorito = false;
            livros.unshift(novo);
            showToast('Livro adicionado!');
        }

        if (novo.paginasLidas > paginasLidasAnterior) {
            const today = toYYYYMMDD(new Date());
            readingLog[today] = true;
        }

        saveData();
        closeModal('book-modal');
    }

    // ----- Challenge Logic (unchanged) -----
    function openChallengeModal() {
        const content = `
        <form id="form-desafio" class="space-y-4">
            <h3 class="text-lg font-semibold">Novo Desafio Literário</h3>
            <div><label class="text-xs font-medium">Nome do Desafio</label><input id="desafio-nome" required class="w-full p-2 border border-[var(--border)] rounded-md bg-transparent" placeholder="Ex: Ler 5 livros de fantasia"></div>
            <div><label class="text-xs font-medium">Meta (nº de livros)</label><input id="desafio-meta" type="number" min="1" required class="w-full p-2 border border-[var(--border)] rounded-md"></div>
            <div><label class="text-xs font-medium">Critério</label><div class="flex gap-2 mt-1"><select id="desafio-tipo-criterio" class="p-2 border border-[var(--border)] rounded-md bg-transparent"><option value="genero">Gênero</option><option value="autor">Autor</option></select><input id="desafio-valor-criterio" required class="w-full p-2 border border-[var(--border)] rounded-md" placeholder="Ex: Fantasia"></div></div>
            <div class="flex justify-end gap-3 pt-2"><button type="button" class="btn-cancel py-2 px-4 rounded-md border border-[var(--border)]">Cancelar</button><button type="submit" class="py-2 px-4 rounded-md bg-[var(--accent)] text-white font-semibold">Criar</button></div>
        </form>`;
        openModal(content, 'challenge-modal');
        document.getElementById('form-desafio').addEventListener('submit', handleChallengeFormSubmit);
        document.querySelector('#challenge-modal .btn-cancel').addEventListener('click', () => closeModal('challenge-modal'));
    }
    function handleChallengeFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        desafios.push({
            id: uid(),
            nome: form.querySelector('#desafio-nome').value.trim(),
            meta: parseInt(form.querySelector('#desafio-meta').value) || 1,
            criterio: { tipo: form.querySelector('#desafio-tipo-criterio').value, valor: form.querySelector('#desafio-valor-criterio').value.trim() }
        });
        saveData();
        showToast('Novo desafio criado!');
        closeModal('challenge-modal');
    }
    function checkChallengeProgress(livroConcluido) {
        desafios.forEach(d => {
            const crit = d.criterio;
            let match = false;
            if (crit.tipo === 'genero' && livroConcluido.genero?.toLowerCase().includes(crit.valor.toLowerCase())) match = true;
            if (crit.tipo === 'autor' && livroConcluido.autor?.toLowerCase().includes(crit.valor.toLowerCase())) match = true;
            if(match) showToast(`Progresso no desafio: ${d.nome}`);
        });
    }

    // ----- Quotes Logic -----
    function setupQuotes() {
        const form = document.getElementById('form-quote');
        const grid = document.getElementById('quotes-grid');
        const addBtn = document.getElementById('add-quote-btn');
        const cancelBtn = document.getElementById('cancel-quote-btn');
        const formContainer = document.getElementById('quote-form-container');

        addBtn.addEventListener('click', () => {
            formContainer.classList.remove('hidden');
            addBtn.classList.add('hidden');
        });

        cancelBtn.addEventListener('click', () => {
            formContainer.classList.add('hidden');
            addBtn.classList.remove('hidden');
            form.reset();
        });
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = form.querySelector('#quote-text').value.trim();
            const author = form.querySelector('#quote-author').value.trim();
            const book = form.querySelector('#quote-book').value.trim();

            if (text.length > 0 && author.length > 0 && book.length > 0) {
                quotes.unshift({
                    id: uid(),
                    text,
                    author,
                    book
                });
                form.reset();
                formContainer.classList.add('hidden');
                addBtn.classList.remove('hidden');
                saveData();
                showToast('Pensamento salvo!');
            } else {
                showToast('Por favor, preencha todos os campos para salvar.', 3000);
            }
        });

        grid.addEventListener('click', e => {
            const deleteBtn = e.target.closest('.delete-quote');
            if(deleteBtn){
                const quoteId = deleteBtn.dataset.id;
                if(confirm('Tem certeza que quer apagar este pensamento?')){
                    quotes = quotes.filter(q => q.id !== quoteId);
                    saveData();
                    showToast('Pensamento apagado.');
                }
            }
        });
    }
    
    // ----- Pomodoro Timer (unchanged) -----
    let pomodoroInterval;
    let pomodoroTime = 25 * 60;
    const pomodoroTimerEl = document.getElementById('pomodoro-timer');
    
    function updatePomodoroDisplay() {
        const minutes = Math.floor(pomodoroTime / 60);
        const seconds = pomodoroTime % 60;
        pomodoroTimerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    function startPomodoro() {
        clearInterval(pomodoroInterval);
        pomodoroInterval = setInterval(() => {
            pomodoroTime--;
            updatePomodoroDisplay();
            if (pomodoroTime <= 0) {
                clearInterval(pomodoroInterval);
                playPomodoroSound();
                showToast("Sessão de leitura concluída!");
                const today = toYYYYMMDD(new Date());
                readingLog[today] = true;
                saveData();
            }
        }, 1000);
    }
    function resetPomodoro() {
        clearInterval(pomodoroInterval);
        pomodoroTime = 25 * 60;
        updatePomodoroDisplay();
    }
    function playPomodoroSound() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
            oscillator.connect(audioCtx.destination);
            oscillator.start();
            setTimeout(() => oscillator.stop(), 500);
        } catch (e) {
            console.warn("Could not play sound, user interaction may be required.");
        }
    }

    // ----- Rendering -----
    function renderAll(){
        renderDashboard();
        renderShelf();
        renderChallenges();
        renderCharts();
        renderCalendar();
        renderQuote();
        renderProgress();
        renderQuotesGrid();
        document.getElementById('frase-inspiradora').textContent = inspiracaoQuotes[Math.floor(Math.random() * inspiracaoQuotes.length)];
    }
    function renderDashboard() {
        const lidos = livros.filter(l => l.status === 'Lido');
        const paginas = livros.reduce((s, l) => s + (l.paginasLidas || 0), 0);
        document.getElementById('total-paginas').textContent = paginas.toLocaleString('pt-BR');
        document.getElementById('meta-count').textContent = lidos.length;
        const percent = metaAnual > 0 ? Math.round((lidos.length / metaAnual) * 100) : 0;
        document.getElementById('meta-percent').textContent = `${percent}%`;
        
        // Streak
        let currentStreak = 0;
        let today = new Date();
        let dateToCheck = new Date(today);
    
        if (!readingLog[toYYYYMMDD(today)]) {
            dateToCheck.setDate(today.getDate() - 1);
        }
        
        for (let i = 0; i < 365; i++) { 
            const dateStr = toYYYYMMDD(dateToCheck);
            if (readingLog[dateStr]) {
                currentStreak++;
            } else {
                break;
            }
            dateToCheck.setDate(dateToCheck.getDate() - 1);
        }
        document.getElementById('streak-count').textContent = `${currentStreak} dias`;
    }
    function renderShelf() {
        const grade = document.getElementById('grade');
        const res = filterAndSortBooks();
        document.getElementById('contador-exibidos').textContent = res.length;
        document.getElementById('contador-total').textContent = livros.length;
        document.getElementById('sem').classList.toggle('hidden', res.length > 0);
        grade.innerHTML = res.map(bookCardHTML).join('');
    }
    function renderChallenges() {
        const container = document.getElementById('grade-desafios');
        document.getElementById('sem-desafios').classList.toggle('hidden', desafios.length > 0);
        desafios.forEach(d => {
            d.progresso = livros.filter(l => {
                if(l.status !== 'Lido') return false;
                const criteriaValue = d.criterio.valor.toLowerCase();
                if(d.criterio.tipo === 'genero' && l.genero?.toLowerCase().includes(criteriaValue)) return true;
                if(d.criterio.tipo === 'autor' && l.autor?.toLowerCase().includes(criteriaValue)) return true;
                return false;
            }).length;
        });
        container.innerHTML = desafios.map(challengeCardHTML).join('');
    }
    function renderCalendar() {
        const container = document.getElementById('calendario-container');
        const today = new Date();
        const month = today.getMonth();
        const year = today.getFullYear();
        
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const daysOfWeek = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
        let html = `<div class="grid grid-cols-7 gap-1 text-center text-xs text-[var(--muted)] mb-2">${daysOfWeek.map(d => `<div>${d}</div>`).join('')}</div>`;
        html += '<div class="grid grid-cols-7 gap-1 text-center text-xs">';

        for(let i = 0; i < firstDayOfMonth; i++) html += '<div></div>';

        for(let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hasActivity = readingLog[dateStr];
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            html += `<div class="calendar-day p-1 rounded-full aspect-square flex items-center justify-center ${hasActivity ? 'has-activity' : ''} ${isToday ? 'border border-[var(--accent)]' : ''}">${day}</div>`;
        }
        html += '</div>';
        container.innerHTML = html;
    }
    function renderQuote() {
        const quoteContainer = document.getElementById('citacao-container');
        if (quotes && quotes.length > 0) {
            const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
            quoteContainer.innerHTML = `<div class="text-left"><p class="italic">“${escapeHtml(randomQuote.text)}”</p><p class="text-right mt-2 text-xs">— ${escapeHtml(randomQuote.author)} em <em>${escapeHtml(randomQuote.book)}</em></p></div>`;
            quoteContainer.classList.remove('flex', 'items-center', 'justify-center', 'text-center');
        } else {
            quoteContainer.innerHTML = 'Nenhuma citação salva.';
            quoteContainer.classList.add('flex', 'items-center', 'justify-center', 'text-center');
        }
    }

    // ----- NOVAS FUNÇÕES DE RENDERIZAÇÃO -----
    function renderProgress(){
        const container = document.getElementById('progress-content');
        const livroAtual = livros.find(l => l.status === 'Lendo');

        if(livroAtual){
            const { titulo, capa, paginas, paginasLidas, autor } = livroAtual;
            const progresso = paginas > 0 ? Math.round((paginasLidas / paginas) * 100) : 0;
            container.innerHTML = `
            <div class="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                <img src="${capa}" alt="Capa de ${escapeHtml(titulo)}" class="w-40 h-60 object-cover rounded-lg shadow-lg flex-shrink-0" onerror="this.onerror=null;this.src='${gerarCapaPadrao(titulo)}'">
                <div class="flex-1 w-full text-center md:text-left">
                    <p class="text-sm text-[var(--muted)]">Você está lendo</p>
                    <h2 class="text-2xl md:text-3xl font-bold mt-1">${escapeHtml(titulo)}</h2>
                    <p class="text-sm text-[var(--muted)] mt-1">de ${escapeHtml(autor)}</p>
                    <div class="mt-6">
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-sm font-medium text-[var(--accent)]">${progresso}% completo</span>
                            <span class="text-xs text-[var(--muted)]">${paginasLidas} de ${paginas} páginas</span>
                        </div>
                        <div class="w-full bg-[var(--border)] rounded-full h-2.5 overflow-hidden">
                            <div class="bg-[var(--accent)] h-2.5 rounded-full transition-all duration-500" style="width: ${progresso}%"></div>
                        </div>
                        <button class="btn-edit-progress mt-6 px-4 py-2 text-sm border border-[var(--border)] rounded-md hover:bg-[var(--glass)]" data-id="${livroAtual.id}">Atualizar progresso</button>
                    </div>
                </div>
            </div>
            `;
            container.querySelector('.btn-edit-progress').addEventListener('click', () => openBookModal(livroAtual));
        } else {
            container.innerHTML = `
            <div class="text-center py-10">
                <svg class="w-12 h-12 mx-auto text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                <h3 class="text-lg font-semibold mt-4">Nenhum livro em andamento</h3>
                <p class="text-[var(--muted)] mt-2">Mude o status de um livro para "Lendo" para acompanhar seu progresso aqui.</p>
            </div>
            `;
        }
    }

    function renderQuotesGrid(){
        const grid = document.getElementById('quotes-grid');
        const noQuotesMsg = document.getElementById('no-quotes');

        noQuotesMsg.classList.toggle('hidden', quotes.length > 0);

        grid.innerHTML = quotes.map(q => `
            <div class="card quote-card pop-in">
                <blockquote>“${escapeHtml(q.text)}”</blockquote>
                <footer>
                    <strong>${escapeHtml(q.author)}</strong> em <em>${escapeHtml(q.book)}</em>
                </footer>
                <button class="delete-quote" data-id="${q.id}" title="Apagar">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
        `).join('');
    }

    function generateStarsHTML(nota) {
        if (nota === null || nota === undefined || nota === 0) {
            return '<div class="h-5 mt-1"></div>';
        }
        const notaArredondada = Math.round(nota);
        let starsHTML = '<div class="flex items-center mt-1">';
        const fullStarSVG = `<svg class="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`;
        const emptyStarSVG = `<svg class="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`;
    
        for (let i = 0; i < 5; i++) {
            starsHTML += i < notaArredondada ? fullStarSVG : emptyStarSVG;
        }
    
        starsHTML += '</div>';
        return starsHTML;
    }

    function bookCardHTML(l){
        const progress = l.paginas ? Math.min(100, Math.round((l.paginasLidas / l.paginas) * 100)) : 0;
        return `
        <div class="card p-3 flex flex-col group pop-in" data-id="${l.id}">
            <div class="relative">
                <img src="${l.capa}" alt="Capa" class="w-full h-56 object-cover rounded-lg" onerror="this.onerror=null;this.src='${gerarCapaPadrao(l.titulo)}'">
                <div class="absolute top-2 left-2 text-xs bg-black/60 text-white px-2 py-1 rounded-full backdrop-blur-sm">${l.status}</div>
                <button class="btn-fav absolute top-2 right-2 p-2 bg-white/60 rounded-full backdrop-blur-sm hover:bg-white"><svg class="w-5 h-5 ${l.favorito ? 'text-red-500' : 'text-stone-600'}" fill="${l.favorito ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.5l1.318-1.182a4.5 4.5 0 116.364 6.364L12 21l-7.682-7.682a4.5 4.5 0 010-6.364z"></path></svg></button>
            </div>
            <div class="mt-3 flex-1 flex flex-col">
                <h4 class="font-bold truncate" title="${escapeHtml(l.titulo)}">${escapeHtml(l.titulo)}</h4>
                <p class="text-xs text-[var(--muted)]">${escapeHtml(l.autor)}</p>
                ${generateStarsHTML(l.nota)}
            </div>
            ${l.status === 'Lendo' ? `<div class="mt-2"><div class="w-full bg-[var(--border)] rounded-full h-1.5"><div style="width:${progress}%; background: var(--accent);" class="h-1.5 rounded-full"></div></div><div class="text-xs text-[var(--muted)] mt-1">${l.paginasLidas||0} / ${l.paginas||'--'}</div></div>` : `<div class="mt-2 invisible"><div class="h-1.5"></div><div class="text-xs mt-1">&nbsp;</div></div>`}
            <div class="flex justify-end items-center mt-auto pt-2 opacity-0 group-hover:opacity-100 transition-opacity"><button class="btn-edit p-2 rounded-full hover:bg-[var(--glass)]"><svg class="w-4 h-4 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z"></path></svg></button><button class="btn-delete p-2 rounded-full hover:bg-[var(--glass)]"><svg class="w-4 h-4 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button></div>
        </div>`;
    }
    function challengeCardHTML(d) {
        const progressPercent = d.meta > 0 ? Math.round((d.progresso / d.meta) * 100) : 0;
        return `
        <div class="card p-4 pop-in">
            <div class="flex justify-between items-start"><div><h4 class="font-bold">${escapeHtml(d.nome)}</h4><p class="text-xs text-[var(--muted)]">Critério: ${d.criterio.tipo} = "${escapeHtml(d.criterio.valor)}"</p></div><span class="font-bold text-[var(--accent)]">${d.progresso}/${d.meta}</span></div>
            <div class="w-full bg-[var(--border)] rounded-full h-2 overflow-hidden mt-3"><div style="width:${progressPercent}%; background: var(--accent);" class="h-2 rounded-full transition-all duration-500"></div></div>
        </div>`;
    }

    // ----- Filtering & Sorting (unchanged) -----
    function filterAndSortBooks() {
        const termo = document.getElementById('busca').value.toLowerCase();
        const status = document.getElementById('filtro-status').value;
        const ordenar = document.getElementById('ordenar').value;
        let res = livros.slice();
        if (status !== 'Todos') res = res.filter(r => r.status === status);
        if (termo) res = res.filter(r => (r.titulo||'').toLowerCase().includes(termo) || (r.autor||'').toLowerCase().includes(termo) || (r.genero||'').toLowerCase().includes(termo));
        if (ordenar === 'titulo') res.sort((a,b) => a.titulo.localeCompare(b.titulo));
        if (ordenar === 'nota') res.sort((a,b) => (b.nota||0) - (a.nota||0));
        if (ordenar === 'paginas') res.sort((a,b) => (b.paginas||0) - (a.paginas||0));
        if (ordenar === 'recent') res.sort((a,b) => (b.created||0) - (a.created||0));
        return res;
    }

    // ----- Charts (unchanged) -----
    let chartGenero, chartHistorico;
    function renderCharts() {
        if (!window.Chart) return;
        const chartGeneroCtx = document.getElementById('chart-genero').getContext('2d');
        const chartHistoricoCtx = document.getElementById('chart-historico').getContext('2d');
        
        const generoMap = {};
        livros.forEach(l => { if (l.genero) generoMap[l.genero] = (generoMap[l.genero] || 0) + 1; });
        const labelsGenero = Object.keys(generoMap); 
        const dataGenero = labelsGenero.map(l => generoMap[l]);
        
        if(chartGenero) chartGenero.destroy();
        chartGenero = new Chart(chartGeneroCtx, {
            type:'doughnut',
            data:{ labels: labelsGenero, datasets:[{ data: dataGenero, backgroundColor: ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80', '#34d399', '#2dd4bf', '#22d3ee', '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa'], borderWidth: 0, cutout: '70%' }] }, 
            options:{ plugins:{ legend:{ position:'bottom' } } }
        });

        const historyMap = {};
        const now = new Date();
        for(let i = 11; i >= 0; i--){ 
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = d.toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
            historyMap[key] = 0;
        }
        livros.forEach(l => { 
            if (l.dataConclusao) { 
                const d = new Date(l.dataConclusao);
                const key = d.toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
                if (key in historyMap) historyMap[key]++; 
            }
        });
        const labelsHistorico = Object.keys(historyMap); 
        const dataHistorico = Object.values(historyMap);
        
        if(chartHistorico) chartHistorico.destroy();
        chartHistorico = new Chart(chartHistoricoCtx, {
            type:'bar',
            data:{ labels: labelsHistorico, datasets:[{ label:'Livros concluídos', data: dataHistorico, backgroundColor: 'var(--accent)', borderRadius: 4, barPercentage: 0.6 }] },
            options:{ plugins:{ legend:{ display: false } },  scales:{ y:{ beginAtZero:true, ticks: { stepSize: 1 } } } }
        });
    }
    
    // ----- Google Books API (unchanged) -----
    function openGoogleBooksModal() {
        const content = `
            <div class="flex flex-col h-[70vh]">
                <h3 class="text-lg font-semibold mb-3">Buscar no Google Books</h3>
                <div class="flex gap-2 mb-4">
                    <input id="google-query" class="flex-1 p-2 border border-[var(--border)] rounded-md bg-transparent" placeholder="Título, autor ou ISBN..." />
                    <button id="google-search-btn" class="px-4 py-2 bg-[var(--accent)] text-white rounded-md font-semibold">Buscar</button>
                </div>
                <div id="google-results" class="flex-1 overflow-y-auto space-y-3">
                    <p class="text-center text-[var(--muted)]">Digite algo para buscar livros.</p>
                </div>
                <div class="flex justify-end pt-4">
                    <button type="button" class="btn-cancel py-2 px-4 rounded-md border border-[var(--border)]">Fechar</button>
                </div>
            </div>
        `;
        openModal(content, 'google-modal', 'max-w-3xl');
        document.getElementById('google-search-btn').addEventListener('click', searchGoogleBooks);
        document.getElementById('google-query').addEventListener('keyup', (e) => { if (e.key === 'Enter') searchGoogleBooks(); });
        document.querySelector('#google-modal .btn-cancel').addEventListener('click', () => closeModal('google-modal'));
    }
    async function searchGoogleBooks() {
        const query = document.getElementById('google-query').value.trim();
        const resultsContainer = document.getElementById('google-results');
        if (!query) return;
        resultsContainer.innerHTML = '<p class="text-center">Buscando...</p>';

        try {
            const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&printType=books`);
            const data = await response.json();
            if (data.items && data.items.length > 0) {
                resultsContainer.innerHTML = data.items.map(item => {
                    const book = item.volumeInfo;
                    const cover = book.imageLinks?.thumbnail || gerarCapaPadrao(book.title);
                    const authors = book.authors?.join(', ') || 'Autor desconhecido';
                    const pages = book.pageCount || 0;
                    const categories = book.categories?.[0] || '';
                    return `
                        <div class="flex gap-4 p-2 border border-[var(--border)] rounded-lg">
                            <img src="${cover}" class="w-16 h-24 object-cover rounded-md flex-shrink-0" alt="Capa de ${escapeHtml(book.title)}">
                            <div class="flex-1">
                                <h4 class="font-bold text-sm">${escapeHtml(book.title)}</h4>
                                <p class="text-xs text-[var(--muted)]">${escapeHtml(authors)}</p>
                                <p class="text-xs mt-1">${pages} páginas | Gênero: ${escapeHtml(categories)}</p>
                            </div>
                            <button class="btn-add-google self-start px-3 py-1 bg-[var(--accent)] text-white text-sm rounded-md" 
                                    data-title="${escapeHtml(book.title)}" 
                                    data-author="${escapeHtml(authors)}" 
                                    data-cover="${cover}"
                                    data-pages="${pages}"
                                    data-genre="${escapeHtml(categories)}">
                                Adicionar
                            </button>
                        </div>
                    `;
                }).join('');
                document.querySelectorAll('.btn-add-google').forEach(btn => btn.addEventListener('click', handleAddFromGoogle));
            } else {
                resultsContainer.innerHTML = '<p class="text-center">Nenhum livro encontrado.</p>';
            }
        } catch (error) {
            console.error("Error fetching from Google Books API:", error);
            resultsContainer.innerHTML = '<p class="text-center text-red-500">Erro ao buscar. Tente novamente.</p>';
        }
    }
    function handleAddFromGoogle(e) {
        const btnData = e.currentTarget.dataset;
        const prefill = {
            titulo: btnData.title,
            autor: btnData.author,
            capa: btnData.cover,
            paginas: btnData.pages,
            genero: btnData.genre,
            status: 'Quero Ler'
        };
        closeModal('google-modal');
        openBookModal(prefill);
    }
    
    // ----- Import/Export -----
    function exportToCsv() {
        const headers = ['titulo', 'autor', 'genero', 'status', 'nota', 'paginas', 'paginasLidas', 'dataConclusao', 'resenha'];
        const rows = livros.map(livro =>
            headers.map(header => {
                let value = livro[header] === null || livro[header] === undefined ? '' : livro[header];
                value = String(value).replace(/"/g, '""');
                if (String(value).includes(',') || String(value).includes('"') || String(value).includes('\n')) {
                    value = `"${value}"`;
                }
                return value;
            }).join(',')
        );
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "minha_biblioteca.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Exportado para CSV!');
    }
    function exportToJson() {
        const dataStr = JSON.stringify({ livros, desafios, metaAnual, readingLog, settings, quotes }, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bookdash_backup.json';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Backup JSON exportado!');
        hasUnexportedChanges = false;
    }
    function handleFileImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (confirm('Isso irá sobrescrever seus dados atuais. Continuar?')) {
                    livros = data.livros || [];
                    desafios = data.desafios || [];
                    quotes = data.quotes || [];
                    metaAnual = data.metaAnual || 12;
                    readingLog = data.readingLog || {};
                    settings = data.settings || { pagesPerHour: 30 };
                    saveData();
                    hasUnexportedChanges = false;
                    showToast('Dados importados com sucesso!');
                }
            } catch (err) {
                showToast('Erro: Arquivo JSON inválido.');
                console.error(err);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    // ----- Event Listeners -----
    document.getElementById('grade').addEventListener('click', e => {
        const card = e.target.closest('.card');
        if(!card) return;
        const livro = livros.find(l => l.id === card.dataset.id);
        if(!livro) return;

        if(e.target.closest('.btn-edit')) openBookModal(livro);
        else if(e.target.closest('.btn-delete')) {
            if(confirm('Excluir este livro?')) {
                livros = livros.filter(l => l.id !== livro.id);
                saveData();
                showToast('Livro excluído.');
            }
        }
        else if(e.target.closest('.btn-fav')) {
            livro.favorito = !livro.favorito;
            saveData();
        }
    });
    document.getElementById('pomodoro-start').addEventListener('click', startPomodoro);
    document.getElementById('pomodoro-reset').addEventListener('click', resetPomodoro);
    document.getElementById('novo-livro').addEventListener('click', () => openBookModal());
    document.getElementById('novo-desafio').addEventListener('click', openChallengeModal);
    document.getElementById('abrir-google').addEventListener('click', openGoogleBooksModal);
    document.getElementById('backup-export').addEventListener('click', exportToJson);
    document.getElementById('csv-export').addEventListener('click', exportToCsv);
    document.getElementById('import-btn').addEventListener('click', () => document.getElementById('file-import').click());
    document.getElementById('file-import').addEventListener('change', handleFileImport);
    
    document.getElementById('busca').addEventListener('input', renderShelf);
    document.getElementById('filtro-status').addEventListener('change', renderShelf);
    document.getElementById('ordenar').addEventListener('change', renderShelf);
    
    const setupTheme = () => {
        const toggle = document.getElementById('theme-toggle');
        const sepiaToggle = document.getElementById('theme-sepia-toggle');
        
        const applyTheme = (theme) => {
            document.body.dataset.theme = theme;
            themeIcon.innerHTML = (theme === 'dark' || theme === 'sepia') ? sunIcon : moonIcon;
            localStorage.setItem('theme', theme);
        }

        toggle.addEventListener('click', () => {
            const current = document.body.dataset.theme;
            applyTheme(current === 'dark' ? 'light' : 'dark');
        });

        sepiaToggle.addEventListener('click', () => {
            const current = document.body.dataset.theme;
            applyTheme(current === 'sepia' ? 'light' : 'sepia');
        });
        
        const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        applyTheme(savedTheme);

        const month = new Date().getMonth();
        document.body.classList.remove('theme-autumn', 'theme-christmas', 'theme-spring');

        if (month >= 2 && month <= 4) {
            document.body.classList.add('theme-autumn');
        } else if (month >= 8 && month <= 10) {
            document.body.classList.add('theme-spring');
        } else if (month === 11) {
            document.body.classList.add('theme-christmas');
        }
    };
    
    window.addEventListener('beforeunload', (event) => {
        if (hasUnexportedChanges) {
            const message = 'Você tem alterações não salvas que não foram exportadas. Deseja realmente sair?';
            event.preventDefault();
            event.returnValue = message;
            return message;
        }
    });

    // ----- Init -----
    function init(){
        setupTheme();
        setupNavigation();
        setupQuotes();
        loadData();
        updatePomodoroDisplay();
    }
    
    init();
});
