// ---------------------------------------------------------------------------
// Optimización: eliminación de subexpresiones comunes (CSE)
// ---------------------------------------------------------------------------

const OPS_ARIT = ['+', '-', '*', '/', '%'];
const ASIGNACION_RE = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/;

/**
 * Punto de entrada: optimiza el código fuente o, si hay triplos, su forma en asignaciones.
 * @param {string} codigo
 * @returns {string}
 */
function optimizarCodigo(codigo) {
    if (!codigo || codigo.trim() === '') {
        return codigo;
    }

    // Código pegado como asignaciones (a = z + 22): optimizar directo, sin triplos.
    if (esCodigoSoloAsignaciones(codigo)) {
        return optimizarLineasAsignacion(codigo.split('\n')).join('\n');
    }

    if (typeof generarTriplos === 'function') {
        const tabla = generarTriplos(codigo);
        const lineasTriplo = triplosTablaALineasAsignacion(tabla);
        if (lineasTriplo.length > 0) {
            return optimizarLineasAsignacion(lineasTriplo).join('\n');
        }
    }

    return optimizarLineasAsignacion(codigo.split('\n')).join('\n');
}

function esCodigoSoloAsignaciones(codigo) {
    const lineas = codigo.split('\n').filter(l => l.trim() !== '');
    if (lineas.length === 0) return false;
    return lineas.every(l => ASIGNACION_RE.test(l.trim()));
}

/**
 * Optimiza una tabla de triplos y devuelve texto (T1 = a + b, ...).
 * @param {Object} tablaTriplos
 * @returns {string}
 */
function optimizarTriplos(tablaTriplos) {
    const lineas = triplosTablaALineasAsignacion(tablaTriplos);
    return optimizarLineasAsignacion(lineas).join('\n');
}

// ---------------------------------------------------------------------------
// Triplos → líneas de asignación (solo variables finales, sin T1 duplicados)
// ---------------------------------------------------------------------------
function esTemporal(nombre) {
    return /^T\d+$/.test(nombre);
}

function triplosTablaALineasAsignacion(tablaTriplos) {
    const cadenas = extraerCadenasTriplo(tablaTriplos);
    const exprPorNombre = {};
    const lineas = [];

    for (const { destino, partes } of cadenas) {
        const tokens = expandirPartesTriplo(partes, exprPorNombre);
        exprPorNombre[destino] = tokens;

        if (!esTemporal(destino)) {
            lineas.push(destino + ' = ' + tokensAExpresion(tokens));
        }
    }

    return lineas;
}

function extraerCadenasTriplo(tablaTriplos) {
    const nums = Object.keys(tablaTriplos)
        .map(Number)
        .filter(n => !Number.isNaN(n))
        .sort((a, b) => a - b);

    const cadenas = [];
    let actual = null;

    function cerrar() {
        if (actual && actual.partes.length > 0) {
            cadenas.push(actual);
        }
        actual = null;
    }

    for (const n of nums) {
        const t = tablaTriplos[n];
        const op = t.operador;
        const obj = t['Dato Objeto'];
        const src = t['Dato Fuente'];

        if (op === '=' && obj && src !== undefined && src !== '') {
            cerrar();
            actual = { destino: String(obj), partes: [String(src)] };
        } else if (actual && obj === actual.destino && OPS_ARIT.includes(op)) {
            actual.partes.push(op, String(src));
        } else if (op === '=' || OPS_ARIT.includes(op)) {
            cerrar();
        }
    }
    cerrar();
    return cadenas;
}

/** Sustituye T1 por la expresión ya calculada (z + 22) al asignar a = T1 */
function expandirPartesTriplo(partes, exprPorNombre) {
    if (partes.length === 1 && exprPorNombre[partes[0]]) {
        return exprPorNombre[partes[0]].slice();
    }

    const tokens = [];
    for (const p of partes) {
        if (exprPorNombre[p]) {
            tokens.push(...exprPorNombre[p]);
        } else {
            tokens.push(p);
        }
    }
    return tokens;
}

// ---------------------------------------------------------------------------
// CSE sobre líneas de asignación
// ---------------------------------------------------------------------------
function optimizarLineasAsignacion(lineas) {
    const resultado = [];
    const definiciones = [];

    for (const lineaOriginal of lineas) {
        const linea = lineaOriginal.trim();

        if (linea === '') {
            resultado.push('');
            continue;
        }

        const match = linea.match(ASIGNACION_RE);
        if (!match) {
            resultado.push(lineaOriginal);
            continue;
        }

        const variable = match[1];
        const tokensRhs = tokenizarExpresion(match[2]);
        const tokensOpt = aplicarCSE(tokensRhs, definiciones);
        const rhsOpt = tokensAExpresion(tokensOpt);

        definiciones.push({
            variable,
            tokens: tokensOpt.slice(),
            expr: rhsOpt
        });

        const optimizado = rhsOpt !== tokensAExpresion(tokensRhs);
        if (optimizado) {
            resultado.push(variable + ' = ' + rhsOpt);
        } else {
            resultado.push(lineaOriginal);
        }
    }

    return resultado;
}

function aplicarCSE(tokens, definiciones) {
    let actual = tokens.slice();
    let huboCambio = true;

    while (huboCambio) {
        huboCambio = false;
        for (let d = definiciones.length - 1; d >= 0; d--) {
            const def = definiciones[d];
            const reemplazo = intentarReemplazar(actual, def);
            if (reemplazo) {
                actual = reemplazo;
                huboCambio = true;
                break;
            }
        }
    }

    return actual;
}

function intentarReemplazar(tokens, def) {
    const prev = def.tokens;
    if (prev.length === 0) return null;

    let r = intentarParentesis(tokens, prev, def.variable);
    if (r) return r;

    r = intentarSubsecuenciaAditiva(tokens, prev, def.variable);
    if (r) return r;

    r = intentarProductoConmutativo(tokens, prev, def.variable);
    if (r) return r;

    return null;
}

/** Ej. 5: w * (z + 22) → w * a */
function intentarParentesis(tokens, prev, varPrev) {
    const envuelto = ['(', ...prev, ')'];
    const i = indiceSubsecuencia(tokens, envuelto);
    if (i === -1) return null;
    return sustituirEn(tokens, i, envuelto.length, [varPrev]);
}

/**
 * Ej. 1 y 2: subexpresión aditiva contigua, sin romper precedencia de * /.
 * Válido: toda la RHS, (expr), sufijo tras '-' o sumando al final (id_n4 + subexpr).
 */
function intentarSubsecuenciaAditiva(tokens, prev, varPrev) {
    if (!esExpresionAditiva(prev)) return null;

    const i = indiceSubsecuencia(tokens, prev);
    if (i === -1) return null;
    if (!esReemplazoAditivoValido(tokens, i, prev.length)) return null;

    return sustituirEn(tokens, i, prev.length, [varPrev]);
}

function esExpresionAditiva(tokens) {
    return tokens.length > 0 && tokens.every(t => OPS_ARIT.includes(t) ? (t === '+' || t === '-') : t !== '(' && t !== ')');
}

function esReemplazoAditivoValido(tokens, i, len) {
    const j = i + len;
    const antes = i > 0 ? tokens[i - 1] : null;
    const despues = j < tokens.length ? tokens[j] : null;

    if (antes === '*' || antes === '/' || despues === '*' || despues === '/') {
        return false;
    }
    if (antes === '(' && despues === ')') return true;
    if (i === 0 && j === tokens.length) return true;
    // X - subexpr  o  X + subexpr  al final (ej. id_n4 + id_n1 + id_n2 → id_n4 + id_t1)
    if ((antes === '-' || antes === '+') && j === tokens.length) return true;

    return false;
}

/**
 * Ej. 4: z * 22 en w * z * 22 → w * a (producto conmutativo/asociativo).
 */
function intentarProductoConmutativo(tokens, prev, varPrev) {
    const factoresPrev = factoresMultiplicativos(prev);
    if (factoresPrev.length < 2) return null;

    const factoresAct = factoresMultiplicativos(tokens);
    if (factoresAct.length < factoresPrev.length) return null;
    if (!contieneFactores(factoresAct, factoresPrev)) return null;

    const restantes = quitarFactores(factoresAct, factoresPrev);
    return construirProducto(restantes, varPrev);
}

function factoresMultiplicativos(tokens) {
    if (tokens.some(t => t === '+' || t === '-' || t === '(' || t === ')')) {
        return [];
    }
    const factores = [];
    let buf = [];
    for (const t of tokens) {
        if (t === '*') {
            if (buf.length) factores.push(buf.join(''));
            buf = [];
        } else if (t !== '/') {
            buf.push(t);
        }
    }
    if (buf.length) factores.push(buf.join(''));
    return factores;
}

function contieneFactores(actuales, buscados) {
    const copia = actuales.slice();
    for (const f of buscados) {
        const idx = copia.indexOf(f);
        if (idx === -1) return false;
        copia.splice(idx, 1);
    }
    return true;
}

function quitarFactores(actuales, quitar) {
    const copia = actuales.slice();
    for (const f of quitar) {
        const idx = copia.indexOf(f);
        if (idx !== -1) copia.splice(idx, 1);
    }
    return copia;
}

function construirProducto(factores, varExtra) {
    if (factores.length === 0) return [varExtra];
    const out = [factores[0]];
    for (let i = 1; i < factores.length; i++) {
        out.push('*', factores[i]);
    }
    out.push('*', varExtra);
    return out;
}

// ---------------------------------------------------------------------------
// Tokenización
// ---------------------------------------------------------------------------
function tokenizarExpresion(expr) {
    const tokens = [];
    let i = 0;
    const s = expr.trim();

    while (i < s.length) {
        if (s[i] === ' ' || s[i] === '\t') {
            i++;
            continue;
        }
        if ('()+-*/%'.includes(s[i])) {
            tokens.push(s[i]);
            i++;
            continue;
        }
        let j = i;
        while (j < s.length && /[A-Za-z0-9_.]/.test(s[j])) j++;
        if (j > i) {
            tokens.push(s.slice(i, j));
            i = j;
        } else {
            i++;
        }
    }
    return tokens;
}

function tokensAExpresion(tokens) {
  return tokens.join(' ');
}

function indiceSubsecuencia(arr, sub) {
    for (let i = 0; i <= arr.length - sub.length; i++) {
        let ok = true;
        for (let k = 0; k < sub.length; k++) {
            if (arr[i + k] !== sub[k]) {
                ok = false;
                break;
            }
        }
        if (ok) return i;
    }
    return -1;
}

function sustituirEn(arr, inicio, longitud, reemplazo) {
    return arr.slice(0, inicio).concat(reemplazo, arr.slice(inicio + longitud));
}
