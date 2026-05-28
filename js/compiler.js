document.addEventListener('DOMContentLoaded', function () {
    const runBtn      = document.getElementById('runBtn');
    const clearBtn    = document.getElementById('clearBtn');
    const copyBtn     = document.getElementById('copyBtn');
    const exportBtn   = document.getElementById('exportBtn');
    const toggleBtn   = document.getElementById('toggleBtn');
    const codeInput   = document.getElementById('codeInput');
    const output      = document.getElementById('output');
    const status      = document.getElementById('status');
    const outputPanel = document.getElementById('outputPanel');
    const resizeHandle = document.getElementById('resizeHandle');

    // Tablas
    const tablaSimbolos    = document.getElementById('tabla-simbolos');
    const tablaErrores     = document.getElementById('tabla-errores');
    const tablaTriplos     = document.getElementById('tabla-triplos');
    const codigoOptimizado = document.getElementById('codigo-optimizado');
    const tablaEnsamblador = document.getElementById('tabla-ensamblador');

    // Tabs
    const tabBtns     = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const lineNumbers = document.getElementById('lineNumbers');

    // Guarda el último texto .asm generado para poder re-descargarlo con el botón Export
    let _ultimoASM = '';

    // ── Números de línea ─────────────────────────────────────────────────────
    function updateLineNumbers() {
        const lines = codeInput.value.split('\n').length;
        let html = '';
        for (let i = 1; i <= lines; i++) html += `<span>${i}</span>`;
        lineNumbers.innerHTML = html;
    }

    codeInput.addEventListener('scroll', () => { lineNumbers.scrollTop = codeInput.scrollTop; });
    codeInput.addEventListener('input',  updateLineNumbers);
    codeInput.value = TEXTO_INICIAL;
    updateLineNumbers();

    // ── Tabs ─────────────────────────────────────────────────────────────────
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const name = this.getAttribute('data-tab');
            tabBtns.forEach(b    => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(name).classList.add('active');
        });
    });

    // ── Panel resize ─────────────────────────────────────────────────────────
    const savedWidth     = localStorage.getItem('consolePanelWidth');
    const savedHeight    = localStorage.getItem('consolePanelHeight');
    const savedMinimized = localStorage.getItem('consolePanelMinimized') === 'true';

    if (window.innerWidth > 600) {
        if (savedWidth)  { outputPanel.style.width = savedWidth + 'px'; outputPanel.style.height = ''; }
    } else {
        if (savedHeight) { outputPanel.style.height = savedHeight + 'px'; outputPanel.style.width = ''; }
    }
    if (savedMinimized) outputPanel.classList.add('minimized');

    let isResizing = false, startX = 0, startY = 0, startWidth = 0, startHeight = 0;

    resizeHandle.addEventListener('mousedown', e => {
        isResizing = true;
        if (window.innerWidth > 600) {
            startX = e.clientX; startWidth = outputPanel.offsetWidth;
            document.body.style.cursor = 'ew-resize';
        } else {
            startY = e.clientY; startHeight = outputPanel.offsetHeight;
            document.body.style.cursor = 'ns-resize';
        }
        e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
        if (!isResizing) return;
        if (window.innerWidth > 600) {
            const nw = startWidth + (startX - e.clientX);
            if (nw >= 200 && nw <= window.innerWidth * 0.85) {
                outputPanel.style.width = nw + 'px'; outputPanel.style.height = '';
                outputPanel.classList.remove('minimized');
                localStorage.setItem('consolePanelWidth', nw);
            }
        } else {
            const nh = startHeight + (startY - e.clientY);
            if (nh >= 100 && nh <= 600) {
                outputPanel.style.height = nh + 'px'; outputPanel.style.width = '';
                outputPanel.classList.remove('minimized');
                localStorage.setItem('consolePanelHeight', nh);
            }
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) { isResizing = false; document.body.style.cursor = ''; }
    });

    function updateToggleIcon(min) {
        const pts = toggleBtn.querySelector('svg polyline');
        if (window.innerWidth > 600)
            pts.setAttribute('points', min ? '15 18 9 12 15 6' : '9 18 15 12 9 6');
        else
            pts.setAttribute('points', min ? '6 9 12 15 18 9'  : '18 15 12 9 6 15');
    }
    updateToggleIcon(savedMinimized);

    toggleBtn.addEventListener('click', () => {
        outputPanel.classList.toggle('minimized');
        const m = outputPanel.classList.contains('minimized');
        localStorage.setItem('consolePanelMinimized', m);
        updateToggleIcon(m);
    });

    // ── Helpers: llenar tablas ────────────────────────────────────────────────
    function llenarTablaSimbolos(dict) {
        tablaSimbolos.innerHTML = '';
        const simbolos = Object.entries(dict);
        if (simbolos.length === 0) {
            tablaSimbolos.innerHTML = '<tr><td colspan="2" class="empty-state">No hay símbolos</td></tr>';
        } else {
            simbolos.forEach(([lex, tipo]) => {
                const row = document.createElement('tr');
                row.innerHTML = `<td>${lex}</td><td>${tipo === 'Indeterminado' ? '' : tipo}</td>`;
                tablaSimbolos.appendChild(row);
            });
        }
        return simbolos;
    }

    function llenarTablaErrores(errores) {
        tablaErrores.innerHTML = '';
        if (errores.length === 0) {
            tablaErrores.innerHTML = '<tr><td colspan="4" class="empty-state">✓ No hay errores</td></tr>';
        } else {
            errores.forEach(err => {
                const row = document.createElement('tr');
                row.innerHTML = `<td>${err.token}</td><td>${err.lexema}</td><td>${err.linea}</td><td>${err.descripcion}</td>`;
                tablaErrores.appendChild(row);
            });
        }
    }

    // Devuelve { dict, total } — necesitamos el dict para pasarlo al ensamblador
    function llenarTablaTriplos(codigo) {
        const dict    = generarTriplos(codigo);
        const filas   = tablaTriplosAEntradas(dict);
        tablaTriplos.innerHTML = '';
        if (filas.length === 0) {
            tablaTriplos.innerHTML = '<tr><td colspan="4" class="empty-state">No se generaron triplos</td></tr>';
        } else {
            filas.forEach(f => {
                const row = document.createElement('tr');
                [f.noLinea, f.datoObjeto, f.datoFuente, f.operador].forEach(v => {
                    const td = document.createElement('td');
                    td.textContent = v === undefined || v === null ? '' : String(v);
                    row.appendChild(td);
                });
                tablaTriplos.appendChild(row);
            });
        }
        return { dict, total: filas.length };
    }

    // Llena la tabla visual de la pestaña Ensamblador y devuelve el conteo
    function llenarTablaEnsamblador(textoCSV) {
    tablaEnsamblador.innerHTML = '';

    if (!textoCSV || textoCSV.trim() === '') {
        tablaEnsamblador.innerHTML =
            '<tr><td colspan="3" class="empty-state">No se generó código ensamblador</td></tr>';
        return 0;
    }

    // Parsear CSV: separar por líneas, saltar encabezado
    const lineas = textoCSV.split('\n');
    let count = 0;

    lineas.forEach((linea, idx) => {
        if (idx === 0) return; // saltar encabezado "Etiqueta,Instruccion,Nota"
        if (linea.trim() === '') return;

        // Parsear las 3 columnas CSV (cada campo entre comillas dobles)
        const match = linea.match(/^"(.*?)","(.*?)","(.*?)"$/s);
        if (!match) return;

        const etqVal   = match[1].replace(/""/g, '"');
        const instrVal = match[2].replace(/""/g, '"');
        const notaVal  = match[3].replace(/""/g, '"');

        const row = document.createElement('tr');

        if (etqVal && instrVal === '' && notaVal === '') {
            // Fila de etiqueta pura (ET5:)
            row.classList.add('asm-label-row');
            row.innerHTML = `<td class="asm-label">${_esc(etqVal)}</td><td></td><td></td>`;
        } else if (instrVal.trim() !== '') {
            count++;
            row.innerHTML = `
                <td class="asm-label">${_esc(etqVal)}</td>
                <td class="asm-instr">${_esc(instrVal)}</td>
                <td class="asm-nota">${_esc(notaVal)}</td>`;
        } else {
            return; // fila vacía
        }

        tablaEnsamblador.appendChild(row);
    });

    return count;
}

    function _esc(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    // ── EVENTO RUN ────────────────────────────────────────────────────────────
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
            // ── PASO 1: Optimización ──────────────────────────────────────────
            const codigoOpt = optimizarCodigo(codeInput.value);

            // Mostrar en pestaña Optimización
            if (!codigoOpt || codigoOpt.trim() === '') {
                codigoOptimizado.innerHTML = '<div class="opt-line empty">No hay asignaciones optimizables</div>';
            } else {
                codigoOptimizado.innerHTML = '';
                const lineasOrig = codeInput.value.split('\n');
                const lineasOpt  = codigoOpt.split('\n');
                lineasOpt.forEach((linea, idx) => {
                    const orig = lineasOrig[idx] || '';
                    const opt  = linea.replace(/\s+/g,'') !== orig.replace(/\s+/g,'');
                    const div  = document.createElement('div');
                    div.className   = 'opt-line' + (opt ? ' optimized' : '');
                    if (opt) div.title = 'Línea optimizada';
                    div.dataset.line = idx + 1;
                    div.textContent  = linea === '' ? ' ' : linea;
                    div.addEventListener('click', function () {
                        const ln = parseInt(this.dataset.line);
                        highlightOptimizedLine(this);
                        highlightLineNumber(ln);
                        const range = getCharacterRangeOfLine(codeInput.value, ln);
                        codeInput.focus();
                        codeInput.setSelectionRange(range.start, range.end);
                        const lh   = 14 * 1.8;
                        const tot  = codeInput.value.split('\n').length * lh;
                        if (tot <= codeInput.clientHeight) {
                            codeInput.scrollTop = 0;
                        } else {
                            const top = (ln - 1) * lh;
                            const vh  = codeInput.clientHeight;
                            const cs  = codeInput.scrollTop;
                            if (top < cs || top > cs + vh - lh)
                                codeInput.scrollTop = Math.max(0, top - vh / 2);
                        }
                        lineNumbers.scrollTop = codeInput.scrollTop;
                    });
                    codigoOptimizado.appendChild(div);
                });
            }

            // ── PASO 2: El código a procesar siempre es el optimizado ─────────
            // Aunque haya errores semánticos, se continúa con todo el proceso
            const codigoProcesar = (codigoOpt && codigoOpt.trim()) ? codigoOpt : codigo;

            // Tabla de símbolos
            const lexemaDict = generarTablaSimbolos(codigoProcesar);
            const simbolos   = llenarTablaSimbolos(lexemaDict);

            // Tabla de errores (no detiene el proceso)
            const errores = generarTablaErrores(codigoProcesar, lexemaDict);
            llenarTablaErrores(errores);

            // Tabla de triplos
            const { dict: dictTriplos, total: totalTriplos } = llenarTablaTriplos(codigoProcesar);

            // ── PASO 3: GENERAR CÓDIGO ENSAMBLADOR ────────────────────────────
            // Se ejecuta SIEMPRE, independientemente de errores semánticos
            const textoASM = compilarAEnsamblador(dictTriplos);
            _ultimoASM     = textoASM;

            // Llenar tabla visual (pestaña Ensamblador)
            const totalInstr = llenarTablaEnsamblador(textoASM);

            // ── PASO 4: DESCARGAR ARCHIVO .ASM AUTOMÁTICAMENTE ────────────────
            if (textoASM && textoASM.trim() !== '') {
                descargarASM(textoASM);
            }

            // ── PASO 5: Consola ───────────────────────────────────────────────
            output.innerHTML = `
                <div class="output-line" style="color:var(--accent);font-weight:bold;">
                    > ════════════════════════════════════════
                </div>
                <div class="output-line">
                    > COMPILACIÓN COMPLETADA
                </div>
                <div class="output-line" style="color:var(--accent);font-weight:bold;">
                    > ════════════════════════════════════════
                </div>
                <div class="output-line">
                    > Símbolos encontrados: ${simbolos.length}
                </div>
                <div class="output-line" style="color:${errores.length > 0 ? '#d32f2f' : 'var(--accent)'}">
                    > Errores detectados: ${errores.length}
                </div>
                <div class="output-line">
                    > Triplos generados: ${totalTriplos}
                </div>
                <div class="output-line" style="color:var(--accent)">
                    > Instrucciones ensamblador: ${totalInstr}
                </div>
                <div class="output-line" style="color:var(--accent)">
                    > ✓ codigo_ensamblador.csv descargado
                </div>
                <div class="output-line" style="color:var(--accent);font-weight:bold;">
                    > ════════════════════════════════════════
                </div>
                <div class="output-line" style="margin-top:1rem">
                    ${errores.length === 0
                        ? '> ✓ Código compilado exitosamente'
                        : `> ✗ ${errores.length} error(es) semántico(s) — ensamblador generado de todas formas`
                    }
                </div>
            `;

            status.textContent = errores.length === 0
                ? '✓ Compiled successfully — .csv descargado'
                : `✗ ${errores.length} error(s) — .csv descargado de todas formas`;
            status.style.color = errores.length === 0 ? 'var(--accent)' : '#d32f2f';

        } catch (err) {
            output.innerHTML = `
                <div class="output-line" style="color:#d32f2f;">
                    > ERROR DE COMPILACIÓN
                </div>
                <div class="output-line">
                    > ${err.message}
                </div>
            `;
            status.textContent = '✗ Compilation failed';
            status.style.color = '#d32f2f';
            console.error(err);
        }
    });

    // ── Clear ────────────────────────────────────────────────────────────────
    clearBtn.addEventListener('click', () => { codeInput.value = ''; codeInput.focus(); });

    // ── Export ───────────────────────────────────────────────────────────────
    exportBtn.addEventListener('click', () => {
        const tab = document.querySelector('.tab-btn.active').getAttribute('data-tab');
        if (tab === 'simbolos')     exportarTablaSimbolosCSV();
        else if (tab === 'errores')      exportarTablaErroresCSV();
        else if (tab === 'triplos')      exportarTablaTriplosCSV();
        else if (tab === 'optimizacion') exportarCodigoOptimizado();
        else if (tab === 'ensamblador')  exportarEnsambladorManual();
        else {
            _descargar('console.txt', output.innerText);
            status.textContent = 'Console exported';
            status.style.color = 'var(--accent)';
        }
    });

    function exportarTablaSimbolosCSV() {
        const filas = tablaSimbolos.querySelectorAll('tr');
        if (!filas.length || filas[0].querySelector('.empty-state')) return _noHay('símbolos');
        let csv = 'Lexema,Tipo de dato\n';
        filas.forEach(r => {
            const c = r.querySelectorAll('td');
            if (c.length === 2) csv += `"${c[0].textContent}","${c[1].textContent}"\n`;
        });
        _descargar('tabla_simbolos.csv', csv);
        status.textContent = '✓ Tabla de símbolos exportada'; status.style.color = 'var(--accent)';
    }

    function exportarTablaErroresCSV() {
        const filas = tablaErrores.querySelectorAll('tr');
        if (!filas.length || filas[0].querySelector('.empty-state')) return _noHay('errores');
        let csv = 'Token,Lexema,Renglón,Descripción\n';
        filas.forEach(r => {
            const c = r.querySelectorAll('td');
            if (c.length === 4) csv += `"${c[0].textContent}","${c[1].textContent}","${c[2].textContent}","${c[3].textContent}"\n`;
        });
        _descargar('tabla_errores.csv', csv);
        status.textContent = '✓ Tabla de errores exportada'; status.style.color = 'var(--accent)';
    }

    function exportarTablaTriplosCSV() {
        const filas = tablaTriplos.querySelectorAll('tr');
        if (!filas.length || filas[0].querySelector('.empty-state')) return _noHay('triplos');
        let csv = 'No. Línea,Dato Objeto,Dato Fuente,Operador\n';
        filas.forEach(r => {
            const c = r.querySelectorAll('td');
            if (c.length === 4) csv += `"${c[0].textContent}","${c[1].textContent}","${c[2].textContent}","${c[3].textContent}"\n`;
        });
        _descargar('tabla_triplos.csv', csv);
        status.textContent = '✓ Tabla de triplos exportada'; status.style.color = 'var(--accent)';
    }

    function exportarCodigoOptimizado() {
        const divs = codigoOptimizado.querySelectorAll('.opt-line');
        const txt  = divs.length > 0
            ? Array.from(divs).map(d => d.textContent).join('\n')
            : codigoOptimizado.textContent;
        if (!txt || txt === 'Ejecuta Run para ver el código optimizado') return _noHay('código optimizado');
        _descargar('codigo_optimizado.txt', txt, 'text/plain;charset=utf-8;');
        status.textContent = '✓ Código optimizado exportado'; status.style.color = 'var(--accent)';
    }

    // Re-descarga el .asm ya generado (por si el usuario lo necesita de nuevo)
    function exportarEnsambladorManual() {
        if (!_ultimoASM || _ultimoASM.trim() === '') return _noHay('código ensamblador');
        descargarASM(_ultimoASM);
        status.textContent = '✓ codigo_ensamblador.csv descargado'; status.style.color = 'var(--accent)';
    }

    function _noHay(cosa) {
        status.textContent = `No hay ${cosa} para exportar`; status.style.color = 'var(--text-secondary)';
    }

    function _descargar(nombre, contenido, mime) {
        const blob = new Blob([contenido], { type: mime || 'text/csv;charset=utf-8;' });
        const a    = document.createElement('a');
        a.href     = URL.createObjectURL(blob);
        a.download = nombre;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // ── Copy ─────────────────────────────────────────────────────────────────
    copyBtn.addEventListener('click', () => {
        const tab = document.querySelector('.tab-btn.active').getAttribute('data-tab');
        let text  = output.innerText;

        if (tab === 'optimizacion') {
            const divs = codigoOptimizado.querySelectorAll('.opt-line');
            text = divs.length > 0
                ? Array.from(divs).map(d => d.textContent).join('\n')
                : codigoOptimizado.textContent;
        } else if (tab === 'ensamblador') {
            text = _ultimoASM || '';
        }

        navigator.clipboard.writeText(text).then(() => {
            status.textContent = 'Copied to clipboard';
            status.style.color = 'var(--accent)';
            setTimeout(() => { status.textContent = ''; }, 2000);
        });
    });

    // ── Helpers de editor ────────────────────────────────────────────────────
    function getCharacterRangeOfLine(text, lineNum) {
        const lines = text.split('\n');
        let start = 0;
        for (let i = 0; i < lineNum - 1; i++) start += lines[i].length + 1;
        return { start, end: start + lines[lineNum - 1].length };
    }

    function highlightOptimizedLine(el) {
        codigoOptimizado.querySelectorAll('.opt-line').forEach(d => d.classList.remove('active-line'));
        el.classList.add('active-line');
    }

    function highlightLineNumber(ln) {
        lineNumbers.querySelectorAll('span').forEach((s, i) => {
            s.classList.toggle('active-line', i === ln - 1);
        });
    }
});
