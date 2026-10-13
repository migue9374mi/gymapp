/**
 * Calculo de cuando toca avisar.
 *
 * Esto va aparte, sin dependencias, a proposito: son fechas y es la parte
 * que mas facil sale mal. Si el aviso salta un dia equivocado no hay ninguna
 * pista visible de que se calculo mal, asi que mejor poder probarlo.
 */

export const DIAS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo']

/**
 * Proxima vez que cae un dia de la semana a una hora concreta.
 *
 * Ojo con el cambio de numeracion: para nosotros el lunes es 0, pero el
 * getDay() de JavaScript devuelve 0 para el domingo. De ahi el (+6) % 7.
 *
 * Si ese dia a esa hora ya ha pasado, devuelve el de la semana siguiente.
 */
export function proximaOcurrencia(diaSemana, hora, minuto, ahora = new Date()) {
  const momento = new Date(ahora)
  momento.setHours(hora, minuto, 0, 0)

  const hoyDelPlan = (ahora.getDay() + 6) % 7 // 0 = lunes
  const diasDeDiferencia = (diaSemana - hoyDelPlan + 7) % 7

  momento.setDate(ahora.getDate() + diasDeDiferencia)

  if (momento.getTime() <= ahora.getTime()) {
    momento.setDate(momento.getDate() + 7)
  }

  return momento
}

/** Los dias del plan que tienen al menos una rutina. */
export function diasConRutina(plan) {
  return (plan || []).filter((d) => d.rutinas && d.rutinas.length > 0)
}

/** "18:00" -> [18, 0] */
export function partesHora(hora) {
  const [h, m] = String(hora || '18:00').split(':').map(Number)
  return [Number.isFinite(h) ? h : 18, Number.isFinite(m) ? m : 0]
}