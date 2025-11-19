import Toast from 'react-native-toast-message';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastConfig {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export class ToastManager {
  static show({ type, title, message, duration = 4000 }: ToastConfig) {
    Toast.show({
      type,
      text1: title,
      text2: message,
      visibilityTime: duration,
      autoHide: true,
      topOffset: 60,
      bottomOffset: 40,
    });
  }

  static success(title: string, message?: string, duration?: number) {
    this.show({ type: 'success', title, message, duration });
  }

  static error(title: string, message?: string, duration?: number) {
    this.show({ type: 'error', title, message, duration });
  }

  static info(title: string, message?: string, duration?: number) {
    this.show({ type: 'info', title, message, duration });
  }

  static warning(title: string, message?: string, duration?: number) {
    this.show({ type: 'warning', title, message, duration });
  }

  // Custom templates for common app scenarios
  static addedToCart(itemName: string, price: number) {
    this.success(
      '🛒 ¡Agregado al carrito!',
      `${itemName} - $${price.toFixed(2)}`,
      3500
    );
  }

  static customPlateCreated(plateName: string, price: number) {
    this.success(
      '🎨 ¡Platillo creado!',
      `${plateName} se agregó por $${price.toFixed(2)}`,
      4000
    );
  }

  static orderConfirmed(total: number, estimatedTime: string) {
    this.success(
      '🎉 ¡Pedido confirmado!',
      `Total: $${total.toFixed(2)} • Tiempo estimado: ${estimatedTime}`,
      5000
    );
  }

  static itemRemoved(itemName: string) {
    this.info(
      '🗑️ Item eliminado',
      `${itemName} removido del carrito`,
      2500
    );
  }

  static cartCleared() {
    this.info(
      '🧹 Carrito vaciado',
      'Todos los items han sido removidos',
      2500
    );
  }

  static limitReached(limit: number, itemType: string = 'ingredientes') {
    this.warning(
      '⚠️ Límite alcanzado',
      `Solo puedes seleccionar hasta ${limit} ${itemType}`,
      3000
    );
  }

  static noStock(itemName: string) {
    this.error(
      '❌ Sin stock',
      `${itemName} no está disponible`,
      3000
    );
  }

  static loginSuccess(userName: string) {
    this.success(
      '👋 ¡Bienvenido!',
      `Hola ${userName}, disfruta tu experiencia`,
      3000
    );
  }

  static networkError() {
    this.error(
      '🌐 Error de conexión',
      'Verifica tu conexión a internet',
      4000
    );
  }

  static validationError(field: string) {
    this.warning(
      '⚠️ Campo requerido',
      `Por favor completa: ${field}`,
      3000
    );
  }

  static hide() {
    Toast.hide();
  }
}