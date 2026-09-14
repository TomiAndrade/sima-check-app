// Los cuatro estados visuales en que puede estar una respuesta ya tocada, desde
// que se toca hasta que se avanza. Lo comparten Evaluation (que los decide) y
// QuestionCard (que los pinta).
//
// Vive en su propio archivo y no dentro de QuestionCard.jsx por la regla
// react-refresh/only-export-components: un archivo que exporta un componente no
// puede exportar además constantes sin romper el fast refresh. Mismo motivo por
// el que en el backoffice parametrosExamen.js está aparte de su .jsx.
export const FEEDBACK = {
  // Se tocó y el backend todavía no contestó. Dura lo que tarde el request, así
  // que existe aunque casi no se vea.
  pendiente: 'pendiente',
  correcta: 'correcta',
  incorrecta: 'incorrecta',
  // No se pudo corregir (sin señal). La respuesta igual quedó tomada y viaja al
  // cerrar la sesión — lo único que se pierde es el color.
  sinVerificar: 'sin-verificar',
}
