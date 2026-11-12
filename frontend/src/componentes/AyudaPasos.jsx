// HumWorld - contenido de una ayuda con varios puntos (título corto y una frase).
// Origen: HU-DASH-004-v2.
export default function AyudaPasos({ pasos }) {
  return (
    <span className="ayuda-lista">
      {pasos.map((paso) => (
        <span key={paso.titulo} className="ayuda-punto">
          <strong>{paso.titulo}.</strong> {paso.texto}
        </span>
      ))}
    </span>
  )
}
