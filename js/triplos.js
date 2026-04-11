/**
 * Generación de tabla de triplos (port del módulo Python del usuario).
 * Usa su propio tokenizador por espacios (tokenizarLineaTriplo), independiente de utils.js.
 */

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
                if (tokenActual) {
                    tokens.push(tokenActual);
                    tokenActual = '';
                }
                enString = true;
                tokenActual += char;
            }
        } else if (enString) {
            tokenActual += char;
        } else if (char === ' ' || char === '\t') {
            if (tokenActual) {
                tokens.push(tokenActual);
                tokenActual = '';
            }
        } else {
            tokenActual += char;
        }
        i += 1;
    }
    if (tokenActual) {
        tokens.push(tokenActual);
    }
    return tokens;
}

function esEvaluacion(lineaLexemas, listaEvaluacion = ['<', '>', '<=', '>=', '==', '!=', '=']) {
    return lineaLexemas.some(op => listaEvaluacion.includes(op));
}

function esBinario(lineaLexemas, listaBinarios = ['or', 'and']) {
    return lineaLexemas.some(op => listaBinarios.includes(op));
}

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
                const r = procesarCondicionLogica(
                    termino,
                    tablaTriplos,
                    contadorLineas,
                    tempCounter,
                    availableTemporales
                );
                contadorLineas = r.contadorLineas;
                tempCounter = r.tempCounter;
                const lineaFalsoTermino = r.lineaFalsoFinal;
                if (idx < terminos.length - 1) {
                    tablaTriplos[lineaFalsoTermino]['Dato Fuente'] = contadorLineas;
                } else {
                    lineaFalsoFinal = lineaFalsoTermino;
                }
            } else {
                let temp;
                let rTemp = nuevoTemporal(tempCounter, availableTemporales);
                temp = rTemp[0];
                tempCounter = rTemp[1];
                contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, '=', temp, termino[0], availableTemporales);
                contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, termino[1], temp, termino[2], availableTemporales);

                const lineaVerdadero = contadorLineas;
                lineasVerdaderoOr.push(lineaVerdadero);
                contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, 'Verdadero', '', 'Pendiente_OR', availableTemporales);

                if (idx < terminos.length - 1) {
                    contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, 'Falso', '', contadorLineas + 1, availableTemporales);
                } else {
                    lineaFalsoFinal = contadorLineas;
                    contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, 'Falso', '', 'Pendiente_FINAL', availableTemporales);
                }
            }
        }

        const lineaCuerpo = contadorLineas;
        for (const lineaV of lineasVerdaderoOr) {
            if (lineaV in tablaTriplos) {
                tablaTriplos[lineaV]['Dato Fuente'] = lineaCuerpo;
            }
        }

        return {
            contadorLineas,
            tempCounter,
            lineasVerdaderoOr,
            lineaFalsoFinal,
            lineaInicio
        };
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
            let temp;
            let rTemp = nuevoTemporal(tempCounter, availableTemporales);
            temp = rTemp[0];
            tempCounter = rTemp[1];
            contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, '=', temp, termino[0], availableTemporales);
            contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, termino[1], temp, termino[2], availableTemporales);

            if (idx < terminos.length - 1) {
                contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, 'Verdadero', '', contadorLineas + 2, availableTemporales);
                const lineaFalso = contadorLineas;
                lineasFalsoAnd.push(lineaFalso);
                contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, 'Falso', '', 'Pendiente_AND_F', availableTemporales);
            } else {
                contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, 'Verdadero', '', contadorLineas + 2, availableTemporales);
                lineaFalsoFinal = contadorLineas;
                contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, 'Falso', '', 'Pendiente_FINAL', availableTemporales);
            }
        }

        for (const lineaF of lineasFalsoAnd) {
            tablaTriplos[lineaF]['Dato Fuente'] = lineaFalsoFinal;
        }

        return {
            contadorLineas,
            tempCounter,
            lineasVerdaderoOr: null,
            lineaFalsoFinal,
            lineaInicio
        };
    }

    const lineaInicio = contadorLineas;
    let temp;
    let rTemp = nuevoTemporal(tempCounter, availableTemporales);
    temp = rTemp[0];
    tempCounter = rTemp[1];
    contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, '=', temp, evaluacion[0], availableTemporales);
    contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, evaluacion[1], temp, evaluacion[2], availableTemporales);

    contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, 'Verdadero', '', contadorLineas + 2, availableTemporales);
    const lineaFalsoFinal = contadorLineas;
    contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, 'Falso', '', 'Pendiente_FINAL', availableTemporales);

    return {
        contadorLineas,
        tempCounter,
        lineasVerdaderoOr: null,
        lineaFalsoFinal,
        lineaInicio
    };
}

function contenidoParentesis(lineaLexemas) {
    let sublista = '';
    for (let i = 0; i < lineaLexemas.length; i++) {
        if (lineaLexemas[i] === '(') {
            for (let j = i + 1; j < lineaLexemas.length; j++) {
                if (lineaLexemas[j] === ')') {
                    sublista = lineaLexemas.slice(i + 1, j);
                    contenidoParentesis(sublista);
                    break;
                }
            }
        }
    }
    return sublista;
}

function triplo(lineaLexemas) {
    let operadorPrincipal = '';
    let datoObjeto = '';
    let datoFuente = '';
    for (let i = 0; i < lineaLexemas.length; i++) {
        if (['+', '-', '*', '/'].includes(lineaLexemas[i]) &&
            lineaLexemas[i - 1] !== '(' &&
            lineaLexemas[i + 1] !== ')') {
            operadorPrincipal = lineaLexemas[i];
            break;
        }
    }
    if (operadorPrincipal) {
        const indiceOp = lineaLexemas.indexOf(operadorPrincipal);
        datoObjeto = lineaLexemas[indiceOp - 1];
        datoFuente = lineaLexemas[indiceOp + 1];
    }
    return [operadorPrincipal, datoObjeto, datoFuente];
}

function emitirTriplo(tablaTriplos, contadorLineas, operador, datoObjeto, datoFuente, availableTemporales) {
    tablaTriplos[contadorLineas] = {
        operador,
        'Dato Objeto': datoObjeto,
        'Dato Fuente': datoFuente
    };
    if (typeof datoFuente === 'string' && datoFuente.startsWith('T')) {
        if (!availableTemporales.includes(datoFuente)) {
            availableTemporales.push(datoFuente);
        }
    }
    if (typeof datoObjeto === 'string' && datoObjeto.startsWith('T')) {
        const ix = availableTemporales.indexOf(datoObjeto);
        if (ix !== -1) {
            availableTemporales.splice(ix, 1);
        }
    }
    return contadorLineas + 1;
}

function nuevoTemporal(tempCounter, availableTemporales) {
    if (availableTemporales.length > 0) {
        return [availableTemporales.shift(), tempCounter];
    }
    const nombre = `T${tempCounter}`;
    return [nombre, tempCounter + 1];
}

function reducirExpresionFlat(tokens, tablaTriplos, contadorLineas, tempCounter, availableTemporales) {
    tokens = tokens.slice();

    if (tokens.length === 1) {
        return [tokens[0], contadorLineas, tempCounter];
    }

    let i = 1;
    while (i < tokens.length) {
        if (i < tokens.length && ['*', '/', '%'].includes(tokens[i])) {
            const operandoIzq = tokens[i - 1];
            const operador = tokens[i];
            const operandoDer = tokens[i + 1];

            let temp;
            let rTemp = nuevoTemporal(tempCounter, availableTemporales);
            temp = rTemp[0];
            tempCounter = rTemp[1];

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

    if (tokens.length === 1) {
        return [tokens[0], contadorLineas, tempCounter];
    }

    if (typeof tokens[0] === 'string' && tokens[0].startsWith('T')) {
        const temp = tokens[0];
        i = 1;
        while (i < tokens.length) {
            const op = tokens[i];
            const rhs = tokens[i + 1];
            contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, op, temp, rhs, availableTemporales);
            i += 2;
        }
        return [temp, contadorLineas, tempCounter];
    }

    let temp;
    let rTemp = nuevoTemporal(tempCounter, availableTemporales);
    temp = rTemp[0];
    tempCounter = rTemp[1];
    contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, '=', temp, tokens[0], availableTemporales);
    i = 1;
    while (i < tokens.length) {
        const op = tokens[i];
        const rhs = tokens[i + 1];
        contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, op, temp, rhs, availableTemporales);
        i += 2;
    }
    return [temp, contadorLineas, tempCounter];
}

function procesarExpresion(tokens, tablaTriplos, contadorLineas, tempCounter, availableTemporales) {
    tokens = tokens.slice();
    while (tokens.includes('(')) {
        const openIndices = tokens.map((t, idx) => (t === '(' ? idx : -1)).filter(idx => idx >= 0);
        const lastOpen = Math.max(...openIndices);
        let close = null;
        for (let j = lastOpen + 1; j < tokens.length; j++) {
            if (tokens[j] === ')') {
                close = j;
                break;
            }
        }
        if (close === null) {
            break;
        }
        const sub = tokens.slice(lastOpen + 1, close);
        const rSub = reducirExpresionFlat(sub, tablaTriplos, contadorLineas, tempCounter, availableTemporales);
        const resultadoSub = rSub[0];
        contadorLineas = rSub[1];
        tempCounter = rSub[2];
        tokens = tokens.slice(0, lastOpen).concat([resultadoSub], tokens.slice(close + 1));
    }
    const r = reducirExpresionFlat(tokens, tablaTriplos, contadorLineas, tempCounter, availableTemporales);
    return [r[0], r[1], r[2]];
}

/**
 * Normaliza operadores lógicos del estilo del proyecto (&&, ||) a and/or con espacios,
 * para que el mismo flujo que en Python reconozca las condiciones.
 */
function normalizarLineaParaTriplos(linea) {
    return linea
        .replace(/&&/g, ' and ')
        .replace(/\|\|/g, ' or ');
}

function generarTriplos(codigo) {
    const lineas = codigo.trim().split('\n');
    let contadorLineas = 1;
    const tablaTriplos = {};
    let operacion = null;
    let lineaInicioFor = 0;
    let lineaFinFor = 0;
    let tempCounter = 1;
    const availableTemporales = [];
    let falseTripleKey = null;

    for (const linea of lineas) {
        const lineaNorm = normalizarLineaParaTriplos(linea);
        const lineaLexemas = tokenizarLineaTriplo(lineaNorm);

        if (linea.trim() === '}') {
            if (operacion) {
                const lhs = operacion[0];
                let rhsTokens;
                if (operacion.includes('=')) {
                    try {
                        const idxEq = operacion.indexOf('=');
                        rhsTokens = operacion.slice(idxEq + 1);
                    } catch {
                        rhsTokens = operacion.slice(1);
                    }
                } else {
                    rhsTokens = operacion.slice(1);
                }
                const rExp = procesarExpresion(rhsTokens, tablaTriplos, contadorLineas, tempCounter, availableTemporales);
                const resultado = rExp[0];
                contadorLineas = rExp[1];
                tempCounter = rExp[2];
                contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, '=', lhs, resultado, availableTemporales);
                contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, 'JMP', '', lineaInicioFor, availableTemporales);
            }
            lineaFinFor = contadorLineas;
            if (falseTripleKey !== null) {
                tablaTriplos[falseTripleKey]['Dato Fuente'] = lineaFinFor;
            }
        }

        if (esEvaluacion(lineaLexemas)) {
            if (lineaLexemas[0] === 'for') {
                for (let j = 1; j < lineaLexemas.length; j++) {
                    if (lineaLexemas[j] === ';') {
                        const evaluacion = lineaLexemas.slice(1, j);
                        const rLog = procesarCondicionLogica(
                            evaluacion,
                            tablaTriplos,
                            contadorLineas,
                            tempCounter,
                            availableTemporales
                        );
                        contadorLineas = rLog.contadorLineas;
                        tempCounter = rLog.tempCounter;
                        falseTripleKey = rLog.lineaFalsoFinal;
                        lineaInicioFor = rLog.lineaInicio;

                        for (let k = j + 1; k < lineaLexemas.length; k++) {
                            if (lineaLexemas[k] === '{') {
                                operacion = lineaLexemas.slice(j + 1, k);
                                break;
                            }
                        }
                        break;
                    }
                }
            } else if (lineaLexemas.includes('=')) {
                const idxEq = lineaLexemas.indexOf('=');
                const lhs = lineaLexemas[0];
                const rhsTokens = lineaLexemas.slice(idxEq + 1);
                const rExp = procesarExpresion(rhsTokens, tablaTriplos, contadorLineas, tempCounter, availableTemporales);
                const resultado = rExp[0];
                contadorLineas = rExp[1];
                tempCounter = rExp[2];
                contadorLineas = emitirTriplo(tablaTriplos, contadorLineas, '=', lhs, resultado, availableTemporales);
            } else {
                const rExp = procesarExpresion(lineaLexemas, tablaTriplos, contadorLineas, tempCounter, availableTemporales);
                contadorLineas = rExp[1];
                tempCounter = rExp[2];
            }
        }
    }

    return tablaTriplos;
}

/** Convierte la tabla de triplos a filas ordenadas para la UI o CSV */
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
