import { describe, expect, it } from 'vitest';
import { filterEleitoresPorTermo, groupFamiliaMembrosPorGrau, sortFamiliasPorNome } from './familias';

describe('sortFamiliasPorNome', () => {
  it('ordena famílias por nome textual e mantém id como fallback', () => {
    const familias = [
      { id: 'fam-2', nome: 'Zeta', membros: [] },
      { id: 'fam-1', nome: 'Ana', membros: [] },
      { id: 'fam-3', nome: '', membros: [] },
    ];

    expect(sortFamiliasPorNome(familias).map(item => item.id)).toEqual(['fam-1', 'fam-3', 'fam-2']);
  });
});

describe('groupFamiliaMembrosPorGrau', () => {
  it('agrupa os membros por grau de parentesco e preserva o nome do grau', () => {
    const membros = [
      { id: '1', grauParentesco: 'Mãe', eleitor: { nome: 'Maria', tituloEleitor: '1234' } },
      { id: '2', grauParentesco: 'Filho', eleitor: { nome: 'João', tituloEleitor: '5678' } },
      { id: '3', grauParentesco: 'Filho', eleitor: { nome: 'Ana', tituloEleitor: '9012' } },
    ];

    expect(groupFamiliaMembrosPorGrau(membros).map(group => group.grau)).toEqual(['Filho', 'Mãe']);
    expect(groupFamiliaMembrosPorGrau(membros)[0].membros.map(item => item.eleitor?.nome)).toEqual(['João', 'Ana']);
  });
});

describe('filterEleitoresPorTermo', () => {
  it('retorna vazio quando a busca está vazia, filtra após digitar e ordena alfabeticamente', () => {
    const eleitores = [
      { id: 'e1', nome: 'Maria Souza', cpf: '123', tituloEleitor: '2222', sessao: '08', zona: '10' },
      { id: 'e2', nome: 'João Silva', cpf: '456', tituloEleitor: '3333', sessao: '99', zona: '20' },
      { id: 'e3', nome: 'Ana Costa', cpf: '789', tituloEleitor: '4444', sessao: '15', zona: '30' },
    ];

    expect(filterEleitoresPorTermo(eleitores, '')).toEqual([]);
    expect(filterEleitoresPorTermo(eleitores, 'a').map(item => item.id)).toEqual(['e3', 'e2', 'e1']);
    expect(filterEleitoresPorTermo(eleitores, 'silva').map(item => item.id)).toEqual(['e2']);
    expect(filterEleitoresPorTermo(eleitores, '3333').map(item => item.id)).toEqual(['e2']);
    expect(filterEleitoresPorTermo(eleitores, '99').map(item => item.id)).toEqual(['e2']);
    expect(filterEleitoresPorTermo(eleitores, '30').map(item => item.id)).toEqual(['e3']);
  });
});
