import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';

import { Layout } from './Layout';

describe('Layout', () => {
  test('opens planning route in focus mode with collapsible navigation', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/m/tecnico/planejar']}>
        <Layout loggedUser="Equipe Prymeira" navItems={[{ to: '/m/tecnico/planejar', label: 'Planejar', permissions: ['calendar'] }]}>
          <div>Planejar conteúdo</div>
        </Layout>
      </MemoryRouter>
    );

    expect(container.querySelector('.app-shell')).toHaveClass('is-planning-focus', 'is-nav-collapsed');
    expect(screen.getByRole('button', { name: 'Expandir navegação' })).toBeInTheDocument();
  });
});
