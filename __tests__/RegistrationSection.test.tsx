import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegistrationSection } from '@/components/RegistrationSection';

const mockUseAuth = jest.fn();
const mockUseRegistrationStore = jest.fn();
const mockSignInWithGoogle = jest.fn();
const mockSignOut = jest.fn();
const mockSetUser = jest.fn();
const mockSetStatus = jest.fn();
const mockTransition = jest.fn();
const mockHydrate = jest.fn();
const mockGetIdToken = jest.fn();

jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/lib/registrationStore', () => ({
  useRegistrationStore: () => mockUseRegistrationStore(),
}));

jest.mock('@/lib/secureStorage', () => ({
  retrieveFormData: jest.fn(),
  hasValidStoredData: jest.fn(() => false),
  clearStoredData: jest.fn(),
}));

jest.mock('@/lib/Firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: () => mockGetIdToken(),
    },
  },
}));

jest.mock('@/components/CustomApplicationForm', () => ({
  CustomApplicationForm: () => <div data-testid="custom-form" />,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

beforeEach(() => {
  mockUseAuth.mockReturnValue({
    user: null,
    signInWithGoogle: mockSignInWithGoogle,
    signOut: mockSignOut,
  });

  mockUseRegistrationStore.mockReturnValue({
    status: 'guest',
    userZustand: null,
    setUser: mockSetUser,
    setStatus: mockSetStatus,
    transition: mockTransition,
    hydrateFromServer: mockHydrate,
  });

  mockSignInWithGoogle.mockResolvedValue(undefined);
  mockGetIdToken.mockResolvedValue('test-token');

  global.fetch = jest.fn();
  global.alert = jest.fn();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('RegistrationSection', () => {
  test('renders guest view and triggers status check sign-in', async () => {
    render(<RegistrationSection />);

    expect(screen.getByText('Registration')).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /check status/i });
    await userEvent.click(btn);

    expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
  });

  test('renders pending view with applicant info', () => {
    mockUseRegistrationStore.mockReturnValueOnce({
      status: 'pending',
      userZustand: {
        submissionType: 'competitor',
        displayName: 'Jane Doe',
        email: 'jane@example.com',
      },
      setUser: mockSetUser,
      setStatus: mockSetStatus,
      transition: mockTransition,
      hydrateFromServer: mockHydrate,
    });

    render(<RegistrationSection />);

    expect(screen.getByText(/Thanks for applying!/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending Review/i)).toBeInTheDocument();
  });

  test('payment proof submission validates required fields', async () => {
    mockUseRegistrationStore.mockReturnValueOnce({
      status: 'approved_awaiting_payment_submission',
      userZustand: { major: 'Engineering' },
      setUser: mockSetUser,
      setStatus: mockSetStatus,
      transition: mockTransition,
      hydrateFromServer: mockHydrate,
    });

    render(<RegistrationSection />);

    const submitBtn = screen.getByRole('button', { name: /submit payment proof/i });
    await userEvent.click(submitBtn);

    expect(screen.getByText(/Please enter your transaction ID/i)).toBeInTheDocument();

    const txInput = screen.getByLabelText(/Transaction ID/i);
    await userEvent.type(txInput, 'TX123');

    await userEvent.click(submitBtn);
    expect(screen.getByText(/Please upload your payment proof file/i)).toBeInTheDocument();
  });

  test('payment success button updates status and transitions', async () => {
    mockUseRegistrationStore.mockReturnValueOnce({
      status: 'payment_confirmed',
      userZustand: { major: 'Engineering' },
      setUser: mockSetUser,
      setStatus: mockSetStatus,
      transition: mockTransition,
      hydrateFromServer: mockHydrate,
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    render(<RegistrationSection />);

    const btn = screen.getByRole('button', { name: /go to final phase/i });
    await userEvent.click(btn);

    expect(global.fetch).toHaveBeenCalledWith('/api/user/update-status', expect.objectContaining({
      method: 'POST',
    }));

    expect(mockTransition).toHaveBeenCalledWith('DISMISS_PAYMENT_SUCCESS');
  });

  test('domain selection confirm flow calls update-domain then final phase', async () => {
    mockUseRegistrationStore.mockReturnValueOnce({
      status: 'domain_selection',
      userZustand: { major: 'Healthcare' },
      setUser: mockSetUser,
      setStatus: mockSetStatus,
      transition: mockTransition,
      hydrateFromServer: mockHydrate,
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // update-domain
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // update-status

    render(<RegistrationSection />);

    await userEvent.click(screen.getByText(/Medical Tools & Hardware/i));

    const confirmBtn = screen.getByRole('button', { name: /confirm domain/i });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/user/update-domain', expect.any(Object));
    });

    const finalBtn = await screen.findByRole('button', { name: /go to final phase/i });
    await userEvent.click(finalBtn);

    expect(global.fetch).toHaveBeenCalledWith('/api/user/update-status', expect.any(Object));
    expect(mockTransition).toHaveBeenCalledWith('DOMAIN_CONFIRMED');
  });
});
