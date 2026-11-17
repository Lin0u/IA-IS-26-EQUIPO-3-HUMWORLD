class UniqueConstraintViolation(Exception):
    """Indica que una operación de persistencia viola una unicidad."""


class ChannelNameConflictError(Exception):
    """Indica que el nombre de un CanalNoticias ya está registrado."""


class CanalNoticiasNotFoundError(Exception):
    """Indica que el CanalNoticias solicitado no existe."""


class FuenteRSSNotFoundError(Exception):
    """Indica que la FuenteRSS solicitada no existe."""


class FuenteRSSInactiveError(Exception):
    """Indica que la FuenteRSS existe, pero está inactiva."""


class FeedInvalidoError(Exception):
    """El contenido descargado no es un feed con ítems (HU-RSS-006, R2).

    Error de CONTENIDO, no transitorio: no debe reintentarse, a diferencia de
    los errores HTTP. feedparser puede marcar bozo=1 ante detalles de formato
    (entidades HTML, codificación declarada, Content-Type) sin que el feed deje
    de traer ítems válidos; en ese caso NO se lanza esta excepción.
    """


class TerminoDiccionarioNotFoundError(Exception):
    """Indica que el término solicitado no existe."""


class TerminoDiccionarioConflictError(Exception):
    """Indica que la combinación literal palabra+idioma ya existe."""

class RangoFechasInvalidoError(Exception):
    """El rango de fechas de una consulta no es válido (HU-SENT-004)."""


class NoticiaNotFoundError(Exception):
    """La noticia solicitada no existe (HU-DASH-002-v2)."""


class FechaPurgadoInvalidaError(Exception):
    """La fecha límite de un purgado manual es posterior a hoy (HU-ADMIN-003)."""


class PalabraExclusionNotFoundError(Exception):
    """La palabra de exclusión no existe (HU-SENT-009)."""


class PalabraExclusionConflictError(Exception):
    """Ya existe esa palabra en la lista de exclusión (HU-SENT-009)."""
