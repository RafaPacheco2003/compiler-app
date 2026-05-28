// Expresión regular para los identificadores
const ID_REGEX = /^id_[A-Za-z0-9_-]+$/;
const REGEX_STRING = /^"[^"]*"$/;

// Tipos de datos
// tipos = ["num", "chain", "cow"]
const TIPOS = { "num": "int", "chain": "str", "cow": "float" };

// Texto inicial en el editor
const TEXTO_INICIAL =
    
    `num id_base, id_cuenta, id_limite;
cow id_precio, id_descuento, id_factor;
chain id_nombre, id_clave, id_etiqueta;

cow id_calcular(num id_base, cow id_precio) {
    cow id_mul, id_div, id_resultado;
    id_mul = id_base * id_precio;
    id_div = id_precio / id_descuento;
    id_resultado = id_mul + id_div - id_base;
    for (num id_i = 1; id_i < 5 && id_i != 3; id_i = id_i + 1) {
        id_resultado = id_resultado + id_i;
    }
    return id_resultado;
}

cow id_acumular(num id_cuenta, cow id_descuento) {
    cow id_aux;
    id_aux = id_calcular(id_cuenta, id_descuento);
    return id_aux;
}

cow id_res1, id_res2;
id_res1 = id_acumular(10, 5.5);
id_res2 = id_acumular(8, 3.2);`;

// `num id_base id_altura id_cuenta;
// cow id_precio id_descuento id_total;
// chain id_nombre id_codigo id_etiqueta;


// cow id_calcular(num id_base, cow id_precio){
// cow id_temp1, id_temp2, id_resultado;
// id_temp1 = id_base * id_precio - (id_base / id_cuenta);
// id_temp2 = (id_precio + id_descuento) * id_base - id_descuento / id_precio;
// id_resultado = id_temp1 + id_temp2;
// return id_resultado;
// }

// cow id_acumular(num id_cuenta, cow id_descuento){
// cow id_suma, id_parcial, id_resumen;
// id_suma = id_cuenta * id_descuento + (id_precio - id_descuento);

// for (num id_i = 1; id_i < 5 && id_i != 3; id_i++)
// {
// id_parcial = id_suma + id_i * 4;
// id_precio = (id_precio + id_descuento) / id_base;
// }
// id_resumen = id_suma - id_parcial + id_precio * id_cuenta;
// return id_resumen;
// }
// cow id_res1, id_res2;
// id_res1 = id_calcular(id_base, id_precio);
// id_res2 = id_acumular(id_cuenta, id_descuento);`;

// Ejemplos para probar optimización (pegar en editor → Run → pestaña Optimización)
const EJEMPLOS_OPTIMIZACION = {
    basico: {
        titulo: "1. Básico (resta + subexpresión)",
        codigo: `a = z + 22
b = w - z + 22`
    },
    encadenado: {
        titulo: "2. Encadenado aditivo",
        codigo: `x = a + b + c
y = d - a + b + c
z = e * (a + b + c)
w = f + a + b + c`
    },
    productos: {
        titulo: "3. Productos conmutativos",
        codigo: `p = m * n * k
q = r * m * n * k
s = t * (m * n * k)
u = v * w * m * n * k`
    },
    mixto: {
        titulo: "4. Mixto (sí y no optimiza)",
        codigo: `u = i + j
v = i * j + k
w = i + j * k
x = p - i + j
y = q * i + j + k`
    },
    identificadores: {
        titulo: "5. Con id_ (estilo compilador)",
        codigo: `id_t1 = id_base + id_cuenta
id_t2 = id_precio - id_base + id_cuenta
id_t3 = id_total * (id_base + id_cuenta)
id_t4 = id_descuento - id_precio + id_base + id_cuenta`
    },
    parentesis: {
        titulo: "6. Paréntesis y productos",
        codigo: `a = z * 22
b = w * z * 22
c = w * (z * 22)
d = x + y
e = z * (x + y)
f = p - x + y`
    },
    laboratorio: {
        titulo: "7. Laboratorio completo",
        codigo: `T1 = IDE01 + CE01 + FA01
T2 = IDE02 - IDE01 + CE01 + FA01
T3 = IDE03 * (IDE01 + CE01 + FA01)
T4 = IDE04 * IDE05 * IDE01 * CE01
T5 = IDE06 - IDE01 + CE01
T6 = IDE07 * IDE08 + FA01
T7 = IDE09 * (IDE08 + FA01)
T8 = IDE10 - IDE08 + FA01`
    },
    expresiones: {
        titulo: "8. Expresiones anidadas",
        codigo: `r1 = a + b
r2 = c - a + b
r3 = d * e * f
r4 = g * d * e * f
r5 = h * (a + b)
r6 = i - a + b
r7 = j * k + l
r8 = m - (a + b)
r9 = n * (d * e * f)`
    }
};