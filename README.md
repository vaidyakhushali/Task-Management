# Task-Management

## API configuration

The client uses `http://localhost:8000/api` during local development and the
hosted API for production builds by default. Set `REACT_APP_API_URL` before
starting or building the client to use a different API URL (including `/api`).
The API server must include the trash endpoints for deleted task/project review
and restore to work.