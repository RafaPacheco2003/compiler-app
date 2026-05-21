

const _OPS = ['+', '-', '*', '/', '%'];
const _TIPOS = ['num', 'cow', 'chain'];

/**
 * Punto de entrada principal.
 * Recibe el código fuente completo y devuelve el código optimizado.
 * Las líneas que no son asignaciones simples se pasan SIN modificar.
 */
function optimizarCodigo(codigo) {
    if (!codigo || codigo.trim() === '') return codigo;

    const lineas = codigo.split('\n');
    const resultado = [];

    // Registro de sub-expresiones conocidas en el scope actual
    let registroCSE = [];
    // Snapshot del registro antes de entrar a un bloque for/while
    let snapshotCSE = null;
    // Indica si estamos dentro de una función (para resetear al salir)
    let dentroFuncion = false;

    for (const lineaOriginal of lineas) {
        const linea = lineaOriginal.trim();

        // ── Línea vacía ──────────────────────────────────────────────────────
        if (linea === '') {
            resultado.push(lineaOriginal);
            continue;
        }

        // ── Apertura de función: resetear registro CSE ───────────────────────
        // Detectar: tipo id_nombre( ...
        if (esCabeceraFuncion(linea)) {
            registroCSE = [];
            dentroFuncion = true;
            resultado.push(lineaOriginal);
            continue;
        }

        // ── Cierre } ─────────────────────────────────────────────────────────
        if (linea === '}') {
            if (dentroFuncion && snapshotCSE === null) {
                // Cierre de función
                registroCSE = [];
                dentroFuncion = false;
            } else if (snapshotCSE !== null) {
                // Cierre de bloque for/while: restaurar CSE pre-bloque
                // pero conservar invalidaciones de variables que cambiaron dentro
                const varsInvalidadas = new Set();
                registroCSE.forEach(e => {
                    if (!snapshotCSE.some(s => s.left === e.left && s.op === e.op && s.right === e.right)) {
                        // nueva entrada añadida dentro del bloque → no restaurar
                    }
                });
                // Restaurar snapshot, quitando entradas cuya varName fue invalidada dentro
                registroCSE = snapshotCSE.filter(s => registroCSE.some(
                    r => r.left === s.left && r.op === s.op && r.right === s.right
                ));
                snapshotCSE = null;
            }
            resultado.push(lineaOriginal);
            continue;
        }

        // ── Declaraciones de tipo (num x y; / cow a b;) → pasar intactas ────
        if (esDeclaracion(linea)) {
            resultado.push(lineaOriginal);
            continue;
        }

        // ── Apertura de bloque { (for/while) → guardar snapshot del CSE ────────
        if (linea === '{') {
            snapshotCSE = registroCSE.map(e => Object.assign({}, e));
            resultado.push(lineaOriginal);
            continue;
        }

        // ── for / while / return → pasar intactas ────────────────────────────
        if (esEstructuraControl(linea)) {
            resultado.push(lineaOriginal);
            continue;
        }

        // ── Asignación simple: lhs = rhs ─────────────────────────────────────
        const eqIdx = primerIgualAsignacion(linea);
        if (eqIdx === -1) {
            // No es una asignación reconocible → pasar intacta
            resultado.push(lineaOriginal);
            continue;
        }

        const lhs = linea.slice(0, eqIdx).trim();
        const rhs = linea.slice(eqIdx + 1).trim();

        // Quitar ';' final del rhs si existe
        const rhsSinPunto = rhs.endsWith(';') ? rhs.slice(0, -1).trim() : rhs;
        const puntoFinal = rhs.endsWith(';') ? ';' : '';

        // 1. Invalidar sub-exprs que contengan la variable que cambia
        invalidarPorVariable(registroCSE, lhs);

        // Si el RHS es una llamada a función (contiene paréntesis con argumentos)
        // no optimizar — pasar intacto para no perder comas ni estructura
        if (esLlamadaFuncion(rhsSinPunto)) {
            resultado.push(lineaOriginal);
            continue;
        }

        // 2. Optimizar el RHS
        const rhsOpt = optimizarRHS(rhsSinPunto, registroCSE);

        // 3. Registrar sub-expresiones del RHS para usos futuros
        registrarSubExpresiones(lhs, rhsOpt, registroCSE);

        // 4. Reconstruir línea
        resultado.push(lhs + ' = ' + rhsOpt + puntoFinal);
        continue;
    }

    return resultado.join('\n');
}

// ---------------------------------------------------------------------------
// Detección de tipos de línea
// ---------------------------------------------------------------------------

function esLlamadaFuncion(rhs) {
    // Detecta: id_nombre( ... ) o id_nombre ( ... )
    return /^[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(rhs.trim());
}

function esCabeceraFuncion(linea) {
    // cow id_xxx( ... ) o num id_xxx( ... )
    return _TIPOS.some(t => linea.startsWith(t + ' ') || linea.startsWith(t + '\t'))
        && linea.includes('(')
        && !linea.includes('=');  // no es una declaración con asignación
}

function esDeclaracion(linea) {
    // num id_x id_y; / cow id_a, id_b; (sin paréntesis de función)
    if (!_TIPOS.some(t => linea.startsWith(t + ' ') || linea.startsWith(t + '\t'))) return false;
    if (linea.includes('(')) return false; // es cabecera de función
    return true;
}

function esEstructuraControl(linea) {
    return linea.startsWith('for ') ||
        linea.startsWith('for(') ||
        linea.startsWith('while ') ||
        linea.startsWith('while(') ||
        linea.startsWith('do ') ||
        linea.startsWith('return') ||
        linea === '{';
}

/**
 * Devuelve el índice del '=' de asignación, ignorando ==, !=, <=, >=.
 * Si no hay asignación válida devuelve -1.
 */
function primerIgualAsignacion(linea) {
    for (let i = 0; i < linea.length; i++) {
        if (linea[i] === '=') {
            const prev = linea[i - 1];
            const next = linea[i + 1];
            if (prev === '!' || prev === '<' || prev === '>' || prev === '=') continue;
            if (next === '=') continue;
            return i;
        }
    }
    return -1;
}

// ---------------------------------------------------------------------------
// Invalidar: cuando lhs cambia de valor, eliminar sub-expresiones que lo usen
// ---------------------------------------------------------------------------
function invalidarPorVariable(registroCSE, variable) {
    for (let i = registroCSE.length - 1; i >= 0; i--) {
        const e = registroCSE[i];
        if (e.left === variable || e.right === variable || e.varName === variable) {
            registroCSE.splice(i, 1);
        }
    }
}


function registrarSubExpresiones(varName, rhs, registroCSE) {
    const tokens = tokenizarExpr(rhs);

    // Caso 1: exactamente A op B  (3 tokens)
    if (tokens.length === 3 &&
        esOperando(tokens[0]) && esOp(tokens[1]) && esOperando(tokens[2])) {
        const left = tokens[0], op = tokens[1], right = tokens[2];
        if (!registroCSE.some(e => e.left === left && e.op === op && e.right === right)) {
            registroCSE.push({ varName, left, op, right });
        }
        return;
    }

    // Caso 2: exactamente ( A op B )  (5 tokens con paréntesis envolventes)
    if (tokens.length === 5 &&
        tokens[0] === '(' && tokens[4] === ')' &&
        esOperando(tokens[1]) && esOp(tokens[2]) && esOperando(tokens[3])) {
        const left = tokens[1], op = tokens[2], right = tokens[3];
        if (!registroCSE.some(e => e.left === left && e.op === op && e.right === right)) {
            registroCSE.push({ varName, left, op, right });
        }
        return;
    }

    // Cualquier otra expresión más compleja: NO registrar
    // (la variable no equivale a una sola sub-expresión)
}

// ---------------------------------------------------------------------------
// Optimizar RHS: sustituir sub-expresiones conocidas
// ---------------------------------------------------------------------------
function optimizarRHS(rhs, registroCSE) {
    let tokens = tokenizarExpr(rhs);

    let cambio = true;
    while (cambio) {
        cambio = false;
        // Iterar de la más reciente a la más antigua
        for (let d = registroCSE.length - 1; d >= 0; d--) {
            const nuevo = intentarSustituir(tokens, registroCSE[d]);
            if (nuevo) {
                tokens = nuevo;
                cambio = true;
                break;
            }
        }
    }

    // Limpiar paréntesis redundantes: ( varName ) → varName
    tokens = limpiarParentesisRedundantes(tokens);

    return tokens.join(' ');
}

function limpiarParentesisRedundantes(tokens) {
    const out = [];
    let i = 0;
    while (i < tokens.length) {
        if (tokens[i] === '(' &&
            i + 2 < tokens.length &&
            esOperando(tokens[i + 1]) &&
            tokens[i + 2] === ')') {
            // Solo quitar si el contexto lo permite (no es necesario para precedencia)
            const antes = out.length > 0 ? out[out.length - 1] : null;
            const despues = i + 3 < tokens.length ? tokens[i + 3] : null;
            // Si está entre * y algo, el paréntesis puede ser necesario para + -
            // En nuestro caso ya fue sustituido por una variable → siempre seguro quitar
            out.push(tokens[i + 1]);
            i += 3;
        } else {
            out.push(tokens[i]);
            i++;
        }
    }
    return out;
}

function intentarSustituir(tokens, def) {
    const { varName, left, op, right } = def;

    // Patrón B: ( left op right )
    for (let i = 0; i <= tokens.length - 5; i++) {
        if (tokens[i] === '(' &&
            tokens[i + 1] === left &&
            tokens[i + 2] === op &&
            tokens[i + 3] === right &&
            tokens[i + 4] === ')') {
            return [
                ...tokens.slice(0, i),
                varName,
                ...tokens.slice(i + 5)
            ];
        }
    }

    // Patrón A: left op right  (sin paréntesis) — verificar contexto
    for (let i = 0; i <= tokens.length - 3; i++) {
        if (tokens[i] !== left) continue;
        if (tokens[i + 1] !== op) continue;
        if (tokens[i + 2] !== right) continue;

        if (!esContextoValido(tokens, i, op)) continue;

        return [
            ...tokens.slice(0, i),
            varName,
            ...tokens.slice(i + 3)
        ];
    }

    return null;
}

// ---------------------------------------------------------------------------
// Validar contexto de jerarquía
// Sub-expresión aditiva (+/-) NO se sustituye si está junto a * / sin paréntesis
// ---------------------------------------------------------------------------
function esContextoValido(tokens, i, op) {
    const j = i + 3;
    const antes = i > 0 ? tokens[i - 1] : null;
    const despues = j < tokens.length ? tokens[j] : null;

    const opEsAditivo = op === '+' || op === '-';

    if (opEsAditivo) {
        if (antes === '*' || antes === '/' || antes === '%') return false;
        if (despues === '*' || despues === '/' || despues === '%') return false;
    }

    return true;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function tokenizarExpr(expr) {
    const tokens = [];
    let i = 0;
    const s = expr.trim();

    while (i < s.length) {
        if (s[i] === ' ' || s[i] === '\t') { i++; continue; }

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

function esOp(t) {
    return _OPS.includes(t);
}

function esOperando(t) {
    return t !== undefined && !esOp(t) && t !== '(' && t !== ')';
}