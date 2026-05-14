/**
 * Nombre del fichero: utils.ts
 * Descripción: Fichero fuente de la aplicación SteaMates.
 * Autor: Adrián Artigas Subiras, Adrián Becerril Granada, Pablo Nicolás Fabra Roque, Enrique Baldovin Cotela, Adrián Nasarre
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Función: cn
 * Descripción: Función auxiliar de propósito general especializada en cn. Contiene lógica
 * específica para transformar datos, realizar cálculos o conectar diferentes
 * partes del sistema según los requisitos del módulo.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
