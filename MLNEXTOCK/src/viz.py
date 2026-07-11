"""
Estilo comun para que todos los graficos sean legibles y consistentes.
"""
from __future__ import annotations

import matplotlib

matplotlib.use("Agg")  # backend sin ventana (guarda a archivo)
import matplotlib.pyplot as plt


PALETA = {
    "historico": "#2563eb",   # azul
    "pronostico": "#f59e0b",  # ambar
    "stock": "#0ea5e9",       # celeste
    "ok": "#16a34a",          # verde
    "alerta": "#dc2626",      # rojo
    "neutro": "#64748b",      # gris
    "morado": "#7c3aed",
}


def aplicar_estilo():
    plt.rcParams.update({
        "figure.figsize": (13, 6.5),
        "figure.dpi": 90,
        "savefig.dpi": 90,
        "savefig.bbox": "tight",
        "font.size": 12,
        "axes.titlesize": 16,
        "axes.titleweight": "bold",
        "axes.labelsize": 12.5,
        "axes.grid": True,
        "grid.alpha": 0.30,
        "grid.linestyle": "--",
        "axes.spines.top": False,
        "axes.spines.right": False,
        "legend.fontsize": 11,
        "legend.frameon": True,
    })


def guardar(fig, ruta):
    fig.tight_layout()
    fig.savefig(ruta)
    plt.close(fig)
    return ruta
