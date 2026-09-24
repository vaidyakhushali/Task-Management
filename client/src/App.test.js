import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

test('switches between login and register screens', async () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /task manager/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /register here/i }));
  expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /login here/i }));
  expect(screen.getByRole('heading', { name: /task manager/i })).toBeInTheDocument();
});
