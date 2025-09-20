import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';

describe('Card Components', () => {
  it('renders Card with all sub-components', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card content goes here</p>
        </CardContent>
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Card content goes here')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('applies className correctly to Card', () => {
    render(<Card className="custom-class" data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card.className).toContain('custom-class');
  });

  it('renders CardTitle with correct element', () => {
    render(<CardTitle>Heading Title</CardTitle>);
    const title = screen.getByText('Heading Title');
    expect(title.tagName.toLowerCase()).toBe('div');
    expect(title.className).toContain('font-semibold');
  });

  it('renders CardDescription with correct styling', () => {
    render(<CardDescription>This is a description</CardDescription>);
    const description = screen.getByText('This is a description');
    expect(description.className).toContain('text-muted-foreground');
  });
});