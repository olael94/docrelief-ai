# Testing Documentation

This document provides comprehensive guidance on testing the DocRelief AI frontend application.

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Running Tests](#running-tests)
4. [Test Structure](#test-structure)
5. [Writing Tests](#writing-tests)
6. [Best Practices](#best-practices)
7. [Mocking](#mocking)
8. [Coverage](#coverage)
9. [CI/CD Integration](#cicd-integration)

## Overview

Our testing setup follows industry standards using:

- **Vitest** - Fast, Vite-native test runner
- **React Testing Library** - Component testing focused on user behavior
- **jsdom** - DOM environment simulation
- **Testing Library User Event** - Realistic user interaction simulation

**Current Test Coverage:** 165 tests across 7 test suites

## Tech Stack

```json
{
  "vitest": "^4.0.18",
  "@testing-library/react": "^16.3.2",
  "@testing-library/jest-dom": "^6.9.1",
  "@testing-library/user-event": "^14.6.1",
  "jsdom": "^28.0.0"
}
```

## Running Tests

### Available Commands

```bash
# Run all tests once
pnpm test

# Run tests in watch mode (for development)
pnpm test:watch

# Run tests with UI interface (great for debugging)
pnpm test:ui

# Run tests with coverage report
pnpm test:coverage
```

### Watch Mode

In watch mode, tests automatically re-run when files change. Press `h` in the terminal to see available commands.

### UI Mode

The UI mode provides a visual interface for:

- Viewing test results
- Debugging failing tests
- Inspecting component renders
- Viewing console logs

## Test Structure

### File Organization

```
frontend/src/components/
├── __tests__/
│   ├── EditorPanel.test.jsx
│   ├── PreviewPanel.test.jsx
│   ├── TabBar.test.jsx
│   ├── Navbar.test.jsx
│   ├── Footer.test.jsx
│   ├── HeroButton.test.jsx
│   └── ProgressStep.test.jsx
└── [component files]
```

### Test File Naming

- Component tests: `ComponentName.test.jsx`
- Utility tests: `utilityName.test.js`
- Hook tests: `useHookName.test.js`

### Test Suite Structure

```javascript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MyComponent from "../MyComponent";

describe("MyComponent", () => {
  // Setup that runs before each test
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render basic elements", () => {
      // Test implementation
    });
  });

  describe("User Interactions", () => {
    it("should handle click events", async () => {
      // Test implementation
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty props", () => {
      // Test implementation
    });
  });
});
```

## Writing Tests

### Basic Component Test

```javascript
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import MyButton from "../MyButton";

it("should render button text", () => {
  render(<MyButton text="Click me" />);

  expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
});
```

### Testing User Interactions

```javascript
import userEvent from "@testing-library/user-event";

it("should call onClick when clicked", async () => {
  const user = userEvent.setup();
  const onClick = vi.fn();

  render(<MyButton onClick={onClick} />);

  await user.click(screen.getByRole("button"));

  expect(onClick).toHaveBeenCalledTimes(1);
});
```

### Testing Async Behavior

```javascript
import { waitFor } from "@testing-library/react";

it("should load data", async () => {
  render(<DataComponent />);

  // Wait for async operation
  await waitFor(() => {
    expect(screen.getByText("Data loaded")).toBeInTheDocument();
  });
});
```

### Testing Forms

```javascript
it("should submit form data", async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();

  render(<MyForm onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText("Name"), "John Doe");
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(onSubmit).toHaveBeenCalledWith({ name: "John Doe" });
});
```

### Testing with React Router

```javascript
import { BrowserRouter } from "react-router-dom";

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

it("should navigate on click", () => {
  renderWithRouter(<NavLink to="/about">About</NavLink>);

  const link = screen.getByRole("link", { name: "About" });
  expect(link).toHaveAttribute("href", "/about");
});
```

## Best Practices

### 1. Test User Behavior, Not Implementation

✅ **Good:**

```javascript
it("should display error when email is invalid", async () => {
  const user = userEvent.setup();
  render(<LoginForm />);

  await user.type(screen.getByLabelText("Email"), "invalid-email");
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(screen.getByText("Please enter a valid email")).toBeInTheDocument();
});
```

❌ **Bad:**

```javascript
it("should set emailError state to true", () => {
  const wrapper = shallow(<LoginForm />);
  wrapper.instance().validateEmail("invalid-email");
  expect(wrapper.state("emailError")).toBe(true);
});
```

### 2. Use Accessible Queries

**Query Priority:**

1. `getByRole` - Accessibility-focused (preferred)
2. `getByLabelText` - For form fields
3. `getByPlaceholderText` - When label isn't available
4. `getByText` - For non-interactive content
5. `getByTestId` - Last resort

✅ **Good:**

```javascript
screen.getByRole("button", { name: "Submit" });
screen.getByLabelText("Email");
```

❌ **Avoid:**

```javascript
screen.getByClassName("submit-btn");
wrapper.find(".email-input");
```

### 3. Don't Test Third-Party Libraries

```javascript
// ❌ Don't test Monaco Editor internals
it("should have syntax highlighting", () => {
  // Monaco Editor is already tested by Microsoft
});

// ✅ Test your integration with the library
it("should call onChange when content changes", () => {
  const onChange = vi.fn();
  render(<EditorPanel onChange={onChange} />);
  // Test your callback
});
```

### 4. Keep Tests Independent

```javascript
// ❌ Bad: Tests depend on execution order
let user;
beforeAll(() => {
  user = { name: "John" };
});
it("test 1", () => {
  user.age = 30;
});
it("test 2", () => {
  expect(user.age).toBe(30);
}); // Fragile!

// ✅ Good: Each test is self-contained
it("test 1", () => {
  const user = { name: "John", age: 30 };
  expect(user.age).toBe(30);
});
```

### 5. Use Descriptive Test Names

```javascript
// ❌ Bad
it("works", () => {
  /* ... */
});
it("test button", () => {
  /* ... */
});

// ✅ Good
it("should display error message when form is invalid", () => {
  /* ... */
});
it("should disable submit button while loading", () => {
  /* ... */
});
```

### 6. Group Related Tests

```javascript
describe("LoginForm", () => {
  describe("Validation", () => {
    it("should require email");
    it("should require password");
    it("should validate email format");
  });

  describe("Submission", () => {
    it("should call onSubmit with credentials");
    it("should show loading state");
  });
});
```

## Mocking

### Mocking External Libraries

```javascript
// Mock an entire module
vi.mock("@monaco-editor/react", () => ({
  default: ({ value, onChange }) => (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));
```

### Mocking Functions

```javascript
const mockFn = vi.fn();
mockFn.mockReturnValue("mocked value");
mockFn.mockResolvedValue("async value");
mockFn.mockImplementation((x) => x * 2);
```

### Mocking Dates

```javascript
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2024-01-01"));
});

afterEach(() => {
  vi.useRealTimers();
});
```

### Mocking Images/Assets

```javascript
vi.mock("../../assets/logo.png", () => ({
  default: "/mocked-logo.png",
}));
```

## Coverage

### Viewing Coverage Reports

```bash
pnpm test:coverage
```

This generates:

- **Terminal output** - Quick summary
- **HTML report** - Detailed visual report in `coverage/index.html`
- **JSON report** - For CI/CD integration

### Coverage Goals

| Metric     | Goal | Current |
| ---------- | ---- | ------- |
| Statements | 80%+ | 📊      |
| Branches   | 75%+ | 📊      |
| Functions  | 80%+ | 📊      |
| Lines      | 80%+ | 📊      |

### What to Test

✅ **Always test:**

- User interactions (clicks, typing, navigation)
- Form validation
- Error states
- Loading states
- Conditional rendering
- Props handling

⚠️ **Consider testing:**

- Complex calculations
- State management logic
- Custom hooks
- Utility functions

❌ **Don't test:**

- Third-party library internals
- Browser APIs
- Trivial code (getters/setters)
- Static content

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "pnpm"

      - run: pnpm install
      - run: pnpm test
      - run: pnpm test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

### Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
pnpm test
```

## Common Patterns

### Testing Loading States

```javascript
it("should show loading spinner", () => {
  render(<MyComponent isLoading={true} />);
  expect(screen.getByText("Loading...")).toBeInTheDocument();
});

it("should hide loading spinner when loaded", () => {
  const { rerender } = render(<MyComponent isLoading={true} />);
  rerender(<MyComponent isLoading={false} />);
  expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
});
```

### Testing Error States

```javascript
it("should display error message", () => {
  render(<MyComponent error="Something went wrong" />);
  expect(screen.getByText("Something went wrong")).toBeInTheDocument();
});
```

### Testing Conditional Rendering

```javascript
it("should show admin panel for admin users", () => {
  render(<Dashboard user={{ role: "admin" }} />);
  expect(screen.getByText("Admin Panel")).toBeInTheDocument();
});

it("should hide admin panel for regular users", () => {
  render(<Dashboard user={{ role: "user" }} />);
  expect(screen.queryByText("Admin Panel")).not.toBeInTheDocument();
});
```

## Debugging Tests

### Using screen.debug()

```javascript
it("should render correctly", () => {
  render(<MyComponent />);
  screen.debug(); // Prints the DOM tree
});
```

### Using logRoles()

```javascript
import { logRoles } from "@testing-library/react";

it("should have accessible roles", () => {
  const { container } = render(<MyComponent />);
  logRoles(container); // Shows all available roles
});
```

### Accessing the Container

```javascript
it("should have correct structure", () => {
  const { container } = render(<MyComponent />);
  const element = container.querySelector(".custom-class");
  expect(element).toBeInTheDocument();
});
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [Common Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Testing Playground](https://testing-playground.com/)

## Getting Help

If you encounter issues:

1. Check test output for specific error messages
2. Use `screen.debug()` to inspect the DOM
3. Review existing test examples in this codebase
4. Consult the React Testing Library documentation
5. Ask the team in our development Slack channel

## Contributing

When adding new components:

1. Create a corresponding test file
2. Aim for 80%+ coverage
3. Test user-facing behavior
4. Include edge cases
5. Run `pnpm test` before committing
6. Update this documentation if needed

---

**Last Updated:** 2024
**Maintained by:** DocRelief AI Team
