
document.addEventListener('DOMContentLoaded', function() {
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
    
    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    const lineNumbers = document.getElementById('lineNumbers');

    // Función para actualizar los números de línea
    function updateLineNumbers() {
        const lines = codeInput.value.split('\n').length;
        let numbersHtml = '';
        for (let i = 1; i <= lines; i++) {
            numbersHtml += `<span>${i}</span>`;
        }
        lineNumbers.innerHTML = numbersHtml;
    }

    // Sincronizar scroll entre textarea y números de línea
    codeInput.addEventListener('scroll', function() {
        lineNumbers.scrollTop = codeInput.scrollTop;
    });

    // Actualizar números al escribir
    codeInput.addEventListener('input', updateLineNumbers);

    // Cargar código inicial
    codeInput.value = TEXTO_INICIAL;
    updateLineNumbers();
    
    // Manejar cambio de tabs
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            
            // Remover active de todos
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Activar el seleccionado
            this.classList.add('active');
            document.getElementById(tabName).classList.add('active');
        });
    });
    
    // Cargar estado guardado del panel
    const savedHeight = localStorage.getItem('consolePanelHeight');
    const savedMinimized = localStorage.getItem('consolePanelMinimized') === 'true';
    
    if (savedHeight) {
        outputPanel.style.height = savedHeight + 'px';
    }
    
    if (savedMinimized) {
        outputPanel.classList.add('minimized');
    }
    
    // Resize functionality
    let isResizing = false;
    let startY = 0;
    let startHeight = 0;
    
    resizeHandle.addEventListener('mousedown', function(e) {
        isResizing = true;
        startY = e.clientY;
        startHeight = outputPanel.offsetHeight;
        document.body.style.cursor = 'ns-resize';
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isResizing) return;
        
        const delta = startY - e.clientY;
        const newHeight = startHeight + delta;
        
        if (newHeight >= 100 && newHeight <= 600) {
            outputPanel.style.height = newHeight + 'px';
            outputPanel.classList.remove('minimized');
        }
    });
    
    document.addEventListener('mouseup', function() {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = '';
            localStorage.setItem('consolePanelHeight', outputPanel.offsetHeight);
        }
    });
    
    // Toggle minimize/maximize
    toggleBtn.addEventListener('click', function() {
        outputPanel.classList.toggle('minimized');
        const isMinimized = outputPanel.classList.contains('minimized');
        localStorage.setItem('consolePanelMinimized', isMinimized);
        
        const svg = toggleBtn.querySelector('svg polyline');
        if (isMinimized) {
            svg.setAttribute('points', '6 9 12 15 18 9');
        } else {
            svg.setAttribute('points', '18 15 12 9 6 15');
        }
    });

    // Evento del botón Run - COMPILAR
    runBtn.addEventListener('click', function() {
        const codigo = codeInput.value.trim();
        
        if (!codigo) {
            status.textContent = 'No hay código para compilar';
            status.style.color = 'var(--text-secondary)';
            return;
        }
        
        // Asegurarse de que el panel no esté minimizado
        if (outputPanel.classList.contains('minimized')) {
            outputPanel.classList.remove('minimized');
            localStorage.setItem('consolePanelMinimized', 'false');
            const svg = toggleBtn.querySelector('svg polyline');
            svg.setAttribute('points', '18 15 12 9 6 15');
        }
        
        // Limpiar console
        output.innerHTML = '';
        
        try {
            // **PASO 1: Generar tabla de símbolos**
            const lexemaDict = generarTablaSimbolos(codigo);
            
            // Limpiar y llenar tabla de símbolos
            tablaSimbolos.innerHTML = '';
            // Mostrar TODOS los lexemas (incluyendo los sin tipo)
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
            
            // **PASO 2: Generar tabla de errores**
            const errores = generarTablaErrores(codigo, lexemaDict);
            
            // Limpiar y llenar tabla de errores
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
            
            // **PASO 2b: Tabla de triplos (módulo triplos.js)**
            const tablaTriplosDict = generarTriplos(codigo);
            const entradasTriplos = tablaTriplosAEntradas(tablaTriplosDict);
            tablaTriplos.innerHTML = '';
            if (entradasTriplos.length === 0) {
                tablaTriplos.innerHTML = '<tr><td colspan="4" class="empty-state">No se generaron triplos</td></tr>';
            } else {
                entradasTriplos.forEach(function(e) {
                    const row = document.createElement('tr');
                    [e.noLinea, e.datoObjeto, e.datoFuente, e.operador].forEach(function(val) {
                        const td = document.createElement('td');
                        td.textContent = val === undefined || val === null ? '' : String(val);
                        row.appendChild(td);
                    });
                    tablaTriplos.appendChild(row);
                });
            }
            
            // **PASO 3: Mostrar resumen en consola**
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
                    > Triplos generados: ${entradasTriplos.length}
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
            
            // Actualizar status
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

    // Evento del botón Clear
    clearBtn.addEventListener('click', function() {
        codeInput.value = '';
        codeInput.focus();
    });
    
    // Evento del botón Export CSV
    exportBtn.addEventListener('click', function() {
        const tabActiva = document.querySelector('.tab-btn.active').getAttribute('data-tab');
        
        if (tabActiva === 'simbolos') {
            exportarTablaSimbolosCSV();
        } else if (tabActiva === 'errores') {
            exportarTablaErroresCSV();
        } else if (tabActiva === 'triplos') {
            exportarTablaTriplosCSV();
        } else {
            // Exportar el contenido de la consola
            const texto = output.innerText;
            descargarArchivo('console.txt', texto);
            status.textContent = 'Console exported';
            status.style.color = 'var(--accent)';
        }
    });
    
    // Función para exportar tabla de símbolos a CSV
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
            if (celdas.length === 2) {
                csv += `"${celdas[0].textContent}","${celdas[1].textContent}"\n`;
            }
        });
        
        descargarArchivo('tabla_simbolos.csv', csv);
        status.textContent = '✓ Tabla de símbolos exportada';
        status.style.color = 'var(--accent)';
    }
    
    // Función para exportar tabla de errores a CSV
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
            if (celdas.length === 4) {
                csv += `"${celdas[0].textContent}","${celdas[1].textContent}","${celdas[2].textContent}","${celdas[3].textContent}"\n`;
            }
        });
        
        descargarArchivo('tabla_errores.csv', csv);
        status.textContent = '✓ Tabla de errores exportada';
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
        filas.forEach(function(fila) {
            const celdas = fila.querySelectorAll('td');
            if (celdas.length === 4) {
                csv += '"' + celdas[0].textContent + '","' + celdas[1].textContent + '","' +
                    celdas[2].textContent + '","' + celdas[3].textContent + '"\n';
            }
        });
        descargarArchivo('tabla_triplos.csv', csv);
        status.textContent = '✓ Tabla de triplos exportada';
        status.style.color = 'var(--accent)';
    }
    
    // Función para descargar archivo
    function descargarArchivo(nombreArchivo, contenido) {
        const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = nombreArchivo;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Evento del botón Copy (output)
    copyBtn.addEventListener('click', function() {
        const text = output.innerText;
        navigator.clipboard.writeText(text).then(() => {
            status.textContent = 'Copied to clipboard';
            status.style.color = 'var(--accent)';
            setTimeout(() => {
                status.textContent = '';
            }, 2000);
        });
    });
});
