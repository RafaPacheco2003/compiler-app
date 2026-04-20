// Tokenizar una línea de código
function tokenizarLinea(linea) {
    const tokens = [];
    let buffer = '';
    let enComillas = false;

    for (let i = 0; i < linea.length; i++) {
        const char = linea[i];
        const nextChar = linea[i + 1];

        if (char === '"') {
            if (enComillas) {
                buffer += char;
                tokens.push(buffer);
                buffer = '';
                enComillas = false;
            } else {
                if (buffer.trim()) tokens.push(buffer.trim());
                buffer = char;
                enComillas = true;
            }
        } else if (enComillas) {
            buffer += char;
        } else {
            // Verificar operadores de dos caracteres
            const doubleChar = char + nextChar;
            if (['>=', '<=', '==', '!=', '&&', '||', '->', '++', '--'].includes(doubleChar)) {
                if (buffer.trim()) tokens.push(buffer.trim());
                tokens.push(doubleChar);
                buffer = '';
                i++; // Saltar el siguiente caracter
            } else if ([' ', ',', '=', '+', '-', '*', '/', '(', ')', '{', '}', ';', '<', '>', '&', '|', '!'].includes(char)) {
                if (buffer.trim()) tokens.push(buffer.trim());
                buffer = '';
                if (char.trim() && char !== ' ') tokens.push(char);
            } else {
                buffer += char;
            }
        }
    }

    if (buffer.trim()) tokens.push(buffer.trim());

    return tokens.filter(t => t !== '');
}

// Tipar un lexema
function tiparLexema(lexema) {
    // Si es string (entre comillas)
    if (REGEX_STRING.test(lexema)) {
        return lexema;
    }

    // Si es número entero
    if (/^-?\d+$/.test(lexema)) {
        return parseInt(lexema);
    }

    // Si es número decimal
    if (/^-?\d*\.\d+$/.test(lexema)) {
        return parseFloat(lexema);
    }

    // Sino, devolver como string
    return lexema;
}

// Generar tabla de símbolos
function generarTablaSimbolos(codigo) {
    const lexemaDict = {};
    const lineas = codigo.split('\n');

    // Definir categorías de operadores
    const operadoresAritmeticos = ['+', '-', '*', '/'];
    const operadoresRelacionales = ['<', '>', '>=', '<=', '==', '!='];
    const operadoresLogicos = ['&&', '||', 'and', 'or'];
    const operadorAsignacion = ['='];
    const instruccionIterativa = ['for'];
    const miscelaneos = [',', ';', '{', '}', '(', ')', '->'];
    const palabrasReservadas = ['funcion', 'return'];

    for (const linea of lineas) {
        if (!linea.trim()) continue;

        const lexemas = tokenizarLinea(linea);
        const tipoDeLinea = lexemas.find(lex => TIPOS[lex]);

        // Detectar declaración de función: funcion nombre ( params ) -> tipo { } o  tipo nombre ( ) { }
        const esFuncionVieja = lexemas[0] === 'funcion';
        const esFuncionNueva = lexemas.length > 2 && TIPOS[lexemas[0]] && ID_REGEX.test(lexemas[1]) && lexemas[2] === '(';
        const esFuncion = esFuncionVieja || esFuncionNueva;

        let tipoRetornoFuncion = "";
        if (esFuncion) {
            if (esFuncionVieja) {
                const idxFlecha = lexemas.indexOf('->');
                if (idxFlecha !== -1 && idxFlecha + 1 < lexemas.length) {
                    tipoRetornoFuncion = lexemas[idxFlecha + 1];
                }
            } else {
                tipoRetornoFuncion = lexemas[0];
            }
        }

        for (let i = 0; i < lexemas.length; i++) {
            const lexema = lexemas[i];
            const lexemaTipado = tiparLexema(lexema);
            const lexemaStr = String(lexema);

            if (!(lexemaStr in lexemaDict)) {
                // Identificadores
                if (ID_REGEX.test(lexemaStr)) {
                    // Si es declaración de función, marcar el identificador de la función
                    if (esFuncion && i === 1) {
                        lexemaDict[lexemaStr] = tipoRetornoFuncion ? `Función ${tipoRetornoFuncion}` : "Función";
                    } else {
                        lexemaDict[lexemaStr] = tipoDeLinea || "Indeterminado";
                    }
                }
                // Constantes de cadena
                else if (REGEX_STRING.test(lexemaStr)) {
                    lexemaDict[lexemaStr] = "chain";
                }
                // Constantes numéricas
                else if (typeof lexemaTipado === 'number') {
                    if (Number.isInteger(lexemaTipado)) {
                        lexemaDict[lexemaStr] = "num";
                    } else {
                        lexemaDict[lexemaStr] = "cow";
                    }
                }
                // Operadores aritméticos
                else if (operadoresAritmeticos.includes(lexemaStr)) {
                    lexemaDict[lexemaStr] = "";
                }
                // Operadores relacionales
                else if (operadoresRelacionales.includes(lexemaStr)) {
                    lexemaDict[lexemaStr] = "";
                }
                // Operadores lógicos
                else if (operadoresLogicos.includes(lexemaStr)) {
                    lexemaDict[lexemaStr] = "";
                }
                // Operador de asignación
                else if (operadorAsignacion.includes(lexemaStr)) {
                    lexemaDict[lexemaStr] = "";
                }
                // Instrucción iterativa
                else if (instruccionIterativa.includes(lexemaStr)) {
                    lexemaDict[lexemaStr] = "";
                }
                // Misceláneos
                else if (miscelaneos.includes(lexemaStr)) {
                    lexemaDict[lexemaStr] = "";
                }
                // Tipo de dato
                else if (TIPOS[lexemaStr]) {
                    lexemaDict[lexemaStr] = "";
                }
                // Palabras reservadas (func, etc)
                else if (palabrasReservadas.includes(lexemaStr)) {
                    lexemaDict[lexemaStr] = "";
                }
                // Otros lexemas
                else {
                    lexemaDict[lexemaStr] = "";
                }
            }
        }
    }

    return lexemaDict;
}

// Generar tabla de errores
function generarTablaErrores(codigo, lexemaDict) {
    const errores = [];
    const lineas = codigo.split('\n');
    let contadorError = 1;
    const identificadoresDeclarados = new Set();
    const idsYaDeclarados = new Set();
    const funcionesDeclaradas = new Set();
    const funcionesYaDeclaradas = new Set();
    const erroresRegistrados = new Set(); // Para evitar duplicados de lexema+renglón

    // Función auxiliar para agregar error sin duplicados
    function agregarError(numeroLinea, lexema, descripcion) {
        const clave = `${lexema}-${numeroLinea}`;
        if (erroresRegistrados.has(clave)) {
            return; // Ya existe este error, no duplicar
        }
        erroresRegistrados.add(clave);

        const token = `EI${contadorError++}`;
        errores.push({
            token: token,
            linea: numeroLinea,
            lexema: lexema,
            descripcion: descripcion
        });
    }

    lineas.forEach((linea, index) => {
        if (!linea.trim()) return;

        const lineaDeLexemas = tokenizarLinea(linea);
        const numeroLinea = index + 1;

        // PASO 1: Detectar declaraciones de funciones: funcion nombre ( params ) -> tipo { } o tipo nombre ( params ) { }
        const esDeclFuncionVieja = lineaDeLexemas.length > 0 && lineaDeLexemas[0] === 'funcion';
        const esDeclFuncionNueva = lineaDeLexemas.length > 2 && TIPOS[lineaDeLexemas[0]] && ID_REGEX.test(lineaDeLexemas[1]) && lineaDeLexemas[2] === '(';

        if (esDeclFuncionVieja || esDeclFuncionNueva) {
            const nombreFuncion = lineaDeLexemas[1];
            if (funcionesYaDeclaradas.has(nombreFuncion)) {
                agregarError(numeroLinea, nombreFuncion, "Duplicidad de declaración");
            } else {
                funcionesYaDeclaradas.add(nombreFuncion);
                funcionesDeclaradas.add(nombreFuncion);
            }
            return; // No más validaciones en líneas de declaración de función
        }

        // PASO 2: Detectar declaraciones de variables y duplicados
        let esLineaDeclaracionPura = false;
        if (lineaDeLexemas.length > 0 && TIPOS[lineaDeLexemas[0]]) {
            esLineaDeclaracionPura = true;
        }

        for (let i = 0; i < lineaDeLexemas.length; i++) {
            if (TIPOS[lineaDeLexemas[i]]) {
                // Leer IDs hasta encontrar limitador
                let j = i + 1;
                while (j < lineaDeLexemas.length) {
                    const token = lineaDeLexemas[j];
                    if (token === '=' || token === ';' || token === '{' || token === '(' || token === ')' ||
                        ['<', '>', '<=', '>=', '!=', '==', '&&', '||', '+', '-', '*', '/'].includes(token)) {
                        break;
                    }
                    if (ID_REGEX.test(token)) {
                        if (idsYaDeclarados.has(token)) {
                            agregarError(numeroLinea, token, "Duplicidad de declaración");
                        } else {
                            idsYaDeclarados.add(token);
                            identificadoresDeclarados.add(token);
                        }
                    }
                    j++;
                }
            }
        }

        // Si es una declaración sin asignación, no evaluar más
        if (esLineaDeclaracionPura && !lineaDeLexemas.includes('=')) {
            return;
        }

        // PASO 3: Detectar llamadas a funciones
        for (let i = 0; i < lineaDeLexemas.length; i++) {
            const lexema = lineaDeLexemas[i];
            const siguienteLexema = lineaDeLexemas[i + 1];

            // Si es un identificador seguido de paréntesis, es una llamada a función
            if (ID_REGEX.test(lexema) && siguienteLexema === '(') {
                if (!funcionesDeclaradas.has(lexema)) {
                    agregarError(numeroLinea, lexema, "Función indefinida");
                }
            }
        }

        // PASO 4: Detectar errores en asignaciones
        if (lineaDeLexemas.includes('=')) {
            const indiceAsignacion = lineaDeLexemas.indexOf('=');

            if (indiceAsignacion > 0) {
                const variableIzq = lineaDeLexemas[indiceAsignacion - 1];
                const tipoVarIzq = lexemaDict[variableIzq];

                // Variable izquierda indefinida
                if (ID_REGEX.test(variableIzq) && !identificadoresDeclarados.has(variableIzq)) {
                    agregarError(numeroLinea, variableIzq, "Variable indefinida");
                    return;
                }

                // Validar lado derecho de la asignación
                const expresionDerecha = lineaDeLexemas.slice(indiceAsignacion + 1);

                for (const lexema of expresionDerecha) {
                    const tipoLexema = lexemaDict[lexema];

                    // Solo validar identificadores y constantes (ignorar operadores)
                    const esIdentificador = ID_REGEX.test(lexema);
                    const esConstante = /^-?\d+(\.\d+)?$/.test(lexema) || /^".*"$/.test(lexema);

                    if (esIdentificador || esConstante) {

                        // Variable indefinida (permitiendo si es una llamada a función)
                        if (esIdentificador && !identificadoresDeclarados.has(lexema) && !funcionesDeclaradas.has(lexema)) {
                            agregarError(numeroLinea, lexema, "Variable indefinida");
                            continue;
                        }

                        // Incompatibilidad de tipos
                        if (tipoVarIzq && tipoLexema &&
                            tipoVarIzq !== 'Indeterminado' && tipoLexema !== 'Indeterminado') {

                            let incompatible = false;

                            // Extraer el tipo si es una función (ej. "Función num" -> "num")
                            let tipoRealLexema = tipoLexema;
                            if (typeof tipoLexema === 'string' && tipoLexema.startsWith("Función ")) {
                                tipoRealLexema = tipoLexema.replace("Función ", "");
                            }

                            // num solo acepta num
                            if (tipoVarIzq === 'num' && tipoRealLexema !== 'num') {
                                incompatible = true;
                            }
                            // cow acepta num y cow
                            else if (tipoVarIzq === 'cow' && tipoRealLexema !== 'num' && tipoRealLexema !== 'cow') {
                                incompatible = true;
                            }
                            // chain solo acepta chain
                            else if (tipoVarIzq === 'chain' && tipoRealLexema !== 'chain') {
                                incompatible = true;
                            }

                            if (incompatible) {
                                agregarError(numeroLinea, lexema, `Incompatibilidad de tipos, ${tipoVarIzq}`);
                            }
                        }
                    }
                }
            }
        }

        // PASO 5: Detectar variables indefinidas en for
        if (lineaDeLexemas.includes('for')) {
            for (const lexema of lineaDeLexemas) {
                if (ID_REGEX.test(lexema) && !identificadoresDeclarados.has(lexema)) {
                    agregarError(numeroLinea, lexema, "Variable indefinida");
                }
            }
        }
    });

    return errores;
}