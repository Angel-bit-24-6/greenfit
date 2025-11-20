import React, { useState, useCallback } from 'react';
import { AlertDialog, AlertButton } from '../components/ui/AlertDialog';

interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  onDismiss?: () => void;
}

let alertState: AlertState = {
  visible: false,
  title: '',
};

let setAlertState: React.Dispatch<React.SetStateAction<AlertState>> | null = null;

export const AlertManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AlertState>(alertState);
  setAlertState = setState;

  const handleDismiss = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
    if (state.onDismiss) {
      state.onDismiss();
    }
  }, [state.onDismiss]);

  return (
    <>
      {children}
      <AlertDialog
        visible={state.visible}
        title={state.title}
        message={state.message}
        buttons={state.buttons}
        onDismiss={handleDismiss}
      />
    </>
  );
};

export class AlertManager {
  static alert(
    title: string,
    message?: string,
    buttons?: AlertButton[],
    onDismiss?: () => void
  ) {
    if (!setAlertState) {
      console.warn('AlertManagerProvider not mounted');
      return;
    }

    setAlertState({
      visible: true,
      title,
      message,
      buttons: buttons || [{ text: 'OK' }],
      onDismiss,
    });
  }

  static confirm(
    title: string,
    message?: string,
    onConfirm?: () => void,
    onCancel?: () => void
  ) {
    this.alert(
      title,
      message,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: onCancel,
        },
        {
          text: 'Confirmar',
          style: 'default',
          onPress: onConfirm,
        },
      ],
      onCancel
    );
  }

  static confirmDestructive(
    title: string,
    message?: string,
    onConfirm?: () => void,
    onCancel?: () => void
  ) {
    this.alert(
      title,
      message,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: onCancel,
        },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: onConfirm,
        },
      ],
      onCancel
    );
  }
}

