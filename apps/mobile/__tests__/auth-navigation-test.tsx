import { screen, userEvent } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import AppLayout from '../app/(app)/_layout';
import MainTabsLayout from '../app/(app)/(tabs)/_layout';
import IndexRoute from '../app/(app)/(tabs)/index';
import SettingsRoute from '../app/(app)/(tabs)/settings';
import AuthLayout from '../app/(auth)/_layout';
import SignInRoute from '../app/(auth)/sign-in';
import SignUpRoute from '../app/(auth)/sign-up';
import WelcomeRoute from '../app/(auth)/welcome';
import RootLayout from '../app/_layout';

const routes = {
  _layout: RootLayout,
  '(app)/_layout': AppLayout,
  '(app)/(tabs)/_layout': MainTabsLayout,
  '(app)/(tabs)/index': IndexRoute,
  '(app)/(tabs)/settings': SettingsRoute,
  '(auth)/_layout': AuthLayout,
  '(auth)/welcome': WelcomeRoute,
  '(auth)/sign-in': SignInRoute,
  '(auth)/sign-up': SignUpRoute,
};

describe('authentication navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('redirects a signed-out user away from protected content', async () => {
    await renderRouter(routes, { initialUrl: '/settings' });

    expect(await screen.findByText('Mang đủ. Đi nhẹ đầu.')).toBeTruthy();
    expect(screen.queryByText('Cài đặt ứng dụng')).toBeNull();
  });

  test('opens registration and reports all invalid fields inline', async () => {
    const user = userEvent.setup();
    await renderRouter(routes, { initialUrl: '/welcome' });

    await user.press(await screen.findByRole('button', { name: 'Bắt đầu với luckgage' }));
    expect(await screen.findByText('Tạo chỗ cho chuyến đi mới')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Tạo tài khoản' }));

    expect(await screen.findByText('Hãy nhập tên hiển thị.')).toBeTruthy();
    expect(screen.getByText('Hãy nhập email.')).toBeTruthy();
    expect(screen.getByText('Hãy nhập mật khẩu.')).toBeTruthy();
  });
});
