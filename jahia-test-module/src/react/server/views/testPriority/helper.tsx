export function renderPriorityView(priority: number) {
  return (
    <div data-testid="testPriorityView">
      Priority view :<span data-testid="priorityValue">{priority}</span>
    </div>
  );
}

export function renderPriorityTemplate(priority: number) {
  return (
    <html lang="en">
      <body>
        <div data-testid="testPriorityTemplate">
          Priority template :<span data-testid="priorityValue">{priority}</span>
        </div>
      </body>
    </html>
  );
}
