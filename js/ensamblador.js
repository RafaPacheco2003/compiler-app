// =============================================================================
// ensamblador.js — Generador de Código Ensamblador x86 (8/16-bit)
// Lenguajes y Autómatas II — Unidad IV
//
// Traduce la tabla de TRIPLOS (ya generada por triplos.js) a instrucciones
// ensamblador siguiendo las reglas exactas del material de clase:
//
//  ASIGNACIÓN  =          → MOV reg, fuente  /  MOV var, reg
//  SUMA        +          → ADD reg, fuente
//  RESTA       -          → SUB reg, fuente
//  MULTIPLICACIÓN  *      → MOV AL, mult  /  MOV BL, mult  /  MUL BL  → AX
//  DIVISIÓN    /          → MOV AX, divid /  MOV BL, divis /  DIV BL  → AL
//  MÓDULO      %          → MOV AX, divid /  MOV BL, divis /  DIV BL  → AH
//  RELACIONALES == != < > <= >=
//                         → MOV AX, izq  /  CMP AX, der
//                           <MNEM> ETverdadero  /  JMP ETfalso
//  JMP                    → JMP ETn
//  Funciones (JMP de entrada/retorno) → JMP ETn
// =============================================================================

// ---------------------------------------------------------------------------
// Tablas de traducción
// ---------------------------------------------------------------------------
const _REL_MNEM = { '==':'EQ', '!=':'NE', '<':'LT', '>':'GT', '<=':'LE', '>=':'GE' };
const _ES_REL   = s => s in _REL_MNEM;
const _ES_ARIT  = s => ['+','-','*','/','%'].includes(s);
const _ES_TEMP  = s => /^T\d+$/.test(String(s));
const _ES_VAR   = s => /^[A-Za-z_][A-Za-z0-9_]*$/.test(String(s));

// ---------------------------------------------------------------------------
// compilarAEnsamblador(tablaTriplos)
//
// Entrada : objeto tablaTriplos producido por generarTriplos()
// Salida  : string  — texto completo del archivo .asm listo para descargar
// ---------------------------------------------------------------------------
function compilarAEnsamblador(tablaTriplos) {
    if (!tablaTriplos || Object.keys(tablaTriplos).length === 0) return '';

    // Convertir a array ordenado usando la función ya existente en triplos.js
    const filas = tablaTriplosAEntradas(tablaTriplos);
    if (filas.length === 0) return '';

    // ------------------------------------------------------------------
    // Paso 1: detectar qué números de renglón son DESTINO de algún salto
    //         → esos renglones necesitan una etiqueta ET<n>:
    // ------------------------------------------------------------------
    const conEtiqueta = new Set();
    filas.forEach(f => {
        const op  = String(f.operador   ?? '');
        const obj = String(f.datoObjeto ?? '');
        const src = String(f.datoFuente ?? '');

        if (op === 'JMP') {
            // JMP puede tener destino en datoFuente o datoObjeto
            const d = src !== '' && src !== 'undefined' ? src : obj;
            const n = Number(d);
            if (!isNaN(n) && n > 0) conEtiqueta.add(n);
        }
        if (op === 'Verdadero' || op === 'Falso') {
            const d = src !== '' && src !== 'undefined' ? src : obj;
            const n = Number(d);
            if (!isNaN(n) && n > 0) conEtiqueta.add(n);
        }
    });

    // ------------------------------------------------------------------
    // Paso 2: contexto de registros
    //   Tras MUL el resultado está en AX → la siguiente  = var T1
    //   debe usar MOV var, AX
    //   Tras DIV el cociente está en AL  → MOV var, AL
    //   Tras DIV para módulo (%) → MOV var, AH
    // ------------------------------------------------------------------
    let ctxReg = 'AX';   // registro donde vive el último resultado

    // ------------------------------------------------------------------
    // Paso 3: recorrer los triplos y emitir instrucciones
    // ------------------------------------------------------------------
    const salida = [];   // cada elemento: { etq: string|null, instr: string, nota: string }

    const emit = (instr, nota = '', etq = null) => salida.push({ etq, instr, nota });

    let i = 0;
    while (i < filas.length) {
        const f   = filas[i];
        const n   = f.noLinea;
        const op  = String(f.operador   ?? '');
        const obj = String(f.datoObjeto ?? '');
        const src = String(f.datoFuente ?? '');
        const etq = conEtiqueta.has(n) ? `ET${n}:` : null;

        // ── JMP incondicional ──────────────────────────────────────────────
        if (op === 'JMP') {
            const dest = (src !== '' && src !== 'undefined') ? src : obj;
            emit(`JMP ET${dest}`, `salto → renglon ${dest}`, etq);
            i++; continue;
        }

        // ── Verdadero / Falso: ya fueron consumidos por el relacional ───────
        if (op === 'Verdadero' || op === 'Falso') {
            // Si tienen etiqueta propia la agregamos como línea vacía
            if (etq) emit('', '', etq);
            i++; continue;
        }

        // ── ASIGNACIÓN  = ───────────────────────────────────────────────────
        if (op === '=') {
            const sigFila = filas[i + 1];
            const sigOp   = sigFila ? String(sigFila.operador ?? '') : '';

            // Caso A: = T1 <fuente>  seguido de operación aritmética
            //         → cargar fuente en el registro correcto para la op siguiente
            if (_ES_TEMP(obj) && _ES_ARIT(sigOp)) {
                if (sigOp === '*') {
                    // multiplicando va en AL
                    emit(`MOV AL, ${src}`, `multiplicando → AL`, etq);
                    ctxReg = 'AX';
                } else if (sigOp === '/' || sigOp === '%') {
                    // dividendo va en AX
                    emit(`MOV AX, ${src}`, `dividendo → AX`, etq);
                    ctxReg = 'AX';
                } else {
                    // suma / resta: acumulador en AX
                    emit(`MOV AX, ${src}`, `${obj} ← ${src}`, etq);
                    ctxReg = 'AX';
                }
                i++; continue;
            }

            // Caso B: = <var> T1  → guardar resultado del registro en variable
            if (_ES_VAR(obj) && _ES_TEMP(src)) {
                emit(`MOV ${obj}, ${ctxReg}`, `${obj} ← ${ctxReg}`, etq);
                ctxReg = 'AX';   // reset
                i++; continue;
            }

            // Caso C: = <param/var> T1  en contexto de llamada a función
            //         (igual que B — ya cubierto arriba)

            // Caso D: = T1 T1  (intermedios que copian resultado)
            if (_ES_TEMP(obj) && _ES_TEMP(src)) {
                // no emitir: el valor ya está en ctxReg
                i++; continue;
            }

            // Caso E: asignación directa  = var literal/var  (sin temporal)
            if (!_ES_TEMP(obj)) {
                emit(`MOV AX, ${src}`, `cargar ${src}`, etq);
                emit(`MOV ${obj}, AX`, `${obj} ← AX`);
                ctxReg = 'AX';
                i++; continue;
            }

            // Caso F: = T1 valor  sin operación siguiente (fin de expresión)
            emit(`MOV AX, ${src}`, `${obj} ← ${src}`, etq);
            ctxReg = 'AX';
            i++; continue;
        }

        // ── MULTIPLICACIÓN  * ───────────────────────────────────────────────
        // Regla: AL ya tiene el multiplicando (cargado por = T1 <x>)
        //        BL ← multiplicador,  MUL BL  →  resultado en AX
        if (op === '*') {
            emit(`MOV BL, ${src}`, `multiplicador → BL`, etq);
            emit(`MUL BL`,         `AX = AL × BL`);
            ctxReg = 'AX';
            i++; continue;
        }

        // ── DIVISIÓN  / ─────────────────────────────────────────────────────
        // Regla: AX ya tiene el dividendo,  BL ← divisor,  DIV BL
        //        cociente → AL,  residuo → AH
        if (op === '/') {
            emit(`MOV BL, ${src}`, `divisor → BL`, etq);
            emit(`DIV BL`,         `AL = cociente, AH = residuo`);
            ctxReg = 'AL';
            i++; continue;
        }

        // ── MÓDULO  % ───────────────────────────────────────────────────────
        // Idéntico a / pero el resultado útil está en AH
        if (op === '%') {
            emit(`MOV BL, ${src}`, `divisor → BL`, etq);
            emit(`DIV BL`,         `AH = residuo (módulo)`);
            ctxReg = 'AH';
            i++; continue;
        }

        // ── SUMA  + ─────────────────────────────────────────────────────────
        if (op === '+') {
            emit(`ADD AX, ${src}`, `AX = AX + ${src}`, etq);
            ctxReg = 'AX';
            i++; continue;
        }

        // ── RESTA  - ────────────────────────────────────────────────────────
        if (op === '-') {
            emit(`SUB AX, ${src}`, `AX = AX - ${src}`, etq);
            ctxReg = 'AX';
            i++; continue;
        }

        // ── OPERADORES RELACIONALES  == != < > <= >= ────────────────────────
        // Patrón en triplos (generado por procesarCondicionLogica):
        //   k  :  =         T1   <izquierdo>    ← ya procesado (carga AX)
        //   k+1:  <relop>   T1   <derecho>      ← este renglón
        //   k+2:  Verdadero ''   <dest_true>
        //   k+3:  Falso     ''   <dest_false>
        if (_ES_REL(op)) {
            emit(`CMP AX, ${src}`, `comparar AX con ${src}`, etq);

            // Leer los dos triplos siguientes para obtener los destinos
            const tV = filas[i + 1];
            const tF = filas[i + 2];

            const opV = tV ? String(tV.operador ?? '') : '';
            const opF = tF ? String(tF.operador ?? '') : '';

            const destTrue  = (opV === 'Verdadero')
                ? String(tV.datoFuente ?? tV.datoObjeto ?? '?')
                : '?';
            const destFalse = (opF === 'Falso')
                ? String(tF.datoFuente ?? tF.datoObjeto ?? '?')
                : (opV === 'Falso')
                    ? String(tV.datoFuente ?? tV.datoObjeto ?? '?')
                    : '?';

            const mnem = _REL_MNEM[op];
            emit(`${mnem} ET${destTrue}`,  `verdadero → ET${destTrue}`);
            emit(`JMP ET${destFalse}`,      `falso    → ET${destFalse}`);

            ctxReg = 'AX';

            // Consumir Verdadero y Falso para no procesarlos otra vez
            if (opV === 'Verdadero') i++;
            if (filas[i + 1] && String(filas[i + 1].operador ?? '') === 'Falso') i++;

            i++; continue;
        }

        // ── Renglón no reconocido → comentario (no bloquea el proceso) ──────
        emit(`; [${n}] ${op}  ${obj}  ${src}`, '', etq);
        i++;
    }

    // ------------------------------------------------------------------
    // Paso 4: convertir a texto .asm
    // ------------------------------------------------------------------
    return _formatearCSV(salida);
}

// ---------------------------------------------------------------------------
// _formatearCSV(salida)
// Convierte el array interno en texto CSV:
//   Etiqueta, Instruccion, Nota
// ---------------------------------------------------------------------------
function _formatearCSV(salida) {
    const filas = ['Etiqueta,Instruccion,Nota'];

    for (const item of salida) {
        // Si hay etiqueta la ponemos en su propia fila (instrucción y nota vacías)
        if (item.etq) {
            filas.push(`"${item.etq.replace(/"/g,'""')}","",""`);
        }
        // Si hay instrucción la agregamos como fila (etiqueta vacía porque ya se emitió)
        if (item.instr.trim() !== '') {
            const etq   = '';
            const instr = item.instr.trim().replace(/"/g, '""');
            const nota  = (item.nota || '').replace(/"/g, '""');
            filas.push(`"${etq}","${instr}","${nota}"`);
        }
    }

    return filas.join('\n');
}

// ---------------------------------------------------------------------------
// descargarASM(contenidoTexto)
// Dispara la descarga del archivo en el navegador
// ---------------------------------------------------------------------------
function descargarASM(contenidoCSV) {
    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href     = URL.createObjectURL(blob);
    link.download = 'codigo_ensamblador.csv';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}
