document.addEventListener('DOMContentLoaded', function () {
    const runBtn = document.getElementById('runBtn');
    const clearBtn = document.getElementById('clearBtn');
    const copyBtn = document.getElementById('copyBtn');
    const exportBtn = document.getElementById('exportBtn');
    const toggleBtn = document.getElementById('toggleBtn');
    const codeInput = document.getElementById('codeInput');
    const output = document.getElementById('output');
    const status = document.getElementById('status');
    const outputPanel = document.getElementById('outputPanel');
    const resizeHandle = document.getElementById('resizeHandle');

    // Tablas
    const tablaSimbolos = document.getElementById('tabla-simbolos');
    const tablaErrores = document.getElementById('tabla-errores');
    const tablaTriplos = document.getElementById('tabla-triplos');
    const codigoOptimizado = document.getElementById('codigo-optimizado');

    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    const lineNumbers = document.getElementById('lineNumbers');

    function updateLineNumbers() {
        const lines = codeInput.value.split('\n').length;
        let numbersHtml = '';
        for (let i = 1; i <= lines; i++) {
            numbersHtml += `<span>${i}</span>`;
        }
        lineNumbers.innerHTML = numbersHtml;
    }

    codeInput.addEventListener('scroll', function () {
        lineNumbers.scrollTop = codeInput.scrollTop;
    });

    codeInput.addEventListener('input', updateLineNumbers);

    codeInput.value = TEXTO_INICIAL;
    updateLineNumbers();

    tabBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const tabName = this.getAttribute('data-tab');
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(tabName).classList.add('active');
        });
    });

    const savedHeight = localStorage.getItem('consolePanelHeight');
    const savedWidth = localStorage.getItem('consolePanelWidth');
    const savedMinimized = localStorage.getItem('consolePanelMinimized') === 'true';

    const isHorizontal = window.innerWidth > 600;
    if (isHorizontal) {
        if (savedWidth) {
            outputPanel.style.width = savedWidth + 'px';
            outputPanel.style.height = '';
        }
    } else {
        if (savedHeight) {
            outputPanel.style.height = savedHeight + 'px';
            outputPanel.style.width = '';
        }
    }

    if (savedMinimized) {
        outputPanel.classList.add('minimized');
    }

    let isResizing = false;
    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;

    resizeHandle.addEventListener('mousedown', function (e) {
        isResizing = true;
        const isHorizontalLayout = window.innerWidth > 600;
        if (isHorizontalLayout) {
            startX = e.clientX;
            startWidth = outputPanel.offsetWidth;
            document.body.style.cursor = 'ew-resize';
        } else {
            startY = e.clientY;
            startHeight = outputPanel.offsetHeight;
            document.body.style.cursor = 'ns-resize';
        }
        e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
        if (!isResizing) return;
        const isHorizontalLayout = window.innerWidth > 600;
        if (isHorizontalLayout) {
            const delta = startX - e.clientX;
            const newWidth = startWidth + delta;
            const maxWidth = window.innerWidth * 0.85;
            if (newWidth >= 200 && newWidth <= maxWidth) {
                outputPanel.style.width = newWidth + 'px';
                outputPanel.style.height = '';
                outputPanel.classList.remove('minimized');
                localStorage.setItem('consolePanelWidth', newWidth);
            }
        } else {
            const delta = startY - e.clientY;
            const newHeight = startHeight + delta;
            if (newHeight >= 100 && newHeight <= 600) {
                outputPanel.style.height = newHeight + 'px';
                outputPanel.style.width = '';
                outputPanel.classList.remove('minimized');
                localStorage.setItem('consolePanelHeight', newHeight);
            }
        }
    });

    document.addEventListener('mouseup', function () {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = '';
        }
    });

    function updateToggleIcon(isMinimized) {
        const svg = toggleBtn.querySelector('svg polyline');
        const isHorizontalLayout = window.innerWidth > 600;
        if (isHorizontalLayout) {
            svg.setAttribute('points', isMinimized ? '15 18 9 12 15 6' : '9 18 15 12 9 6');
        } else {
            svg.setAttribute('points', isMinimized ? '6 9 12 15 18 9' : '18 15 12 9 6 15');
        }
    }

    updateToggleIcon(savedMinimized);

    toggleBtn.addEventListener('click', function () {
        outputPanel.classList.toggle('minimized');
        const isMinimized = outputPanel.classList.contains('minimized');
        localStorage.setItem('consolePanelMinimized', isMinimized);
        updateToggleIcon(isMinimized);
    });

    // ── Helper: llenar tabla de símbolos ──────────────────────────────────────
    function llenarTablaSimbolos(lexemaDict) {
        tablaSimbolos.innerHTML = '';
        const simbolos = Object.entries(lexemaDict);
        if (simbolos.length === 0) {
            tablaSimbolos.innerHTML = '<tr><td colspan="2" class="empty-state">No hay símbolos</td></tr>';
        } else {
            simbolos.forEach(([lexema, tipo]) => {
                const row = document.createElement('tr');
                row.innerHTML = `<td>${lexema}</td><td>${tipo === 'Indeterminado' ? '' : tipo}</td>`;
                tablaSimbolos.appendChild(row);
            });
        }
        return simbolos;
    }

    // ── Helper: llenar tabla de errores ───────────────────────────────────────
    function llenarTablaErrores(errores) {
        tablaErrores.innerHTML = '';
        if (errores.length === 0) {
            tablaErrores.innerHTML = '<tr><td colspan="4" class="empty-state">✓ No hay errores</td></tr>';
        } else {
            errores.forEach(error => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${error.token}</td>
                    <td>${error.lexema}</td>
                    <td>${error.linea}</td>
                    <td>${error.descripcion}</td>
                `;
                tablaErrores.appendChild(row);
            });
        }
    }

    // ── Helper: llenar tabla de triplos ───────────────────────────────────────
    function llenarTablaTriplos(codigoFuente) {
        const dict = generarTriplos(codigoFuente);
        const entradas = tablaTriplosAEntradas(dict);
        tablaTriplos.innerHTML = '';
        if (entradas.length === 0) {
            tablaTriplos.innerHTML = '<tr><td colspan="4" class="empty-state">No se generaron triplos</td></tr>';
        } else {
            entradas.forEach(function (e) {
                const row = document.createElement('tr');
                [e.noLinea, e.datoObjeto, e.datoFuente, e.operador].forEach(function (val) {
                    const td = document.createElement('td');
                    td.textContent = val === undefined || val === null ? '' : String(val);
                    row.appendChild(td);
                });
                tablaTriplos.appendChild(row);
            });
        }
        return entradas.length;
    }

    // ── Evento Run ────────────────────────────────────────────────────────────
    runBtn.addEventListener('click', function () {
        const codigo = codeInput.value.trim();

        if (!codigo) {
            status.textContent = 'No hay código para compilar';
            status.style.color = 'var(--text-secondary)';
            return;
        }

        if (outputPanel.classList.contains('minimized')) {
            outputPanel.classList.remove('minimized');
            localStorage.setItem('consolePanelMinimized', 'false');
            updateToggleIcon(false);
        }

        output.innerHTML = '';

        try {
            // ── PASO 1: Optimización (siempre primero) ────────────────────────
            const codigoOpt = optimizarCodigo(codeInput.value);

            // Mostrar código optimizado en la pestaña
            if (!codigoOpt || codigoOpt.trim() === '') {
                codigoOptimizado.innerHTML = '<div class="opt-line empty">No hay asignaciones optimizables</div>';
            } else {
                codigoOptimizado.innerHTML = '';
                const lineasOriginales = codeInput.value.split('\n');
                const lineasOpt = codigoOpt.split('\n');
                lineasOpt.forEach((linea, index) => {
                    const originalLinea = lineasOriginales[index] || '';
                    const esOptimizado = linea.replace(/\s+/g, '') !== originalLinea.replace(/\s+/g, '');
                    const div = document.createElement('div');
                    div.className = 'opt-line' + (esOptimizado ? ' optimized' : '');
                    if (esOptimizado) div.title = 'Línea optimizada';
                    div.dataset.line = index + 1;
                    div.textContent = linea === '' ? ' ' : linea;
                    div.addEventListener('click', function () {
                        const lineNum = parseInt(this.dataset.line);
                        highlightOptimizedLine(this);
                        highlightLineNumber(lineNum);
                        const range = getCharacterRangeOfLine(codeInput.value, lineNum);
                        codeInput.focus();
                        codeInput.setSelectionRange(range.start, range.end);
                        const lineHeight = 14 * 1.8;
                        const totalTextHeight = codeInput.value.split('\n').length * lineHeight;
                        if (totalTextHeight <= codeInput.clientHeight) {
                            codeInput.scrollTop = 0;
                        } else {
                            const lineTop = (lineNum - 1) * lineHeight;
                            const viewHeight = codeInput.clientHeight;
                            const currentScroll = codeInput.scrollTop;
                            if (lineTop < currentScroll || lineTop > (currentScroll + viewHeight - lineHeight)) {
                                codeInput.scrollTop = Math.max(0, lineTop - (viewHeight / 2));
                            }
                        }
                        lineNumbers.scrollTop = codeInput.scrollTop;
                    });
                    codigoOptimizado.appendChild(div);
                });
            }

            // ── PASO 2: Usar código optimizado para todas las tablas ──────────
            // Si hubo optimización, las tablas reflejan el código optimizado.
            // Aunque haya errores semánticos el proceso continúa.
            const codigoParaProcesar = (codigoOpt && codigoOpt.trim()) ? codigoOpt : codigo;

            // Tabla de símbolos
            const lexemaDict = generarTablaSimbolos(codigoParaProcesar);
            const simbolos = llenarTablaSimbolos(lexemaDict);

            // Tabla de errores (continúa aunque haya errores semánticos)
            const errores = generarTablaErrores(codigoParaProcesar, lexemaDict);
            llenarTablaErrores(errores);

            // Tabla de triplos
            const totalTriplos = llenarTablaTriplos(codigoParaProcesar);

            // ── PASO 3: Consola ───────────────────────────────────────────────
            output.innerHTML = `
                <div class="output-line" style="color: var(--accent); font-weight: bold;">
                    > ════════════════════════════════════════
                </div>
                <div class="output-line">
                    > COMPILACIÓN COMPLETADA
                </div>
                <div class="output-line" style="color: var(--accent); font-weight: bold;">
                    > ════════════════════════════════════════
                </div>
                <div class="output-line">
                    > Símbolos encontrados: ${simbolos.length}
                </div>
                <div class="output-line" style="color: ${errores.length > 0 ? '#d32f2f' : 'var(--accent)'}">
                    > Errores detectados: ${errores.length}
                </div>
                <div class="output-line">
                    > Triplos generados: ${totalTriplos}
                </div>
                <div class="output-line">
                    > Optimización: código procesado (ver pestaña Optimización)
                </div>
                <div class="output-line" style="color: var(--accent); font-weight: bold;">
                    > ════════════════════════════════════════
                </div>
                <div class="output-line" style="margin-top: 1rem;">
                    ${errores.length === 0
                    ? '> ✓ Código compilado exitosamente'
                    : `> ✗ Se encontraron ${errores.length} error(es) - Ver pestaña Errores`
                }
                </div>
            `;

            if (errores.length === 0) {
                status.textContent = '✓ Compiled successfully';
                status.style.color = 'var(--accent)';
            } else {
                status.textContent = `✗ ${errores.length} error(s) found`;
                status.style.color = '#d32f2f';
            }

        } catch (error) {
            output.innerHTML = `
                <div class="output-line" style="color: #d32f2f;">
                    > ERROR DE COMPILACIÓN
                </div>
                <div class="output-line">
                    > ${error.message}
                </div>
            `;
            status.textContent = '✗ Compilation failed';
            status.style.color = '#d32f2f';
            console.error(error);
        }
    });

    clearBtn.addEventListener('click', function () {
        codeInput.value = '';
        codeInput.focus();
    });

    exportBtn.addEventListener('click', function () {
        const tabActiva = document.querySelector('.tab-btn.active').getAttribute('data-tab');
        if (tabActiva === 'simbolos') {
            exportarTablaSimbolosCSV();
        } else if (tabActiva === 'errores') {
            exportarTablaErroresCSV();
        } else if (tabActiva === 'triplos') {
            exportarTablaTriplosCSV();
        } else if (tabActiva === 'optimizacion') {
            exportarCodigoOptimizado();
        } else {
            descargarArchivo('console.txt', output.innerText);
            status.textContent = 'Console exported';
            status.style.color = 'var(--accent)';
        }
    });

    function exportarTablaSimbolosCSV() {
        const filas = tablaSimbolos.querySelectorAll('tr');
        if (filas.length === 0 || filas[0].querySelector('.empty-state')) {
            status.textContent = 'No hay símbolos para exportar';
            status.style.color = 'var(--text-secondary)';
            return;
        }
        let csv = 'Lexema,Tipo de dato\n';
        filas.forEach(fila => {
            const celdas = fila.querySelectorAll('td');
            if (celdas.length === 2) csv += `"${celdas[0].textContent}","${celdas[1].textContent}"\n`;
        });
        descargarArchivo('tabla_simbolos.csv', csv);
        status.textContent = '✓ Tabla de símbolos exportada';
        status.style.color = 'var(--accent)';
    }

    function exportarTablaErroresCSV() {
        const filas = tablaErrores.querySelectorAll('tr');
        if (filas.length === 0 || filas[0].querySelector('.empty-state')) {
            status.textContent = 'No hay errores para exportar';
            status.style.color = 'var(--text-secondary)';
            return;
        }
        let csv = 'Token,Lexema,Renglón,Descripción\n';
        filas.forEach(fila => {
            const celdas = fila.querySelectorAll('td');
            if (celdas.length === 4) csv += `"${celdas[0].textContent}","${celdas[1].textContent}","${celdas[2].textContent}","${celdas[3].textContent}"\n`;
        });
        descargarArchivo('tabla_errores.csv', csv);
        status.textContent = '✓ Tabla de errores exportada';
        status.style.color = 'var(--accent)';
    }

    function exportarCodigoOptimizado() {
        const divs = codigoOptimizado.querySelectorAll('.opt-line');
        let texto = divs.length > 0
            ? Array.from(divs).map(d => d.textContent).join('\n')
            : codigoOptimizado.textContent;
        if (!texto || texto === 'Ejecuta Run para ver el código optimizado' || texto === 'No hay asignaciones optimizables') {
            status.textContent = 'No hay código optimizado para exportar';
            status.style.color = 'var(--text-secondary)';
            return;
        }
        descargarArchivo('codigo_optimizado.txt', texto, 'text/plain;charset=utf-8;');
        status.textContent = '✓ Código optimizado exportado';
        status.style.color = 'var(--accent)';
    }

    function exportarTablaTriplosCSV() {
        const filas = tablaTriplos.querySelectorAll('tr');
        if (filas.length === 0 || filas[0].querySelector('.empty-state')) {
            status.textContent = 'No hay triplos para exportar';
            status.style.color = 'var(--text-secondary)';
            return;
        }
        let csv = 'No. Línea,Operador,Dato Objeto,Dato Fuente\n';
        filas.forEach(function (fila) {
            const celdas = fila.querySelectorAll('td');
            if (celdas.length === 4) csv += '"' + celdas[0].textContent + '","' + celdas[1].textContent + '","' + celdas[2].textContent + '","' + celdas[3].textContent + '"\n';
        });
        descargarArchivo('tabla_triplos.csv', csv);
        status.textContent = '✓ Tabla de triplos exportada';
        status.style.color = 'var(--accent)';
    }

    function descargarArchivo(nombreArchivo, contenido, mimeType) {
        const blob = new Blob([contenido], { type: mimeType || 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = nombreArchivo;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    copyBtn.addEventListener('click', function () {
        const tabActiva = document.querySelector('.tab-btn.active').getAttribute('data-tab');
        let text = output.innerText;
        if (tabActiva === 'optimizacion') {
            const divs = codigoOptimizado.querySelectorAll('.opt-line');
            text = divs.length > 0 ? Array.from(divs).map(d => d.textContent).join('\n') : codigoOptimizado.textContent;
        }
        navigator.clipboard.writeText(text).then(() => {
            status.textContent = 'Copied to clipboard';
            status.style.color = 'var(--accent)';
            setTimeout(() => { status.textContent = ''; }, 2000);
        });
    });

    function getCharacterRangeOfLine(text, lineNumber) {
        const lines = text.split('\n');
        let start = 0;
        for (let i = 0; i < lineNumber - 1; i++) start += lines[i].length + 1;
        return { start, end: start + lines[lineNumber - 1].length };
    }

    function highlightOptimizedLine(clickedDiv) {
        codigoOptimizado.querySelectorAll('.opt-line').forEach(div => div.classList.remove('active-line'));
        clickedDiv.classList.add('active-line');
    }

    function highlightLineNumber(lineNum) {
        lineNumbers.querySelectorAll('span').forEach((span, index) => {
            span.classList.toggle('active-line', index === lineNum - 1);
        });
    }
});