
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
            if (['>=', '<=', '==', '!=', '&&', '||', '->'].includes(doubleChar)) {
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
        
        // Detectar declaración de función: funcion nombre ( params ) -> tipo { }
        const esFuncion = lexemas[0] === 'funcion';
        
        for (let i = 0; i < lexemas.length; i++) {
            const lexema = lexemas[i];
            const lexemaTipado = tiparLexema(lexema);
            const lexemaStr = String(lexema);
            
            if (!(lexemaStr in lexemaDict)) {
                // Identificadores
                if (ID_REGEX.test(lexemaStr)) {
                    // Si es declaración de función, marcar el identificador siguiente a 'funcion'
                    if (esFuncion && i === 1) {
                        lexemaDict[lexemaStr] = "Función";
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
        
        // PASO 1: Detectar declaraciones de funciones: funcion nombre ( params ) -> tipo { }
        if (lineaDeLexemas.length > 0 && lineaDeLexemas[0] === 'funcion') {
            if (lineaDeLexemas.length > 1) {
                const nombreFuncion = lineaDeLexemas[1];
                if (funcionesYaDeclaradas.has(nombreFuncion)) {
                    agregarError(numeroLinea, nombreFuncion, "Duplicidad de declaración");
                } else {
                    funcionesYaDeclaradas.add(nombreFuncion);
                    funcionesDeclaradas.add(nombreFuncion);
                }
            }
            return; // No más validaciones en líneas de declaración de función
        }
        
        // PASO 2: Detectar declaraciones de variables y duplicados
        if (lineaDeLexemas.length > 0 && TIPOS[lineaDeLexemas[0]]) {
            const ids = lineaDeLexemas.slice(1).filter(x => x !== ',' && x !== ';');
            
            for (const identificador of ids) {
                if (idsYaDeclarados.has(identificador)) {
                    agregarError(numeroLinea, identificador, "Duplicidad de declaración");
                } else {
                    idsYaDeclarados.add(identificador);
                    identificadoresDeclarados.add(identificador);
                }
            }
            return; // No más validaciones en líneas de declaración
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
                        
                        // Variable indefinida
                        if (esIdentificador && !identificadoresDeclarados.has(lexema)) {
                            agregarError(numeroLinea, lexema, "Variable indefinida");
                            continue;
                        }
                        
                        // Incompatibilidad de tipos
                        if (tipoVarIzq && tipoLexema && 
                            tipoVarIzq !== 'Indeterminado' && tipoLexema !== 'Indeterminado') {
                            
                            let incompatible = false;
                            
                            // num solo acepta num
                            if (tipoVarIzq === 'num' && tipoLexema !== 'num') {
                                incompatible = true;
                            } 
                            // cow acepta num y cow
                            else if (tipoVarIzq === 'cow' && tipoLexema !== 'num' && tipoLexema !== 'cow') {
                                incompatible = true;
                            } 
                            // chain solo acepta chain
                            else if (tipoVarIzq === 'chain' && tipoLexema !== 'chain') {
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
