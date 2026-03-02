// Expresión regular para los identificadores
const ID_REGEX = /id_[A-Za-z0-9_-]+/;
const REGEX_STRING = /"([^"]+)"/;

// Tipos de datos
// tipos = ["num", "chain", "cow"]
const TIPOS = {"num": "int", "chain": "str", "cow": "float"};

// Texto inicial en el editor
const TEXTO_INICIAL = 
`num id_contador , id_suma , id_temp
cow id_precio , id_descuento , id_total
chain id_nombre , id_codigo , id_mensaje
num id_resultado , id_contador

funcion id_calcular ( id_contador ) -> num {
id_resultado = id_contador * 2
return id_resultado
}

funcion id_sumar ( id_contador , id_temp ) -> num {
id_suma = id_contador + id_temp
return id_suma
}

id_contador = 0
id_precio = 99.99
id_descuento = 15.5

id_suma = id_contador + 10 * 2
id_temp = id_variable_no_declarada + 5

id_total = id_precio - id_descuento
id_nombre = id_precio

id_contador = 5
id_suma = id_contador + 10 / 10
id_temp = id_suma * 2 - 2

id_calcular ( id_contador )
id_sumar ( id_contador , id_temp )
id_funcion_inexistente ( )

for id_contador < 10 && id_contador > 0 ; id_contador = id_contador + 1 {
id_total = id_total + id_precio * 2
}

for id_suma >= 5 && id_x <= 20 ; id_suma = id_suma + 1 {
id_temp = id_temp - 1
}

id_mensaje = "Compilacion completa"
`;
