import { describe, expect, it } from 'vitest';
import { sortEleitoresAlfabeticos } from './reporting';

describe('sortEleitoresAlfabeticos', () => {
  it('ordena nomes em ordem alfabética ignorando espaços vazios', () => {
    const eleitores = [
      { nome: 'Zélia Costa', id: '3' },
      { nome: 'Ana Souza', id: '1' },
      { nome: 'Bruno Lima', id: '2' },
      { nome: undefined, id: '4' },
    ];

    expect(sortEleitoresAlfabeticos(eleitores as any).map(item => item.id)).toEqual(['1', '2', '3', '4']);
  });
});
