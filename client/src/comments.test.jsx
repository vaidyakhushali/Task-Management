import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Comments from './comments';
import * as api from './api';

jest.mock('./api', () => ({
  getTaskComments: jest.fn(),
  addTaskComment: jest.fn(),
}));

beforeEach(() => {
  api.getTaskComments.mockResolvedValue({
    data: [
      {
        _id: 'comment-1',
        message: 'Initial review noted.',
        user: { fullname: 'Sam' },
      },
    ],
  });

  api.addTaskComment.mockResolvedValue({
    data: {
      _id: 'comment-2',
      message: 'Looks good to me.',
      user: { fullname: 'You' },
    },
  });
});

test('shows old comments and lets the user add a new one', async () => {
  render(<Comments taskId="task-123" />);

  expect(await screen.findByText(/initial review noted\./i)).toBeInTheDocument();

  const input = screen.getByLabelText(/write a comment/i);
  await userEvent.type(input, 'Looks good to me.');
  await userEvent.click(screen.getByRole('button', { name: /add comment/i }));

  expect(await screen.findByText(/looks good to me\./i)).toBeInTheDocument();
});
