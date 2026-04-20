
// ---------------------------------------------------------------------------
// Tokenizador auxiliar 
// ---------------------------------------------------------------------------
function tokenizarLineaTriplo(linea) {
    const tokens = [];
    let i = 0;
    let tokenActual = '';
    let enString = false;

    while (i < linea.length) {
        const char = linea[i];
        if (char === '"') {
            if (enString) {
                tokenActual += char;
                tokens.push(tokenActual);
                tokenActual = '';
                enString = false;
            } else {
                if (tokenActual) { tokens.push(tokenActual); tokenActual = ''; }
                enString = true;
                tokenActual += char;
            }
        } else if (enString) {
            tokenActual += char;
        } else if (char === ' ' || char === '\t') {
            if (tokenActual) { tokens.push(tokenActual); tokenActual = ''; }
        } else {
            tokenActual += char;
        }
        i += 1;
    }
    if (tokenActual) tokens.push(tokenActual);
    return tokens;
}

// ---------------------------------------------------------------------------
// Helpers de condición
// ---------------------------------------------------------------------------
function esEvaluacion(lineaLexemas, listaEvaluacion = ['<', '>', '<=', '>=', '==', '!=', '=']) {
    return lineaLexemas.some(op => listaEvaluacion.includes(op));
}

function esBinario(lineaLexemas, listaBinarios = ['or', 'and']) {
    return lineaLexemas.some(op => listaBinarios.includes(op));
}

// ---------------------------------------------------------------------------
// Procesado de condiciones lógicas (&&/|| ya normalizados a and/or)
// ---------------------------------------------------------------------------
function procesarCondicionLogica(evaluacion, tablaTriplos, contadorLineas, tempCounter, availableTemporales) {
    const orIndices = evaluacion.map((t, idx) => (t === 'or' ? idx : -1)).filter(idx => idx >= 0);

    if (orIndices.length > 0) {
        const lineaInicio = contadorLineas;
        const terminos = [];
        let ultimoIdx = 0;
        for (const orIdx of orIndices) {
            terminos.push(evaluacion.slice(ultimoIdx, orIdx));
            ultimoIdx = orIdx + 1;
        }
        terminos.push(evaluacion.slice(ultimoIdx));

        const lineasVerdaderoOr = [];
        let lineaFalsoFinal = null;

        for (let idx = 0; idx < terminos.length; idx++) {
            const termino = terminos[idx];
            if (termino.includes('and')) {
                const r = procesarCondicionLogica(termino, tablaTriplos, contadorLineas, 1, availableTemporales);
                contadorLineas = r.contadorLineas;
                const lineaFalsoTermino = r.lineaFalsoFinal;
                if (idx < terminos.length - 1) {
                    // FALSE de este sub-and -> evalua siguiente termino OR
                    tablaTriplos[lineaFalsoTermino]['Dato Fuente'] = contadorLineas;
                } else {
                    lineaFalsoFinal = lineaFalsoTermino;
                }
            } else {
                // Cada termino OR reinicia en T1
                let temp = nuevoTemporal(1, availableTemporales)[0];
                contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, '=', temp, termino[0], availableTemporales);
                contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, termino[1], temp, termino[2], availableTemporales);

                // Verdadero -> entra al cuerpo (se parchea despues con lineaCuerpo)
                const lineaVerdadero = contadorLineas;
                lineasVerdaderoOr.push(lineaVerdadero);
                contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, 'Verdadero', '', 'Pendiente_OR', availableTemporales);

                if (idx < terminos.length - 1) {
                    // Falso -> evalua el siguiente termino (apunta al registro que sigue)
                    contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, 'Falso', '', contadorLineas + 1, availableTemporales);
                } else {
                    // Falso final -> sale del for (se parchea en generarTriplos)
                    lineaFalsoFinal = contadorLineas;
                    contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, 'Falso', '', 'Pendiente_FINAL', availableTemporales);
                }
            }
        }

        // Parchear todos los Verdadero con el inicio del cuerpo
        const lineaCuerpo = contadorLineas;
        for (const lineaV of lineasVerdaderoOr) {
            if (lineaV in tablaTriplos) tablaTriplos[lineaV]['Dato Fuente'] = lineaCuerpo;
        }

        return { contadorLineas, tempCounter, lineasVerdaderoOr, lineaFalsoFinal, lineaInicio };
    }

    const andIndices = evaluacion.map((t, idx) => (t === 'and' ? idx : -1)).filter(idx => idx >= 0);

    if (andIndices.length > 0) {
        const lineaInicio = contadorLineas;
        const terminos = [];
        let ultimoIdx = 0;
        for (const andIdx of andIndices) {
            terminos.push(evaluacion.slice(ultimoIdx, andIdx));
            ultimoIdx = andIdx + 1;
        }
        terminos.push(evaluacion.slice(ultimoIdx));

        let lineaFalsoFinal = null;
        const lineasFalsoAnd = [];

        for (let idx = 0; idx < terminos.length; idx++) {
            const termino = terminos[idx];
            // Cada término usa T1 propio
            let rTemp = nuevoTemporal(1, availableTemporales);
            let temp = rTemp[0];
            contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, '=', temp, termino[0], availableTemporales);
            contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, termino[1], temp, termino[2], availableTemporales);

            if (idx < terminos.length - 1) {
                // TRUE: salta sobre el Falso de ESTE término para evaluar el siguiente
                contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, 'Verdadero', '', contadorLineas + 2, availableTemporales);
                // FALSE: todos los Falso intermedios apuntan al MISMO destino final
                // (se parchean igual que el Falso del ultimo termino)
                const lineaFalso = contadorLineas;
                lineasFalsoAnd.push(lineaFalso);
                contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, 'Falso', '', 'Pendiente_AND_F', availableTemporales);
            } else {
                // Último término: TRUE salta sobre el Falso final al cuerpo
                contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, 'Verdadero', '', contadorLineas + 2, availableTemporales);
                lineaFalsoFinal = contadorLineas;
                contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, 'Falso', '', 'Pendiente_FINAL', availableTemporales);
            }
        }

        // Con && todos los Falso (intermedios y final) deben apuntar al MISMO destino:
        // el primer registro despues del for. NO pre-parcheamos aqui.
        // Devolvemos todos los registros Falso para que generarTriplos los parchee juntos.
        const todasLineasFalso = [...lineasFalsoAnd, lineaFalsoFinal];

        return { contadorLineas, tempCounter, lineasVerdaderoOr: null, lineaFalsoFinal, lineaInicio, todasLineasFalso };
    }

    // Condición simple sin and/or — usa T1
    const lineaInicio = contadorLineas;
    let rTemp = nuevoTemporal(1, availableTemporales);
    let temp = rTemp[0];
    contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, '=', temp, evaluacion[0], availableTemporales);
    contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, evaluacion[1], temp, evaluacion[2], availableTemporales);
    contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, 'Verdadero', '', contadorLineas + 2, availableTemporales);
    const lineaFalsoFinal = contadorLineas;
    contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, 'Falso', '', 'Pendiente_FINAL', availableTemporales);

    return { contadorLineas, tempCounter, lineasVerdaderoOr: null, lineaFalsoFinal, lineaInicio };
}

// ---------------------------------------------------------------------------
// Emisión de triplos
// ---------------------------------------------------------------------------
function emitirTriplo(tablaTriplos, contadorLineas, operador, datoObjeto, datoFuente, availableTemporales) {
    tablaTriplos[contadorLineas] = {
        operador,
        'Dato Objeto': datoObjeto,
        'Dato Fuente': datoFuente
    };
    return contadorLineas + 1;
}

// Retorna siempre T{tempCounter} e incrementa el contador.
// El caller resetea tempCounter=1 antes de cada instrucción nueva.
function nuevoTemporal(tempCounter, availableTemporales) {
    return ['T' + tempCounter, tempCounter + 1];
}

// ---------------------------------------------------------------------------
// Reducción de expresiones aritméticas (respeta jerarquía * / antes que + -)
// tempCounter empieza en 1 para cada expresión → T1, T2, T3 máximo
// ---------------------------------------------------------------------------
function reducirExpresionFlat(tokens, tablaTriplos, contadorLineas, tempCounter, availableTemporales) {
    tokens = tokens.slice();

    if (tokens.length === 1) return [tokens[0], contadorLineas, tempCounter];

    // Primero: * / %
    let i = 1;
    while (i < tokens.length) {
        if (['*', '/', '%'].includes(tokens[i])) {
            const operandoIzq = tokens[i - 1];
            const operador = tokens[i];
            const operandoDer = tokens[i + 1];

            let rTemp = nuevoTemporal(tempCounter, availableTemporales);
            let temp = rTemp[0]; tempCounter = rTemp[1];

            if (!(typeof operandoIzq === 'string' && operandoIzq.startsWith('T'))) {
                contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, '=', temp, operandoIzq, availableTemporales);
                contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, operador, temp, operandoDer, availableTemporales);
            } else {
                contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, operador, operandoIzq, operandoDer, availableTemporales);
                temp = operandoIzq;
            }

            tokens = tokens.slice(0, i - 1).concat([temp], tokens.slice(i + 2));
        } else {
            i += 2;
        }
    }

    if (tokens.length === 1) return [tokens[0], contadorLineas, tempCounter];

    // Luego: + - (y cualquier operador restante)
    if (typeof tokens[0] === 'string' && tokens[0].startsWith('T')) {
        const temp = tokens[0];
        i = 1;
        while (i < tokens.length) {
            contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, tokens[i], temp, tokens[i + 1], availableTemporales);
            i += 2;
        }
        return [temp, contadorLineas, tempCounter];
    }

    let rTemp = nuevoTemporal(tempCounter, availableTemporales);
    let temp = rTemp[0]; tempCounter = rTemp[1];
    contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, '=', temp, tokens[0], availableTemporales);
    i = 1;
    while (i < tokens.length) {
        contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, tokens[i], temp, tokens[i + 1], availableTemporales);
        i += 2;
    }
    return [temp, contadorLineas, tempCounter];
}

function procesarExpresion(tokens, tablaTriplos, contadorLineas, tempCounter, availableTemporales) {
    tokens = tokens.slice();

    // Resolver paréntesis de adentro hacia afuera
    while (tokens.includes('(')) {
        const openIndices = tokens.map((t, idx) => (t === '(' ? idx : -1)).filter(idx => idx >= 0);
        const lastOpen = Math.max(...openIndices);
        let close = null;
        for (let j = lastOpen + 1; j < tokens.length; j++) {
            if (tokens[j] === ')') { close = j; break; }
        }
        if (close === null) break;

        const sub = tokens.slice(lastOpen + 1, close);
        const rSub = reducirExpresionFlat(sub, tablaTriplos, contadorLineas, tempCounter, availableTemporales);
        contadorLineas = rSub[1]; tempCounter = rSub[2];
        tokens = tokens.slice(0, lastOpen).concat([rSub[0]], tokens.slice(close + 1));
    }

    const r = reducirExpresionFlat(tokens, tablaTriplos, contadorLineas, tempCounter, availableTemporales);
    return [r[0], r[1], r[2]];
}

// ---------------------------------------------------------------------------
// Normalización: && → and   || → or
// ---------------------------------------------------------------------------
function normalizarLineaParaTriplos(linea) {
    return linea.replace(/&&/g, ' and ').replace(/\|\|/g, ' or ');
}

// ---------------------------------------------------------------------------
// FUNCIÓN PRINCIPAL
// ---------------------------------------------------------------------------
function generarTriplos(codigo) {
    let contadorLineas = 1;
    const tablaTriplos = {};
    const availableTemporales = [];

    const codigoNorm = normalizarLineaParaTriplos(codigo);
    const lineasObj = codigoNorm.split('\n');

    let iLinea = 0;
    let isInFor = false;
    let forIntervalo = null;
    let forCondInit = null;
    let forCondFalsoLine = null;
    let todasLineasFalsoFor = [];
    let functionJumps = {};
    let funcSkippedRegs = []; // acumula el registro JMP de CADA funcion declarada
    let isFuncSkipped = null;
    let currentFunc = null;
    let isInFunc = false; // true mientras estamos dentro del cuerpo de una funcion

    const TIPOS_V = ['num', 'cow', 'real', 'chain', 'int', 'float', 'str', 'void'];

    while (iLinea < lineasObj.length) {
        let linea = lineasObj[iLinea].trim();
        if (!linea) { iLinea++; continue; }

        // Tokenizar la línea ya normalizada (viene de codigoNorm)
        let lx = typeof tokenizarLinea === 'function'
            ? tokenizarLinea(linea)
            : tokenizarLineaTriplo(linea);

        // ── FIN DE BLOQUE ───────────────────────────────────────────────────
        if (linea === '}') {
            if (isInFor) {
                // Intervalo del for: resetear a T1
                if (forIntervalo && forIntervalo.length > 0) {
                    const eqIdx = forIntervalo.indexOf('=');
                    const lhsF = eqIdx > 0 ? forIntervalo[eqIdx - 1] : forIntervalo[0];
                    const rhsF = forIntervalo.slice(eqIdx + 1);

                    if (rhsF.length === 3) {
                        // id_num4++ => T1=id_num4 / T1+1 / id_num4=T1  (3 registros con T1)
                        contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, '=', 'T1', rhsF[0], availableTemporales);
                        contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, rhsF[1], 'T1', rhsF[2], availableTemporales);
                        contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, '=', lhsF, 'T1', availableTemporales);
                    } else {
                        const rExp = procesarExpresion(rhsF, tablaTriplos, contadorLineas, 1, availableTemporales);
                        contadorLineas = rExp[1];
                        contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, '=', lhsF, rExp[0], availableTemporales);
                    }
                }
                contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, 'JMP', '', forCondInit, availableTemporales);
                // Parchear TODOS los Falso (intermedios + final) con el mismo destino post-for
                if (todasLineasFalsoFor && todasLineasFalsoFor.length > 0) {
                    todasLineasFalsoFor.forEach(reg => { tablaTriplos[reg]['Dato Fuente'] = contadorLineas; });
                } else if (forCondFalsoLine !== null) {
                    tablaTriplos[forCondFalsoLine]['Dato Fuente'] = contadorLineas;
                }
                isInFor = false;
                forIntervalo = null;
                forCondInit = null;
                forCondFalsoLine = null;
                todasLineasFalsoFor = [];
            } else if (isFuncSkipped !== null) {
                funcSkippedRegs.push(isFuncSkipped);
                isFuncSkipped = null;
                currentFunc = null;
                isInFunc = false;
            }
            iLinea++;
            continue;
        }

        // ── DECLARACIÓN DE FUNCIÓN ──────────────────────────────────────────
        const esFuncionVieja = lx[0] === 'funcion';
        const esFuncionNueva = lx.length > 2 && TIPOS_V.includes(lx[0]) && lx[2] === '(';

        if (esFuncionVieja || esFuncionNueva) {
            const funcName = lx[1];
            const skipReg = contadorLineas;
            contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, 'JMP', '', 'Pendiente_FIN_FUNC', availableTemporales);
            isFuncSkipped = skipReg;

            const params = [];
            let pIdx = 3;
            while (pIdx < lx.length && lx[pIdx] !== ')') {
                if (lx[pIdx] !== ',' && !TIPOS_V.includes(lx[pIdx])) params.push(lx[pIdx]);
                pIdx++;
            }
            functionJumps[funcName] = { startBody: contadorLineas, returns: [], params, retVar: null };
            currentFunc = funcName;
            isInFunc = true;
            iLinea++;
            continue;
        }

        // ── RETURN — solo emite JMP (sin instrucción RETURN) ─────────────────
        if (lx[0] === 'return') {
            const endIdx = lx.indexOf(';') !== -1 ? lx.indexOf(';') : lx.length;
            const rhs = lx.slice(1, endIdx);

            if (rhs.length > 0) {
                // Resetear temporales a T1 para esta expresión
                const rExp = procesarExpresion(rhs, tablaTriplos, contadorLineas, 1, availableTemporales);
                contadorLineas = rExp[1];

                if (currentFunc && functionJumps[currentFunc]) {
                    functionJumps[currentFunc].retVar = rExp[0];
                    functionJumps[currentFunc].returns.push(contadorLineas);
                    contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, 'JMP', '', 'Pendiente_RETORNO', availableTemporales);
                }
            }
            iLinea++;
            continue;
        }

        // ── FOR ─────────────────────────────────────────────────────────────
        if (lx[0] === 'for') {
            isInFor = true;
            const s1 = lx.indexOf(';');
            const s2 = lx.indexOf(';', s1 + 1);

            // 1. Valor inicial — resetear a T1
            let assignP1 = lx.slice(2, s1);
            if (assignP1.length > 0 && TIPOS_V.includes(assignP1[0])) assignP1 = assignP1.slice(1);
            if (assignP1.includes('=')) {
                const eqi = assignP1.indexOf('=');
                const lhsF = assignP1[eqi - 1];
                const rhsF = assignP1.slice(eqi + 1);
                const rE = procesarExpresion(rhsF, tablaTriplos, contadorLineas, 1, availableTemporales);
                contadorLineas = rE[1];
                contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, '=', lhsF, rE[0], availableTemporales);
            }

            forCondInit = contadorLineas;

            // 2. Condición — cada término de condición arranca en T1
            const cond = lx.slice(s1 + 1, s2);
            todasLineasFalsoFor = [];
            if (cond.length > 0) {
                const rLog = procesarCondicionLogica(cond, tablaTriplos, contadorLineas, 1, availableTemporales);
                contadorLineas = rLog.contadorLineas;
                forCondFalsoLine = rLog.lineaFalsoFinal;
                // Guardar TODOS los registros Falso (intermedios + final) para parchearlos juntos
                todasLineasFalsoFor = rLog.todasLineasFalso || [rLog.lineaFalsoFinal];
            }

            // 3. Intervalo (pospuesto al })
            // Con utils.js corregido, ++ y -- llegan como un solo token.
            const p3 = lx.slice(s2 + 1, lx.lastIndexOf(')'));
            if (p3.includes('++')) {
                const plusIdx = p3.indexOf('++');
                const v = plusIdx > 0 ? p3[plusIdx - 1] : p3[0];
                forIntervalo = [v, '=', v, '+', '1'];
            } else if (p3.includes('--')) {
                const minusIdx = p3.indexOf('--');
                const v = minusIdx > 0 ? p3[minusIdx - 1] : p3[0];
                forIntervalo = [v, '=', v, '-', '1'];
            } else {
                forIntervalo = p3;
            }

            iLinea++;
            continue;
        }

        // ── DECLARACIONES SIN ASIGNACIÓN (ignorar) ──────────────────────────
        if (TIPOS_V.includes(lx[0]) && !lx.includes('=')) {
            iLinea++;
            continue;
        }

        // ── ASIGNACIONES Y LLAMADAS A FUNCIÓN ───────────────────────────────
        // Si estamos en codigo principal (no en cuerpo de funcion), parchear los JMPs
        if (!isInFunc && funcSkippedRegs.length > 0) {
            funcSkippedRegs.forEach(reg => { tablaTriplos[reg]['Dato Fuente'] = contadorLineas; });
            funcSkippedRegs = [];
        }

        if (lx.includes('=')) {
            const eqi = lx.indexOf('=');
            let lhs = lx[eqi - 1] || lx[0];
            if (TIPOS_V.includes(lx[0])) lhs = lx[1];

            const endRhs = lx.indexOf(';') !== -1 ? lx.indexOf(';') : lx.length;
            const rhs = lx.slice(eqi + 1, endRhs);

            // Llamada a función: id_var = id_funcion(args)
            const funcCallName = rhs.find(r => functionJumps[r]);
            if (funcCallName && rhs.includes('(')) {
                const opn = rhs.indexOf('(');
                const cls = rhs.indexOf(')');
                const argsT = rhs.slice(opn + 1, cls).filter(v => v !== ',');
                const fInfo = functionJumps[funcCallName];

                // Asignar argumentos a parámetros — cada arg usa T1
                for (let a = 0; a < argsT.length; a++) {
                    if (a < fInfo.params.length) {
                        contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, '=', 'T1', argsT[a], availableTemporales);
                        contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, '=', fInfo.params[a], 'T1', availableTemporales);
                    }
                }

                contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, 'JMP', '', fInfo.startBody, availableTemporales);
                const retornoPunto = contadorLineas;

                if (fInfo.returns && fInfo.returns.length > 0) {
                    fInfo.returns.forEach(ln => { tablaTriplos[ln]['Dato Fuente'] = retornoPunto; });
                    fInfo.returns = [];
                }

                if (fInfo.retVar) {
                    contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, '=', 'T1', fInfo.retVar, availableTemporales);
                    contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, '=', lhs, 'T1', availableTemporales);
                }

                iLinea++;
                continue;
            }

            // Asignación aritmética normal — resetear temporales a T1
            const rE = procesarExpresion(rhs, tablaTriplos, contadorLineas, 1, availableTemporales);
            contadorLineas = rE[1];
            contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, '=', lhs, rE[0], availableTemporales);
        }

        iLinea++;
    }

    return tablaTriplos;
}

// ---------------------------------------------------------------------------
// Convierte la tabla al formato de filas para la UI / CSV
// ---------------------------------------------------------------------------
function tablaTriplosAEntradas(tablaTriplos) {
    const nums = Object.keys(tablaTriplos)
        .map(k => Number(k))
        .filter(n => !Number.isNaN(n))
        .sort((a, b) => a - b);
    return nums.map(noLinea => ({
        noLinea,
        operador: tablaTriplos[noLinea].operador,
        datoObjeto: tablaTriplos[noLinea]['Dato Objeto'],
        datoFuente: tablaTriplos[noLinea]['Dato Fuente']
    }));
}