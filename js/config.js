// Expresión regular para los identificadores
const ID_REGEX = /^id_[A-Za-z0-9_-]+$/;
const REGEX_STRING = /^"[^"]*"$/;

// Tipos de datos
// tipos = ["num", "chain", "cow"]
const TIPOS = { "num": "int", "chain": "str", "cow": "float" };

// Texto inicial en el editor
const TEXTO_INICIAL =
    // `num id_contador , id_suma , id_temp
    // cow id_precio , id_descuento , id_total
    // chain id_nombre , id_codigo , id_mensaje
    // num id_resultado , id_contador

    // funcion id_calcular ( id_contador ) -> num {
    // id_resultado = id_contador * 2
    // return id_resultado
    // }

    // funcion id_sumar ( id_contador , id_temp ) -> num {
    // id_suma = id_contador + id_temp
    // return id_suma
    // }

    // id_contador = 0
    // id_precio = 99.99
    // id_descuento = 15.5

    // id_suma = id_contador + 10 * 2
    // id_temp = id_variable_no_declarada + 5

    // id_total = id_precio - id_descuento
    // id_nombre = id_precio

    // id_contador = 5
    // id_suma = id_contador + 10 / 10
    // id_temp = id_suma * 2 - 2

    // id_calcular ( id_contador )
    // id_sumar ( id_contador , id_temp )
    // id_funcion_inexistente ( )

    // for id_contador < 10 && id_contador > 0 ; id_contador = id_contador + 1 {
    // id_total = id_total + id_precio * 2
    // }

    // for id_suma >= 5 && id_x <= 20 ; id_suma = id_suma + 1 {
    // id_temp = id_temp - 1
    // }

    // id_mensaje = "Compilacion completa"
    // `;
    //     `num id_num1 id_num2 id_num3;
    // chain id_chain1 id_chain2 id_chain3;
    // cow id_real1 id_real2 id_real3;
    // cow id_operacion(){
    // cow id_resultado1, id_resultado2, id_resultadoFinal;
    // id_resultado1 = id_num1 + id_num2 * id_num3 - (id_num1 / id_num3);
    // id_resultado2 = (id_real1 + id_real2)+ id_real3 - id_real2 / id_real1;
    // id_resultadoFinal = id_resultado1 + id_resultado2;
    // return id_resultadoFinal; 
    // }
    // for (num id_num4 = 1; id_num4< 10 && id_num4 != 5; id_num4 ++)
    // {
    // id_num1 = id_num1 + id_num4 * 2;
    // id_real1 = (id_real1 + id_real2)/ id_real3;
    // }
    // cow id_real4;
    // id_real4 = id_operacion()`;

    `num id_base id_altura id_cuenta;
cow id_precio id_descuento id_total;
chain id_nombre id_codigo id_etiqueta;


cow id_calcular(num id_base, cow id_precio){
cow id_temp1, id_temp2, id_resultado;
id_temp1 = id_base * id_precio - (id_base / id_cuenta);
id_temp2 = (id_precio + id_descuento) * id_base - id_descuento / id_precio;
id_resultado = id_temp1 + id_temp2;
return id_resultado;
}

cow id_acumular(num id_cuenta, cow id_descuento){
cow id_suma, id_parcial, id_resumen;
id_suma = id_cuenta * id_descuento + (id_precio - id_descuento);

for (num id_i = 1; id_i < 5 && id_i != 3; id_i++)
{
id_parcial = id_suma + id_i * 4;
id_precio = (id_precio + id_descuento) / id_base;
}
id_resumen = id_suma - id_parcial + id_precio * id_cuenta;
return id_resumen;
}
cow id_res1, id_res2;
id_res1 = id_calcular(id_base, id_precio);
id_res2 = id_acumular(id_cuenta, id_descuento);`;