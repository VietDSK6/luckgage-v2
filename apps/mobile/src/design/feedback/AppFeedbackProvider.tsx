import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';

import { AppBottomSheet } from '@/design/components/AppBottomSheet';
import { AppButton } from '@/design/components/AppButton';
import type { AppIconName } from '@/design/components/AppIcon';
import { AppText } from '@/design/components/AppText';
import { useI18n } from '@/i18n/I18nProvider';

import { AppDialog, type AppDialogTone } from './AppDialog';
import { AppToast, type AppToastModel, type AppToastTone } from './AppToast';

export type AppFeedbackAction = {
  icon?: AppIconName;
  id: string;
  label: string;
  tone?: 'default' | 'primary' | 'danger';
};

export type AppConfirmOptions = {
  body?: string;
  cancelLabel?: string;
  confirmLabel: string;
  title: string;
  tone?: AppDialogTone;
};

export type AppActionSheetOptions = {
  actions: AppFeedbackAction[];
  cancelLabel?: string;
  message?: string;
  title: string;
};

export type AppToastOptions = {
  actionLabel?: string;
  duration?: number;
  message: string;
  onAction?: () => void;
  tone?: AppToastTone;
};

type AppFeedbackContextValue = {
  choose: (options: AppActionSheetOptions) => Promise<string | null>;
  confirm: (options: AppConfirmOptions) => Promise<boolean>;
  hideToast: () => void;
  showToast: (options: AppToastOptions) => void;
};

const AppFeedbackContext = createContext<AppFeedbackContextValue | undefined>(undefined);

export function AppFeedbackProvider({ children }: PropsWithChildren) {
  const { t } = useI18n();
  const [dialog, setDialog] = useState<AppConfirmOptions | null>(null);
  const [actionSheet, setActionSheet] = useState<AppActionSheetOptions | null>(null);
  const [toast, setToast] = useState<AppToastModel | null>(null);
  const dialogResolver = useRef<((value: boolean) => void) | null>(null);
  const actionResolver = useRef<((value: string | null) => void) | null>(null);
  const toastId = useRef(0);

  const settleDialog = useCallback((value: boolean) => {
    setDialog(null);
    const resolve = dialogResolver.current;
    dialogResolver.current = null;
    resolve?.(value);
  }, []);

  const settleActionSheet = useCallback((value: string | null) => {
    setActionSheet(null);
    const resolve = actionResolver.current;
    actionResolver.current = null;
    resolve?.(value);
  }, []);

  const confirm = useCallback(
    (options: AppConfirmOptions) => {
      if (actionResolver.current) settleActionSheet(null);
      if (dialogResolver.current) settleDialog(false);
      setDialog(options);
      return new Promise<boolean>((resolve) => {
        dialogResolver.current = resolve;
      });
    },
    [settleActionSheet, settleDialog],
  );

  const choose = useCallback(
    (options: AppActionSheetOptions) => {
      if (dialogResolver.current) settleDialog(false);
      if (actionResolver.current) settleActionSheet(null);
      setActionSheet(options);
      return new Promise<string | null>((resolve) => {
        actionResolver.current = resolve;
      });
    },
    [settleActionSheet, settleDialog],
  );

  const showToast = useCallback((options: AppToastOptions) => {
    toastId.current += 1;
    setToast({
      duration: options.duration ?? 3200,
      id: toastId.current,
      message: options.message,
      onAction: options.onAction,
      actionLabel: options.actionLabel,
      tone: options.tone ?? 'info',
    });
  }, []);

  const dismissToast = useCallback((id?: number) => {
    setToast((current) => (id === undefined || current?.id === id ? null : current));
  }, []);
  const hideToast = useCallback(() => dismissToast(), [dismissToast]);

  useEffect(
    () => () => {
      dialogResolver.current?.(false);
      actionResolver.current?.(null);
      dialogResolver.current = null;
      actionResolver.current = null;
    },
    [],
  );

  const value = useMemo(
    () => ({ choose, confirm, hideToast, showToast }),
    [choose, confirm, hideToast, showToast],
  );

  return (
    <AppFeedbackContext.Provider value={value}>
      {children}
      <AppDialog
        body={dialog?.body}
        cancelLabel={dialog?.cancelLabel ?? t('commonCancel')}
        confirmLabel={dialog?.confirmLabel ?? ''}
        onCancel={() => settleDialog(false)}
        onConfirm={() => settleDialog(true)}
        title={dialog?.title ?? ''}
        tone={dialog?.tone ?? 'primary'}
        visible={Boolean(dialog)}
      />
      <AppBottomSheet
        closeLabel={actionSheet?.cancelLabel ?? t('commonClose')}
        onClose={() => settleActionSheet(null)}
        title={actionSheet?.title ?? ''}
        visible={Boolean(actionSheet)}>
        {actionSheet ? (
          <View style={styles.sheetContent}>
            {actionSheet.message ? (
              <AppText tone="muted" variant="bodySmall">
                {actionSheet.message}
              </AppText>
            ) : null}
            <View style={styles.sheetActions}>
              {actionSheet.actions.map((action) => (
                <AppButton
                  icon={action.icon}
                  key={action.id}
                  label={action.label}
                  onPress={() => settleActionSheet(action.id)}
                  variant={
                    action.tone === 'danger'
                      ? 'danger'
                      : action.tone === 'primary'
                        ? 'secondary'
                        : 'ghost'
                  }
                />
              ))}
            </View>
            <AppButton
              label={actionSheet.cancelLabel ?? t('commonCancel')}
              onPress={() => settleActionSheet(null)}
              variant="ghost"
            />
          </View>
        ) : null}
      </AppBottomSheet>
      {toast ? (
        <AppToast
          closeLabel={t('commonClose')}
          onDismiss={() => dismissToast(toast.id)}
          toast={toast}
        />
      ) : null}
    </AppFeedbackContext.Provider>
  );
}

export function useAppFeedback(): AppFeedbackContextValue {
  const value = useContext(AppFeedbackContext);
  if (!value) throw new Error('useAppFeedback must be used inside AppFeedbackProvider');
  return value;
}

const styles = StyleSheet.create({
  sheetContent: { gap: 16, paddingBottom: 4 },
  sheetActions: { gap: 8 },
});
